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

function pathRequest(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "blog" && parts[1]) return { language: "zh-Hant", slug: decodeURIComponent(parts[1]) };
  if (LANGUAGE_PREFIXES.has(parts[0]) && parts[1] === "blog" && parts[2]) {
    return { language: parts[0], slug: decodeURIComponent(parts[2]) };
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
      if (/^#{2,3}\s+/.test(paragraph)) return `<h2>${escapeHtml(paragraph.replace(/^#{2,3}\s+/, ""))}</h2>`;
      if (/^\s*[-*]\s+/m.test(paragraph)) {
        const items = paragraph
          .split(/\n/)
          .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(paragraph)}</p>`;
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
          ${source.summary ? `<p class="source-summary">${escapeHtml(source.summary)}</p>` : ""}
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
    description: post.excerpt || post.seoDescription,
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
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.72}a{color:inherit;text-decoration:none}img{max-width:100%;display:block}.site-nav{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:28px;padding:26px 7vw;background:rgba(250,250,250,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.site-logo{font-weight:800;letter-spacing:.18em}.site-nav nav{display:flex;gap:28px;font-size:14px}.site-nav-cta{display:inline-flex;align-items:center;border-radius:999px;background:#eee;padding:10px 18px;font-weight:700}.language-menu{display:flex;flex-wrap:wrap;gap:8px}.language-menu a{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;color:var(--muted)}.language-menu a.is-current{background:#111;color:#fff}.blog-page{padding:64px 20px}.blog-article-page article{max-width:820px;margin:0 auto}.article-nav-row{margin-bottom:28px}.card-link{font-weight:800}.article-kicker{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:var(--muted);font-size:14px}.blog-craft-type-badge{border-radius:999px;padding:3px 10px;background:var(--badge);color:var(--badge-ink);font-weight:800}.article-hero h1{margin:12px 0 18px;font-size:clamp(40px,7vw,68px);line-height:1.04;letter-spacing:0}.article-meta{display:flex;gap:12px;color:var(--muted);font-size:14px;font-weight:700}.hero-copy{font-size:20px;color:#333;max-width:760px}.article-cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:#f1f1f1}.article-cover-credit,.caption,.source-meta,.source-summary{font-size:13px;color:var(--muted)}.geo-summary,.article-takeaways{margin:28px 0;padding:22px;border:1px solid var(--line);border-radius:8px;background:#fff}.article-takeaways ul{margin:8px 0 0;padding-left:22px;color:var(--accent);font-weight:750}.eyebrow{margin:0 0 8px;font-size:13px;letter-spacing:.02em;color:var(--accent);font-weight:800}.rich-text{font-size:18px}.rich-text p{margin:0 0 22px}.rich-text h2{font-size:30px;line-height:1.2;margin:34px 0 12px}.rich-text ul{margin:0 0 22px;padding-left:22px}.inline-figure{margin:28px 0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff}.inline-figure img{width:100%;aspect-ratio:16/9;object-fit:cover}.inline-figure figcaption{padding:10px 12px;color:var(--muted);font-size:14px}.source-list,.ai-disclosure,.article-author-card{margin-top:34px;padding-top:22px;border-top:1px solid var(--line)}.source-list ul{padding-left:22px}.source-list a{font-weight:800}.article-tag-strip{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.article-tag-chip{border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff}.article-author-card{display:flex;gap:14px;align-items:center}.article-author-mark img{width:52px;height:52px;border-radius:50%;object-fit:cover}.site-footer{display:flex;justify-content:space-between;gap:20px;padding:36px 7vw;border-top:1px solid var(--line);color:var(--muted);font-size:14px}.brand-text{font-weight:800;letter-spacing:.12em}@media(max-width:760px){.site-nav{padding:18px 20px;align-items:flex-start;flex-direction:column}.site-nav nav{gap:16px;flex-wrap:wrap}.blog-page{padding:36px 16px}.article-hero h1{font-size:40px}.hero-copy,.rich-text{font-size:17px}.site-footer{flex-direction:column;padding:28px 20px}}
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

function renderPost(post, alternates, env, requestUrl) {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL || new URL(requestUrl).origin;
  const canonical = `${siteUrl}${blogPostPath(post)}`;
  const image = post.cover || `${siteUrl}/blog-cover-zh-hant.png`;
  const description = post.seoDescription || post.excerpt || post.title;
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
  <meta property="og:description" content="${escapeAttribute(post.excerpt || description)}" />
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
        ${post.excerpt ? `<p class="hero-copy">${escapeHtml(post.excerpt)}</p>` : ""}
        ${image ? `<img class="article-cover" src="${escapeAttribute(image)}" alt="${escapeAttribute(post.coverAlt || post.title)}" loading="eager" decoding="async" />` : ""}
        ${sourceCredit ? `<p class="article-cover-credit">圖片來源： ${sourceCredit}</p>` : ""}
      </header>
      ${post.geoSummary ? `<aside class="geo-summary"><strong>${post.language === "zh-Hant" ? "重點摘要" : "Summary"}:</strong> ${escapeHtml(post.geoSummary)}</aside>` : ""}
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
  const parsed = pathRequest(url.pathname);
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
