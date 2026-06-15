#!/usr/bin/env node

import dns from "node:dns";
import net from "node:net";
import { Agent } from "undici";

const DEFAULT_BASE_URL = "https://altoslab-official-website-staging.altoslab-ai.workers.dev";
const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_PATH_PREFIX = {
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
const REQUIRED_PATHS = [
  { path: "/", surface: "home" },
  ...BLOG_LANGUAGES.map((language) => ({
    path: `${LANGUAGE_PATH_PREFIX[language]}/blog`.replace(/^\/blog$/, "/blog"),
    surface: `blog-${language}`
  })),
  { path: "/feed.xml", surface: "rss" },
  { path: "/rss.xml", surface: "rss-alias" },
  { path: "/sitemap.xml", surface: "sitemap" },
  { path: "/llms.txt", surface: "llms" }
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function numericArg(name, fallback) {
  const raw = arg(name, String(fallback));
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function baseUrl() {
  return (arg("base-url") || process.env.CLOUDFLARE_SMOKE_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );
}

function smokeAttempts() {
  return numericArg("attempts", Number(process.env.CLOUDFLARE_SMOKE_ATTEMPTS || "6"));
}

function smokeTimeoutMs() {
  return numericArg("timeout-ms", Number(process.env.CLOUDFLARE_SMOKE_TIMEOUT_MS || "18000"));
}

function fastMode() {
  return hasFlag("fast") || process.env.CLOUDFLARE_SMOKE_FAST === "true";
}

function requiredPaths() {
  if (!fastMode()) return REQUIRED_PATHS;
  const fastPaths = new Set(["/blog", "/en/blog", "/feed.xml", "/llms.txt"]);
  return REQUIRED_PATHS.filter((item) => fastPaths.has(item.path));
}

function expectedProvider() {
  return arg("expected-provider", process.env.CLOUDFLARE_SMOKE_EXPECTED_PROVIDER || "cloudflare-d1");
}

function resolveIp() {
  return arg("resolve-ip", process.env.CLOUDFLARE_SMOKE_RESOLVE_IP || "");
}

let activeDispatcher;
let activeResolveOverride = null;

function configureResolveOverride(root) {
  const ip = resolveIp();
  if (!ip) return null;
  const family = net.isIP(ip);
  if (!family) throw new Error(`--resolve-ip must be an IPv4 or IPv6 address, received ${ip}`);
  const host = new URL(root).hostname;
  activeDispatcher = new Agent({
    connect: {
      lookup(name, options, callback) {
        if (name === host) {
          if (options?.all) callback(null, [{ address: ip, family }]);
          else callback(null, ip, family);
          return;
        }
        dns.lookup(name, options, callback);
      }
    }
  });
  activeResolveOverride = { host, ip, family };
  return activeResolveOverride;
}

function pushIssue(errors, message, context = {}) {
  errors.push({ message, ...context });
}

function hasCloudflareWorkerErrorBody(text = "") {
  return /\berror code:\s*1102\b/i.test(text) || /Worker exceeded resource limits/i.test(text);
}

function isRetryableStatus(status) {
  return status === 429 || status === 503 || status === 504 || status === 520 || status === 521 || status === 522 || status === 524;
}

async function printJson(payload) {
  await new Promise((resolve) => {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`, resolve);
  });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || smokeTimeoutMs());
  try {
    return await fetch(url, {
      redirect: "follow",
      ...options,
      dispatcher: options.dispatcher || activeDispatcher,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(root, path, errors, context) {
  const url = `${root}${path}`;
  const attempts = smokeAttempts();
  let last = { response: null, text: "" };
  try {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetchWithTimeout(url, {
        headers: { "User-Agent": "altos-cloudflare-smoke/1.0" }
      });
      const text = await response.text();
      last = { response, text };
      if (response.ok && !hasCloudflareWorkerErrorBody(text)) break;
      if (attempt < attempts && (response.status === 503 || hasCloudflareWorkerErrorBody(text))) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }
    }
    if (!last.response?.ok) pushIssue(errors, `GET ${url} returned ${last.response?.status || "no response"}`, context);
    if (hasCloudflareWorkerErrorBody(last.text)) {
      pushIssue(errors, `GET ${url} returned a Cloudflare Worker error body`, { ...context, status: last.response?.status || null });
    }
    return last;
  } catch (error) {
    pushIssue(errors, `GET ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return { response: null, text: "" };
  }
}

async function fetchJson(root, path, errors, context) {
  const url = `${root}${path}`;
  const attempts = smokeAttempts();
  let last = { response: null, json: null };
  try {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetchWithTimeout(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "altos-cloudflare-smoke/1.0"
        }
      });
      const json = await response.json().catch(() => null);
      last = { response, json };
      if (response.ok || attempt >= attempts || !isRetryableStatus(response.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
    if (!last.response?.ok) pushIssue(errors, `GET ${url} returned ${last.response?.status || "no response"}`, context);
    return last;
  } catch (error) {
    pushIssue(errors, `GET ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return { response: null, json: null };
  }
}

async function main() {
  const root = baseUrl();
  const provider = expectedProvider();
  const resolveOverride = configureResolveOverride(root);
  const expectedGtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-WJ96VR7V";
  const expectedGaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-5VSLFNVD28";
  const errors = [];
  const warnings = [];
  const surfaces = {};

  for (const item of requiredPaths()) {
    const { response, text } = await fetchText(root, item.path, errors, item);
    surfaces[item.surface] = {
      path: item.path,
      status: response?.status || null,
      bytes: text.length
    };
    if (item.path === "/" && !text.includes(expectedGtmId)) {
      pushIssue(errors, `homepage does not include ${expectedGtmId}`, item);
    }
    if (item.path === "/" && !text.includes(expectedGaId)) {
      pushIssue(errors, `homepage does not include ${expectedGaId}`, item);
    }
    if (item.path === "/" && /altoslab-site2/i.test(text)) {
      pushIssue(errors, "homepage still contains stale altoslab-site2 copy", item);
    }
    if (item.path.endsWith(".xml") && !/<(rss|urlset)/i.test(text)) {
      pushIssue(errors, `${item.path} does not look like XML metadata`, item);
    }
    if (item.path === "/llms.txt" && !/ALTOS LAB/i.test(text)) {
      pushIssue(errors, "llms.txt does not include ALTOS LAB context", item);
    }
  }

  const admin = await fetchWithTimeout(`${root}/admin`, {
    redirect: "manual",
    headers: { "User-Agent": "altos-cloudflare-smoke/1.0" }
  }).catch((error) => {
    pushIssue(errors, `/admin failed: ${error instanceof Error ? error.message : "unknown error"}`, { surface: "admin" });
    return null;
  });
  surfaces.admin = {
    status: admin?.status || null,
    location: admin?.headers.get("location") || ""
  };
  if (admin && ![302, 303, 307, 308].includes(admin.status)) {
    pushIssue(errors, "/admin should redirect unauthenticated users", { surface: "admin", status: admin.status });
  }

  const { json: health } = await fetchJson(root, "/api/health", errors, { surface: "health" });
  surfaces.health = health
    ? {
        cmsStorage: health.cmsStorage,
        integrations: {
          adminConfigured: health.adminConfigured,
          gtmConfigured: health.integrations?.gtmConfigured,
          gaConfigured: health.integrations?.gaConfigured,
          ga4PropertyConfigured: health.integrations?.ga4PropertyConfigured,
          searchConsoleSiteConfigured: health.integrations?.searchConsoleSiteConfigured,
          externalBlogIngestConfigured: health.integrations?.externalBlogIngestConfigured,
          imageGcsStorageConfigured: health.integrations?.imageGcsStorageConfigured,
          imageCloudflareKvConfigured: health.integrations?.imageCloudflareKvConfigured,
          legacyDeepSeekCronDisabled: health.integrations?.legacyDeepSeekCronDisabled,
          blogLanguages: health.integrations?.blogLanguages,
          dailyColumnTarget: health.integrations?.dailyColumnTarget,
          marketScanWindows: health.integrations?.marketScanWindows
        }
      }
    : null;

  if (!health?.ok) pushIssue(errors, "/api/health did not return ok", { surface: "health" });
  if (health?.cmsStorage?.provider !== provider) {
    pushIssue(errors, `cmsStorage.provider must be ${provider}`, { surface: "health", actual: health?.cmsStorage?.provider });
  }
  for (const field of ["durable", "writable", "configured"]) {
    if (health?.cmsStorage?.[field] !== true) pushIssue(errors, `cmsStorage.${field} must be true`, { surface: "health" });
  }
  if (health?.adminConfigured !== true) pushIssue(errors, "admin auth must be configured", { surface: "health" });
  if (health?.integrations?.gtmConfigured !== true) pushIssue(errors, "GTM must be configured", { surface: "health" });
  if (health?.integrations?.gaConfigured !== true) pushIssue(errors, "GA must be configured", { surface: "health" });
  if (health?.integrations?.externalBlogIngestConfigured !== true) {
    pushIssue(errors, "signed blog ingest must be configured", { surface: "health" });
  }
  if (health?.integrations?.legacyDeepSeekCronDisabled !== true) {
    pushIssue(errors, "legacy DeepSeek cron must be disabled", { surface: "health" });
  }
  if ((provider === "cloudflare-kv" || provider === "cloudflare-d1") && health?.integrations?.imageCloudflareKvConfigured !== true) {
    pushIssue(errors, "Cloudflare KV generated-media storage must be configured", { surface: "health" });
  }
  if (JSON.stringify(health?.integrations?.blogLanguages || []) !== JSON.stringify(BLOG_LANGUAGES)) {
    pushIssue(errors, "blogLanguages must match the configured multilingual set", { surface: "health" });
  }
  const expectedDailyColumnTarget = Number(process.env.ALTOS_BLOG_COLUMN_DAILY_LIMIT || "1");
  if (health?.integrations?.dailyColumnTarget !== expectedDailyColumnTarget) {
    pushIssue(errors, `dailyColumnTarget must be ${expectedDailyColumnTarget}`, { surface: "health" });
  }
  if (!Array.isArray(health?.integrations?.marketScanWindows) || health.integrations.marketScanWindows.length < 5) {
    pushIssue(errors, "marketScanWindows must be configured", { surface: "health" });
  }

  const { json: blogApi } = await fetchJson(root, "/api/blog?language=zh-Hant&fields=inventory&limit=24", errors, { surface: "blog-api" });
  const publishedPosts = Array.isArray(blogApi?.posts) ? blogApi.posts.length : null;
  surfaces.blogApi = {
    status: publishedPosts === null ? "unavailable" : "ok",
    publishedPosts
  };
  if (publishedPosts === 0) {
    pushIssue(
      errors,
      "Public blog API returned zero posts; Cloudflare CMS read or public projection is not healthy.",
      { surface: "blog-api" }
    );
    warnings.push({
      message:
        "No qualified public blog posts are currently published. Treat this as fail-closed unless Tommy explicitly approved empty public inventory.",
      surface: "blog-api"
    });
  }

  const result = {
    ok: errors.length === 0,
    phase: "cloudflare-smoke",
    mode: fastMode() ? "fast" : "full",
    root,
    expectedProvider: provider,
    resolveOverride,
    attempts: smokeAttempts(),
    timeoutMs: smokeTimeoutMs(),
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
    surfaces
  };

  await printJson(result);
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
