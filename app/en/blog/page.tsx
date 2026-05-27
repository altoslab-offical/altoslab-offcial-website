import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB journal on AI products, agents, automation, SEO/GEO, case studies and market signals.",
  alternates: {
    canonical: `${siteUrl}/en/blog`,
    languages: {
      "zh-Hant-TW": `${siteUrl}/blog`,
      en: `${siteUrl}/en/blog`,
      "x-default": `${siteUrl}/blog`
    }
  },
  openGraph: {
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB journal on AI products, agents, automation, SEO/GEO, case studies and market signals.",
    url: `${siteUrl}/en/blog`,
    siteName: "ALTOS LAB",
    locale: "en_US",
    type: "website",
    images: [`${siteUrl}/geo-cover.png`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB journal on AI products, agents, automation, SEO/GEO, case studies and market signals.",
    images: [`${siteUrl}/geo-cover.png`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function EnglishBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language="en" tag={params.tag} query={params.query} />;
}
