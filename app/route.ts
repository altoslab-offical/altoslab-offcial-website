import { readFile } from "fs/promises";
import path from "path";
import { gaHeadSnippet, gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "@/lib/analytics";
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
    ${gtmHeadSnippet()}`;

  return {
    metadata,
    seoNoScriptFallback
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
  const { metadata, seoNoScriptFallback } = homepageInjectionParts();
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
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  headers.set("Content-Language", "zh-Hant-TW");
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function readHomepageHtml() {
  return readFile(path.join(process.cwd(), "index.html"), "utf8");
}

export async function GET(request: Request) {
  if (process.env.CLOUDFLARE_KV_ENABLED === "1") {
    return withCloudflareHomepageAssetHeaders(await readCloudflareHomepageResponse(request));
  }

  const html = await readHomepageHtml();

  return new Response(withLaunchMetadata(html), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Language": "zh-Hant-TW",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
