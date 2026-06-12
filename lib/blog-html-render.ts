import { gaHeadSnippet, gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "./analytics";
import {
  BLOG_LANGUAGES,
  blogContentTypeLabel,
  blogCoverForLanguage,
  blogIndexPath,
  blogPostPath,
  cleanBlogSeoTitle,
  htmlLanguage,
  metadataLanguageKey,
  openGraphLocale
} from "./blog-utils";
import { articleJsonLd, blogIndexItemListJsonLd, breadcrumbJsonLd, siteName, siteUrl, websiteJsonLd } from "./seo";
import type { BlogLanguage, BlogPost } from "./types";

type IndexCopy = {
  title: string;
  description: string;
  latest: string;
  read: string;
  searchPlaceholder: string;
  empty: string;
};

const INDEX_COPY: Record<BlogLanguage, IndexCopy> = {
  "zh-Hant": {
    title: "AI 實驗室筆記",
    description: "AI 產品、Agent、自動化、搜尋可見度、案例與市場觀察。",
    latest: "最新文章",
    read: "閱讀文章",
    searchPlaceholder: "搜尋 AI、Agent、GEO...",
    empty: "目前沒有符合條件的文章。"
  },
  en: {
    title: "AI Lab Notes",
    description: "AI products, agents, automation, search visibility, case studies and market signals.",
    latest: "Latest Articles",
    read: "Read article",
    searchPlaceholder: "Search AI, agents, GEO...",
    empty: "No matching articles yet."
  },
  ja: {
    title: "AI Lab Notes",
    description: "AI プロダクト、Agent、自動化、検索での見え方、事例、AI 市場観測ノート。",
    latest: "最新記事",
    read: "読む",
    searchPlaceholder: "AI、Agent、GEO を検索...",
    empty: "該当する記事はまだありません。"
  },
  ko: {
    title: "AI Lab Notes",
    description: "AI 제품, 에이전트, 자동화, 검색 가시성, 사례, AI 시장 관찰 노트.",
    latest: "최신 글",
    read: "읽기",
    searchPlaceholder: "AI, Agent, GEO 검색...",
    empty: "조건에 맞는 글이 아직 없습니다."
  },
  id: {
    title: "Catatan Lab AI",
    description: "Produk AI, agent, automation, visibilitas pencarian, studi kasus, dan sinyal pasar.",
    latest: "Artikel Terbaru",
    read: "Baca artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    empty: "Belum ada artikel yang cocok."
  },
  vi: {
    title: "Ghi Chép Phòng Lab AI",
    description: "Sản phẩm AI, agent, automation, hiển thị tìm kiếm, case study và tín hiệu thị trường.",
    latest: "Bài mới nhất",
    read: "Đọc bài",
    searchPlaceholder: "Tìm AI, Agent, GEO...",
    empty: "Chưa có bài viết phù hợp."
  },
  th: {
    title: "บันทึกจากแล็บ AI",
    description: "ผลิตภัณฑ์ AI, agent, automation, search visibility, case study และสัญญาณตลาด.",
    latest: "บทความล่าสุด",
    read: "อ่านบทความ",
    searchPlaceholder: "ค้นหา AI, Agent, GEO...",
    empty: "ยังไม่มีบทความที่ตรงเงื่อนไข."
  },
  ms: {
    title: "Nota Makmal AI",
    description: "Produk AI, agent, automasi, keterlihatan carian, kajian kes dan isyarat pasaran.",
    latest: "Artikel Terkini",
    read: "Baca artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    empty: "Belum ada artikel yang sepadan."
  },
  fil: {
    title: "AI Lab Notes",
    description: "AI products, agents, automation, search visibility, case studies, at market signals.",
    latest: "Pinakabagong Artikulo",
    read: "Basahin",
    searchPlaceholder: "Hanapin AI, Agent, GEO...",
    empty: "Wala pang tugmang artikulo."
  }
};

const SHELL_CSS = `
  :root { color-scheme: dark; --bg:#050806; --panel:#111712; --line:#283228; --text:#f3f7ef; --muted:#a8b2a5; --accent:#b8f26b; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height:1.7; }
  a { color:inherit; text-decoration:none; }
  img { max-width:100%; display:block; }
  .shell { width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:28px 0 56px; }
  .nav { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 0 28px; }
  .brand { font-weight:800; letter-spacing:.04em; }
  .langs { display:flex; flex-wrap:wrap; gap:8px; font-size:13px; color:var(--muted); }
  .langs a, .back, .read { border:1px solid var(--line); border-radius:999px; padding:7px 11px; background:rgba(255,255,255,.03); }
  .hero { display:grid; grid-template-columns:minmax(0, 1fr); gap:18px; padding:36px 0 26px; border-bottom:1px solid var(--line); }
  .eyebrow { margin:0 0 8px; color:var(--accent); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  h1 { margin:0; font-size:clamp(34px, 7vw, 72px); line-height:1.02; letter-spacing:0; max-width:980px; }
  .lede { color:var(--muted); font-size:18px; max-width:780px; }
  .search { display:flex; gap:10px; max-width:620px; }
  .search input { flex:1; min-width:0; color:var(--text); background:#0c110d; border:1px solid var(--line); border-radius:8px; padding:12px 14px; font:inherit; }
  .search button { color:#071006; background:var(--accent); border:0; border-radius:8px; padding:12px 16px; font-weight:700; }
  .grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:18px; padding-top:28px; }
  .card { border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--panel); min-width:0; }
  .card img { width:100%; aspect-ratio:16/9; object-fit:cover; background:#0b100c; }
  .card-body { padding:16px; }
  .meta { display:flex; flex-wrap:wrap; gap:8px; color:var(--muted); font-size:12px; }
  .badge { color:#071006; background:var(--accent); border-radius:999px; padding:2px 8px; font-weight:700; }
  .card h2 { margin:10px 0 8px; font-size:20px; line-height:1.25; letter-spacing:0; }
  .card p { margin:0 0 14px; color:var(--muted); }
  .article { max-width:820px; margin:0 auto; padding-bottom:56px; }
  .article-hero { padding:24px 0 26px; border-bottom:1px solid var(--line); }
  .cover { margin:24px 0 10px; border-radius:8px; overflow:hidden; border:1px solid var(--line); background:#0b100c; }
  .cover img { width:100%; aspect-ratio:16/9; object-fit:cover; }
  .caption { color:var(--muted); font-size:13px; margin:8px 0 0; }
  .body { padding-top:26px; font-size:18px; }
  .body h2 { font-size:30px; line-height:1.2; margin:34px 0 12px; letter-spacing:0; }
  .body h3 { font-size:23px; line-height:1.25; margin:26px 0 10px; letter-spacing:0; }
  .body p { margin:0 0 18px; }
  .body strong { color:var(--text); font-weight:800; }
  .body blockquote { margin:0 0 22px; padding:4px 0 4px 18px; border-left:3px solid var(--accent); color:var(--muted); }
  .body blockquote p { margin:0; }
  .body ul { margin:0 0 20px; padding-left:22px; }
  .inline-figure { margin:26px 0; border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--panel); }
  .inline-figure img { width:100%; aspect-ratio:16/9; object-fit:cover; }
  .inline-figure figcaption { padding:10px 12px; color:var(--muted); font-size:14px; }
  .sources { border-top:1px solid var(--line); margin-top:34px; padding-top:22px; color:var(--muted); }
  .sources a { color:var(--accent); }
  @media (max-width: 820px) { .grid { grid-template-columns:1fr; } .shell { width:min(100% - 24px, 1120px); } .search { flex-direction:column; } }
`;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: unknown) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function jsonLd(data: unknown) {
  if (!data) return "";
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function absoluteUrl(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function htmlDocument(language: BlogLanguage, title: string, description: string, canonical: string, image: string, body: string, extraHead = "") {
  return `<!doctype html>
<html lang="${escapeAttribute(htmlLanguage(language))}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(cleanBlogSeoTitle(title))}｜${siteName}</title>
  <meta name="description" content="${escapeAttribute(description)}" />
  <link rel="canonical" href="${escapeAttribute(canonical)}" />
  ${BLOG_LANGUAGES.map((item) => `<link rel="alternate" hreflang="${escapeAttribute(metadataLanguageKey(item))}" href="${escapeAttribute(`${siteUrl}${blogIndexPath(item)}`)}" />`).join("\n  ")}
  <meta property="og:title" content="${escapeAttribute(title)}" />
  <meta property="og:description" content="${escapeAttribute(description)}" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:locale" content="${escapeAttribute(openGraphLocale(language))}" />
  <meta property="og:image" content="${escapeAttribute(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(title)}" />
  <meta name="twitter:description" content="${escapeAttribute(description)}" />
  <meta name="twitter:image" content="${escapeAttribute(image)}" />
  ${gaHeadSnippet()}
  ${gtmHeadSnippet()}
  <style>${SHELL_CSS}</style>
  ${extraHead}
</head>
<body>
${gtmNoScriptSnippet()}
${body}
${homepageAnalyticsSnippet()}
</body>
</html>`;
}

function nav(language: BlogLanguage, alternates?: BlogPost[]) {
  const links = alternates?.length
    ? [language, ...BLOG_LANGUAGES.filter((item) => item !== language)].map((item) => {
        const alternate = item === language ? null : alternates.find((post) => post.language === item);
        const href = item === language ? blogIndexPath(item) : alternate ? blogPostPath(alternate) : blogIndexPath(item);
        return `<a href="${escapeAttribute(href)}">${escapeHtml(item)}</a>`;
      })
    : BLOG_LANGUAGES.map((item) => `<a href="${escapeAttribute(blogIndexPath(item))}">${escapeHtml(item)}</a>`);

  return `<nav class="nav"><a class="brand" href="/">ALTOS LAB</a><div class="langs">${links.join("")}</div></nav>`;
}

function postDate(post: Pick<BlogPost, "updatedAt" | "publishedAt" | "createdAt">) {
  return String(post.updatedAt || post.publishedAt || post.createdAt || "").slice(0, 10);
}

function postMatches(post: BlogPost, tag = "", query = "") {
  const normalizedTag = tag.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const haystack = [post.title, post.excerpt, post.topic, post.geoSummary, post.contentType, post.newsCategory, ...(post.tags || [])]
    .join(" ")
    .toLowerCase();
  return (!normalizedTag || haystack.includes(normalizedTag)) && (!normalizedQuery || haystack.includes(normalizedQuery));
}

export function renderBlogIndexHtml(language: BlogLanguage, posts: BlogPost[], params: { tag?: string; query?: string } = {}) {
  const dictionary = INDEX_COPY[language];
  const canonical = `${siteUrl}${blogIndexPath(language)}`;
  const image = absoluteUrl(blogCoverForLanguage(language));
  const visiblePosts = posts.filter((post) => postMatches(post, params.tag, params.query)).slice(0, 24);
  const cards = visiblePosts
    .map(
      (post) => `<article class="card">
        <a href="${escapeAttribute(blogPostPath(post))}"><img src="${escapeAttribute(post.cover || blogCoverForLanguage(post.language))}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="lazy" decoding="async" /></a>
        <div class="card-body">
          <div class="meta"><span class="badge">${escapeHtml(blogContentTypeLabel(post.contentType, post.language))}</span><span>${escapeHtml(postDate(post))}</span><span>${escapeHtml(String(post.readTimeMinutes || 3))} min</span></div>
          <h2><a href="${escapeAttribute(blogPostPath(post))}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.excerpt)}</p>
          <a class="read" href="${escapeAttribute(blogPostPath(post))}">${escapeHtml(dictionary.read)}</a>
        </div>
      </article>`
    )
    .join("");
  const body = `<main class="shell">
    ${nav(language)}
    <section class="hero">
      <p class="eyebrow">ALTOS LAB Journal</p>
      <h1>${escapeHtml(dictionary.title)}</h1>
      <p class="lede">${escapeHtml(dictionary.description)}</p>
      <form class="search" action="${escapeAttribute(blogIndexPath(language))}" role="search">
        ${params.tag ? `<input type="hidden" name="tag" value="${escapeAttribute(params.tag)}" />` : ""}
        <input name="query" type="search" value="${escapeAttribute(params.query || "")}" placeholder="${escapeAttribute(dictionary.searchPlaceholder)}" />
        <button type="submit">Search</button>
      </form>
    </section>
    <section aria-label="${escapeAttribute(dictionary.latest)}" class="grid">${cards || `<p>${escapeHtml(dictionary.empty)}</p>`}</section>
  </main>`;

  return htmlDocument(
    language,
    dictionary.title,
    dictionary.description,
    canonical,
    image,
    body,
    `${jsonLd(websiteJsonLd())}\n${jsonLd(blogIndexItemListJsonLd(visiblePosts, blogIndexPath(language), dictionary.title))}`
  );
}

function renderInlineImage(image: NonNullable<BlogPost["contentImages"]>[number]) {
  if (!image?.url) return "";
  return `<figure class="inline-figure">
    <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt || image.caption || "")}" loading="lazy" decoding="async" />
    ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
  </figure>`;
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value).replace(/\*\*([^*\n]{1,180})\*\*/g, "<strong>$1</strong>");
}

function imageMatchesPlaceholder(image: NonNullable<BlogPost["contentImages"]>[number], key: string, index: number) {
  const imageWithStyle = image as typeof image & { styleId?: string };
  const normalizedKey = key.toLowerCase();
  const url = String(image?.url || "").toLowerCase();
  const styleId = String(imageWithStyle?.styleId || "").toLowerCase();
  const placement = String(image?.placement || "").toLowerCase();
  if (url.includes(`-${normalizedKey}.`) || url.includes(`/${normalizedKey}.`)) return true;
  if (styleId.includes(normalizedKey)) return true;
  if (normalizedKey === "opening" && placement === "after-lead") return true;
  if (normalizedKey === "mechanism" && placement === "mid-article") return true;
  if (normalizedKey === "image" && index === 0) return true;
  return false;
}

function renderBody(post: BlogPost) {
  const rawBody = String(post.body || "").replace(/\r\n/g, "\n");
  const images = post.contentImages || [];
  const usedImages = new Set<number>();

  const renderBlockHtml = (block: string) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (/^#{2,3}\s+/.test(block)) {
      const level = block.startsWith("###") ? "h3" : "h2";
      return `<${level}>${renderInlineMarkdown(block.replace(/^#{2,3}\s+/, ""))}</${level}>`;
    }
    if (lines.length > 0 && lines.every((line) => /^>\s+/.test(line))) {
      return `<blockquote>${lines.map((line) => `<p>${renderInlineMarkdown(line.replace(/^>\s+/, ""))}</p>`).join("")}</blockquote>`;
    }
    if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line))) {
      return `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p>${lines.map(renderInlineMarkdown).join("<br />")}</p>`;
  };

  const renderBlocksHtml = (value: string) =>
    value
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .filter((block) => !/^常見問題|^FAQ/i.test(block))
      .map(renderBlockHtml)
      .join("");

  const takeImageForPlaceholder = (key: string) => {
    const matchedIndex = images.findIndex((image, index) => !usedImages.has(index) && imageMatchesPlaceholder(image, key, index));
    const nextIndex = matchedIndex >= 0 ? matchedIndex : images.findIndex((_, index) => !usedImages.has(index));
    if (nextIndex < 0) return "";
    usedImages.add(nextIndex);
    return renderInlineImage(images[nextIndex]);
  };

  const renderUnusedImages = () => images.map((image, index) => (usedImages.has(index) ? "" : renderInlineImage(image))).join("");
  const markerRegex = /\[IMAGE:([a-z0-9_-]+)\]/gi;
  if (markerRegex.test(rawBody)) {
    markerRegex.lastIndex = 0;
    const parts: string[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = markerRegex.exec(rawBody))) {
      const before = rawBody.slice(cursor, match.index).replace(/\n{3,}/g, "\n\n").trim();
      if (before) parts.push(renderBlocksHtml(before));
      parts.push(takeImageForPlaceholder(match[1] || ""));
      cursor = markerRegex.lastIndex;
    }
    const after = rawBody.slice(cursor).replace(/\n{3,}/g, "\n\n").trim();
    if (after) parts.push(renderBlocksHtml(after));
    return parts.join("") + renderUnusedImages();
  }

  const blocks = rawBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !/^常見問題|^FAQ/i.test(block));
  const interval = Math.max(2, Math.floor(blocks.length / Math.max(images.length, 1)));

  return blocks
    .map((block, blockIndex) => {
      let html = renderBlockHtml(block);
      if (interval > 0 && (blockIndex + 1) % interval === 0) {
        const nextIndex = images.findIndex((_, index) => !usedImages.has(index));
        if (nextIndex >= 0) {
          html += renderInlineImage(images[nextIndex]);
          usedImages.add(nextIndex);
        }
      }
      return html;
    })
    .join("") + renderUnusedImages();
}

export function renderBlogPostHtml(post: BlogPost, alternates: BlogPost[] = []) {
  const canonical = `${siteUrl}${blogPostPath(post)}`;
  const image = absoluteUrl(post.cover || blogCoverForLanguage(post.language));
  const sources = (post.sourceLinks || [])
    .map((source) => `<li><a href="${escapeAttribute(source.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(source.title || source.publisher || source.url)}</a></li>`)
    .join("");
  const body = `<main class="shell article">
    ${nav(post.language, alternates)}
    <article>
      <header class="article-hero">
        <a class="back" href="${escapeAttribute(blogIndexPath(post.language))}">Back</a>
        <p class="eyebrow">${escapeHtml(blogContentTypeLabel(post.contentType, post.language))} · ${escapeHtml(postDate(post))}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="lede">${escapeHtml(post.excerpt)}</p>
        <figure class="cover"><img src="${escapeAttribute(post.cover || blogCoverForLanguage(post.language))}" alt="${escapeAttribute(post.coverAlt || post.title)}" decoding="async" /></figure>
        ${post.coverCredit ? `<p class="caption">${escapeHtml(post.coverCredit)}</p>` : ""}
      </header>
      <section class="body">${renderBody(post)}</section>
      ${sources ? `<section class="sources"><p class="eyebrow">Sources</p><ul>${sources}</ul></section>` : ""}
    </article>
  </main>`;

  return htmlDocument(
    post.language,
    post.seoTitle || post.title,
    post.seoDescription || post.excerpt,
    canonical,
    image,
    body,
    `${jsonLd(articleJsonLd(post))}\n${jsonLd(breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Blog", url: blogIndexPath(post.language) }, { name: post.title, url: blogPostPath(post) }]))}`
  );
}

export function blogHtmlResponse(html: string, init: ResponseInit = {}) {
  return new Response(html, {
    ...init,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      ...(init.headers || {})
    }
  });
}
