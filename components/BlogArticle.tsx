import Link from "next/link";
import { AnalyticsEvent } from "@/components/AnalyticsEvents";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { blogIndexPath, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { getPublishedBlogAlternates } from "@/lib/cms";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

const copy = {
  "zh-Hant": {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    geoSummary: "GEO answer summary",
    takeaways: "Key Takeaways",
    faq: "常見問題",
    sources: "來源與參考",
    disclosure: "AI 內容揭露",
    ctaTitle: "需要把這套內容系統接到你的官網？",
    cta: "和 ALTOS LAB 討論"
  },
  en: {
    back: "← Blog",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    geoSummary: "GEO answer summary",
    takeaways: "Key Takeaways",
    faq: "FAQ",
    sources: "Sources",
    disclosure: "AI disclosure",
    ctaTitle: "Need this content system wired into your company website?",
    cta: "Talk to ALTOS LAB"
  }
};

export async function BlogArticle({ post }: { post: BlogPost }) {
  const dictionary = copy[post.language];
  const alternates = await getPublishedBlogAlternates(post);
  const locale = post.language === "en" ? "en" : "zh-TW";

  return (
    <div className="site-home blog-site-shell">
      <SiteHeader />
      <main className="blog-page">
        <AnalyticsEvent
          payload={{
            event: "blog_post_viewed",
            blog_slug: post.slug,
            blog_language: post.language,
            translation_group_id: post.translationGroupId
          }}
        />
        <JsonLd data={articleJsonLd(post)} />
        <JsonLd data={faqJsonLd(post)} />
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: blogIndexPath(post.language) },
            { name: post.title, url: blogPostPath(post) }
          ])}
        />
        <article>
          <header className="article-hero">
            <div className="article-nav-row">
              <Link className="card-link" href={blogIndexPath(post.language)}>
                {dictionary.back}
              </Link>
              {alternates.map((alternate) => (
                <Link className="button" href={blogPostPath(alternate)} key={alternate.id}>
                  {languageLabel(alternate.language)}
                </Link>
              ))}
            </div>
            <p className="eyebrow">
              {post.tags.slice(0, 3).join(" / ")} · {dictionary.readTime(post.readTimeMinutes)}
            </p>
            <h1>{post.title}</h1>
            <div className="article-meta">
              <span>{post.author}</span>
              <span>
                {dictionary.updated} {new Date(post.updatedAt).toLocaleDateString(locale)}
              </span>
              <span>{languageLabel(post.language)}</span>
            </div>
            <p className="hero-copy">{post.excerpt}</p>
            {post.cover ? (
              <img className="article-cover" src={post.cover} alt={post.coverAlt || `${post.title} cover`} />
            ) : null}
          </header>

          <aside className="geo-summary">
            <strong>{dictionary.geoSummary}:</strong> {post.geoSummary}
          </aside>

          {post.keyTakeaways.length ? (
            <section className="project-detail-card">
              <p className="eyebrow">{dictionary.takeaways}</p>
              <ul>
                {post.keyTakeaways.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <RichText text={post.body} />

          {post.sourceLinks.length ? (
            <section className="source-list">
              <p className="eyebrow">{dictionary.sources}</p>
              <ul>
                {post.sourceLinks.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    {source.publisher ? <span> · {source.publisher}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {post.faqs.length ? (
            <section style={{ marginTop: 48 }}>
              <p className="eyebrow">FAQ</p>
              <h2>{dictionary.faq}</h2>
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

          {post.aiDisclosure ? (
            <aside className="ai-disclosure">
              <strong>{dictionary.disclosure}:</strong> {post.aiDisclosure}
            </aside>
          ) : null}

          <section className="blog-cta-panel">
            <h2>{dictionary.ctaTitle}</h2>
            <Link className="button primary" href="/#contact">
              {dictionary.cta}
            </Link>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
