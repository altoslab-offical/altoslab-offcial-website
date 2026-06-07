"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ExternalLink,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  TrendingUp
} from "lucide-react";

type Dashboard = {
  ok: boolean;
  generatedAt: string;
  baseUrl: string;
  days: number;
  issues: string[];
  nextActions: string[];
  ga4: {
    ok: boolean;
    configured: boolean;
    propertyId: string;
    provider: string;
    reason: string;
    analyticsUrl: string;
    summary: null | {
      sessions: number;
      totalUsers: number;
      activeUsers: number;
      engagedSessions: number;
      pageViews: number;
      eventCount: number;
      engagementRate: number;
      avgEngagementSeconds: number;
      sessionDelta: number;
      userDelta: number;
      pageViewDelta: number;
    };
    trend: Array<{ date: string; sessions: number; users: number; engagedSessions: number; pageViews: number }>;
    sources: Array<{ source: string; medium: string; sessions: number; users: number; engagedSessions: number }>;
    aiSources: Array<{ source: string; medium: string; sessions: number; users: number; engagedSessions: number }>;
    landingPages: Array<{ path: string; sessions: number; users: number; engagedSessions: number; pageViews: number }>;
    blogLandingPages: Array<{ path: string; sessions: number; users: number; engagedSessions: number; pageViews: number }>;
    events: Array<{ eventName: string; eventCount: number; users: number }>;
  };
  install: {
    expectedGtmId: string;
    expectedGaId: string;
    frontendConfigured: { gtm: boolean; ga: boolean };
    home: { ok: boolean; status: number; responseMs: number; hasGtm: boolean; hasGa: boolean; error: string };
    blog: { ok: boolean; status: number; responseMs: number; hasGtm: boolean; hasGa: boolean; error: string };
    health: {
      ok: boolean;
      status: number;
      responseMs: number;
      gtmConfigured: boolean;
      gaConfigured: boolean;
      ga4PropertyConfigured: boolean;
      searchConsoleSiteConfigured: boolean;
      cmsProvider: string;
      autoPublishBlog: boolean;
      legacyDeepSeekCronDisabled: boolean;
    };
  };
  blog: {
    publishedPosts: number;
    translationGroups: number;
    breakingGroups: number;
    columnGroups: number;
    heldPosts: number;
    qualityPassed: number;
    imagePassed: number;
    dailyPublishing: Array<{ date: string; posts: number; groups: number; breakingGroups: number; columnGroups: number }>;
    languageCounts: Array<{ language: string; total: number; breaking: number; column: number; todayColumn: number }>;
    topSources: Array<{ host: string; count: number }>;
    latestGroups: Array<{ title: string; type: string; languageCount: number; publishedAt: string; path: string; url: string; source: string }>;
  };
};

const numberFormatter = new Intl.NumberFormat("zh-TW");
const compactFormatter = new Intl.NumberFormat("zh-TW", { notation: "compact", maximumFractionDigits: 1 });

function formatNumber(value?: number) {
  return numberFormatter.format(Math.round(value || 0));
}

function formatCompact(value?: number) {
  return compactFormatter.format(Math.round(value || 0));
}

function formatDateTime(value?: string) {
  if (!value) return "尚未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未更新";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function Delta({ value }: { value?: number }) {
  const safe = Number(value || 0);
  const label = `${safe > 0 ? "+" : ""}${safe}%`;
  return <span className={`analytics-delta ${safe >= 0 ? "up" : "down"}`}>{label}</span>;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`analytics-status ${ok ? "ok" : "attention"}`}>
      {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  delta
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  delta?: number;
}) {
  return (
    <article className="analytics-kpi">
      <div className="analytics-kpi-head">
        <Icon size={16} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>
        {helper}
        {typeof delta === "number" ? <Delta value={delta} /> : null}
      </p>
    </article>
  );
}

function BarList<T>({
  items,
  getLabel,
  getValue,
  getMeta,
  emptyText
}: {
  items: T[];
  getLabel: (item: T) => string;
  getValue: (item: T) => number;
  getMeta?: (item: T) => string;
  emptyText: string;
}) {
  const max = Math.max(...items.map(getValue), 1);
  if (!items.length) return <p className="muted">{emptyText}</p>;
  return (
    <div className="analytics-bar-list">
      {items.map((item, index) => {
        const value = getValue(item);
        return (
          <div className="analytics-bar-row" key={`${getLabel(item)}-${index}`}>
            <div className="analytics-bar-label">
              <span>{getLabel(item)}</span>
              <small>{getMeta?.(item) || ""}</small>
            </div>
            <div className="analytics-bar-track" aria-hidden="true">
              <span style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
            <strong>{formatCompact(value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function TrendBars({ rows }: { rows: Dashboard["ga4"]["trend"] }) {
  const max = Math.max(...rows.map((row) => row.sessions), 1);
  if (!rows.length) return <p className="muted">GA4 尚未回傳趨勢資料。</p>;
  return (
    <div className="analytics-trend" aria-label="Daily session trend">
      {rows.map((row) => (
        <div className="analytics-trend-day" key={row.date}>
          <span style={{ height: `${Math.max(8, (row.sessions / max) * 100)}%` }} />
          <small>{row.date.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}

function PublishingBars({ rows }: { rows: Dashboard["blog"]["dailyPublishing"] }) {
  const max = Math.max(...rows.map((row) => row.groups), 1);
  return (
    <div className="analytics-trend publishing" aria-label="Publishing cadence">
      {rows.map((row) => (
        <div className="analytics-trend-day" key={row.date}>
          <span style={{ height: `${Math.max(8, (row.groups / max) * 100)}%` }} />
          <small>{row.date.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "GA 監控資料載入失敗");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "GA 監控資料載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const summary = data?.ga4.summary;
  const aiSessions = useMemo(() => data?.ga4.aiSources.reduce((sum, row) => sum + row.sessions, 0) || 0, [data]);
  const blogSessions = useMemo(() => data?.ga4.blogLandingPages.reduce((sum, row) => sum + row.sessions, 0) || 0, [data]);

  return (
    <section className="admin-dashboard analytics-dashboard">
      <header className="admin-page-head analytics-hero">
        <div>
          <p className="eyebrow">GA 監控</p>
          <h1>網站成效與內容營運儀表板</h1>
          <p className="muted">用 GA4、GTM/GA 安裝狀態與部落格發布資料，集中監控流量、AI 來源、熱門文章與每日內容產能。</p>
        </div>
        <div className="analytics-actions">
          <div className="analytics-range" aria-label="Date range">
            {[7, 28, 90].map((value) => (
              <button className={days === value ? "active" : ""} key={value} onClick={() => setDays(value)} type="button">
                {value} 天
              </button>
            ))}
          </div>
          <button className="button" disabled={loading} onClick={refresh} type="button">
            <RefreshCw size={16} />
            更新
          </button>
          {data?.ga4.analyticsUrl ? (
            <Link className="button" href={data.ga4.analyticsUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={16} />
              GA 後台
            </Link>
          ) : null}
        </div>
      </header>

      {error ? <p className="form-message error">{error}</p> : null}
      {loading && !data ? <p className="muted">正在讀取 GA4 與部落格監控資料...</p> : null}

      {data ? (
        <>
          <section className="analytics-status-strip" aria-label="Monitoring health">
            <StatusPill ok={data.ok} label={data.ok ? "營運正常" : "需要注意"} />
            <StatusPill ok={data.install.home.hasGtm && data.install.blog.hasGtm} label="GTM 前台" />
            <StatusPill ok={data.install.health.ga4PropertyConfigured} label="GA4 Property" />
            <StatusPill ok={data.ga4.ok} label="GA4 Data API" />
            <StatusPill ok={data.blog.languageCounts.every((row) => row.todayColumn >= 1)} label="今日專欄" />
            <span className="analytics-freshness">更新 {formatDateTime(data.generatedAt)}</span>
          </section>

          {data.issues.length ? (
            <section className="analytics-alert admin-card">
              <h2>需要處理</h2>
              <ul>
                {data.nextActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="analytics-kpi-grid">
            <KpiCard
              icon={Activity}
              label="造訪次數"
              value={summary ? formatNumber(summary.sessions) : "未可讀"}
              helper="最近區間總造訪"
              delta={summary?.sessionDelta}
            />
            <KpiCard
              icon={TrendingUp}
              label="使用者"
              value={summary ? formatNumber(summary.totalUsers) : "未可讀"}
              helper="總使用者"
              delta={summary?.userDelta}
            />
            <KpiCard
              icon={BarChart3}
              label="頁面瀏覽"
              value={summary ? formatNumber(summary.pageViews) : "未可讀"}
              helper="頁面瀏覽"
              delta={summary?.pageViewDelta}
            />
            <KpiCard
              icon={Bot}
              label="AI 推薦"
              value={data.ga4.ok ? formatNumber(aiSessions) : "未可讀"}
              helper="ChatGPT、Perplexity、Gemini 等來源"
            />
            <KpiCard
              icon={Newspaper}
              label="Blog 造訪"
              value={data.ga4.ok ? formatNumber(blogSessions) : "未可讀"}
              helper="以 /blog 為 landing 的造訪"
            />
            <KpiCard
              icon={ShieldCheck}
              label="互動率"
              value={summary ? `${summary.engagementRate}%` : "未可讀"}
              helper={summary ? `平均互動 ${summary.avgEngagementSeconds} 秒` : data.ga4.reason || "GA4 Data API 尚未可讀"}
            />
          </section>

          <section className="analytics-grid-two">
            <article className="admin-card analytics-panel">
              <header>
                <h2>流量趨勢</h2>
                <span>{data.days} 天</span>
              </header>
              <TrendBars rows={data.ga4.trend} />
            </article>
            <article className="admin-card analytics-panel">
              <header>
                <h2>內容發布節奏</h2>
                <span>翻譯群組</span>
              </header>
              <PublishingBars rows={data.blog.dailyPublishing} />
            </article>
          </section>

          <section className="analytics-grid-two">
            <article className="admin-card analytics-panel">
              <header>
                <h2>來源 / 媒介</h2>
                <span>sessions</span>
              </header>
              <BarList
                items={data.ga4.sources}
                getLabel={(item) => `${item.source || "(not set)"} / ${item.medium || "(not set)"}`}
                getValue={(item) => item.sessions}
                getMeta={(item) => `${formatNumber(item.users)} users`}
                emptyText={data.ga4.ok ? "尚無來源資料。" : data.ga4.reason}
              />
            </article>
            <article className="admin-card analytics-panel">
              <header>
                <h2>AI 來源</h2>
                <span>answer engine</span>
              </header>
              <BarList
                items={data.ga4.aiSources}
                getLabel={(item) => `${item.source || "(not set)"} / ${item.medium || "(not set)"}`}
                getValue={(item) => item.sessions}
                getMeta={(item) => `${formatNumber(item.engagedSessions)} engaged`}
                emptyText={data.ga4.ok ? "目前沒有 AI referral session。" : data.ga4.reason}
              />
            </article>
          </section>

          <section className="analytics-grid-two">
            <article className="admin-card analytics-panel">
              <header>
                <h2>熱門 Landing Page</h2>
                <span>sessions</span>
              </header>
              <BarList
                items={data.ga4.landingPages}
                getLabel={(item) => item.path || "/"}
                getValue={(item) => item.sessions}
                getMeta={(item) => `${formatNumber(item.pageViews)} views`}
                emptyText={data.ga4.ok ? "尚無 landing page 資料。" : data.ga4.reason}
              />
            </article>
            <article className="admin-card analytics-panel">
              <header>
                <h2>Blog Landing Page</h2>
                <span>sessions</span>
              </header>
              <BarList
                items={data.ga4.blogLandingPages}
                getLabel={(item) => item.path || "/blog"}
                getValue={(item) => item.sessions}
                getMeta={(item) => `${formatNumber(item.engagedSessions)} engaged`}
                emptyText={data.ga4.ok ? "最近區間沒有 /blog landing session。" : data.ga4.reason}
              />
            </article>
          </section>

          <section className="analytics-grid-two">
            <article className="admin-card analytics-panel">
              <header>
                <h2>多語內容庫</h2>
                <span>{formatNumber(data.blog.translationGroups)} groups</span>
              </header>
              <div className="analytics-language-table">
                {data.blog.languageCounts.map((row) => (
                  <div key={row.language}>
                    <strong>{row.language}</strong>
                    <span>{formatNumber(row.total)} total</span>
                    <span>{formatNumber(row.breaking)} news</span>
                    <span>{formatNumber(row.column)} column</span>
                    <StatusPill ok={row.todayColumn >= 1} label={`today ${row.todayColumn}`} />
                  </div>
                ))}
              </div>
            </article>
            <article className="admin-card analytics-panel">
              <header>
                <h2>新聞來源分布</h2>
                <span>groups</span>
              </header>
              <BarList
                items={data.blog.topSources}
                getLabel={(item) => item.host}
                getValue={(item) => item.count}
                emptyText="目前沒有來源分布資料。"
              />
            </article>
          </section>

          <section className="admin-card analytics-panel">
            <header>
              <h2>最近發布</h2>
              <span>{data.blog.publishedPosts} published posts</span>
            </header>
            <div className="analytics-latest-list">
              {data.blog.latestGroups.map((post) => (
                <Link href={post.url} key={`${post.path}-${post.publishedAt}`} rel="noreferrer" target="_blank">
                  <span className={`tag-pill type-${post.type}`}>{post.type === "breaking" ? "市場快訊" : post.type === "column" ? "專欄" : "專題"}</span>
                  <strong>{post.title}</strong>
                  <small>
                    {formatDateTime(post.publishedAt)} · {post.languageCount} 語 · {post.source || "ALTOS LAB"}
                  </small>
                </Link>
              ))}
            </div>
          </section>

          <section className="admin-card analytics-panel">
            <header>
              <h2>追蹤碼與系統狀態</h2>
              <span>{data.baseUrl}</span>
            </header>
            <div className="analytics-health-grid">
              <StatusPill ok={data.install.home.hasGtm} label={`首頁 GTM ${data.install.expectedGtmId}`} />
              <StatusPill ok={data.install.blog.hasGtm} label="Blog GTM" />
              <StatusPill ok={data.install.home.hasGa || data.install.blog.hasGa || data.install.health.gaConfigured} label={`GA ${data.install.expectedGaId}`} />
              <StatusPill ok={data.install.health.ga4PropertyConfigured} label={`Property ${data.ga4.propertyId}`} />
              <StatusPill ok={data.install.health.autoPublishBlog} label="自動發布" />
              <StatusPill ok={data.install.health.legacyDeepSeekCronDisabled} label="Legacy cron disabled" />
              <StatusPill ok={Boolean(data.install.health.cmsProvider)} label={`CMS ${data.install.health.cmsProvider || "unknown"}`} />
              <StatusPill ok={data.install.health.searchConsoleSiteConfigured} label="Search Console" />
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
