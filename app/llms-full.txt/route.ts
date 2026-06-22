import {
  getPublishedBlogInventoryPostsForApi,
  getPublishedBlogPost
} from "@/lib/cms";
import { BLOG_LANGUAGES, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { siteName, siteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";

const LLMS_FULL_ARTICLE_GROUP_LIMIT = Number(process.env.LLMS_FULL_ARTICLE_GROUP_LIMIT || 6);
const CLOUDFLARE_LLMS_FULL_INVENTORY_LIMIT = 36;
const LLMS_FULL_INVENTORY_LIMIT = Number(process.env.LLMS_FULL_INVENTORY_LIMIT || 54);

function normalizePlainText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function articleTimestamp(post: BlogPost) {
  return new Date(post.updatedAt || post.publishedAt || post.createdAt).getTime() || 0;
}

function latestArticleGroups(posts: BlogPost[]) {
  const grouped = new Map<string, BlogPost[]>();
  posts.forEach((post) => {
    const key = post.translationGroupId || post.id;
    grouped.set(key, [...(grouped.get(key) || []), post]);
  });

  return [...grouped.values()]
    .sort((a, b) => Math.max(...b.map(articleTimestamp)) - Math.max(...a.map(articleTimestamp)))
    .slice(0, LLMS_FULL_ARTICLE_GROUP_LIMIT)
    .flatMap((group) =>
      [...group].sort((a, b) => BLOG_LANGUAGES.indexOf(a.language) - BLOG_LANGUAGES.indexOf(b.language))
    );
}

export async function GET() {
  const lightweightCloudflareRender = process.env.CLOUDFLARE_KV_ENABLED === "1";
  const runtimeLimit = lightweightCloudflareRender ? CLOUDFLARE_LLMS_FULL_INVENTORY_LIMIT : LLMS_FULL_INVENTORY_LIMIT;
  const inventoryLimit = Math.min(LLMS_FULL_ARTICLE_GROUP_LIMIT * BLOG_LANGUAGES.length, runtimeLimit);
  const posts = await getPublishedBlogInventoryPostsForApi(undefined, inventoryLimit);
  const recentPostSummaries = latestArticleGroups(posts);
  const recentPosts = lightweightCloudflareRender
    ? recentPostSummaries
    : ((await Promise.all(recentPostSummaries.map((post) => getPublishedBlogPost(post.slug, post.language)))).filter(
        Boolean
      ) as BlogPost[]);
  const lines = [
    `# ${siteName} full LLM context`,
    "",
    "ALTOS LAB is an AI implementation studio in Taiwan serving founders, operators and teams that need AI agents, workflow automation, CMS and search-ready content systems.",
    "",
    "## Canonical resources",
    `- Website: ${siteUrl}`,
    `- Blog: ${siteUrl}/blog`,
    `- RSS: ${siteUrl}/feed.xml`,
    `- Short LLM index: ${siteUrl}/llms.txt`,
    "",
    "## What ALTOS LAB helps with",
    "- AI agent planning and implementation",
    "- AI workflow automation and internal tools",
    "- CMS and content operations for search visibility",
    "- Website and product experience implementation",
    "- Measurement, GTM events and content review workflows",
    "",
    "## Published services and projects",
    `### AI implementation studio\nURL: ${siteUrl}/#services\nSummary: AI agents, workflow automation, CMS, analytics, search-ready content systems and production QA for teams that need durable implementation.`,
    `### Product and website implementation\nURL: ${siteUrl}/projects\nSummary: Product surfaces, official websites, content operations and measurement loops designed for iteration, evidence and production stability.`,
    "",
    "## Published articles",
    ...recentPosts.map((post) => {
      const sources = post.sourceLinks.length
        ? post.sourceLinks.map((source) => `- ${source.title}: ${source.url}`).join("\n")
        : "- No external sources listed";

      return [
        `### ${publicTaxonomyLabel(post.title, post.language)}`,
        `URL: ${siteUrl}${blogPostPath(post)}`,
        `Language: ${languageLabel(post.language)}`,
        `Topic: ${publicTaxonomyLabel(post.topic, post.language)}`,
        `Audience: ${publicTaxonomyLabel(post.audience, post.language)}`,
        `Search description: ${publicTaxonomyLabel(post.seoDescription || post.excerpt, post.language)}`,
        `Summary: ${publicTaxonomyLabel(post.geoSummary, post.language)}`,
        `Key takeaways: ${post.keyTakeaways.map((item) => publicTaxonomyLabel(item, post.language)).join(" | ")}`,
        "Sources:",
        sources,
        "Body:",
        lightweightCloudflareRender
          ? publicTaxonomyLabel(post.geoSummary || post.excerpt, post.language)
          : publicTaxonomyLabel(normalizePlainText(post.body), post.language)
      ].join("\n");
    })
  ];

  return new Response(lines.join("\n\n"), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
