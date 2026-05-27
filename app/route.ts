import { readFile } from "fs/promises";
import path from "path";
import { gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "@/lib/analytics";
import { organizationJsonLd, searchVerificationMetaTags, websiteJsonLd } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withLaunchMetadata(html: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
  const title = "ALTOS LAB｜AI Studio 人工智慧工作室";
  const description =
    "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接與智能行銷。";
  const image = `${siteUrl}/geo-cover.png`;
  const jsonLd = [organizationJsonLd(), websiteJsonLd()]
    .map(
      (data) =>
        `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
    )
    .join("\n");
  const metadata = `<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    ${searchVerificationMetaTags()}
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
  const homepageBlogNavigation = `
    <style>
      .altos-home-language-toggle {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 999px;
        padding: 3px;
        background: rgba(0, 0, 0, 0.28);
      }

      .altos-home-language-toggle button {
        min-height: 2rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: rgba(255, 255, 255, 0.48);
        cursor: pointer;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        padding: 0 0.7rem;
      }

      .altos-home-language-toggle button.is-active {
        background: #c8ff00;
        color: #030403;
      }

      @media (max-width: 760px) {
        .altos-home-language-toggle {
          transform: scale(0.9);
          transform-origin: right center;
        }
      }
    </style>
    <script>
      (() => {
        const storageKey = "altoslab:language";

        function currentLanguage() {
          return localStorage.getItem(storageKey) === "en" ? "en" : "zh-Hant";
        }

        function applyHomepageBlogNavigation() {
          const nav = document.querySelector("nav.fixed.top-0");
          if (!nav) return;
          const language = currentLanguage();
          const isEnglish = language === "en";

          let blogLink = nav.querySelector("a[data-altos-blog-nav]");
          if (!blogLink) {
            blogLink = document.createElement("a");
            blogLink.dataset.altosBlogNav = "true";
            const contactLink = nav.querySelector('a[href="#contact"]');
            if (contactLink) contactLink.insertAdjacentElement("beforebegin", blogLink);
            else nav.appendChild(blogLink);
          }
          blogLink.href = isEnglish ? "/en/blog" : "/blog";
          blogLink.textContent = isEnglish ? "Blog" : "部落格";

          let switcher = nav.querySelector(".altos-home-language-toggle");
          if (!switcher) {
            switcher = document.createElement("div");
            switcher.className = "altos-home-language-toggle";
            switcher.setAttribute("aria-label", "Language switcher");
            switcher.innerHTML = '<button type="button" data-lang="zh-Hant">中文</button><button type="button" data-lang="en">EN</button>';
            switcher.addEventListener("click", (event) => {
              const target = event.target;
              const button = target instanceof Element ? target.closest("button[data-lang]") : null;
              if (!button) return;
              localStorage.setItem(storageKey, button.dataset.lang);
              applyHomepageBlogNavigation();
            });
            const menuButton = nav.querySelector('button[aria-label="Menu"]');
            if (menuButton) menuButton.insertAdjacentElement("beforebegin", switcher);
            else nav.appendChild(switcher);
          }

          switcher.querySelectorAll("button[data-lang]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.lang === language);
          });
        }

        const observer = new MutationObserver(applyHomepageBlogNavigation);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener("load", applyHomepageBlogNavigation);
        document.addEventListener("DOMContentLoaded", applyHomepageBlogNavigation);
        applyHomepageBlogNavigation();
      })();
    </script>`;

  return html
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(/<title>[\s\S]*?<\/title>/, metadata)
    .replace("<body>", `<body>${gtmNoScriptSnippet()}`)
    .replace("</body>", `${homepageBlogNavigation}${homepageAnalyticsSnippet()}</body>`);
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
