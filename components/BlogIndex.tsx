import Link from "next/link";
import { renderBrandText } from "@/components/BrandText";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { blogIndexPath, blogPostPath } from "@/lib/blog-utils";
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
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Thoughts on the future of work, from the people and teams creating it.",
    labTitle: "我們研究、建造，然後把經驗發布成可引用的知識。",
    labBody:
      "部落格服務的是整個實驗室定位：從 AI 系統設計、企業流程、內容與搜尋，到每天可落地的產品實驗。",
    lanes: [
      { label: "AI Products", body: "產品化、MVP、使用者流程與交付經驗" },
      { label: "Agents & Automation", body: "AI Agent、工作流、知識庫與營運自動化" },
      { label: "Search & GEO", body: "SEO 基礎、生成式搜尋、內容可引用性" },
      { label: "Build Notes", body: "案例拆解、架構取捨、工具與市場觀察" }
    ],
    featured: "主打文章",
    visualContext: "文章圖片",
    latest: "最新文章",
    categories: "文章分類",
    categoriesHint: "用主題快速找到你想看的方向。",
    startHere: "先從這篇開始",
    postsLabel: "篇文章",
    topicsLabel: "個主題",
    all: "全部",
    read: "閱讀文章",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    empty: "目前沒有符合條件的文章。",
    ctaTitle: "想把 AI 實驗變成可以營運的系統？",
    ctaBody: "ALTOS LAB 可以協助你把 AI 產品、內部流程、內容系統、後台 CMS、追蹤事件與自動化發佈流程接成一套可維護的能力。",
    cta: "預約合作討論",
    otherLanguage: "English",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 實作、工具與產品筆記。",
    sidebarTopics: ["Latest", "Notion HQ", "For Teams", "Inspiration", "Builders", "Pioneers", "Tech", "Mail", "First Block"]
  },
  en: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Thoughts on the future of work, from the people and teams creating it.",
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
    visualContext: "Article image",
    latest: "Latest Articles",
    categories: "Categories",
    categoriesHint: "Find the right reading lane by topic.",
    startHere: "Start here",
    postsLabel: "posts",
    topicsLabel: "topics",
    all: "All",
    read: "Read article",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    empty: "No matching articles yet.",
    ctaTitle: "Want to turn AI experiments into operating systems?",
    ctaBody:
      "ALTOS LAB can wire AI products, internal workflows, content systems, CMS operations, tracking events and publishing automation into one maintainable capability.",
    cta: "Discuss a project",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "How we build AI systems, product by product.",
    sidebarTopics: ["Latest", "Notion HQ", "For Teams", "Inspiration", "Builders", "Pioneers", "Tech", "Mail", "First Block"]
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
  const otherLanguage = language === "en" ? "zh-Hant" : "en";

  return (
    <div className="site-home blog-site-shell">
      <SiteHeader />
      <main className="blog-page blog-index-page blog-craft-index">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: blogIndexPath(language) }
          ])}
        />
        <div className="blog-craft-layout">
          <aside className="blog-craft-sidebar" aria-label="Blog navigation">
            <div className="blog-craft-brand">
              <h1>
                <span>{dictionary.brandTitle}</span>
                <em>{dictionary.brandScript}</em>
              </h1>
              <p>{dictionary.description}</p>
            </div>

            <nav className="blog-craft-nav" aria-label="Blog topics">
              {dictionary.sidebarTopics.map((item) => (
                <Link
                  className={normalizedTag === item.toLowerCase() || (!normalizedTag && item === "Tech") ? "active" : ""}
                  href={item === "Latest" ? blogIndexPath(language) : `${blogIndexPath(language)}?tag=${encodeURIComponent(item)}`}
                  key={item}
                >
                  {item}
                </Link>
              ))}
            </nav>

            <div className="blog-craft-sidebar-footer">
              <span>
                <strong>{posts.length}</strong> {dictionary.postsLabel}
              </span>
              <Link href={blogIndexPath(otherLanguage)}>{dictionary.otherLanguage}</Link>
            </div>
          </aside>

          <section className="blog-craft-feed" aria-label="Blog posts">
            <div className="blog-craft-feed-top">
              <div>
                <p className="eyebrow">{normalizedTag ? dictionary.categories : dictionary.latest}</p>
                <h2>
                  <span>{normalizedTag ? tag : dictionary.mobileTopicTitle}</span>
                  <em>— {dictionary.mobileTopicDescription}</em>
                </h2>
              </div>
            </div>

            <div className="blog-craft-grid">
              {filtered.map((post) => (
                <article className="blog-craft-card" key={post.id}>
                  {post.cover ? (
                    <Link className="blog-craft-card-image" href={blogPostPath(post)}>
                      <img src={post.cover} alt={post.coverAlt || `${post.title} cover`} loading="lazy" />
                    </Link>
                  ) : null}
                  <div className="blog-craft-card-body">
                    <h3>
                      <Link href={blogPostPath(post)}>{renderBrandText(post.title)}</Link>
                    </h3>
                    <p>{renderBrandText(post.excerpt)}</p>
                    <div className="blog-craft-card-meta">
                      <span aria-hidden="true">AL</span>
                      <div>
                        <strong>{renderBrandText(post.author)}</strong>
                        <small>
                          {post.tags.slice(0, 2).join(" / ")} · {dictionary.readTime(post.readTimeMinutes)}
                        </small>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!filtered.length ? <p className="muted">{dictionary.empty}</p> : null}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
