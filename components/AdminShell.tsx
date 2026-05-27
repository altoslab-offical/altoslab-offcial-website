"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sendGTMEvent } from "@next/third-parties/google";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Gauge,
  ImageIcon,
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
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { blogPostPath, languageLabel } from "@/lib/blog-utils";
import type {
  BlogGenerationSlot,
  BlogLanguage,
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

const slotLabels: Record<BlogGenerationSlot, string> = {
  manual: "手動",
  morning: "早上 09:00",
  afternoon: "下午 15:00"
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
  sendGTMEvent({
    event,
    admin_surface: "blog",
    ...payload
  });
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
    topic: "AI Agent 導入",
    keyword: "AI Agent",
    audience: "台灣中小企業主與營運主管",
    intent: "評估是否需要導入 AI 自動化"
  });
  const [blogFilters, setBlogFilters] = useState<{
    language: BlogFilterLanguage;
    status: BlogFilterStatus;
    review: BlogFilterReview;
    query: string;
  }>({
    language: "all",
    status: "all",
    review: "all",
    query: ""
  });
  const [blogEditorTab, setBlogEditorTab] = useState<BlogEditorTab>("content");

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
      needsReview: data.blogPosts.filter(
        (post) => post.reviewStatus === "ai-draft" || post.reviewStatus === "needs-revision"
      ).length
    }),
    [data.blogPosts]
  );

  const filteredBlogPosts = useMemo(() => {
    const query = blogFilters.query.trim().toLowerCase();
    return [...data.blogPosts]
      .filter((post) => {
        const matchesLanguage = blogFilters.language === "all" || post.language === blogFilters.language;
        const matchesStatus = blogFilters.status === "all" || post.status === blogFilters.status;
        const matchesReview = blogFilters.review === "all" || post.reviewStatus === blogFilters.review;
        const matchesQuery = query
          ? [post.title, post.slug, post.topic, post.excerpt, post.tags.join(" ")]
              .join(" ")
              .toLowerCase()
              .includes(query)
          : true;
        return matchesLanguage && matchesStatus && matchesReview && matchesQuery;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
  }, [blogFilters, data.blogPosts]);

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
          cover: "/geo-cover.png",
          coverAlt: "ALTOS LAB AI 文章主視覺"
        }
      )
    });
    setData((current) => ({ ...current, blogPosts: [payload.post, ...current.blogPosts] }));
    setSelectedPostId(payload.post.id);
    setTab("blog");
    return payload.post;
  }

  async function generatePost() {
    setMessage("正在產生成對中英文部落格草稿...");
    setError("");
    try {
      const payload = await api<{ posts: BlogPost[]; post?: BlogPost; provider?: string; warning?: string }>(
        "/api/admin/blog/generate",
        {
          method: "POST",
          body: JSON.stringify(generator)
        }
      );
      const created: BlogPost[] = [];
      for (const post of payload.posts || (payload.post ? [payload.post] : [])) {
        created.push(await createPost(post));
      }
      setSelectedPostId(created[0]?.id || selectedPostId);
      trackAdminBlogEvent("ai_blog_draft_generated", {
        post_count: created.length,
        provider: payload.provider || "unknown",
        languages: created.map((post) => post.language).join(","),
        translation_group_id: created[0]?.translationGroupId || ""
      });
      setMessage(
        payload.warning ||
          `已產生 ${created.length} 篇 ${payload.provider || "AI"} 部落格草稿，請完成審稿後再發佈。`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "產生失敗");
    }
  }

  async function duplicateTranslation(post: BlogPost) {
    const language = post.language === "en" ? "zh-Hant" : "en";
    const payload = await api<{ post: BlogPost }>("/api/admin/blog", {
      method: "POST",
      body: JSON.stringify({
        ...post,
        id: undefined,
        status: "draft",
        language,
        title: `${post.title} (${languageLabel(language)})`,
        slug: `${post.slug}-${language === "en" ? "en" : "zh"}`,
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
    return `${statusLabels[post.status]} · ${languageLabel(post.language)} · ${reviewLabels[post.reviewStatus]}`;
  }

  function updateSourceLinks(post: BlogPost, value: unknown) {
    updatePost(post.id, { sourceLinks: value as BlogPost["sourceLinks"] });
  }

  function updateQualityChecks(post: BlogPost, value: unknown) {
    updatePost(post.id, { qualityChecks: value as BlogPost["qualityChecks"] });
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
    return [
      { label: "有文章標題與 slug", ok: Boolean(post.title && post.slug) },
      { label: "有 SEO title / description", ok: Boolean(post.seoTitle && post.seoDescription) },
      { label: "有 GEO 回答摘要", ok: Boolean(post.geoSummary) },
      { label: "有封面圖與 alt", ok: Boolean(post.cover && post.coverAlt) },
      { label: "有可見 FAQ", ok: post.faqs.length > 0 },
      { label: "AI 草稿有來源連結", ok: !post.generatedBy || post.sourceLinks.length > 0 },
      { label: "人工已審稿", ok: !post.generatedBy || post.qualityChecks.hasHumanReview }
    ];
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
            <span>ALTOS LAB 後台</span>
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
          <section className="stats-grid">
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
          </section>
        ) : null}

        {tab === "pages" && selectedPage ? (
          <section className="admin-grid">
            <aside className="admin-card">
              <h2>Pages</h2>
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
                    <span className={`status-pill ${page.status}`}>{page.status}</span>
                  </button>
                ))}
              </div>
            </aside>
            <section className="admin-card">
              <h2>Home Page CMS</h2>
              <div className="admin-form">
                <div className="form-row">
                  <label>
                    <span>Title</span>
                    <input value={selectedPage.title} onChange={(event) => updatePage(selectedPage.id, { title: event.target.value })} />
                  </label>
                  <label>
                    <span>Slug</span>
                    <input value={selectedPage.slug} onChange={(event) => updatePage(selectedPage.id, { slug: event.target.value })} />
                  </label>
                </div>
                <label>
                  <span>SEO Title</span>
                  <input
                    value={selectedPage.seoTitle || ""}
                    onChange={(event) => updatePage(selectedPage.id, { seoTitle: event.target.value })}
                  />
                </label>
                <label>
                  <span>SEO Description</span>
                  <textarea
                    rows={3}
                    value={selectedPage.seoDescription || ""}
                    onChange={(event) => updatePage(selectedPage.id, { seoDescription: event.target.value })}
                  />
                </label>
                <JsonField
                  label="Sections JSON（可調整前台所有區塊、排序、文案與重複項目）"
                  value={selectedPage.sections}
                  onChange={(value) => updatePage(selectedPage.id, { sections: value as SitePage["sections"] })}
                />
                <div className="form-actions">
                  <button className="button primary" onClick={() => savePage(selectedPage)} type="button">
                    <Save size={16} />
                    Save page
                  </button>
                  <Link className="button" href="/" target="_blank">
                    Preview
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
                <h2>Projects</h2>
                <button className="button primary" onClick={createProject} type="button" aria-label="Create project">
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
                    <span className={`status-pill ${project.status}`}>{project.status}</span>
                  </button>
                ))}
              </div>
            </aside>
            {selectedProject ? (
              <section className="admin-card">
                <h2>Project Editor</h2>
                <div className="admin-form">
                  <div className="form-row">
                    <label>
                      <span>Title</span>
                      <input
                        value={selectedProject.title}
                        onChange={(event) => updateProject(selectedProject.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Slug</span>
                      <input
                        value={selectedProject.slug}
                        onChange={(event) => updateProject(selectedProject.id, { slug: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span>Status</span>
                      <select
                        value={selectedProject.status}
                        onChange={(event) => updateProject(selectedProject.id, { status: event.target.value as Project["status"] })}
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                        <option value="archived">archived</option>
                      </select>
                    </label>
                    <label>
                      <span>Tag</span>
                      <input
                        value={selectedProject.tag}
                        onChange={(event) => updateProject(selectedProject.id, { tag: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Cover URL</span>
                    <input
                      value={selectedProject.cover}
                      onChange={(event) => updateProject(selectedProject.id, { cover: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      rows={3}
                      value={selectedProject.desc}
                      onChange={(event) => updateProject(selectedProject.id, { desc: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Detail</span>
                    <textarea
                      rows={5}
                      value={selectedProject.detail}
                      onChange={(event) => updateProject(selectedProject.id, { detail: event.target.value })}
                    />
                  </label>
                  <JsonField label="Gallery JSON" value={selectedProject.gallery} onChange={(value) => updateProject(selectedProject.id, { gallery: value as string[] })} />
                  <JsonField label="Metrics JSON" value={selectedProject.metrics} onChange={(value) => updateProject(selectedProject.id, { metrics: value as Project["metrics"] })} />
                  <JsonField label="Tech JSON" value={selectedProject.tech} onChange={(value) => updateProject(selectedProject.id, { tech: value as string[] })} />
                  <JsonField
                    label="Product Page JSON"
                    value={selectedProject.productPage}
                    onChange={(value) => updateProject(selectedProject.id, { productPage: value as Project["productPage"] })}
                  />
                  <div className="form-actions">
                    <button className="button primary" onClick={() => saveProject(selectedProject)} type="button">
                      <Save size={16} />
                      Save project
                    </button>
                    <Link className="button" href={`/projects/${selectedProject.slug}`} target="_blank">
                      Preview
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {tab === "blog" ? (
          <section className="blog-workbench">
            <header className="blog-workbench-header">
              <div>
                <p className="eyebrow">Blog CMS · SEO / GEO</p>
                <h1>部落格內容營運台</h1>
                <p className="muted">
                  參考 Ghost 與 Medium 的寫作流程，把產文、審稿、SEO/GEO、來源、預覽與發布檢查拆成可操作的工作區。
                </p>
              </div>
              <div className="admin-actions-stack">
                <button className="button primary" onClick={generatePost} type="button">
                  <Sparkles size={16} />
                  AI 產生中英草稿
                </button>
                <button className="button" onClick={() => createPost()} type="button">
                  <Plus size={16} />
                  新增空白文章
                </button>
              </div>
            </header>

            <div className="blog-ops-strip">
              <article>
                <CalendarClock size={17} />
                <div>
                  <strong>每日早晚自動產文</strong>
                  <span>09:00 / 15:00 台灣時間，各產生一組中英文草稿</span>
                </div>
              </article>
              <article>
                <ShieldCheck size={17} />
                <div>
                  <strong>安全審稿模式</strong>
                  <span>AI 文章預設是草稿，發布前需要人工確認來源與品牌觀點</span>
                </div>
              </article>
              <article>
                <ImageIcon size={17} />
                <div>
                  <strong>圖文完整</strong>
                  <span>自動草稿會套用 ALTOS LAB 自有封面素材與 alt text</span>
                </div>
              </article>
            </div>

            <section className="blog-workbench-grid">
              <aside className="blog-sidebar">
                <section className="admin-card blog-generator-panel">
                  <h2>AI 草稿設定</h2>
                  <p className="muted">手動產生時可指定主題；每日排程會自動從 AI / 搜尋 / 產品趨勢來源抓題材。</p>
                  <div className="admin-form">
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
                    <button className="button primary" onClick={generatePost} type="button">
                      <Sparkles size={16} />
                      產生中英草稿
                    </button>
                  </div>
                </section>

                <section className="admin-card">
                  <div className="blog-filter-title">
                    <Search size={16} />
                    <h2>文章列表</h2>
                  </div>
                  <div className="blog-stat-row">
                    <span>{blogStats.total} 全部</span>
                    <span>{blogStats.drafts} 草稿</span>
                    <span>{blogStats.published} 已發布</span>
                    <span>{blogStats.needsReview} 待審</span>
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
                          <option value="zh-Hant">繁體中文</option>
                          <option value="en">English</option>
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
                      filteredBlogPosts.map((post) => (
                        <button
                          className={post.id === selectedPost?.id ? "active" : ""}
                          key={post.id}
                          onClick={() => setSelectedPostId(post.id)}
                          type="button"
                        >
                          <span className="blog-list-row-top">
                            <strong>{post.title}</strong>
                            <span className={`status-pill ${post.status}`}>{statusLabels[post.status]}</span>
                          </span>
                          <span className="blog-list-meta">
                            {languageLabel(post.language)} · {reviewLabels[post.reviewStatus]} ·{" "}
                            {slotLabels[post.generationSlot || "manual"]}
                          </span>
                        </button>
                      ))
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
                            <span>Slug</span>
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
                                updatePost(selectedPost.id, { language: event.target.value as BlogPost["language"] })
                              }
                            >
                              <option value="zh-Hant">繁體中文</option>
                              <option value="en">English</option>
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
                        <JsonField
                          label="重點摘要 JSON"
                          value={selectedPost.keyTakeaways}
                          onChange={(value) => updatePost(selectedPost.id, { keyTakeaways: value as string[] })}
                        />
                      </>
                    ) : null}

                    {blogEditorTab === "seo" ? (
                      <>
                        <label>
                          <span>SEO Title</span>
                          <input
                            value={selectedPost.seoTitle || ""}
                            onChange={(event) => updatePost(selectedPost.id, { seoTitle: event.target.value })}
                          />
                        </label>
                        <label>
                          <span>SEO Description</span>
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
                        <JsonField
                          label="FAQ JSON（頁面可見時才會輸出 FAQ schema）"
                          value={selectedPost.faqs}
                          onChange={(value) => updatePost(selectedPost.id, { faqs: value as BlogPost["faqs"] })}
                        />
                        <JsonField
                          label="Source links JSON（AI 草稿發布前必須有來源）"
                          value={selectedPost.sourceLinks}
                          onChange={(value) => updateSourceLinks(selectedPost, value)}
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
                            <span>Translation group ID</span>
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
                            ["hasVisibleSources", "來源可見"],
                            ["hasNoFabricatedClaims", "無捏造宣稱"],
                            ["hasSearchIntentAnswer", "有回答搜尋意圖"],
                            ["hasBilingualParity", "中英文對齊"]
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
            <h2>Contact Leads</h2>
            <div className="admin-list">
              {data.contactLeads.length ? (
                data.contactLeads.map((lead) => (
                  <div className="project-detail-card" key={lead.id}>
                    <div className="form-row">
                      <div>
                        <span className={`status-pill ${lead.status}`}>{lead.status}</span>
                        <h3>{lead.who}</h3>
                        <p className="muted">{lead.contact}</p>
                        <p>{lead.message}</p>
                        <p className="muted">{new Date(lead.createdAt).toLocaleString("zh-TW")}</p>
                      </div>
                      <label>
                        <span>Status</span>
                        <select value={lead.status} onChange={(event) => updateLead(lead.id, event.target.value as ContactLeadStatus)}>
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="qualified">qualified</option>
                          <option value="closed">closed</option>
                          <option value="spam">spam</option>
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
