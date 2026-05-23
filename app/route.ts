import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withLaunchMetadata(html: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab.com").replace(/\/$/, "");
  const title = "ALTOS LAB｜AI Studio 人工智慧工作室";
  const description =
    "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接與智能行銷。";

  return html
    .replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    .replace(
      "<title>altoslab-site2</title>",
      `<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${siteUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${siteUrl}" />
    <meta property="og:site_name" content="ALTOS LAB" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:type" content="website" />`
    );
}

export async function GET() {
  const html = await readFile(path.join(process.cwd(), "index.html"), "utf8");

  return new Response(withLaunchMetadata(html), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
