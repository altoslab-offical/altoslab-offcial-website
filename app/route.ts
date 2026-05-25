import { readFile } from "fs/promises";
import path from "path";
import { gtmHeadSnippet, gtmNoScriptSnippet, homepageAnalyticsSnippet } from "@/lib/analytics";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

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

  return html
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(/<title>[\s\S]*?<\/title>/, metadata)
    .replace("<body>", `<body>${gtmNoScriptSnippet()}`)
    .replace("</body>", `${homepageAnalyticsSnippet()}</body>`);
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
