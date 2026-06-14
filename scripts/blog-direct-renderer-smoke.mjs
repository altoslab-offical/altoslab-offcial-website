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
    "## 小標也支援 **粗體**",
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
  contentImages: [],
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
              return { results: [{ language: "zh-Hant", slug: post.slug, translationGroupId: post.translationGroupId }] };
            }
          };
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
assert(html.includes("<strong>粗體文字</strong>"), "paragraph bold markers render as strong");
assert(html.includes("<strong>先切測試環境</strong>"), "list item bold markers render as strong");
assert(html.includes("<strong>粗體摘要</strong>"), "excerpt bold markers render as strong");
assert(html.includes("<code>inline code</code>"), "inline code markers render as code");
assert(html.includes("--highlight:#c8ff00"), "direct renderer carries designer lime highlight token");
assert(!html.includes("--accent:#8b5cf6"), "direct renderer no longer ships legacy purple article accent");
assert(html.includes(".article-takeaways .takeaway-text") && html.includes("<span class=\"takeaway-text\">"), "direct renderer applies lime underline to inline takeaway text only");
assert(html.includes("site-nav-actions") && html.includes("site-language-toggle") && html.includes("site-mobile-menu-trigger") && html.includes("site-nav-cta-label") && html.includes("lucide lucide-globe"), "direct renderer uses the same Blog shell header structure");
assert(html.includes('<button aria-expanded="false" aria-haspopup="menu" aria-label="Open language menu" class="site-language-trigger" type="button">'), "direct renderer language trigger matches the Blog main header button");
assert(html.includes('<a class="site-nav-cta" href="/#contact"><span class="site-nav-cta-label">合作洽談</span>'), "direct renderer CTA matches the zh-Hant Blog main header bar");
assert(!html.includes('class="nav"') && !html.includes('class="langs"'), "direct renderer does not ship the old alternate header bar");
assert(html.includes("font-size:clamp(34px,3.25vw,44px)") && !html.includes("font-size:clamp(40px,7vw,68px)"), "direct renderer keeps the reduced desktop article title scale");
assert(html.includes("--highlight-soft:rgba(200,255,0,.56)") && !html.includes(".article-takeaways li{width:fit-content"), "direct renderer keeps takeaway highlights restrained without full-row list-item backgrounds");

const indexResponse = await maybeHandleDirectBlogHtml(new Request("https://altoslab-ai.cc/blog"), env);
assert(indexResponse === null, "blog index falls through to the original Next UI renderer");

if (!process.exitCode) console.log("PASS blog direct renderer smoke checks");
