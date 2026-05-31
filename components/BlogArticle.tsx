import Link from "next/link";
import { AnalyticsEvent } from "@/components/AnalyticsEvents";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import { renderBrandText } from "@/components/BrandText";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { SafeBlogImage } from "@/components/SafeBlogImage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { blogContentTypeLabel, blogIndexPath, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { getRelatedPublishedBlogPosts } from "@/lib/cms";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import type { BlogPost } from "@/lib/types";

const copy = {
  "zh-Hant": {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    geoSummary: "重點摘要",
    takeaways: "本文重點",
    faq: "常見問題",
    sources: "來源與參考",
    related: "延伸閱讀",
    relatedTitle: "Keep reading",
    relatedMore: "查看全部",
    disclosure: "AI 內容揭露",
    tags: "文章標籤",
    authorLabel: "ALTOS LAB editorial note",
    authorName: "ALTOS LAB",
    authorBio: "專注於 AI 導入、生成式搜尋與企業數位策略的研究團隊。我們把第一線的實作經驗，整理成可被引用的觀點。"
  },
  en: {
    back: "← Blog",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    geoSummary: "TL;DR",
    takeaways: "Key Takeaways",
    faq: "FAQ",
    sources: "Sources",
    related: "Related reading",
    relatedTitle: "Keep reading",
    relatedMore: "View all",
    disclosure: "AI disclosure",
    tags: "Article tags",
    authorLabel: "ALTOS LAB editorial note",
    authorName: "ALTOS LAB",
    authorBio: "A research team focused on AI adoption, generative search, and enterprise digital strategy. We turn hands-on implementation work into viewpoints others can cite."
  },
  ja: {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分で読めます`,
    geoSummary: "要約",
    takeaways: "要点",
    faq: "FAQ",
    sources: "出典",
    related: "関連記事",
    relatedTitle: "Keep reading",
    relatedMore: "すべて見る",
    disclosure: "AI 開示",
    tags: "記事タグ",
    authorLabel: "ALTOS LAB editorial note",
    authorName: "ALTOS LAB",
    authorBio: "AI 導入、生成型検索、企業のデジタル戦略を研究するチームです。現場での実装経験を、引用可能な視点として整理しています。"
  },
  ko: {
    back: "← Blog",
    updated: "업데이트",
    readTime: (minutes: number) => `${minutes}분 읽기`,
    geoSummary: "핵심 요약",
    takeaways: "핵심 포인트",
    faq: "FAQ",
    sources: "출처",
    related: "관련 글",
    relatedTitle: "Keep reading",
    relatedMore: "전체 보기",
    disclosure: "AI 공개",
    tags: "글 태그",
    authorLabel: "ALTOS LAB editorial note",
    authorName: "ALTOS LAB",
    authorBio: "AI 도입, 생성형 검색, 기업 디지털 전략을 연구하는 팀입니다. 현장의 실행 경험을 인용 가능한 관점으로 정리합니다."
  }
};

function articleTaxonomy(post: BlogPost) {
  const seen = new Set<string>();
  const typeLabel = blogContentTypeLabel(post.contentType, post.language).toLowerCase();
  return [post.newsCategory, ...post.tags.slice(0, 3)]
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (key === typeLabel) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const sourceTranslationHeadings = new Set([
  "來源與轉譯備註",
  "Source and translation note",
  "Source and Translation Note",
  "出典と翻訳メモ",
  "出典・翻訳メモ",
  "출처 및 번역 메모",
  "출처와 번역 메모"
]);

function extractSourceTranslationNote(body: string) {
  const lines = body.split("\n");
  const headingIndex = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    return Boolean(match?.[1] && sourceTranslationHeadings.has(match[1].trim()));
  });

  if (headingIndex < 0) return { body, noteTitle: "", noteBody: "" };

  const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line.trim()));
  const endIndex = nextHeadingIndex < 0 ? lines.length : nextHeadingIndex;
  const noteTitle = lines[headingIndex].trim().replace(/^##\s+/, "");
  const noteBody = lines
    .slice(headingIndex + 1, endIndex)
    .join("\n")
    .trim();
  const nextBody = [...lines.slice(0, headingIndex), ...lines.slice(endIndex)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { body: nextBody, noteTitle, noteBody };
}

export async function BlogArticle({ post }: { post: BlogPost }) {
  const dictionary = copy[post.language];
  const taxonomy = articleTaxonomy(post);
  const sourceTranslationNote = extractSourceTranslationNote(post.body);
  const relatedPosts = await getRelatedPublishedBlogPosts(post, 3);
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
            </div>
            <p className="eyebrow article-kicker">
              <span className={`blog-craft-type-badge is-${post.contentType}`}>
                {blogContentTypeLabel(post.contentType, post.language)}
              </span>
              <span>{taxonomy.join(" / ")}</span>
              <span>{dictionary.readTime(post.readTimeMinutes)}</span>
            </p>
            <h1>{renderBrandText(post.title)}</h1>
            <div className="article-meta">
              <span>
                {dictionary.updated} {new Date(post.updatedAt).toLocaleDateString(locale)}
              </span>
              <span>{languageLabel(post.language)}</span>
            </div>
            <p className="hero-copy">{renderBrandText(post.excerpt)}</p>
            {post.cover ? (
              <>
                <SafeBlogImage className="article-cover" loading="eager" post={post} />
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

          <RichText text={sourceTranslationNote.body} />

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
            <section className="article-faq-section">
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

          {sourceTranslationNote.noteBody ? (
            <aside className="source-translation-note">
              <strong>{sourceTranslationNote.noteTitle}</strong>
              <RichText text={sourceTranslationNote.noteBody} />
            </aside>
          ) : null}

          {post.aiDisclosure ? (
            <aside className="ai-disclosure">
              <strong>{dictionary.disclosure}:</strong> {renderBrandText(post.aiDisclosure)}
            </aside>
          ) : null}

          {post.tags.length ? (
            <nav className="article-tag-strip" aria-label={dictionary.tags}>
              {post.tags.slice(0, 5).map((tag) => (
                <Link className="article-tag-chip" href={`${blogIndexPath(post.language)}?tag=${encodeURIComponent(tag)}`} key={tag}>
                  {tag}
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="article-author-card" aria-label={dictionary.authorLabel}>
            <span className="article-author-mark" aria-hidden="true">
              AL
            </span>
            <div>
              <h2>{dictionary.authorName}</h2>
              <p>{dictionary.authorBio}</p>
            </div>
          </section>

          {relatedPosts.length ? (
            <section className="related-articles">
              <div className="related-article-head">
                <h2>{dictionary.relatedTitle}</h2>
                <Link href={blogIndexPath(post.language)}>
                  {dictionary.relatedMore} <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <div className="related-article-grid">
                {relatedPosts.map((related) => (
                  <Link className="related-article-card" href={blogPostPath(related)} key={related.id}>
                    <span className="related-article-image" aria-hidden="true">
                      {related.cover ? (
                        <SafeBlogImage compact post={related} />
                      ) : (
                        <BlogEditorialVisual compact post={related} />
                      )}
                    </span>
                    <span className="related-article-eyebrow">
                      {[blogContentTypeLabel(related.contentType, related.language), related.newsCategory || related.tags[0]]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <strong>{renderBrandText(related.title)}</strong>
                    <small>{dictionary.readTime(related.readTimeMinutes)}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
