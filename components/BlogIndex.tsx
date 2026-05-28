import Link from "next/link";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import { renderBrandText } from "@/components/BrandText";
import { JsonLd } from "@/components/JsonLd";
import { SafeBlogImage } from "@/components/SafeBlogImage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BLOG_LANGUAGES, blogIndexPath, blogPostPath, languageShortLabel } from "@/lib/blog-utils";
import { getPublishedBlogPostsByLanguage } from "@/lib/cms";
import { blogIndexItemListJsonLd, breadcrumbJsonLd } from "@/lib/seo";
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
    searchLabel: "搜尋文章",
    searchPlaceholder: "搜尋 AI、Agent、GEO...",
    searchSubmit: "搜尋",
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
    sidebarTopics: ["Latest", "Breaking", "Column", "Feature", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
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
    searchLabel: "Search articles",
    searchPlaceholder: "Search AI, agents, GEO...",
    searchSubmit: "Search",
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
    sidebarTopics: ["Latest", "Breaking", "Column", "Feature", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  ja: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "AI を研究し、作り、運用へ落とし込むための実験室ノート。",
    labTitle: "私たちは研究し、作り、その学びを引用できる知識として公開します。",
    labBody:
      "このジャーナルは、AI システム設計、企業ワークフロー、コンテンツ、検索可視性、出荷できるプロダクト実験を扱います。",
    lanes: [
      { label: "AI Products", body: "プロダクト化、MVP、ユーザーフロー、納品の学び" },
      { label: "Agents & Automation", body: "AI Agent、ワークフロー、ナレッジベース、運用自動化" },
      { label: "Search & GEO", body: "SEO 基礎、生成 AI 検索、引用される構造" },
      { label: "Build Notes", body: "事例分解、設計判断、ツール、市場観測" }
    ],
    featured: "注目記事",
    visualContext: "記事画像",
    latest: "最新記事",
    categories: "カテゴリー",
    categoriesHint: "読みたいテーマをすばやく探せます。",
    startHere: "まずはこちら",
    postsLabel: "記事",
    topicsLabel: "テーマ",
    searchLabel: "記事を検索",
    searchPlaceholder: "AI、Agent、GEO を検索...",
    searchSubmit: "検索",
    all: "すべて",
    read: "読む",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分で読めます`,
    empty: "該当する記事はまだありません。",
    ctaTitle: "AI 実験を運用できるシステムに変えたいですか？",
    ctaBody:
      "ALTOS LAB は AI プロダクト、社内ワークフロー、CMS、計測、自動公開フローを一つの運用能力として接続します。",
    cta: "相談する",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 実装、ツール、プロダクトのノート。",
    sidebarTopics: ["Latest", "Breaking", "Column", "Feature", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  ko: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "AI를 연구하고 만들고 운영으로 옮기는 실험실 노트.",
    labTitle: "우리는 연구하고 만들며, 그 경험을 인용 가능한 지식으로 공개합니다.",
    labBody:
      "이 저널은 AI 시스템 설계, 기업 워크플로, 콘텐츠, 검색 가시성, 출시 가능한 제품 실험을 다룹니다.",
    lanes: [
      { label: "AI Products", body: "제품화, MVP, 사용자 흐름, 실행 경험" },
      { label: "Agents & Automation", body: "AI Agent, 워크플로, 지식베이스, 운영 자동화" },
      { label: "Search & GEO", body: "SEO 기초, 생성형 검색, 인용 가능한 콘텐츠 구조" },
      { label: "Build Notes", body: "사례 분석, 아키텍처 판단, 도구와 시장 관찰" }
    ],
    featured: "추천 글",
    visualContext: "글 이미지",
    latest: "최신 글",
    categories: "카테고리",
    categoriesHint: "관심 있는 주제를 빠르게 찾을 수 있습니다.",
    startHere: "여기서 시작",
    postsLabel: "글",
    topicsLabel: "주제",
    searchLabel: "글 검색",
    searchPlaceholder: "AI, Agent, GEO 검색...",
    searchSubmit: "검색",
    all: "전체",
    read: "읽기",
    updated: "업데이트",
    readTime: (minutes: number) => `${minutes}분 읽기`,
    empty: "조건에 맞는 글이 아직 없습니다.",
    ctaTitle: "AI 실험을 운영 가능한 시스템으로 바꾸고 싶나요?",
    ctaBody:
      "ALTOS LAB은 AI 제품, 내부 워크플로, CMS, 추적 이벤트, 자동 발행 흐름을 유지 가능한 운영 능력으로 연결합니다.",
    cta: "상담하기",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 구현, 도구, 제품 노트.",
    sidebarTopics: ["Latest", "Breaking", "Column", "Feature", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  }
};

const topicAliases: Record<string, string[]> = {
  latest: [],
  breaking: ["breaking", "快訊", "速報", "속보"],
  column: ["column", "專欄", "コラム", "칼럼"],
  feature: ["feature", "專題", "特集", "기획"],
  "ai trends": ["ai trends", "ai 趨勢", "aiトレンド", "ai 트렌드", "ai 平台趨勢"],
  agents: ["agent", "agents", "ai agent", "エージェント", "에이전트"],
  automation: ["automation", "自動化", "자동화"],
  geo: ["geo", "seo", "搜尋", "検索", "검색"],
  "build notes": ["build notes", "build", "case", "案例", "構築", "빌드"]
};

function matchesTopic(post: Awaited<ReturnType<typeof getPublishedBlogPostsByLanguage>>[number], item: string) {
  const key = item.toLowerCase();
  if (key === "latest") return true;
  const aliases = topicAliases[key] || [key];
  const haystack = [post.contentType, post.newsCategory, post.topic, ...post.tags].join(" ").toLowerCase();
  return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

export async function BlogIndex({ language, tag, query }: BlogIndexProps) {
  const dictionary = copy[language];
  const posts = await getPublishedBlogPostsByLanguage(language);
  const normalizedTag = tag?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();
  const filtered = posts.filter((post) => {
    const matchesTag = normalizedTag ? matchesTopic(post, tag || "") : true;
    const matchesQuery = normalizedQuery
      ? [post.title, post.excerpt, post.topic, post.geoSummary, post.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      : true;
    return matchesTag && matchesQuery;
  });

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
        <JsonLd data={blogIndexItemListJsonLd(filtered, blogIndexPath(language), dictionary.title)} />
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
                  className={normalizedTag === item.toLowerCase() || (!normalizedTag && item === "Latest") ? "active" : ""}
                  href={item === "Latest" ? blogIndexPath(language) : `${blogIndexPath(language)}?tag=${encodeURIComponent(item)}`}
                  key={item}
                >
                  {item}
                </Link>
              ))}
            </nav>

            <form className="blog-craft-search blog-craft-search-sidebar" action={blogIndexPath(language)} role="search">
              {normalizedTag ? <input type="hidden" name="tag" value={tag} /> : null}
              <label className="sr-only" htmlFor={`blog-search-sidebar-${language}`}>
                {dictionary.searchLabel}
              </label>
              <input
                id={`blog-search-sidebar-${language}`}
                name="query"
                type="search"
                defaultValue={query || ""}
                placeholder={dictionary.searchPlaceholder}
                autoComplete="off"
              />
              <button type="submit">{dictionary.searchSubmit}</button>
            </form>

            <div className="blog-craft-sidebar-footer">
              <span>
                <strong>{posts.length}</strong> {dictionary.postsLabel}
              </span>
              <span className="blog-language-links">
                {BLOG_LANGUAGES.filter((item) => item !== language).map((item) => (
                  <Link href={blogIndexPath(item)} key={item}>
                    {languageShortLabel(item)}
                  </Link>
                ))}
              </span>
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
              <form className="blog-craft-search" action={blogIndexPath(language)} role="search">
                {normalizedTag ? <input type="hidden" name="tag" value={tag} /> : null}
                <label className="sr-only" htmlFor={`blog-search-${language}`}>
                  {dictionary.searchLabel}
                </label>
                <input
                  id={`blog-search-${language}`}
                  name="query"
                  type="search"
                  defaultValue={query || ""}
                  placeholder={dictionary.searchPlaceholder}
                  autoComplete="off"
                />
                <button type="submit">{dictionary.searchSubmit}</button>
              </form>
            </div>

            <div className="blog-craft-grid">
              {filtered.map((post) => (
                <article className="blog-craft-card" key={post.id}>
                  <Link className="blog-craft-card-image" href={blogPostPath(post)}>
                    {post.cover ? (
                      <SafeBlogImage compact post={post} />
                    ) : (
                      <BlogEditorialVisual compact post={post} />
                    )}
                  </Link>
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
                          {[post.contentType, post.newsCategory || post.tags[0]].filter(Boolean).join(" / ")} ·{" "}
                          {dictionary.readTime(post.readTimeMinutes)}
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
