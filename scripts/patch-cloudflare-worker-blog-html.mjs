#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "cloudflare", "blog-html-direct-worker.js");
const target = path.join(root, ".open-next", "cloudflare", "blog-html-direct.js");
const worker = path.join(root, ".open-next", "worker.js");

if (!fs.existsSync(source)) throw new Error(`Missing source renderer: ${path.relative(root, source)}`);
if (!fs.existsSync(worker)) throw new Error(`Missing OpenNext worker: ${path.relative(root, worker)}`);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);

let text = fs.readFileSync(worker, "utf8");
const importLine = 'import { maybeHandleDirectBlogHtml } from "./cloudflare/blog-html-direct.js";';
const hook = `            const directBlogHtml = await maybeHandleDirectBlogHtml(request, env);
            if (directBlogHtml) {
                return directBlogHtml;
            }
`;
const enableDirectBlogHtml = process.env.ALTOS_ENABLE_DIRECT_BLOG_HTML === "1";

if (enableDirectBlogHtml && !text.includes(importLine)) {
  text = `${importLine}\n${text}`;
}

if (enableDirectBlogHtml && !text.includes("maybeHandleDirectBlogHtml(request, env)")) {
  const marker = "            // Serve images in development.";
  if (!text.includes(marker)) throw new Error("OpenNext worker patch marker not found.");
  text = text.replace(marker, `${hook}${marker}`);
}

if (!enableDirectBlogHtml) {
  text = text.replace(`${importLine}\n`, "").replace(hook, "");
}

fs.writeFileSync(worker, text, "utf8");
console.log(
  JSON.stringify(
    {
      ok: true,
      phase: enableDirectBlogHtml ? "cloudflare-worker-blog-html-patched" : "cloudflare-worker-blog-html-available",
      directBlogHtmlInjected: enableDirectBlogHtml,
      worker: path.relative(root, worker),
      renderer: path.relative(root, target)
    },
    null,
    2
  )
);
