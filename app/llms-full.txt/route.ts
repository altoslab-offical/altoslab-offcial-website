import { getPublishedBlogPosts, getPublishedProjects } from "@/lib/cms";
import { blogPostPath, languageLabel } from "@/lib/blog-utils";
import { siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

function normalizePlainText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedBlogPosts(), getPublishedProjects()]);
  const lines = [
    `# ${siteName} full LLM context`,
    "",
    "ALTOS LAB is an AI implementation studio in Taiwan serving founders, operators and teams that need AI agents, workflow automation, CMS, SEO and GEO systems.",
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
    "- CMS and content operations for SEO and GEO",
    "- Website and product experience implementation",
    "- Measurement, GTM events and content review workflows",
    "",
    "## Published services and projects",
    ...projects.map(
      (project) =>
        `### ${project.title}\nURL: ${siteUrl}/projects/${project.slug}\nCategory: ${project.tag}\nSummary: ${project.desc}\nDetail: ${normalizePlainText(project.detail)}`
    ),
    "",
    "## Published articles",
    ...posts.map((post) => {
      const sources = post.sourceLinks.length
        ? post.sourceLinks.map((source) => `- ${source.title}: ${source.url}`).join("\n")
        : "- No external sources listed";

      return [
        `### ${post.title}`,
        `URL: ${siteUrl}${blogPostPath(post)}`,
        `Language: ${languageLabel(post.language)}`,
        `Topic: ${post.topic}`,
        `Audience: ${post.audience}`,
        `SEO description: ${post.seoDescription || post.excerpt}`,
        `TL;DR: ${post.geoSummary}`,
        `Key takeaways: ${post.keyTakeaways.join(" | ")}`,
        "Sources:",
        sources,
        "Body:",
        normalizePlainText(post.body)
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
