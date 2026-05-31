import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/BlogArticle";
import { blogCoverForLanguage, blogPostPath, cleanBlogSeoTitle, metadataLanguageKey } from "@/lib/blog-utils";
import { getPublishedBlogAlternates, getPublishedBlogPost } from "@/lib/cms";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug, "zh-Hant");
  if (!post) return {};
  const alternates = await getPublishedBlogAlternates(post);
  const image = absoluteUrl(post.cover || blogCoverForLanguage(post.language));

  return {
    title: cleanBlogSeoTitle(post.seoTitle || post.title),
    description: post.seoDescription || post.excerpt,
    alternates: {
      canonical: absoluteUrl(blogPostPath(post)),
      languages: Object.fromEntries(
        [post, ...alternates]
          .map((alternate) => [metadataLanguageKey(alternate.language), absoluteUrl(blogPostPath(alternate))])
          .concat([["x-default", absoluteUrl(blogPostPath(post))]])
      )
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      url: absoluteUrl(blogPostPath(post)),
      locale: "zh_TW",
      images: [image]
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.seoDescription || post.excerpt,
      images: [image]
    }
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug, "zh-Hant");
  if (!post) notFound();

  return <BlogArticle post={post} />;
}
