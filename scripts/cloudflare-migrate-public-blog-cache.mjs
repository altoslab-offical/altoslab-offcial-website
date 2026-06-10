#!/usr/bin/env node

import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_KV_BINDING = "ALTOS_BLOG_KV";
const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";
const LIST_LIMIT_PER_LANGUAGE = Number(process.env.PUBLIC_BLOG_CACHE_LIMIT_PER_LANGUAGE || "80");
const binding = process.env.CLOUDFLARE_KV_BINDING || DEFAULT_KV_BINDING;
const cmsStorageKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;

function safeStorageKey(key) {
  return key.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

function safeCachePart(value) {
  return value.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "post";
}

const cmsPathname = `cms:${safeStorageKey(cmsStorageKey)}`;
const oldKey = `${cmsPathname}:public-blog:v1`;
const listKey = `${cmsPathname}:public-blog-list:v1`;

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

function sortByOrder(posts) {
  return [...posts].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function compactListPost(post) {
  return {
    ...post,
    body: "",
    faqs: [],
    contentImages: [],
    generationTrace: undefined
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
  const raw = runWrangler(["kv", "key", "get", oldKey, "--binding", binding, "--remote", "--text"]);
  const parsed = JSON.parse(raw);
  const posts = Array.isArray(parsed.posts) ? parsed.posts.filter((post) => post?.status === "published") : [];
  if (!posts.length) throw new Error("Old public blog cache has no published posts; aborting migration.");

  const listPosts = BLOG_LANGUAGES.flatMap((language) =>
    sortByOrder(posts.filter((post) => post.language === language))
      .slice(0, LIST_LIMIT_PER_LANGUAGE)
      .map(compactListPost)
  );

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
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "cloudflare-public-blog-cache-migration",
        sourceKey: oldKey,
        listKey,
        publishedPosts: posts.length,
        listPosts: listPosts.length,
        detailPosts: posts.length,
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
