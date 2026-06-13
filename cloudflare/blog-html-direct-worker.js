const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_PREFIXES = new Set(BLOG_LANGUAGES.filter((language) => language !== "zh-Hant"));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function safeLinkHref(value) {
  const raw = String(value || "").trim();
  try {
    const url = new URL(raw, "https://altoslab-ai.cc");
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") return raw;
  } catch {
    return "";
  }
  return "";
}

function inlineTextHtml(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_\n][\s\S]*?[^_\n])__/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, (_match, label, href) => {
    const safeHref = safeLinkHref(href);
    if (!safeHref) return label;
    return `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  return html;
}

const PUBLIC_EXCERPT_PREFIX_PATTERN =
  /^\s*(?:TL\s*;?\s*DR|TLDR)\s*(?:[（(][^）)]{0,80}[）)]|\s+from\s+[^:：]{1,80})?\s*[:：]\s*/i;

function stripPublicExcerptPrefix(value) {
  let text = String(value ?? "").trim();
  let previous = "";
  while (text && text !== previous) {
    previous = text;
    text = text.replace(PUBLIC_EXCERPT_PREFIX_PATTERN, "").trimStart();
  }
  return text.trim();
}

function plainText(value) {
  return String(value ?? "")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, "$1")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .trim();
}

function publicExcerptText(value) {
  return stripPublicExcerptPrefix(plainText(value));
}

function publicExcerptHtml(value) {
  return inlineTextHtml(stripPublicExcerptPrefix(value));
}

function blogIndexPath(language) {
  return language === "zh-Hant" ? "/blog" : `/${language}/blog`;
}

function blogPostPath(post) {
  return post.language === "zh-Hant" ? `/blog/${post.slug}` : `/${post.language}/blog/${post.slug}`;
}

function htmlLang(language) {
  return {
    "zh-Hant": "zh-Hant-TW",
    en: "en",
    ja: "ja",
    ko: "ko",
    id: "id",
    vi: "vi",
    th: "th",
    ms: "ms",
    fil: "fil"
  }[language] || "zh-Hant-TW";
}

function localeLabel(language) {
  return {
    "zh-Hant": "繁體中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    id: "Indonesia",
    vi: "Tiếng Việt",
    th: "ไทย",
    ms: "Melayu",
    fil: "Filipino"
  }[language] || language;
}

function contentTypeLabel(post) {
  if (post.contentType === "column") return post.language === "zh-Hant" ? "專欄" : "Column";
  if (post.contentType === "feature") return post.language === "zh-Hant" ? "專題" : "Feature";
  return post.language === "zh-Hant" ? "市場快訊" : "Market News";
}

function routeRequest(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (pathname === "/feed.xml" || pathname === "/rss.xml") return { kind: "feed" };
  if (pathname === "/llms.txt" || pathname === "/llms-full.txt") return { kind: "llms", full: pathname === "/llms-full.txt" };
  if (parts[0] === "blog" && !parts[1]) return { kind: "index", language: "zh-Hant" };
  if (parts[0] === "blog" && parts[1]) return { kind: "post", language: "zh-Hant", slug: decodeURIComponent(parts[1]) };
  if (LANGUAGE_PREFIXES.has(parts[0]) && parts[1] === "blog" && !parts[2]) {
    return { kind: "index", language: parts[0] };
  }
  if (LANGUAGE_PREFIXES.has(parts[0]) && parts[1] === "blog" && parts[2]) {
    return { kind: "post", language: parts[0], slug: decodeURIComponent(parts[2]) };
  }
  return null;
}

function dateLabel(value) {
  const raw = String(value || "").slice(0, 10);
  return raw ? raw.replaceAll("-", "/") : "";
}

function paragraphHtml(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      if (/^#{2,3}\s+/.test(paragraph)) return `<h2>${inlineTextHtml(paragraph.replace(/^#{2,3}\s+/, ""))}</h2>`;
      if (paragraph.split(/\n/).every((line) => /^>\s+/.test(line.trim()))) {
        return `<blockquote>${paragraph
          .split(/\n/)
          .map((line) => `<p>${inlineTextHtml(line.trim().replace(/^>\s+/, ""))}</p>`)
          .join("")}</blockquote>`;
      }
      if (/^\s*[-*]\s+/m.test(paragraph)) {
        const items = paragraph
          .split(/\n/)
          .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${inlineTextHtml(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineTextHtml(paragraph)}</p>`;
    })
    .join("");
}

function inlineImageHtml(image) {
  if (!image?.url || !image?.alt) return "";
  return `<figure class="inline-figure">
        <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt)}" loading="lazy" decoding="async" />
        ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
      </figure>`;
}

function inlineImagesHtml(images = []) {
  return images
    .filter((image) => image?.url && image?.alt)
    .slice(0, 3)
    .map((image) => inlineImageHtml(image))
    .join("");
}

function normalizeImageMarker(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

const imageMarkerAliases = {
  opening: ["opening", "after-lead", "lead", "intro"],
  mechanism: ["mechanism", "mid-article", "middle", "evidence"],
  synthesis: ["synthesis", "before-faq", "closing", "close"]
};

function imageMatchesMarker(image, imageIndex, marker) {
  const normalizedMarker = normalizeImageMarker(marker);
  const placement = normalizeImageMarker(image?.placement);
  const candidates = new Set([normalizedMarker, ...(imageMarkerAliases[normalizedMarker] || [])]);
  if (placement && candidates.has(placement)) return true;
  if (normalizedMarker === "opening" && imageIndex === 0) return true;
  if (normalizedMarker === "mechanism" && imageIndex === 1) return true;
  if (normalizedMarker === "synthesis" && imageIndex === 2) return true;
  return false;
}

function stripImageMarkers(text) {
  return String(text || "").replace(/\[IMAGE:[^\]]+\]/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

function articleBodyHtml(body, images = []) {
  const text = String(body || "");
  const validImages = images.filter((image) => image?.url && image?.alt).slice(0, 3);
  const markerRegex = /\[IMAGE:([a-z0-9_-]+)\]/gi;
  if (!validImages.length) return paragraphHtml(stripImageMarkers(body));
  if (!markerRegex.test(text)) return `${paragraphHtml(text)}${inlineImagesHtml(validImages)}`;

  markerRegex.lastIndex = 0;
  const usedIndexes = new Set();
  const parts = [];
  let cursor = 0;
  let match;

  while ((match = markerRegex.exec(text))) {
    const before = text.slice(cursor, match.index).replace(/\n{3,}/g, "\n\n").trim();
    if (before) parts.push(paragraphHtml(before));

    const marker = match[1] || "";
    const matchedIndex = validImages.findIndex((image, index) => !usedIndexes.has(index) && imageMatchesMarker(image, index, marker));
    const nextIndex = matchedIndex >= 0 ? matchedIndex : validImages.findIndex((_, index) => !usedIndexes.has(index));
    if (nextIndex >= 0) {
      usedIndexes.add(nextIndex);
      parts.push(inlineImageHtml(validImages[nextIndex]));
    }
    cursor = markerRegex.lastIndex;
  }

  const after = text.slice(cursor).replace(/\n{3,}/g, "\n\n").trim();
  if (after) parts.push(paragraphHtml(after));
  validImages.forEach((image, index) => {
    if (!usedIndexes.has(index)) parts.push(inlineImageHtml(image));
  });
  return parts.join("");
}

function sourceListHtml(post) {
  const links = Array.isArray(post.sourceLinks) ? post.sourceLinks : [];
  if (!links.length) return "";
  return `<section class="source-list">
    <p class="eyebrow">${post.language === "zh-Hant" ? "來源與參考" : "Sources"}</p>
    <ul>${links
      .map(
        (source) => `<li>
          <a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.url)}</a>
          <span class="source-meta"> · ${escapeHtml(source.publisher || "")}${source.publishedAt ? ` · ${escapeHtml(dateLabel(source.publishedAt))}` : ""}</span>
          ${source.summary ? `<p class="source-summary">${inlineTextHtml(source.summary)}</p>` : ""}
        </li>`
      )
      .join("")}</ul>
  </section>`;
}

function alternatesHtml(post, alternates = [], siteUrl) {
  const byLanguage = new Map(alternates.map((item) => [item.language, item]));
  byLanguage.set(post.language, post);
  return BLOG_LANGUAGES.map((language) => {
    const item = byLanguage.get(language);
    const path = item ? blogPostPath(item) : blogIndexPath(language);
    const hrefLang = language === "zh-Hant" ? "zh-Hant-TW" : language;
    return `<link rel="alternate" hreflang="${escapeAttribute(hrefLang)}" href="${escapeAttribute(`${siteUrl}${path}`)}" />`;
  }).join("\n");
}

function languageMenuHtml(post, alternates = []) {
  const byLanguage = new Map(alternates.map((item) => [item.language, item]));
  byLanguage.set(post.language, post);
  return `<div class="language-menu">${BLOG_LANGUAGES.map((language) => {
    const item = byLanguage.get(language);
    const path = item ? blogPostPath(item) : blogIndexPath(language);
    return `<a class="${language === post.language ? "is-current" : ""}" href="${escapeAttribute(path)}">${escapeHtml(localeLabel(language))}</a>`;
  }).join("")}</div>`;
}

function headerLanguageMenuHtml(currentLanguage = "zh-Hant", alternates = [], currentPost = null) {
  const byLanguage = new Map(alternates.map((item) => [item.language, item]));
  if (currentPost?.language) byLanguage.set(currentPost.language, currentPost);
  return `<div class="site-language-menu" role="menu">${BLOG_LANGUAGES.map((language) => {
    const item = byLanguage.get(language);
    const path = item ? blogPostPath(item) : blogIndexPath(language);
    const active = language === currentLanguage ? " is-active" : "";
    const current = language === currentLanguage ? ' aria-current="page"' : "";
    return `<a class="${active.trim()}" role="menuitemradio" aria-checked="${language === currentLanguage ? "true" : "false"}"${current} href="${escapeAttribute(path)}"><span>${escapeHtml(localeLabel(language))}</span><small>${escapeHtml(language)}</small></a>`;
  }).join("")}</div>`;
}

function analyticsHead(env) {
  const gaId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
  const gtmId = env.NEXT_PUBLIC_GTM_ID || "";
  return [
    gaId
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttribute(gaId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${escapeHtml(gaId)}');</script>`
      : "",
    gtmId
      ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${escapeHtml(gtmId)}');</script>`
      : ""
  ].join("");
}

function analyticsBody(env) {
  const gtmId = env.NEXT_PUBLIC_GTM_ID || "";
  return gtmId
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeAttribute(gtmId)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
    : "";
}

const DEFAULT_WONDA_WIDGET_SCRIPT_SRC = "https://wonda-web-kxbpzwq4sa-de.a.run.app/widget.js";
const DEFAULT_WONDA_WIDGET_CHANNEL_ID = "cmqb6hynd002hs619tqxc3pe5";
const DEFAULT_WONDA_WIDGET_API = "https://altoslab-ai.cc/api/wonda";

function isWondaWidgetDisabled(value) {
  return ["0", "false", "off", "disabled", "no"].includes(String(value || "").trim().toLowerCase());
}

function wondaWidgetHtml(env = {}) {
  if (isWondaWidgetDisabled(env.NEXT_PUBLIC_WONDA_WIDGET_ENABLED)) return "";
  const scriptSrc = String(env.NEXT_PUBLIC_WONDA_WIDGET_SCRIPT_SRC || DEFAULT_WONDA_WIDGET_SCRIPT_SRC).trim();
  const channelId = String(env.NEXT_PUBLIC_WONDA_WIDGET_CHANNEL_ID || DEFAULT_WONDA_WIDGET_CHANNEL_ID).trim();
  const api = String(env.NEXT_PUBLIC_WONDA_WIDGET_API || DEFAULT_WONDA_WIDGET_API).trim();
  if (!scriptSrc || !channelId || !api) return "";
  return `<script id="wonda-ai-widget" src="${escapeAttribute(scriptSrc)}" data-channel-id="${escapeAttribute(
    channelId
  )}" data-api="${escapeAttribute(api)}" async></script>`;
}

function articleJsonLd(post, canonical, image) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: plainText(post.excerpt || post.seoDescription),
    image,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: { "@type": "Person", name: "Tommy" },
    publisher: { "@type": "Organization", name: "ALTOS LAB" },
    mainEntityOfPage: canonical
  }).replaceAll("<", "\\u003c")}</script>`;
}

const CSS = `
:root{color-scheme:light;--paper:#fafafa;--ink:#111;--muted:#666;--line:#e7e7e7;--soft:#f4f4f4;--accent:#8b5cf6;--badge:#fff1dc;--badge-ink:#7c3f00;--al-blog-ink:#111;--al-blog-body:#333;--al-blog-muted:#707070;--al-blog-border:#e5e5e5;--al-blog-column-gap:60px;--fg-display:#111;--border:#dedede;--border-soft:#e8e8e8;--ink-900:#111;--r-pill:999px;--r-md:8px;--font-space:Inter,ui-sans-serif,system-ui,sans-serif;--font-display:Georgia,"Times New Roman",serif;--type-breaking-bg:#fff2df;--type-breaking-border:#f3d6b5;--type-breaking-fg:#7c3f00;--type-column-bg:#edf2ff;--type-column-border:#ced8f4;--type-column-fg:#283f7a;--type-feature-bg:#edf7f0;--type-feature-border:#c9e5d0;--type-feature-fg:#275b36}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72}a{color:inherit;text-decoration:none}img{max-width:100%;display:block}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.site-nav{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:28px;padding:26px 7vw;background:rgba(250,250,250,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.site-logo{font-weight:800;letter-spacing:.18em}.site-nav nav{display:flex;gap:28px;font-size:14px}.site-nav-actions{display:flex;align-items:center;gap:10px;margin-left:auto}.site-nav-cta{display:inline-flex;align-items:center;border-radius:999px;background:#eee;padding:10px 18px;font-weight:700}.site-language-details,.site-mobile-menu-wrap{position:relative}.site-language-trigger,.site-mobile-menu-trigger{width:42px;height:42px;display:inline-grid;place-items:center;border:1px solid var(--line);border-radius:999px;background:#fff;color:#111;font-weight:800;cursor:pointer;list-style:none}.site-language-trigger::-webkit-details-marker,.site-mobile-menu-trigger::-webkit-details-marker{display:none}.site-language-details:not([open]) .site-language-menu,.site-mobile-menu-wrap:not([open]) .site-mobile-menu{display:none}.site-language-menu{position:absolute;top:calc(100% + 10px);right:0;width:230px;display:grid;gap:6px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 22px 60px rgba(0,0,0,.12)}.site-language-menu a{display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:8px;padding:8px 10px;color:var(--muted);font-size:13px}.site-language-menu a.is-active,.site-language-menu a:hover{background:var(--soft);color:#111}.site-language-menu small{font-size:11px;color:var(--muted)}.site-mobile-menu-wrap{display:none}.site-mobile-menu{position:absolute;top:calc(100% + 10px);right:0;width:min(300px,calc(100vw - 40px));display:grid;gap:8px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 22px 60px rgba(0,0,0,.12)}.site-mobile-menu a{display:flex;align-items:center;justify-content:space-between;gap:16px;border-radius:10px;padding:11px 12px;color:#111}.site-mobile-menu small{color:var(--muted);font-size:12px}.site-mobile-menu-cta{background:#111!important;color:#fff!important}.language-menu{display:flex;flex-wrap:wrap;gap:8px}.language-menu a{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;color:var(--muted)}.language-menu a.is-current{background:#111;color:#fff}.blog-page{padding:64px 20px}.blog-article-page article,.blog-index-inner{max-width:1100px;margin:0 auto}.blog-article-page article{max-width:820px}.article-nav-row{margin-bottom:28px}.card-link{font-weight:800}.article-kicker{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:var(--muted);font-size:14px}.blog-craft-type-badge{border-radius:999px;padding:3px 10px;background:var(--badge);color:var(--badge-ink);font-weight:800}.article-hero h1,.blog-index-hero h1{margin:12px 0 18px;font-size:clamp(40px,7vw,68px);line-height:1.04;letter-spacing:0}.article-meta,.blog-card-meta{display:flex;gap:12px;color:var(--muted);font-size:14px;font-weight:700}.hero-copy,.blog-index-hero p{font-size:20px;color:#333;max-width:760px}.article-cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:#f1f1f1}.article-cover-credit,.caption,.source-meta,.source-summary{font-size:13px;color:var(--muted)}.geo-summary,.article-takeaways{margin:28px 0;padding:22px;border:1px solid var(--line);border-radius:8px;background:#fff}.article-takeaways ul{margin:8px 0 0;padding-left:22px;color:var(--accent);font-weight:750}.eyebrow{margin:0 0 8px;font-size:13px;letter-spacing:.02em;color:var(--accent);font-weight:800}.rich-text{font-size:18px}.rich-text p{margin:0 0 22px}.rich-text h2{font-size:30px;line-height:1.2;margin:34px 0 12px}.rich-text ul{margin:0 0 22px;padding-left:22px}.inline-figure{margin:28px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff}.inline-figure img{width:100%;aspect-ratio:16/9;object-fit:cover}.inline-figure figcaption{padding:10px 12px;color:var(--muted);font-size:14px}.source-list,.ai-disclosure,.article-author-card{margin-top:34px;padding-top:22px;border-top:1px solid var(--line)}.source-list ul{padding-left:22px}.source-list a{font-weight:800}.article-tag-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.article-tag-chip{border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff}.article-author-card{display:flex;gap:14px;align-items:center}.article-author-mark img{width:52px;height:52px;border-radius:50%;object-fit:cover}.blog-index-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:38px}.blog-card{display:flex;flex-direction:column;min-height:100%;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fff}.blog-card img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#eee}.blog-card-body{display:flex;flex-direction:column;gap:12px;padding:18px}.blog-card h2{font-size:24px;line-height:1.18;margin:0}.blog-card p{margin:0;color:#444}.blog-card-meta{font-size:13px}.blog-card-read{margin-top:auto;font-weight:800}.site-footer{display:flex;justify-content:space-between;gap:20px;padding:36px 7vw;border-top:1px solid var(--line);color:var(--muted);font-size:14px}.brand-text{font-weight:800;letter-spacing:.12em}@media(max-width:900px){.blog-index-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.site-nav{padding:16px 20px;align-items:center;flex-direction:row}.site-nav nav{display:none}.site-nav-actions>.site-nav-cta{display:none}.site-mobile-menu-wrap{display:block}.site-language-menu{width:min(230px,calc(100vw - 40px))}.blog-page{padding:36px 16px}.article-hero h1,.blog-index-hero h1{font-size:40px}.hero-copy,.blog-index-hero p,.rich-text{font-size:17px}.blog-index-grid{grid-template-columns:1fr}.site-footer{flex-direction:column;padding:28px 20px}}
`;

const INDEX_CSS = `
.blog-craft-index{width:min(88vw,1392px);padding-top:40px}.blog-craft-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:60px;align-items:start;min-width:0}.blog-craft-sidebar{position:sticky;top:112px;min-width:0;min-height:calc(100svh - 154px);display:grid;grid-template-rows:auto auto auto 1fr;gap:20px;border-right:1px solid var(--al-blog-border);padding-right:32px}.blog-craft-brand h1{width:157px;min-height:93px;margin:0 0 12px;color:#111;font-size:54px;line-height:.9;letter-spacing:0;font-family:var(--font-space);font-weight:900}.blog-craft-brand h1 span,.blog-craft-brand h1 em{display:block}.blog-craft-brand h1 em{margin-top:6px;font-family:var(--font-display);font-size:.84em;line-height:.98;font-style:italic;font-weight:400}.blog-craft-brand p{margin:0;max-width:200px;color:var(--al-blog-muted);font-size:14px;line-height:20px}.blog-craft-brand:after{content:"";width:92px;height:1px;display:block;margin-top:30px;background:var(--border)}.blog-craft-nav{display:grid;align-content:start;gap:0;padding-top:1em}.blog-craft-nav a{width:fit-content;color:var(--al-blog-muted);font-size:15px;line-height:30px;font-weight:400}.blog-craft-nav a.active{color:#111;font-weight:500}.blog-craft-search{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px}.blog-craft-search input{min-width:0;height:38px;border:1px solid var(--al-blog-border);border-radius:999px;padding:0 14px;color:#111;background:#fff;font-size:13px}.blog-craft-search button{height:38px;border:1px solid #111;border-radius:999px;padding:0 14px;color:#fff;background:#111;font-size:13px}.blog-craft-sidebar-footer{display:flex;align-self:end;justify-content:space-between;gap:14px;color:var(--al-blog-muted);font-size:14px}.blog-craft-sidebar-footer strong{color:#111}.blog-craft-feed{min-width:0}.blog-craft-feed-top{display:none;align-items:end;justify-content:space-between;gap:18px;margin-bottom:30px}.blog-craft-feed-top h2{margin:0;color:#111;font-size:32px;line-height:1.05}.blog-craft-feed-top h2 em{color:var(--al-blog-muted);font-style:normal;font-weight:400}.blog-craft-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:60px;row-gap:40px}.blog-craft-card{min-width:0}.blog-craft-card-image{display:block;overflow:hidden;border:1px solid var(--border-soft);border-radius:8px;background:#111}.blog-craft-card-image img{width:100%;aspect-ratio:16/8.4;display:block;object-fit:cover;object-position:center}.blog-craft-card-body{padding-top:12px}.blog-craft-card h3{margin:0;color:#111;font-size:22px;line-height:28px;font-weight:700;letter-spacing:0}.blog-craft-card-body>p{margin:8px 0 10px;color:#333;font-size:16px;line-height:24px}.blog-craft-card-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:10px;color:var(--al-blog-muted);font-size:12px;line-height:16px}.blog-craft-card-meta>span,.blog-craft-card-meta small{display:inline-flex;align-items:center;color:var(--al-blog-muted);font-size:inherit;line-height:inherit}.blog-craft-type-badge{display:inline-flex;align-items:center;width:max-content;min-height:24px;padding:3px 9px;border:1px solid var(--type-badge-border,var(--border-soft));border-radius:999px;background:var(--type-badge-bg,#fff);color:var(--type-badge-fg,#111);font-size:11px;line-height:14px;font-weight:700}.blog-craft-type-badge.is-breaking{--type-badge-bg:var(--type-breaking-bg);--type-badge-border:var(--type-breaking-border);--type-badge-fg:var(--type-breaking-fg)}.blog-craft-type-badge.is-column{--type-badge-bg:var(--type-column-bg);--type-badge-border:var(--type-column-border);--type-badge-fg:var(--type-column-fg)}.blog-craft-type-badge.is-feature{--type-badge-bg:var(--type-feature-bg);--type-badge-border:var(--type-feature-border);--type-badge-fg:var(--type-feature-fg)}.blog-craft-pagination{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:54px;color:var(--al-blog-muted)}.blog-craft-page-link{width:40px;height:40px;display:inline-grid;place-items:center;border:1px solid var(--al-blog-border);border-radius:999px;color:#111;background:#fff;font-size:22px;line-height:1}.blog-craft-page-link.is-disabled{opacity:.32;pointer-events:none}.blog-craft-page-status{min-width:62px;text-align:center;font-family:var(--font-space);font-size:13px;letter-spacing:.08em}@media(max-width:980px){.blog-craft-index{width:min(100% - 60px,760px)}.blog-craft-layout{grid-template-columns:1fr;gap:46px}.blog-craft-sidebar{position:static;width:100%;min-height:0;display:block;border-right:0;border-bottom:1px solid var(--al-blog-border);padding-right:0}.blog-craft-nav{display:flex;gap:32px;margin-inline:-30px;overflow-x:auto;padding:26px 30px;scrollbar-width:none}.blog-craft-nav a{flex:0 0 auto;white-space:nowrap}.blog-craft-search-sidebar,.blog-craft-sidebar-footer{display:none}.blog-craft-feed-top{display:grid;justify-items:center;gap:0;margin:-8px 0 34px;text-align:center}.blog-craft-feed-top .eyebrow{display:none}.blog-craft-feed-top h2{max-width:520px;color:var(--al-blog-muted);font-size:24px;line-height:1.35;font-weight:400}.blog-craft-feed-top h2 span{color:#111;font-weight:600}.blog-craft-feed-top .blog-craft-search{width:min(100%,480px);margin-top:20px}.blog-craft-grid{grid-template-columns:1fr;row-gap:52px}}@media(max-width:760px){.blog-craft-index{width:min(100% - 40px,760px);padding-top:48px}.blog-craft-brand h1{width:auto;min-height:0;font-size:50px}.blog-craft-brand p{max-width:340px;font-size:18px;line-height:1.42}.blog-craft-nav{gap:28px;margin-inline:-20px;padding-inline:20px}.blog-craft-nav a{font-size:18px;line-height:1.5}.blog-craft-card h3{font-size:22px;line-height:28px}}
`;

async function readPost(env, slug, language) {
  const database = env.ALTOS_BLOG_D1;
  if (!database?.prepare) return null;
  const row = await database
    .prepare("SELECT detail_json AS payload FROM public_blog_posts WHERE status = 'published' AND language = ?1 AND slug = ?2 LIMIT 1")
    .bind(language, slug)
    .first();
  if (typeof row?.payload !== "string") return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

async function readAlternates(env, translationGroupId) {
  if (!translationGroupId || !env.ALTOS_BLOG_D1?.prepare) return [];
  try {
    const result = await env.ALTOS_BLOG_D1
      .prepare("SELECT language, slug, translation_group_id AS translationGroupId FROM public_blog_posts WHERE status = 'published' AND translation_group_id = ?1 LIMIT 20")
      .bind(translationGroupId)
      .all();
    return Array.isArray(result?.results)
      ? result.results.map((row) => ({ language: row.language, slug: row.slug, translationGroupId: row.translationGroupId }))
      : [];
  } catch {
    return [];
  }
}

function safeLimit(value, fallback = 120) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 240) : fallback;
}

function postTimestamp(post) {
  return Date.parse(post?.publishedAt || post?.updatedAt || post?.createdAt || "") || 0;
}

function sortByPublishedRecency(posts) {
  return [...posts].sort((a, b) => postTimestamp(b) - postTimestamp(a) || Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
}

async function readIndexPosts(env, language, limit = 120) {
  const database = env.ALTOS_BLOG_D1;
  if (!database?.prepare) return [];
  const normalizedLimit = safeLimit(limit);
  try {
    const result = await database
      .prepare(
        `SELECT inventory_json AS payload FROM public_blog_posts
         WHERE status = 'published' AND language = ?1
         ORDER BY COALESCE(strftime('%s', published_at), 0) DESC, sort_order ASC
         LIMIT ${normalizedLimit}`
      )
      .bind(language)
      .all();
    const posts = Array.isArray(result?.results)
      ? result.results
          .map((row) => {
            if (typeof row?.payload !== "string") return null;
            try {
              return JSON.parse(row.payload);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      : [];
    return sortByPublishedRecency(posts);
  } catch {
    return [];
  }
}

async function readRecentPosts(env, limit = 80) {
  const database = env.ALTOS_BLOG_D1;
  if (!database?.prepare) return [];
  const normalizedLimit = safeLimit(limit, 80);
  try {
    const result = await database
      .prepare(
        `SELECT inventory_json AS payload FROM public_blog_posts
         WHERE status = 'published'
         ORDER BY COALESCE(strftime('%s', published_at), 0) DESC, sort_order ASC
         LIMIT ${normalizedLimit}`
      )
      .all();
    const posts = Array.isArray(result?.results)
      ? result.results
          .map((row) => {
            if (typeof row?.payload !== "string") return null;
            try {
              return JSON.parse(row.payload);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      : [];
    return sortByPublishedRecency(posts);
  } catch {
    return [];
  }
}

function indexCopy(language) {
  const localized = {
    "zh-Hant": {
      eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
      title: "AI 實驗室筆記",
      brandTitle: "AI",
      brandScript: "& Craft",
      description: "我們研究、建造，然後把經驗發布成可引用的知識。",
      latest: "最新文章",
      searchLabel: "搜尋文章",
      searchPlaceholder: "搜尋 AI、Agent、GEO...",
      searchSubmit: "搜尋",
      readTime: (minutes) => `${minutes || 3} 分鐘閱讀`,
      postsLabel: "篇文章",
      topics: ["Latest", "市場快訊", "市場專欄", "專題", "AI 趨勢", "Agents", "Automation", "GEO", "Build Notes"]
    },
    en: {
      eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
      title: "AI Lab Notes",
      brandTitle: "AI",
      brandScript: "& Craft",
      description: "Thoughts on the future of work, from the people and teams creating it.",
      latest: "Latest Articles",
      searchLabel: "Search articles",
      searchPlaceholder: "Search AI, agents, GEO...",
      searchSubmit: "Search",
      readTime: (minutes) => `${minutes || 3} min read`,
      postsLabel: "posts",
      topics: ["Latest", "Market Briefs", "Market Columns", "Features", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
    }
  };
  return localized[language] || { ...localized.en, title: localeLabel(language), description: "ALTOS LAB AI implementation journal." };
}

function topicMatches(post, tag = "") {
  const normalized = String(tag || "").trim().toLowerCase();
  if (!normalized || normalized === "latest") return true;
  const haystack = [post.contentType, post.newsCategory, post.topic, ...(post.tags || [])].join(" ").toLowerCase();
  if (["market briefs", "市場快訊"].includes(normalized)) return /breaking|快訊|market/i.test(haystack);
  if (["market columns", "市場專欄"].includes(normalized)) return /column|專欄/i.test(haystack);
  if (["features", "專題"].includes(normalized)) return /feature|專題/i.test(haystack);
  return haystack.includes(normalized);
}

function queryMatches(post, query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [post.title, post.excerpt, post.topic, post.geoSummary, ...(post.tags || [])].join(" ").toLowerCase().includes(normalized);
}

function indexHref(language, params = {}) {
  const search = new URLSearchParams();
  if (params.tag) search.set("tag", params.tag);
  if (params.query) search.set("query", params.query);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return `${blogIndexPath(language)}${query ? `?${query}` : ""}`;
}

function siteHeaderHtml(language = "zh-Hant", alternates = [], currentPost = null) {
  const languageMenu = headerLanguageMenuHtml(language, alternates, currentPost);
  return `<header class="site-nav">
    <a class="site-logo" aria-label="ALTOS LAB home" href="/"><span class="brand-text">ALTOS LAB</span></a>
    <nav aria-label="Main navigation"><a href="/#about">關於我們</a><a href="/#services">服務項目</a><a href="/#portfolio">專案介紹</a><a href="/blog">Blog</a></nav>
    <div class="site-nav-actions">
      <details class="site-language-details">
        <summary class="site-language-trigger" aria-label="Open language menu">◎</summary>
        ${languageMenu}
      </details>
      <a class="site-nav-cta" href="/#contact">合作洽談 ↗</a>
      <details class="site-mobile-menu-wrap">
        <summary class="site-mobile-menu-trigger" aria-label="Open mobile menu">☰</summary>
        <div class="site-mobile-menu">
          <a href="/#about"><strong>關於我們</strong><small>About</small></a>
          <a href="/#services"><strong>服務項目</strong><small>Services</small></a>
          <a href="/#portfolio"><strong>專案介紹</strong><small>Projects</small></a>
          <a href="/blog"><strong>Blog</strong><small>Journal</small></a>
          <a class="site-mobile-menu-cta" href="/#contact">合作洽談 ↗</a>
        </div>
      </details>
    </div>
  </header>`;
}

function renderIndex(posts, language, env, requestUrl) {
  const url = new URL(requestUrl);
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || url.origin;
  const dictionary = indexCopy(language);
  const tag = url.searchParams.get("tag") || "";
  const query = url.searchParams.get("query") || "";
  const pageSize = 18;
  const filtered = sortByPublishedRecency(posts).filter((post) => topicMatches(post, tag) && queryMatches(post, query));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(Number(url.searchParams.get("page") || 1)) || 1), pageCount);
  const visiblePosts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const cards = visiblePosts
    .map((post) => {
      const cover = post.cover || `${siteUrl}/blog-cover-zh-hant.png`;
      return `<article class="blog-craft-card">
        <a class="blog-craft-card-image" href="${escapeAttribute(blogPostPath(post))}">
          <img src="${escapeAttribute(cover)}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="lazy" decoding="async" />
        </a>
        <div class="blog-craft-card-body">
          <h3><a href="${escapeAttribute(blogPostPath(post))}">${inlineTextHtml(post.title)}</a></h3>
          <p>${publicExcerptHtml(post.excerpt || "")}</p>
          <div class="blog-craft-card-meta">
            <span class="blog-craft-type-badge is-${escapeAttribute(post.contentType || "breaking")}">${escapeHtml(contentTypeLabel(post))}</span>
            <span class="blog-craft-card-taxonomy">${escapeHtml(post.newsCategory || post.tags?.[0] || post.topic || "AI")}</span>
            <small>${escapeHtml(dictionary.readTime(post.readTimeMinutes))}</small>
          </div>
        </div>
      </article>`;
    })
    .join("");
  const topics = dictionary.topics
    .map((item) => {
      const active = (tag || "Latest").toLowerCase() === item.toLowerCase() || (!tag && item === "Latest");
      return `<a class="${active ? "active" : ""}" href="${escapeAttribute(item === "Latest" ? blogIndexPath(language) : indexHref(language, { tag: item }))}">${escapeHtml(item)}</a>`;
    })
    .join("");
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < pageCount ? currentPage + 1 : null;
  return `<!doctype html>
<html lang="${escapeAttribute(htmlLang(language))}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(dictionary.title)}｜ALTOS LAB</title>
  <meta name="description" content="${escapeAttribute(dictionary.description)}" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="canonical" href="${escapeAttribute(`${siteUrl}${blogIndexPath(language)}`)}" />
  ${analyticsHead(env)}
  <style>${CSS}${INDEX_CSS}</style>
</head>
<body>
${analyticsBody(env)}
<div class="site-home blog-site-shell">
  ${siteHeaderHtml(language)}
  <main class="blog-page blog-index-page blog-craft-index">
    <div class="blog-craft-layout">
      <aside class="blog-craft-sidebar" aria-label="Blog navigation">
        <div class="blog-craft-brand"><h1><span>${escapeHtml(dictionary.brandTitle)}</span><em>${escapeHtml(dictionary.brandScript)}</em></h1><p>${escapeHtml(dictionary.description)}</p></div>
        <nav class="blog-craft-nav" aria-label="Blog topics">${topics}</nav>
        <form class="blog-craft-search blog-craft-search-sidebar" action="${escapeAttribute(blogIndexPath(language))}" role="search">
          ${tag ? `<input type="hidden" name="tag" value="${escapeAttribute(tag)}" />` : ""}
          <label class="sr-only" for="blog-direct-search">${escapeHtml(dictionary.searchLabel)}</label>
          <input id="blog-direct-search" name="query" type="search" value="${escapeAttribute(query)}" placeholder="${escapeAttribute(dictionary.searchPlaceholder)}" autocomplete="off" />
          <button type="submit">${escapeHtml(dictionary.searchSubmit)}</button>
        </form>
        <div class="blog-craft-sidebar-footer"><span><strong>${posts.length}</strong> ${escapeHtml(dictionary.postsLabel)}</span></div>
      </aside>
      <section class="blog-craft-feed" aria-label="${escapeAttribute(dictionary.latest)}">
        <div class="blog-craft-feed-top">
          <div><p class="eyebrow">${escapeHtml(dictionary.latest)}</p><h2><span>${escapeHtml(tag || dictionary.title)}</span><em>— ${escapeHtml(dictionary.description)}</em></h2></div>
          <form class="blog-craft-search" action="${escapeAttribute(blogIndexPath(language))}" role="search">
            ${tag ? `<input type="hidden" name="tag" value="${escapeAttribute(tag)}" />` : ""}
            <input name="query" type="search" value="${escapeAttribute(query)}" placeholder="${escapeAttribute(dictionary.searchPlaceholder)}" autocomplete="off" />
            <button type="submit">${escapeHtml(dictionary.searchSubmit)}</button>
          </form>
        </div>
        <div class="blog-craft-grid">${cards || `<p class="muted">No matching articles yet.</p>`}</div>
        ${filtered.length > pageSize ? `<nav class="blog-craft-pagination" aria-label="Blog pagination">
          ${previousPage ? `<a class="blog-craft-page-link" href="${escapeAttribute(indexHref(language, { tag, query, page: previousPage }))}">‹</a>` : `<span class="blog-craft-page-link is-disabled">‹</span>`}
          <span class="blog-craft-page-status">${currentPage} / ${pageCount}</span>
          ${nextPage ? `<a class="blog-craft-page-link" href="${escapeAttribute(indexHref(language, { tag, query, page: nextPage }))}">›</a>` : `<span class="blog-craft-page-link is-disabled">›</span>`}
        </nav>` : ""}
      </section>
    </div>
  </main>
  <footer class="site-footer"><span class="brand-text">ALTOS LAB</span><span>© 2026 ALTOS LAB · AI implementation studio</span></footer>
</div>
${wondaWidgetHtml(env)}
</body>
</html>`;
}

function renderFeed(posts, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const items = posts
    .slice(0, 50)
    .map(
      (post) => `<item><title>${escapeHtml(post.title)}</title><link>${escapeHtml(`${siteUrl}${blogPostPath(post)}`)}</link><guid>${escapeHtml(`${siteUrl}${blogPostPath(post)}`)}</guid><pubDate>${escapeHtml(new Date(post.publishedAt || post.updatedAt || post.createdAt || Date.now()).toUTCString())}</pubDate><description>${escapeHtml(publicExcerptText(post.excerpt || post.seoDescription || ""))}</description></item>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ALTOS LAB Journal</title><link>${escapeHtml(`${siteUrl}/blog`)}</link><description>ALTOS LAB AI implementation journal</description>${items}</channel></rss>`;
}

function renderLlms(posts, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const lines = [
    "# ALTOS LAB",
    "",
    "ALTOS LAB is an AI implementation studio publishing market notes, columns and implementation lessons.",
    "",
    "## Blog",
    ...posts.slice(0, 60).map((post) => `- [${plainText(post.title)}](${siteUrl}${blogPostPath(post)}): ${publicExcerptText(post.excerpt || post.seoDescription || "").slice(0, 180)}`)
  ];
  return `${lines.join("\n")}\n`;
}

function renderPost(post, alternates, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const canonical = `${siteUrl}${blogPostPath(post)}`;
  const image = post.cover || `${siteUrl}/blog-cover-zh-hant.png`;
  const description = publicExcerptText(post.seoDescription || post.excerpt || post.title);
  const sourceCredit = post.coverCreditUrl
    ? `<a href="${escapeAttribute(post.coverCreditUrl)}" target="_blank" rel="noreferrer">${escapeHtml(post.coverCredit || "")}</a>`
    : escapeHtml(post.coverCredit || "");
  const takeaways = Array.isArray(post.keyTakeaways) && post.keyTakeaways.length
    ? `<section class="project-detail-card article-takeaways"><p class="eyebrow">${post.language === "zh-Hant" ? "本文重點" : "Key Points"}</p><ul>${post.keyTakeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`
    : "";
  const tags = Array.isArray(post.tags)
    ? post.tags.slice(0, 6).map((tag) => `<a class="article-tag-chip" href="${escapeAttribute(`${blogIndexPath(post.language)}?tag=${encodeURIComponent(tag)}`)}">${escapeHtml(tag)}</a>`).join("")
    : "";
  const body = `<!doctype html>
<html lang="${escapeAttribute(htmlLang(post.language))}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#fafafa" />
  <title>${escapeHtml(post.seoTitle || post.title)}｜ALTOS LAB</title>
  <meta name="description" content="${escapeAttribute(description)}" />
  <meta name="robots" content="index, follow" />
  ${env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${escapeAttribute(env.GOOGLE_SITE_VERIFICATION)}" />` : ""}
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="canonical" href="${escapeAttribute(canonical)}" />
  ${alternatesHtml(post, alternates, siteUrl)}
  <meta property="og:title" content="${escapeAttribute(post.title)}" />
  <meta property="og:description" content="${escapeAttribute(publicExcerptText(post.excerpt || description))}" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:image" content="${escapeAttribute(image)}" />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(post.title)}" />
  <meta name="twitter:description" content="${escapeAttribute(description)}" />
  <meta name="twitter:image" content="${escapeAttribute(image)}" />
  ${analyticsHead(env)}
  ${articleJsonLd(post, canonical, image)}
  <style>${CSS}</style>
</head>
<body>
${analyticsBody(env)}
<div class="site-home blog-site-shell">
  ${siteHeaderHtml(post.language, alternates, post)}
  <main class="blog-page blog-article-page">
    <article>
      <header class="article-hero">
        <div class="article-nav-row"><a class="card-link" href="${escapeAttribute(blogIndexPath(post.language))}">← Blog</a></div>
        <p class="eyebrow article-kicker"><span class="blog-craft-type-badge">${escapeHtml(contentTypeLabel(post))}</span><span>${escapeHtml(post.topic || post.newsCategory || "AI")}</span><span>${escapeHtml(String(post.readTimeMinutes || 3))} 分鐘閱讀</span></p>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="article-meta"><span>更新 ${escapeHtml(dateLabel(post.updatedAt || post.publishedAt))}</span><span>${escapeHtml(localeLabel(post.language))}</span></div>
        ${post.excerpt ? `<p class="hero-copy">${publicExcerptHtml(post.excerpt)}</p>` : ""}
        ${image ? `<img class="article-cover" src="${escapeAttribute(image)}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="eager" decoding="async" />` : ""}
        ${sourceCredit ? `<p class="article-cover-credit">圖片來源： ${sourceCredit}</p>` : ""}
      </header>
      ${post.geoSummary ? `<aside class="geo-summary"><strong>${post.language === "zh-Hant" ? "重點摘要" : "Summary"}:</strong> ${inlineTextHtml(post.geoSummary)}</aside>` : ""}
      ${takeaways}
      <div class="rich-text">${articleBodyHtml(post.body, post.contentImages)}</div>
      ${sourceListHtml(post)}
      <aside class="ai-disclosure"><strong>編輯審核:</strong> 本文由 <span class="brand-text">ALTOS LAB</span> 編輯團隊審校，已確認來源脈絡、可讀性、事實一致性與實務可用性。</aside>
      ${tags ? `<nav class="article-tag-strip" aria-label="文章標籤">${tags}</nav>` : ""}
      <section class="article-author-card" aria-label="作者"><span class="article-author-mark"><img src="/authors/tommy-avatar.jpg" alt="" loading="lazy" /></span><div><h2>Tommy</h2><p>ALTOS LAB 產品與 AI 導入編輯，關注企業流程、生成式搜尋與能真正落地的決策框架。</p></div></section>
    </article>
  </main>
  <footer class="site-footer"><span class="brand-text">ALTOS LAB</span><span>© 2026 ALTOS LAB · AI implementation studio</span></footer>
</div>
${wondaWidgetHtml(env)}
</body>
</html>`;
  return body;
}

export async function maybeHandleDirectBlogHtml(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const parsed = routeRequest(url.pathname);
  if (!parsed) return null;
  if (parsed.kind === "index") {
    const posts = await readIndexPosts(env, parsed.language, 180);
    const html = renderIndex(posts, parsed.language, env, request.url);
    return new Response(request.method === "HEAD" ? null : html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=120, stale-while-revalidate=1800",
        "x-altos-direct-blog-render": "cloudflare-d1-index"
      }
    });
  }
  if (parsed.kind === "feed") {
    const posts = await readRecentPosts(env, 80);
    const xml = renderFeed(posts, env, request.url);
    return new Response(request.method === "HEAD" ? null : xml, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=120, stale-while-revalidate=1800",
        "x-altos-direct-blog-render": "cloudflare-d1-feed"
      }
    });
  }
  if (parsed.kind === "llms") {
    const posts = await readRecentPosts(env, parsed.full ? 120 : 80);
    const text = renderLlms(posts, env, request.url);
    return new Response(request.method === "HEAD" ? null : text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=120, stale-while-revalidate=1800",
        "x-altos-direct-blog-render": "cloudflare-d1-llms"
      }
    });
  }
  const post = await readPost(env, parsed.slug, parsed.language);
  if (!post) return null;
  const alternates = await readAlternates(env, post.translationGroupId);
  const html = renderPost(post, alternates, env, request.url);
  return new Response(request.method === "HEAD" ? null : html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120, stale-while-revalidate=1800",
      "x-altos-direct-blog-render": "cloudflare-d1"
    }
  });
}
