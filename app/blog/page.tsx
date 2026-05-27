import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 實驗室筆記｜ALTOS LAB Journal",
  description: "ALTOS LAB 的 AI 產品、Agent、自動化、SEO/GEO、案例與市場觀察研究筆記。",
  alternates: {
    canonical: `${siteUrl}/blog`,
    languages: {
      "zh-Hant-TW": `${siteUrl}/blog`,
      en: `${siteUrl}/en/blog`,
      "x-default": `${siteUrl}/blog`
    }
  },
  openGraph: {
    title: "AI 實驗室筆記｜ALTOS LAB Journal",
    description: "ALTOS LAB 的 AI 產品、Agent、自動化、SEO/GEO、案例與市場觀察研究筆記。",
    url: `${siteUrl}/blog`,
    siteName: "ALTOS LAB",
    locale: "zh_TW",
    type: "website",
    images: [`${siteUrl}/geo-cover.png`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 實驗室筆記｜ALTOS LAB Journal",
    description: "ALTOS LAB 的 AI 產品、Agent、自動化、SEO/GEO、案例與市場觀察研究筆記。",
    images: [`${siteUrl}/geo-cover.png`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="zh-Hant" tag={params.tag} query={params.query} />;
}
