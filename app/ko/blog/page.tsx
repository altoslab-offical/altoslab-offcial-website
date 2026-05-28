import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { blogCoverForLanguage } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, SEO/GEO, 사례, AI 시장 관찰 노트.",
  alternates: {
    canonical: `${siteUrl}/ko/blog`,
    languages: {
      "zh-Hant-TW": `${siteUrl}/blog`,
      en: `${siteUrl}/en/blog`,
      ja: `${siteUrl}/ja/blog`,
      ko: `${siteUrl}/ko/blog`,
      "x-default": `${siteUrl}/blog`
    }
  },
  openGraph: {
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, SEO/GEO, 사례, AI 시장 관찰 노트.",
    url: `${siteUrl}/ko/blog`,
    siteName: "ALTOS LAB",
    locale: "ko_KR",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("ko")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB의 AI 제품, 에이전트, 자동화, SEO/GEO, 사례, AI 시장 관찰 노트.",
    images: [`${siteUrl}${blogCoverForLanguage("ko")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function KoreanBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="ko" tag={params.tag} query={params.query} />;
}
