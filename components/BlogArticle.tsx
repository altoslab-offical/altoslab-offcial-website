import Link from "next/link";
import { Fragment } from "react";
import { AnalyticsEvent } from "@/components/AnalyticsEvents";
import { BlogAdSlot } from "@/components/BlogAdSlot";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import { renderBrandText } from "@/components/BrandText";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { SafeBlogImage } from "@/components/SafeBlogImage";
import { SafeBlogInlineImage } from "@/components/SafeBlogInlineImage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  blogAuthorForPost,
  blogAuthorInitials,
  blogAuthorProfile,
  publicCoverCreditForPost,
  publicEditorialReviewNote
} from "@/lib/blog-authors";
import { blogContentTypeLabel, blogIndexPath, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { toBlogVisualPost } from "@/lib/blog-visual";
import { isCloudflareKvConfigured } from "@/lib/cloudflare-kv";
import { getRelatedPublishedBlogPosts } from "@/lib/cms";
import { getBlogAdSlotConfig } from "@/lib/blog-adsense";
import { publicTaxonomyLabel, publicTaxonomyLabels } from "@/lib/public-taxonomy";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import type { BlogInlineImage, BlogPost } from "@/lib/types";

const copy = {
  "zh-Hant": {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    geoSummary: "重點摘要",
    takeaways: "本文重點",
    faq: "讀者會追問的事",
    sources: "來源與參考",
    related: "延伸閱讀",
    relatedTitle: "Keep reading",
    relatedMore: "查看全部",
    disclosure: "編輯審核",
    tags: "文章標籤",
    authorLabel: "作者"
  },
  en: {
    back: "← Blog",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    geoSummary: "TL;DR",
    takeaways: "Key Takeaways",
    faq: "Questions readers should ask",
    sources: "Sources",
    related: "Related reading",
    relatedTitle: "Keep reading",
    relatedMore: "View all",
    disclosure: "Editorial review",
    tags: "Article tags",
    authorLabel: "Author"
  },
  ja: {
    back: "← Blog",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分で読めます`,
    geoSummary: "要約",
    takeaways: "要点",
    faq: "読後に確認したいこと",
    sources: "出典",
    related: "関連記事",
    relatedTitle: "Keep reading",
    relatedMore: "すべて見る",
    disclosure: "編集レビュー",
    tags: "記事タグ",
    authorLabel: "著者"
  },
  ko: {
    back: "← Blog",
    updated: "업데이트",
    readTime: (minutes: number) => `${minutes}분 읽기`,
    geoSummary: "핵심 요약",
    takeaways: "핵심 포인트",
    faq: "읽은 뒤 확인할 질문",
    sources: "출처",
    related: "관련 글",
    relatedTitle: "Keep reading",
    relatedMore: "전체 보기",
    disclosure: "편집 검토",
    tags: "글 태그",
    authorLabel: "작성자"
  },
  id: {
    back: "← Blog",
    updated: "Diperbarui",
    readTime: (minutes: number) => `${minutes} menit baca`,
    geoSummary: "Ringkasan",
    takeaways: "Poin Utama",
    faq: "Pertanyaan sebelum bertindak",
    sources: "Sumber dan Rujukan",
    related: "Bacaan terkait",
    relatedTitle: "Keep reading",
    relatedMore: "Lihat semua",
    disclosure: "Tinjauan editor",
    tags: "Tag artikel",
    authorLabel: "Penulis"
  },
  vi: {
    back: "← Blog",
    updated: "Cập nhật",
    readTime: (minutes: number) => `${minutes} phút đọc`,
    geoSummary: "Tóm tắt nhanh",
    takeaways: "Ý chính",
    faq: "Câu hỏi trước khi hành động",
    sources: "Nguồn tham khảo",
    related: "Bài liên quan",
    relatedTitle: "Keep reading",
    relatedMore: "Xem tất cả",
    disclosure: "Biên tập kiểm duyệt",
    tags: "Thẻ bài viết",
    authorLabel: "Tác giả"
  },
  th: {
    back: "← Blog",
    updated: "อัปเดต",
    readTime: (minutes: number) => `อ่าน ${minutes} นาที`,
    geoSummary: "สรุปสั้น",
    takeaways: "ประเด็นสำคัญ",
    faq: "คำถามก่อนลงมือ",
    sources: "แหล่งอ้างอิง",
    related: "บทความที่เกี่ยวข้อง",
    relatedTitle: "Keep reading",
    relatedMore: "ดูทั้งหมด",
    disclosure: "ตรวจทานโดยบรรณาธิการ",
    tags: "แท็กบทความ",
    authorLabel: "ผู้เขียน"
  },
  ms: {
    back: "← Blog",
    updated: "Dikemas kini",
    readTime: (minutes: number) => `${minutes} minit bacaan`,
    geoSummary: "Ringkasan",
    takeaways: "Isi Utama",
    faq: "Soalan sebelum bertindak",
    sources: "Sumber dan Rujukan",
    related: "Bacaan berkaitan",
    relatedTitle: "Keep reading",
    relatedMore: "Lihat semua",
    disclosure: "Semakan editorial",
    tags: "Tag artikel",
    authorLabel: "Penulis"
  },
  fil: {
    back: "← Blog",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    geoSummary: "Quick summary",
    takeaways: "Key Points",
    faq: "Mga tanong bago kumilos",
    sources: "Sources",
    related: "Related reading",
    relatedTitle: "Keep reading",
    relatedMore: "View all",
    disclosure: "Editorial review",
    tags: "Article tags",
    authorLabel: "Author"
  }
};

function coverImageLabel(language: BlogPost["language"]) {
  if (language === "zh-Hant") return "圖片來源：";
  if (language === "ja") return "画像出典：";
  if (language === "ko") return "이미지 출처:";
  if (language === "id") return "Sumber gambar:";
  if (language === "vi") return "Nguồn ảnh:";
  if (language === "th") return "ที่มาภาพ:";
  if (language === "ms") return "Sumber imej:";
  if (language === "fil") return "Source ng larawan:";
  return "Image source:";
}

function articleTaxonomy(post: BlogPost) {
  const seen = new Set<string>();
  const typeLabel = blogContentTypeLabel(post.contentType, post.language).toLowerCase();
  const taxonomyParts = [post.newsCategory || "", ...post.tags.slice(0, 3)]
    .flatMap((item) => item.split(/[／/]/g))
    .map((item) => item.trim())
    .filter(Boolean);

  return publicTaxonomyLabels(taxonomyParts, post.language)
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
  "출처와 번역 메모",
  "Sumber dan catatan terjemahan",
  "Nguồn và ghi chú bản dịch",
  "แหล่งที่มาและบันทึกการแปล",
  "Sumber dan nota terjemahan",
  "Source and localization note"
]);

const inlineFaqHeadings = new Set([
  "常見問題",
  "FAQ",
  "よくある質問",
  "자주 묻는 질문",
  "Pertanyaan Umum",
  "Câu hỏi thường gặp",
  "คำถามที่พบบ่อย",
  "Soalan Lazim"
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

function removeInlineFaqSection(body: string) {
  const lines = body.split("\n");
  const headingIndex = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    return Boolean(match?.[1] && inlineFaqHeadings.has(match[1].trim()));
  });

  if (headingIndex < 0) return body;

  const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line.trim()));
  const endIndex = nextHeadingIndex < 0 ? lines.length : nextHeadingIndex;
  return [...lines.slice(0, headingIndex), ...lines.slice(endIndex)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function formatSourceDate(value: string | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(locale);
}

function splitArticleSections(body: string) {
  const lines = body.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line) && current.join("\n").trim()) {
      sections.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.join("\n").trim()) sections.push(current.join("\n").trim());
  if (sections.length > 1) return sections;

  const paragraphSections = body
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  return paragraphSections.length > 1 ? paragraphSections : sections.length ? sections : [body];
}

function contentImageIndex(image: BlogInlineImage, imageIndex: number, sectionCount: number, imageCount: number) {
  const lastSectionIndex = Math.max(0, sectionCount - 1);
  if (image.placement === "after-lead") return 0;
  if (image.placement === "before-faq") return lastSectionIndex;
  if (image.placement === "mid-article") {
    if (imageCount > 1 && sectionCount > 2) {
      const ratio = (imageIndex + 1) / (imageCount + 1);
      return Math.max(1, Math.min(lastSectionIndex, Math.round(lastSectionIndex * ratio)));
    }
    return Math.max(0, Math.floor(sectionCount / 2));
  }
  if (imageIndex === 0) return 0;
  if (imageIndex === 1) return Math.max(0, Math.floor(sectionCount / 2));
  return lastSectionIndex;
}

function ArticleInlineImage({ image }: { image: BlogInlineImage }) {
  if (!image.url) return null;
  const aspectRatio = image.aspectRatio === "square" || image.aspectRatio === "portrait" ? image.aspectRatio : "wide";
  const credit = image.credit || (image.source === "generated" ? "ALTOS LAB editorial visual" : "");
  return (
    <figure className={`article-inline-figure is-${aspectRatio}`}>
      <SafeBlogInlineImage image={image} />
      {image.caption || credit ? (
        <figcaption>
          {image.caption ? <span>{renderBrandText(image.caption)}</span> : null}
          {credit ? (
            <>
              {image.caption ? " " : ""}
              <span className="article-inline-credit">
                {image.creditUrl ? (
                  <a href={image.creditUrl} target="_blank" rel="noreferrer">
                    {renderBrandText(credit)}
                  </a>
                ) : (
                  renderBrandText(credit)
                )}
                {image.license ? <> · {image.license}</> : null}
              </span>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function normalizeImageMarker(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

const markerPlacementAliases: Record<string, string[]> = {
  opening: ["opening", "after-lead", "lead", "intro"],
  mechanism: ["mechanism", "mid-article", "middle", "evidence"],
  synthesis: ["synthesis", "before-faq", "closing", "close"]
};

function stripImageMarkers(text: string) {
  return text.replace(/\[IMAGE:[^\]]+\]/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

function imageMatchesMarker(image: BlogInlineImage, imageIndex: number, marker: string) {
  const normalizedMarker = normalizeImageMarker(marker);
  const placement = normalizeImageMarker(image.placement);
  const candidates = new Set([normalizedMarker, ...(markerPlacementAliases[normalizedMarker] || [])]);
  if (placement && candidates.has(placement)) return true;
  if (normalizedMarker === "opening" && imageIndex === 0) return true;
  if (normalizedMarker === "mechanism" && imageIndex === 1) return true;
  if (normalizedMarker === "synthesis" && imageIndex === 2) return true;
  return false;
}

function ArticleBodyWithImages({ text, images }: { text: string; images: BlogInlineImage[] }) {
  const validImages = images.filter((image) => image.url && image.alt).slice(0, 3);
  const midArticleAd = getBlogAdSlotConfig("mid-article");

  if (!validImages.length) {
    if (!midArticleAd) return <RichText text={stripImageMarkers(text)} />;

    const sections = splitArticleSections(stripImageMarkers(text));
    const adAfterSectionIndex = Math.max(0, Math.floor((sections.length - 1) / 2));
    return (
      <div className="article-body-with-images">
        {sections.map((section, sectionIndex) => (
          <Fragment key={`${sectionIndex}-${section.slice(0, 24)}`}>
            <RichText text={section} />
            {sectionIndex === adAfterSectionIndex ? <BlogAdSlot placement="mid-article" /> : null}
          </Fragment>
        ))}
      </div>
    );
  }

  const markerRegex = /\[IMAGE:([a-z0-9_-]+)\]/gi;
  const hasExplicitMarkers = markerRegex.test(text);
  markerRegex.lastIndex = 0;

  if (hasExplicitMarkers) {
    const usedImageIndexes = new Set<number>();
    const parts: Array<{ kind: "text"; text: string } | { kind: "image"; image: BlogInlineImage }> = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = markerRegex.exec(text))) {
      const before = text.slice(cursor, match.index).replace(/\n{3,}/g, "\n\n").trim();
      if (before) parts.push({ kind: "text", text: before });

      const marker = match[1];
      const matchedIndex = validImages.findIndex((image, index) => !usedImageIndexes.has(index) && imageMatchesMarker(image, index, marker));
      if (matchedIndex >= 0) {
        usedImageIndexes.add(matchedIndex);
        parts.push({ kind: "image", image: validImages[matchedIndex] });
      }
      cursor = markerRegex.lastIndex;
    }

    const after = text.slice(cursor).replace(/\n{3,}/g, "\n\n").trim();
    if (after) parts.push({ kind: "text", text: after });

    validImages.forEach((image, index) => {
      if (!usedImageIndexes.has(index)) parts.push({ kind: "image", image });
    });

    const adAfterPartIndex = Math.max(0, Math.floor((parts.length - 1) / 2));
    return (
      <div className="article-body-with-images">
        {parts.map((part, index) => (
          <Fragment key={part.kind === "image" ? `${part.image.url}-${index}` : `${index}-${part.text.slice(0, 24)}`}>
            {part.kind === "image" ? <ArticleInlineImage image={part.image} /> : <RichText text={part.text} />}
            {midArticleAd && index === adAfterPartIndex ? <BlogAdSlot placement="mid-article" /> : null}
          </Fragment>
        ))}
      </div>
    );
  }

  const sections = splitArticleSections(text);
  const adAfterSectionIndex = Math.max(0, Math.floor((sections.length - 1) / 2));
  const buckets = new Map<number, BlogInlineImage[]>();
  validImages.forEach((image, index) => {
    const sectionIndex = contentImageIndex(image, index, sections.length, validImages.length);
    buckets.set(sectionIndex, [...(buckets.get(sectionIndex) || []), image]);
  });

  return (
    <div className="article-body-with-images">
      {sections.map((section, sectionIndex) => (
        <Fragment key={`${sectionIndex}-${section.slice(0, 24)}`}>
          <RichText text={section} />
          {(buckets.get(sectionIndex) || []).map((image, imageIndex) => (
            <ArticleInlineImage image={image} key={`${image.url}-${imageIndex}`} />
          ))}
          {midArticleAd && sectionIndex === adAfterSectionIndex ? <BlogAdSlot placement="mid-article" /> : null}
        </Fragment>
      ))}
    </div>
  );
}

export async function BlogArticle({ post }: { post: BlogPost }) {
  const lightweightCloudflareRender = isCloudflareKvConfigured();
  const dictionary = copy[post.language];
  const taxonomy = articleTaxonomy(post);
  const sourceTranslationNote = extractSourceTranslationNote(post.body);
  const articleBody = post.faqs.length ? removeInlineFaqSection(sourceTranslationNote.body) : sourceTranslationNote.body;
  const relatedPosts = lightweightCloudflareRender ? [] : await getRelatedPublishedBlogPosts(post, 3);
  const locale = post.language === "en" ? "en" : "zh-TW";
  const author = blogAuthorForPost(post);
  const authorProfile = blogAuthorProfile(author, post.language);
  const publicCoverCredit = publicCoverCreditForPost(post);
  const editorialReviewNote = publicEditorialReviewNote(post.language);
  const coverPost = toBlogVisualPost(post);

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
        {lightweightCloudflareRender ? null : (
          <>
            <JsonLd data={articleJsonLd(post)} />
            <JsonLd data={faqJsonLd(post)} />
            <JsonLd
              data={breadcrumbJsonLd([
                { name: "Home", url: "/" },
                { name: "Blog", url: blogIndexPath(post.language) },
                { name: post.title, url: blogPostPath(post) }
              ])}
            />
          </>
        )}
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
                <SafeBlogImage className="article-cover" fetchPriority="high" loading="eager" post={coverPost} />
                {publicCoverCredit ? (
                  <p className="article-cover-credit">
                    {coverImageLabel(post.language)}{" "}
                    {post.coverCreditUrl ? (
                      <a href={post.coverCreditUrl} target="_blank" rel="noreferrer">
                        {renderBrandText(publicCoverCredit)}
                      </a>
                    ) : (
                      renderBrandText(publicCoverCredit)
                    )}
                  </p>
                ) : null}
              </>
            ) : (
              <BlogEditorialVisual post={coverPost} />
            )}
          </header>

          <aside className="geo-summary">
            <strong>{dictionary.geoSummary}:</strong> {renderBrandText(post.geoSummary)}
          </aside>

          <BlogAdSlot placement="after-summary" />

          {post.keyTakeaways.length ? (
            <section className="project-detail-card article-takeaways">
              <p className="eyebrow">{dictionary.takeaways}</p>
              <ul>
                {post.keyTakeaways.map((item) => (
                  <li key={item}>
                    <span className="takeaway-text">{renderBrandText(item)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ArticleBodyWithImages images={post.contentImages || []} text={articleBody} />

          {post.sourceLinks.length ? (
            <section className="source-list">
              <p className="eyebrow">{dictionary.sources}</p>
              <ul>
                {post.sourceLinks.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {renderBrandText(source.title)}
                    </a>
                    <span className="source-meta">
                      {source.publisher ? <> · {renderBrandText(source.publisher)}</> : null}
                      {formatSourceDate(source.publishedAt, locale) ? <> · {formatSourceDate(source.publishedAt, locale)}</> : null}
                    </span>
                    {source.summary ? <p className="source-summary">{renderBrandText(source.summary)}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {post.faqs.length ? (
            <section className="article-faq-section">
              <p className="eyebrow">Q&A</p>
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

          {post.aiDisclosure || post.generatedBy ? (
            <aside className="ai-disclosure">
              <strong>{dictionary.disclosure}:</strong> {renderBrandText(editorialReviewNote)}
            </aside>
          ) : null}

          {post.tags.length ? (
            <nav className="article-tag-strip" aria-label={dictionary.tags}>
              {publicTaxonomyLabels(post.tags.slice(0, 5), post.language).map((tag) => (
                <Link className="article-tag-chip" href={`${blogIndexPath(post.language)}?tag=${encodeURIComponent(tag)}`} key={tag}>
                  {tag}
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="article-author-card" aria-label={dictionary.authorLabel}>
            <span className="article-author-mark" aria-hidden="true">
              {authorProfile.avatar ? <img src={authorProfile.avatar} alt="" loading="lazy" /> : blogAuthorInitials(author)}
            </span>
            <div>
              <h2>{authorProfile.name}</h2>
              <p>{authorProfile.bio}</p>
            </div>
          </section>

          <BlogAdSlot placement="before-related" />

          {relatedPosts.length ? (
            <section className="related-articles">
              <div className="related-article-head">
                <h2>{dictionary.relatedTitle}</h2>
                <Link href={blogIndexPath(post.language)}>
                  {dictionary.relatedMore} <span aria-hidden="true">↗</span>
                </Link>
              </div>
              <div className="related-article-grid">
                {relatedPosts.map((related) => {
                  const relatedVisualPost = toBlogVisualPost(related);
                  return (
                    <Link className="related-article-card" href={blogPostPath(related)} key={related.id}>
                      <span className="related-article-image" aria-hidden="true">
                        {related.cover ? (
                          <SafeBlogImage compact post={relatedVisualPost} />
                        ) : (
                          <BlogEditorialVisual compact post={relatedVisualPost} />
                        )}
                      </span>
                      <span className="related-article-eyebrow">
                        {[blogContentTypeLabel(related.contentType, related.language), related.newsCategory || related.tags[0]]
                          .map((item) => publicTaxonomyLabel(item, related.language))
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <strong>{renderBrandText(related.title)}</strong>
                      <small>{dictionary.readTime(related.readTimeMinutes)}</small>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
