#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_BASE_URL = "https://altoslab-official-website.altoslab-ai.workers.dev";
const MIN_COVER_BYTES = 8_000;
const MIN_COVER_WIDTH = 1200;
const MIN_COVER_HEIGHT = 630;
const MIN_SOURCE_COVER_BYTES = 25_000;
const MIN_SOURCE_COVER_WIDTH = 768;
const MIN_SOURCE_COVER_HEIGHT = 432;
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

const PUBLIC_INTERNAL_COPY_PATTERNS = [
  /AI-generated/i,
  /AI generated/i,
  /AI\s*內容揭露/i,
  /AI\s*協助產生/i,
  /SEO\s*\/\s*GEO/i,
  /SEO\/GEO/i,
  /GEO\s*結構/i,
  /quality\s*gate/i,
  /品質\s*gate/i,
  /AI\s*感/i,
  /anti[-\s]?slop/i,
  /source[-\s]?translation/i,
  /來源轉譯/i,
  /source\s*brief/i,
  /source\s*index/i,
  /reader\s*note/i,
  /Decision\s*cue/i,
  /Next\s*action/i,
  /Event:\s/i,
  /Evidence:\s/i,
  /來源摘要/i,
  /可引用事實/i,
  /讀者怎麼看/i,
  /這則消息可以拿來/i,
  /卡在哪個流程/i,
  /原因是企業決策問題/i,
  /article claims should remain anchored/i,
  /prompt\s*card/i,
  /修稿隊列/i,
  /rubric/i
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

function isSourceReachabilityWarning(warning) {
  return /^source link validation warning:/i.test(String(warning || ""));
}

function blockingValidateWarnings(warnings) {
  return (warnings || [])
    .filter((warning) => !isSourceReachabilityWarning(warning))
    .filter((warning) => !/anti-slop pattern:\s*soft hedging/i.test(String(warning || "")))
    .filter((warning) =>
      /anti-slop|market-news opening could be more concrete|repeated sentence rhythm|authenticity score|rhythm score|template|formulaic|raw English|technical jargon/i.test(
        String(warning || "")
      )
    );
}

function normalizeText(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
    coverCreditUrl: post.coverCreditUrl,
    coverLicense: post.coverLicense,
    coverLicenseUrl: post.coverLicenseUrl,
    contentImages: post.contentImages,
    aiDisclosure: post.aiDisclosure
  };
}

function publicPostText(post) {
  return [
    post?.title,
    post?.seoTitle,
    post?.seoDescription,
    post?.excerpt,
    post?.geoSummary,
    post?.body,
    ...(post?.keyTakeaways || []),
    ...(post?.sourceLinks || []).flatMap((source) => [source?.title, source?.summary]),
    ...(post?.faqs || []).flatMap((faq) => [faq?.question, faq?.answer])
  ]
    .filter(Boolean)
    .join("\n");
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

function isColumnOrFeature(post) {
  return post.contentType === "column" || post.contentType === "feature";
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

function imageMinimumsFor(context = {}) {
  if (context.contentType === "breaking" && context.coverSource === "source") {
    return {
      minBytes: MIN_SOURCE_COVER_BYTES,
      minWidth: MIN_SOURCE_COVER_WIDTH,
      minHeight: MIN_SOURCE_COVER_HEIGHT
    };
  }
  return {
    minBytes: MIN_COVER_BYTES,
    minWidth: MIN_COVER_WIDTH,
    minHeight: MIN_COVER_HEIGHT
  };
}

function sourceImageBinaryContentTypeAllowed(url, contentType, dimensions, context = {}) {
  if (!(context.contentType === "breaking" && context.coverSource === "source")) return false;
  const normalizedType = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (!["application/octet-stream", "binary/octet-stream"].includes(normalizedType)) return false;
  if (!dimensions?.format) return false;
  return /\.(?:png|jpe?g|webp)(?:[?#].*)?$/i.test(String(url || "")) || ["png", "jpeg", "jpg", "webp"].includes(dimensions.format);
}

async function verifyImage(url, errors, warnings, context) {
  try {
    const minimums = imageMinimumsFor(context);
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        "User-Agent": "altos-blog-release-verifier/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok) pushIssue(errors, `image ${url} returned ${response.status}`, context);
    if (bytes.length < minimums.minBytes) pushIssue(errors, `image ${url} is too small (${bytes.length} bytes)`, context);
    const dimensions = imageDimensions(bytes);
    if (!dimensions) {
      pushIssue(errors, `image ${url} dimensions could not be parsed`, context);
      return null;
    }
    if (!contentType.startsWith("image/")) {
      if (sourceImageBinaryContentTypeAllowed(url, contentType, dimensions, context)) {
        pushWarning(warnings, `image ${url} uses ${contentType || "missing"} but parsed as ${dimensions.format}; accepted for credited source image`, context);
      } else {
        pushIssue(errors, `image ${url} has non-image content-type ${contentType || "missing"}`, context);
      }
    }
    if (dimensions.width < minimums.minWidth || dimensions.height < minimums.minHeight) {
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
    pushIssue(errors, `manifest.publish.publishedIds must contain ${LANGUAGES.length} published IDs`);
  }
  if (Array.isArray(manifest.publish?.errors) && manifest.publish.errors.length > 0) {
    pushIssue(errors, `manifest.publish.errors is not empty: ${manifest.publish.errors.join("; ")}`);
  }
  if (posts.length !== LANGUAGES.length) pushIssue(errors, `article set must contain ${LANGUAGES.length} posts, got ${posts.length}`);
  for (const language of LANGUAGES) {
    const count = posts.filter((post) => post.language === language).length;
    if (count !== 1) pushIssue(errors, `article set must contain exactly one ${language} post, got ${count}`);
  }
  const groupIds = new Set(posts.map((post) => post.translationGroupId || articleSet.translationGroupId).filter(Boolean));
  if (groupIds.size !== 1) pushIssue(errors, `article set must use one translationGroupId, got ${[...groupIds].join(", ") || "missing"}`);
  const columnPosts = posts.filter(isColumnOrFeature);
  if (columnPosts.length) {
    const contentImageCounts = [...new Set(columnPosts.map((post) => (Array.isArray(post.contentImages) ? post.contentImages.length : 0)))];
    if (contentImageCounts.length !== 1) {
      pushIssue(errors, `translated column/feature posts must share the same content image count, got ${contentImageCounts.join(", ")}`);
    }
    const expectedCount = contentImageCounts[0] || 0;
    if (expectedCount < 2) pushIssue(errors, "column/feature release requires at least two in-article images");
    if (expectedCount > 3) pushIssue(errors, "column/feature release should keep in-article images to three or fewer");
    for (let index = 0; index < expectedCount; index += 1) {
      const urls = [...new Set(columnPosts.map((post) => post.contentImages?.[index]?.url).filter(Boolean))];
      if (urls.length !== 1) {
        pushIssue(errors, `translated column/feature posts must share contentImages[${index}] URL, got ${urls.join(", ") || "missing"}`);
      }
    }
  }

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
    const manifestContentImages = Array.isArray(manifestPost.contentImages) ? manifestPost.contentImages : [];
    const postContentImages = Array.isArray(post.contentImages) ? post.contentImages.map((image) => image.url).filter(Boolean) : [];
    if (isColumnOrFeature(post) && manifestContentImages.length !== postContentImages.length) {
      pushIssue(errors, "qualityManifest content image count does not match article set", { language: post.language, slug: post.slug });
    }
    if (isColumnOrFeature(post) && JSON.stringify(manifestContentImages) !== JSON.stringify(postContentImages)) {
      pushIssue(errors, "qualityManifest content image URLs do not match article set", { language: post.language, slug: post.slug });
    }
  }
  if (manifest.validateOnly?.qualityApproved !== true) pushIssue(errors, "manifest validateOnly qualityApproved must be true");
  if (manifest.validateOnly?.imageApproved !== true) pushIssue(errors, "manifest validateOnly imageApproved must be true");
  if (Array.isArray(manifest.validateOnly?.warnings) && manifest.validateOnly.warnings.length) {
    const blockingWarnings = blockingValidateWarnings(manifest.validateOnly.warnings);
    if (blockingWarnings.length) {
      pushIssue(errors, "validate-only blocking warnings were present at release", { warnings: blockingWarnings });
    }
    const sourceWarnings = manifest.validateOnly.warnings.filter(isSourceReachabilityWarning);
    if (sourceWarnings.length) {
      pushWarning(warnings, "source reachability warnings were present at release", { warnings: sourceWarnings });
    }
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
    if (!normalizeText(html).includes(normalizeText(post.title).slice(0, 24))) {
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
  const publicApiText = publicPostText(publicPost);
  for (const pattern of PUBLIC_INTERNAL_COPY_PATTERNS) {
    if (pattern.test(publicApiText)) pushIssue(errors, `public API exposes internal copy: ${pattern}`, context);
  }
  if (post.contentType === "breaking") {
    if (publicPost.coverSource !== "source") {
      pushIssue(errors, `public API market news coverSource must be source, got ${publicPost.coverSource || "missing"}`, context);
    }
    if (!publicPost.coverCreditUrl || !publicPost.coverLicense) {
      pushIssue(errors, "public API market news source image attribution is missing", context);
    }
    if (isGenericStockImageUrl(publicPost.cover || post.cover) || isGenericStockImageUrl(publicPost.coverCreditUrl || post.coverCreditUrl)) {
      pushIssue(errors, "public API market news source image must come from the source article or official announcement, not stock/free image providers", context);
    }
    if (!sourceCoverCreditMatchesSource(publicPost)) {
      pushIssue(errors, "public API market news coverCreditUrl does not match sourceLinks", context);
    }
  } else {
    const coverProvider = String(publicPost.coverGeneration?.provider || post.coverGeneration?.provider || "");
    if (!/(chatgpt|gpt|openai)/i.test(coverProvider)) {
      pushIssue(errors, `public API coverGeneration.provider must be ChatGPT/GPT, got ${coverProvider || "missing"}`, context);
    }
    if (isColumnOrFeature(post)) {
      const publicImages = Array.isArray(publicPost.contentImages) ? publicPost.contentImages : [];
      const sourceImages = Array.isArray(post.contentImages) ? post.contentImages : [];
      if (publicImages.length < 2) pushIssue(errors, "public API column/feature contentImages must include at least two images", context);
      if (publicImages.length > 3) pushIssue(errors, "public API column/feature contentImages must not exceed three images", context);
      if (publicImages.length !== sourceImages.length) {
        pushIssue(errors, "public API contentImages count does not match the release article set", context);
      }
      for (const [index, sourceImage] of sourceImages.entries()) {
        const imageContext = { ...context, contentImageIndex: index };
        const publicImage = publicImages[index] || {};
        const sourceUrl = absoluteUrl(sourceImage.url, root);
        const publicUrl = absoluteUrl(publicImage.url, root);
        if (!sourceUrl) pushIssue(errors, `contentImages[${index}] URL is missing from article set`, imageContext);
        if (!publicUrl) pushIssue(errors, `public API contentImages[${index}] URL is missing`, imageContext);
        if (sourceUrl && publicUrl && sourceUrl !== publicUrl) {
          pushIssue(errors, `public API contentImages[${index}] URL does not match article set`, { ...imageContext, sourceUrl, publicUrl });
        }
        if (!publicImage.alt || publicImage.alt.length < 18) {
          pushIssue(errors, `public API contentImages[${index}] alt is missing or too thin`, imageContext);
        }
        if (!publicImage.caption) {
          pushWarning(warnings, `public API contentImages[${index}] caption is missing`, imageContext);
        }
        if (sourceImage.source !== "generated") {
          pushIssue(errors, `contentImages[${index}] must be generated for column/feature posts`, imageContext);
        }
        const provider = String(sourceImage.provider || "");
        if (!/(chatgpt|gpt|openai)/i.test(provider)) {
          pushIssue(errors, `contentImages[${index}] provider must be ChatGPT/GPT, got ${provider || "missing"}`, imageContext);
        }
        if (!sourceImage.prompt || String(sourceImage.prompt).length < 40) {
          pushIssue(errors, `contentImages[${index}] prompt metadata is missing or too thin`, imageContext);
        }
        if (!sourceImage.generatedAt) {
          pushIssue(errors, `contentImages[${index}] generatedAt is missing`, imageContext);
        }
        if (!sourceImage.credit) {
          pushIssue(errors, `contentImages[${index}] credit is missing`, imageContext);
        }
        const visualChecks = sourceImage.visualChecks || {};
        for (const key of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
          if (visualChecks[key] !== true) pushIssue(errors, `contentImages[${index}] visualChecks.${key} must be true`, imageContext);
        }
        if (publicUrl) await verifyImage(publicUrl, errors, warnings, imageContext);
      }
    }
  }
  if (!publicPost.coverAlt || publicPost.coverAlt.length < 18) pushIssue(errors, "public API coverAlt is missing or too thin", context);

  const coverUrl = absoluteUrl(publicPost.cover || post.cover, root);
  const image = coverUrl
    ? await verifyImage(coverUrl, errors, warnings, {
        ...context,
        contentType: publicPost.contentType || post.contentType,
        coverSource: publicPost.coverSource || post.coverSource
      })
    : null;
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

async function refreshPublicBlogCache(root, cookie, warnings) {
  if (!cookie) {
    pushWarning(warnings, "public blog cache refresh skipped because no admin token or password was provided");
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${root}/api/admin/blog/refresh-public-cache`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Cookie: cookie,
        "User-Agent": "altos-blog-release-verifier/1.0"
      }
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.ok !== true) {
      pushWarning(warnings, `public blog cache refresh failed with HTTP ${response.status}`);
      return null;
    }
    return json;
  } catch (error) {
    pushWarning(warnings, `public blog cache refresh failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return null;
  }
}

async function verifyAdminReadback(posts, root, errors, warnings, cookie) {
  if (!cookie) {
    pushWarning(warnings, "admin readback skipped because no admin token or password was provided");
    return null;
  }

  const { json, response } = await fetchJson(
    `${root}/api/admin/blog?fields=release-readback`,
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
    const generatedBy = String(adminPost.generatedBy || "").toLowerCase();
    const sourceTranslatedMarketNews =
      adminPost.contentType === "breaking" && /source-translation|source_translat|codex-market|market-source/.test(generatedBy);
    if (!generatedBy.includes("gemini") && !sourceTranslatedMarketNews) {
      pushIssue(errors, "admin readback generatedBy must keep Gemini provenance for columns/features or source-translation provenance for market news", {
        language: post.language,
        slug: post.slug
      });
    }
  }
  return { count: adminPosts.length };
}

async function adminCookie(root, warnings) {
  const password = arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (password) {
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
      } else {
        const setCookie = response.headers.get("set-cookie") || "";
        const match = setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/);
        if (match?.[1]) return match[1];
        pushWarning(warnings, "admin login succeeded but did not return an altos_admin cookie");
      }
    } catch (error) {
      pushWarning(warnings, `admin login readback failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  const token = arg("admin-token") || process.env.ALTOS_ADMIN_SESSION_TOKEN || process.env.ADMIN_SESSION_TOKEN || "";
  if (token) return `altos_admin=${encodeURIComponent(token)}`;
  return "";
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
  const adminCookieValue = await adminCookie(root, warnings);
  const publicCacheRefresh = await refreshPublicBlogCache(root, adminCookieValue, warnings);
  await verifyMetadataSurfaces(posts, root, errors, warnings);
  const adminReadback = await verifyAdminReadback(posts, root, errors, warnings, adminCookieValue);

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
      adminReadback,
      publicCacheRefresh
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
