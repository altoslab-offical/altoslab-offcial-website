import Link from "next/link";
import { AnalyticsEvent } from "@/components/AnalyticsEvents";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import { renderBrandText } from "@/components/BrandText";
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
  },
  ja: {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分で読めます`,
    geoSummary: "GEO answer summary",
    takeaways: "Key Takeaways",
    faq: "FAQ",
    sources: "Sources",
    disclosure: "AI disclosure",
    ctaTitle: "このコンテンツ運用を自社サイトに接続しますか？",
    cta: "ALTOS LAB に相談"
  },
  ko: {
    back: "← Blog",
    updated: "업데이트",
    readTime: (minutes: number) => `${minutes}분 읽기`,
    geoSummary: "GEO answer summary",
    takeaways: "Key Takeaways",
    faq: "FAQ",
    sources: "Sources",
    disclosure: "AI disclosure",
    ctaTitle: "이 콘텐츠 운영 시스템을 회사 웹사이트에 연결할까요?",
    cta: "ALTOS LAB에 상담"
  }
};

export async function BlogArticle({ post }: { post: BlogPost }) {
  const dictionary = copy[post.language];
  const alternates = await getPublishedBlogAlternates(post);
  const locale = post.language === "en" ? "en" : "zh-TW";

  return (
    <div className="site-home blog-site-shell">
      <SiteHeader />
      <main className="blog-page blog-article-page">
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
              {[post.contentType, post.newsCategory, ...post.tags.slice(0, 2)].filter(Boolean).join(" / ")} ·{" "}
              {dictionary.readTime(post.readTimeMinutes)}
            </p>
            <h1>{renderBrandText(post.title)}</h1>
            <div className="article-meta">
              <span>{renderBrandText(post.author)}</span>
              <span>
                {dictionary.updated} {new Date(post.updatedAt).toLocaleDateString(locale)}
              </span>
              <span>{languageLabel(post.language)}</span>
            </div>
            <p className="hero-copy">{renderBrandText(post.excerpt)}</p>
            {post.cover ? (
              <>
                <img className="article-cover" src={post.cover} alt={post.coverAlt || `${post.title} cover`} />
                {post.coverCredit ? (
                  <p className="article-cover-credit">
                    Cover image:{" "}
                    {post.coverCreditUrl ? (
                      <a href={post.coverCreditUrl} target="_blank" rel="noreferrer">
                        {renderBrandText(post.coverCredit)}
                      </a>
                    ) : (
                      renderBrandText(post.coverCredit)
                    )}
                    {post.coverLicense ? (
                      <>
                        {" "}
                        ·{" "}
                        {post.coverLicenseUrl ? (
                          <a href={post.coverLicenseUrl} target="_blank" rel="noreferrer">
                            {post.coverLicense}
                          </a>
                        ) : (
                          post.coverLicense
                        )}
                      </>
                    ) : null}
                  </p>
                ) : null}
              </>
            ) : (
              <BlogEditorialVisual post={post} />
            )}
          </header>

          <aside className="geo-summary">
            <strong>{dictionary.geoSummary}:</strong> {renderBrandText(post.geoSummary)}
          </aside>

          {post.keyTakeaways.length ? (
            <section className="project-detail-card">
              <p className="eyebrow">{dictionary.takeaways}</p>
              <ul>
                {post.keyTakeaways.map((item) => (
                  <li key={item}>{renderBrandText(item)}</li>
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
                      {renderBrandText(source.title)}
                    </a>
                    {source.publisher ? <span> · {renderBrandText(source.publisher)}</span> : null}
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
                    <p>{renderBrandText(faq.answer)}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {post.aiDisclosure ? (
            <aside className="ai-disclosure">
              <strong>{dictionary.disclosure}:</strong> {renderBrandText(post.aiDisclosure)}
            </aside>
          ) : null}

          <section className="blog-cta-panel">
            <h2>{dictionary.ctaTitle}</h2>
            <Link className="button primary" href="/#contact">
              {renderBrandText(dictionary.cta)}
            </Link>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
