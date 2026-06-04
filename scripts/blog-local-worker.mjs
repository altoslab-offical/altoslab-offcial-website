#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGE_LABEL = LANGUAGES.join(", ");
const COLUMN_DAILY_LIMIT = Number(process.env.ALTOS_BLOG_COLUMN_DAILY_LIMIT || "2");

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB local blog worker

Required publish flow:
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --publish

Useful dry runs:
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot afternoon --validate-only
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --validate-only --manifest ./prepared-candidate.json
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --validate-only --browser-evidence ./browser-evidence.json --approve-design-qa
  node scripts/blog-local-worker.mjs --make-prompt --slot morning --topic "AI agents in customer operations"
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --publish
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --publish --reuse-validated-manifest --manifest ./prepared-candidate.json

Environment:
  BLOG_INGEST_HMAC_SECRET   Shared HMAC secret configured in Vercel
  ALTOS_BLOG_BASE_URL       Defaults to ${DEFAULT_BASE_URL}
`);
}

function taiwanDate(input = new Date()) {
  const tw = new Date(input.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  return `${tw.getFullYear()}-${String(tw.getMonth() + 1).padStart(2, "0")}-${String(tw.getDate()).padStart(2, "0")}`;
}

function scheduledFor(date, slot) {
  return `${date}T${SLOT_HOURS[slot]}:00+08:00`;
}

function inferSlot(input = new Date()) {
  const tw = new Date(input.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  return tw.getHours() < 12 ? "morning" : "afternoon";
}

function sign(secret, timestamp, nonce, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function baseUrl() {
  return (arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": sign(secret, timestamp, nonce, body)
  };
}

function sourceUrls(post) {
  return (post.sourceLinks || []).map((source) => source.url).sort();
}

function hashString(input) {
  let hash = 2166136261;
  for (const char of String(input)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function clampColor(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blend(a, b, t) {
  return clampColor(a + (b - a) * t);
}

function setPixel(buffer, width, height, x, y, rgba) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const index = (y * width + x) * 4;
  buffer[index] = rgba[0];
  buffer[index + 1] = rgba[1];
  buffer[index + 2] = rgba[2];
  buffer[index + 3] = rgba[3];
}

function drawLine(buffer, width, height, x0, y0, x1, y1, rgba, thickness = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    for (let ox = -thickness; ox <= thickness; ox += 1) {
      for (let oy = -thickness; oy <= thickness; oy += 1) {
        if (ox * ox + oy * oy <= thickness * thickness) setPixel(buffer, width, height, x + ox, y + oy, rgba);
      }
    }
  }
}

function strokeRect(buffer, width, height, x, y, rectWidth, rectHeight, rgba, thickness = 1) {
  drawLine(buffer, width, height, x, y, x + rectWidth, y, rgba, thickness);
  drawLine(buffer, width, height, x, y + rectHeight, x + rectWidth, y + rectHeight, rgba, thickness);
  drawLine(buffer, width, height, x, y, x, y + rectHeight, rgba, thickness);
  drawLine(buffer, width, height, x + rectWidth, y, x + rectWidth, y + rectHeight, rgba, thickness);
}

function drawCircle(buffer, width, height, cx, cy, radius, rgba) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const distance = Math.sqrt(x * x + y * y);
      if (distance <= radius) {
        const alpha = Math.max(0.25, 1 - distance / Math.max(radius, 1));
        setPixel(buffer, width, height, cx + x, cy + y, [
          blend(10, rgba[0], alpha),
          blend(18, rgba[1], alpha),
          blend(24, rgba[2], alpha),
          255
        ]);
      }
    }
  }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let current = i;
    for (let k = 0; k < 8; k += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[i] = current >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function coverPalette(seed) {
  const palettes = [
    { base: [8, 17, 23], glow: [74, 198, 214], accent: [172, 226, 44], wash: [24, 74, 84] },
    { base: [12, 16, 24], glow: [116, 168, 245], accent: [154, 215, 83], wash: [54, 57, 86] },
    { base: [9, 19, 17], glow: [94, 210, 171], accent: [181, 219, 55], wash: [42, 83, 58] },
    { base: [14, 14, 24], glow: [186, 130, 236], accent: [177, 218, 36], wash: [77, 54, 96] }
  ];
  return palettes[seed % palettes.length];
}

async function generateCoverPng(post, index, outputDir, ingestRunId) {
  const width = 1200;
  const height = 630;
  const seed = hashString(`${post.language || ""}:${post.title || post.topic || ""}:${ingestRunId || ""}`);
  const palette = coverPalette(seed + index);
  const buffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const radial = Math.max(0, 1 - Math.hypot((x - width * 0.6) / width, (y - height * 0.42) / height) * 1.7);
      const shade = ((x + y + seed) % 37) / 37;
      const index4 = (y * width + x) * 4;
      buffer[index4] = blend(palette.base[0], palette.wash[0], radial * 0.7 + shade * 0.04);
      buffer[index4 + 1] = blend(palette.base[1], palette.wash[1], radial * 0.7 + shade * 0.04);
      buffer[index4 + 2] = blend(palette.base[2], palette.wash[2], radial * 0.7 + shade * 0.04);
      buffer[index4 + 3] = 255;
    }
  }

  for (let x = 0; x < width; x += 72) drawLine(buffer, width, height, x, 0, x, height, [54, 76, 84, 255], 1);
  for (let y = 0; y < height; y += 72) drawLine(buffer, width, height, 0, y, width, y, [54, 76, 84, 255], 1);

  const offset = seed % 190;
  for (let i = -2; i < 9; i += 1) {
    const x0 = i * 190 - offset;
    drawLine(buffer, width, height, x0, 0, x0 + 820, height, [palette.glow[0], palette.glow[1], palette.glow[2], 120], i % 3 === 0 ? 2 : 1);
  }

  const nodes = [
    [240 + (seed % 50), 170 + (seed % 40)],
    [430 + (seed % 36), 138 + (seed % 30)],
    [590 + (seed % 44), 224 + (seed % 24)],
    [720 + (seed % 64), 160 + (seed % 42)],
    [900 + (seed % 58), 248 + (seed % 36)],
    [268 + (seed % 40), 404 + (seed % 38)],
    [450 + (seed % 56), 336 + (seed % 40)],
    [628 + (seed % 48), 420 + (seed % 32)],
    [790 + (seed % 58), 360 + (seed % 38)],
    [984 + (seed % 36), 382 + (seed % 34)]
  ];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const [x0, y0] = nodes[i];
    const [x1, y1] = nodes[(i + 2) % nodes.length];
    drawLine(buffer, width, height, x0, y0, x1, y1, [palette.glow[0], palette.glow[1], palette.glow[2], 120], 2);
  }
  for (const [nodeIndex, node] of nodes.entries()) {
    const rgba = nodeIndex % 3 === 0 ? palette.accent : palette.glow;
    drawCircle(buffer, width, height, Math.round(node[0]), Math.round(node[1]), nodeIndex % 4 === 0 ? 17 : 11, [rgba[0], rgba[1], rgba[2], 255]);
  }

  strokeRect(buffer, width, height, 105, 95, 230, 120, [palette.accent[0], palette.accent[1], palette.accent[2], 180], 1);
  strokeRect(buffer, width, height, 805, 79, 250, 117, [palette.accent[0], palette.accent[1], palette.accent[2], 180], 1);
  strokeRect(buffer, width, height, 135, 470, 300, 70, [palette.accent[0], palette.accent[1], palette.accent[2], 170], 1);
  strokeRect(buffer, width, height, 720, 431, 330, 94, [palette.accent[0], palette.accent[1], palette.accent[2], 170], 1);

  await fs.mkdir(outputDir, { recursive: true });
  const safeLanguage = String(post.language || `post-${index + 1}`).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const safeSlug = String(post.slug || post.topic || "blog-cover").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
  const outputPath = path.join(outputDir, `${safeSlug}-${safeLanguage}.png`);
  await fs.writeFile(outputPath, encodePng(width, height, buffer));
  return outputPath;
}

async function generateMissingCovers(payload, slot) {
  if (!hasFlag("generate-missing-covers")) return payload;
  if (process.env.BLOG_ALLOW_LOCAL_FALLBACK_COVERS !== "1") {
    throw new Error("Local fallback cover generation is disabled for production. Use credited source images for market news or ChatGPT/GPT-generated covers for columns/features.");
  }
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const outputDir =
    arg("cover-dir") ||
    path.join(os.tmpdir(), "altoslab-blog-worker", payload.ingestRunId || payload.translationGroupId || `${taiwanDate()}-${slot}`);
  const generatedAt = new Date().toISOString();

  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    if (post.cover || post.coverLocalPath) continue;
    const coverLocalPath = await generateCoverPng(post, index, outputDir, payload.ingestRunId || payload.translationGroupId);
    const prompt = `Wordless ALTOS LAB editorial bitmap for ${post.title || post.topic || "AI article"}: evidence trail, workflow checkpoints, evaluation loop, brand-free, human-free, typography-free composition.`;
    post.coverLocalPath = coverLocalPath;
    post.coverSource = "generated";
    post.coverCredit = "AI-generated by ALTOS LAB";
    post.coverAlt = post.coverAlt || `Wordless editorial workflow map for ${post.title || "ALTOS LAB AI article"}`;
    post.coverGeneration = {
      ...(post.coverGeneration || {}),
      source: "generated",
      provider: "codex-local-png",
      model: "programmatic-editorial-render-v1",
      prompt,
      style: "ALTOS LAB editorial technology visual, dark grid, signal nodes and audit checkpoints",
      generatedAt,
      status: "generated",
      visualChecks: {
        topicFit: true,
        noTextArtifacts: true,
        noLogos: true,
        noPeople: true,
        noTrademarkRisk: true,
        noGenericStockLook: true,
        checkedBy: "codex-local-image-qa",
        checkedAt: generatedAt,
        notes: "Wordless generated workflow/audit visual with brand-free, human-free and typography-free composition."
      }
    };
  }
  return payload;
}

function isAllowedCoverUrl(url) {
  if (!url) return false;
  if (String(url).startsWith("https://")) return true;
  if (process.env.BLOG_IMAGE_ALLOW_LOCAL_HTTP === "1") {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    } catch {
      return false;
    }
  }
  return false;
}

const genericStockImageHosts = new Set([
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
]);

function parsedHost(value) {
  try {
    return new URL(value || "").hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGenericStockImageUrl(value) {
  const host = parsedHost(value);
  return Boolean(host && [...genericStockImageHosts].some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`)));
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
  return sourceUrls(post).some((url) => sourceHostMatches(post.coverCreditUrl || "", url));
}

function articleSetCoverIssues(posts) {
  const issues = [];
  const groups = new Map();
  for (const post of posts) {
    const group = post.translationGroupId || "__article_set__";
    groups.set(group, [...(groups.get(group) || []), post]);
  }

  for (const [group, groupPosts] of groups) {
    if (groupPosts.length < 2) continue;
    const covers = [...new Set(groupPosts.map((post) => String(post.cover || "").trim()).filter(Boolean))];
    if (covers.length > 1) {
      issues.push(
        `all language versions in an article set must share the same cover URL (${group}: ${groupPosts
          .map((post) => `${post.language || "unknown"}/${post.slug || "missing-slug"}`)
          .join(", ")})`
      );
    }
  }

  return issues;
}

function articleSetContentImageIssues(posts) {
  const issues = [];
  const groups = new Map();
  for (const post of posts) {
    const group = post.translationGroupId || "__article_set__";
    groups.set(group, [...(groups.get(group) || []), post]);
  }

  for (const [group, groupPosts] of groups) {
    if (groupPosts.length < 2) continue;
    const counts = [...new Set(groupPosts.map((post) => (Array.isArray(post.contentImages) ? post.contentImages.length : 0)))];
    if (counts.length > 1) {
      issues.push(`all language versions in an article set must share the same number of content images (${group})`);
    }
    const maxCount = Math.max(...counts, 0);
    for (let index = 0; index < maxCount; index += 1) {
      const urls = [...new Set(groupPosts.map((post) => String(post.contentImages?.[index]?.url || "").trim()).filter(Boolean))];
      if (urls.length > 1) {
        issues.push(`all language versions in an article set must share content image ${index + 1} URL (${group})`);
      }
    }
  }

  return issues;
}

function generatedContentImageIssues(image, label) {
  const issues = [];
  if (!/(chatgpt|gpt|openai)/i.test(String(image.provider || ""))) issues.push(`${label} provider must be ChatGPT/GPT`);
  if (!image.prompt) issues.push(`${label} prompt is required`);
  if (!image.generatedAt) issues.push(`${label} generatedAt is required`);
  const checks = image.visualChecks || {};
  for (const field of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
    if (checks[field] !== true) issues.push(`${label} visualChecks.${field} must be true`);
  }
  return issues;
}

function localPreflight(payload) {
  const issues = [];
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const chromeEvidence = payload.chromeEvidence || {};
  const geminiEvidence = chromeEvidence.gemini || {};
  const chatgptEvidence = chromeEvidence.chatgpt || {};
  const humanDesignQa = payload.humanDesignQa || {};
  const requiresGptCover = posts.some((post) => post.contentType !== "breaking");
  const isMarketNewsSet = posts.some((post) => post.contentType === "breaking");
  const isMarketOnlySet = posts.length > 0 && posts.every((post) => post.contentType === "breaking");
  const isSourceTranslationLane = payload.generation?.provider === "source-translation";

  if (!isMarketOnlySet || !isSourceTranslationLane) {
    if (geminiEvidence.usedExistingTab !== true) issues.push("chromeEvidence.gemini.usedExistingTab must be true");
    if (geminiEvidence.changedModel === true) issues.push("chromeEvidence.gemini.changedModel must not be true");
  }
  if (requiresGptCover && chatgptEvidence.usedExistingTab !== true) issues.push("chromeEvidence.chatgpt.usedExistingTab must be true for generated covers");
  if (chatgptEvidence.changedModel === true) issues.push("chromeEvidence.chatgpt.changedModel must not be true");
  if (humanDesignQa.approved !== true) issues.push("humanDesignQa.approved must be true before validate-only can mark a candidate ready");

  const languages = posts.map((post) => post.language);
  for (const language of LANGUAGES) {
    if (!languages.includes(language)) issues.push(`missing ${language} post`);
    if (languages.filter((item) => item === language).length > 1) issues.push(`duplicate ${language} post`);
  }
  if (isMarketNewsSet) {
    const missingMarketLanguages = LANGUAGES.filter((language) => !languages.includes(language));
    if (missingMarketLanguages.length) {
      issues.push(`market news fast lane requires translated versions for every configured language; missing ${missingMarketLanguages.join(", ")}`);
    }
  }
  if (!payload.translationGroupId && !posts.every((post) => post.translationGroupId)) {
    issues.push("translationGroupId is required at payload or post level");
  }
  issues.push(...articleSetCoverIssues(posts));
  issues.push(...articleSetContentImageIssues(posts));

  const referenceSources = sourceUrls(posts[0] || {});
  for (const post of posts) {
    if (!post.title || !post.body || !post.excerpt || !post.geoSummary) {
      issues.push(`${post.language || "unknown"} missing title, body, excerpt or geoSummary`);
    }
    if (!Array.isArray(post.faqs) || post.faqs.length === 0) issues.push(`${post.language || "unknown"} missing FAQ`);
    if (!Array.isArray(post.sourceLinks) || post.sourceLinks.length === 0) issues.push(`${post.language || "unknown"} missing sources`);
    if (JSON.stringify(sourceUrls(post)) !== JSON.stringify(referenceSources)) {
      issues.push(`${post.language || "unknown"} sourceLinks differ from the multilingual set`);
    }
    const marketNews = post.contentType === "breaking";
    if (marketNews && post.coverSource !== "source") {
      issues.push(`${post.language || "unknown"} market news coverSource must be source`);
    }
    if (!marketNews && post.coverSource !== "generated") {
      issues.push(`${post.language || "unknown"} non-news coverSource must be generated`);
    }
    if (!isAllowedCoverUrl(post.cover)) issues.push(`${post.language || "unknown"} cover must be a public https URL`);
    if (!post.coverAlt || post.coverAlt.length < 18) issues.push(`${post.language || "unknown"} coverAlt is missing or too thin`);
    const generation = post.coverGeneration || {};
    const contentImages = Array.isArray(post.contentImages) ? post.contentImages : [];
    if (marketNews) {
      if (!post.coverCredit || !post.coverCreditUrl || !post.coverLicense) {
        issues.push(`${post.language || "unknown"} source cover must include coverCredit, coverCreditUrl and coverLicense`);
      }
      if (isGenericStockImageUrl(post.cover) || isGenericStockImageUrl(post.coverCreditUrl)) {
        issues.push(`${post.language || "unknown"} market news source image must come from the source article or official announcement, not stock/free image providers`);
      }
      if (!sourceCoverCreditMatchesSource(post)) {
        issues.push(`${post.language || "unknown"} market news coverCreditUrl must match one of the sourceLinks`);
      }
    } else {
      if (!generation.provider || !generation.prompt || !generation.generatedAt) {
        issues.push(`${post.language || "unknown"} coverGeneration must include provider, prompt and generatedAt`);
      }
      if (!/(chatgpt|gpt|openai)/i.test(String(generation.provider || ""))) {
        issues.push(`${post.language || "unknown"} coverGeneration.provider must be ChatGPT/GPT`);
      }
      const checks = generation.visualChecks || {};
      for (const field of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
        if (checks[field] !== true) issues.push(`${post.language || "unknown"} visualChecks.${field} must be true`);
      }
      if (contentImages.length < 2) issues.push(`${post.language || "unknown"} column/feature requires at least two in-article images`);
      if (contentImages.length > 3) issues.push(`${post.language || "unknown"} column/feature should use no more than three in-article images`);
      for (const [index, image] of contentImages.entries()) {
        const label = `${post.language || "unknown"} contentImages[${index}]`;
        if (!isAllowedCoverUrl(image.url)) issues.push(`${label} must be a public https URL`);
        if (!image.alt || image.alt.length < 18) issues.push(`${label}.alt is missing or too thin`);
        if (image.source !== "generated") issues.push(`${label}.source must be generated for columns/features`);
        issues.push(...generatedContentImageIssues(image, label));
      }
    }
    const generatedBy = String(post.generatedBy || "").toLowerCase();
    const sourceTranslatedMarketNews = marketNews && /source-translation|source_translat|source-worker|codex-market|market-source/.test(generatedBy);
    if (!sourceTranslatedMarketNews && !generatedBy.includes("gemini")) {
      issues.push(`${post.language || "unknown"} article must be drafted or revised through Gemini`);
    }
  }
  return issues;
}

function manifestStatusFromValidate(validate, payload) {
  const errors = Array.isArray(validate.json?.errors) ? validate.json.errors : [];
  const quality = validate.json?.qualitySummary || {};
  const image = validate.json?.imageQualitySummary || {};
  const designApproved = payload.humanDesignQa?.approved === true;
  return validate.ok &&
    validate.json?.wouldPublish === true &&
    errors.length === 0 &&
    quality.approved === true &&
    image.approved === true &&
    designApproved
    ? "ready"
    : "held";
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

function releaseContentSha256(payload) {
  const posts = [...(payload.posts || [])]
    .map(digestSourcePost)
    .sort((a, b) => String(a.language || "").localeCompare(String(b.language || "")));
  return sha256(
    stableJson({
      translationGroupId: payload.translationGroupId || payload.posts?.find((post) => post.translationGroupId)?.translationGroupId,
      slot: payload.slot,
      generationDate: payload.generationDate,
      scheduledFor: payload.scheduledFor,
      posts
    })
  );
}

function bodySha256(post) {
  return sha256(String(post.body || ""));
}

function isSourceReachabilityWarning(warning) {
  return /^source link validation warning:/i.test(String(warning || ""));
}

function blockingManifestWarnings(warnings) {
  return (warnings || []).filter((warning) =>
    /anti-slop|market-news opening could be more concrete|repeated sentence rhythm|authenticity score|rhythm score|template|formulaic|raw English|technical jargon/i.test(
      String(warning || "")
    )
  );
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function preparedCandidateIndexPath(payload, slot) {
  const date = payload.generationDate || taiwanDate();
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

async function writePreparedCandidateManifest({ manifestPath, articleSetPath, releaseArticleSetPath, payload, slot, validate, publish }) {
  const errors = Array.isArray(validate.json?.errors) ? validate.json.errors : [];
  const qualitySummary = validate.json?.qualitySummary || {};
  const imageQualitySummary = validate.json?.imageQualitySummary || {};
  const status = publish
    ? publish.ok && publish.json?.skipped !== true && (publish.json?.publishedIds?.length || 0) >= (payload.posts || []).length
      ? "released"
      : "held"
    : manifestStatusFromValidate(validate, payload);
  const manifest = {
    status,
    slot,
    expectedReleaseAt: payload.scheduledFor || scheduledFor(payload.generationDate || taiwanDate(), slot),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingestRunId: payload.ingestRunId,
    translationGroupId: payload.translationGroupId,
    articleSetPath: releaseArticleSetPath || articleSetPath,
    sourceArticleSetPath: articleSetPath,
    manifestPath: manifestPath ? path.resolve(manifestPath) : undefined,
    coverFiles: (payload.posts || []).map((post) => post.coverLocalPath).filter(Boolean),
    coverUrls: (payload.posts || []).map((post) => post.cover).filter(Boolean),
    contentImageFiles: (payload.posts || []).flatMap((post) => (post.contentImages || []).map((image) => image.localPath).filter(Boolean)),
    contentImageUrls: (payload.posts || []).flatMap((post) => (post.contentImages || []).map((image) => image.url).filter(Boolean)),
    chromeEvidence: payload.chromeEvidence || {},
    validateOnly: {
      status: validate.status,
      wouldPublish: validate.json?.wouldPublish === true,
      qualityApproved: qualitySummary.approved === true,
      qualityScore: qualitySummary.score,
      qualityThreshold: qualitySummary.threshold,
      imageApproved: imageQualitySummary.approved === true,
      imageScore: imageQualitySummary.score,
      imageThreshold: imageQualitySummary.threshold,
      errors,
      warnings: [...(qualitySummary.warnings || []), ...(imageQualitySummary.warnings || [])]
    },
    qualityManifest: {
      gateVersion: "altos-blog-local-worker-v1",
      reviewer: payload.humanDesignQa?.reviewedBy || "main-brain",
      reviewedAt: payload.humanDesignQa?.reviewedAt || new Date().toISOString(),
      contentSha256: releaseContentSha256(payload),
      posts: (payload.posts || []).map((post) => ({
        language: post.language,
        slug: post.slug,
        bodySha256: bodySha256(post),
        cover: post.cover,
        contentImages: (post.contentImages || []).map((image) => image.url).filter(Boolean)
      })),
      qualitySummary: {
        approved: qualitySummary.approved === true,
        score: qualitySummary.score,
        threshold: qualitySummary.threshold,
        issues: qualitySummary.issues || [],
        warnings: qualitySummary.warnings || []
      },
      imageQualitySummary: {
        approved: imageQualitySummary.approved === true,
        score: imageQualitySummary.score,
        threshold: imageQualitySummary.threshold,
        issues: imageQualitySummary.issues || [],
        warnings: imageQualitySummary.warnings || []
      }
    },
    humanDesignQa: payload.humanDesignQa || { approved: false },
    publish: publish
      ? {
          status: publish.status,
          publishedIds: publish.json?.publishedIds || [],
          heldDraftIds: publish.json?.heldDraftIds || [],
          errors: publish.json?.errors || [],
          event: publish.json?.event
        }
      : undefined
  };
  if (manifestPath) {
    await writeJsonFile(manifestPath, manifest);
    await writeJsonFile(preparedCandidateIndexPath(payload, slot), manifest);
  }
  return manifest;
}

function reusableManifestIssues(manifest, payload) {
  const issues = [];
  const qualityManifest = manifest?.qualityManifest || {};
  const quality = qualityManifest.qualitySummary || {};
  const image = qualityManifest.imageQualitySummary || {};
  const validateOnly = manifest?.validateOnly || {};

  if (!["ready", "held"].includes(manifest?.status)) {
    issues.push(`manifest status must be ready or retryable held, got ${manifest?.status || "missing"}`);
  }
  if (validateOnly.wouldPublish !== true) issues.push("validateOnly.wouldPublish must be true");
  if (validateOnly.qualityApproved !== true) issues.push("validateOnly.qualityApproved must be true");
  if (validateOnly.imageApproved !== true) issues.push("validateOnly.imageApproved must be true");
  if (Array.isArray(validateOnly.errors) && validateOnly.errors.length > 0) {
    issues.push(`validateOnly errors must be empty: ${validateOnly.errors.join("; ")}`);
  }
  if (quality.approved !== true) issues.push("qualityManifest.qualitySummary.approved must be true");
  if (image.approved !== true) issues.push("qualityManifest.imageQualitySummary.approved must be true");
  if (Array.isArray(quality.issues) && quality.issues.length > 0) {
    issues.push(`qualityManifest quality issues must be empty: ${quality.issues.join("; ")}`);
  }
  const blockingQualityWarnings = blockingManifestWarnings(quality.warnings);
  if (blockingQualityWarnings.length > 0) {
    issues.push(`qualityManifest blocking quality warnings must be empty: ${blockingQualityWarnings.join("; ")}`);
  }
  if (Array.isArray(image.issues) && image.issues.length > 0) {
    issues.push(`qualityManifest image issues must be empty: ${image.issues.join("; ")}`);
  }
  if (Array.isArray(image.warnings) && image.warnings.length > 0) {
    issues.push(`qualityManifest image warnings must be empty: ${image.warnings.join("; ")}`);
  }
  if (qualityManifest.contentSha256 !== releaseContentSha256(payload)) {
    issues.push("qualityManifest.contentSha256 does not match current article set");
  }
  issues.push(...articleSetCoverIssues(payload.posts || []));
  const manifestPosts = Array.isArray(qualityManifest.posts) ? qualityManifest.posts : [];
  for (const post of payload.posts || []) {
    const manifestPost = manifestPosts.find((item) => item.language === post.language && item.slug === post.slug);
    if (!manifestPost) {
      issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} missing manifest digest`);
    } else {
      if (manifestPost.bodySha256 !== bodySha256(post)) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} body digest changed after validate-only`);
      }
      if (manifestPost.cover !== post.cover) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} cover changed after validate-only`);
      }
    }
  }
  return issues;
}

async function reusableValidateFromManifest(manifestPath, payload) {
  if (!manifestPath) throw new Error("--manifest is required with --reuse-validated-manifest");
  const manifest = JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8"));
  const issues = reusableManifestIssues(manifest, payload);
  if (issues.length) {
    throw new Error(`validated manifest cannot be reused: ${issues.join("; ")}`);
  }
  return {
    status: manifest.validateOnly?.status || 200,
    ok: true,
    json: {
      ok: true,
      wouldPublish: true,
      errors: [],
      qualitySummary: manifest.qualityManifest.qualitySummary,
      imageQualitySummary: manifest.qualityManifest.imageQualitySummary,
      reusedQualityManifest: true
    }
  };
}

async function readArticleSet(filePath, slot) {
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(raw);
  const browserEvidencePath = arg("browser-evidence");
  if (browserEvidencePath) {
    const browserEvidence = JSON.parse(await fs.readFile(browserEvidencePath, "utf8"));
    payload.chromeEvidence = browserEvidence.chromeEvidence || browserEvidence;
  }
  const date = payload.generationDate || taiwanDate();
  return {
    slot,
    generationDate: date,
    scheduledFor: payload.scheduledFor || scheduledFor(date, slot),
    publishMode: payload.publishMode || "publish-if-valid",
    generation: {
      provider: payload.generation?.provider || "gemini-chatgpt",
      promptVersion: payload.generation?.promptVersion || "altos-gemini-gpt-browser-v1",
      model: payload.generation?.model,
      sourceCount: payload.generation?.sourceCount
    },
    ...payload
  };
}

async function requestIngest(payload, validateOnly) {
  const secret = process.env.BLOG_INGEST_HMAC_SECRET;
  if (!secret) throw new Error("BLOG_INGEST_HMAC_SECRET is required");

  const body = JSON.stringify({ ...payload, validateOnly });
  const response = await fetch(`${baseUrl()}/api/admin/blog/ingest-set${validateOnly ? "?validateOnly=true" : ""}`, {
    method: "POST",
    headers: signedHeaders(secret, body),
    body
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, json };
}

async function requestRelease(payload, qualityManifest) {
  const secret = process.env.BLOG_INGEST_HMAC_SECRET;
  if (!secret) throw new Error("BLOG_INGEST_HMAC_SECRET is required");

  const body = JSON.stringify({
    ...payload,
    generation: {
      ...payload.generation,
      provider: "gemini-chatgpt"
    },
    qualityManifest
  });
  const response = await fetch(`${baseUrl()}/api/admin/blog/release-set`, {
    method: "POST",
    headers: signedHeaders(secret, body),
    body
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, json };
}

function postGroupId(post) {
  return post.translationGroupId || post.slug || post.id || "";
}

function nonBreakingGroups(posts) {
  return new Set((posts || []).filter((post) => post.contentType !== "breaking").map(postGroupId).filter(Boolean));
}

async function fetchPublishedPosts(language = "zh-Hant") {
  const response = await fetch(`${baseUrl()}/api/blog?language=${encodeURIComponent(language)}&limit=120`, {
    headers: { Accept: "application/json", "User-Agent": "ALTOS-LAB-blog-local-worker/1.0" }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`blog cadence check failed ${response.status}: ${JSON.stringify(json)}`);
  return json.posts || [];
}

async function columnCadenceIssues(payload) {
  const groups = nonBreakingGroups(payload.posts || []);
  if (groups.size === 0) return [];
  const issues = [];
  if (groups.size !== 1) {
    issues.push(`column/feature release payload must contain exactly one translationGroupId, got ${groups.size}`);
  }
  if (hasFlag("allow-column-burst") || process.env.ALTOS_BLOG_ALLOW_COLUMN_BURST === "true") return issues;
  if (!Number.isFinite(COLUMN_DAILY_LIMIT) || COLUMN_DAILY_LIMIT <= 0) return issues;

  const today = taiwanDate();
  const published = await fetchPublishedPosts("zh-Hant");
  const publishedToday = new Set(
    published
      .filter((post) => post.contentType !== "breaking")
      .filter((post) => {
        const rawDate = post.publishedAt || post.createdAt || "";
        return rawDate && taiwanDate(new Date(rawDate)) === today;
      })
      .map(postGroupId)
      .filter(Boolean)
  );
  const newGroups = [...groups].filter((group) => !publishedToday.has(group));
  if (publishedToday.size + newGroups.length > COLUMN_DAILY_LIMIT) {
    issues.push(
      `column daily release limit reached for ${today}: ${publishedToday.size} already live, ${newGroups.length} new, limit ${COLUMN_DAILY_LIMIT}`
    );
  }
  return issues;
}

async function requestMediaUpload(filePath, ingestRunId) {
  const secret = process.env.BLOG_INGEST_HMAC_SECRET;
  if (!secret) throw new Error("BLOG_INGEST_HMAC_SECRET is required");
  const extension = path.extname(filePath).toLowerCase();
  const contentType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";
  const bytes = await fs.readFile(filePath);
  const body = JSON.stringify({
    ingestRunId,
    filename: path.basename(filePath),
    contentType,
    base64: bytes.toString("base64")
  });
  const response = await fetch(`${baseUrl()}/api/admin/blog/media`, {
    method: "POST",
    headers: signedHeaders(secret, body),
    body
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.ok) {
    throw new Error(`cover upload failed ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function uploadLocalCovers(payload) {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const uploadByPath = new Map();
  async function uploadOnce(filePath, purpose) {
    const absolutePath = path.resolve(filePath);
    if (!uploadByPath.has(absolutePath)) {
      uploadByPath.set(
        absolutePath,
        requestMediaUpload(absolutePath, payload.ingestRunId || payload.translationGroupId || purpose)
      );
    }
    return uploadByPath.get(absolutePath);
  }
  for (const post of posts) {
    if (!post.coverLocalPath) continue;
    const upload = await uploadOnce(post.coverLocalPath, "blog-cover");
    post.cover = upload.url;
    post.coverGeneration = {
      ...(post.coverGeneration || {}),
      storedUrl: upload.url
    };
    delete post.coverLocalPath;
  }
  for (const post of posts) {
    if (!Array.isArray(post.contentImages)) continue;
    for (const image of post.contentImages) {
      if (!image.localPath) continue;
      const upload = await uploadOnce(image.localPath, "blog-content-image");
      image.url = upload.url;
      delete image.localPath;
    }
  }
  return payload;
}

function articlePrompt(slot, topic, lane = "column") {
  const marketLane = lane === "market";
  return `# ALTOS LAB ${marketLane ? "source-translation market-news" : "Gemini + GPT column"} article set prompt

Slot: ${slot} (${SLOT_HOURS[slot]} Asia/Taipei)
Lane: ${marketLane ? "market-news-fast-lane" : "deep-column-lane"}
Topic: ${topic || (marketLane ? "pick the strongest verified AI market signal from today's official/reputable sources" : "pick one original ALTOS LAB AI column angle for founders and operators")}

Create one article set in ${LANGUAGE_LABEL}.

Hard requirements:
- ${marketLane ? "Market news uses source-translation from verified source articles. Do not use Gemini by default. Use the source article or official announcement image with visible source credit; do not use GPT art or a previously used cover." : "Gemini writes/revises one zh-Hant source-of-truth column first. Main-brain QA must pass before any localization starts."}
- ${marketLane ? "Translate/adapt the source facts into all configured languages with native local phrasing. Do not copy source paragraphs or article structure." : "After the zh-Hant source passes, gpt-5.3-codex-spark workers localize en, ja, ko, id, vi, th, ms and fil without inventing facts or changing sources/media."}
- ${marketLane ? "Do not open ChatGPT/GPT for market-news images." : "For column/feature posts, generate the cover image and 2-3 in-article images through ChatGPT/GPT in the ALTOS Blog QA Chrome group."}
- Close or release any task-owned Gemini/GPT tabs after the run so Chrome memory is not held.
- Do not repeat an existing published/draft topic, headline angle or source package.
- Use zh-Hant as the editorial source of truth, then localize the other languages for local readers.
- Keep one translationGroupId, identical sourceLinks, one shared cover URL and one shared contentImages URL set across all ${LANGUAGES.length} languages.
- Write like a sharp AI product/editorial studio, not an SEO farm.
- Opening must answer the reader's decision in the first 40-80 words.
- Include ALTOS LAB judgment, source translation note, FAQ, SEO title/meta and GEO summary as schema/backend fields; do not expose SEO/GEO/AI-generation/process terms in public copy.
- Column/feature cover images must be generated per article, uploaded through the signed ALTOS LAB media route, and include provider, prompt, generatedAt, coverCredit and visualChecks.
- Column/feature contentImages must include url or localPath, alt, caption, source "generated", credit "ALTOS LAB editorial visual", aspectRatio, placement, provider, prompt, generatedAt and visualChecks.
- Market news cover images must use coverSource "source" with coverCredit, coverCreditUrl and coverLicense; if the source image is missing, unsafe or already used, hold the candidate.

Return only JSON shaped for POST /api/admin/blog/ingest-set:
{
  "ingestRunId": "${marketLane ? "source-translation" : "browser-gemini-gpt"}-YYYY-MM-DD-${slot}-short-topic",
  "slot": "${slot}",
  "translationGroupId": "same-group-id",
  "publishMode": "publish-if-valid",
  "generation": { "provider": "${marketLane ? "source-translation" : "gemini-chatgpt"}", "promptVersion": "${marketLane ? "altos-market-source-translation-v1" : "altos-gemini-gpt-browser-v1"}" },
  "posts": []
}
`;
}

async function makePrompt() {
  const slot = arg("slot") || inferSlot();
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");
  const lane = arg("lane", "column");
  if (!["column", "market"].includes(lane)) throw new Error("--lane must be column or market");
  const prompt = articlePrompt(slot, arg("topic"), lane);
  const outputDir = path.join(os.tmpdir(), "altoslab-blog-worker");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${lane === "market" ? "source-translation" : "gemini-gpt"}-${taiwanDate()}-${slot}.md`);
  await fs.writeFile(outputPath, prompt, "utf8");
  console.log(outputPath);
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }
  if (hasFlag("make-prompt")) {
    await makePrompt();
    return;
  }

  const articleSet = arg("article-set");
  const slot = arg("slot") || inferSlot();
  if (!articleSet) throw new Error("--article-set is required unless --make-prompt is used");
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");

  const manifestPath = arg("manifest");
  const payload = await uploadLocalCovers(await generateMissingCovers(await readArticleSet(articleSet, slot), slot));
  if (hasFlag("approve-design-qa")) {
    payload.humanDesignQa = {
      approved: true,
      reviewedBy: "main-brain",
      reviewedAt: new Date().toISOString(),
      notes: arg("design-qa-notes", "Approved after main-brain article and image QA.")
    };
  }
  const issues = localPreflight(payload);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, phase: "local-preflight", issues }, null, 2));
    process.exit(1);
  }

  let releaseArticleSetPath = "";
  if (manifestPath) {
    releaseArticleSetPath = path.join(path.dirname(path.resolve(manifestPath)), "article-set.release.json");
    await writeJsonFile(releaseArticleSetPath, payload);
  }

  const validate =
    hasFlag("publish") && hasFlag("reuse-validated-manifest")
      ? await reusableValidateFromManifest(manifestPath, payload)
      : await requestIngest(payload, true);
  console.log(
    JSON.stringify(
      {
        phase: "validateOnly",
        status: validate.status,
        reusedQualityManifest: validate.json?.reusedQualityManifest === true,
        response: validate.json
      },
      null,
      2
    )
  );
  await writePreparedCandidateManifest({
    manifestPath,
    articleSetPath: path.resolve(articleSet),
    releaseArticleSetPath,
    payload,
    slot,
    validate
  });
  if (!validate.ok || !validate.json?.wouldPublish) {
    process.exit(validate.ok ? 2 : 1);
  }

  if (hasFlag("publish")) {
    const preparedManifest = await writePreparedCandidateManifest({
      manifestPath,
      articleSetPath: path.resolve(articleSet),
      releaseArticleSetPath,
      payload,
      slot,
      validate
    });
    const cadenceIssues = await columnCadenceIssues(payload);
    if (cadenceIssues.length) {
      const publish = {
        status: 409,
        ok: false,
        json: {
          ok: false,
          skipped: true,
          event: "column-cadence-held",
          errors: cadenceIssues
        }
      };
      console.log(JSON.stringify({ phase: "release-held", status: publish.status, response: publish.json }, null, 2));
      await writePreparedCandidateManifest({
        manifestPath,
        articleSetPath: path.resolve(articleSet),
        releaseArticleSetPath,
        payload,
        slot,
        validate,
        publish
      });
      process.exit(1);
    }
    const publish = await requestRelease(payload, preparedManifest.qualityManifest);
    console.log(JSON.stringify({ phase: "release", status: publish.status, response: publish.json }, null, 2));
    await writePreparedCandidateManifest({
      manifestPath,
      articleSetPath: path.resolve(articleSet),
      releaseArticleSetPath,
      payload,
      slot,
      validate,
      publish
    });
    if (!publish.ok) process.exit(1);
    return;
  }

  if (!hasFlag("validate-only")) {
    console.log("Validation passed. Re-run with --publish to submit the article set.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
