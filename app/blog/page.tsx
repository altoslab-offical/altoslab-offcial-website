import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getPublishedBlogPosts } from "@/lib/cms";
import { breadcrumbJsonLd, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 實作與 GEO 部落格",
  description: "ALTOS LAB 的 AI Agent、流程自動化、SEO 與 GEO 實作文章。",
  alternates: {
    canonical: `${siteUrl}/blog`
  }
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="blog-page">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }])} />
      <p className="eyebrow">Insights · AI / SEO / GEO</p>
      <h1>AI 實作與 GEO 策略筆記</h1>
      <p className="hero-copy">
        面向企業主、營運與行銷團隊的 AI 落地文章。每篇文章都由後台管理，包含 SEO 摘要、GEO 回答摘要、FAQ 與結構化資料。
      </p>
      <div className="blog-grid" style={{ marginTop: 36 }}>
        {posts.map((post) => (
          <article className="blog-card" key={post.id}>
            {post.cover ? (
              <Link className="blog-image" href={`/blog/${post.slug}`}>
                <img src={post.cover} alt={`${post.title} cover`} loading="lazy" />
              </Link>
            ) : null}
            <div className="blog-body">
              <p className="eyebrow">{post.tags.slice(0, 3).join(" / ")}</p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <Link className="card-link" href={`/blog/${post.slug}`}>
                閱讀文章
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
