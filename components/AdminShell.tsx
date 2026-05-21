"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Plus,
  Save,
  Sparkles,
  Users
} from "lucide-react";
import type { BlogPost, CmsData, ContactLeadStatus, Project, SitePage } from "@/lib/types";

type Tab = "dashboard" | "pages" | "projects" | "blog" | "leads";

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

function makeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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
      body: JSON.stringify(input || { title: "New AI Blog Post", status: "draft" })
    });
    setData((current) => ({ ...current, blogPosts: [payload.post, ...current.blogPosts] }));
    setSelectedPostId(payload.post.id);
    setTab("blog");
  }

  async function generatePost() {
    setMessage("正在產生部落格草稿...");
    setError("");
    try {
      const payload = await api<{ post: BlogPost; warning?: string }>("/api/admin/blog/generate", {
        method: "POST",
        body: JSON.stringify(generator)
      });
      await createPost(payload.post);
      setMessage(payload.warning || "已產生 AI 部落格草稿，請審稿後再發佈。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "產生失敗");
    }
  }

  async function savePost(post: BlogPost) {
    setMessage("");
    setError("");
    try {
      const payload = await api<{ post: BlogPost }>(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify(post)
      });
      updatePost(post.id, payload.post);
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
            <span>ALTOS LAB Admin</span>
          </Link>
          <button className="button" onClick={logout} type="button">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-tabs">
          {[
            ["dashboard", "Dashboard", LayoutDashboard],
            ["pages", "Pages", FileText],
            ["projects", "Projects", Gauge],
            ["blog", "Blog", Newspaper],
            ["leads", "Leads", Users]
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
        {loading ? <p className="muted">Loading CMS data...</p> : null}

        {tab === "dashboard" ? (
          <section className="stats-grid">
            {[
              ["Pages", counts.pages],
              ["Projects", counts.projects],
              ["Published projects", counts.publishedProjects],
              ["Drafts", counts.drafts],
              ["Blog posts", counts.posts],
              ["Contact leads", counts.leads]
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
          <section className="admin-grid">
            <aside className="admin-card">
              <h2>AI Blog Generator</h2>
              <div className="admin-form">
                <label>
                  <span>Topic</span>
                  <input value={generator.topic} onChange={(event) => setGenerator({ ...generator, topic: event.target.value })} />
                </label>
                <label>
                  <span>Primary keyword</span>
                  <input value={generator.keyword} onChange={(event) => setGenerator({ ...generator, keyword: event.target.value })} />
                </label>
                <label>
                  <span>Audience</span>
                  <input value={generator.audience} onChange={(event) => setGenerator({ ...generator, audience: event.target.value })} />
                </label>
                <button className="button primary" onClick={generatePost} type="button">
                  <Sparkles size={16} />
                  Generate draft
                </button>
                <button className="button" onClick={() => createPost()} type="button">
                  <Plus size={16} />
                  Blank post
                </button>
              </div>
              <hr style={{ borderColor: "var(--al-border)", margin: "20px 0" }} />
              <div className="admin-list">
                {data.blogPosts.map((post) => (
                  <button
                    className={post.id === selectedPost?.id ? "active" : ""}
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    type="button"
                  >
                    <strong>{post.title}</strong>
                    <br />
                    <span className={`status-pill ${post.status}`}>{post.status}</span>
                  </button>
                ))}
              </div>
            </aside>
            {selectedPost ? (
              <section className="admin-card">
                <h2>Blog Editor</h2>
                <div className="admin-form">
                  <div className="form-row">
                    <label>
                      <span>Title</span>
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
                      <span>Status</span>
                      <select
                        value={selectedPost.status}
                        onChange={(event) => updatePost(selectedPost.id, { status: event.target.value as BlogPost["status"] })}
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                        <option value="archived">archived</option>
                      </select>
                    </label>
                    <label>
                      <span>Tags (comma separated)</span>
                      <input
                        value={selectedPost.tags.join(", ")}
                        onChange={(event) =>
                          updatePost(selectedPost.id, {
                            tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean)
                          })
                        }
                      />
                    </label>
                  </div>
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
                    <span>Excerpt</span>
                    <textarea
                      rows={3}
                      value={selectedPost.excerpt}
                      onChange={(event) => updatePost(selectedPost.id, { excerpt: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>GEO answer summary</span>
                    <textarea
                      rows={3}
                      value={selectedPost.geoSummary}
                      onChange={(event) => updatePost(selectedPost.id, { geoSummary: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Body (Markdown-lite: use ## headings)</span>
                    <textarea
                      rows={14}
                      value={selectedPost.body}
                      onChange={(event) => updatePost(selectedPost.id, { body: event.target.value })}
                    />
                  </label>
                  <JsonField
                    label="Key takeaways JSON"
                    value={selectedPost.keyTakeaways}
                    onChange={(value) => updatePost(selectedPost.id, { keyTakeaways: value as string[] })}
                  />
                  <JsonField
                    label="FAQ JSON（會產生 FAQPage structured data）"
                    value={selectedPost.faqs}
                    onChange={(value) => updatePost(selectedPost.id, { faqs: value as BlogPost["faqs"] })}
                  />
                  <div className="form-actions">
                    <button className="button primary" onClick={() => savePost(selectedPost)} type="button">
                      <Save size={16} />
                      Save post
                    </button>
                    <Link className="button" href={`/blog/${selectedPost.slug}`} target="_blank">
                      Preview
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}
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
