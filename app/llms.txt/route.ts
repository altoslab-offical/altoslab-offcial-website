import { getPublishedBlogInventoryPostsForApi } from "@/lib/cms";
import { BLOG_LANGUAGES, blogPostPath } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { siteName, siteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";

const LLMS_ARTICLE_GROUP_LIMIT = Number(process.env.LLMS_ARTICLE_GROUP_LIMIT || 12);
const CLOUDFLARE_LLMS_INVENTORY_LIMIT = 36;
const LLMS_INVENTORY_LIMIT = Number(process.env.LLMS_INVENTORY_LIMIT || 108);

function articleTimestamp(post: BlogPost) {
  return new Date(post.updatedAt || post.publishedAt || post.createdAt).getTime() || 0;
}

function orderedLlmsArticles(posts: BlogPost[]) {
  const grouped = new Map<string, BlogPost[]>();
  posts.forEach((post) => {
    const key = post.translationGroupId || post.id;
    grouped.set(key, [...(grouped.get(key) || []), post]);
  });

  return [...grouped.values()]
    .sort((a, b) => Math.max(...b.map(articleTimestamp)) - Math.max(...a.map(articleTimestamp)))
    .slice(0, LLMS_ARTICLE_GROUP_LIMIT)
    .flatMap((group) =>
      [...group].sort((a, b) => BLOG_LANGUAGES.indexOf(a.language) - BLOG_LANGUAGES.indexOf(b.language))
    );
}

export async function GET() {
  const runtimeLimit =
    process.env.CLOUDFLARE_KV_ENABLED === "1" ? CLOUDFLARE_LLMS_INVENTORY_LIMIT : LLMS_INVENTORY_LIMIT;
  const inventoryLimit = Math.min(LLMS_ARTICLE_GROUP_LIMIT * BLOG_LANGUAGES.length, runtimeLimit);
  const posts = await getPublishedBlogInventoryPostsForApi(undefined, inventoryLimit);
  const articles = orderedLlmsArticles(posts);
  const lines = [
    `# ${siteName}`,
    "",
    "> ALTOS LAB is an AI implementation studio helping teams build AI agents, automation workflows, CMS and search-ready content systems.",
    "",
    "## Core Pages",
    `- [Homepage](${siteUrl}): AI implementation studio overview and contact path`,
    `- [Blog](${siteUrl}/blog): AI implementation, search visibility and product notes`,
    `- [RSS](${siteUrl}/feed.xml): Latest published blog posts`,
    `- [Full LLM Context](${siteUrl}/llms-full.txt): Expanded service and article context for answer engines`,
    "",
    "## Services and Products",
    "- AI agent planning, buildout and operating-system design",
    "- Workflow automation for marketing, CMS, analytics and internal operations",
    "- Search-ready websites, GEO/SEO content systems and measurement loops",
    "- Product implementation, QA gates and production release support",
    "",
    "## Articles",
    ...articles.map(
      (post) =>
        `- [${publicTaxonomyLabel(post.title, post.language)}](${siteUrl}${blogPostPath(post)}): ${publicTaxonomyLabel(
          post.geoSummary || post.excerpt,
          post.language
        )}`
    )
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
