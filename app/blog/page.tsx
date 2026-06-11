import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 實驗室筆記｜ALTOS LAB Journal",
  description: "ALTOS LAB 的 AI 產品、Agent、自動化、搜尋可見度、案例與市場觀察研究筆記。",
  alternates: {
    canonical: `${siteUrl}/blog`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((language) => [metadataLanguageKey(language), `${siteUrl}${blogIndexPath(language)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title: "AI 實驗室筆記｜ALTOS LAB Journal",
    description: "ALTOS LAB 的 AI 產品、Agent、自動化、搜尋可見度、案例與市場觀察研究筆記。",
    url: `${siteUrl}/blog`,
    siteName: "ALTOS LAB",
    locale: "zh_TW",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("zh-Hant")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 實驗室筆記｜ALTOS LAB Journal",
    description: "ALTOS LAB 的 AI 產品、Agent、自動化、搜尋可見度、案例與市場觀察研究筆記。",
    images: [`${siteUrl}${blogCoverForLanguage("zh-Hant")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="zh-Hant" tag={params.tag} query={params.query} />;
}
