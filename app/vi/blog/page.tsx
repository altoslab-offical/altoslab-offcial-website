import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogIndexPath, metadataLanguageKey } from "@/lib/blog-utils";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const language = "vi" as const;
const title = "Ghi Chép Phòng Lab AI | ALTOS LAB Journal";
const description = "Journal của ALTOS LAB về sản phẩm AI, agent, automation, khả năng hiển thị trong tìm kiếm, case study và tín hiệu thị trường.";

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
    locale: "vi_VN",
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
  searchParams?: Promise<{ tag?: string; query?: string; page?: string }> | { tag?: string; query?: string; page?: string };
};

export default async function VietnameseBlogIndexPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <BlogIndex language={language} tag={params.tag} query={params.query} page={params.page} />;
}
