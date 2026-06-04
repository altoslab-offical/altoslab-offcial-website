import { getPublishedBlogPostsForMetadata, getPublishedProjects } from "@/lib/cms";
import { blogPostPath, languageLabel } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

function normalizePlainText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function publicProjectText(value: string) {
  return publicTaxonomyLabel(normalizePlainText(value), "zh-Hant");
}

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedBlogPostsForMetadata(), getPublishedProjects()]);
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
    ...posts.map((post) => {
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
        `TL;DR: ${publicTaxonomyLabel(post.geoSummary, post.language)}`,
        `Key takeaways: ${post.keyTakeaways.map((item) => publicTaxonomyLabel(item, post.language)).join(" | ")}`,
        "Sources:",
        sources,
        "Body:",
        publicTaxonomyLabel(normalizePlainText(post.body), post.language)
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
