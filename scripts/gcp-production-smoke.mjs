#!/usr/bin/env node

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
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
  { path: "/sitemap.xml", surface: "sitemap" },
  { path: "/llms.txt", surface: "llms" }
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function baseUrl() {
  return (arg("base-url") || process.env.GCP_SMOKE_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );
}

function pushIssue(errors, message, context = {}) {
  errors.push({ message, ...context });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 18_000);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(root, path, errors, context) {
  const url = `${root}${path}`;
  try {
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": "altos-gcp-production-smoke/1.0" }
    });
    const text = await response.text();
    if (!response.ok) pushIssue(errors, `GET ${url} returned ${response.status}`, context);
    return { response, text };
  } catch (error) {
    pushIssue(errors, `GET ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return { response: null, text: "" };
  }
}

async function fetchJson(root, path, errors, context) {
  const url = `${root}${path}`;
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "altos-gcp-production-smoke/1.0"
      }
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) pushIssue(errors, `GET ${url} returned ${response.status}`, context);
    return { response, json };
  } catch (error) {
    pushIssue(errors, `GET ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return { response: null, json: null };
  }
}

async function main() {
  const root = baseUrl();
  const errors = [];
  const warnings = [];
  const surfaces = {};

  for (const item of REQUIRED_PATHS) {
    const { response, text } = await fetchText(root, item.path, errors, item);
    surfaces[item.surface] = {
      path: item.path,
      status: response?.status || null,
      bytes: text.length
    };
    if (item.path === "/" && !/GTM-WJ96VR7V/.test(text)) {
      pushIssue(errors, "homepage does not include GTM-WJ96VR7V", item);
    }
    if (item.path === "/" && !/G-5VSLFNVD28/.test(text)) {
      pushIssue(errors, "homepage does not include G-5VSLFNVD28", item);
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
    headers: { "User-Agent": "altos-gcp-production-smoke/1.0" }
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
          gtmConfigured: health.integrations?.gtmConfigured,
          gaConfigured: health.integrations?.gaConfigured,
          externalBlogIngestConfigured: health.integrations?.externalBlogIngestConfigured,
          imageGcsStorageConfigured: health.integrations?.imageGcsStorageConfigured,
          legacyDeepSeekCronDisabled: health.integrations?.legacyDeepSeekCronDisabled,
          blogLanguages: health.integrations?.blogLanguages,
          dailyColumnTarget: health.integrations?.dailyColumnTarget,
          marketScanWindows: health.integrations?.marketScanWindows
        }
      }
    : null;

  if (!health?.ok) pushIssue(errors, "/api/health did not return ok", { surface: "health" });
  if (health?.cmsStorage?.provider !== "gcs") pushIssue(errors, "cmsStorage.provider must be gcs", { surface: "health" });
  for (const field of ["durable", "writable", "configured"]) {
    if (health?.cmsStorage?.[field] !== true) pushIssue(errors, `cmsStorage.${field} must be true`, { surface: "health" });
  }
  if (health?.integrations?.gtmConfigured !== true) pushIssue(errors, "GTM must be configured", { surface: "health" });
  if (health?.integrations?.gaConfigured !== true) pushIssue(errors, "GA must be configured", { surface: "health" });
  if (health?.integrations?.externalBlogIngestConfigured !== true) {
    pushIssue(errors, "signed blog ingest must be configured", { surface: "health" });
  }
  if (health?.integrations?.legacyDeepSeekCronDisabled !== true) {
    pushIssue(errors, "legacy DeepSeek cron must be disabled", { surface: "health" });
  }
  if (health?.integrations?.imageGcsStorageConfigured !== true) {
    pushIssue(errors, "GCS image storage must be configured", { surface: "health" });
  }
  if (JSON.stringify(health?.integrations?.blogLanguages || []) !== JSON.stringify(BLOG_LANGUAGES)) {
    pushIssue(errors, "blogLanguages must match the configured multilingual set", { surface: "health" });
  }
  if (health?.integrations?.dailyColumnTarget !== 2) {
    pushIssue(errors, "dailyColumnTarget must be 2", { surface: "health" });
  }
  if (!Array.isArray(health?.integrations?.marketScanWindows) || health.integrations.marketScanWindows.length < 5) {
    pushIssue(errors, "marketScanWindows must be configured", { surface: "health" });
  }

  const { json: blogApi } = await fetchJson(root, "/api/blog", errors, { surface: "blog-api" });
  const publishedPosts = Array.isArray(blogApi?.posts) ? blogApi.posts.length : null;
  surfaces.blogApi = {
    status: publishedPosts === null ? "unavailable" : "ok",
    publishedPosts
  };
  if (publishedPosts === 0) {
    warnings.push({
      message:
        "No qualified public blog posts are currently published. This is acceptable after fail-closed archival, but SEO/GEO content readiness will stay low until a complete Gemini/GPT-approved multilingual set is released.",
      surface: "blog-api"
    });
  }

  const result = {
    ok: errors.length === 0,
    phase: "gcp-production-smoke",
    root,
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
    surfaces
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
