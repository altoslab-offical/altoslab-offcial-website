import fs from "node:fs";
import { maybeHandleDirectBlogHtml } from "../cloudflare/blog-html-direct-worker.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

const indexPaths = ["/blog", "/en/blog", "/ja/blog", "/ko/blog", "/id/blog", "/vi/blog", "/th/blog", "/ms/blog", "/fil/blog"];
const envThatMustNotBeTouched = {
  ALTOS_BLOG_D1: {
    prepare() {
      throw new Error("Blog index routes must not query the direct Worker renderer");
    }
  }
};

for (const pathname of indexPaths) {
  const response = await maybeHandleDirectBlogHtml(new Request(`https://altoslab-ai.cc${pathname}`), envThatMustNotBeTouched);
  assert(response === null, `${pathname} falls through to the canonical Next BlogIndex UI`);
}

const directWorker = read("cloudflare/blog-html-direct-worker.js");
for (const forbidden of ["function renderIndex", "readIndexPosts", "BLOG_INDEX_PAGE_SIZE =", "cloudflare-d1-index"]) {
  assert(!directWorker.includes(forbidden), `Cloudflare direct renderer must not contain ${forbidden}`);
}
assert(directWorker.includes("--highlight:#c8ff00"), "direct article renderer keeps designer signal-lime highlight token");
assert(directWorker.includes(".article-takeaways li") && directWorker.includes("var(--highlight-soft)"), "direct article renderer keeps black text plus lime takeaway underline styling");
assert(directWorker.includes(".rich-text blockquote") && directWorker.includes("border-left"), "direct article renderer keeps designer blockquote side-marker styling");
assert(!directWorker.includes("--accent:#8b5cf6"), "direct article renderer does not reintroduce legacy purple article accent");

const blogIndex = read("components/BlogIndex.tsx");
for (const marker of ["blog-craft-index", "blog-craft-layout", "blog-craft-sidebar", "blog-craft-feed", "blog-craft-card"]) {
  assert(blogIndex.includes(marker), `BlogIndex keeps ${marker}`);
}

const pageFiles = [
  "app/blog/page.tsx",
  "app/en/blog/page.tsx",
  "app/ja/blog/page.tsx",
  "app/ko/blog/page.tsx",
  "app/id/blog/page.tsx",
  "app/vi/blog/page.tsx",
  "app/th/blog/page.tsx",
  "app/ms/blog/page.tsx",
  "app/fil/blog/page.tsx"
];

for (const file of pageFiles) {
  const source = read(file);
  assert(source.includes('import { BlogIndex } from "@/components/BlogIndex";'), `${file} imports canonical BlogIndex`);
  assert(source.includes("<BlogIndex "), `${file} renders canonical BlogIndex`);
  assert(!source.includes("BlogIndexLite"), `${file} does not use BlogIndexLite`);
}

for (const file of ["SPEC.md", "DESIGN.md", "docs/FRONTEND_ARCHITECTURE.md", "docs/n8n-local-control-plane.md"]) {
  assert(read(file).includes("Blog UI Stability Contract"), `${file} documents the Blog UI Stability Contract`);
}

if (!process.exitCode) console.log("PASS blog UI contract smoke checks");
