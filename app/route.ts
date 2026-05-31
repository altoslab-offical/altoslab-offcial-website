import { readFile } from "fs/promises";
import path from "path";
import { gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "@/lib/analytics";
import {
  homepageWebPageJsonLd,
  organizationJsonLd,
  professionalServiceJsonLd,
  searchVerificationMetaTags,
  websiteJsonLd
} from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withLaunchMetadata(html: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
  const title = "ALTOS LAB｜AI Studio 人工智慧工作室";
  const description =
    "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接與智能行銷。";
  const image = `${siteUrl}/geo-cover.png`;
  const jsonLd = [organizationJsonLd(), websiteJsonLd(), homepageWebPageJsonLd(), professionalServiceJsonLd()]
    .map(
      (data) =>
        `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
    )
    .join("\n");
  const seoNoScriptFallback = `<noscript>
      <main>
        <h1>ALTOS LAB AI Studio 人工智慧工作室</h1>
        <p>ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接、後台 CMS、SEO/GEO 內容系統與智能行銷。</p>
        <nav aria-label="ALTOS LAB key pages">
          <a href="/blog">AI 實驗室筆記</a>
          <a href="/projects">專案案例</a>
          <a href="#contact">合作洽談</a>
        </nav>
      </main>
    </noscript>`;
  const metadata = `<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="shortcut icon" type="image/svg+xml" href="/icon.svg" />
    ${searchVerificationMetaTags()}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="canonical" href="${siteUrl}" />
    <link rel="alternate" href="${siteUrl}" hreflang="zh-Hant-TW" />
    <link rel="alternate" href="${siteUrl}" hreflang="x-default" />
    <link rel="alternate" type="application/rss+xml" title="ALTOS LAB Blog RSS" href="${siteUrl}/feed.xml" />
    <link rel="alternate" type="text/plain" title="ALTOS LAB llms.txt" href="${siteUrl}/llms.txt" />
    <link rel="alternate" type="text/plain" title="ALTOS LAB full LLM context" href="${siteUrl}/llms-full.txt" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:site_name" content="ALTOS LAB" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    ${jsonLd}
    ${gtmHeadSnippet()}`;
	  const homepageHeader = `
	    <style>
	      @font-face {
	        font-family: "Space Grotesk";
	        font-style: normal;
	        font-weight: 400 900;
	        font-display: swap;
	        src: url("/fonts/space-grotesk-latin.woff2") format("woff2");
	        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304,
	          U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF,
	          U+FFFD;
	      }

	      body > nav.fixed.top-0,
	      #root nav.fixed.top-0 {
	        display: none !important;
      }

      .altos-home-header {
        position: fixed;
        inset: 0 0 auto 0;
        z-index: 90;
        min-height: clamp(4.75rem, 5vw, 5.5rem);
        padding: 0 clamp(1rem, 2.6vw, 2rem);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        column-gap: clamp(1.25rem, 3.5vw, 3.25rem);
        background: transparent;
        border-bottom: 1px solid transparent;
        transition: background 180ms ease, border-color 180ms ease, backdrop-filter 180ms ease;
      }

      .altos-home-header.is-scrolled,
      .altos-home-header.is-menu-open {
        background: rgba(0, 0, 0, 0.92);
        border-bottom-color: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .altos-home-logo {
        color: #fff;
        text-decoration: none;
        font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: clamp(0.85rem, 1vw, 1rem);
        font-weight: 900;
        letter-spacing: 0.18em;
        line-height: 1;
        opacity: 0;
        pointer-events: none;
        transform: translateY(-4px);
        transition: opacity 180ms ease, transform 180ms ease;
        white-space: nowrap;
      }

      .altos-home-header.is-scrolled .altos-home-logo {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }

      .altos-home-nav {
        justify-self: center;
        display: flex;
        align-items: center;
        gap: clamp(1.5rem, 3vw, 3rem);
      }

      .altos-home-nav a {
        color: rgba(255, 255, 255, 0.46);
        text-decoration: none;
        font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: clamp(0.9rem, 1vw, 1rem);
        font-weight: 600;
        letter-spacing: 0.08em;
        transition: color 160ms ease;
        white-space: nowrap;
      }

      [class~="mix-blend-difference"][class~="tracking-[0.25em]"],
      [class~="mix-blend-difference"][class~="tracking-[0.2em]"] {
        font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-weight: 900 !important;
        letter-spacing: 0.18em !important;
      }

      .altos-home-nav a:hover,
      .altos-home-nav a:focus-visible {
        color: rgba(255, 255, 255, 0.92);
      }

      .altos-home-nav a:last-child {
        color: rgba(255, 255, 255, 0.64);
      }

      .altos-home-actions {
        justify-self: end;
        display: flex;
        align-items: center;
        gap: clamp(0.75rem, 1.5vw, 1.25rem);
      }

      .altos-home-action {
        min-height: clamp(3.1rem, 3.4vw, 4rem);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0 clamp(1.45rem, 2.4vw, 2.35rem);
        text-decoration: none;
        font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: clamp(0.9rem, 1vw, 1rem);
        font-weight: 900;
        letter-spacing: 0.04em;
        line-height: 1;
        white-space: nowrap;
        transition: transform 160ms ease, border-color 160ms ease, opacity 160ms ease;
      }

      .altos-home-action:hover,
      .altos-home-action:focus-visible {
        transform: translateY(-1px);
      }

      .altos-home-action--ghost {
        color: rgba(255, 255, 255, 0.64);
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.02);
      }

      .altos-home-action--ghost:hover,
      .altos-home-action--ghost:focus-visible {
        border-color: rgba(255, 255, 255, 0.56);
        color: #fff;
      }

      .altos-home-action--primary {
        color: #030403;
        background: #c8ff00;
      }

      .altos-home-arrow {
        margin-left: 0.65rem;
        font-weight: 900;
      }

      .altos-home-menu-button {
        justify-self: end;
        width: 3rem;
        height: 3rem;
        display: none;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.02);
        color: #fff;
        cursor: pointer;
      }

      .altos-home-menu-icon,
      .altos-home-menu-icon::before,
      .altos-home-menu-icon::after {
        width: 1.05rem;
        height: 2px;
        display: block;
        border-radius: 999px;
        background: currentColor;
        content: "";
        transition: transform 160ms ease, opacity 160ms ease;
      }

      .altos-home-menu-icon {
        position: relative;
      }

      .altos-home-menu-icon::before,
      .altos-home-menu-icon::after {
        position: absolute;
        left: 0;
      }

      .altos-home-menu-icon::before {
        transform: translateY(-6px);
      }

      .altos-home-menu-icon::after {
        transform: translateY(6px);
      }

      .altos-home-header.is-menu-open .altos-home-menu-icon {
        background: transparent;
      }

      .altos-home-header.is-menu-open .altos-home-menu-icon::before {
        transform: rotate(45deg);
      }

      .altos-home-header.is-menu-open .altos-home-menu-icon::after {
        transform: rotate(-45deg);
      }

      .altos-home-mobile-panel {
        position: absolute;
        top: 100%;
        right: clamp(1rem, 2.6vw, 2rem);
        left: clamp(1rem, 2.6vw, 2rem);
        display: none;
        padding: 0.9rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.94);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .altos-home-mobile-panel a {
        min-height: 3.15rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.75rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.72);
        text-decoration: none;
        font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.08em;
      }

      .altos-home-mobile-panel a:last-child {
        margin-top: 0.75rem;
        border-bottom: 0;
        border-radius: 999px;
        justify-content: center;
        gap: 0.55rem;
        background: #c8ff00;
        color: #030403;
        font-weight: 900;
      }

      @media (max-width: 980px) {
        .altos-home-header {
          grid-template-columns: auto 1fr;
        }

        .altos-home-nav,
        .altos-home-actions {
          display: none;
        }

        .altos-home-menu-button {
          display: inline-flex;
        }

        .altos-home-header.is-menu-open .altos-home-mobile-panel {
          display: block;
        }
      }

      @media (max-width: 640px) {
        .altos-home-header {
          min-height: 4.5rem;
          column-gap: 0.75rem;
        }

        .altos-home-logo {
          font-size: 0.82rem;
          letter-spacing: 0.18em;
        }

        .altos-home-menu-button {
          width: 2.75rem;
          height: 2.75rem;
        }
      }
    </style>
    <script>
      (() => {
        function ensureHomepageHeader() {
          if (document.querySelector("[data-altos-home-header]")) return;

          const header = document.createElement("header");
          header.className = "altos-home-header";
          header.dataset.altosHomeHeader = "true";
          header.innerHTML = '<a class="altos-home-logo" href="/" aria-label="ALTOS LAB Home">ALTOS LAB</a><nav class="altos-home-nav" aria-label="Primary"><a href="#about">關於我們</a><a href="#services">服務項目</a><a href="#portfolio">專案介紹</a><a href="/blog">部落格</a></nav><div class="altos-home-actions"><a class="altos-home-action altos-home-action--ghost" href="#portfolio">專案介紹</a><a class="altos-home-action altos-home-action--primary" href="#contact">合作洽談<span class="altos-home-arrow" aria-hidden="true">↗</span></a></div><button class="altos-home-menu-button" type="button" aria-label="開啟選單" aria-expanded="false"><span class="altos-home-menu-icon" aria-hidden="true"></span></button><div class="altos-home-mobile-panel" aria-label="Mobile navigation"><a href="#about">關於我們</a><a href="#services">服務項目</a><a href="#portfolio">專案介紹</a><a href="/blog">部落格</a><a href="#contact">合作洽談<span aria-hidden="true">↗</span></a></div>';
          document.body.prepend(header);

          const button = header.querySelector(".altos-home-menu-button");
          const links = header.querySelectorAll(".altos-home-mobile-panel a");

          function setMenuOpen(isOpen) {
            header.classList.toggle("is-menu-open", isOpen);
            button?.setAttribute("aria-expanded", String(isOpen));
            button?.setAttribute("aria-label", isOpen ? "關閉選單" : "開啟選單");
          }

          function updateScrollState() {
            header.classList.toggle("is-scrolled", window.scrollY > 10);
          }

          button?.addEventListener("click", () => {
            setMenuOpen(!header.classList.contains("is-menu-open"));
          });
          links.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));
          window.addEventListener("scroll", updateScrollState, { passive: true });
          updateScrollState();
        }

        const observer = new MutationObserver(ensureHomepageHeader);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener("load", ensureHomepageHeader);
        document.addEventListener("DOMContentLoaded", ensureHomepageHeader);
        ensureHomepageHeader();
      })();
    </script>`;

  const htmlWithoutLegacyIcons = html.replace(
    /<link\b(?=[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'])[^>]*>\s*/gi,
    ""
  );

  return htmlWithoutLegacyIcons
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(/<title>[\s\S]*?<\/title>/, metadata)
    .replace("<body>", `<body>${gtmNoScriptSnippet()}${seoNoScriptFallback}`)
    .replace("</body>", `${homepageHeader}${homepageAnalyticsSnippet()}</body>`);
}

export async function GET() {
  const html = await readFile(path.join(process.cwd(), "index.html"), "utf8");

  return new Response(withLaunchMetadata(html), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Language": "zh-Hant-TW",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
