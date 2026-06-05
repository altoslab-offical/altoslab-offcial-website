#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildMarketNewsroomPost } from "./blog-market-newsroom.mjs";
import { extractSourceArticleFromHtml } from "./blog-market-source-article.mjs";
import { localizeSourcePack, packForLanguage } from "./blog-market-translation-service.mjs";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const ADMIN_COOKIE = "altos_admin";
const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const FORBIDDEN_MARKET_PATTERNS = [
  /消息落在哪個產品環節/i,
  /來源裡的具體細節/i,
  /先看採用而不是聲量/i,
  /下一步先看三個指標/i,
  /事件重點/i,
  /關鍵事實/i,
  /這則快訊的重點是什麼/i,
  /這篇文章是否代表市場已經成熟/i,
  /這則消息可以拿來/i,
  /卡在哪個流程/i,
  /原因是企業決策問題/i,
  /Decision cue/i,
  /Next action/i,
  /source[-\s]?translation/i,
  /quality gate/i,
  /rubric/i,
  /prompt card/i,
  /AI-generated/i
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function baseUrl() {
  return String(arg("base-url", process.env.ALTOS_ADMIN_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL)).replace(/\/+$/, "");
}

function password() {
  return arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.parseInt(process.env.BLOG_REPAIR_TIMEOUT_MS || "25000", 10));
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ALTOS-LAB-market-copy-repair/2.0",
      ...(options.headers || {})
    }
  }).finally(() => clearTimeout(timeout));
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { payload, response };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.parseInt(process.env.BLOG_REPAIR_SOURCE_TIMEOUT_MS || "16000", 10));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ALTOS-LAB-market-copy-repair/2.0; https://altoslab-ai.cc"
      }
    });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    return { ok: true, status: response.status, text: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function login(root) {
  const pass = password();
  if (!pass) throw new Error("ALTOS_ADMIN_PASSWORD or ADMIN_PASSWORD is required");
  const { response } = await fetchJson(`${root}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password: pass })
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)(${ADMIN_COOKIE}=[^;]+)`));
  if (!match?.[1]) throw new Error("Admin login did not return an altos_admin cookie");
  return match[1];
}

function contentTypeMatches(post, contentTypeArg) {
  if (!contentTypeArg || contentTypeArg === "all") return true;
  if (contentTypeArg === "market" || contentTypeArg === "breaking") return post.contentType === "breaking";
  return post.contentType === contentTypeArg;
}

function publicText(post) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    post.coverCredit,
    post.coverLicense,
    post.coverAlt,
    ...(post.keyTakeaways || []),
    ...(post.sourceLinks || []).flatMap((source) => [source.title, source.summary]),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].filter(Boolean).join("\n");
}

function forbiddenLeak(post) {
  const text = publicText(post);
  const hit = FORBIDDEN_MARKET_PATTERNS.find((pattern) => pattern.test(text));
  return hit ? String(hit) : "";
}

function firstSource(post) {
  return Array.isArray(post.sourceLinks) ? post.sourceLinks[0] || null : null;
}

async function sourcePackForPost(post, cache) {
  const source = firstSource(post);
  if (!source?.url) return { ok: false, reason: "missing source URL" };
  if (cache.has(source.url)) return cache.get(source.url);
  const fetched = await fetchText(source.url);
  if (!fetched.ok) {
    const result = { ok: false, reason: `source fetch failed ${fetched.status || fetched.error || ""}`.trim() };
    cache.set(source.url, result);
    return result;
  }
  const article = extractSourceArticleFromHtml(source, fetched.text, {
    url: post.cover,
    credit: post.coverCredit || source.publisher,
    creditUrl: post.coverCreditUrl || source.url
  });
  const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
  if (!article.canonicalUrl || (facts.length < 3 && !article.standfirst)) {
    const result = { ok: false, reason: "source article extraction below repair threshold" };
    cache.set(source.url, result);
    return result;
  }
  const result = {
    ok: true,
    pack: {
      sourceLinks: post.sourceLinks,
      sourceArticle: article,
      primarySourceImageUrl: post.cover,
      coverCredit: post.coverCredit || source.publisher || "",
      coverCreditUrl: post.coverCreditUrl || source.url || "",
      coverLicense: post.coverLicense || "source image",
      coverLicenseUrl: post.coverLicenseUrl || post.coverCreditUrl || source.url || ""
    }
  };
  cache.set(source.url, result);
  return result;
}

function repairPost(post, sourcePack = null) {
  if (post.contentType !== "breaking") return null;
  if (!Array.isArray(post.sourceLinks) || !post.sourceLinks.length) return null;
  const newsroom = buildMarketNewsroomPost({
    language: post.language,
    pack: sourcePack?.pack || {},
    post,
    slug: post.slug,
    author: post.author,
    readTimeMinutes: post.readTimeMinutes
  });
  return {
    title: newsroom.title,
    seoTitle: newsroom.seoTitle,
    seoDescription: newsroom.seoDescription,
    excerpt: newsroom.excerpt,
    geoSummary: newsroom.geoSummary,
    body: newsroom.body,
    keyTakeaways: newsroom.keyTakeaways,
    faqs: newsroom.faqs,
    sourceLinks: newsroom.sourceLinks,
    cover: newsroom.cover,
    coverSource: newsroom.coverSource,
    coverCredit: newsroom.coverCredit,
    coverCreditUrl: newsroom.coverCreditUrl,
    coverLicense: newsroom.coverLicense,
    coverLicenseUrl: newsroom.coverLicenseUrl,
    coverAlt: newsroom.coverAlt,
    contentImages: newsroom.contentImages,
    aiDisclosure: ""
  };
}

function changed(post, patch) {
  if (!patch) return false;
  return Object.entries(patch).some(([key, value]) => JSON.stringify(post[key] ?? (Array.isArray(value) ? [] : "")) !== JSON.stringify(value));
}

async function verifyPublic(root, items) {
  const checks = [];
  for (const item of items) {
    const language = item.language || "zh-Hant";
    const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(item.slug)}?language=${encodeURIComponent(language)}`);
    const post = payload.post || payload;
    checks.push({ language, slug: item.slug, leak: forbiddenLeak(post), title: post.title });
  }
  return checks;
}

function postFilter({ languageArg, statusArg, contentTypeArg }) {
  return (post) =>
    (languageArg === "all" || post.language === languageArg) &&
    (statusArg === "all" || post.status === statusArg) &&
    contentTypeMatches(post, contentTypeArg);
}

function selectPosts(posts, { languageArg, statusArg, contentTypeArg, limit }) {
  return posts
    .filter(postFilter({ languageArg, statusArg, contentTypeArg }))
    .map((post) => ({ post, patch: repairPost(post) }))
    .filter(({ post, patch }) => changed(post, patch))
    .slice(0, limit > 0 ? limit : undefined);
}

async function selectPostsWithSources(posts, { languageArg, statusArg, contentTypeArg, limit }) {
  const candidates = posts
    .filter(postFilter({ languageArg, statusArg, contentTypeArg }))
    .slice(0, limit > 0 ? limit : undefined);
  const cache = new Map();
  const selected = [];
  const held = [];
  for (const post of candidates) {
    const sourcePack = await sourcePackForPost(post, cache);
    if (!sourcePack.ok) {
      held.push({ id: post.id, language: post.language, slug: post.slug, reason: sourcePack.reason });
      continue;
    }
    let localized;
    try {
      const sourceUrl = firstSource(post)?.url || post.slug;
      const cacheKey = `translations:${sourceUrl}`;
      if (cache.has(cacheKey)) localized = cache.get(cacheKey);
      else {
        localized = await localizeSourcePack(sourcePack.pack, {
          projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || ""
        });
        cache.set(cacheKey, localized);
      }
    } catch (error) {
      held.push({ id: post.id, language: post.language, slug: post.slug, reason: `translation failed: ${error?.message || String(error)}` });
      continue;
    }
    const localizedPack = packForLanguage(sourcePack.pack, post.language, localized);
    const patch = repairPost(post, { pack: localizedPack });
    if (changed(post, patch)) selected.push({ post, patch });
  }
  return { selected, held };
}

function repairCmsFile({ cmsFile, outFile, dryRun, languageArg, statusArg, contentTypeArg, limit }) {
  throw new Error("cms-file repair is disabled for market news because sourceArticle translation requires live source extraction; use --base-url with admin repair");
  const data = JSON.parse(fs.readFileSync(cmsFile, "utf8"));
  const posts = Array.isArray(data.blogPosts) ? data.blogPosts : [];
  const selected = selectPosts(posts, { languageArg, statusArg, contentTypeArg, limit });
  const selectedIds = new Set(selected.map(({ post }) => post.id));
  const now = new Date().toISOString();
  let updated = 0;
  data.blogPosts = posts.map((post) => {
    if (!selectedIds.has(post.id)) return post;
    const patch = repairPost(post);
    const next = { ...post, ...patch, updatedAt: now };
    const leak = forbiddenLeak(next);
    if (leak) throw new Error(`repair would leak ${leak} in ${post.language}/${post.slug}`);
    updated += 1;
    return next;
  });
  if (!dryRun) fs.writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { ok: true, dryRun, mode: "cms-file", input: cmsFile, output: dryRun ? "" : outFile, selected: selected.length, updated };
}

async function main() {
  loadEnvFile(path.join(process.env.HOME || "", ".altoslab-blog-worker.env"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const languageArg = arg("language", "all");
  const statusArg = arg("status", "published");
  const contentTypeArg = arg("content-type", "breaking");
  const limit = Number.parseInt(arg("limit", "0"), 10) || 0;
  const dryRun = hasFlag("dry-run");
  const skipPublicCheck = hasFlag("skip-public-check");
  const useBulkPatch = hasFlag("bulk");

  if (!BLOG_LANGUAGES.includes(languageArg) && languageArg !== "all") {
    throw new Error(`unsupported --language ${languageArg}`);
  }

  const cmsFileArg = arg("cms-file", "");
  if (cmsFileArg) {
    const cmsFile = path.resolve(cmsFileArg);
    const outFile = path.resolve(arg("out-cms", cmsFile));
    console.log(JSON.stringify(repairCmsFile({ cmsFile, outFile, dryRun, languageArg, statusArg, contentTypeArg, limit }), null, 2));
    return;
  }

  const root = baseUrl();
  const cookie = await login(root);
  const adminPosts = (await fetchJson(`${root}/api/admin/blog`, { headers: { Cookie: cookie } })).payload.posts || [];
  const { selected, held } = await selectPostsWithSources(adminPosts, { languageArg, statusArg, contentTypeArg, limit });
  const preview = selected.map(({ post, patch }) => ({
    id: post.id,
    language: post.language,
    slug: post.slug,
    titleBefore: post.title,
    titleAfter: patch.title
  }));

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, root, selected: selected.length, held: held.slice(0, 40), preview: preview.slice(0, 40) }, null, 2));
    return;
  }

  const updated = [];
  const failures = [];
  if (useBulkPatch) {
    const { payload } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ patches: selected.map(({ post, patch }) => ({ id: post.id, patch })) })
    });
    updated.push(...(payload.updated || []));
    failures.push(...(payload.failures || []));
  } else {
    for (const { post, patch } of selected) {
      try {
        const { payload } = await fetchJson(`${root}/api/admin/blog/${post.id}`, {
          method: "PATCH",
          headers: { Cookie: cookie },
          body: JSON.stringify(patch)
        });
        updated.push(payload.post || payload);
      } catch (error) {
        failures.push({ id: post.id, slug: post.slug, reason: error?.message || String(error) });
      }
    }
  }

  const publicChecks = skipPublicCheck || !updated.length ? [] : await verifyPublic(root, updated.slice(0, 20));
  const leaks = publicChecks.filter((item) => item.leak);
  console.log(JSON.stringify({ ok: failures.length === 0 && leaks.length === 0, root, selected: selected.length, held, updated: updated.length, failures, publicChecks }, null, 2));
  if (failures.length || leaks.length) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
