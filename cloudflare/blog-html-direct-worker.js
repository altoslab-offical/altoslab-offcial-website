const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_PREFIXES = new Set(BLOG_LANGUAGES.filter((language) => language !== "zh-Hant"));
const BLOG_INDEX_PAGE_SIZE = 18;

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

function plainText(value) {
  return String(value ?? "")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, "$1")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .trim();
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
  if (parts[0] === "blog" && !parts[1]) return null;
  if (parts[0] === "blog" && parts[1]) return { kind: "post", language: "zh-Hant", slug: decodeURIComponent(parts[1]) };
  if (LANGUAGE_PREFIXES.has(parts[0]) && parts[1] === "blog" && !parts[2]) {
    return null;
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

function inlineImagesHtml(images = []) {
  return images
    .filter((image) => image?.url && image?.alt)
    .slice(0, 3)
    .map(
      (image) => `<figure class="inline-figure">
        <img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt)}" loading="lazy" decoding="async" />
        ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
      </figure>`
    )
    .join("");
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
:root{color-scheme:light;--paper:#fafafa;--ink:#111;--muted:#666;--line:#e7e7e7;--soft:#f4f4f4;--accent:#8b5cf6;--badge:#fff1dc;--badge-ink:#7c3f00}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72}a{color:inherit;text-decoration:none}img{max-width:100%;display:block}.site-nav{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:28px;padding:26px 7vw;background:rgba(250,250,250,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.site-logo{font-weight:800;letter-spacing:.18em}.site-nav nav{display:flex;gap:28px;font-size:14px}.site-nav-cta{display:inline-flex;align-items:center;border-radius:999px;background:#eee;padding:10px 18px;font-weight:700}.language-menu{display:flex;flex-wrap:wrap;gap:8px}.language-menu a{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;color:var(--muted)}.language-menu a.is-current{background:#111;color:#fff}.blog-page{padding:64px 20px}.blog-article-page article,.blog-index-inner{max-width:1100px;margin:0 auto}.blog-article-page article{max-width:820px}.article-nav-row{margin-bottom:28px}.card-link{font-weight:800}.article-kicker{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:var(--muted);font-size:14px}.blog-craft-type-badge{border-radius:999px;padding:3px 10px;background:var(--badge);color:var(--badge-ink);font-weight:800}.article-hero h1,.blog-index-hero h1{margin:12px 0 18px;font-size:clamp(40px,7vw,68px);line-height:1.04;letter-spacing:0}.article-meta,.blog-card-meta{display:flex;gap:12px;color:var(--muted);font-size:14px;font-weight:700}.hero-copy,.blog-index-hero p{font-size:20px;color:#333;max-width:760px}.article-cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:#f1f1f1}.article-cover-credit,.caption,.source-meta,.source-summary{font-size:13px;color:var(--muted)}.geo-summary,.article-takeaways{margin:28px 0;padding:22px;border:1px solid var(--line);border-radius:8px;background:#fff}.article-takeaways ul{margin:8px 0 0;padding-left:22px;color:var(--accent);font-weight:750}.eyebrow{margin:0 0 8px;font-size:13px;letter-spacing:.02em;color:var(--accent);font-weight:800}.rich-text{font-size:18px}.rich-text p{margin:0 0 22px}.rich-text h2{font-size:30px;line-height:1.2;margin:34px 0 12px}.rich-text ul{margin:0 0 22px;padding-left:22px}.inline-figure{margin:28px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff}.inline-figure img{width:100%;aspect-ratio:16/9;object-fit:cover}.inline-figure figcaption{padding:10px 12px;color:var(--muted);font-size:14px}.source-list,.ai-disclosure,.article-author-card{margin-top:34px;padding-top:22px;border-top:1px solid var(--line)}.source-list ul{padding-left:22px}.source-list a{font-weight:800}.article-tag-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.article-tag-chip{border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff}.article-author-card{display:flex;gap:14px;align-items:center}.article-author-mark img{width:52px;height:52px;border-radius:50%;object-fit:cover}.blog-index-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:38px}.blog-card{display:flex;flex-direction:column;min-height:100%;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:#fff}.blog-card img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#eee}.blog-card-body{display:flex;flex-direction:column;gap:12px;padding:18px}.blog-card h2{font-size:24px;line-height:1.18;margin:0}.blog-card p{margin:0;color:#444}.blog-card-meta{font-size:13px}.blog-card-read{margin-top:auto;font-weight:800}.site-footer{display:flex;justify-content:space-between;gap:20px;padding:36px 7vw;border-top:1px solid var(--line);color:var(--muted);font-size:14px}.brand-text{font-weight:800;letter-spacing:.12em}@media(max-width:900px){.blog-index-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.site-nav{padding:18px 20px;align-items:flex-start;flex-direction:column}.site-nav nav{gap:16px;flex-wrap:wrap}.blog-page{padding:36px 16px}.article-hero h1,.blog-index-hero h1{font-size:40px}.hero-copy,.blog-index-hero p,.rich-text{font-size:17px}.blog-index-grid{grid-template-columns:1fr}.site-footer{flex-direction:column;padding:28px 20px}}
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

async function readIndexPosts(env, language) {
  const database = env.ALTOS_BLOG_D1;
  if (!database?.prepare) return [];
  const result = await database
    .prepare("SELECT list_json AS payload FROM public_blog_posts WHERE status = 'published' AND language = ?1 ORDER BY updated_at DESC, sort_order ASC LIMIT ?2")
    .bind(language, BLOG_INDEX_PAGE_SIZE)
    .all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows
    .map((row) => {
      if (typeof row?.payload !== "string") return null;
      try {
        return JSON.parse(row.payload);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
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

function indexCopy(language) {
  return {
    "zh-Hant": {
      eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
      title: "AI 實驗室筆記",
      description: "我們研究、建造，然後把經驗發布成可引用的知識。",
      latest: "最新文章",
      empty: "目前沒有文章。",
      read: "閱讀文章"
    },
    en: {
      eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
      title: "AI Lab Notes",
      description: "We research, build, and publish what becomes reusable intelligence.",
      latest: "Latest Articles",
      empty: "No articles yet.",
      read: "Read article"
    }
  }[language] || {
    eyebrow: "ALTOS LAB Journal",
    title: "AI Lab Notes",
    description: "Research, build notes and market updates from ALTOS LAB.",
    latest: "Latest Articles",
    empty: "No articles yet.",
    read: "Read article"
  };
}

function renderIndex(posts, language, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const canonical = `${siteUrl}${blogIndexPath(language)}`;
  const labels = indexCopy(language);
  const cards = posts.length
    ? posts
        .map((post) => {
          const path = blogPostPath(post);
          return `<article class="blog-card">
            ${post.cover ? `<a href="${escapeAttribute(path)}"><img src="${escapeAttribute(post.cover)}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="lazy" decoding="async" /></a>` : ""}
            <div class="blog-card-body">
              <p class="article-kicker"><span class="blog-craft-type-badge">${escapeHtml(contentTypeLabel(post))}</span><span>${escapeHtml(post.topic || post.newsCategory || "AI")}</span></p>
              <h2><a href="${escapeAttribute(path)}">${escapeHtml(post.title)}</a></h2>
              ${post.excerpt ? `<p>${inlineTextHtml(post.excerpt)}</p>` : ""}
              <div class="blog-card-meta"><span>${escapeHtml(dateLabel(post.updatedAt || post.publishedAt))}</span><span>${escapeHtml(String(post.readTimeMinutes || 3))} 分鐘閱讀</span></div>
              <a class="blog-card-read" href="${escapeAttribute(path)}">${escapeHtml(labels.read)} →</a>
            </div>
          </article>`;
        })
        .join("")
    : `<p>${escapeHtml(labels.empty)}</p>`;
  return `<!doctype html>
<html lang="${escapeAttribute(htmlLang(language))}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#fafafa" />
  <title>${escapeHtml(labels.title)}｜ALTOS LAB</title>
  <meta name="description" content="${escapeAttribute(labels.description)}" />
  <meta name="robots" content="index, follow" />
  ${env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${escapeAttribute(env.GOOGLE_SITE_VERIFICATION)}" />` : ""}
  <link rel="canonical" href="${escapeAttribute(canonical)}" />
  ${BLOG_LANGUAGES.map((item) => `<link rel="alternate" hreflang="${escapeAttribute(item === "zh-Hant" ? "zh-Hant-TW" : item)}" href="${escapeAttribute(`${siteUrl}${blogIndexPath(item)}`)}" />`).join("\n")}
  <meta property="og:title" content="${escapeAttribute(labels.title)}" />
  <meta property="og:description" content="${escapeAttribute(labels.description)}" />
  <meta property="og:url" content="${escapeAttribute(canonical)}" />
  <meta property="og:type" content="website" />
  ${analyticsHead(env)}
  <style>${CSS}</style>
</head>
<body>
${analyticsBody(env)}
<div class="site-home blog-site-shell">
  <header class="site-nav">
    <a class="site-logo" aria-label="ALTOS LAB home" href="/"><span class="brand-text">ALTOS LAB</span></a>
    <nav aria-label="Main navigation"><a href="/#about">關於我們</a><a href="/#services">服務項目</a><a href="/#portfolio">專案介紹</a><a href="/blog">Blog</a></nav>
    <a class="site-nav-cta" href="/#contact">合作洽談 ↗</a>
  </header>
  <main class="blog-page blog-index-page">
    <div class="blog-index-inner">
      <header class="blog-index-hero">
        <p class="eyebrow">${escapeHtml(labels.eyebrow)}</p>
        <h1>${escapeHtml(labels.title)}</h1>
        <p>${escapeHtml(labels.description)}</p>
      </header>
      <section aria-label="${escapeAttribute(labels.latest)}" class="blog-index-grid">${cards}</section>
    </div>
  </main>
  <footer class="site-footer"><span class="brand-text">ALTOS LAB</span><span>© 2026 ALTOS LAB · AI implementation studio</span></footer>
</div>
</body>
</html>`;
}

function renderPost(post, alternates, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const canonical = `${siteUrl}${blogPostPath(post)}`;
  const image = post.cover || `${siteUrl}/blog-cover-zh-hant.png`;
  const description = plainText(post.seoDescription || post.excerpt || post.title);
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
  <link rel="canonical" href="${escapeAttribute(canonical)}" />
  ${alternatesHtml(post, alternates, siteUrl)}
  <meta property="og:title" content="${escapeAttribute(post.title)}" />
  <meta property="og:description" content="${escapeAttribute(plainText(post.excerpt || description))}" />
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
  <header class="site-nav">
    <a class="site-logo" aria-label="ALTOS LAB home" href="/"><span class="brand-text">ALTOS LAB</span></a>
    <nav aria-label="Main navigation"><a href="/#about">關於我們</a><a href="/#services">服務項目</a><a href="/#portfolio">專案介紹</a><a href="/blog">Blog</a></nav>
    <a class="site-nav-cta" href="/#contact">合作洽談 ↗</a>
  </header>
  <main class="blog-page blog-article-page">
    <article>
      <header class="article-hero">
        <div class="article-nav-row"><a class="card-link" href="${escapeAttribute(blogIndexPath(post.language))}">← Blog</a></div>
        <p class="eyebrow article-kicker"><span class="blog-craft-type-badge">${escapeHtml(contentTypeLabel(post))}</span><span>${escapeHtml(post.topic || post.newsCategory || "AI")}</span><span>${escapeHtml(String(post.readTimeMinutes || 3))} 分鐘閱讀</span></p>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="article-meta"><span>更新 ${escapeHtml(dateLabel(post.updatedAt || post.publishedAt))}</span><span>${escapeHtml(localeLabel(post.language))}</span></div>
        ${post.excerpt ? `<p class="hero-copy">${inlineTextHtml(post.excerpt)}</p>` : ""}
        ${image ? `<img class="article-cover" src="${escapeAttribute(image)}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="eager" decoding="async" />` : ""}
        ${sourceCredit ? `<p class="article-cover-credit">圖片來源： ${sourceCredit}</p>` : ""}
      </header>
      ${post.geoSummary ? `<aside class="geo-summary"><strong>${post.language === "zh-Hant" ? "重點摘要" : "Summary"}:</strong> ${inlineTextHtml(post.geoSummary)}</aside>` : ""}
      ${takeaways}
      <div class="rich-text">${paragraphHtml(post.body)}${inlineImagesHtml(post.contentImages)}</div>
      ${sourceListHtml(post)}
      <aside class="ai-disclosure"><strong>編輯審核:</strong> 本文由 <span class="brand-text">ALTOS LAB</span> 編輯團隊審校，已確認來源脈絡、可讀性、事實一致性與實務可用性。</aside>
      ${tags ? `<nav class="article-tag-strip" aria-label="文章標籤">${tags}</nav>` : ""}
      <section class="article-author-card" aria-label="作者"><span class="article-author-mark"><img src="/authors/tommy-avatar.jpg" alt="" loading="lazy" /></span><div><h2>Tommy</h2><p>ALTOS LAB 產品與 AI 導入編輯，關注企業流程、生成式搜尋與能真正落地的決策框架。</p></div></section>
    </article>
  </main>
  <footer class="site-footer"><span class="brand-text">ALTOS LAB</span><span>© 2026 ALTOS LAB · AI implementation studio</span></footer>
</div>
</body>
</html>`;
  return body;
}

export async function maybeHandleDirectBlogHtml(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const parsed = routeRequest(url.pathname);
  if (!parsed) return null;
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
