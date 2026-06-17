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

function collectFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute, predicate);
    return predicate(absolute) ? [absolute] : [];
  });
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

const cssFiles = [
  ...collectFiles(path.join(root, ".open-next", "assets"), (file) => file.endsWith(".css")),
  ...collectFiles(path.join(root, ".next", "static"), (file) => file.endsWith(".css"))
];
const cssText = cssFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const compactCss = cssText.replace(/\s+/g, "");
if (!compactCss.includes(".blog-site-shell.article-heroh1{") && !compactCss.includes(".blog-site-shell.article-heroh1,")) {
  // Keep this check separate from the exact size check so missing blog CSS is easy to diagnose.
  if (!compactCss.includes(".blog-site-shell.article-heroh1")) {
    errors.push("Built CSS is missing the scoped blog article title rule.");
  }
}
if (!compactCss.includes("font-size:clamp(34px,3.25vw,44px)")) {
  errors.push("Built CSS is missing the approved reduced blog article title scale: clamp(34px, 3.25vw, 44px).");
}
if (!compactCss.includes(".blog-site-shell.article-takeaways.takeaway-text")) {
  errors.push("Built CSS is missing the inline lime takeaway highlight rule.");
}
if (compactCss.includes("font-size:clamp(42px,4.25vw,54px)")) {
  errors.push("Built CSS contains the retired oversized article title scale: clamp(42px, 4.25vw, 54px).");
}
if (compactCss.includes("#6f3ff5")) {
  errors.push("Built CSS contains the retired purple article takeaway color #6f3ff5.");
}
if (compactCss.includes(".blog-site-shell.article-takeawaysli{width:fit-content")) {
  errors.push("Built CSS contains the retired full-row takeaway highlight style.");
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
