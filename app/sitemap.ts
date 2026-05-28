import type { MetadataRoute } from "next";
import { getPublishedBlogPosts, getPublishedProjects } from "@/lib/cms";
import { blogPostPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getPublishedBlogPosts(), getPublishedProjects()]);
  const now = new Date();
  const uniquePosts = Array.from(
    new Map(posts.map((post) => [`${siteUrl}${blogPostPath(post)}`, post])).values()
  );

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/en/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/ja/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65
    },
    {
      url: `${siteUrl}/ko/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65
    },
    {
      url: `${siteUrl}/projects`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${siteUrl}/feed.xml`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4
    },
    {
      url: `${siteUrl}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4
    },
    {
      url: `${siteUrl}/llms-full.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4
    },
    ...uniquePosts.map((post) => {
      const alternates = posts.filter((alternate) => alternate.translationGroupId === post.translationGroupId);
      const defaultPost = alternates.find((alternate) => alternate.language === "zh-Hant") || post;

      return {
        url: `${siteUrl}${blogPostPath(post)}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            alternates
              .map((alternate) => [metadataLanguageKey(alternate.language), `${siteUrl}${blogPostPath(alternate)}`])
              .concat([["x-default", `${siteUrl}${blogPostPath(defaultPost)}`]])
          )
        }
      };
    }),
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: new Date(project.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7
    }))
  ];
}
