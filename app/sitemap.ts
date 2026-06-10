import type { MetadataRoute } from "next";
import { getPublishedBlogPostsForMetadata, getPublishedProjects } from "@/lib/cms";
import { BLOG_LANGUAGES, blogIndexPath, blogPostPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lightweightCloudflareRender = process.env.CLOUDFLARE_KV_ENABLED === "1";
  const [posts, projects] = await Promise.all([
    getPublishedBlogPostsForMetadata(),
    lightweightCloudflareRender ? Promise.resolve([]) : getPublishedProjects()
  ]);
  const now = new Date();
  const uniquePosts = Array.from(
    new Map(posts.map((post) => [`${siteUrl}${blogPostPath(post)}`, post])).values()
  );
  const alternatesByGroup = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = post.translationGroupId || post.id;
    alternatesByGroup.set(key, [...(alternatesByGroup.get(key) || []), post]);
  }

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    ...BLOG_LANGUAGES.map((language, index) => ({
      url: `${siteUrl}${blogIndexPath(language)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 0.8 : 0.65
    })),
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
      const alternates = alternatesByGroup.get(post.translationGroupId || post.id) || [post];
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
