import {
  getPublishedBlogInventoryPosts,
  getPublishedBlogPost,
  getPublishedBlogPosts,
  getPublishedProjects
} from "@/lib/cms";
import { BLOG_LANGUAGES, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { siteName, siteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";

const LLMS_FULL_ARTICLE_GROUP_LIMIT = Number(process.env.LLMS_FULL_ARTICLE_GROUP_LIMIT || 6);

function normalizePlainText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function publicProjectText(value: string) {
  return publicTaxonomyLabel(normalizePlainText(value), "zh-Hant");
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
  const [posts, projects] = await Promise.all([
    lightweightCloudflareRender ? getPublishedBlogInventoryPosts() : getPublishedBlogPosts(),
    lightweightCloudflareRender ? Promise.resolve([]) : getPublishedProjects()
  ]);
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
    ...projects.map(
      (project) =>
        `### ${publicProjectText(project.title)}\nURL: ${siteUrl}/projects/${project.slug}\nCategory: ${publicProjectText(
          project.tag
        )}\nSummary: ${publicProjectText(project.desc)}\nDetail: ${publicProjectText(project.detail)}`
    ),
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
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
