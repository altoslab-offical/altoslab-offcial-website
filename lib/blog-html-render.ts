import { adsenseHeadSnippet, gaHeadSnippet, gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "./analytics";
import { blogAdSlotHtml } from "./blog-adsense";
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
  "zh-Hans": {
    title: "AI 实验室笔记",
    description: "AI 产品、Agent、自动化、搜索可见度、案例与市场观察。",
    latest: "最新文章",
    read: "阅读文章",
    searchPlaceholder: "搜索 AI、Agent、GEO...",
    empty: "目前没有符合条件的文章。"
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
  :root { color-scheme: light; --bg:#fafafa; --panel:#fff; --line:#e7e7e7; --text:#111; --muted:#666; --accent:#c8ff00; --accent-soft:rgba(200,255,0,.28); }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height:1.7; }
  a { color:inherit; text-decoration:none; }
  img { max-width:100%; display:block; }
  button { font:inherit; }
  .site-home.blog-site-shell { min-height:100vh; background:var(--bg); color:var(--text); }
  .site-nav { position:sticky; top:0; z-index:10; min-height:76px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:28px; padding:0 clamp(20px,5vw,72px); background:rgba(250,250,250,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
  .site-logo { width:fit-content; font-weight:900; letter-spacing:.18em; font-size:1.12rem; }
  .site-logo .brand-text { font-family:inherit; }
  .site-nav nav { display:flex; align-items:center; justify-content:center; gap:28px; color:var(--muted); font-size:14px; }
  .site-nav nav a { transition:color .18s ease; }
  .site-nav nav a:hover { color:var(--text); }
  .site-nav-actions { justify-self:end; display:inline-flex; align-items:center; gap:12px; }
  .site-language-toggle { position:relative; display:inline-flex; align-items:center; justify-content:center; }
  .site-language-trigger,.site-mobile-menu-trigger { width:38px; min-width:38px; height:38px; min-height:38px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--line); border-radius:999px; background:var(--bg); color:var(--muted); font-weight:800; }
  .site-mobile-menu-trigger { display:none; padding:0; cursor:default; }
  .site-nav-cta { min-height:38px; display:inline-flex; align-items:center; gap:8px; border-radius:999px; background:#eee; padding:0 18px; font-weight:900; }
  .site-nav-cta-icon { font-size:16px; line-height:1; }
  .shell { width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:28px 0 56px; }
  .back, .read { border:1px solid var(--line); border-radius:999px; padding:7px 11px; background:rgba(255,255,255,.72); }
  .hero { display:grid; grid-template-columns:minmax(0, 1fr); gap:18px; padding:36px 0 26px; border-bottom:1px solid var(--line); }
  .eyebrow { margin:0 0 8px; color:var(--text); font-size:13px; letter-spacing:.02em; font-weight:800; }
  h1 { margin:0; font-size:clamp(34px, 7vw, 72px); line-height:1.02; letter-spacing:0; max-width:980px; }
  .lede { color:var(--muted); font-size:18px; max-width:780px; }
  .search { display:flex; gap:10px; max-width:620px; }
  .search input { flex:1; min-width:0; color:var(--text); background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px 14px; font:inherit; }
  .search button { color:var(--text); background:var(--accent-soft); border:0; border-radius:8px; padding:12px 16px; font-weight:700; }
  .grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:18px; padding-top:28px; }
  .card { border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--panel); min-width:0; }
  .card img { width:100%; aspect-ratio:16/9; object-fit:cover; background:#f1f1f1; }
  .card-body { padding:16px; }
  .meta { display:flex; flex-wrap:wrap; gap:8px; color:var(--muted); font-size:12px; }
  .badge { color:#7c3f00; background:#fff1dc; border-radius:999px; padding:2px 8px; font-weight:700; }
  .card h2 { margin:10px 0 8px; font-size:20px; line-height:1.25; letter-spacing:0; }
  .card p { margin:0 0 14px; color:var(--muted); }
  .article { max-width:820px; margin:0 auto; padding-bottom:56px; }
  .article-hero { padding:24px 0 26px; border-bottom:1px solid var(--line); }
  .cover { margin:24px 0 10px; border-radius:8px; overflow:hidden; border:1px solid var(--line); background:#f1f1f1; }
  .cover img { width:100%; aspect-ratio:16/9; object-fit:cover; }
  .caption { color:var(--muted); font-size:13px; margin:8px 0 0; }
  .body { padding-top:26px; font-size:18px; }
  .body h2 { font-size:30px; line-height:1.2; margin:34px 0 12px; letter-spacing:0; }
  .body h3 { font-size:23px; line-height:1.25; margin:26px 0 10px; letter-spacing:0; }
  .body p { margin:0 0 18px; }
  .body strong { color:var(--text); font-weight:850; background:linear-gradient(to top,var(--accent-soft) 0 .36em,transparent .36em); box-decoration-break:clone; -webkit-box-decoration-break:clone; }
  .body blockquote { margin:0 0 22px; padding:16px 18px; border-left:3px solid var(--accent); border-radius:8px; background:linear-gradient(90deg,rgba(200,255,0,.1),#fff 56%); color:var(--text); }
  .body blockquote p { margin:0; }
  .body ul { margin:0 0 20px; padding-left:22px; }
  .inline-figure { margin:26px 0; border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--panel); }
  .inline-figure img { width:100%; aspect-ratio:16/9; object-fit:cover; }
  .inline-figure figcaption { padding:10px 12px; color:var(--muted); font-size:14px; }
  .blog-adsense-slot { box-sizing:border-box; width:min(760px,100%); min-height:0; display:block; margin:0 auto; overflow:hidden; }
  .blog-adsense-slot.is-index-feed { width:100%; margin:0; }
  .blog-adsense-slot:has(ins.adsbygoogle[data-ad-status="filled"]) { min-height:96px; margin:24px auto; }
  .blog-adsense-slot.is-index-feed:has(ins.adsbygoogle[data-ad-status="filled"]) { margin:0 0 24px; }
  .blog-adsense-slot ins.adsbygoogle[data-ad-status="unfilled"] { display:none!important; }
  .sources { border-top:1px solid var(--line); margin-top:34px; padding-top:22px; color:var(--muted); }
  .sources a { color:var(--text); font-weight:800; }
  @media (max-width: 820px) { .site-nav { grid-template-columns:1fr auto; min-height:72px; padding:0 22px; } .site-nav nav { display:none; } .site-nav-actions { gap:8px; } .site-language-trigger,.site-mobile-menu-trigger { width:36px; min-width:36px; height:36px; min-height:36px; } .site-mobile-menu-trigger { display:inline-flex; } .site-nav-cta { display:none; } .grid { grid-template-columns:1fr; } .shell { width:min(100% - 24px, 1120px); } .search { flex-direction:column; } }
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
  ${adsenseHeadSnippet()}
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

const globeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
const menuIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu" aria-hidden="true"><path d="M4 12h16"></path><path d="M4 6h16"></path><path d="M4 18h16"></path></svg>`;

function siteHeaderHtml(language: BlogLanguage) {
  const localized = language !== "zh-Hant";
  const navItems = [
    { label: localized ? "About" : "關於我們", href: "/#about" },
    { label: localized ? "Services" : "服務項目", href: "/#services" },
    { label: localized ? "Work" : "專案介紹", href: "/#portfolio" },
    { label: "Blog", href: blogIndexPath(language) }
  ];
  const ctaLabel = localized ? "Talk" : "合作洽談";
  return `<header class="site-nav">
    <a class="site-logo" aria-label="ALTOS LAB home" href="/"><span class="brand-text">ALTOS LAB</span></a>
    <nav aria-label="Main navigation">${navItems.map((item) => `<a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a>`).join("")}</nav>
    <div class="site-nav-actions">
      <div class="site-language-toggle"><button aria-expanded="false" aria-haspopup="menu" aria-label="Open language menu" class="site-language-trigger" type="button">${globeIcon}</button></div>
      <button aria-expanded="false" aria-label="Open menu" class="site-mobile-menu-trigger" type="button">${menuIcon}</button>
      <a class="site-nav-cta" href="/#contact"><span class="site-nav-cta-label">${escapeHtml(ctaLabel)}</span><span class="site-nav-cta-icon" aria-hidden="true">↗</span></a>
    </div>
  </header>`;
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
  const body = `<div class="site-home blog-site-shell">
    ${siteHeaderHtml(language)}
    <main class="shell">
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
      ${blogAdSlotHtml("index-feed")}
      <section aria-label="${escapeAttribute(dictionary.latest)}" class="grid">${cards || `<p>${escapeHtml(dictionary.empty)}</p>`}</section>
    </main>
  </div>`;

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
    <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt || image.caption || "")}" loading="lazy" decoding="async" onerror="this.closest('figure')?.remove()" />
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
  if ((normalizedKey === "evidence-desk" || normalizedKey === "source-desk") && (placement === "after-lead" || index === 0)) return true;
  if (normalizedKey === "mechanism" && placement === "mid-article") return true;
  if ((normalizedKey === "operating-loop" || normalizedKey === "repair-scene") && (placement === "mid-article" || index === 1)) return true;
  if (normalizedKey === "image" && index === 0) return true;
  return false;
}

function renderBody(post: BlogPost) {
  const blocks = String(post.body || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !/^常見問題|^FAQ/i.test(block));
  const images = post.contentImages || [];
  const usedImages = new Set<number>();
  const hasImagePlaceholders = blocks.some((block) => /^\[IMAGE:[a-z0-9_-]+\]$/i.test(block));

  const takeImageForPlaceholder = (key: string) => {
    const matchedIndex = images.findIndex((image, index) => !usedImages.has(index) && imageMatchesPlaceholder(image, key, index));
    const nextIndex = matchedIndex >= 0 ? matchedIndex : images.findIndex((_, index) => !usedImages.has(index));
    if (nextIndex < 0) return "";
    usedImages.add(nextIndex);
    return renderInlineImage(images[nextIndex]);
  };

  const renderUnusedImages = () => images.map((image, index) => (usedImages.has(index) ? "" : renderInlineImage(image))).join("");
  const interval = hasImagePlaceholders ? 0 : Math.max(2, Math.floor(blocks.length / Math.max(images.length, 1)));

  return blocks
    .map((block, blockIndex) => {
      const imagePlaceholder = block.match(/^\[IMAGE:([a-z0-9_-]+)\]$/i);
      if (imagePlaceholder) return takeImageForPlaceholder(imagePlaceholder[1] || "");

      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      let html = "";
      if (/^#{2,3}\s+/.test(block)) {
        const level = block.startsWith("###") ? "h3" : "h2";
        html = `<${level}>${renderInlineMarkdown(block.replace(/^#{2,3}\s+/, ""))}</${level}>`;
      } else if (lines.length > 0 && lines.every((line) => /^>\s+/.test(line))) {
        html = `<blockquote>${lines.map((line) => `<p>${renderInlineMarkdown(line.replace(/^>\s+/, ""))}</p>`).join("")}</blockquote>`;
      } else if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line))) {
        html = `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      } else {
        html = `<p>${lines.map(renderInlineMarkdown).join("<br />")}</p>`;
      }
      if (!hasImagePlaceholders && interval > 0 && (blockIndex + 1) % interval === 0) {
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
  const body = `<div class="site-home blog-site-shell">
    ${siteHeaderHtml(post.language)}
    <main class="shell article">
      <article>
        <header class="article-hero">
          <a class="back" href="${escapeAttribute(blogIndexPath(post.language))}">Back</a>
          <p class="eyebrow">${escapeHtml(blogContentTypeLabel(post.contentType, post.language))} · ${escapeHtml(postDate(post))}</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="lede">${escapeHtml(post.excerpt)}</p>
          <figure class="cover"><img src="${escapeAttribute(post.cover || blogCoverForLanguage(post.language))}" alt="${escapeAttribute(post.coverAlt || post.title)}" decoding="async" /></figure>
          ${post.coverCredit ? `<p class="caption">${escapeHtml(post.coverCredit)}</p>` : ""}
        </header>
        ${blogAdSlotHtml("after-summary")}
        <section class="body">${renderBody(post)}</section>
        ${blogAdSlotHtml("mid-article")}
        ${blogAdSlotHtml("before-related")}
        ${sources ? `<section class="sources"><p class="eyebrow">Sources</p><ul>${sources}</ul></section>` : ""}
      </article>
    </main>
  </div>`;

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
