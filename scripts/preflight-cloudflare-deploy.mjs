#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const guardedFiles = [
  {
    file: "cloudflare/blog-html-direct-worker.js",
    forbidden: [
      "cloudflare-d1-index",
      "function renderIndex",
      "async function readIndexPosts",
      "readIndexPosts(env",
      "BLOG_INDEX_PAGE_SIZE ="
    ]
  },
  {
    file: ".open-next/cloudflare/blog-html-direct.js",
    required: true,
    forbidden: [
      "cloudflare-d1-index",
      "function renderIndex",
      "async function readIndexPosts",
      "readIndexPosts(env",
      "BLOG_INDEX_PAGE_SIZE ="
    ]
  },
  {
    file: ".open-next/worker.js",
    required: true,
    forbidden: [
      "cloudflare-d1-index",
      "maybeHandleDirectBlogHtml(request, env)"
    ]
  }
];

const errors = [];

function readRelative(file, required = false) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    if (required) errors.push(`Missing build artifact: ${file}. Run npm run build:cloudflare before deploy.`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

for (const check of guardedFiles) {
  const text = readRelative(check.file, check.required);
  if (!text) continue;
  for (const marker of check.forbidden) {
    if (text.includes(marker)) {
      errors.push(`${check.file} contains forbidden production blog marker: ${marker}`);
    }
  }
}

if (process.env.ALTOS_ENABLE_DIRECT_BLOG_HTML === "1") {
  errors.push("ALTOS_ENABLE_DIRECT_BLOG_HTML=1 would activate the emergency direct blog renderer in production.");
}

const packageJson = JSON.parse(readRelative("package.json", true));
const deployScript = packageJson.scripts?.["deploy:cloudflare"] || "";
if (!deployScript.includes("preflight:cloudflare")) {
  errors.push("package.json deploy:cloudflare must run preflight:cloudflare before Cloudflare deploy.");
}

const wrangler = readRelative("wrangler.jsonc", true);
if (!wrangler.includes('"name": "altoslab-official-website"')) {
  errors.push("wrangler.jsonc does not target the expected production Worker name.");
}
if (!wrangler.includes('"pattern": "altoslab-ai.cc/*"') || !wrangler.includes('"pattern": "www.altoslab-ai.cc/*"')) {
  errors.push("wrangler.jsonc production routes are missing or changed.");
}

if (errors.length) {
  console.error("Cloudflare deploy preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("");
  console.error("Refusing to deploy because this build could reintroduce the stale direct blog index.");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      phase: "cloudflare-deploy-preflight",
      protectedBlogIndex: true,
      directBlogHtmlInjected: false
    },
    null,
    2
  )
);
