import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const language = "id" as const;
const title = "Catatan Lab AI | ALTOS LAB Journal";
const description = "Jurnal ALTOS LAB tentang produk AI, agent, automation, search visibility, studi kasus dan sinyal pasar.";

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
    locale: "id_ID",
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

export default async function IndonesianBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language={language} tag={params.tag} query={params.query} />;
}
