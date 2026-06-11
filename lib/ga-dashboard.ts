import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isGaConfigured, isGtmConfigured } from "./analytics";
import { BLOG_LANGUAGES, blogPostPath } from "./blog-utils";
import { readCmsData } from "./cms";
import { siteUrl } from "./seo";
import type { BlogPost } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_GA4_ACCOUNT_ID = "396239716";
const DEFAULT_GA4_PROPERTY_ID = "539513224";
const AI_SOURCE_REGEX = /chatgpt|openai|perplexity|claude|anthropic|gemini|bard|copilot|you\.com|phind|poe|grok|mistral/i;
const LANGUAGE_PREFIXES = new Set(["en", "ja", "ko", "id", "vi", "th", "ms", "fil"]);

export type AnalyticsDashboard = Awaited<ReturnType<typeof buildAnalyticsDashboard>>;

function loadDotEnv(content: string) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (process.env[key]) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export async function loadAnalyticsEnvFiles() {
  if (process.env.NODE_ENV === "production" || process.env.K_SERVICE) return;
  const candidates = process.env.HOME ? [path.join(process.env.HOME, ".altoslab-blog-worker.env")] : [];
  for (const candidate of candidates) {
    try {
      loadDotEnv(await fs.readFile(candidate, "utf8"));
    } catch {
      // Missing local operator env files are normal.
    }
  }
}

function base64Url(input: string) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function googleAuthMode() {
  return String(process.env.GOOGLE_AUTH_MODE || "").trim().toLowerCase();
}

function shouldUseGoogleImpersonation() {
  const mode = googleAuthMode();
  return Boolean(process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT) && !["user", "gcloud-user", "adc", "application-default"].includes(mode);
}

function gcloudAccountArgs() {
  const account = String(process.env.GOOGLE_AUTH_ACCOUNT || "").trim();
  return account ? ["--account", account] : [];
}

async function googleAccessToken(scope: string) {
  const impersonatedServiceAccount = process.env.GOOGLE_IMPERSONATE_SERVICE_ACCOUNT;
  if (impersonatedServiceAccount && shouldUseGoogleImpersonation()) {
    try {
      const { stdout } = await execFileAsync("gcloud", ["auth", "print-access-token", ...gcloudAccountArgs()], { timeout: 12_000 });
      const callerToken = stdout.trim();
      if (!callerToken) return { ok: false, reason: "gcloud returned an empty caller token" };
      const response = await fetch(
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(impersonatedServiceAccount)}:generateAccessToken`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${callerToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ scope: [scope], lifetime: "3600s" }),
          signal: AbortSignal.timeout(12_000)
        }
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.accessToken) {
        return { ok: false, reason: json.error?.message || `service account impersonation failed ${response.status}` };
      }
      return { ok: true, accessToken: json.accessToken as string, provider: "service-account-impersonation" };
    } catch (error) {
      return { ok: false, reason: `service account impersonation failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (credentialsPath) {
    try {
      const credentials = JSON.parse(await fs.readFile(credentialsPath, "utf8"));
      if (!credentials.client_email || !credentials.private_key) {
        return { ok: false, reason: "Google service account JSON is missing client_email/private_key" };
      }
      const now = Math.floor(Date.now() / 1000);
      const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const claim = base64Url(
        JSON.stringify({
          iss: credentials.client_email,
          scope,
          aud: "https://oauth2.googleapis.com/token",
          iat: now,
          exp: now + 3600
        })
      );
      const signature = crypto
        .createSign("RSA-SHA256")
        .update(`${header}.${claim}`)
        .sign(credentials.private_key, "base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${header}.${claim}.${signature}`
        }),
        signal: AbortSignal.timeout(12_000)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.access_token) {
        return { ok: false, reason: json.error_description || json.error || `token request failed ${response.status}` };
      }
      return { ok: true, accessToken: json.access_token as string, provider: "service-account" };
    } catch (error) {
      return { ok: false, reason: `cannot read Google service account JSON: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  try {
    const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(1500)
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.access_token) {
      return { ok: true, accessToken: json.access_token as string, provider: "cloud-run-metadata" };
    }
  } catch {
    // Local machines usually do not expose the metadata server.
  }

  const gcloudCommands = [
    ["auth", "application-default", "print-access-token"],
    ["auth", "print-access-token", ...gcloudAccountArgs()]
  ];
  const failures: string[] = [];
  for (const args of gcloudCommands) {
    try {
      const { stdout } = await execFileAsync("gcloud", args, { timeout: 12_000 });
      const accessToken = stdout.trim();
      if (accessToken) return { ok: true, accessToken, provider: `gcloud-${args.join("-")}` };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    ok: false,
    reason: `GA4 credentials unavailable; service account, Cloud Run metadata and gcloud fallback did not return a token. ${failures.join(" | ")}`
  };
}

function numericMetric(row: { metricValues?: Array<{ value?: string }> }, index: number) {
  return Number(row.metricValues?.[index]?.value || 0);
}

function dimensionValue(row: { dimensionValues?: Array<{ value?: string }> }, index: number) {
  return row.dimensionValues?.[index]?.value || "";
}

function dateRange(days: number, offsetDays = 0) {
  if (offsetDays === 0) return { startDate: `${days}daysAgo`, endDate: "today" };
  const end = offsetDays + 1;
  const start = offsetDays + days;
  return { startDate: `${start}daysAgo`, endDate: `${end}daysAgo` };
}

function formatGaDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function normalizePath(value: string) {
  const clean = String(value || "").split("?")[0].replace(/\/+$/, "") || "/";
  return clean;
}

function isBlogPath(value: string) {
  const clean = normalizePath(value);
  if (clean === "/blog" || clean.startsWith("/blog/")) return true;
  const first = clean.split("/").filter(Boolean)[0];
  return Boolean(first && LANGUAGE_PREFIXES.has(first) && (clean === `/${first}/blog` || clean.startsWith(`/${first}/blog/`)));
}

async function runGaReport(accessToken: string, propertyId: string, body: unknown) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18_000)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || `GA4 runReport failed ${response.status}`);
  return json;
}

async function ga4Dashboard(days: number) {
  const propertyId = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID || DEFAULT_GA4_PROPERTY_ID;
  const accountId = process.env.GA4_ACCOUNT_ID || DEFAULT_GA4_ACCOUNT_ID;
  const token = await googleAccessToken("https://www.googleapis.com/auth/analytics.readonly");
  const analyticsUrl = `https://analytics.google.com/analytics/web/?authuser=1#/a${accountId}p${propertyId}/reports/start?params=_u..nav%3Dmaui`;
  if (!token.ok) {
    return {
      ok: false,
      configured: Boolean(propertyId),
      propertyId,
      provider: "",
      reason: token.reason,
      analyticsUrl,
      summary: null,
      trend: [],
      sources: [],
      aiSources: [],
      landingPages: [],
      blogLandingPages: [],
      events: []
    };
  }

  try {
    const metricNames = [
      "sessions",
      "totalUsers",
      "activeUsers",
      "engagedSessions",
      "screenPageViews",
      "eventCount",
      "userEngagementDuration"
    ];
    const [current, previous, trend, sources, landings, events] = await Promise.all([
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days)],
        metrics: metricNames.map((name) => ({ name }))
      }),
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days, days)],
        metrics: metricNames.map((name) => ({ name }))
      }),
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days)],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagedSessions" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: String(days + 2)
      }),
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days)],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "40"
      }),
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days)],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagedSessions" }, { name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "60"
      }),
      runGaReport(token.accessToken, propertyId, {
        dateRanges: [dateRange(days)],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: "40"
      })
    ]);

    const currentRow = current.rows?.[0] || {};
    const previousRow = previous.rows?.[0] || {};
    const summary = {
      sessions: numericMetric(currentRow, 0),
      totalUsers: numericMetric(currentRow, 1),
      activeUsers: numericMetric(currentRow, 2),
      engagedSessions: numericMetric(currentRow, 3),
      pageViews: numericMetric(currentRow, 4),
      eventCount: numericMetric(currentRow, 5),
      engagementSeconds: numericMetric(currentRow, 6),
      previousSessions: numericMetric(previousRow, 0),
      previousUsers: numericMetric(previousRow, 1),
      previousPageViews: numericMetric(previousRow, 4)
    };
    const sourceRows = (sources.rows || []).map((row: any) => ({
      source: dimensionValue(row, 0),
      medium: dimensionValue(row, 1),
      sessions: numericMetric(row, 0),
      users: numericMetric(row, 1),
      engagedSessions: numericMetric(row, 2)
    }));
    const landingRows = (landings.rows || []).map((row: any) => ({
      path: dimensionValue(row, 0),
      sessions: numericMetric(row, 0),
      users: numericMetric(row, 1),
      engagedSessions: numericMetric(row, 2),
      pageViews: numericMetric(row, 3)
    }));

    return {
      ok: true,
      configured: true,
      propertyId,
      provider: token.provider,
      reason: "",
      analyticsUrl,
      summary: {
        ...summary,
        engagementRate: percent(summary.engagedSessions, summary.sessions),
        avgEngagementSeconds: summary.sessions ? Math.round(summary.engagementSeconds / summary.sessions) : 0,
        sessionDelta: delta(summary.sessions, summary.previousSessions),
        userDelta: delta(summary.totalUsers, summary.previousUsers),
        pageViewDelta: delta(summary.pageViews, summary.previousPageViews)
      },
      trend: (trend.rows || []).map((row: any) => ({
        date: formatGaDate(dimensionValue(row, 0)),
        sessions: numericMetric(row, 0),
        users: numericMetric(row, 1),
        engagedSessions: numericMetric(row, 2),
        pageViews: numericMetric(row, 3)
      })),
      sources: sourceRows.slice(0, 12),
      aiSources: sourceRows.filter((row) => AI_SOURCE_REGEX.test(`${row.source} ${row.medium}`)).slice(0, 12),
      landingPages: landingRows.slice(0, 15),
      blogLandingPages: landingRows.filter((row) => isBlogPath(row.path)).slice(0, 15),
      events: (events.rows || []).map((row: any) => ({
        eventName: dimensionValue(row, 0),
        eventCount: numericMetric(row, 0),
        users: numericMetric(row, 1)
      }))
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      propertyId,
      provider: token.provider,
      reason: error instanceof Error ? error.message : String(error),
      analyticsUrl,
      summary: null,
      trend: [],
      sources: [],
      aiSources: [],
      landingPages: [],
      blogLandingPages: [],
      events: []
    };
  }
}

function taipeiDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(value);
}

function dateKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return taipeiDate(date);
}

function hostFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function groupByTranslation(posts: BlogPost[]) {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const key = post.translationGroupId || post.slug || post.id;
    groups.set(key, [...(groups.get(key) || []), post]);
  }
  return [...groups.values()];
}

function blogOpsDashboard(posts: BlogPost[], days: number, root: string) {
  const published = posts.filter((post) => post.status === "published");
  const groups = groupByTranslation(published);
  const today = taipeiDate();
  const recentDates = Array.from({ length: Math.min(days, 28) }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (Math.min(days, 28) - 1 - index));
    return taipeiDate(date);
  });
  const dailyPublishing = recentDates.map((date) => {
    const dayPosts = published.filter((post) => dateKey(post.publishedAt || post.updatedAt || post.createdAt) === date);
    const uniqueGroups = groupByTranslation(dayPosts);
    return {
      date,
      posts: dayPosts.length,
      groups: uniqueGroups.length,
      breakingGroups: uniqueGroups.filter((group) => group.some((post) => post.contentType === "breaking")).length,
      columnGroups: uniqueGroups.filter((group) => group.some((post) => post.contentType === "column")).length
    };
  });
  const languageCounts = BLOG_LANGUAGES.map((language) => {
    const languagePosts = published.filter((post) => post.language === language);
    return {
      language,
      total: languagePosts.length,
      breaking: languagePosts.filter((post) => post.contentType === "breaking").length,
      column: languagePosts.filter((post) => post.contentType === "column").length,
      todayColumn: languagePosts.filter(
        (post) => post.contentType === "column" && dateKey(post.publishedAt || post.updatedAt || post.createdAt) === today
      ).length
    };
  });
  const sourceCounts = new Map<string, number>();
  for (const group of groups) {
    const source = group.find((post) => post.sourceLinks?.[0]?.url)?.sourceLinks?.[0]?.url || "";
    const host = hostFromUrl(source);
    if (host) sourceCounts.set(host, (sourceCounts.get(host) || 0) + 1);
  }
  const latestGroups = groups
    .map((group) => {
      const zh = group.find((post) => post.language === "zh-Hant") || group[0];
      return {
        title: zh.title,
        type: zh.contentType || "column",
        languageCount: group.length,
        publishedAt: zh.publishedAt || zh.updatedAt || zh.createdAt,
        path: blogPostPath(zh),
        url: `${root}${blogPostPath(zh)}`,
        source: hostFromUrl(zh.sourceLinks?.[0]?.url || "")
      };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10);

  return {
    publishedPosts: published.length,
    translationGroups: groups.length,
    breakingGroups: groups.filter((group) => group.some((post) => post.contentType === "breaking")).length,
    columnGroups: groups.filter((group) => group.some((post) => post.contentType === "column")).length,
    heldPosts: posts.filter((post) => post.releaseDecision === "held_for_review" || post.status === "draft").length,
    qualityPassed: published.filter((post) => post.qualityStatus === "passed").length,
    imagePassed: published.filter((post) => post.imageQualityStatus === "passed").length,
    dailyPublishing,
    languageCounts,
    topSources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([host, count]) => ({ host, count })),
    latestGroups
  };
}

async function fetchText(url: string) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ALTOS-LAB-admin-analytics-dashboard/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000)
    });
    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - startedAt,
      text: await response.text(),
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      text: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function installHealth(root: string) {
  const expectedGtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-WJ96VR7V";
  const expectedGaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-5VSLFNVD28";
  const [home, blog, health] = await Promise.all([fetchText(root), fetchText(`${root}/blog`), fetchText(`${root}/api/health`)]);
  let healthJson: any = {};
  try {
    healthJson = health.text ? JSON.parse(health.text) : {};
  } catch {
    healthJson = {};
  }
  const pageProbe = (result: Awaited<ReturnType<typeof fetchText>>) => ({
    ok: result.ok,
    status: result.status,
    responseMs: result.ms,
    hasGtm: result.text.includes(expectedGtmId) || /googletagmanager\.com\/gtm\.js|googletagmanager\.com\/ns\.html/i.test(result.text),
    hasGa: result.text.includes(expectedGaId) || /gtag\s*\(|googletagmanager\.com\/gtag\/js|google-analytics\.com/i.test(result.text),
    error: result.error
  });
  const integrations = healthJson.integrations || {};
  return {
    expectedGtmId,
    expectedGaId,
    frontendConfigured: {
      gtm: isGtmConfigured(),
      ga: isGaConfigured()
    },
    home: pageProbe(home),
    blog: pageProbe(blog),
    health: {
      ok: health.ok,
      status: health.status,
      responseMs: health.ms,
      gtmConfigured: integrations.gtmConfigured === true,
      gaConfigured: integrations.gaConfigured === true,
      ga4PropertyConfigured: integrations.ga4PropertyConfigured === true,
      searchConsoleSiteConfigured: integrations.searchConsoleSiteConfigured === true,
      cmsProvider: healthJson.cmsStorage?.provider || "",
      autoPublishBlog: integrations.autoPublishBlog === true,
      legacyDeepSeekCronDisabled: integrations.legacyDeepSeekCronDisabled === true
    }
  };
}

export async function buildAnalyticsDashboard({ days = 28, baseUrl = "" }: { days?: number; baseUrl?: string } = {}) {
  await loadAnalyticsEnvFiles();
  const safeDays = [7, 28, 90].includes(days) ? days : 28;
  const root = (baseUrl || process.env.NEXT_PUBLIC_SITE_URL || process.env.ALTOS_BLOG_BASE_URL || siteUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const cms = await readCmsData();
  const [ga4, install] = await Promise.all([ga4Dashboard(safeDays), installHealth(root)]);
  const blog = blogOpsDashboard(cms.blogPosts || [], safeDays, root);
  const issues: string[] = [];
  if (!install.home.hasGtm || !install.blog.hasGtm || !install.health.gtmConfigured) issues.push("GTM 安裝狀態需要確認");
  if (!install.home.hasGa && !install.blog.hasGa && !install.health.gaConfigured && !install.health.ga4PropertyConfigured) {
    issues.push("前台尚未確認 GA 追蹤碼");
  }
  if (!ga4.ok) issues.push(`GA4 Data API 目前讀不到資料：${ga4.reason}`);
  if (!blog.languageCounts.every((row) => row.todayColumn >= 1)) issues.push("今日專欄尚未覆蓋全部語言");

  return {
    ok: issues.length === 0,
    generatedAt: new Date().toISOString(),
    baseUrl: root,
    days: safeDays,
    ga4,
    install,
    blog,
    issues,
    nextActions: issues.length
      ? issues.map((issue) => {
          if (issue.includes("GA4")) return "確認 Cloud Run 執行身分已具備 GA4 Property 的 Analytics Viewer 權限，或補上可讀 GA4 的服務帳號設定。";
          if (issue.includes("GTM")) return "確認首頁與 Blog 都有注入 GTM-WJ96VR7V；若環境變數剛調整，重新部署後再回來看這裡。";
          if (issue.includes("GA 追蹤碼")) return "確認 G-5VSLFNVD28 仍在首頁與 Blog 可見，並比對 GA 後台是否開始收事件。";
          if (issue.includes("今日專欄")) return "今天台北時間結束前補跑每日專欄 lane，發布後再用 release manifest 驗證九語同步。";
          return issue;
        })
      : ["維持每日巡檢；若要查 campaign 或單篇文章細節，再點右上角 GA 後台深入。"]
  };
}
