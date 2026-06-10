import Link from "next/link";
import { blogContentTypeLabel, blogIndexPath, blogPostPath } from "@/lib/blog-utils";
import { getPublishedBlogInventoryPostsByLanguage } from "@/lib/cms";
import type { BlogLanguage, BlogPost } from "@/lib/types";

type BlogIndexLiteProps = {
  language: BlogLanguage;
  tag?: string;
  query?: string;
};

type LitePost = Awaited<ReturnType<typeof getPublishedBlogInventoryPostsByLanguage>>[number];

const BLOG_INDEX_POST_LIMIT = Number(process.env.BLOG_INDEX_POST_LIMIT || "6");

const copy: Record<
  BlogLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
    latest: string;
    categories: string;
    postsLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchSubmit: string;
    read: string;
    empty: string;
    readTime: (minutes: number) => string;
    topics: string[];
  }
> = {
  "zh-Hant": {
    eyebrow: "ALTOS LAB Journal",
    title: "AI 實驗室筆記",
    description: "AI 產品、Agent、自動化、搜尋可見度、案例與市場觀察。",
    latest: "最新文章",
    categories: "文章分類",
    postsLabel: "篇文章",
    searchLabel: "搜尋文章",
    searchPlaceholder: "搜尋 AI、Agent、GEO...",
    searchSubmit: "搜尋",
    read: "閱讀文章",
    empty: "目前沒有符合條件的文章。",
    readTime: (minutes) => `${minutes || 3} 分鐘閱讀`,
    topics: ["Latest", "市場快訊", "市場專欄", "AI 趨勢", "Agents", "Automation", "GEO"]
  },
  en: {
    eyebrow: "ALTOS LAB Journal",
    title: "AI Lab Notes",
    description: "AI products, agents, automation, search visibility, case studies and market signals.",
    latest: "Latest Articles",
    categories: "Categories",
    postsLabel: "posts",
    searchLabel: "Search articles",
    searchPlaceholder: "Search AI, agents, GEO...",
    searchSubmit: "Search",
    read: "Read article",
    empty: "No matching articles yet.",
    readTime: (minutes) => `${minutes || 3} min read`,
    topics: ["Latest", "Market Briefs", "Market Columns", "AI Trends", "Agents", "Automation", "GEO"]
  },
  ja: {
    eyebrow: "ALTOS LAB Journal",
    title: "AI Lab Notes",
    description: "AI プロダクト、Agent、自動化、検索での見え方、事例、AI 市場観測ノート。",
    latest: "最新記事",
    categories: "カテゴリー",
    postsLabel: "記事",
    searchLabel: "記事を検索",
    searchPlaceholder: "AI、Agent、GEO を検索...",
    searchSubmit: "検索",
    read: "読む",
    empty: "該当する記事はまだありません。",
    readTime: (minutes) => `${minutes || 3} 分で読めます`,
    topics: ["Latest", "市場ブリーフ", "市場コラム", "AI Trends", "Agents", "Automation", "GEO"]
  },
  ko: {
    eyebrow: "ALTOS LAB Journal",
    title: "AI Lab Notes",
    description: "AI 제품, 에이전트, 자동화, 검색 가시성, 사례, AI 시장 관찰 노트.",
    latest: "최신 글",
    categories: "카테고리",
    postsLabel: "글",
    searchLabel: "글 검색",
    searchPlaceholder: "AI, Agent, GEO 검색...",
    searchSubmit: "검색",
    read: "읽기",
    empty: "조건에 맞는 글이 아직 없습니다.",
    readTime: (minutes) => `${minutes || 3}분 읽기`,
    topics: ["Latest", "시장 브리프", "시장 칼럼", "AI Trends", "Agents", "Automation", "GEO"]
  },
  id: {
    eyebrow: "ALTOS LAB Journal",
    title: "Catatan Lab AI",
    description: "Produk AI, agent, automation, visibilitas pencarian, studi kasus, dan sinyal pasar.",
    latest: "Artikel Terbaru",
    categories: "Kategori",
    postsLabel: "artikel",
    searchLabel: "Cari artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    searchSubmit: "Cari",
    read: "Baca artikel",
    empty: "Belum ada artikel yang cocok.",
    readTime: (minutes) => `${minutes || 3} menit baca`,
    topics: ["Latest", "Kabar Pasar", "Kolom Pasar", "AI Trends", "Agents", "Automation", "GEO"]
  },
  vi: {
    eyebrow: "ALTOS LAB Journal",
    title: "Ghi Chép Phòng Lab AI",
    description: "Sản phẩm AI, agent, automation, hiển thị tìm kiếm, case study và tín hiệu thị trường.",
    latest: "Bài mới nhất",
    categories: "Chuyên mục",
    postsLabel: "bài viết",
    searchLabel: "Tìm bài viết",
    searchPlaceholder: "Tìm AI, Agent, GEO...",
    searchSubmit: "Tìm",
    read: "Đọc bài",
    empty: "Chưa có bài viết phù hợp.",
    readTime: (minutes) => `${minutes || 3} phút đọc`,
    topics: ["Latest", "Tin thị trường", "Chuyên mục", "AI Trends", "Agents", "Automation", "GEO"]
  },
  th: {
    eyebrow: "ALTOS LAB Journal",
    title: "บันทึกจากแล็บ AI",
    description: "ผลิตภัณฑ์ AI, agent, automation, search visibility, case study และสัญญาณตลาด.",
    latest: "บทความล่าสุด",
    categories: "หมวดหมู่",
    postsLabel: "บทความ",
    searchLabel: "ค้นหาบทความ",
    searchPlaceholder: "ค้นหา AI, Agent, GEO...",
    searchSubmit: "ค้นหา",
    read: "อ่านบทความ",
    empty: "ยังไม่มีบทความที่ตรงเงื่อนไข.",
    readTime: (minutes) => `อ่าน ${minutes || 3} นาที`,
    topics: ["Latest", "ข่าวตลาด", "คอลัมน์", "AI Trends", "Agents", "Automation", "GEO"]
  },
  ms: {
    eyebrow: "ALTOS LAB Journal",
    title: "Nota Makmal AI",
    description: "Produk AI, agent, automasi, keterlihatan carian, kajian kes dan isyarat pasaran.",
    latest: "Artikel Terkini",
    categories: "Kategori",
    postsLabel: "artikel",
    searchLabel: "Cari artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    searchSubmit: "Cari",
    read: "Baca artikel",
    empty: "Belum ada artikel yang sepadan.",
    readTime: (minutes) => `${minutes || 3} minit bacaan`,
    topics: ["Latest", "Berita Pasaran", "Kolum", "AI Trends", "Agents", "Automation", "GEO"]
  },
  fil: {
    eyebrow: "ALTOS LAB Journal",
    title: "AI Lab Notes",
    description: "AI products, agents, automation, search visibility, case studies, at market signals.",
    latest: "Pinakabagong Artikulo",
    categories: "Mga Kategorya",
    postsLabel: "artikulo",
    searchLabel: "Maghanap ng artikulo",
    searchPlaceholder: "Hanapin AI, Agent, GEO...",
    searchSubmit: "Hanapin",
    read: "Basahin",
    empty: "Wala pang tugmang artikulo.",
    readTime: (minutes) => `${minutes || 3} min read`,
    topics: ["Latest", "Balitang Merkado", "Kolum", "AI Trends", "Agents", "Automation", "GEO"]
  }
};

const topicAliases: Record<string, string[]> = {
  latest: [],
  "市場快訊": ["breaking", "市場快訊"],
  "market briefs": ["breaking", "brief"],
  "市場ブリーフ": ["breaking", "市場ブリーフ"],
  "시장 브리프": ["breaking", "시장 브리프"],
  "kabar pasar": ["breaking", "kabar pasar"],
  "tin thị trường": ["breaking", "tin thị trường"],
  "ข่าวตลาด": ["breaking", "ข่าวตลาด"],
  "berita pasaran": ["breaking", "berita pasaran"],
  "balitang merkado": ["breaking", "balitang merkado"],
  "市場專欄": ["column", "專欄"],
  "market columns": ["column"],
  "市場コラム": ["column"],
  "시장 칼럼": ["column"],
  "kolom pasar": ["column"],
  "chuyên mục": ["column"],
  "คอลัมน์": ["column"],
  kolum: ["column"],
  agents: ["agent", "agents"],
  automation: ["automation", "自動化"],
  geo: ["geo", "seo", "search", "搜尋", "검색", "tìm kiếm", "ค้นหา", "carian"]
};

function articleTimestamp(post: LitePost) {
  return new Date(post.publishedAt || post.updatedAt || post.createdAt).getTime() || 0;
}

function matchesTopic(post: LitePost, item: string) {
  const key = item.toLowerCase();
  if (key === "latest") return true;
  const aliases = topicAliases[key] || [key];
  const haystack = [post.contentType, post.newsCategory, post.topic, ...(post.tags || [])].join(" ").toLowerCase();
  return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

export async function BlogIndexLite({ language, tag, query }: BlogIndexLiteProps) {
  const dictionary = copy[language];
  const posts = await getPublishedBlogInventoryPostsByLanguage(language);
  const orderedPosts = [...posts].sort(
    (a, b) => articleTimestamp(b) - articleTimestamp(a) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );
  const normalizedTag = tag?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();
  const filtered = orderedPosts.filter((post) => {
    const matchesTag = normalizedTag ? matchesTopic(post, tag || "") : true;
    const matchesQuery = normalizedQuery
      ? [post.title, post.excerpt, post.topic, post.geoSummary, (post.tags || []).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      : true;
    return matchesTag && matchesQuery;
  });
  const visiblePosts = filtered.slice(0, BLOG_INDEX_POST_LIMIT);

  return (
    <main className="blog-lite-shell" aria-label={dictionary.title}>
      <section className="blog-lite-hero">
        <div>
          <p className="eyebrow">{dictionary.eyebrow}</p>
          <h1>{dictionary.title}</h1>
          <p>{dictionary.description}</p>
        </div>
        <form className="blog-lite-search" action={blogIndexPath(language)} role="search">
          {normalizedTag ? <input type="hidden" name="tag" value={tag} /> : null}
          <label className="sr-only" htmlFor={`blog-lite-search-${language}`}>
            {dictionary.searchLabel}
          </label>
          <input
            id={`blog-lite-search-${language}`}
            name="query"
            type="search"
            defaultValue={query || ""}
            placeholder={dictionary.searchPlaceholder}
            autoComplete="off"
          />
          <button type="submit">{dictionary.searchSubmit}</button>
        </form>
      </section>

      <nav className="blog-lite-topics" aria-label="Blog topics">
        {dictionary.topics.map((item) => (
          <Link
            className={normalizedTag === item.toLowerCase() || (!normalizedTag && item === "Latest") ? "active" : ""}
            href={item === "Latest" ? blogIndexPath(language) : `${blogIndexPath(language)}?tag=${encodeURIComponent(item)}`}
            key={item}
          >
            {item}
          </Link>
        ))}
      </nav>

      <section className="blog-lite-list" aria-label={dictionary.latest}>
        <div className="blog-lite-list-head">
          <p className="eyebrow">{normalizedTag ? dictionary.categories : dictionary.latest}</p>
          <span>
            {posts.length} {dictionary.postsLabel}
          </span>
        </div>
        {visiblePosts.map((post) => (
          <article className="blog-lite-card" key={post.id}>
            {post.cover ? (
              <Link className="blog-lite-image" href={blogPostPath(post as BlogPost)} aria-label={post.title}>
                <img src={post.cover} alt={post.coverAlt || post.title} loading="lazy" decoding="async" />
              </Link>
            ) : null}
            <div className="blog-lite-card-body">
              <div className="blog-lite-meta">
                <span className={`blog-craft-type-badge is-${post.contentType}`}>
                  {blogContentTypeLabel(post.contentType, post.language)}
                </span>
                <small>{new Date(post.updatedAt || post.publishedAt || post.createdAt).toISOString().slice(0, 10)}</small>
                <small>{dictionary.readTime(post.readTimeMinutes)}</small>
              </div>
              <h2>
                <Link href={blogPostPath(post as BlogPost)}>{post.title}</Link>
              </h2>
              <p>{post.excerpt}</p>
              <Link className="blog-lite-read" href={blogPostPath(post as BlogPost)}>
                {dictionary.read}
              </Link>
            </div>
          </article>
        ))}
        {!filtered.length ? <p className="muted">{dictionary.empty}</p> : null}
      </section>
    </main>
  );
}
