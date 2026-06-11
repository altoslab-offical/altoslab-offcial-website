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
if (!text.includes(importLine)) {
  text = `${importLine}\n${text}`;
}

const hook = `            const directBlogHtml = await maybeHandleDirectBlogHtml(request, env);
            if (directBlogHtml) {
                return directBlogHtml;
            }
`;

if (!text.includes("maybeHandleDirectBlogHtml(request, env)")) {
  const marker = "            // Serve images in development.";
  if (!text.includes(marker)) throw new Error("OpenNext worker patch marker not found.");
  text = text.replace(marker, `${hook}${marker}`);
}

fs.writeFileSync(worker, text, "utf8");
console.log(
  JSON.stringify(
    {
      ok: true,
      phase: "cloudflare-worker-blog-html-patched",
      worker: path.relative(root, worker),
      renderer: path.relative(root, target)
    },
    null,
    2
  )
);
