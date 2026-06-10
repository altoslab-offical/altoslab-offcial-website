import type { Metadata } from "next";
import { BlogIndexLite } from "@/components/BlogIndexLite";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB の AI プロダクト、エージェント、自動化、検索での見え方、事例、AI 市場観測ノート。",
  alternates: {
    canonical: `${siteUrl}/ja/blog`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((language) => [metadataLanguageKey(language), `${siteUrl}${blogIndexPath(language)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB の AI プロダクト、エージェント、自動化、検索での見え方、事例、AI 市場観測ノート。",
    url: `${siteUrl}/ja/blog`,
    siteName: "ALTOS LAB",
    locale: "ja_JP",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("ja")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB の AI プロダクト、エージェント、自動化、検索での見え方、事例、AI 市場観測ノート。",
    images: [`${siteUrl}${blogCoverForLanguage("ja")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function JapaneseBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndexLite language="ja" tag={params.tag} query={params.query} />;
}
