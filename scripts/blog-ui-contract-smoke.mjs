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
const samplePost = {
  id: "blog-ui-contract-post",
  slug: "blog-ui-contract-post",
  status: "published",
  language: "zh-Hant",
  translationGroupId: "blog-ui-contract",
  title: "Blog UI Contract Post",
  excerpt: "The blog index must stay on the Blog Craft visual system.",
  contentType: "column",
  newsCategory: "AI",
  topic: "AI",
  tags: ["AI"],
  cover: "https://example.com/cover.png",
  coverAlt: "Cover",
  readTimeMinutes: 3,
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
  publishedAt: "2026-06-12T00:00:00.000Z"
};
const envForDirectIndex = {
  ALTOS_BLOG_D1: {
    prepare() {
      return {
        bind(language) {
          return {
            async all() {
              return {
                results: [
                  {
                    payload: JSON.stringify({ ...samplePost, language, slug: `${samplePost.slug}-${language}` })
                  }
                ]
              };
            }
          };
        }
      };
    }
  }
};

for (const pathname of indexPaths) {
  const response = await maybeHandleDirectBlogHtml(new Request(`https://altoslab-ai.cc${pathname}`), envForDirectIndex);
  const html = await response.text();
  assert(response.status === 200, `${pathname} direct Cloudflare index renderer returns 200`);
  assert(response.headers.get("x-altos-direct-blog-render") === "cloudflare-d1-index", `${pathname} uses the direct D1 index renderer`);
  assert(html.includes("blog-craft-index") && html.includes("blog-craft-layout") && html.includes("blog-craft-card"), `${pathname} preserves Blog Craft UI classes`);
  assert(html.includes("site-mobile-menu-trigger") && html.includes("site-mobile-menu"), `${pathname} direct renderer includes the restored mobile header menu`);
  assert(html.includes("site-language-menu") && html.includes("role=\"menuitemradio\""), `${pathname} direct renderer includes the full blog language menu`);
  assert(!html.includes("blog-lite-shell") && !html.includes("blog-lite-card"), `${pathname} does not fall back to the old lite UI`);
}

const directWorker = read("cloudflare/blog-html-direct-worker.js");
for (const forbidden of ["BLOG_INDEX_PAGE_SIZE =", "blog-lite-shell", "blog-lite-card"]) {
  assert(!directWorker.includes(forbidden), `Cloudflare direct renderer must not contain ${forbidden}`);
}
assert(directWorker.includes("readIndexPosts") && directWorker.includes("cloudflare-d1-index"), "Cloudflare direct renderer has the Worker-safe Blog index path");
assert(directWorker.includes("headerLanguageMenuHtml") && directWorker.includes("site-mobile-menu-trigger"), "Cloudflare direct renderer keeps the designer handoff header contract");

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
