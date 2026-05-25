import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Implementation and GEO Blog",
  description: "ALTOS LAB articles on AI agents, automation, SEO and generative search visibility.",
  alternates: {
    canonical: `${siteUrl}/en/blog`,
    languages: {
      "zh-Hant-TW": `${siteUrl}/blog`,
      en: `${siteUrl}/en/blog`,
      "x-default": `${siteUrl}/blog`
    }
  },
  openGraph: {
    title: "AI Implementation and GEO Blog",
    description: "Practical AI implementation, SEO and GEO articles from ALTOS LAB.",
    url: `${siteUrl}/en/blog`,
    siteName: "ALTOS LAB",
    locale: "en_US",
    type: "website",
    images: [`${siteUrl}/geo-cover.png`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Implementation and GEO Blog",
    description: "Practical AI implementation, SEO and GEO articles from ALTOS LAB.",
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
