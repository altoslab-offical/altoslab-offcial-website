import { readFile } from "fs/promises";
import path from "path";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "zlib";
import {
  adsenseHeadSnippet,
  gaHeadSnippet,
  gtmHeadSnippet,
  gtmNoScriptSnippet,
  homepageAnalyticsSnippet
} from "@/lib/analytics";
import {
  homepageWebPageJsonLd,
  organizationJsonLd,
  professionalServiceJsonLd,
  searchVerificationMetaTags,
  websiteJsonLd
} from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOUDFLARE_HOMEPAGE_ASSET = "/altoslab-homepage";
const FAVICON_LINKS = `<link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="mask-icon" href="/icon.svg" color="#A4FF00" />
    <link rel="manifest" href="/manifest.webmanifest" />`;
const DEFAULT_WONDA_WIDGET_SCRIPT_SRC = "https://wonda-ai.altoslab-ai.workers.dev/widget.js";
const DEFAULT_WONDA_WIDGET_CHANNEL_ID = "cms4snnn50001l5045li1fd5h";
const DEFAULT_WONDA_WIDGET_API =
  process.env.VERCEL === "1"
    ? "https://altoslab-ai-wonda.vercel.app/api/wonda"
    : "https://altoslab-ai.cc/api/wonda";
const DEFAULT_WONDA_WIDGET_TITLE = "ALTOS LAB AI 客服";
const DEFAULT_WONDA_WIDGET_COLOR = "#B8FF3D";
const HOMEPAGE_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=1800";

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isWondaWidgetDisabled(value: string | undefined) {
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
  )}" data-api="${escapeHtmlAttribute(api)}" data-title="${DEFAULT_WONDA_WIDGET_TITLE}" data-color="${DEFAULT_WONDA_WIDGET_COLOR}" async></script>`;
}

function homepageInjectionParts() {
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
        <p>ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接、後台 CMS、搜尋可見度內容系統與智能行銷。</p>
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
    ${searchVerificationMetaTags()}
    ${FAVICON_LINKS}
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
    ${jsonLd}
    ${gaHeadSnippet()}
    ${gtmHeadSnippet()}
    ${adsenseHeadSnippet()}`;

  return {
    metadata,
    seoNoScriptFallback,
    wondaWidget: wondaWidgetSnippet(),
    trustLinks: `<style>
      .altos-trust-links{border-top:1px solid rgba(255,255,255,.1);padding:1.25rem clamp(1.25rem,4vw,4rem);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.85rem 1rem;color:rgba(255,255,255,.44);background:#030403;font:500 11px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.08em}
      .altos-trust-links a{color:inherit;text-decoration:none}
      .altos-trust-links a:hover{color:rgba(255,255,255,.86)}
    </style>
    <nav class="altos-trust-links" aria-label="ALTOS LAB site policies">
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="/editorial-policy">Editorial Policy</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </nav>`
  };
}

function insertAfterBodyOpen(html: string, insertion: string) {
  if (!insertion) return html;
  return html.replace(/<body([^>]*)>/i, `<body$1>${insertion}`);
}

function insertBeforeBodyClose(html: string, insertion: string) {
  if (!insertion) return html;
  return html.replace(/<\/body>/i, `${insertion}</body>`);
}

function withLaunchMetadata(html: string) {
  const { metadata, seoNoScriptFallback, wondaWidget, trustLinks } = homepageInjectionParts();
  const analyticsSnippet = homepageAnalyticsSnippet();

  let output = html
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(/<link\s+rel=["'](?:shortcut\s+icon|icon|mask-icon)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+[^>]*rel=["']manifest["'][^>]*>\s*/gi, "");

  if (/<title>[\s\S]*?<\/title>/i.test(output)) {
    output = output.replace(/<title>[\s\S]*?<\/title>/i, metadata);
  } else {
    output = output.replace(/<\/head>/i, `${metadata}</head>`);
  }

  output = insertAfterBodyOpen(
    output,
    `${output.includes("googletagmanager.com/ns.html") ? "" : gtmNoScriptSnippet()}${
      output.includes("ALTOS LAB key pages") ? "" : seoNoScriptFallback
    }`
  );

  if (!output.includes("window.altosTrack")) {
    output = insertBeforeBodyClose(output, analyticsSnippet);
  }

  if (wondaWidget && !output.includes("id=\"wonda-ai-widget\"")) {
    output = insertBeforeBodyClose(output, wondaWidget);
  }

  if (!output.includes("altos-trust-links")) {
    output = insertBeforeBodyClose(output, trustLinks);
  }

  return output;
}

async function readCloudflareHomepageResponse(request: Request) {
  const assetUrl = new URL(CLOUDFLARE_HOMEPAGE_ASSET, request.url);

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = getCloudflareContext();
    const assets = (context.env as { ASSETS?: { fetch(input: Request): Promise<Response> } }).ASSETS;
    if (assets?.fetch) {
      const response = await assets.fetch(new Request(assetUrl));
      if (response.ok) return response;
    }
  } catch {
    // Cloudflare local and production runtimes differ; fall back to the public asset path.
  }

  try {
    const response = await fetch(assetUrl, { redirect: "follow" });
    if (response.ok) return response;
  } catch {
    // Cloudflare runtimes cannot read the project filesystem; do not fall through there.
  }

  throw new Error(`Homepage asset unavailable at ${CLOUDFLARE_HOMEPAGE_ASSET}`);
}

function withCloudflareHomepageAssetHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", HOMEPAGE_CACHE_CONTROL);
  headers.set("Content-Language", "zh-Hant-TW");
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

type HomepageCache = {
  html: string;
  gzip: Buffer;
  br: Buffer;
};

let homepageCachePromise: Promise<HomepageCache> | null = null;

async function readHomepageHtml() {
  return readFile(path.join(process.cwd(), "index.html"), "utf8");
}

async function readHomepageCache() {
  if (!homepageCachePromise) {
    homepageCachePromise = readHomepageHtml().then((sourceHtml) => {
      const html = withLaunchMetadata(sourceHtml);
      const bytes = Buffer.from(html);
      return {
        html,
        gzip: gzipSync(bytes, { level: 6 }),
        br: brotliCompressSync(bytes, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 4
          }
        })
      };
    });
  }
  return homepageCachePromise;
}

function compressedHtmlResponse(request: Request, cache: HomepageCache) {
  const headers = new Headers({
    "Cache-Control": HOMEPAGE_CACHE_CONTROL,
    "Content-Language": "zh-Hant-TW",
    "Content-Type": "text/html; charset=utf-8",
    Vary: "Accept-Encoding"
  });
  const accepted = request.headers.get("accept-encoding") || "";

  if (/\bbr\b/i.test(accepted)) {
    headers.set("Content-Encoding", "br");
    return new Response(new Uint8Array(cache.br), { headers });
  }

  if (/\bgzip\b/i.test(accepted)) {
    headers.set("Content-Encoding", "gzip");
    return new Response(new Uint8Array(cache.gzip), { headers });
  }

  return new Response(cache.html, { headers });
}

export async function GET(request: Request) {
  if (process.env.CLOUDFLARE_KV_ENABLED === "1") {
    return withCloudflareHomepageAssetHeaders(await readCloudflareHomepageResponse(request));
  }

  const cache = await readHomepageCache();
  return compressedHtmlResponse(request, cache);
}
