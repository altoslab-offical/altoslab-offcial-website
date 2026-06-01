#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko"];
const SLOTS = {
  morning: "09:00",
  afternoon: "16:00"
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

function candidateIndexPath(date, slot) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

function scheduledFor(date, slot) {
  return `${date}T${SLOTS[slot]}:00+08:00`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      addIssue(errors, `production health failed with HTTP ${response.status}`);
      return { root, health: null };
    }
    const integrations = json.integrations || {};
    if (json.cmsStorage?.provider !== "cloudflare-kv") addIssue(errors, "production cmsStorage.provider must be cloudflare-kv");
    for (const field of ["durable", "writable", "configured"]) {
      if (json.cmsStorage?.[field] !== true) addIssue(errors, `production cmsStorage.${field} must be true`);
    }
    if (integrations.externalBlogIngestConfigured !== true) addIssue(errors, "production externalBlogIngestConfigured must be true");
    if (integrations.legacyDeepSeekCronDisabled !== true) addIssue(errors, "production legacyDeepSeekCronDisabled must be true");
    if (integrations.autoPublishBlog !== true) addIssue(errors, "production autoPublishBlog must be true");
    if (!Array.isArray(integrations.blogLanguages) || LANGUAGES.some((language) => !integrations.blogLanguages.includes(language))) {
      addIssue(errors, "production blogLanguages must include zh-Hant, en, ja and ko");
    }
    return {
      root,
      health: {
        cmsStorage: json.cmsStorage,
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

function checkLaunchAgent(errors, warnings) {
  if (process.platform !== "darwin") {
    addWarning(warnings, "LaunchAgent check skipped because this is not macOS");
    return null;
  }
  const uid = typeof process.getuid === "function" ? process.getuid() : "";
  const result = spawnSync("launchctl", ["print", `gui/${uid}/com.altoslab.blog-local-worker`], {
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    addIssue(errors, "com.altoslab.blog-local-worker LaunchAgent is not loaded");
    return { loaded: false };
  }
  if (!output.includes("/Users/asdc163/Documents/官方網站")) {
    addIssue(errors, "LaunchAgent must run from /Users/asdc163/Documents/官方網站");
  }
  for (const [hour, minute] of [
    [8, 10],
    [9, 0],
    [9, 4],
    [15, 10],
    [16, 0],
    [16, 4]
  ]) {
    if (!output.includes(`"Hour" => ${hour}`) || !output.includes(`"Minute" => ${minute}`)) {
      addIssue(errors, `LaunchAgent is missing ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} calendar trigger`);
    }
  }
  if (!output.includes("last exit code = 0") && !output.includes("last exit code = (never exited)")) {
    addWarning(warnings, "LaunchAgent last exit code was not observed as 0");
  }
  return { loaded: true };
}

function checkReleaseCandidate({ date, slot }, errors, warnings) {
  const indexPath = candidateIndexPath(date, slot);
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
  if (manifest.status !== "ready") addIssue(errors, `release candidate status must be ready, got ${manifest.status || "missing"}`);
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
  if (manifest.chromeEvidence?.gemini?.usedExistingTab !== true) addIssue(errors, "Gemini browser evidence is missing");
  if (manifest.chromeEvidence?.chatgpt?.usedExistingTab !== true) addIssue(errors, "ChatGPT/GPT browser evidence is missing");
  if (manifest.humanDesignQa?.approved !== true) addIssue(errors, "humanDesignQa.approved must be true");

  if (articleSetPath && fs.existsSync(articleSetPath)) {
    const articleSet = readJson(articleSetPath);
    const posts = Array.isArray(articleSet.posts) ? articleSet.posts : [];
    if (posts.length !== LANGUAGES.length) addIssue(errors, `article set must contain four posts, got ${posts.length}`);
    for (const language of LANGUAGES) {
      if (posts.filter((post) => post.language === language).length !== 1) addIssue(errors, `article set must contain exactly one ${language} post`);
    }
    for (const post of posts) {
      if (!String(post.generatedBy || "").toLowerCase().includes("gemini")) {
        addIssue(errors, `${post.language}/${post.slug}: generatedBy must include gemini`);
      }
      if (!/(chatgpt|gpt|openai)/i.test(String(post.coverGeneration?.provider || ""))) {
        addIssue(errors, `${post.language}/${post.slug}: coverGeneration.provider must be ChatGPT/GPT`);
      }
      if (post.coverSource !== "generated") addIssue(errors, `${post.language}/${post.slug}: coverSource must be generated`);
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

function checkPrepCandidate({ date, slot }, warnings) {
  const indexPath = candidateIndexPath(date, slot);
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
  const errors = [];
  const warnings = [];
  if (!["prep", "release"].includes(mode)) addIssue(errors, "--mode must be prep or release");
  if (!SLOTS[slot]) addIssue(errors, "--slot must be morning or afternoon");

  const env = loadEnvFile();
  if (!env.loaded) addWarning(warnings, "local worker env file was not loaded", { envFile: env.envFile });
  if (["prep", "release"].includes(mode)) checkEnv(mode, errors, warnings);
  const launchAgent = checkLaunchAgent(errors, warnings);
  const production = await checkProductionHealth(errors, warnings);
  const candidate = mode === "release" && SLOTS[slot]
    ? checkReleaseCandidate({ date, slot }, errors, warnings)
    : SLOTS[slot]
      ? checkPrepCandidate({ date, slot }, warnings)
      : null;

  const result = {
    ok: errors.length === 0,
    phase: "blog-sop-doctor",
    mode,
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
