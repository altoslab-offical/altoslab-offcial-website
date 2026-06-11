import type { Metadata } from "next";
import { BlogIndexLite } from "@/components/BlogIndexLite";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, 검색 가시성, 사례, AI 시장 관찰 노트.",
  alternates: {
    canonical: `${siteUrl}/ko/blog`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((language) => [metadataLanguageKey(language), `${siteUrl}${blogIndexPath(language)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, 검색 가시성, 사례, AI 시장 관찰 노트.",
    url: `${siteUrl}/ko/blog`,
    siteName: "ALTOS LAB",
    locale: "ko_KR",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("ko")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, 검색 가시성, 사례, AI 시장 관찰 노트.",
    images: [`${siteUrl}${blogCoverForLanguage("ko")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function KoreanBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndexLite language="ko" tag={params.tag} query={params.query} />;
}
