import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomePage } from "@/components/site/HomePage";
import { getPublishedBlogPosts, getPublishedHomePage, getPublishedProjects } from "@/lib/cms";
import { absoluteUrl, organizationJsonLd, siteUrl, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ALTOS LAB｜AI Studio 人工智慧工作室",
  description: "ALTOS LAB 深耕互聯網產品開發與 AI 系統整合，協助企業導入 AI Skill、AI Agent、系統串接與智能行銷。",
  alternates: {
    canonical: siteUrl
  },
  openGraph: {
    title: "ALTOS LAB｜AI Studio 人工智慧工作室",
    description: "AI Skill、AI Agent、系統串接、智能行銷與後台 CMS 的實作型 AI 工作室。",
    url: siteUrl,
    siteName: "ALTOS LAB",
    locale: "zh_TW",
    type: "website",
    images: [absoluteUrl("/wonda-cover.png")]
  }
};

export default async function Page() {
  const [page, projects, posts] = await Promise.all([
    getPublishedHomePage(),
    getPublishedProjects(),
    getPublishedBlogPosts()
  ]);

  if (!page) {
    throw new Error("Published home page is missing from CMS seed data.");
  }

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <HomePage page={page} projects={projects} posts={posts} />
    </>
  );
}
