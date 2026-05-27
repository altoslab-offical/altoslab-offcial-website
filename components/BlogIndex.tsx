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
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI 實驗室筆記",
    description:
      "這裡不是單一 SEO / GEO 產品頁，而是 ALTOS LAB 將 AI 產品、Agent、自動化、搜尋能見度與實作案例整理成可被閱讀、引用與追蹤的研究出版中心。",
    labTitle: "我們研究、建造，然後把經驗發布成可引用的知識。",
    labBody:
      "部落格服務的是整個實驗室定位：從 AI 系統設計、企業流程、內容與搜尋，到每天可落地的產品實驗。",
    lanes: [
      { label: "AI Products", body: "產品化、MVP、使用者流程與交付經驗" },
      { label: "Agents & Automation", body: "AI Agent、工作流、知識庫與營運自動化" },
      { label: "Search & GEO", body: "SEO 基礎、生成式搜尋、內容可引用性" },
      { label: "Build Notes", body: "案例拆解、架構取捨、工具與市場觀察" }
    ],
    featured: "Featured",
    visualContext: "文章主視覺",
    all: "全部",
    read: "閱讀文章",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    empty: "目前沒有符合條件的文章。",
    ctaTitle: "想把 AI 實驗變成可以營運的系統？",
    ctaBody: "ALTOS LAB 可以協助你把 AI 產品、內部流程、內容系統、後台 CMS、追蹤事件與自動化發佈流程接成一套可維護的能力。",
    cta: "預約合作討論",
    otherLanguage: "English"
  },
  en: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    description:
      "This is not a single SEO or GEO product page. It is ALTOS LAB's publication hub for AI products, agents, automation, search visibility and field notes that can be read, cited and measured.",
    labTitle: "We research, build, and publish what becomes reusable intelligence.",
    labBody:
      "The journal serves the full lab: AI system design, enterprise workflows, content, search visibility and product experiments that can ship.",
    lanes: [
      { label: "AI Products", body: "Productization, MVPs, user flows and delivery lessons" },
      { label: "Agents & Automation", body: "AI agents, workflows, knowledge bases and operations" },
      { label: "Search & GEO", body: "SEO foundations, generative search and citation design" },
      { label: "Build Notes", body: "Case breakdowns, architecture tradeoffs, tools and markets" }
    ],
    featured: "Featured",
    visualContext: "Article visual context",
    all: "All",
    read: "Read article",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    empty: "No matching articles yet.",
    ctaTitle: "Want to turn AI experiments into operating systems?",
    ctaBody:
      "ALTOS LAB can wire AI products, internal workflows, content systems, CMS operations, tracking events and publishing automation into one maintainable capability.",
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
        <div className="blog-hero-copy-stack">
          <p className="eyebrow">{dictionary.eyebrow}</p>
          <h1>{dictionary.title}</h1>
          <p className="hero-copy">{dictionary.description}</p>
          <div className="blog-hero-actions">
            <Link className="button primary" href="/#contact">
              {dictionary.cta}
            </Link>
            <Link className="button" href={blogIndexPath(otherLanguage)}>
              {dictionary.otherLanguage}
            </Link>
          </div>
        </div>
        <aside className="blog-lab-card" aria-label="ALTOS LAB journal scope">
          <p className="eyebrow">ALTOS LAB</p>
          <h2>{dictionary.labTitle}</h2>
          <p>{dictionary.labBody}</p>
          <div className="blog-lab-lanes">
            {dictionary.lanes.map((lane) => (
              <div key={lane.label}>
                <span>{lane.label}</span>
                <p>{lane.body}</p>
              </div>
            ))}
          </div>
        </aside>
      </header>

      <section className="blog-lane-strip" aria-label="ALTOS LAB content lanes">
        {dictionary.lanes.map((lane, index) => (
          <article className="blog-lane-item" key={lane.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{lane.label}</strong>
            <p>{lane.body}</p>
          </article>
        ))}
      </section>

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
          <div className="blog-featured-body">
            <p className="eyebrow">
              {dictionary.featured} · {languageLabel(featured.language)} · {dictionary.readTime(featured.readTimeMinutes)}
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
          {featured.cover ? (
            <Link className="blog-featured-image" href={blogPostPath(featured)}>
              <img src={featured.cover} alt={featured.coverAlt || `${featured.title} cover`} loading="eager" />
              <span className="blog-image-caption">
                <small>{dictionary.visualContext}</small>
                <strong>{featured.coverAlt || featured.topic}</strong>
              </span>
            </Link>
          ) : null}
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
                {post.tags.slice(0, 3).join(" / ")} · {dictionary.readTime(post.readTimeMinutes)}
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
