import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { blogCoverForLanguage } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB の AI プロダクト、エージェント、自動化、SEO/GEO、事例、AI 市場観測ノート。",
  alternates: {
    canonical: `${siteUrl}/ja/blog`,
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
    description: "ALTOS LAB の AI プロダクト、エージェント、自動化、SEO/GEO、事例、AI 市場観測ノート。",
    url: `${siteUrl}/ja/blog`,
    siteName: "ALTOS LAB",
    locale: "ja_JP",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("ja")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB の AI プロダクト、エージェント、自動化、SEO/GEO、事例、AI 市場観測ノート。",
    images: [`${siteUrl}${blogCoverForLanguage("ja")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function JapaneseBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="ja" tag={params.tag} query={params.query} />;
}
