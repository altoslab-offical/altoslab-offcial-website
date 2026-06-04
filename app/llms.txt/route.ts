import { getPublishedBlogPostsForMetadata, getPublishedProjects } from "@/lib/cms";
import { BLOG_LANGUAGES, blogPostPath } from "@/lib/blog-utils";
import { publicTaxonomyLabel } from "@/lib/public-taxonomy";
import { siteName, siteUrl } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";

function articleTimestamp(post: BlogPost) {
  return new Date(post.publishedAt || post.updatedAt || post.createdAt).getTime() || 0;
}

function orderedLlmsArticles(posts: BlogPost[]) {
  const grouped = new Map<string, BlogPost[]>();
  posts.forEach((post) => {
    const key = post.translationGroupId || post.id;
    grouped.set(key, [...(grouped.get(key) || []), post]);
  });

  return [...grouped.values()]
    .sort((a, b) => Math.max(...b.map(articleTimestamp)) - Math.max(...a.map(articleTimestamp)))
    .flatMap((group) =>
      [...group].sort((a, b) => BLOG_LANGUAGES.indexOf(a.language) - BLOG_LANGUAGES.indexOf(b.language))
    );
}

export async function GET() {
  const [posts, projects] = await Promise.all([getPublishedBlogPostsForMetadata(), getPublishedProjects()]);
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
    ...projects
      .slice(0, 8)
      .map(
        (project) =>
          `- [${publicTaxonomyLabel(project.title, "zh-Hant")}](${siteUrl}/projects/${project.slug}): ${publicTaxonomyLabel(
            project.desc,
            "zh-Hant"
          )}`
      ),
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
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
