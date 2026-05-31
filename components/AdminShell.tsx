"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sendAnalyticsEvent } from "@/components/AnalyticsEvents";
import { BrandText } from "@/components/BrandText";
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Gauge,
  Languages,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Newspaper,
  PenLine,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import { BLOG_LANGUAGES, blogCoverForLanguage, blogPostPath, languageLabel, languageShortLabel } from "@/lib/blog-utils";
import type {
  BlogLanguage,
  BlogContentType,
  BlogPost,
  BlogReviewStatus,
  CmsData,
  ContactLeadStatus,
  Project,
  PublishStatus,
  SitePage
} from "@/lib/types";

type Tab = "dashboard" | "pages" | "projects" | "blog" | "leads";
type BlogEditorTab = "content" | "seo" | "sources" | "publish";
type BlogFilterLanguage = "all" | BlogLanguage;
type BlogFilterStatus = "all" | PublishStatus;
type BlogFilterReview = "all" | BlogReviewStatus;
type BlogFilterContentType = "all" | BlogContentType;
type BlogGroupBy = "group" | "type" | "category" | "none";

type AdminShellProps = {
  initialTab?: Tab;
};

const emptyData: CmsData = {
  sitePages: [],
  projects: [],
  blogPosts: [],
  contactLeads: [],
  assets: []
};

const statusLabels: Record<PublishStatus, string> = {
  draft: "草稿",
  published: "已發布",
  archived: "封存",
  deleted: "已刪除"
};

const reviewLabels: Record<BlogReviewStatus, string> = {
  "ai-draft": "AI 草稿",
  "human-review": "人工審稿",
  approved: "已核准",
  "needs-revision": "需修改"
};

const contentTypeLabels: Record<BlogContentType, string> = {
  breaking: "快訊",
  column: "專欄",
  feature: "專題"
};

const leadStatusLabels: Record<ContactLeadStatus, string> = {
  new: "新進",
  contacted: "已聯繫",
  qualified: "已確認",
  closed: "已結案",
  spam: "垃圾訊息"
};

function makeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function trackAdminBlogEvent(event: "blog_post_published" | "ai_blog_draft_generated", payload: Record<string, unknown>) {
  sendAnalyticsEvent({
    event,
    admin_surface: "blog",
    ...payload
  });
}

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function formatAdminDate(value?: string) {
  if (!value) return "未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未更新";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function gateLabel(value?: string) {
  if (value === "passed") return "通過";
  if (value === "failed") return "失敗";
  return "留稿";
}

function decisionLabel(value?: string) {
  if (value === "published") return "已發布";
  if (value === "rejected") return "拒絕";
  return "留待審核";
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.errors?.join(", ") || "Request failed");
  }
  return payload as T;
}

function JsonField({
  label,
  value,
  onChange
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <label>
      <span>{label}</span>
      <textarea
        className="json-area"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next);
            onChange(parsed);
            setError("");
          } catch {
            setError("JSON 格式尚未有效，修正後才會套用。");
          }
        }}
      />
      {error ? <span className="form-message error">{error}</span> : null}
    </label>
  );
}

function StringListField({
  label,
  value,
  onChange,
  placeholder,
  addLabel = "新增",
  emptyHint = "尚未新增項目。"
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyHint?: string;
}) {
  const items = value || [];
  return (
    <div className="list-field">
      <span className="list-field-label">{label}</span>
      <div className="list-field-rows">
        {items.length === 0 ? <p className="muted">{emptyHint}</p> : null}
        {items.map((item, index) => (
          <div className="list-field-row" key={index}>
            <input
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            <button
              className="button icon-button"
              type="button"
              aria-label="移除"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="button" type="button" onClick={() => onChange([...items, ""])}>
        <Plus size={15} />
        {addLabel}
      </button>
    </div>
  );
}

function MetricListField({
  label,
  value,
  onChange
}: {
  label: string;
  value: Project["metrics"];
  onChange: (value: Project["metrics"]) => void;
}) {
  const items = value || [];
  const update = (index: number, patch: Partial<Project["metrics"][number]>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="list-field">
      <span className="list-field-label">{label}</span>
      <div className="list-field-rows">
        {items.length === 0 ? <p className="muted">尚未新增指標。</p> : null}
        {items.map((item, index) => (
          <div className="list-field-row" key={item.id || index}>
            <input value={item.label} placeholder="名稱" onChange={(event) => update(index, { label: event.target.value })} />
            <input value={item.value} placeholder="數值" onChange={(event) => update(index, { value: event.target.value })} />
            <button
              className="button icon-button"
              type="button"
              aria-label="移除"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="button" type="button" onClick={() => onChange([...items, { label: "", value: "" }])}>
        <Plus size={15} />
        新增指標
      </button>
    </div>
  );
}

function FaqListField({
  label,
  value,
  onChange
}: {
  label: string;
  value: BlogPost["faqs"];
  onChange: (value: BlogPost["faqs"]) => void;
}) {
  const items = value || [];
  const update = (index: number, patch: Partial<BlogPost["faqs"][number]>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="list-field">
      <span className="list-field-label">{label}</span>
      <div className="list-field-rows">
        {items.length === 0 ? <p className="muted">尚未新增 FAQ。</p> : null}
        {items.map((item, index) => (
          <div className="list-field-card" key={index}>
            <div className="list-field-card-head">
              <span className="eyebrow">FAQ {index + 1}</span>
              <button
                className="button icon-button"
                type="button"
                aria-label="移除"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input value={item.question} placeholder="問題" onChange={(event) => update(index, { question: event.target.value })} />
            <textarea rows={3} value={item.answer} placeholder="回答" onChange={(event) => update(index, { answer: event.target.value })} />
          </div>
        ))}
      </div>
      <button className="button" type="button" onClick={() => onChange([...items, { question: "", answer: "" }])}>
        <Plus size={15} />
        新增 FAQ
      </button>
    </div>
  );
}

function SourceLinkListField({
  label,
  value,
  onChange
}: {
  label: string;
  value: BlogPost["sourceLinks"];
  onChange: (value: BlogPost["sourceLinks"]) => void;
}) {
  const items = value || [];
  const update = (index: number, patch: Partial<BlogPost["sourceLinks"][number]>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="list-field">
      <span className="list-field-label">{label}</span>
      <div className="list-field-rows">
        {items.length === 0 ? <p className="muted">尚未新增來源連結。</p> : null}
        {items.map((item, index) => (
          <div className="list-field-card" key={index}>
            <div className="list-field-card-head">
              <span className="eyebrow">來源 {index + 1}</span>
              <button
                className="button icon-button"
                type="button"
                aria-label="移除"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="form-row">
              <input value={item.title} placeholder="標題" onChange={(event) => update(index, { title: event.target.value })} />
              <input
                value={item.publisher || ""}
                placeholder="出處（選填）"
                onChange={(event) => update(index, { publisher: event.target.value })}
              />
            </div>
            <input value={item.url} placeholder="https://..." onChange={(event) => update(index, { url: event.target.value })} />
            <textarea
              rows={2}
              value={item.summary || ""}
              placeholder="摘要（選填）"
              onChange={(event) => update(index, { summary: event.target.value })}
            />
          </div>
        ))}
      </div>
      <button className="button" type="button" onClick={() => onChange([...items, { title: "", url: "" }])}>
        <Plus size={15} />
        新增來源
      </button>
    </div>
  );
}

export function AdminShell({ initialTab = "dashboard" }: AdminShellProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<CmsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [generator, setGenerator] = useState({
    topic: "AI 平台趨勢與企業導入決策",
    keyword: "AI implementation lab",
    audience: "各國企業主、營運主管與行銷團隊",
    intent: "判斷今日 AI 趨勢如何影響產品、流程、自動化與搜尋能見度",
    contentType: "column" as BlogContentType,
    newsCategory: "AI 平台趨勢"
  });
  const [blogFilters, setBlogFilters] = useState<{
    language: BlogFilterLanguage;
    status: BlogFilterStatus;
    review: BlogFilterReview;
    contentType: BlogFilterContentType;
    query: string;
  }>({
    language: "all",
    status: "all",
    review: "all",
    contentType: "all",
    query: ""
  });
  const [blogEditorTab, setBlogEditorTab] = useState<BlogEditorTab>("content");
  const [blogGroupBy, setBlogGroupBy] = useState<BlogGroupBy>("group");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const next = await api<CmsData>("/api/admin/bootstrap");
      setData(next);
      setSelectedPageId((current) => current || next.sitePages[0]?.id || "");
      setSelectedProjectId((current) => current || next.projects[0]?.id || "");
      setSelectedPostId((current) => current || next.blogPosts[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedPage = data.sitePages.find((page) => page.id === selectedPageId) || data.sitePages[0];
  const selectedProject =
    data.projects.find((project) => project.id === selectedProjectId) || data.projects[0];
  const selectedPost = data.blogPosts.find((post) => post.id === selectedPostId) || data.blogPosts[0];

  const counts = useMemo(
    () => ({
      pages: data.sitePages.length,
      projects: data.projects.length,
      publishedProjects: data.projects.filter((item) => item.status === "published").length,
      drafts:
        data.sitePages.filter((item) => item.status === "draft").length +
        data.projects.filter((item) => item.status === "draft").length +
        data.blogPosts.filter((item) => item.status === "draft").length,
      posts: data.blogPosts.length,
      leads: data.contactLeads.length
    }),
    [data]
  );

  const blogStats = useMemo(
    () => ({
      total: data.blogPosts.length,
      published: data.blogPosts.filter((post) => post.status === "published").length,
      drafts: data.blogPosts.filter((post) => post.status === "draft").length,
      zh: data.blogPosts.filter((post) => post.language === "zh-Hant").length,
      en: data.blogPosts.filter((post) => post.language === "en").length,
      ja: data.blogPosts.filter((post) => post.language === "ja").length,
      ko: data.blogPosts.filter((post) => post.language === "ko").length,
      needsReview: data.blogPosts.filter(
        (post) => post.reviewStatus === "ai-draft" || post.reviewStatus === "needs-revision"
      ).length,
      qualityApproved: data.blogPosts.filter((post) => post.qualityChecks.hasQualityReviewerApproval).length
    }),
    [data.blogPosts]
  );

  const contentFactoryStats = useMemo(() => {
    const contentMix = {
      breaking: data.blogPosts.filter((post) => post.contentType === "breaking").length,
      column: data.blogPosts.filter((post) => post.contentType === "column").length,
      feature: data.blogPosts.filter((post) => post.contentType === "feature").length
    };
    const sourceCounts = new Map<string, number>();
    for (const post of data.blogPosts) {
      for (const source of post.sourceLinks) {
        const host = hostnameFromUrl(source.url);
        sourceCounts.set(host, (sourceCounts.get(host) || 0) + 1);
      }
    }
    const traces = data.blogPosts.flatMap((post) => post.generationTrace || []);
    const localTraces = traces.filter((trace) => trace.provider === "local-antigravity");
    const latencyValues = traces.map((trace) => trace.latencyMs || 0).filter(Boolean);
    const usage = traces.reduce(
      (sum, trace) => ({
        totalTokens: sum.totalTokens + (trace.usage?.totalTokens || 0),
        cacheHitTokens: sum.cacheHitTokens + (trace.usage?.promptCacheHitTokens || 0),
        cacheMissTokens: sum.cacheMissTokens + (trace.usage?.promptCacheMissTokens || 0)
      }),
      { totalTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0 }
    );
    const recentGenerated = data.blogPosts
      .filter((post) => post.generatedBy)
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5);

    return {
      contentMix,
      topSources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      traceCount: traces.length,
      localTraceCount: localTraces.length,
      averageLatencyMs: latencyValues.length
        ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
        : 0,
      usage,
      llmReviewed: data.blogPosts.filter((post) => post.qualityChecks.llmEvaluation?.enabled).length,
      qualityPassed: data.blogPosts.filter((post) => post.qualityStatus === "passed").length,
      imagePassed: data.blogPosts.filter((post) => post.imageQualityStatus === "passed").length,
      held: data.blogPosts.filter((post) => post.releaseDecision === "held_for_review").length,
      recentGenerated
    };
  }, [data.blogPosts]);

  const filteredBlogPosts = useMemo(() => {
    const query = blogFilters.query.trim().toLowerCase();
    return [...data.blogPosts]
      .filter((post) => {
        const matchesLanguage = blogFilters.language === "all" || post.language === blogFilters.language;
        const matchesStatus = blogFilters.status === "all" || post.status === blogFilters.status;
        const matchesReview = blogFilters.review === "all" || post.reviewStatus === blogFilters.review;
        const matchesContentType = blogFilters.contentType === "all" || post.contentType === blogFilters.contentType;
        const matchesQuery = query
          ? [post.title, post.slug, post.topic, post.newsCategory, post.excerpt, post.tags.join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(query)
          : true;
        return matchesLanguage && matchesStatus && matchesReview && matchesContentType && matchesQuery;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
  }, [blogFilters, data.blogPosts]);

  const groupedBlogPosts = useMemo(() => {
    if (blogGroupBy === "none") {
      return [{ key: "all", label: "", posts: filteredBlogPosts }];
    }
    const languageOrder = (post: BlogPost) => {
      const index = BLOG_LANGUAGES.indexOf(post.language);
      return index === -1 ? BLOG_LANGUAGES.length : index;
    };
    const buckets = new Map<string, BlogPost[]>();
    for (const post of filteredBlogPosts) {
      const key =
        blogGroupBy === "type"
          ? post.contentType || "column"
          : blogGroupBy === "category"
            ? post.newsCategory || "未分類"
            : post.translationGroupId || post.id;
      const list = buckets.get(key) || [];
      list.push(post);
      buckets.set(key, list);
    }
    const groups = [...buckets.entries()].map(([key, posts]) => {
      const sorted =
        blogGroupBy === "group" ? [...posts].sort((a, b) => languageOrder(a) - languageOrder(b)) : posts;
      const label =
        blogGroupBy === "type"
          ? contentTypeLabels[key as BlogContentType] || key
          : blogGroupBy === "category"
            ? key
            : (posts.find((post) => post.language === "zh-Hant") || posts[0]).title || "未命名群組";
      const latest = Math.max(
        ...posts.map((post) => new Date(post.updatedAt || post.createdAt).getTime())
      );
      return { key, label, posts: sorted, latest };
    });
    if (blogGroupBy === "type") {
      const order: Record<string, number> = { breaking: 0, column: 1, feature: 2 };
      groups.sort((a, b) => (order[a.key] ?? 9) - (order[b.key] ?? 9));
    } else {
      groups.sort((a, b) => b.latest - a.latest);
    }
    return groups;
  }, [filteredBlogPosts, blogGroupBy]);

  function updatePage(id: string, patch: Partial<SitePage>) {
    setData((current) => ({
      ...current,
      sitePages: current.sitePages.map((page) => (page.id === id ? { ...page, ...patch } : page))
    }));
  }

  function updateProject(id: string, patch: Partial<Project>) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === id ? { ...project, ...patch } : project))
    }));
  }

  function updatePost(id: string, patch: Partial<BlogPost>) {
    setData((current) => ({
      ...current,
      blogPosts: current.blogPosts.map((post) => (post.id === id ? { ...post, ...patch } : post))
    }));
  }

  async function savePage(page: SitePage) {
    setMessage("");
    setError("");
    try {
      const payload = await api<{ page: SitePage }>(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify(page)
      });
      updatePage(page.id, payload.page);
      setMessage("頁面已儲存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function createProject() {
    const payload = await api<{ project: Project }>("/api/admin/projects", {
      method: "POST",
      body: JSON.stringify({
        title: "New AI Project",
        titleEn: "New AI Project",
        slug: `new-ai-project-${Date.now().toString(36)}`,
        status: "draft",
        tag: "AI",
        cover: "/geo-cover.png",
        desc: "Draft project description",
        detail: "Draft project detail",
        metrics: [{ label: "Metric", value: "TBD" }],
        tech: ["AI"]
      })
    });
    setData((current) => ({ ...current, projects: [...current.projects, payload.project] }));
    setSelectedProjectId(payload.project.id);
    setTab("projects");
  }

  async function saveProject(project: Project) {
    setMessage("");
    setError("");
    try {
      const payload = await api<{ project: Project }>(`/api/admin/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(project)
      });
      updateProject(project.id, payload.project);
      setMessage("專案已儲存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function createPost(input?: Partial<BlogPost>) {
    const payload = await api<{ post: BlogPost }>("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify(
        input || {
          title: "未命名 AI 文章",
          status: "draft",
          language: "zh-Hant",
          contentType: "column",
          newsCategory: "AI 趨勢",
          cover: blogCoverForLanguage("zh-Hant"),
          coverAlt: "ALTOS LAB AI 實驗室文章抽象主視覺"
        }
      )
    });
    setData((current) => ({ ...current, blogPosts: [payload.post, ...current.blogPosts] }));
    setSelectedPostId(payload.post.id);
    setTab("blog");
    return payload.post;
  }

  async function generatePost() {
    setMessage("正式部落格生成已改由本機 Antigravity/Codex worker 執行；後台不再直接呼叫 DeepSeek 產生正式草稿。");
    setError("");
  }

  async function duplicateTranslation(post: BlogPost) {
    const groupLanguages = data.blogPosts
      .filter((item) => item.translationGroupId === post.translationGroupId)
      .map((item) => item.language);
    const language = BLOG_LANGUAGES.find((item) => !groupLanguages.includes(item)) || (post.language === "en" ? "zh-Hant" : "en");
    const payload = await api<{ post: BlogPost }>("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify({
        ...post,
        id: undefined,
        status: "draft",
        language,
        title: `${post.title} (${languageLabel(language)})`,
        slug: `${post.slug}-${language === "zh-Hant" ? "zh" : language}`,
        cover: blogCoverForLanguage(language),
        reviewStatus: "human-review",
        featured: false,
        publishedAt: undefined
      })
    });
    setData((current) => ({ ...current, blogPosts: [payload.post, ...current.blogPosts] }));
    setSelectedPostId(payload.post.id);
    setMessage("已複製一篇翻譯草稿，請改寫後再發佈。");
  }

  function previewPath(post: BlogPost) {
    return blogPostPath(post);
  }

  function statusSummary(post: BlogPost) {
    return `${statusLabels[post.status]} · ${languageLabel(post.language)} · ${contentTypeLabels[post.contentType || "column"]} · ${reviewLabels[post.reviewStatus]}`;
  }

  function updateQualityCheckField<K extends keyof BlogPost["qualityChecks"]>(
    post: BlogPost,
    field: K,
    value: BlogPost["qualityChecks"][K]
  ) {
    updatePost(post.id, {
      qualityChecks: {
        ...post.qualityChecks,
        [field]: value
      }
    });
  }

  function publishReadiness(post: BlogPost) {
    const hasReviewApproval = post.qualityChecks.hasHumanReview || post.qualityChecks.hasQualityReviewerApproval;
    return [
      { label: "有文章標題與 slug", ok: Boolean(post.title && post.slug) },
      { label: "有文章型態與消息分類", ok: Boolean(post.contentType && post.newsCategory) },
      { label: "有 SEO title / description", ok: Boolean(post.seoTitle && post.seoDescription) },
      { label: "有 GEO 回答摘要", ok: Boolean(post.geoSummary) },
      { label: "有封面圖與 alt", ok: Boolean(post.cover && post.coverAlt) },
      { label: "AI 草稿有合法主題配圖", ok: !post.generatedBy || post.coverSource === "curated" || post.coverSource === "generated" },
      { label: "文章品質 gate 通過", ok: !post.generatedBy || post.qualityStatus === "passed" },
      { label: "圖片品質 gate 通過", ok: !post.generatedBy || post.imageQualityStatus === "passed" },
      { label: "有可見 FAQ", ok: post.faqs.length > 0 },
      { label: "AI 草稿有來源連結", ok: !post.generatedBy || post.sourceLinks.length > 0 },
      { label: "來源可信與圖文符合", ok: Boolean(post.qualityChecks.hasSourceTrust && post.qualityChecks.hasImageFit) },
      { label: "Anti-slop 寫作品質通過", ok: !post.generatedBy || Boolean(post.qualityChecks.hasAntiSlopReview) },
      { label: "人工或品質審核已通過", ok: !post.generatedBy || hasReviewApproval }
    ];
  }

  function publishReadinessSummary(post: BlogPost) {
    const checks = publishReadiness(post);
    const ready = checks.filter((item) => item.ok).length;
    return `${ready}/${checks.length}`;
  }

  async function savePost(post: BlogPost) {
    setMessage("");
    setError("");
    const isPublishingForFirstTime = post.status === "published" && !post.publishedAt;
    try {
      const payload = await api<{ post: BlogPost }>(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify(post)
      });
      updatePost(post.id, payload.post);
      if (isPublishingForFirstTime) {
        trackAdminBlogEvent("blog_post_published", {
          blog_slug: payload.post.slug,
          blog_language: payload.post.language,
          translation_group_id: payload.post.translationGroupId
        });
      }
      setMessage("文章已儲存。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  async function updateLead(id: string, status: ContactLeadStatus) {
    const payload = await api<{ lead: CmsData["contactLeads"][number] }>(`/api/admin/contact-leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setData((current) => ({
      ...current,
      contactLeads: current.contactLeads.map((lead) => (lead.id === id ? payload.lead : lead))
    }));
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">A</span>
            <span>
              <BrandText /> 後台
            </span>
          </Link>
          <button className="button" onClick={logout} type="button">
            <LogOut size={16} />
            登出
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-tabs">
          {[
            ["dashboard", "總覽", LayoutDashboard],
            ["pages", "頁面", FileText],
            ["projects", "專案", Gauge],
            ["blog", "部落格", Newspaper],
            ["leads", "表單名單", Users]
          ].map(([key, label, Icon]) => (
            <button
              className={`admin-tab ${tab === key ? "active" : ""}`}
              key={String(key)}
              onClick={() => setTab(key as Tab)}
              type="button"
            >
              <Icon size={15} /> {String(label)}
            </button>
          ))}
        </div>

        {message ? <p className="form-message sent">{message}</p> : null}
        {error ? <p className="form-message error">{error}</p> : null}
        {loading ? <p className="muted">正在載入 CMS 資料...</p> : null}

        {tab === "dashboard" ? (
          <section className="admin-dashboard">
            <header className="admin-page-head">
              <p className="eyebrow">總覽</p>
              <h1>內容總覽</h1>
              <p className="muted">頁面、專案、部落格與表單名單的即時統計。</p>
            </header>
            <div className="stats-grid">
              {[
                ["頁面", counts.pages],
                ["專案", counts.projects],
                ["已發布專案", counts.publishedProjects],
                ["草稿", counts.drafts],
                ["部落格文章", counts.posts],
                ["表單名單", counts.leads]
              ].map(([label, value]) => (
                <article className="stat-card" key={String(label)}>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "pages" && selectedPage ? (
          <section className="admin-grid">
            <aside className="admin-card">
              <h2>頁面</h2>
              <div className="admin-list">
                {data.sitePages.map((page) => (
                  <button
                    className={page.id === selectedPage.id ? "active" : ""}
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    type="button"
                  >
                    <strong>{page.title}</strong>
                    <br />
                    <span className={`status-pill ${page.status}`}>{statusLabels[page.status]}</span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="admin-card">
              <h2>首頁內容</h2>
              <div className="admin-form">
                <div className="form-row">
                  <label>
                    <span>標題</span>
                    <input value={selectedPage.title} onChange={(event) => updatePage(selectedPage.id, { title: event.target.value })} />
                  </label>
                  <label>
                    <span>網址 slug</span>
                    <input value={selectedPage.slug} onChange={(event) => updatePage(selectedPage.id, { slug: event.target.value })} />
                  </label>
                </div>
                <label>
                  <span>SEO 標題</span>
                  <input
                    value={selectedPage.seoTitle || ""}
                    onChange={(event) => updatePage(selectedPage.id, { seoTitle: event.target.value })}
                  />
                </label>
                <label>
                  <span>SEO 描述</span>
                  <textarea
                    rows={3}
                    value={selectedPage.seoDescription || ""}
                    onChange={(event) => updatePage(selectedPage.id, { seoDescription: event.target.value })}
                  />
                </label>
                <JsonField
                  label="區塊 JSON（可調整前台所有區塊、排序、文案與重複項目）"
                  value={selectedPage.sections}
                  onChange={(value) => updatePage(selectedPage.id, { sections: value as SitePage["sections"] })}
                />
                <div className="form-actions">
                  <button className="button primary" onClick={() => savePage(selectedPage)} type="button">
                    <Save size={16} />
                    儲存頁面
                  </button>
                  <Link className="button" href="/" target="_blank">
                    預覽
                  </Link>
                </div>
              </div>
            </section>
          </section>
        ) : null}

        {tab === "projects" ? (
          <section className="admin-grid">
            <aside className="admin-card">
              <div className="form-actions" style={{ justifyContent: "space-between" }}>
                <h2>專案</h2>
                <button className="button primary" onClick={createProject} type="button" aria-label="新增專案">
                  <Plus size={16} />
                </button>
              </div>
              <div className="admin-list">
                {data.projects.map((project) => (
                  <button
                    className={project.id === selectedProject?.id ? "active" : ""}
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    type="button"
                  >
                    <strong>{project.title}</strong>
                    <br />
                    <span className={`status-pill ${project.status}`}>{statusLabels[project.status]}</span>
                  </button>
                ))}
              </div>
            </aside>
            {selectedProject ? (
              <section className="admin-card">
                <h2>專案編輯</h2>
                <div className="admin-form">
                  <div className="form-row">
                    <label>
                      <span>標題</span>
                      <input
                        value={selectedProject.title}
                        onChange={(event) => updateProject(selectedProject.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>網址 slug</span>
                      <input
                        value={selectedProject.slug}
                        onChange={(event) => updateProject(selectedProject.id, { slug: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span>狀態</span>
                      <select
                        value={selectedProject.status}
                        onChange={(event) => updateProject(selectedProject.id, { status: event.target.value as Project["status"] })}
                      >
                        <option value="draft">草稿</option>
                        <option value="published">已發布</option>
                        <option value="archived">封存</option>
                      </select>
                    </label>
                    <label>
                      <span>標籤</span>
                      <input
                        value={selectedProject.tag}
                        onChange={(event) => updateProject(selectedProject.id, { tag: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    <span>封面 URL</span>
                    <input
                      value={selectedProject.cover}
                      onChange={(event) => updateProject(selectedProject.id, { cover: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>簡述</span>
                    <textarea
                      rows={3}
                      value={selectedProject.desc}
                      onChange={(event) => updateProject(selectedProject.id, { desc: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>詳細內容</span>
                    <textarea
                      rows={5}
                      value={selectedProject.detail}
                      onChange={(event) => updateProject(selectedProject.id, { detail: event.target.value })}
                    />
                  </label>
                  <StringListField
                    label="相簿圖片"
                    value={selectedProject.gallery}
                    onChange={(value) => updateProject(selectedProject.id, { gallery: value })}
                    placeholder="/images/cover.png"
                    addLabel="新增圖片"
                    emptyHint="尚未新增圖片。"
                  />
                  <MetricListField
                    label="數據指標"
                    value={selectedProject.metrics}
                    onChange={(value) => updateProject(selectedProject.id, { metrics: value })}
                  />
                  <StringListField
                    label="技術標籤"
                    value={selectedProject.tech}
                    onChange={(value) => updateProject(selectedProject.id, { tech: value })}
                    placeholder="例如：AI、Next.js"
                    addLabel="新增標籤"
                    emptyHint="尚未新增標籤。"
                  />
                  <JsonField
                    label="產品頁 JSON"
                    value={selectedProject.productPage}
                    onChange={(value) => updateProject(selectedProject.id, { productPage: value as Project["productPage"] })}
                  />
                  <div className="form-actions">
                    <button className="button primary" onClick={() => saveProject(selectedProject)} type="button">
                      <Save size={16} />
                      儲存專案
                    </button>
                    <Link className="button" href={`/projects/${selectedProject.slug}`} target="_blank">
                      預覽
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {tab === "blog" ? (
          <section className="blog-workbench">
            <header className="blog-workbench-header blog-command-center">
              <div className="blog-command-copy">
                <p className="eyebrow">部落格營運台</p>
                <h1>部落格後台</h1>
                <p className="muted">從文章佇列、內容編輯、發布檢查到上線狀態，集中在同一條清楚的工作流。</p>
              </div>
              <div className="blog-command-metrics" aria-label="Blog overview">
                <span>
                  <strong>{blogStats.total}</strong>
                  全部
                </span>
                <span>
                  <strong>{blogStats.needsReview}</strong>
                  待審
                </span>
                <span>
                  <strong>{blogStats.published}</strong>
                  已發布
                </span>
                <span>
                  <strong>{contentFactoryStats.traceCount}</strong>
                  AI 軌跡
                </span>
              </div>
              <div className="admin-actions-stack">
                <button className="button primary" onClick={generatePost} type="button">
                  <Sparkles size={16} />
                  AI 產生四語草稿
                </button>
                <button className="button" onClick={() => createPost()} type="button">
                  <Plus size={16} />
                  新增空白文章
                </button>
              </div>
            </header>

            <section className="blog-workbench-grid">
              <aside className="blog-sidebar">
                <details className="admin-card blog-generator-panel">
                  <summary>
                    <span>
                      <Sparkles size={16} />
                      AI 草稿設定
                    </span>
                    <small>{contentTypeLabels[generator.contentType]} · {generator.newsCategory}</small>
                  </summary>
                  <p className="muted">手動產生時可指定主題；每日排程會自動從 AI / 搜尋 / 產品趨勢來源抓題材。</p>
                  <div className="admin-form compact">
                    <label>
                      <span>主題</span>
                      <input
                        value={generator.topic}
                        onChange={(event) => setGenerator({ ...generator, topic: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>主要關鍵字</span>
                      <input
                        value={generator.keyword}
                        onChange={(event) => setGenerator({ ...generator, keyword: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>目標讀者</span>
                      <input
                        value={generator.audience}
                        onChange={(event) => setGenerator({ ...generator, audience: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>搜尋意圖</span>
                      <textarea
                        rows={2}
                        value={generator.intent}
                        onChange={(event) => setGenerator({ ...generator, intent: event.target.value })}
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        <span>文章型態</span>
                        <select
                          value={generator.contentType}
                          onChange={(event) =>
                            setGenerator({ ...generator, contentType: event.target.value as BlogContentType })
                          }
                        >
                          <option value="breaking">快訊</option>
                          <option value="column">專欄</option>
                          <option value="feature">專題</option>
                        </select>
                      </label>
                      <label>
                        <span>分類</span>
                        <input
                          value={generator.newsCategory}
                          onChange={(event) => setGenerator({ ...generator, newsCategory: event.target.value })}
                        />
                      </label>
                    </div>
                    <button className="button primary" onClick={generatePost} type="button">
                      <Sparkles size={16} />
                      產生四語草稿
                    </button>
                  </div>
                </details>

                <section className="admin-card blog-list-panel">
                  <div className="blog-filter-title">
                    <Search size={16} />
                    <h2>文章佇列</h2>
                  </div>
                  <div className="blog-stat-row">
                    <span>{blogStats.total} 全部</span>
                    <span>{blogStats.drafts} 草稿</span>
                    <span>{blogStats.published} 已發布</span>
                    <span>{blogStats.needsReview} 待審</span>
                    <span>{blogStats.qualityApproved} 品質通過</span>
                  </div>
                  <div className="admin-form compact">
                    <label>
                      <span>搜尋</span>
                      <input
                        value={blogFilters.query}
                        onChange={(event) => setBlogFilters({ ...blogFilters, query: event.target.value })}
                        placeholder="標題、slug、主題或標籤"
                      />
                    </label>
                    <label>
                      <span>分組方式</span>
                      <select
                        value={blogGroupBy}
                        onChange={(event) => setBlogGroupBy(event.target.value as BlogGroupBy)}
                      >
                        <option value="group">翻譯群組（同主題 4 語言）</option>
                        <option value="type">文章型態</option>
                        <option value="category">消息分類</option>
                        <option value="none">不分組</option>
                      </select>
                    </label>
                    <div className="form-row">
                      <label>
                        <span>語言</span>
                        <select
                          value={blogFilters.language}
                          onChange={(event) =>
                            setBlogFilters({ ...blogFilters, language: event.target.value as BlogFilterLanguage })
                          }
                        >
                          <option value="all">全部</option>
                          {BLOG_LANGUAGES.map((item) => (
                            <option value={item} key={item}>
                              {languageLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>狀態</span>
                        <select
                          value={blogFilters.status}
                          onChange={(event) =>
                            setBlogFilters({ ...blogFilters, status: event.target.value as BlogFilterStatus })
                          }
                        >
                          <option value="all">全部</option>
                          <option value="draft">草稿</option>
                          <option value="published">已發布</option>
                          <option value="archived">封存</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      <span>文章型態</span>
                      <select
                        value={blogFilters.contentType}
                        onChange={(event) =>
                          setBlogFilters({ ...blogFilters, contentType: event.target.value as BlogFilterContentType })
                        }
                      >
                        <option value="all">全部</option>
                        <option value="breaking">快訊</option>
                        <option value="column">專欄</option>
                        <option value="feature">專題</option>
                      </select>
                    </label>
                    <label>
                      <span>審稿狀態</span>
                      <select
                        value={blogFilters.review}
                        onChange={(event) =>
                          setBlogFilters({ ...blogFilters, review: event.target.value as BlogFilterReview })
                        }
                      >
                        <option value="all">全部</option>
                        <option value="ai-draft">AI 草稿</option>
                        <option value="human-review">人工審稿</option>
                        <option value="needs-revision">需修改</option>
                        <option value="approved">已核准</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-list blog-post-list">
                    {filteredBlogPosts.length ? (
                      groupedBlogPosts.map((group) => {
                        const groupType = group.posts[0]?.contentType || "column";
                        return (
                          <div className="blog-post-group" key={group.key}>
                            {group.label ? (
                              <div className="blog-group-head">
                                {blogGroupBy === "type" ? (
                                  <span className={`tag-pill type-${group.key}`}>{group.label}</span>
                                ) : (
                                  <>
                                    {blogGroupBy === "group" ? (
                                      <span className={`tag-pill type-${groupType}`}>{contentTypeLabels[groupType]}</span>
                                    ) : null}
                                    <span className="blog-group-title">{group.label}</span>
                                  </>
                                )}
                                <span className="blog-group-count">{group.posts.length} 篇</span>
                              </div>
                            ) : null}
                            {group.posts.map((post) => {
                              const postMissingChecks = publishReadiness(post).filter((item) => !item.ok).length;
                              const grouped = blogGroupBy === "group";
                              return (
                                <button
                                  className={`blog-post-row blog-status-${post.status} review-${post.reviewStatus} ${
                                    postMissingChecks ? "needs-work" : "ready"
                                  }${post.id === selectedPost?.id ? " active" : ""}${grouped ? " compact" : ""}`}
                                  key={post.id}
                                  onClick={() => setSelectedPostId(post.id)}
                                  type="button"
                                >
                                  <span className="blog-list-row-top">
                                    <strong>{grouped ? languageLabel(post.language) : post.title}</strong>
                                    <span className={`tag-pill status-${post.status}`}>{statusLabels[post.status]}</span>
                                  </span>
                                  <span className="blog-list-tags">
                                    {!grouped ? (
                                      <span className="tag-pill lang">{languageShortLabel(post.language)}</span>
                                    ) : null}
                                    {blogGroupBy === "none" || blogGroupBy === "category" ? (
                                      <span className={`tag-pill type-${post.contentType || "column"}`}>
                                        {contentTypeLabels[post.contentType || "column"]}
                                      </span>
                                    ) : null}
                                    <span className={`tag-pill review-${post.reviewStatus}`}>
                                      {reviewLabels[post.reviewStatus]}
                                    </span>
                                    <span className={`blog-check ${postMissingChecks ? "signal-review" : "signal-ready"}`}>
                                      檢查 {publishReadinessSummary(post)}
                                    </span>
                                    <span className="blog-check-date">{formatAdminDate(post.updatedAt || post.createdAt)}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">目前沒有符合條件的文章。</p>
                    )}
                  </div>
                </section>
              </aside>

              {selectedPost ? (
                <section className="admin-card blog-editor-panel">
                  <header className="blog-editor-header">
                    <div>
                      <p className="eyebrow">{statusSummary(selectedPost)}</p>
                      <h2>{selectedPost.title || "未命名文章"}</h2>
                      <p className="muted">
                        {selectedPost.generatedBy ? `AI 來源：${selectedPost.generatedBy}` : "手動文章"} ·{" "}
                        {selectedPost.scheduledFor
                          ? `排程：${new Date(selectedPost.scheduledFor).toLocaleString("zh-TW")}`
                          : "未設定排程"}
                      </p>
                    </div>
                    <div className="form-actions">
                      <Link className="button" href={previewPath(selectedPost)} target="_blank">
                        <Eye size={16} />
                        預覽前台
                      </Link>
                      <button className="button primary" onClick={() => savePost(selectedPost)} type="button">
                        <Save size={16} />
                        儲存
                      </button>
                    </div>
                  </header>

                  <div className="quality-decision-strip">
                    <span>文章品質：{gateLabel(selectedPost.qualityStatus)}</span>
                    <span>圖片品質：{gateLabel(selectedPost.imageQualityStatus)}</span>
                    <span>發布決策：{decisionLabel(selectedPost.releaseDecision)}</span>
                    {selectedPost.ingestRunId ? <span>Run：{selectedPost.ingestRunId}</span> : null}
                  </div>

                  <nav className="editor-tabs" aria-label="Blog editor sections">
                    {[
                      ["content", "內容", PenLine],
                      ["seo", "SEO / GEO", Search],
                      ["sources", "來源 / FAQ", Link2],
                      ["publish", "發布檢查", ListChecks]
                    ].map(([key, label, Icon]) => (
                      <button
                        className={blogEditorTab === key ? "active" : ""}
                        key={String(key)}
                        onClick={() => setBlogEditorTab(key as BlogEditorTab)}
                        aria-pressed={blogEditorTab === key}
                        type="button"
                      >
                        <Icon size={15} />
                        {String(label)}
                      </button>
                    ))}
                  </nav>

                  <div className="admin-form blog-editor-form">
                    {blogEditorTab === "content" ? (
                      <>
                        <div className="form-row">
                          <label>
                            <span>文章標題</span>
                            <input
                              value={selectedPost.title}
                              onChange={(event) =>
                                updatePost(selectedPost.id, {
                                  title: event.target.value,
                                  slug: selectedPost.slug || makeSlug(event.target.value)
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>網址 slug</span>
                            <input
                              value={selectedPost.slug}
                              onChange={(event) => updatePost(selectedPost.id, { slug: event.target.value })}
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label>
                            <span>語言</span>
                            <select
                              value={selectedPost.language}
                              onChange={(event) =>
                                updatePost(selectedPost.id, {
                                  language: event.target.value as BlogPost["language"],
                                  cover: blogCoverForLanguage(event.target.value as BlogPost["language"])
                                })
                              }
                            >
                              {BLOG_LANGUAGES.map((item) => (
                                <option value={item} key={item}>
                                  {languageLabel(item)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>標籤（逗號分隔）</span>
                            <input
                              value={selectedPost.tags.join(", ")}
                              onChange={(event) =>
                                updatePost(selectedPost.id, {
                                  tags: event.target.value
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean)
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label>
                            <span>文章型態</span>
                            <select
                              value={selectedPost.contentType || "column"}
                              onChange={(event) =>
                                updatePost(selectedPost.id, { contentType: event.target.value as BlogContentType })
                              }
                            >
                              <option value="breaking">快訊</option>
                              <option value="column">專欄</option>
                              <option value="feature">專題</option>
                            </select>
                          </label>
                          <label>
                            <span>消息分類</span>
                            <input
                              value={selectedPost.newsCategory || ""}
                              onChange={(event) => updatePost(selectedPost.id, { newsCategory: event.target.value })}
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label>
                            <span>主題</span>
                            <input
                              value={selectedPost.topic}
                              onChange={(event) => updatePost(selectedPost.id, { topic: event.target.value })}
                            />
                          </label>
                          <label>
                            <span>讀者</span>
                            <input
                              value={selectedPost.audience}
                              onChange={(event) => updatePost(selectedPost.id, { audience: event.target.value })}
                            />
                          </label>
                        </div>
                        <label>
                          <span>摘要</span>
                          <textarea
                            rows={3}
                            value={selectedPost.excerpt}
                            onChange={(event) => updatePost(selectedPost.id, { excerpt: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>正文（支援 ## 標題）</span>
                          <textarea
                            rows={18}
                            value={selectedPost.body}
                            onChange={(event) => updatePost(selectedPost.id, { body: event.target.value })}
                          />
                        </label>
                        <StringListField
                          label="重點摘要"
                          value={selectedPost.keyTakeaways}
                          onChange={(value) => updatePost(selectedPost.id, { keyTakeaways: value })}
                          placeholder="一句重點"
                          addLabel="新增重點"
                          emptyHint="尚未新增重點摘要。"
                        />
                      </>
                    ) : null}

                    {blogEditorTab === "seo" ? (
                      <>
                        <label>
                          <span>SEO 標題</span>
                          <input
                            value={selectedPost.seoTitle || ""}
                            onChange={(event) => updatePost(selectedPost.id, { seoTitle: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>SEO 描述</span>
                          <textarea
                            rows={3}
                            value={selectedPost.seoDescription || ""}
                            onChange={(event) => updatePost(selectedPost.id, { seoDescription: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>GEO 回答摘要</span>
                          <textarea
                            rows={4}
                            value={selectedPost.geoSummary}
                            onChange={(event) => updatePost(selectedPost.id, { geoSummary: event.target.value })}
                          />
                        </label>
                        <div className="form-row">
                          <label>
                            <span>封面 URL</span>
                            <input
                              value={selectedPost.cover || ""}
                              onChange={(event) => updatePost(selectedPost.id, { cover: event.target.value })}
                            />
                          </label>
                          <label>
                            <span>封面 alt text</span>
                            <input
                              value={selectedPost.coverAlt || ""}
                              onChange={(event) => updatePost(selectedPost.id, { coverAlt: event.target.value })}
                            />
                          </label>
                        </div>
                        {selectedPost.cover ? (
                          <img className="admin-cover-preview" src={selectedPost.cover} alt={selectedPost.coverAlt || ""} />
                        ) : null}
                        {selectedPost.coverPrompt || selectedPost.coverGeneration ? (
                          <div className="quality-panel">
                            <p className="eyebrow">封面生成</p>
                            <p>
                              來源：{selectedPost.coverSource || "manual"} · 狀態：
                              {selectedPost.coverGeneration?.status || "manual"} · 模型：
                              {selectedPost.coverGeneration?.model || selectedPost.coverGeneration?.provider || "n/a"}
                            </p>
                            {selectedPost.coverCredit ? (
                              <p>
                                圖片來源：
                                {selectedPost.coverCreditUrl ? (
                                  <a href={selectedPost.coverCreditUrl} target="_blank" rel="noreferrer">
                                    {selectedPost.coverCredit}
                                  </a>
                                ) : (
                                  selectedPost.coverCredit
                                )}
                                {selectedPost.coverLicense ? ` · ${selectedPost.coverLicense}` : ""}
                              </p>
                            ) : null}
                            {selectedPost.coverGeneration?.error ? <p className="danger-text">{selectedPost.coverGeneration.error}</p> : null}
                            {selectedPost.coverPrompt ? <textarea readOnly rows={5} value={selectedPost.coverPrompt} /> : null}
                          </div>
                        ) : null}
                        <label>
                          <span>AI 內容揭露</span>
                          <textarea
                            rows={2}
                            value={selectedPost.aiDisclosure || ""}
                            onChange={(event) => updatePost(selectedPost.id, { aiDisclosure: event.target.value })}
                          />
                        </label>
                      </>
                    ) : null}

                    {blogEditorTab === "sources" ? (
                      <>
                        <FaqListField
                          label="常見問題 FAQ（有項目時才會輸出 FAQ schema）"
                          value={selectedPost.faqs}
                          onChange={(value) => updatePost(selectedPost.id, { faqs: value })}
                        />
                        <SourceLinkListField
                          label="來源連結（AI 草稿發布前必須有來源）"
                          value={selectedPost.sourceLinks}
                          onChange={(value) => updatePost(selectedPost.id, { sourceLinks: value })}
                        />
                        <button className="button" onClick={() => duplicateTranslation(selectedPost)} type="button">
                          <Languages size={16} />
                          複製成另一語言草稿
                        </button>
                      </>
                    ) : null}

                    {blogEditorTab === "publish" ? (
                      <>
                        <div className="form-row">
                          <label>
                            <span>發布狀態</span>
                            <select
                              value={selectedPost.status}
                              onChange={(event) =>
                                updatePost(selectedPost.id, { status: event.target.value as BlogPost["status"] })
                              }
                            >
                              <option value="draft">草稿</option>
                              <option value="published">已發布</option>
                              <option value="archived">封存</option>
                            </select>
                          </label>
                          <label>
                            <span>審稿狀態</span>
                            <select
                              value={selectedPost.reviewStatus}
                              onChange={(event) =>
                                updatePost(selectedPost.id, {
                                  reviewStatus: event.target.value as BlogPost["reviewStatus"]
                                })
                              }
                            >
                              <option value="ai-draft">AI 草稿</option>
                              <option value="human-review">人工審稿</option>
                              <option value="needs-revision">需修改</option>
                              <option value="approved">已核准</option>
                            </select>
                          </label>
                        </div>
                        <div className="form-row">
                          <label>
                            <span>翻譯群組 ID</span>
                            <input
                              value={selectedPost.translationGroupId}
                              onChange={(event) =>
                                updatePost(selectedPost.id, { translationGroupId: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            <span>閱讀分鐘</span>
                            <input
                              type="number"
                              min={1}
                              value={selectedPost.readTimeMinutes}
                              onChange={(event) =>
                                updatePost(selectedPost.id, { readTimeMinutes: Number(event.target.value) })
                              }
                            />
                          </label>
                        </div>
                        <div className="form-row">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedPost.featured}
                              onChange={(event) => updatePost(selectedPost.id, { featured: event.target.checked })}
                            />
                            <span>設為精選文章</span>
                          </label>
                          <label>
                            <span>排序</span>
                            <input
                              type="number"
                              value={selectedPost.sortOrder}
                              onChange={(event) => updatePost(selectedPost.id, { sortOrder: Number(event.target.value) })}
                            />
                          </label>
                        </div>
                        <div className="quality-check-grid">
                          {[
                            ["hasHumanReview", "人工已審稿"],
                            ["hasQualityReviewerApproval", "品質審核通過"],
                            ["hasVisibleSources", "來源可見"],
                            ["hasSourceTrust", "來源可信"],
                            ["hasNoFabricatedClaims", "無捏造宣稱"],
                            ["hasSearchIntentAnswer", "有回答搜尋意圖"],
                            ["hasLabsPointOfView", "Labs 觀點"],
                            ["hasCreativeAngle", "創意角度"],
                            ["hasImageFit", "圖文符合"],
                            ["hasAntiSlopReview", "Anti-slop 通過"],
                            ["hasBilingualParity", "多語對齊"]
                          ].map(([field, label]) => (
                            <label className="checkbox-label" key={field}>
                              <input
                                type="checkbox"
                                checked={Boolean(selectedPost.qualityChecks[field as keyof BlogPost["qualityChecks"]])}
                                onChange={(event) =>
                                  updateQualityCheckField(
                                    selectedPost,
                                    field as keyof BlogPost["qualityChecks"],
                                    event.target.checked as never
                                  )
                                }
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                        <label>
                          <span>審稿備註</span>
                          <textarea
                            rows={3}
                            value={selectedPost.qualityChecks.notes || ""}
                            onChange={(event) => updateQualityCheckField(selectedPost, "notes", event.target.value)}
                          />
                        </label>
                        {typeof selectedPost.qualityChecks.qualityScore === "number" ? (
                          <div className="quality-review-summary">
                            <strong>品質分數 {selectedPost.qualityChecks.qualityScore}</strong>
                            {selectedPost.qualityChecks.qualityScoreBreakdown ? (
                              <div className="quality-score-breakdown">
                                {Object.entries(selectedPost.qualityChecks.qualityScoreBreakdown).map(([key, value]) => (
                                  <span key={key}>
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {selectedPost.qualityChecks.qualityIssues?.length ? (
                              <ul>
                                {selectedPost.qualityChecks.qualityIssues.map((issue) => (
                                  <li key={issue}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <span>沒有阻擋發布的品質問題。</span>
                            )}
                            {typeof selectedPost.qualityChecks.antiSlopScore === "number" ? (
                              <>
                                <strong>Anti-slop 分數 {selectedPost.qualityChecks.antiSlopScore}/50</strong>
                                {selectedPost.qualityChecks.antiSlopIssues?.length ? (
                                  <ul>
                                    {selectedPost.qualityChecks.antiSlopIssues.map((issue) => (
                                      <li key={issue}>{issue}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span>沒有偵測到明顯 AI 味寫作問題。</span>
                                )}
                              </>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="publish-readiness">
                          {publishReadiness(selectedPost).map((item) => (
                            <span className={item.ok ? "ready" : "missing"} key={item.label}>
                              {item.ok ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}

                    <div className="form-actions">
                      <button className="button primary" onClick={() => savePost(selectedPost)} type="button">
                        <Save size={16} />
                        儲存文章
                      </button>
                      <Link className="button" href={previewPath(selectedPost)} target="_blank">
                        <Eye size={16} />
                        預覽
                      </Link>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="admin-card blog-editor-panel empty">
                  <h2>尚未選取文章</h2>
                  <p className="muted">請從左側列表選一篇文章，或建立新的草稿。</p>
                </section>
              )}
            </section>
          </section>
        ) : null}

        {tab === "leads" ? (
          <section className="admin-card">
            <h2>表單名單</h2>
            <div className="admin-list">
              {data.contactLeads.length ? (
                data.contactLeads.map((lead) => (
                  <div className="project-detail-card" key={lead.id}>
                    <div className="form-row">
                      <div>
                        <span className={`status-pill ${lead.status}`}>{leadStatusLabels[lead.status]}</span>
                        <h3>{lead.who}</h3>
                        <p className="muted">{lead.contact}</p>
                        <p>{lead.message}</p>
                        <p className="muted">{new Date(lead.createdAt).toLocaleString("zh-TW")}</p>
                      </div>
                      <label>
                        <span>狀態</span>
                        <select value={lead.status} onChange={(event) => updateLead(lead.id, event.target.value as ContactLeadStatus)}>
                          <option value="new">新進</option>
                          <option value="contacted">已聯繫</option>
                          <option value="qualified">已確認</option>
                          <option value="closed">已結案</option>
                          <option value="spam">垃圾訊息</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">目前還沒有聯絡表單資料。</p>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
