import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "index.html");
const destination = path.join(root, "public", "altoslab-homepage.html");

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab-ai.cc").replace(/\/$/, "");
const title = "ALTOS LAB｜AI Studio 人工智慧工作室";
const description =
  "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接與智能行銷。";
const image = `${siteUrl}/geo-cover.png`;
const DEFAULT_WONDA_WIDGET_SCRIPT_SRC = "https://wonda-web-kxbpzwq4sa-de.a.run.app/widget.js";
const DEFAULT_WONDA_WIDGET_CHANNEL_ID = "cmqb6hynd002hs619tqxc3pe5";
const DEFAULT_WONDA_WIDGET_API = "https://wonda-api-kxbpzwq4sa-de.a.run.app/api/v1";

const verificationEnv = {
  google: "GOOGLE_SITE_VERIFICATION",
  bing: "BING_SITE_VERIFICATION",
  yandex: "YANDEX_SITE_VERIFICATION",
  yahoo: "YAHOO_SITE_VERIFICATION",
  pinterest: "PINTEREST_SITE_VERIFICATION",
  facebook: "FACEBOOK_DOMAIN_VERIFICATION"
};

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isWondaWidgetDisabled(value) {
  return ["0", "false", "off", "disabled", "no"].includes(String(value || "").trim().toLowerCase());
}

function wondaWidgetSnippet() {
  if (isWondaWidgetDisabled(process.env.NEXT_PUBLIC_WONDA_WIDGET_ENABLED)) return "";
  const scriptSrc = (process.env.NEXT_PUBLIC_WONDA_WIDGET_SCRIPT_SRC || DEFAULT_WONDA_WIDGET_SCRIPT_SRC).trim();
  const channelId = (process.env.NEXT_PUBLIC_WONDA_WIDGET_CHANNEL_ID || DEFAULT_WONDA_WIDGET_CHANNEL_ID).trim();
  const api = (process.env.NEXT_PUBLIC_WONDA_WIDGET_API || DEFAULT_WONDA_WIDGET_API).trim();
  if (!scriptSrc || !channelId || !api) return "";
  return `<script id="wonda-ai-widget" src="${escapeHtmlAttribute(scriptSrc)}" data-channel-id="${escapeHtmlAttribute(
    channelId
  )}" data-api="${escapeHtmlAttribute(api)}" async></script>`;
}

function searchVerificationMetaTags() {
  const names = {
    google: "google-site-verification",
    bing: "msvalidate.01",
    yandex: "yandex-verification",
    yahoo: "y_key",
    pinterest: "p:domain_verify",
    facebook: "facebook-domain-verification"
  };
  return Object.entries(verificationEnv)
    .map(([provider, key]) => {
      const value = process.env[key]?.trim();
      if (!value) return "";
      return `<meta name="${names[provider]}" content="${escapeHtmlAttribute(value)}" />`;
    })
    .filter(Boolean)
    .join("\n    ");
}

function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function homepageJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ALTOS LAB",
      url: siteUrl,
      email: "hello@altoslab.com",
      logo: `${siteUrl}/geo-cover.png`,
      image,
      areaServed: ["Taiwan", "APAC"],
      knowsAbout: ["AI Agent", "AI product studio", "workflow automation", "AI operations", "generative AI"]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "ALTOS LAB",
      url: siteUrl,
      inLanguage: "zh-Hant-TW",
      publisher: { "@id": `${siteUrl}/#organization` }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "ALTOS LAB AI Studio 人工智慧工作室",
      description,
      inLanguage: "zh-Hant-TW",
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
      primaryImageOfPage: image
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${siteUrl}/#professional-service`,
      name: "ALTOS LAB",
      url: siteUrl,
      image,
      areaServed: ["Taiwan", "APAC"],
      serviceType: [
        "AI product studio",
        "AI agent implementation",
        "Workflow automation",
        "AI customer service systems",
        "CMS and backoffice development",
        "Search visibility content operations"
      ]
    }
  ]
    .map(jsonLdScript)
    .join("\n");
}

function gtmHeadSnippet() {
  const gtmId = (process.env.NEXT_PUBLIC_GTM_ID || "GTM-WJ96VR7V").trim();
  if (!/^GTM-[A-Z0-9]+$/i.test(gtmId)) return "";
  return `<script>
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "site_loaded", site: "altoslab" });
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","${gtmId}");
  </script>`;
}

function gtmNoScriptSnippet() {
  const gtmId = (process.env.NEXT_PUBLIC_GTM_ID || "GTM-WJ96VR7V").trim();
  if (!/^GTM-[A-Z0-9]+$/i.test(gtmId)) return "";
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

function gaHeadSnippet() {
  const gaMeasurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-5VSLFNVD28").trim();
  if (!/^G-[A-Z0-9]+$/i.test(gaMeasurementId)) return "";
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "${gaMeasurementId}", { send_page_view: true });
  </script>`;
}

function homepageAnalyticsSnippet() {
  return `<script>
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.altosTrack = function(event, payload) {
      var clean = Object.assign({ event: event }, payload || {});
      delete clean.email;
      delete clean.phone;
      delete clean.contact;
      delete clean.message;
      window.dataLayer.push(clean);
      var gaPayload = Object.assign({}, clean);
      delete gaPayload.event;
      window.gtag("event", event, gaPayload);
    };
    document.addEventListener("click", function(event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var href = link.getAttribute("href") || "";
      var label = (link.textContent || "").trim().slice(0, 80);
      if (href.indexOf("#contact") >= 0 || href.indexOf("mailto:") === 0 || /contact|合作|諮詢|開始/i.test(label)) {
        window.altosTrack("cta_clicked", { cta_label: label || href, cta_href: href, page_path: location.pathname });
      }
    }, { passive: true });
  </script>`;
}

function homepageMetadata() {
  return `<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    ${searchVerificationMetaTags()}
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="mask-icon" href="/icon.svg" color="#A4FF00" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800;900&display=swap" rel="stylesheet" />
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
    ${homepageJsonLd()}
    ${gaHeadSnippet()}
    ${gtmHeadSnippet()}`;
}

function seoNoScriptFallback() {
  return `<noscript>
      <main>
        <h1>ALTOS LAB AI Studio 人工智慧工作室</h1>
        <p>ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接、後台 CMS、搜尋可見度內容系統與智能行銷。</p>
        <nav aria-label="ALTOS LAB key pages">
          <a href="/blog">AI 實驗室筆記</a>
          <a href="/projects">專案案例</a>
          <a href="#contact">合作洽談</a>
        </nav>
      </main>
    </noscript>`;
}

function injectHomepageMetadata(html) {
  let output = html
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(/<link\s+rel=["'](?:shortcut\s+icon|icon|mask-icon)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+[^>]*rel=["']manifest["'][^>]*>\s*/gi, "");

  output = output.replace(/<title>[\s\S]*?<\/title>/i, homepageMetadata());
  output = output.replace(/<body([^>]*)>/i, `<body$1>${gtmNoScriptSnippet()}${seoNoScriptFallback()}`);

  if (!output.includes("window.altosTrack")) {
    output = output.replace(/<\/body>/i, `${homepageAnalyticsSnippet()}</body>`);
  }

  const wondaWidget = wondaWidgetSnippet();
  if (wondaWidget && !output.includes("id=\"wonda-ai-widget\"")) {
    output = output.replace(/<\/body>/i, `${wondaWidget}</body>`);
  }

  return output;
}

await mkdir(path.dirname(destination), { recursive: true });
const html = await readFile(source, "utf8");
await writeFile(destination, injectHomepageMetadata(html));

console.log(`Synced Cloudflare homepage asset: ${path.relative(root, destination)}`);
