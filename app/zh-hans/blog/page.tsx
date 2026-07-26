import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 实验室笔记 | ALTOS LAB Journal",
  description: "ALTOS LAB 关于 AI 产品、Agent、自动化、搜索可见度、案例与市场信号的简体中文内容。",
  alternates: {
    canonical: `${siteUrl}/zh-hans/blog`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((language) => [metadataLanguageKey(language), `${siteUrl}${blogIndexPath(language)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title: "AI 实验室笔记 | ALTOS LAB Journal",
    description: "ALTOS LAB 关于 AI 产品、Agent、自动化、搜索可见度、案例与市场信号的简体中文内容。",
    url: `${siteUrl}/zh-hans/blog`,
    siteName: "ALTOS LAB",
    locale: "zh_CN",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("zh-Hans")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 实验室笔记 | ALTOS LAB Journal",
    description: "ALTOS LAB 关于 AI 产品、Agent、自动化、搜索可见度、案例与市场信号的简体中文内容。",
    images: [`${siteUrl}${blogCoverForLanguage("zh-Hans")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string; page?: string }> | { tag?: string; query?: string; page?: string };
};

export default async function SimplifiedChineseBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="zh-Hans" tag={params.tag} query={params.query} page={params.page} />;
}
