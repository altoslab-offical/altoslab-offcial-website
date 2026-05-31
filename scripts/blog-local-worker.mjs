#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko"];
const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";

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
  node scripts/blog-local-worker.mjs --make-prompt --slot morning --topic "AI agents in customer operations"
  node scripts/blog-local-worker.mjs --article-set ./article-set.json --slot morning --generate-missing-covers --publish

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

function localPreflight(payload) {
  const issues = [];
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const languages = posts.map((post) => post.language);
  for (const language of LANGUAGES) {
    if (!languages.includes(language)) issues.push(`missing ${language} post`);
    if (languages.filter((item) => item === language).length > 1) issues.push(`duplicate ${language} post`);
  }
  if (!payload.translationGroupId && !posts.every((post) => post.translationGroupId)) {
    issues.push("translationGroupId is required at payload or post level");
  }

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
    if (post.coverSource !== "generated") issues.push(`${post.language || "unknown"} coverSource must be generated`);
    if (!isAllowedCoverUrl(post.cover)) issues.push(`${post.language || "unknown"} cover must be an https Blob URL`);
    if (!post.coverAlt || post.coverAlt.length < 18) issues.push(`${post.language || "unknown"} coverAlt is missing or too thin`);
    const generation = post.coverGeneration || {};
    if (!generation.provider || !generation.prompt || !generation.generatedAt) {
      issues.push(`${post.language || "unknown"} coverGeneration must include provider, prompt and generatedAt`);
    }
    const checks = generation.visualChecks || {};
    for (const field of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
      if (checks[field] !== true) issues.push(`${post.language || "unknown"} visualChecks.${field} must be true`);
    }
  }
  return issues;
}

async function readArticleSet(filePath, slot) {
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(raw);
  const date = payload.generationDate || taiwanDate();
  return {
    slot,
    generationDate: date,
    scheduledFor: payload.scheduledFor || scheduledFor(date, slot),
    publishMode: payload.publishMode || "publish-if-valid",
    generation: {
      provider: "local-antigravity",
      promptVersion: payload.generation?.promptVersion || "altos-local-antigravity-v1",
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
  for (const post of posts) {
    if (!post.coverLocalPath) continue;
    const upload = await requestMediaUpload(post.coverLocalPath, payload.ingestRunId || payload.translationGroupId || "blog-cover");
    post.cover = upload.url;
    post.coverGeneration = {
      ...(post.coverGeneration || {}),
      storedUrl: upload.url
    };
    delete post.coverLocalPath;
  }
  return payload;
}

function articlePrompt(slot, topic) {
  return `# ALTOS LAB Antigravity article set prompt

Slot: ${slot} (${SLOT_HOURS[slot]} Asia/Taipei)
Topic: ${topic || "pick the strongest AI market signal from today's sources"}

Create one article set in zh-Hant, en, ja, ko.

Hard requirements:
- Use zh-Hant as the editorial source of truth, then localize the other languages.
- Keep one translationGroupId and identical sourceLinks across all four languages.
- Write like a sharp AI product/editorial studio, not an SEO farm.
- Opening must answer the reader's decision in the first 40-80 words.
- Include ALTOS LAB judgment, source translation note, FAQ, SEO title/meta and GEO summary.
- Cover images must be generated per article, uploaded to Vercel Blob, and include provider, prompt, generatedAt, coverCredit and visualChecks.

Return only JSON shaped for POST /api/admin/blog/ingest-set:
{
  "ingestRunId": "local-antigravity-YYYY-MM-DD-${slot}-short-topic",
  "slot": "${slot}",
  "translationGroupId": "same-group-id",
  "publishMode": "publish-if-valid",
  "generation": { "provider": "local-antigravity", "promptVersion": "altos-local-antigravity-v1" },
  "posts": []
}
`;
}

async function makePrompt() {
  const slot = arg("slot") || inferSlot();
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");
  const prompt = articlePrompt(slot, arg("topic"));
  const outputDir = path.join(os.tmpdir(), "altoslab-blog-worker");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `antigravity-${taiwanDate()}-${slot}.md`);
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

  const payload = await uploadLocalCovers(await generateMissingCovers(await readArticleSet(articleSet, slot), slot));
  const issues = localPreflight(payload);
  if (issues.length) {
    console.error(JSON.stringify({ ok: false, phase: "local-preflight", issues }, null, 2));
    process.exit(1);
  }

  const validate = await requestIngest(payload, true);
  console.log(JSON.stringify({ phase: "validateOnly", status: validate.status, response: validate.json }, null, 2));
  if (!validate.ok || !validate.json?.wouldPublish) {
    process.exit(validate.ok ? 2 : 1);
  }

  if (hasFlag("publish")) {
    const publish = await requestIngest(payload, false);
    console.log(JSON.stringify({ phase: "publish", status: publish.status, response: publish.json }, null, 2));
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
