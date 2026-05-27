import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { blogIndexPath, blogPostPath, languageLabel } from "@/lib/blog-utils";
import { getPublishedBlogPostsByLanguage } from "@/lib/cms";
import { breadcrumbJsonLd } from "@/lib/seo";
import type { BlogLanguage } from "@/lib/types";

type BlogIndexProps = {
  language: BlogLanguage;
  tag?: string;
  query?: string;
};

const copy = {
  "zh-Hant": {
    eyebrow: "Insights · AI / SEO / GEO",
    title: "AI 實作與 GEO 策略筆記",
    description:
      "面向企業主、營運與行銷團隊的 AI 落地文章。每篇文章都包含 SEO 摘要、GEO 回答摘要、FAQ、來源與結構化資料。",
    featured: "Featured",
    all: "全部",
    read: "閱讀文章",
    updated: "更新",
    empty: "目前沒有符合條件的文章。",
    ctaTitle: "想把 AI 內容變成長期 SEO / GEO 引擎？",
    ctaBody: "ALTOS LAB 可以協助你建立網站、CMS、審稿流程、追蹤事件與 AI 草稿自動化。",
    cta: "預約合作討論",
    otherLanguage: "English"
  },
  en: {
    eyebrow: "Insights · AI / SEO / GEO",
    title: "AI implementation and GEO notes",
    description:
      "Practical articles for founders, operators and marketing teams building AI workflows, SEO foundations and generative search visibility.",
    featured: "Featured",
    all: "All",
    read: "Read article",
    updated: "Updated",
    empty: "No matching articles yet.",
    ctaTitle: "Want AI content to become a durable SEO / GEO engine?",
    ctaBody: "ALTOS LAB can help you build the site, CMS, review workflow, tracking events and AI draft automation.",
    cta: "Discuss a project",
    otherLanguage: "繁體中文"
  }
};

export async function BlogIndex({ language, tag, query }: BlogIndexProps) {
  const dictionary = copy[language];
  const posts = await getPublishedBlogPostsByLanguage(language);
  const normalizedTag = tag?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const matchesTag = normalizedTag ? post.tags.some((item) => item.toLowerCase() === normalizedTag) : true;
    const matchesQuery = normalizedQuery
      ? [post.title, post.excerpt, post.topic, post.geoSummary, post.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      : true;
    return matchesTag && matchesQuery;
  });
  const featured = filtered.find((post) => post.featured) || filtered[0];
  const rest = featured ? filtered.filter((post) => post.id !== featured.id) : filtered;
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).slice(0, 12);
  const otherLanguage = language === "en" ? "zh-Hant" : "en";

  return (
    <main className="blog-page blog-index-page">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Blog", url: blogIndexPath(language) }
        ])}
      />
      <header className="blog-index-hero">
        <div>
          <p className="eyebrow">{dictionary.eyebrow}</p>
          <h1>{dictionary.title}</h1>
          <p className="hero-copy">{dictionary.description}</p>
        </div>
        <div className="blog-language-switch">
          <Link className="button" href={blogIndexPath(otherLanguage)}>
            {dictionary.otherLanguage}
          </Link>
        </div>
      </header>

      <nav className="blog-filter-bar" aria-label="Blog topics">
        <Link className={`tag ${!normalizedTag ? "active" : ""}`} href={blogIndexPath(language)}>
          {dictionary.all}
        </Link>
        {tags.map((item) => (
          <Link
            className={`tag ${normalizedTag === item.toLowerCase() ? "active" : ""}`}
            href={`${blogIndexPath(language)}?tag=${encodeURIComponent(item)}`}
            key={item}
          >
            {item}
          </Link>
        ))}
      </nav>

      {featured ? (
        <article className="blog-featured">
          {featured.cover ? (
            <Link className="blog-featured-image" href={blogPostPath(featured)}>
              <img src={featured.cover} alt={featured.coverAlt || `${featured.title} cover`} loading="eager" />
            </Link>
          ) : null}
          <div className="blog-featured-body">
            <p className="eyebrow">
              {dictionary.featured} · {languageLabel(featured.language)} · {featured.readTimeMinutes} min
            </p>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <div className="article-meta">
              <span>
                {dictionary.updated} {new Date(featured.updatedAt).toLocaleDateString(language === "en" ? "en" : "zh-TW")}
              </span>
              <span>{featured.topic}</span>
            </div>
            <Link className="card-link" href={blogPostPath(featured)}>
              {dictionary.read}
            </Link>
          </div>
        </article>
      ) : (
        <p className="muted">{dictionary.empty}</p>
      )}

      <div className="blog-grid blog-index-grid">
        {rest.map((post) => (
          <article className="blog-card" key={post.id}>
            {post.cover ? (
              <Link className="blog-image" href={blogPostPath(post)}>
                <img src={post.cover} alt={post.coverAlt || `${post.title} cover`} loading="lazy" />
              </Link>
            ) : null}
            <div className="blog-body">
              <p className="eyebrow">
                {post.tags.slice(0, 3).join(" / ")} · {post.readTimeMinutes} min
              </p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <Link className="card-link" href={blogPostPath(post)}>
                {dictionary.read}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="blog-cta-panel">
        <div>
          <p className="eyebrow">ALTOS LAB</p>
          <h2>{dictionary.ctaTitle}</h2>
          <p>{dictionary.ctaBody}</p>
        </div>
        <Link className="button primary" href="/#contact">
          {dictionary.cta}
        </Link>
      </section>
    </main>
  );
}
