import { getPublishedBlogPosts, getPublishedProjects } from "@/lib/cms";
import { blogPostPath } from "@/lib/blog-utils";
import { siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedBlogPosts(), getPublishedProjects()]);
  const lines = [
    `# ${siteName}`,
    "",
    "> ALTOS LAB is an AI implementation studio helping teams build AI agents, automation workflows, CMS, SEO and GEO content systems.",
    "",
    "## Core Pages",
    `- [Homepage](${siteUrl}): AI implementation studio overview and contact path`,
    `- [Blog](${siteUrl}/blog): AI, SEO and GEO implementation notes`,
    `- [RSS](${siteUrl}/feed.xml): Latest published blog posts`,
    `- [Full LLM Context](${siteUrl}/llms-full.txt): Expanded service and article context for answer engines`,
    "",
    "## Services and Products",
    ...projects.slice(0, 8).map((project) => `- [${project.title}](${siteUrl}/projects/${project.slug}): ${project.desc}`),
    "",
    "## Articles",
    ...posts.slice(0, 12).map((post) => `- [${post.title}](${siteUrl}${blogPostPath(post)}): ${post.geoSummary || post.excerpt}`)
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
