import { maybeHandleDirectBlogHtml } from "../cloudflare/blog-html-direct-worker.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

const post = {
  id: "post-direct-renderer-smoke",
  slug: "markdown-bold-test",
  status: "published",
  language: "zh-Hant",
  translationGroupId: "tg-direct-renderer-smoke",
  title: "Markdown inline rendering smoke",
  excerpt: "這段摘要包含 **粗體摘要**。",
  contentType: "breaking",
  topic: "Renderer",
  geoSummary: "這段摘要包含 **粗體重點**。",
  body: [
    "這是一段含有 **粗體文字** 的段落。",
    "> ALTOS LAB 判斷：**責任邊界是護城河**。\n\n[IMAGE:opening]",
    "## 小標也支援 **粗體**",
    "這一段應該出現在第一張圖後面，而不是所有圖片都被堆到文末。",
    "[IMAGE:mechanism]",
    "## 第二個小標",
    "- **先切測試環境**：不要一開始就碰正式系統。",
    "- 也支援 `inline code`。"
  ].join("\n\n"),
  keyTakeaways: ["第一點", "第二點"],
  sourceLinks: [
    {
      title: "Source",
      url: "https://example.com/source",
      publisher: "Example",
      publishedAt: "2026-06-11",
      summary: "來源摘要也可包含 **粗體**。"
    }
  ],
  tags: ["Renderer"],
  cover: "https://example.com/cover.png",
  coverAlt: "Cover",
  coverCredit: "Example",
  coverCreditUrl: "https://example.com/source",
  contentImages: [
    {
      url: "https://example.com/opening.png",
      alt: "Opening image",
      caption: "Opening caption",
      placement: "after-lead"
    },
    {
      url: "https://example.com/mechanism.png",
      alt: "Mechanism image",
      caption: "Mechanism caption",
      placement: "mid-article"
    }
  ],
  readTimeMinutes: 3,
  createdAt: "2026-06-11T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z",
  publishedAt: "2026-06-11T00:00:00.000Z"
};

const env = {
  NEXT_PUBLIC_SITE_URL: "https://altoslab-ai.cc",
  ALTOS_BLOG_D1: {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes("detail_json")) return { payload: JSON.stringify(post) };
              return null;
            },
            async all() {
              if (sql.includes("inventory_json")) return { results: [{ payload: JSON.stringify(post) }] };
              return { results: [{ language: "zh-Hant", slug: post.slug, translationGroupId: post.translationGroupId }] };
            }
          };
        },
        async all() {
          if (sql.includes("inventory_json")) return { results: [{ payload: JSON.stringify(post) }] };
          return { results: [] };
        }
      };
    }
  }
};

const response = await maybeHandleDirectBlogHtml(new Request("https://altoslab-ai.cc/blog/markdown-bold-test"), env);
const html = await response.text();

assert(response.status === 200, "direct renderer returns 200");
assert(response.headers.get("x-altos-direct-blog-render") === "cloudflare-d1", "direct renderer header is present");
assert(!html.includes("**"), "direct renderer does not leak raw Markdown bold markers");
assert(!html.includes("[IMAGE:"), "direct renderer does not leak image placement markers");
assert(!html.includes("&gt; ALTOS LAB"), "direct renderer does not leak raw blockquote markers");
assert(html.includes("<strong>粗體文字</strong>"), "paragraph bold markers render as strong");
assert(html.includes("<blockquote><p>ALTOS LAB 判斷：<strong>責任邊界是護城河</strong>。</p></blockquote>"), "blockquote renders as HTML");
assert(html.includes("<strong>先切測試環境</strong>"), "list item bold markers render as strong");
assert(html.includes("<strong>粗體摘要</strong>"), "excerpt bold markers render as strong");
assert(html.includes("<code>inline code</code>"), "inline code markers render as code");
assert(html.includes('alt="Opening image"'), "opening image renders");
assert(html.includes('alt="Mechanism image"'), "mechanism image renders");
assert(
  html.indexOf('alt="Opening image"') > html.indexOf("<blockquote>") &&
    html.indexOf('alt="Opening image"') < html.indexOf("<h2>小標也支援 <strong>粗體</strong></h2>"),
  "opening image is inserted at its marker instead of the end"
);
assert(
  html.indexOf('alt="Mechanism image"') > html.indexOf("這一段應該出現在第一張圖後面") &&
    html.indexOf('alt="Mechanism image"') < html.indexOf("<h2>第二個小標</h2>"),
  "mechanism image is inserted at its marker instead of the end"
);

const indexResponse = await maybeHandleDirectBlogHtml(new Request("https://altoslab-ai.cc/blog"), env);
const indexHtml = await indexResponse.text();
assert(indexResponse.status === 200, "blog index direct renderer returns 200");
assert(indexResponse.headers.get("x-altos-direct-blog-render") === "cloudflare-d1-index", "blog index direct renderer header is present");
assert(indexHtml.includes("blog-craft-index") && indexHtml.includes("blog-craft-card"), "blog index direct renderer preserves Blog Craft UI classes");
assert(indexHtml.includes("Markdown inline rendering smoke"), "blog index direct renderer reads D1 inventory rows");

const feedResponse = await maybeHandleDirectBlogHtml(new Request("https://altoslab-ai.cc/feed.xml"), env);
const feedXml = await feedResponse.text();
assert(feedResponse.headers.get("x-altos-direct-blog-render") === "cloudflare-d1-feed", "feed direct renderer header is present");
assert(feedXml.includes("<rss") && feedXml.includes("<item>"), "feed direct renderer returns RSS XML");

const llmsResponse = await maybeHandleDirectBlogHtml(new Request("https://altoslab-ai.cc/llms.txt"), env);
const llmsText = await llmsResponse.text();
assert(llmsResponse.headers.get("x-altos-direct-blog-render") === "cloudflare-d1-llms", "llms direct renderer header is present");
assert(llmsText.includes("# ALTOS LAB") && llmsText.includes("Markdown inline rendering smoke"), "llms direct renderer returns lightweight blog context");

if (!process.exitCode) console.log("PASS blog direct renderer smoke checks");
