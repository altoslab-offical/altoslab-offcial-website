import { getPublishedBlogPosts } from "@/lib/cms";
import { blogPostPath } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { absoluteUrl, siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await getPublishedBlogPosts();
  const items = posts
    .slice(0, 30)
    .map((post) => {
      const url = absoluteUrl(blogPostPath(post));
      return `<item>
        <title>${escapeXml(post.title)}</title>
        <link>${url}</link>
        <guid isPermaLink="true">${url}</guid>
        <description>${escapeXml(post.excerpt)}</description>
        <pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
        <category>${escapeXml(post.contentType || "column")}</category>
        <category>${escapeXml(publicTaxonomyLabel(post.newsCategory || post.topic, post.language))}</category>
      </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>${escapeXml(siteName)} Blog</title>
      <link>${siteUrl}/blog</link>
      <description>${escapeXml("AI products, agents, automation, case studies, search visibility and market signals from ALTOS LAB.")}</description>
      <language>zh-TW</language>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      ${items}
    </channel>
  </rss>`;

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
