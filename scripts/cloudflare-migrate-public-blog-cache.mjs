#!/usr/bin/env node

import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";
import { createDecipheriv, createHash } from "crypto";

const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_KV_BINDING = "ALTOS_BLOG_KV";
const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";
const LIST_LIMIT_PER_LANGUAGE = Number(process.env.PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE || "600");
const binding = process.env.CLOUDFLARE_KV_BINDING || DEFAULT_KV_BINDING;
const cmsStorageKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;
const skipDetail = process.argv.includes("--skip-detail");
const allowLegacySource = process.argv.includes("--legacy-source");

function safeStorageKey(key) {
  return key.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

function safeCachePart(value) {
  return value.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "post";
}

const cmsPathname = `cms:${safeStorageKey(cmsStorageKey)}`;
const canonicalCmsKey = cmsPathname;
const oldKey = `${cmsPathname}:public-blog:v1`;
const listKey = `${cmsPathname}:public-blog-list:v2`;
const inventoryKey = `${cmsPathname}:public-blog-inventory:v1`;
const duplicateKey = `${cmsPathname}:public-blog-duplicates:v1`;

function detailKey(post) {
  return `${cmsPathname}:public-blog-detail:v1:${safeCachePart(post.language)}:${safeCachePart(post.slug)}`;
}

function runWrangler(args, options = {}) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    ...options
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `wrangler exited ${result.status}`).trim());
  }
  return result.stdout;
}

function cmsEncryptionKey() {
  const secret = process.env.CMS_ENCRYPTION_KEY;
  if (!secret) return null;
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
  return createHash("sha256").update(secret).digest();
}

function decryptCmsData(payload) {
  const key = cmsEncryptionKey();
  if (!key) throw new Error("CMS_ENCRYPTION_KEY is required to read encrypted CMS data.");

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]).toString("utf8");
  return JSON.parse(decrypted);
}

function parseCmsPayload(raw) {
  const parsed = JSON.parse(raw);
  if (parsed?.encrypted) return decryptCmsData(parsed);
  return parsed;
}

function articleTimestamp(post) {
  return new Date(post.updatedAt || post.publishedAt || post.createdAt).getTime() || 0;
}

function sortByPublicRecency(posts) {
  return [...posts].sort((a, b) => articleTimestamp(b) - articleTimestamp(a) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function compactListPost(post) {
  return {
    ...post,
    body: "",
    audience: "",
    sourceLinks: [],
    keyTakeaways: [],
    faqs: [],
    contentImages: [],
    qualityIssues: [],
    generationTrace: undefined
  };
}

function compactInventoryPost(post) {
  return {
    ...compactListPost(post),
    title: "",
    seoTitle: "",
    seoDescription: "",
    excerpt: "",
    topic: "",
    geoSummary: "",
    tags: [],
    cover: "",
    coverAlt: "",
    coverSource: undefined,
    coverCredit: undefined,
    coverCreditUrl: undefined,
    coverLicense: undefined,
    coverLicenseUrl: undefined,
    readTimeMinutes: 0,
    featured: false,
    qualityChecks: {}
  };
}

function compactDuplicatePost(post) {
  return {
    ...post,
    body: "",
    audience: "",
    keyTakeaways: [],
    faqs: [],
    contentImages: [],
    qualityIssues: [],
    generationTrace: undefined,
    seoTitle: "",
    seoDescription: "",
    excerpt: "",
    geoSummary: "",
    tags: [],
    coverAlt: "",
    coverSource: undefined,
    coverCredit: undefined,
    coverCreditUrl: undefined,
    coverLicense: undefined,
    coverLicenseUrl: undefined,
    readTimeMinutes: 0,
    featured: false,
    qualityChecks: {}
  };
}

async function putJson(key, payload, tmpRoot, metadata) {
  const file = path.join(tmpRoot, `${Buffer.from(key).toString("base64url")}.json`);
  await writeFile(file, JSON.stringify(payload), "utf8");
  runWrangler([
    "kv",
    "key",
    "put",
    key,
    "--path",
    file,
    "--binding",
    binding,
    "--remote",
    "--metadata",
    JSON.stringify(metadata)
  ]);
}

async function main() {
  let sourceKey = canonicalCmsKey;
  let parsed = null;
  try {
    parsed = parseCmsPayload(runWrangler(["kv", "key", "get", canonicalCmsKey, "--binding", binding, "--remote", "--text"]));
  } catch (error) {
    if (!allowLegacySource) {
      throw new Error(
        `Canonical CMS cache read failed (${error instanceof Error ? error.message : "unknown error"}). Refusing to rebuild public cache from legacy public-blog:v1 without --legacy-source.`
      );
    }
    sourceKey = oldKey;
    parsed = JSON.parse(runWrangler(["kv", "key", "get", oldKey, "--binding", binding, "--remote", "--text"]));
  }
  const sourcePosts = Array.isArray(parsed.blogPosts) ? parsed.blogPosts : parsed.posts;
  const posts = Array.isArray(sourcePosts) ? sourcePosts.filter((post) => post?.status === "published") : [];
  if (!posts.length) throw new Error(`${sourceKey} has no published posts; aborting public blog cache migration.`);

  const listPosts = BLOG_LANGUAGES.flatMap((language) =>
    sortByPublicRecency(posts.filter((post) => post.language === language))
      .slice(0, LIST_LIMIT_PER_LANGUAGE)
      .map(compactListPost)
  );
  const inventoryPosts = posts.map(compactInventoryPost);
  const duplicatePosts = posts.map(compactDuplicatePost);

  const updatedAt = new Date().toISOString();
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "altos-public-blog-cache-"));
  try {
    await putJson(
      listKey,
      {
        version: 1,
        updatedAt,
        limitPerLanguage: LIST_LIMIT_PER_LANGUAGE,
        posts: listPosts
      },
      tmpRoot,
      {
        contentType: "application/json",
        updatedAt,
        source: "cms-public-blog-list-cache"
      }
    );

    await putJson(
      inventoryKey,
      {
        version: 1,
        updatedAt,
        posts: inventoryPosts
      },
      tmpRoot,
      {
        contentType: "application/json",
        updatedAt,
        source: "cms-public-blog-inventory-cache"
      }
    );

    await putJson(
      duplicateKey,
      {
        version: 1,
        updatedAt,
        posts: duplicatePosts
      },
      tmpRoot,
      {
        contentType: "application/json",
        updatedAt,
        source: "cms-public-blog-duplicate-cache"
      }
    );

    if (!skipDetail) {
      for (const post of posts) {
        await putJson(
          detailKey(post),
          {
            version: 1,
            updatedAt,
            post
          },
          tmpRoot,
          {
            contentType: "application/json",
            updatedAt,
            source: "cms-public-blog-detail-cache",
            language: post.language,
            slug: post.slug,
            translationGroupId: post.translationGroupId
          }
        );
      }
    }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "cloudflare-public-blog-cache-migration",
        sourceKey,
        listKey,
        inventoryKey,
        duplicateKey,
        publishedPosts: posts.length,
        listPosts: listPosts.length,
        inventoryPosts: inventoryPosts.length,
        duplicatePosts: duplicatePosts.length,
        detailPosts: skipDetail ? "skipped" : posts.length,
        languages: Object.fromEntries(BLOG_LANGUAGES.map((language) => [language, posts.filter((post) => post.language === language).length])),
        updatedAt
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
