#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const REQUIRED_CHROME_PROFILE_EMAIL = "john.wu0120@gmail.com";
const PRODUCTION_CMS_PROVIDERS = new Set(["cloudflare-d1", "cloudflare-kv", "gcs", "aws-s3"]);
const GENERIC_STOCK_IMAGE_HOSTS = [
  "unsplash.com",
  "images.unsplash.com",
  "pexels.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "openverse.org",
  "openverse.engineering",
  "api.openverse.org",
  "api.openverse.engineering"
];
const LAUNCH_AGENT_TRIGGERS = [
  [8, 10],
  [9, 0],
  [9, 4],
  [10, 15],
  [11, 15],
  [12, 15],
  [13, 15],
  [14, 15],
  [15, 10],
  [15, 15],
  [16, 0],
  [16, 4],
  [17, 15],
  [18, 15],
  [19, 10],
  [19, 15],
  [20, 0],
  [20, 4],
  [20, 15],
  [21, 15]
];
const LAUNCH_AGENT_PLIST = path.join(process.env.HOME || "", "Library/LaunchAgents/com.altoslab.blog-local-worker.plist");
const N8N_BRIDGE_PLIST = path.join(process.env.HOME || "", "Library/LaunchAgents/com.altoslab.n8n-bridge.plist");
const N8N_BRIDGE_HEALTH_URL = "http://127.0.0.1:8797/health";
const EXPECTED_WORKER_ROOT =
  process.env.ALTOS_BLOG_WORKER_ROOT || "/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime";
const SLOTS = {
  morning: "09:00",
  afternoon: "16:00",
  evening: "20:00"
};

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog SOP doctor

Checks whether the local Gemini/GPT blog pipeline is ready to prep or release.

Examples:
  node scripts/blog-sop-doctor.mjs --mode prep --slot morning
  node scripts/blog-sop-doctor.mjs --mode release --slot morning --date 2026-06-02

It checks local env, LaunchAgent registration, production health, and the
prepared-candidate manifest when mode=release.
`);
}

function taiwanParts(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(input)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function taiwanDate(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function candidateIndexPath(date, slot, lane = "column") {
  const normalizedLane = lane === "market" ? "market" : "column";
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}-${normalizedLane}.json`);
}

function legacyCandidateIndexPath(date, slot) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

function scheduledFor(date, slot) {
  return `${date}T${SLOTS[slot]}:00+08:00`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isMarketArticleSet(articleSet) {
  const posts = Array.isArray(articleSet?.posts) ? articleSet.posts : [];
  const provider = String(articleSet?.generation?.provider || "").toLowerCase();
  const sourceRendered = provider === "source-translation" || ["hermes-owner", "codex-gpt-5.4", "codex-gpt-5.4-subagent"].includes(provider);
  return sourceRendered && posts.length > 0 && posts.every((post) => post.contentType === "breaking");
}

function candidateLooksLikeLane(index, lane) {
  const manifestPath = index?.manifestPath || "";
  const manifest = manifestPath && fs.existsSync(manifestPath) ? readJson(manifestPath) : index;
  const articleSetPath = manifest?.articleSetPath || index?.articleSetPath || "";
  const articleSet = articleSetPath && fs.existsSync(articleSetPath) ? readJson(articleSetPath) : null;
  const market = isMarketArticleSet(articleSet);
  return lane === "market" ? market : !market;
}

function resolveCandidateIndexPath(date, slot, lane = "column") {
  const lanePath = candidateIndexPath(date, slot, lane);
  if (fs.existsSync(lanePath)) return lanePath;
  const legacyPath = legacyCandidateIndexPath(date, slot);
  if (!fs.existsSync(legacyPath)) return lanePath;
  const legacyIndex = readJson(legacyPath);
  return candidateLooksLikeLane(legacyIndex, lane) ? legacyPath : lanePath;
}

function releaseReadyCandidatePath(date, slot, lane = "column") {
  const paths = [candidateIndexPath(date, slot, lane), legacyCandidateIndexPath(date, slot)];
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) continue;
    const index = readJson(filePath);
    if (!candidateLooksLikeLane(index, lane)) continue;
    const manifestPath = index.manifestPath || filePath;
    const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : index;
    if (["ready", "released"].includes(manifest.status)) return filePath;
  }
  return resolveCandidateIndexPath(date, slot, lane);
}

function isAcceptedAiProvider(value) {
  return /(chatgpt|gpt|openai|codex)/i.test(String(value || ""));
}

function hasCodexEvidence(manifest) {
  const evidence = manifest.codexEvidence || manifest.chromeEvidence?.codex || {};
  return /codex/i.test(String(evidence.provider || evidence.runtime || "")) && /gpt-5\.4/i.test(String(evidence.model || ""));
}

function parsedHost(value) {
  try {
    return new URL(value || "").hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGenericStockImageUrl(value) {
  const host = parsedHost(value);
  return Boolean(host && GENERIC_STOCK_IMAGE_HOSTS.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`)));
}

function sourceHostMatches(creditUrl, sourceUrl) {
  const creditHost = parsedHost(creditUrl);
  const sourceHost = parsedHost(sourceUrl);
  return Boolean(
    creditHost &&
      sourceHost &&
      (creditHost === sourceHost || creditHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${creditHost}`))
  );
}

function sourceCoverCreditMatchesSource(post) {
  return (post.sourceLinks || []).some((source) => sourceHostMatches(post.coverCreditUrl || "", source.url || ""));
}

function isApprovedEditorialFallbackCover(post) {
  const credit = `${post.coverCredit || ""} ${post.coverLicense || ""}`;
  return (
    (post.coverSource === "manual" || post.coverSource === "generated") &&
    /ALTOS LAB/i.test(credit) &&
    Boolean(String(post.coverAlt || "").trim()) &&
    Boolean(String(post.coverLicense || "").trim()) &&
    post.imageQualityStatus === "passed"
  );
}

function isColumnOrFeature(post) {
  return post.contentType === "column" || post.contentType === "feature";
}

function loadEnvFile() {
  const envFile = arg("env-file") || path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  if (!envFile || !fs.existsSync(envFile)) return { envFile, loaded: false };
  const raw = fs.readFileSync(envFile, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return { envFile, loaded: true };
}

function addIssue(errors, message, context = {}) {
  errors.push({ message, ...context });
}

function addWarning(warnings, message, context = {}) {
  warnings.push({ message, ...context });
}

function chromeProfileEmail(evidence) {
  return String(evidence?.profileEmail || evidence?.chromeProfileEmail || evidence?.accountEmail || evidence?.email || "")
    .trim()
    .toLowerCase();
}

function checkChromeProfile(errors, evidence, label) {
  if (chromeProfileEmail(evidence) !== REQUIRED_CHROME_PROFILE_EMAIL) {
    addIssue(errors, `${label} Chrome profile must be ${REQUIRED_CHROME_PROFILE_EMAIL}`);
  }
}

function requireEnv(errors, key) {
  if (!process.env[key]) addIssue(errors, `${key} is required`);
}

function envSummary() {
  return {
    BLOG_INGEST_HMAC_SECRET: Boolean(process.env.BLOG_INGEST_HMAC_SECRET),
    ALTOS_BLOG_BASE_URL: process.env.ALTOS_BLOG_BASE_URL || "",
    ALTOS_BLOG_NODE_BIN: Boolean(process.env.ALTOS_BLOG_NODE_BIN),
    BLOG_DISABLE_DEEPSEEK_CRON: process.env.BLOG_DISABLE_DEEPSEEK_CRON || "",
    BLOG_ALLOW_LOCAL_FALLBACK_COVERS: process.env.BLOG_ALLOW_LOCAL_FALLBACK_COVERS || "",
    adminReadbackCredential: Boolean(
      process.env.ALTOS_ADMIN_PASSWORD ||
        process.env.ADMIN_PASSWORD ||
        process.env.ALTOS_ADMIN_SESSION_TOKEN ||
        process.env.ADMIN_SESSION_TOKEN
    )
  };
}

function checkEnv(mode, errors, warnings) {
  requireEnv(errors, "BLOG_INGEST_HMAC_SECRET");
  requireEnv(errors, "ALTOS_BLOG_BASE_URL");
  if (process.env.BLOG_DISABLE_DEEPSEEK_CRON !== "true") {
    addIssue(errors, "BLOG_DISABLE_DEEPSEEK_CRON must be true for the formal Gemini/GPT pipeline");
  }
  if (process.env.BLOG_ALLOW_LOCAL_FALLBACK_COVERS === "1") {
    addIssue(errors, "BLOG_ALLOW_LOCAL_FALLBACK_COVERS must not be enabled for production publishing");
  }
  if (mode === "release" && !envSummary().adminReadbackCredential) {
    addIssue(errors, "release verification requires ALTOS_ADMIN_PASSWORD, ADMIN_PASSWORD, ALTOS_ADMIN_SESSION_TOKEN, or ADMIN_SESSION_TOKEN");
  }
  if (!process.env.ALTOS_BLOG_NODE_BIN) {
    addWarning(warnings, "ALTOS_BLOG_NODE_BIN is not set; LaunchAgent will fall back to the default pinned Node path");
  }
}

async function checkProductionHealth(errors, warnings) {
  const root = (arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${root}/api/health`, {
      headers: { "User-Agent": "altos-blog-sop-doctor/1.0" }
    });
    const serverHeader = response.headers.get("server") || "";
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      addIssue(errors, `production health failed with HTTP ${response.status}`);
      return { root, health: null };
    }
    const integrations = json.integrations || {};
    if (!PRODUCTION_CMS_PROVIDERS.has(json.cmsStorage?.provider)) {
      addIssue(errors, "production cmsStorage.provider must be cloudflare-d1, cloudflare-kv, gcs or aws-s3");
    }
    for (const field of ["durable", "writable", "configured"]) {
      if (json.cmsStorage?.[field] !== true) addIssue(errors, `production cmsStorage.${field} must be true`);
    }
    const expectedGcsBucket = process.env.GCS_BUCKET || "altoslab-official-cms-934551798702";
    if (json.cmsStorage?.provider === "gcs" && json.cmsStorage?.bucket !== expectedGcsBucket) {
      addIssue(errors, `production GCS bucket must be ${expectedGcsBucket}; got ${json.cmsStorage?.bucket || "missing"}`);
    }
    const host = new URL(root).hostname.replace(/^www\./, "");
    if (host === "altoslab-ai.cc" && /google frontend/i.test(serverHeader)) {
      addIssue(
        errors,
        "custom domain is still served by Google Frontend; Cloudflare Worker route is not cut over"
      );
    }
    if (integrations.externalBlogIngestConfigured !== true) addIssue(errors, "production externalBlogIngestConfigured must be true");
    if (integrations.legacyDeepSeekCronDisabled !== true) addIssue(errors, "production legacyDeepSeekCronDisabled must be true");
    if (integrations.autoPublishBlog !== true) addIssue(errors, "production autoPublishBlog must be true");
    if (!Array.isArray(integrations.blogLanguages) || LANGUAGES.some((language) => !integrations.blogLanguages.includes(language))) {
      addIssue(errors, `production blogLanguages must include ${LANGUAGES.join(", ")}`);
    }
    return {
      root,
      health: {
        cmsStorage: json.cmsStorage,
        server: serverHeader,
        externalBlogIngestConfigured: integrations.externalBlogIngestConfigured,
        legacyDeepSeekCronDisabled: integrations.legacyDeepSeekCronDisabled,
        autoPublishBlog: integrations.autoPublishBlog,
        blogLanguages: integrations.blogLanguages,
        checkedAt: json.checkedAt
      }
    };
  } catch (error) {
    addIssue(errors, `production health request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return { root, health: null };
  }
}

function launchctlPrint(label) {
  const uid = typeof process.getuid === "function" ? process.getuid() : "";
  const result = spawnSync("launchctl", ["print", `gui/${uid}/${label}`], {
    encoding: "utf8"
  });
  return {
    loaded: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

function checkN8nBridge(errors, warnings) {
  const launchAgent = launchctlPrint("com.altoslab.n8n-bridge");
  if (!launchAgent.loaded) return null;
  if (!launchAgent.output.includes(EXPECTED_WORKER_ROOT)) {
    addIssue(errors, `n8n bridge LaunchAgent must run from ${EXPECTED_WORKER_ROOT}`);
  }
  if (!fs.existsSync(N8N_BRIDGE_PLIST)) {
    addIssue(errors, "n8n bridge LaunchAgent plist is missing", { plistPath: N8N_BRIDGE_PLIST });
  }
  if (!launchAgent.output.includes("last exit code = 0") && !launchAgent.output.includes("last exit code = (never exited)")) {
    addWarning(warnings, "n8n bridge LaunchAgent last exit code was not observed as 0");
  }

  const health = spawnSync("curl", ["-fsS", N8N_BRIDGE_HEALTH_URL], {
    encoding: "utf8",
    timeout: 5_000
  });
  if (health.status !== 0) {
    addIssue(errors, "n8n bridge health endpoint is not reachable", { url: N8N_BRIDGE_HEALTH_URL });
    return { mode: "n8n-local", loaded: true, health: null };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(health.stdout || "{}");
  } catch {
    addIssue(errors, "n8n bridge health endpoint did not return valid JSON", { url: N8N_BRIDGE_HEALTH_URL });
  }
  const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  for (const job of ["health", "scheduled", "market-scan", "seo-geo-report"]) {
    if (!jobs.includes(job)) addIssue(errors, `n8n bridge is missing ${job} job`);
  }
  if (parsed?.tokenConfigured !== true) {
    addIssue(errors, "n8n bridge token is not configured");
  }
  if (parsed?.baseUrl && parsed.baseUrl !== DEFAULT_BASE_URL) {
    addWarning(warnings, "n8n bridge automation base URL is not the custom production domain", { baseUrl: parsed.baseUrl });
  }
  return {
    mode: "n8n-local",
    loaded: true,
    baseUrl: parsed?.baseUrl || "",
    jobs
  };
}

function checkLegacyLaunchAgent(errors, warnings, launchAgent) {
  const output = launchAgent.output;
  if (!output.includes(EXPECTED_WORKER_ROOT)) {
    addIssue(errors, `LaunchAgent must run from ${EXPECTED_WORKER_ROOT}`);
  }
  if (!fs.existsSync(LAUNCH_AGENT_PLIST)) {
    addIssue(errors, "LaunchAgent plist is missing", { plistPath: LAUNCH_AGENT_PLIST });
  } else {
    const plistResult = spawnSync("plutil", ["-convert", "json", "-o", "-", LAUNCH_AGENT_PLIST], {
      encoding: "utf8"
    });
    let launchAgentConfig = null;
    try {
      launchAgentConfig = JSON.parse(plistResult.stdout || "{}");
    } catch {
      addIssue(errors, "LaunchAgent plist could not be parsed as JSON", { plistPath: LAUNCH_AGENT_PLIST });
    }
    const intervals = Array.isArray(launchAgentConfig?.StartCalendarInterval)
      ? launchAgentConfig.StartCalendarInterval
      : launchAgentConfig?.StartCalendarInterval
        ? [launchAgentConfig.StartCalendarInterval]
        : [];
    const triggerSet = new Set(intervals.map((interval) => `${Number(interval.Hour)}:${Number(interval.Minute)}`));
    for (const [hour, minute] of LAUNCH_AGENT_TRIGGERS) {
      if (!triggerSet.has(`${hour}:${minute}`)) {
        addIssue(errors, `LaunchAgent is missing ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} calendar trigger`);
      }
    }
  }
  if (!output.includes("last exit code = 0") && !output.includes("last exit code = (never exited)")) {
    addWarning(warnings, "LaunchAgent last exit code was not observed as 0");
  }
  return { mode: "legacy-launchagent", loaded: true };
}

function checkLaunchAgent(errors, warnings) {
  if (process.platform !== "darwin") {
    addWarning(warnings, "LaunchAgent check skipped because this is not macOS");
    return null;
  }
  const n8nBridge = checkN8nBridge(errors, warnings);
  if (n8nBridge?.loaded) return n8nBridge;

  const legacy = launchctlPrint("com.altoslab.blog-local-worker");
  if (legacy.loaded) return checkLegacyLaunchAgent(errors, warnings, legacy);

  addIssue(errors, "neither com.altoslab.n8n-bridge nor com.altoslab.blog-local-worker LaunchAgent is loaded");
  return { mode: "missing", loaded: false };
}

function checkReleaseCandidate({ date, slot, lane }, errors, warnings) {
  const indexPath = releaseReadyCandidatePath(date, slot, lane);
  if (!fs.existsSync(indexPath)) {
    addIssue(errors, "release candidate index is missing", { indexPath });
    return null;
  }
  const index = readJson(indexPath);
  const manifestPath = index.manifestPath || indexPath;
  if (!fs.existsSync(manifestPath)) {
    addIssue(errors, "release candidate manifest is missing", { manifestPath });
    return { indexPath, manifestPath };
  }
  const manifest = readJson(manifestPath);
  const articleSetPath = manifest.articleSetPath || index.articleSetPath;
  if (!["ready", "released"].includes(manifest.status)) {
    addIssue(errors, `release candidate status must be ready or released, got ${manifest.status || "missing"}`);
  }
  if (manifest.status === "released" && manifest.releaseVerification?.ok !== true) {
    addIssue(errors, "released candidate must have releaseVerification.ok true");
  }
  if (
    manifest.status === "released" &&
    (!Array.isArray(manifest.publish?.publishedIds) || manifest.publish.publishedIds.length !== LANGUAGES.length)
  ) {
    addIssue(errors, `released candidate must include ${LANGUAGES.length} publishedIds`);
  }
  if (manifest.slot !== slot) addIssue(errors, `release candidate slot must be ${slot}`);
  if (manifest.expectedReleaseAt !== scheduledFor(date, slot)) {
    addIssue(errors, `release candidate expectedReleaseAt must be ${scheduledFor(date, slot)}`);
  }
  if (!articleSetPath || !fs.existsSync(articleSetPath)) addIssue(errors, "release candidate articleSetPath is missing", { articleSetPath });
  if (manifest.validateOnly?.wouldPublish !== true) addIssue(errors, "validateOnly.wouldPublish must be true");
  if (manifest.validateOnly?.qualityApproved !== true) addIssue(errors, "validateOnly.qualityApproved must be true");
  if (manifest.validateOnly?.imageApproved !== true) addIssue(errors, "validateOnly.imageApproved must be true");
  if (Array.isArray(manifest.validateOnly?.errors) && manifest.validateOnly.errors.length) {
    addIssue(errors, `validateOnly.errors must be empty: ${manifest.validateOnly.errors.join("; ")}`);
  }
  if (manifest.humanDesignQa?.approved !== true) addIssue(errors, "humanDesignQa.approved must be true");

  if (articleSetPath && fs.existsSync(articleSetPath)) {
    const articleSet = readJson(articleSetPath);
    const posts = Array.isArray(articleSet.posts) ? articleSet.posts : [];
    const marketOnly = isMarketArticleSet(articleSet);
    if (lane === "column" && marketOnly) addIssue(errors, "release candidate lane must be column, got market");
    if (lane === "market" && !marketOnly) addIssue(errors, "release candidate lane must be market, got column");
    const requiresGptCover = posts.some((post) => post.contentType !== "breaking");
    const isSourceTranslationMarketOnly = isMarketArticleSet(articleSet);
    const codexBacked = hasCodexEvidence(manifest);
    if (!isSourceTranslationMarketOnly && !codexBacked && manifest.chromeEvidence?.gemini?.usedExistingTab !== true) {
      addIssue(errors, "Gemini browser evidence is missing");
    }
    if (!isSourceTranslationMarketOnly && !codexBacked) checkChromeProfile(errors, manifest.chromeEvidence?.gemini, "Gemini");
    if (requiresGptCover && !codexBacked && manifest.chromeEvidence?.chatgpt?.usedExistingTab !== true) {
      addIssue(errors, "ChatGPT/GPT browser evidence is missing for generated covers");
    }
    if (requiresGptCover && !codexBacked) checkChromeProfile(errors, manifest.chromeEvidence?.chatgpt, "ChatGPT/GPT");
    if (posts.length !== LANGUAGES.length) addIssue(errors, `article set must contain ${LANGUAGES.length} posts, got ${posts.length}`);
    for (const language of LANGUAGES) {
      if (posts.filter((post) => post.language === language).length !== 1) addIssue(errors, `article set must contain exactly one ${language} post`);
    }
    const columnPosts = posts.filter(isColumnOrFeature);
    if (columnPosts.length) {
      const counts = [...new Set(columnPosts.map((post) => (Array.isArray(post.contentImages) ? post.contentImages.length : 0)))];
      if (counts.length !== 1) {
        addIssue(errors, `translated column/feature posts must share the same content image count, got ${counts.join(", ")}`);
      }
      const expectedCount = counts[0] || 0;
      if (expectedCount < 2) addIssue(errors, "column/feature posts require at least two in-article images");
      if (expectedCount > 3) addIssue(errors, "column/feature posts should keep in-article images to three or fewer");
      for (let index = 0; index < expectedCount; index += 1) {
        const urls = [...new Set(columnPosts.map((post) => post.contentImages?.[index]?.url).filter(Boolean))];
        if (urls.length !== 1) {
          addIssue(errors, `translated column/feature posts must share contentImages[${index}] URL, got ${urls.join(", ") || "missing"}`);
        }
      }
    }
    for (const post of posts) {
      const generatedBy = String(post.generatedBy || "").toLowerCase();
      const sourceTranslatedMarketNews =
        post.contentType === "breaking" && /source-translation|source_translat|source-worker|codex-market|market-source/.test(generatedBy);
      if (!sourceTranslatedMarketNews && !generatedBy.includes("gemini")) {
        if (codexBacked && generatedBy.includes("codex")) {
          // ponytail: Codex-backed Hermes lanes use codexEvidence instead of legacy Gemini browser tabs.
        } else {
          addIssue(errors, `${post.language}/${post.slug}: generatedBy must include gemini`);
        }
      }
      if (post.contentType === "breaking") {
        const editorialFallbackCover = isApprovedEditorialFallbackCover(post);
        if (post.coverSource !== "source" && !editorialFallbackCover) {
          addIssue(errors, `${post.language}/${post.slug}: market news coverSource must be source or approved ALTOS LAB editorial fallback`);
        }
        if (post.coverSource === "source") {
          if (!post.coverCredit || !post.coverCreditUrl || !post.coverLicense) {
            addIssue(errors, `${post.language}/${post.slug}: source cover must include coverCredit, coverCreditUrl and coverLicense`);
          }
          if (isGenericStockImageUrl(post.cover) || isGenericStockImageUrl(post.coverCreditUrl)) {
            addIssue(errors, `${post.language}/${post.slug}: market news source image must come from the source article or official announcement, not stock/free image providers`);
          }
          if (!sourceCoverCreditMatchesSource(post)) {
            addIssue(errors, `${post.language}/${post.slug}: market news coverCreditUrl must match one of the sourceLinks`);
          }
        }
      } else {
        if (!isAcceptedAiProvider(post.coverGeneration?.provider)) {
          addIssue(errors, `${post.language}/${post.slug}: coverGeneration.provider must be ChatGPT/GPT/Codex`);
        }
        if (post.coverSource !== "generated") addIssue(errors, `${post.language}/${post.slug}: coverSource must be generated`);
        const contentImages = Array.isArray(post.contentImages) ? post.contentImages : [];
        const contentImageUrls = contentImages.map((image) => String(image?.url || "").trim()).filter(Boolean);
        const contentImagePrompts = contentImages.map((image) => String(image?.prompt || "").trim()).filter(Boolean);
        if (new Set(contentImageUrls).size < contentImageUrls.length) {
          addIssue(errors, `${post.language}/${post.slug}: contentImages must not reuse the same URL`);
        }
        if (new Set(contentImagePrompts).size < contentImagePrompts.length) {
          addIssue(errors, `${post.language}/${post.slug}: contentImages must not reuse the same prompt`);
        }
        if (contentImages.length < 2) addIssue(errors, `${post.language}/${post.slug}: column/feature requires at least two in-article images`);
        if (contentImages.length > 3) addIssue(errors, `${post.language}/${post.slug}: column/feature should use no more than three in-article images`);
        for (const [index, image] of contentImages.entries()) {
          const label = `${post.language}/${post.slug} contentImages[${index}]`;
          if (!image?.url) addIssue(errors, `${label}: URL is missing`);
          if (image?.source !== "generated") addIssue(errors, `${label}: source must be generated`);
          if (!isAcceptedAiProvider(image?.provider)) addIssue(errors, `${label}: provider must be ChatGPT/GPT/Codex`);
          if (!image?.prompt || String(image.prompt).length < 40) addIssue(errors, `${label}: prompt metadata is missing or too thin`);
          if (!image?.generatedAt) addIssue(errors, `${label}: generatedAt is missing`);
          if (!image?.alt || String(image.alt).length < 18) addIssue(errors, `${label}: alt is missing or too thin`);
          if (!image?.caption) addIssue(errors, `${label}: caption is missing`);
          if (!image?.credit) addIssue(errors, `${label}: credit is missing`);
          const visualChecks = image?.visualChecks || {};
          for (const key of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
            if (visualChecks[key] !== true) addIssue(errors, `${label}: visualChecks.${key} must be true`);
          }
        }
      }
    }
    return {
      indexPath,
      manifestPath,
      articleSetPath,
      status: manifest.status,
      validateOnly: manifest.validateOnly,
      postCount: posts.length,
      slugs: Object.fromEntries(posts.map((post) => [post.language, post.slug]))
    };
  }
  return { indexPath, manifestPath, articleSetPath };
}

function checkPrepCandidate({ date, slot, lane }, warnings) {
  const indexPath = resolveCandidateIndexPath(date, slot, lane);
  if (!fs.existsSync(indexPath)) return { indexPath, exists: false };
  const index = readJson(indexPath);
  if (!["awaiting_browser_production", "ready", "released"].includes(index.status)) {
    addWarning(warnings, `existing prep candidate has unusual status ${index.status || "missing"}`);
  }
  return {
    indexPath,
    exists: true,
    status: index.status,
    manifestPath: index.manifestPath
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }
  const mode = arg("mode");
  const slot = arg("slot");
  const date = arg("date") || taiwanDate();
  const lane = arg("lane", "column");
  const errors = [];
  const warnings = [];
  if (!["prep", "release"].includes(mode)) addIssue(errors, "--mode must be prep or release");
  if (!SLOTS[slot]) addIssue(errors, "--slot must be morning or afternoon");
  if (!["column", "market"].includes(lane)) addIssue(errors, "--lane must be column or market");

  const env = loadEnvFile();
  if (!env.loaded) addWarning(warnings, "local worker env file was not loaded", { envFile: env.envFile });
  if (["prep", "release"].includes(mode)) checkEnv(mode, errors, warnings);
  const launchAgent = checkLaunchAgent(errors, warnings);
  const production = await checkProductionHealth(errors, warnings);
  const candidate = mode === "release" && SLOTS[slot]
    ? checkReleaseCandidate({ date, slot, lane }, errors, warnings)
    : SLOTS[slot]
      ? checkPrepCandidate({ date, slot, lane }, warnings)
      : null;

  const result = {
    ok: errors.length === 0,
    phase: "blog-sop-doctor",
    mode,
    lane,
    slot,
    date,
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
    summary: {
      envFile: env,
      env: envSummary(),
      launchAgent,
      production,
      candidate
    }
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
