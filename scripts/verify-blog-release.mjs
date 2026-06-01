#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko"];
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const MIN_COVER_BYTES = 8_000;
const MIN_COVER_WIDTH = 1200;
const MIN_COVER_HEIGHT = 630;

const LANGUAGE_PATH_PREFIX = {
  "zh-Hant": "",
  en: "/en",
  ja: "/ja",
  ko: "/ko"
};

const PUBLIC_INTERNAL_COPY_PATTERNS = [
  /AI-generated/i,
  /AI generated/i,
  /AI\s*內容揭露/i,
  /AI\s*協助產生/i,
  /SEO\s*\/\s*GEO/i,
  /SEO\/GEO/i,
  /GEO\s*結構/i,
  /quality\s*gate/i,
  /品質\s*gate/i
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog release verifier

Run after a scheduled publish:
  node scripts/verify-blog-release.mjs --manifest data/blog-worker-runs/.../prepared-candidate.json

Optional:
  --article-set <path>      Override manifest.articleSetPath
  --base-url <url>          Defaults to ALTOS_BLOG_BASE_URL or ${DEFAULT_BASE_URL}
  --admin-token <token>     Optional admin readback cookie value
  --admin-password <value>  Optional admin password for login + readback
  --no-write-manifest       Do not append releaseVerification to the manifest
`);
}

function baseUrl() {
  return (arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function pushIssue(errors, message, context = {}) {
  errors.push({ message, ...context });
}

function pushWarning(warnings, message, context = {}) {
  warnings.push({ message, ...context });
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function digestSourcePost(post) {
  return {
    language: post.language,
    slug: post.slug,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: post.newsCategory,
    topic: post.topic,
    audience: post.audience,
    geoSummary: post.geoSummary,
    body: post.body,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    tags: post.tags,
    author: post.author,
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    coverGeneration: post.coverGeneration,
    coverCredit: post.coverCredit,
    aiDisclosure: post.aiDisclosure
  };
}

function releaseContentSha256(articleSet) {
  const posts = [...(articleSet.posts || [])]
    .map(digestSourcePost)
    .sort((a, b) => String(a.language || "").localeCompare(String(b.language || "")));
  return sha256(
    stableJson({
      translationGroupId: articleSet.translationGroupId || articleSet.posts?.find((post) => post.translationGroupId)?.translationGroupId,
      slot: articleSet.slot,
      generationDate: articleSet.generationDate,
      scheduledFor: articleSet.scheduledFor,
      posts
    })
  );
}

function bodySha256(post) {
  return sha256(String(post.body || ""));
}

function blogPostPath(post) {
  const prefix = LANGUAGE_PATH_PREFIX[post.language] ?? "";
  return `${prefix}/blog/${encodeURIComponent(post.slug)}`;
}

function absoluteUrl(target, root = baseUrl()) {
  if (!target) return "";
  if (/^https?:\/\//i.test(target)) return target;
  return `${root}${String(target).startsWith("/") ? target : `/${target}`}`;
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs || 18_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

async function fetchText(url, errors, context) {
  try {
    const response = await fetchWithTimeout(url, { headers: { "User-Agent": "altos-blog-release-verifier/1.0" } });
    const text = await response.text();
    if (!response.ok) pushIssue(errors, `GET ${url} returned ${response.status}`, context);
    return { response, text };
  } catch (error) {
    pushIssue(errors, `GET ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return { response: null, text: "" };
  }
}

async function fetchJson(url, errors, context, headers = {}) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "altos-blog-release-verifier/1.0",
        ...headers
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

function parsePngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (!buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
}

function parseJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3), format: "jpeg" };
    }
    offset += length;
  }
  return null;
}

function parseWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      format: "webp"
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: "webp"
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: "webp"
    };
  }
  return null;
}

function imageDimensions(buffer) {
  return parsePngDimensions(buffer) || parseJpegDimensions(buffer) || parseWebpDimensions(buffer);
}

async function verifyImage(url, errors, warnings, context) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        "User-Agent": "altos-blog-release-verifier/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) pushIssue(errors, `image ${url} returned ${response.status}`, context);
    if (!contentType.startsWith("image/")) pushIssue(errors, `image ${url} has non-image content-type ${contentType || "missing"}`, context);
    if (bytes.length < MIN_COVER_BYTES) pushIssue(errors, `image ${url} is too small (${bytes.length} bytes)`, context);
    const dimensions = imageDimensions(bytes);
    if (!dimensions) {
      pushIssue(errors, `image ${url} dimensions could not be parsed`, context);
      return null;
    }
    if (dimensions.width < MIN_COVER_WIDTH || dimensions.height < MIN_COVER_HEIGHT) {
      pushIssue(errors, `image ${url} dimensions are too small (${dimensions.width}x${dimensions.height})`, context);
    }
    return { ...dimensions, bytes: bytes.length, contentType };
  } catch (error) {
    pushIssue(errors, `image ${url} failed: ${error instanceof Error ? error.message : "unknown error"}`, context);
    return null;
  }
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/&amp;/g, "&");
  }
  return "";
}

function verifyManifest(manifest, articleSet, errors, warnings) {
  const posts = Array.isArray(articleSet.posts) ? articleSet.posts : [];
  if (manifest.status !== "released") pushIssue(errors, `manifest status must be released, got ${manifest.status || "missing"}`);
  if (!Array.isArray(manifest.publish?.publishedIds) || manifest.publish.publishedIds.length !== LANGUAGES.length) {
    pushIssue(errors, "manifest.publish.publishedIds must contain four published IDs");
  }
  if (Array.isArray(manifest.publish?.errors) && manifest.publish.errors.length > 0) {
    pushIssue(errors, `manifest.publish.errors is not empty: ${manifest.publish.errors.join("; ")}`);
  }
  if (posts.length !== LANGUAGES.length) pushIssue(errors, `article set must contain four posts, got ${posts.length}`);
  for (const language of LANGUAGES) {
    const count = posts.filter((post) => post.language === language).length;
    if (count !== 1) pushIssue(errors, `article set must contain exactly one ${language} post, got ${count}`);
  }
  const groupIds = new Set(posts.map((post) => post.translationGroupId || articleSet.translationGroupId).filter(Boolean));
  if (groupIds.size !== 1) pushIssue(errors, `article set must use one translationGroupId, got ${[...groupIds].join(", ") || "missing"}`);

  const expectedDigest = releaseContentSha256(articleSet);
  if (manifest.qualityManifest?.contentSha256 !== expectedDigest) {
    pushIssue(errors, "qualityManifest.contentSha256 does not match article set");
  }
  for (const post of posts) {
    const manifestPost = manifest.qualityManifest?.posts?.find((item) => item.language === post.language && item.slug === post.slug);
    if (!manifestPost) {
      pushIssue(errors, "qualityManifest is missing post digest", { language: post.language, slug: post.slug });
      continue;
    }
    if (manifestPost.bodySha256 !== bodySha256(post)) {
      pushIssue(errors, "qualityManifest bodySha256 does not match article body", { language: post.language, slug: post.slug });
    }
    if (manifestPost.cover !== post.cover) {
      pushIssue(errors, "qualityManifest cover URL does not match article cover", { language: post.language, slug: post.slug });
    }
  }
  if (manifest.validateOnly?.qualityApproved !== true) pushIssue(errors, "manifest validateOnly qualityApproved must be true");
  if (manifest.validateOnly?.imageApproved !== true) pushIssue(errors, "manifest validateOnly imageApproved must be true");
  if (Array.isArray(manifest.validateOnly?.warnings) && manifest.validateOnly.warnings.length) {
    pushWarning(warnings, "validate-only warnings were present at release", { warnings: manifest.validateOnly.warnings });
  }
}

async function verifyPostLive(post, root, errors, warnings) {
  const livePath = blogPostPath(post);
  const liveUrl = `${root}${livePath}`;
  const apiUrl = `${root}/api/blog/${encodeURIComponent(post.slug)}?language=${encodeURIComponent(post.language)}`;
  const context = { language: post.language, slug: post.slug };
  const htmlResult = await fetchText(liveUrl, errors, context);
  const apiResult = await fetchJson(apiUrl, errors, context);
  const html = htmlResult.text || "";
  const publicPost = apiResult.json?.post || null;

  if (htmlResult.response?.ok) {
    if (!html.includes(normalizeText(post.title).slice(0, 24))) {
      pushIssue(errors, "live article page does not contain the expected title", context);
    }
    if (/###/.test(html)) pushIssue(errors, "live article page exposes raw markdown ###", context);
    for (const pattern of PUBLIC_INTERNAL_COPY_PATTERNS) {
      if (pattern.test(html)) pushIssue(errors, `live article page exposes internal copy: ${pattern}`, context);
    }
    const ogImage = metaContent(html, "og:image");
    const twitterImage = metaContent(html, "twitter:image");
    if (!ogImage) pushIssue(errors, "live article page is missing og:image", context);
    if (!twitterImage) pushIssue(errors, "live article page is missing twitter:image", context);
    const expectedCover = absoluteUrl(publicPost?.cover || post.cover, root);
    if (ogImage && expectedCover && absoluteUrl(ogImage, root) !== expectedCover) {
      pushWarning(warnings, "og:image does not exactly match the public cover URL", { ...context, ogImage, expectedCover });
    }
    if (twitterImage && expectedCover && absoluteUrl(twitterImage, root) !== expectedCover) {
      pushWarning(warnings, "twitter:image does not exactly match the public cover URL", { ...context, twitterImage, expectedCover });
    }
  }

  if (!publicPost) {
    pushIssue(errors, "public API did not return the article", context);
    return { liveUrl, apiUrl, image: null };
  }
  if (publicPost.status !== "published") pushIssue(errors, `public API status must be published, got ${publicPost.status}`, context);
  if (publicPost.qualityStatus !== "passed") pushIssue(errors, `public API qualityStatus must be passed, got ${publicPost.qualityStatus}`, context);
  if (publicPost.imageQualityStatus !== "passed") {
    pushIssue(errors, `public API imageQualityStatus must be passed, got ${publicPost.imageQualityStatus}`, context);
  }
  if (publicPost.releaseDecision !== "published") {
    pushIssue(errors, `public API releaseDecision must be published, got ${publicPost.releaseDecision}`, context);
  }
  if (!String(publicPost.generatedBy || "").toLowerCase().includes("gemini")) {
    pushIssue(errors, "public API generatedBy does not show Gemini provenance", context);
  }
  const coverProvider = String(publicPost.coverGeneration?.provider || post.coverGeneration?.provider || "");
  if (!/(chatgpt|gpt|openai)/i.test(coverProvider)) {
    pushIssue(errors, `public API coverGeneration.provider must be ChatGPT/GPT, got ${coverProvider || "missing"}`, context);
  }
  if (!publicPost.coverAlt || publicPost.coverAlt.length < 18) pushIssue(errors, "public API coverAlt is missing or too thin", context);

  const coverUrl = absoluteUrl(publicPost.cover || post.cover, root);
  const image = coverUrl ? await verifyImage(coverUrl, errors, warnings, context) : null;
  if (!coverUrl) pushIssue(errors, "public API cover URL is missing", context);

  return { liveUrl, apiUrl, coverUrl, image };
}

async function verifyMetadataSurfaces(posts, root, errors, warnings) {
  const surfaces = [
    { path: "/feed.xml", name: "RSS" },
    { path: "/sitemap.xml", name: "sitemap" },
    { path: "/llms.txt", name: "llms.txt" }
  ];
  for (const surface of surfaces) {
    const url = `${root}${surface.path}`;
    const { text, response } = await fetchText(url, errors, { surface: surface.name });
    if (!response?.ok) continue;
    for (const post of posts) {
      const expectedPath = blogPostPath(post);
      if (!text.includes(expectedPath) && !text.includes(post.slug) && !text.includes(post.title)) {
        pushIssue(errors, `${surface.name} does not include released article`, {
          surface: surface.name,
          language: post.language,
          slug: post.slug
        });
      }
    }
  }

  const indexPages = [
    { language: "zh-Hant", path: "/blog" },
    { language: "en", path: "/en/blog" },
    { language: "ja", path: "/ja/blog" },
    { language: "ko", path: "/ko/blog" }
  ];
  for (const indexPage of indexPages) {
    const post = posts.find((item) => item.language === indexPage.language);
    if (!post) continue;
    const url = `${root}${indexPage.path}`;
    const { text, response } = await fetchText(url, errors, { surface: "blog-index", language: indexPage.language });
    if (response?.ok && !text.includes(post.slug) && !text.includes(post.title)) {
      pushIssue(errors, "blog index does not include released article", { language: post.language, slug: post.slug });
    }
  }
}

async function verifyAdminReadback(posts, root, errors, warnings) {
  const cookie = await adminCookie(root, warnings);
  if (!cookie) {
    pushWarning(warnings, "admin readback skipped because no admin token or password was provided");
    return null;
  }

  const { json, response } = await fetchJson(
    `${root}/api/admin/blog`,
    errors,
    { surface: "admin-blog" },
    { Cookie: cookie }
  );
  if (!response?.ok || !Array.isArray(json?.posts)) return null;

  const adminPosts = json.posts;
  for (const post of posts) {
    const adminPost = adminPosts.find((item) => item.slug === post.slug && item.language === post.language);
    if (!adminPost) {
      pushIssue(errors, "admin readback is missing released article", { language: post.language, slug: post.slug });
      continue;
    }
    for (const [key, expected] of Object.entries({
      status: "published",
      qualityStatus: "passed",
      imageQualityStatus: "passed",
      releaseDecision: "published"
    })) {
      if (adminPost[key] !== expected) {
        pushIssue(errors, `admin readback ${key} must be ${expected}, got ${adminPost[key] || "missing"}`, {
          language: post.language,
          slug: post.slug
        });
      }
    }
  }
  return { count: adminPosts.length };
}

async function adminCookie(root, warnings) {
  const token = arg("admin-token") || process.env.ALTOS_ADMIN_SESSION_TOKEN || process.env.ADMIN_SESSION_TOKEN || "";
  if (token) return `altos_admin=${encodeURIComponent(token)}`;

  const password = arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!password) return "";

  try {
    const response = await fetchWithTimeout(`${root}/api/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "altos-blog-release-verifier/1.0"
      },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      pushWarning(warnings, `admin login readback failed with HTTP ${response.status}`);
      return "";
    }
    const setCookie = response.headers.get("set-cookie") || "";
    const match = setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/);
    if (!match?.[1]) {
      pushWarning(warnings, "admin login succeeded but did not return an altos_admin cookie");
      return "";
    }
    return match[1];
  } catch (error) {
    pushWarning(warnings, `admin login readback failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return "";
  }
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const manifestPath = arg("manifest");
  if (!manifestPath) throw new Error("--manifest is required");

  const root = baseUrl();
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = await readJson(resolvedManifestPath);
  const articleSetPath = path.resolve(arg("article-set") || manifest.articleSetPath || "");
  if (!articleSetPath) throw new Error("--article-set or manifest.articleSetPath is required");
  const articleSet = await readJson(articleSetPath);
  const posts = Array.isArray(articleSet.posts) ? articleSet.posts : [];
  const errors = [];
  const warnings = [];
  const startedAt = new Date().toISOString();

  verifyManifest(manifest, articleSet, errors, warnings);
  const livePosts = [];
  for (const language of LANGUAGES) {
    const post = posts.find((item) => item.language === language);
    if (post) livePosts.push(await verifyPostLive(post, root, errors, warnings));
  }
  await verifyMetadataSurfaces(posts, root, errors, warnings);
  const adminReadback = await verifyAdminReadback(posts, root, errors, warnings);

  const result = {
    ok: errors.length === 0,
    phase: "release-verification",
    baseUrl: root,
    manifestPath: resolvedManifestPath,
    articleSetPath,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - Date.parse(startedAt),
    errors,
    warnings,
    summary: {
      languages: posts.map((post) => post.language),
      slugs: Object.fromEntries(posts.map((post) => [post.language, post.slug])),
      liveUrls: Object.fromEntries(livePosts.map((item) => [item?.apiUrl ? new URL(item.apiUrl).searchParams.get("language") : "", item?.liveUrl]).filter(([language, url]) => language && url)),
      covers: Object.fromEntries(
        livePosts
          .filter((item) => item?.coverUrl)
          .map((item) => [
            new URL(item.apiUrl).searchParams.get("language"),
            {
              url: item.coverUrl,
              width: item.image?.width,
              height: item.image?.height,
              bytes: item.image?.bytes,
              contentType: item.image?.contentType
            }
          ])
      ),
      adminReadback
    }
  };

  if (!hasFlag("no-write-manifest")) {
    const nextManifest = {
      ...manifest,
      releaseVerification: result
    };
    await writeJson(resolvedManifestPath, nextManifest);
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
