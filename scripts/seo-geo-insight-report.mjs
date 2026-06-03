#!/usr/bin/env node

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_FROM = "Altoslab447@gmail.com";
const DEFAULT_TO = "Altoslab.offical@gmail.com";
const DEFAULT_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const execFileAsync = promisify(execFile);
const LANGUAGE_PREFIX = {
  "zh-Hant": "",
  en: "/en",
  ja: "/ja",
  ko: "/ko",
  id: "/id",
  vi: "/vi",
  th: "/th",
  ms: "/ms",
  fil: "/fil"
};
const AI_SOURCE_REGEX = /chatgpt|openai|perplexity|claude|anthropic|gemini|bard|copilot|you\.com|phind|poe|grok|mistral/i;

function blogIndexPathForLanguage(language) {
  if (Object.prototype.hasOwnProperty.call(LANGUAGE_PREFIX, language)) return `${LANGUAGE_PREFIX[language]}/blog`.replace(/^\/blog$/, "/blog");
  return `/${language}/blog`;
}

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadDotEnv(content) {
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

async function loadEnvFiles() {
  const candidates = [
    arg("env"),
    path.join(process.env.HOME || "", ".altoslab-blog-worker.env"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env")
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      loadDotEnv(await fs.readFile(candidate, "utf8"));
    } catch {
      // Missing env files are normal on clean machines.
    }
  }
}

function baseUrl() {
  return (arg("base-url") || process.env.NEXT_PUBLIC_SITE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12_000);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "ALTOSLAB-SEO-GEO-Reporter/1.0" } });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url,
      ms: Date.now() - startedAt,
      text,
      contentType: response.headers.get("content-type") || ""
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      ms: Date.now() - startedAt,
      text: "",
      contentType: "",
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const result = await fetchText(url);
  if (!result.ok) return { ...result, json: null };
  try {
    return { ...result, json: JSON.parse(result.text) };
  } catch (error) {
    return { ...result, ok: false, json: null, error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function scoreFromChecks(checks) {
  const total = checks.reduce((sum, check) => sum + check.weight, 0) || 1;
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return Math.round((earned / total) * 100);
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function groupPosts(posts) {
  const groups = new Map();
  for (const post of posts) {
    const key = post.translationGroupId || post.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }
  return groups;
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function percent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 0;
  return Math.round((finite.reduce((sum, value) => sum + value, 0) / finite.length) * 10) / 10;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function googleAccessToken(scope) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!credentialsPath) {
    const gcloudCommands = [
      ["auth", "application-default", "print-access-token"],
      ["auth", "print-access-token"]
    ];
    const failures = [];
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
      reason: `GOOGLE_APPLICATION_CREDENTIALS is not configured and gcloud token fallback failed: ${failures.join(" | ")}`
    };
  }

  let credentials;
  try {
    credentials = JSON.parse(await fs.readFile(credentialsPath, "utf8"));
  } catch (error) {
    return { ok: false, reason: `cannot read Google service account JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
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
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) return { ok: false, reason: json.error_description || json.error || `token request failed ${response.status}` };
  return { ok: true, accessToken: json.access_token, provider: "service-account" };
}

async function ga4Report() {
  const propertyId = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) return { configured: false, ok: false, reason: "GA4_PROPERTY_ID is not configured" };
  const token = await googleAccessToken("https://www.googleapis.com/auth/analytics.readonly");
  if (!token.ok) return { configured: true, ok: false, reason: token.reason };
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "landingPagePlusQueryString" }],
      metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
      limit: "250"
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { configured: true, ok: false, reason: json.error?.message || `GA4 runReport failed ${response.status}` };
  const rows = Array.isArray(json.rows) ? json.rows : [];
  const normalizedRows = rows.map((row) => {
    const dimensions = row.dimensionValues?.map((value) => value.value || "") || [];
    const metrics = row.metricValues?.map((value) => Number(value.value || 0)) || [];
    return {
      source: dimensions[0] || "",
      medium: dimensions[1] || "",
      landingPage: dimensions[2] || "",
      sessions: metrics[0] || 0,
      engagedSessions: metrics[1] || 0
    };
  });
  const aiRows = normalizedRows.filter((row) => AI_SOURCE_REGEX.test(`${row.source} ${row.medium}`));
  return {
    configured: true,
    ok: true,
    totalSessions: normalizedRows.reduce((sum, row) => sum + row.sessions, 0),
    aiSessions: aiRows.reduce((sum, row) => sum + row.sessions, 0),
    aiEngagedSessions: aiRows.reduce((sum, row) => sum + row.engagedSessions, 0),
    aiSources: countBy(aiRows, (row) => row.source),
    aiLandingPages: aiRows.slice(0, 10)
  };
}

async function searchConsoleReport(targetUrl) {
  const site = process.env.SEARCH_CONSOLE_SITE_URL || process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || `${targetUrl}/`;
  const token = await googleAccessToken("https://www.googleapis.com/auth/webmasters.readonly");
  if (!token.ok) return { configured: true, ok: false, reason: token.reason };
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      dimensions: ["page"],
      rowLimit: 100
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { configured: true, ok: false, reason: json.error?.message || `Search Console query failed ${response.status}` };
  const rows = Array.isArray(json.rows) ? json.rows : [];
  const blogRows = rows.filter((row) => String(row.keys?.[0] || "").includes(`${targetUrl}/blog`) || String(row.keys?.[0] || "").includes("/blog"));
  return {
    configured: true,
    ok: true,
    totalClicks: rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
    totalImpressions: rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0),
    blogClicks: blogRows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
    blogImpressions: blogRows.reduce((sum, row) => sum + Number(row.impressions || 0), 0)
  };
}

function buildInsights({ targetUrl, health, posts, surface, ga4, searchConsole }) {
  const languages = health?.integrations?.blogLanguages?.length ? health.integrations.blogLanguages : DEFAULT_LANGUAGES;
  const languagePaths = Object.fromEntries(languages.map((language) => [language, blogIndexPathForLanguage(language)]));
  const byLanguage = countBy(posts, (post) => post.language);
  const byType = countBy(posts, (post) => post.contentType);
  const groups = groupPosts(posts);
  const completeGroups = [...groups.values()].filter((group) => languages.every((language) => group.some((post) => post.language === language))).length;
  const incompleteGroups = [...groups.entries()]
    .filter(([, group]) => !languages.every((language) => group.some((post) => post.language === language)))
    .map(([groupId, group]) => ({
      groupId,
      contentType: group[0]?.contentType || "unknown",
      languages: group.map((post) => post.language).sort(),
      missingLanguages: languages.filter((language) => !group.some((post) => post.language === language))
    }));
  const marketNewsGroups = [...groups.values()].filter((group) => group.some((post) => post.contentType === "breaking"));
  const incompleteMarketNewsGroups = incompleteGroups.filter((group) => group.contentType === "breaking");
  const sourceCounts = posts.map((post) => post.sourceLinks?.length || 0);
  const faqCounts = posts.map((post) => post.faqs?.length || 0);
  const takeawayCounts = posts.map((post) => post.keyTakeaways?.length || 0);
  const sourceDomains = [
    ...new Set(posts.flatMap((post) => post.sourceLinks || []).map((source) => domainFromUrl(source.url)).filter(Boolean))
  ].sort();
  const sourceSummaryCoverage = posts.filter((post) => (post.sourceLinks || []).some((source) => source.summary)).length;
  const postsWithSeoMeta = posts.filter((post) => post.seoTitle && post.seoDescription && post.excerpt).length;
  const postsWithGeo = posts.filter((post) => post.geoSummary && post.sourceLinks?.length).length;
  const postsWithImages = posts.filter((post) => post.cover && post.coverAlt).length;
  const homepage = surface["/"]?.text || "";
  const blogHtml = surface["/blog"]?.text || "";
  const hreflangCount = (blogHtml.match(/hrefLang=|hreflang=/gi) || []).length;
  const liveLanguageIndexes = languages.filter((language) => surface[languagePaths[language]]?.ok).length;
  const checks = {
    seo: [
      { key: "GA configured", ok: Boolean(health?.integrations?.gaConfigured), weight: 10 },
      { key: "GTM configured", ok: Boolean(health?.integrations?.gtmConfigured), weight: 10 },
      { key: "Search verification configured", ok: Boolean(health?.integrations?.searchVerificationConfigured), weight: 8 },
      { key: "sitemap/feed/robots reachable", ok: Boolean(surface["/sitemap.xml"]?.ok && surface["/feed.xml"]?.ok && surface["/robots.txt"]?.ok), weight: 14 },
      { key: "all language blog indexes reachable", ok: liveLanguageIndexes === languages.length, weight: 16 },
      { key: "hreflang alternates visible", ok: hreflangCount >= languages.length, weight: 10 },
      { key: "blog has at least one qualified public post", ok: posts.length > 0, weight: 8 },
      { key: "blog posts have SEO title/meta/excerpt", ok: posts.length > 0 && percent(postsWithSeoMeta, posts.length) >= 90, weight: 12 },
      { key: "blog covers have alt text", ok: posts.length > 0 && percent(postsWithImages, posts.length) >= 90, weight: 8 },
      { key: "daily column target is 2", ok: health?.integrations?.dailyColumnTarget === 2, weight: 8 }
    ],
    geo: [
      { key: "llms.txt reachable", ok: Boolean(surface["/llms.txt"]?.ok), weight: 12 },
      { key: "AI referral landing event present", ok: /ai_referral_landing/.test(homepage), weight: 12 },
      { key: "GTM/GA can receive events", ok: Boolean(health?.integrations?.gaConfigured && health?.integrations?.gtmConfigured), weight: 10 },
      { key: "blog has at least one qualified public post", ok: posts.length > 0, weight: 8 },
      { key: "posts include GEO summaries and sources", ok: posts.length > 0 && percent(postsWithGeo, posts.length) >= 90, weight: 14 },
      { key: "source summaries support citable context", ok: posts.length > 0 && percent(sourceSummaryCoverage, posts.length) >= 80, weight: 12 },
      { key: "average source count is healthy", ok: posts.length > 0 && average(sourceCounts) >= 2.5, weight: 12 },
      { key: "FAQ and key takeaways exist", ok: posts.length > 0 && average(faqCounts) >= 1 && average(takeawayCounts) >= 2, weight: 10 },
      { key: "full language groups are ready", ok: completeGroups > 0, weight: 8 },
      { key: "market news translated to every language", ok: incompleteMarketNewsGroups.length === 0, weight: 4 }
    ]
  };
  const seoScore = scoreFromChecks(checks.seo);
  const geoScore = scoreFromChecks(checks.geo);
  const warnings = [];
  if (!health?.integrations?.gaConfigured) warnings.push("GA frontend measurement ID is not configured on production health.");
  if (!health?.integrations?.gtmConfigured) warnings.push("GTM container is not configured on production health.");
  if (!ga4.ok) warnings.push(`GA4 Data API not producing metrics: ${ga4.reason}`);
  if (!searchConsole.ok) warnings.push(`Search Console API not producing metrics: ${searchConsole.reason}`);
  if (posts.length === 0) {
    warnings.push("No qualified public blog posts are currently published; this is intentional after removing incomplete legacy language groups, but SEO/GEO content readiness will stay low until the next Gemini/GPT-approved 9-language set is published.");
  }
  if (liveLanguageIndexes !== languages.length) warnings.push(`Only ${liveLanguageIndexes}/${languages.length} language blog indexes are reachable.`);
  if (incompleteGroups.length) warnings.push(`${incompleteGroups.length} translation groups are not complete for all configured languages.`);
  if (incompleteMarketNewsGroups.length) {
    warnings.push(
      `${incompleteMarketNewsGroups.length} market-news groups are missing configured languages: ${incompleteMarketNewsGroups
        .map((group) => `${group.groupId} missing ${group.missingLanguages.join("/")}`)
        .join("; ")}`
    );
  }
  if (posts.length > 0 && percent(postsWithSeoMeta, posts.length) < 90) warnings.push("Some public posts are missing SEO title/meta/excerpt.");
  if (posts.length > 0 && percent(postsWithGeo, posts.length) < 90) warnings.push("Some public posts are missing GEO summary or visible sources.");
  const actions = [];
  if (!ga4.ok) {
    actions.push({
      area: "流量數據",
      reason: "目前只能確認網站有裝 GA/GTM，還不能讀到後台實際訪客數字。",
      nextStep: "補上 GA4_PROPERTY_ID 與 Data API 權限，讓日報能顯示近 7 天流量、AI 來源與熱門文章。"
    });
  }
  if (!searchConsole.ok) {
    actions.push({
      area: "Google 搜尋",
      reason: "Search Console API 目前讀不到曝光與點擊，因此不知道哪些文章真的被 Google 帶到。",
      nextStep: "補 Search Console API 權限，讓日報能追蹤曝光、點擊、平均排名與被索引狀態。"
    });
  }
  if (incompleteGroups.length) {
    actions.push({
      area: "多語內容",
      reason: `${incompleteGroups.length} 組文章還沒有補齊全部語言，東南亞市場覆蓋會被拉低。`,
      nextStep: "優先補齊缺少的 id/vi/th/ms/fil 版本，並確保同一組文章共用同一張圖與來源。"
    });
  }
  if (incompleteMarketNewsGroups.length) {
    actions.push({
      area: "市場快訊",
      reason: `${incompleteMarketNewsGroups.length} 組市場快訊沒有完整翻譯到所有語言。`,
      nextStep: "下一輪 market-scan 要先補齊舊快訊語言，再發布新的快訊，避免內容斷層。"
    });
  }
  if (posts.length < 6) {
    actions.push({
      area: "內容量",
      reason: "目前中文前台可見文章偏少，讀者和搜尋引擎都還看不到穩定更新節奏。",
      nextStep: "維持每天兩篇專欄，並用市場快訊補足即時訊號。"
    });
  }
  const nextFocus = [];
  if (!ga4.ok || !searchConsole.ok) nextFocus.push("把 GA/Search Console 數據接完整");
  if (incompleteGroups.length) nextFocus.push("補齊缺語言的文章");
  if (posts.length < 6) nextFocus.push("維持每天兩篇專欄與市場快訊節奏");
  if (!nextFocus.length) nextFocus.push("用每日專欄與市場快訊穩定放大內容成效");
  const insight =
    seoScore >= 85 && geoScore >= 80
      ? `網站的搜尋底座已經可用；下一步不是再看分數，而是${nextFocus.join("，並")}。`
      : `網站還沒到可以放心放大的狀態；先${nextFocus.join("，並")}，再增加發布量。`;
  return {
    targetUrl,
    generatedAt: new Date().toISOString(),
    email: {
      from: process.env.ALTOS_REPORT_FROM_EMAIL || DEFAULT_FROM,
      to: process.env.ALTOS_REPORT_TO_EMAIL || DEFAULT_TO,
      subject: `ALTOS LAB 每日搜尋與內容成效報告 - ${new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}`
    },
    scores: { seo: seoScore, geo: geoScore },
    insight,
    languages,
    content: {
      publishedPosts: posts.length,
      byLanguage,
      byType,
      translationGroups: groups.size,
      completeGroups,
      incompleteGroups: incompleteGroups.slice(0, 10),
      marketNewsGroups: marketNewsGroups.length,
      marketNewsCompleteGroups: marketNewsGroups.length - incompleteMarketNewsGroups.length,
      incompleteMarketNewsGroups: incompleteMarketNewsGroups.slice(0, 10),
      averageSources: average(sourceCounts),
      averageFaqs: average(faqCounts),
      averageKeyTakeaways: average(takeawayCounts),
      sourceDomains: sourceDomains.slice(0, 30)
    },
    technical: {
      gaConfigured: Boolean(health?.integrations?.gaConfigured),
      gtmConfigured: Boolean(health?.integrations?.gtmConfigured),
      searchVerificationConfigured: Boolean(health?.integrations?.searchVerificationConfigured),
      dailyColumnTarget: health?.integrations?.dailyColumnTarget || null,
      marketScanWindows: health?.integrations?.marketScanWindows || [],
      hreflangCount,
      liveLanguageIndexes,
      languageIndexStatus: Object.fromEntries(languages.map((language) => [language, Boolean(surface[languagePaths[language]]?.ok)])),
      surfaces: Object.fromEntries(Object.entries(surface).map(([key, value]) => [key, { ok: value.ok, status: value.status, ms: value.ms, contentType: value.contentType }]))
    },
    analytics: {
      ga4,
      searchConsole
    },
    checks,
    warnings,
    actions
  };
}

function renderTextReport(report) {
  const explainScore = (score) => {
    if (score >= 90) return "綠燈：基本健康";
    if (score >= 75) return "黃燈：可以用，但要補洞";
    return "紅燈：會影響成效";
  };
  const typeLabel = {
    breaking: "市場快訊",
    column: "專欄",
    feature: "深度專題"
  };
  const zhWarning = (warning) =>
    warning
      .replace("GA4 Data API not producing metrics: GA4_PROPERTY_ID is not configured", "GA4 後台資料還沒接上，所以目前只能確認追蹤碼有裝，還不能看到實際流量數字。")
      .replace("Search Console API not producing metrics: Request had insufficient authentication scopes.", "Search Console API 權限不足，所以目前看不到 Google 搜尋曝光與點擊資料。")
      .replace(/(\d+) translation groups are not complete for all configured languages\./, "$1 組文章還沒有補齊所有語言版本。")
      .replace(
        /(\d+) market-news groups are missing configured languages: (.*)/,
        "$1 組市場快訊還缺東南亞語系版本：$2"
      )
      .replace("Some public posts are missing SEO title/meta/excerpt.", "有些文章缺少搜尋用標題、描述或摘要，會讓 Google 比較難理解。")
      .replace("Some public posts are missing GEO summary or visible sources.", "有些文章缺少給 AI 搜尋引用的摘要或來源，會降低被引用品質。")
      .replaceAll("missing id/vi/th/ms/fil", "缺印尼、越南、泰國、馬來、菲律賓版本");
  const warningLines = report.warnings.length ? report.warnings.map((warning) => `- ${zhWarning(warning)}`).join("\n") : "- 沒有重大警訊。";
  const aiSourceLines = report.analytics.ga4.ok
    ? Object.entries(report.analytics.ga4.aiSources || {})
        .map(([source, count]) => `- ${source}: ${count} 次造訪`)
        .join("\n") || "- 近 7 天還沒有看到可辨識的 AI 來源流量。"
    : "- 目前還不能讀 GA4 後台數據，原因是 GA4_PROPERTY_ID / Data API 權限尚未完成。";
  const contentTypeLines = Object.entries(report.content.byType || {})
    .map(([type, count]) => `- ${typeLabel[type] || type}: ${count} 篇`)
    .join("\n");
  const incompleteLanguageLines = report.content.incompleteGroups
    .map((group) => {
      const missing = group.missingLanguages
        .map((language) => ({ id: "印尼", vi: "越南", th: "泰國", ms: "馬來", fil: "菲律賓" }[language] || language))
        .join("、");
      return `- ${group.groupId}: 缺 ${missing}`;
    })
    .join("\n");
  const actionLines = report.actions?.length
    ? report.actions
        .map((action, index) => `${index + 1}. ${action.area}: ${action.nextStep}\n   為什麼：${action.reason}`)
        .join("\n")
    : "1. 今天先維持監控，不需要立刻修正。";
  const languageIndexLines = Object.entries(report.technical.languageIndexStatus)
    .map(([language, ok]) => {
      const label = { "zh-Hant": "繁中", en: "英文", ja: "日文", ko: "韓文", id: "印尼", vi: "越南", th: "泰國", ms: "馬來", fil: "菲律賓" }[language] || language;
      return `- ${label}: ${ok ? "可開啟" : "打不開"}`;
    })
    .join("\n");
  return `ALTOS LAB 每日搜尋與內容成效報告

今天結論：
${report.insight}

先看這 3 件事：
- Google 搜尋健康分數：${report.scores.seo}/100（${explainScore(report.scores.seo)}）
- AI 搜尋可引用分數：${report.scores.geo}/100（${explainScore(report.scores.geo)}）
- 正式站公開文章：${report.content.publishedPosts} 篇；完整多語文章組：${report.content.completeGroups}/${report.content.translationGroups} 組

白話說：
第一個分數是在看 Google 會不會順利看懂我們網站；第二個分數是在看 AI 搜尋工具能不能放心引用我們文章。
分數不是目的。真正要看的是：有沒有流量資料、文章語言有沒有齊、讀者會不會看到穩定更新。

1. 內容狀況
${contentTypeLines || "- 尚未取得文章類型資料。"}
- 市場快訊完整多語組：${report.content.marketNewsCompleteGroups}/${report.content.marketNewsGroups} 組
- 每篇平均來源數：${report.content.averageSources} 個
- 每篇平均 FAQ：${report.content.averageFaqs} 個
- 每日專欄目標：${report.technical.dailyColumnTarget || "尚未設定"} 篇
- 市場快訊掃描時間：${(report.technical.marketScanWindows || []).join("、") || "尚未設定"}

目前缺語言的文章組：
${incompleteLanguageLines || "- 沒有缺語言的文章組。"}

2. GA / GTM / 搜尋資料
- GA 追蹤碼：${report.technical.gaConfigured ? "有裝" : "沒裝"}
- GTM 代碼：${report.technical.gtmConfigured ? "有裝" : "沒裝"}
- Search Console 驗證：${report.technical.searchVerificationConfigured ? "已偵測到" : "尚未偵測到"}
- 近 7 天總流量：${report.analytics.ga4.ok ? `${report.analytics.ga4.totalSessions} 次造訪` : "目前讀不到"}
- 近 7 天 AI 來源流量：${report.analytics.ga4.ok ? `${report.analytics.ga4.aiSessions} 次造訪` : "目前讀不到"}
${aiSourceLines}

白話說：
追蹤碼像門口的計數器，Data API 像每天把帳本拿出來看。現在門口計數器有裝，但帳本還沒接上，所以還不能用真實流量判斷文章表現。

3. 各語言入口
${languageIndexLines}

4. 今天警訊
${warningLines}

5. 下一步行動
${actionLines}

產生時間：${report.generatedAt}
`;
}

async function main() {
  await loadEnvFiles();
  const targetUrl = baseUrl();
  const healthResult = await fetchJson(`${targetUrl}/api/health`);
  const postsResult = await fetchJson(`${targetUrl}/api/blog`);
  const health = healthResult.json || {};
  const languages = health?.integrations?.blogLanguages?.length ? health.integrations.blogLanguages : DEFAULT_LANGUAGES;
  const languagePaths = Object.fromEntries(languages.map((language) => [language, blogIndexPathForLanguage(language)]));
  const surfacePaths = ["/", "/blog", "/sitemap.xml", "/feed.xml", "/robots.txt", "/llms.txt", ...Object.values(languagePaths)];
  const surfaceEntries = await Promise.all([...new Set(surfacePaths)].map(async (surfacePath) => [surfacePath, await fetchText(`${targetUrl}${surfacePath}`)]));
  const surface = Object.fromEntries(surfaceEntries);
  const posts = Array.isArray(postsResult.json?.posts) ? postsResult.json.posts : [];
  const [ga4, searchConsole] = await Promise.all([ga4Report(), searchConsoleReport(targetUrl)]);
  const report = buildInsights({ targetUrl, health, posts, surface, ga4, searchConsole });
  const format = arg("format", hasFlag("json") ? "json" : "text");
  const output = arg("output");
  const rendered = format === "json" ? JSON.stringify(report, null, 2) : renderTextReport(report);
  if (output) {
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await fs.writeFile(output, rendered, "utf8");
  }
  process.stdout.write(rendered);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
