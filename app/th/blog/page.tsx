import type { Metadata } from "next";
import { BlogIndexLite } from "@/components/BlogIndexLite";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const language = "th" as const;
const title = "บันทึกจากแล็บ AI | ALTOS LAB Journal";
const description = "Journal ของ ALTOS LAB ว่าด้วยผลิตภัณฑ์ AI, agent, automation, search visibility, case study และสัญญาณตลาด.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteUrl}${blogIndexPath(language)}`,
    languages: Object.fromEntries(
      BLOG_LANGUAGES.map((item) => [metadataLanguageKey(item), `${siteUrl}${blogIndexPath(item)}`]).concat([
        ["x-default", `${siteUrl}${blogIndexPath("zh-Hant")}`]
      ])
    )
  },
  openGraph: {
    title,
    description,
    url: `${siteUrl}${blogIndexPath(language)}`,
    siteName: "ALTOS LAB",
    locale: "th_TH",
    type: "website",
    images: [`${siteUrl}${blogCoverForLanguage(language)}`]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteUrl}${blogCoverForLanguage(language)}`]
  }
};

type PageProps = {
  searchParams?: Promise<{ tag?: string; query?: string }> | { tag?: string; query?: string };
};

export default async function ThaiBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndexLite language={language} tag={params.tag} query={params.query} />;
}
