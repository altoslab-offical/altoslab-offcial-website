import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { HomePage } from "@/components/site/HomePage";
import { getPublishedBlogPosts, getPublishedHomePage, getPublishedProjects } from "@/lib/cms";
import { organizationJsonLd, pageMetadata, servicesJsonLd, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedHomePage();
  return pageMetadata(page);
}

export default async function Home() {
  const [page, projects, posts] = await Promise.all([
    getPublishedHomePage(),
    getPublishedProjects(),
    getPublishedBlogPosts()
  ]);

  if (!page) notFound();

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={servicesJsonLd(projects)} />
      <HomePage page={page} projects={projects} posts={posts} />
    </>
  );
}
