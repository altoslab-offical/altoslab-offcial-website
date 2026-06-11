#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const ADMIN_COOKIE = "altos_admin";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function baseUrl() {
  return String(arg("base-url", process.env.ALTOS_ADMIN_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL)).replace(/\/+$/, "");
}

function password() {
  return arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ALTOS-LAB-blog-copy-refresh/1.0",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  }
  return { payload, response };
}

async function login(root) {
  const pass = password();
  if (!pass) throw new Error("ALTOS_ADMIN_PASSWORD or ADMIN_PASSWORD is required");
  const { response } = await fetchJson(`${root}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password: pass })
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/);
  if (!match?.[1]) throw new Error("Admin login did not return an altos_admin cookie");
  return match[1];
}

async function fetchPublicPost(root, post) {
  const slug = String(post?.slug || "").trim();
  const language = String(post?.language || "").trim();
  if (!slug || !language) return null;
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}&ts=${Date.now()}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });
  return payload.post || payload.payload?.post || payload;
}

function cleanPatch(patch) {
  const next = {
    title: String(patch.title || "").trim(),
    excerpt: String(patch.excerpt || "").trim(),
    seoTitle: String(patch.seoTitle || patch.title || "").trim(),
    seoDescription: String(patch.seoDescription || patch.excerpt || "").trim()
  };
  if (patch.geoSummary !== undefined) next.geoSummary = String(patch.geoSummary || "").trim();
  if (patch.body !== undefined) next.body = String(patch.body || "").trim();
  if (patch.keyTakeaways !== undefined) next.keyTakeaways = patch.keyTakeaways;
  if (patch.faqs !== undefined) next.faqs = patch.faqs;
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      throw new Error(`copy patch for ${patch.id} is missing ${key}`);
    }
    const publicText = Array.isArray(value)
      ? JSON.stringify(value)
      : String(value);
    if (/(SEO|GEO|AI-generated|prompt|quality gate|model selector|Gemini|ChatGPT)/i.test(publicText)) {
      throw new Error(`copy patch for ${patch.id} leaks internal production language in ${key}`);
    }
  }
  return next;
}

async function main() {
  const patchPath = path.resolve(arg("patch"));
  if (!patchPath || patchPath === process.cwd()) throw new Error("--patch is required");
  const root = baseUrl();
  const dryRun = hasFlag("dry-run");
  const patchFile = await readJson(patchPath);
  const patches = Array.isArray(patchFile.patches) ? patchFile.patches : [];
  if (!patches.length) throw new Error("patch file must contain patches[]");
  const patchById = new Map(patches.map((patch) => [patch.id, patch]));
  if (patchById.size !== patches.length) throw new Error("patch file contains duplicate ids");

  const cookie = dryRun ? "" : await login(root);
  const adminPosts = dryRun
    ? (await fetchJson(`${root}/api/blog`)).payload.posts || []
    : (await fetchJson(`${root}/api/admin/blog`, { headers: { Cookie: cookie } })).payload.posts || [];
  const adminById = new Map(adminPosts.map((post) => [post.id, post]));

  const results = [];
  for (const patch of patches) {
    const existing = adminById.get(patch.id);
    if (!existing) throw new Error(`post not found: ${patch.id}`);
    const body = cleanPatch(patch);
    if (dryRun) {
      results.push({ id: patch.id, language: existing.language, slug: existing.slug, action: "would-update", title: body.title });
      continue;
    }
    const { payload } = await fetchJson(`${root}/api/admin/blog/${patch.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie },
      body: JSON.stringify(body)
    });
    results.push({ id: patch.id, language: payload.post.language, slug: payload.post.slug, action: "updated", title: payload.post.title });
  }

  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun,
      root,
      patchPath,
      updated: 0,
      results,
      verification: [],
      failures: []
    }, null, 2));
    return;
  }

  const publicPosts = (await fetchJson(`${root}/api/blog?ts=${Date.now()}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  })).payload.posts || [];
  const publicById = new Map(publicPosts.map((post) => [post.id, post]));
  const verification = [];
  for (const patch of patches) {
    const summary = publicById.get(patch.id) || adminById.get(patch.id);
    const live = await fetchPublicPost(root, summary);
    const expected = cleanPatch(patch);
    const expectedEntries = Object.entries(expected);
    verification.push({
      id: patch.id,
      ok: Boolean(live) && expectedEntries.every(([key, value]) => JSON.stringify(live?.[key]) === JSON.stringify(value)),
      title: live?.title || "",
      excerpt: live?.excerpt || ""
    });
  }
  const failures = verification.filter((item) => !item.ok);

  console.log(JSON.stringify({
    ok: failures.length === 0,
    dryRun,
    root,
    patchPath,
    updated: dryRun ? 0 : results.length,
    results,
    verification,
    failures
  }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
