import type { Metadata } from "next";
import { BlogIndexLite } from "@/components/BlogIndexLite";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Lab Notes | ALTOS LAB Journal",
  description: "ALTOS LAB journal on AI products, agents, automation, search visibility, case studies and market signals.",
  alternates: {
    canonical: `${siteUrl}/en/blog`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((language) => [metadataLanguageKey(language), `${siteUrl}${blogIndexPath(language)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB journal on AI products, agents, automation, search visibility, case studies and market signals.",
    url: `${siteUrl}/en/blog`,
    siteName: "ALTOS LAB",
    locale: "en_US",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage("en")}`]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lab Notes | ALTOS LAB Journal",
    description: "ALTOS LAB journal on AI products, agents, automation, search visibility, case studies and market signals.",
    images: [`${siteUrl}${blogCoverForLanguage("en")}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function EnglishBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndexLite language="en" tag={params.tag} query={params.query} />;
}
