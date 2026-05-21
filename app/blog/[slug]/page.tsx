import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { getPublishedBlogPost } from "@/lib/cms";
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return {};

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: {
      canonical: absoluteUrl(`/blog/${post.slug}`)
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      url: absoluteUrl(`/blog/${post.slug}`),
      images: post.cover ? [absoluteUrl(post.cover)] : undefined
    }
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();

  return (
    <main className="blog-page">
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd data={faqJsonLd(post)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${post.slug}` }
        ])}
      />
      <article>
        <header className="article-hero">
          <Link className="card-link" href="/blog">
            ← Blog
          </Link>
          <p className="eyebrow">{post.tags.slice(0, 3).join(" / ")}</p>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <span>{post.author}</span>
            <span>Updated {new Date(post.updatedAt).toLocaleDateString("zh-TW")}</span>
            <span>{post.status}</span>
          </div>
          <p className="hero-copy">{post.excerpt}</p>
          {post.cover ? <img className="project-detail-card" src={post.cover} alt={`${post.title} cover`} /> : null}
        </header>

        <aside className="geo-summary">
          <strong>GEO answer summary:</strong> {post.geoSummary}
        </aside>

        {post.keyTakeaways.length ? (
          <section className="project-detail-card">
            <p className="eyebrow">Key Takeaways</p>
            <ul>
              {post.keyTakeaways.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <RichText text={post.body} />

        {post.faqs.length ? (
          <section style={{ marginTop: 48 }}>
            <p className="eyebrow">FAQ</p>
            <h2>常見問題</h2>
            <div className="faq-list">
              {post.faqs.map((faq) => (
                <article className="faq-item" key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}
