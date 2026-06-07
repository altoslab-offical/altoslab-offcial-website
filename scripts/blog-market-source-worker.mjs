#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { buildMarketNewsroomPost } from "./blog-market-newsroom.mjs";
import { localizeSourcePack, packForLanguage } from "./blog-market-translation-service.mjs";
import { cleanSourceTitle } from "./blog-market-source-article.mjs";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const MIN_LONGFORM_FACTS = Number(process.env.ALTOS_BLOG_MARKET_LONGFORM_MIN_FACTS || "5");
const MIN_LONGFORM_BODY_CHARS = Number(process.env.ALTOS_BLOG_MARKET_LONGFORM_MIN_BODY_CHARS || "700");
const FUNDING_QUICK_PATTERN =
  /\b(raises?|raised|funding|fundraise|pre-seed|seed round|series [a-f]|valuation|valued at|venture round|venture funding|capital raise|led by|participated in the round)\b/i;
const DEFAULT_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function slugify(value = "") {
  return cleanSourceTitle(value)
    .toLowerCase()
    .replace(/&#039;|&apos;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 74) || "market-news";
}

function firstSource(pack = {}) {
  return Array.isArray(pack.sourceLinks) ? pack.sourceLinks[0] || {} : {};
}

function validatePack(pack = {}) {
  const source = firstSource(pack);
  const article = pack.sourceArticle || {};
  const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
  const bodyChars = String(article.body || "").trim().length;
  const longformMode = pack.scanner?.newsDepth === "longform";
  const fundingQuickText = `${pack.topic || ""}\n${source.title || ""}\n${source.summary || ""}\n${article.headline || ""}\n${article.standfirst || ""}`;
  const issues = [];
  if (!source.url) issues.push("missing canonical source URL");
  if (!source.publisher) issues.push("missing source publisher");
  if (!pack.primarySourceImageUrl) issues.push("missing credited source image");
  if (!pack.coverCreditUrl) issues.push("missing source image credit URL");
  if (!article.canonicalUrl && !source.url) issues.push("missing sourceArticle canonical URL");
  if (facts.length < 3) issues.push("source extraction has fewer than 3 usable facts");
  if (longformMode) {
    if (facts.length < MIN_LONGFORM_FACTS) issues.push(`longform market news requires at least ${MIN_LONGFORM_FACTS} usable facts`);
    if (bodyChars < MIN_LONGFORM_BODY_CHARS) issues.push(`longform market news requires source body of at least ${MIN_LONGFORM_BODY_CHARS} chars`);
    if (Number(article.extractionConfidence || 0) < 0.7) issues.push("longform market news requires source extraction confidence >= 0.7");
    if (FUNDING_QUICK_PATTERN.test(fundingQuickText)) issues.push("longform market news rejects funding/financing quick items");
  }
  return issues;
}

function sharedTranslationGroupId(pack, date, slug) {
  const sequence = Number(pack.sequence);
  const seq = Number.isInteger(sequence) && sequence > 0 ? String(sequence).padStart(2, "0") : "xx";
  return `tg-market-${date}-${seq}-${slug}`;
}

function buildPost(language, pack, date, localizedPack = pack) {
  const source = firstSource(pack);
  const slug = slugify(source.title || pack.topic || pack.sourceArticle?.headline || "market-news");
  const translationGroupId = sharedTranslationGroupId(pack, date, slug);
  const author = Number(pack.sequence) % 4 === 1 ? "Tommy" : "Ken";
  const post = buildMarketNewsroomPost({
    language,
    pack: localizedPack,
    slug,
    author,
    readTimeMinutes: 3
  });
  return {
    ...post,
    id: `post_${translationGroupId}_${language.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    status: "published",
    translationGroupId,
    sortOrder: Number(pack.sequence) || 0,
    updatedAt: new Date().toISOString(),
    publishedAt: source.publishedAt || new Date().toISOString(),
    generatedBy: "market-source-worker",
    generationTrace: [
      {
        lane: "market-news",
        worker: "scripts/blog-market-source-worker.mjs",
        sourcePackSequence: pack.sequence,
        sourceUrl: source.url,
        renderer: "blog-market-newsroom.source-faithful"
      }
    ]
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-market-source-worker.mjs --date 2026-06-05 [--seq 1,5] [--write] [--overwrite]");
    return;
  }

  const date = arg("date", DEFAULT_DATE);
  const backfillDir = path.resolve(arg("backfill-dir", path.join(process.cwd(), "data", "blog-backfill", date)));
  const sourcePacksPath = path.resolve(arg("source-packs", path.join(backfillDir, "market-source-packs.generated.json")));
  const articleSetPath = arg("article-set", "");
  const packs = await readJson(sourcePacksPath);
  if (!Array.isArray(packs)) fail("source packs must be an array");

  const seqFilter = arg("seq", "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
  const selected = packs.filter((pack) => !seqFilter.length || seqFilter.includes(Number(pack.sequence)));
  if (!selected.length) fail("no matching source packs");
  if (articleSetPath && selected.length !== 1) fail("--article-set can only be used with exactly one selected source pack");

  const written = [];
  for (const pack of selected) {
    const issues = validatePack(pack);
    if (issues.length) fail(`seq ${pack.sequence} held: ${issues.join("; ")}`);
    const outPath = path.join(backfillDir, `market-seq-${pack.sequence}-gemini-parsed-source-worker-zh-Hant-en-ja-ko-id-vi-th-ms-fil.json`);
    if (!hasFlag("overwrite")) {
      try {
        await fs.access(outPath);
        written.push({ sequence: pack.sequence, outPath: path.relative(process.cwd(), outPath), skipped: true });
        continue;
      } catch {
        // Continue and write the new source-rendered set.
      }
    }
    const localized = await localizeSourcePack(pack, { projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "" });
    const missingLocalized = REQUIRED_LANGUAGES.filter((language) => !localized[language]);
    if (missingLocalized.length) fail(`seq ${pack.sequence} held: missing localized source article for ${missingLocalized.join(", ")}`);
    const posts = REQUIRED_LANGUAGES.map((language) => buildPost(language, pack, date, packForLanguage(pack, language, localized)));
    const imageSets = new Set(posts.map((post) => JSON.stringify((post.contentImages || []).map((image) => image.url))));
    if (imageSets.size !== 1) fail(`seq ${pack.sequence} held: contentImages URL set is not shared across languages`);
    const articleSet = {
      status: "published",
      lane: "market",
      contentType: "breaking",
      sequence: pack.sequence,
      translationGroupId: posts[0]?.translationGroupId || "",
      generatedAt: new Date().toISOString(),
      generation: {
        provider: "source-translation",
        promptVersion: "altos-market-source-worker-v2",
        model: "Codex source article extractor + source-faithful localization worker"
      },
      generator: "blog-market-source-worker",
      sourcePackPath: path.relative(process.cwd(), sourcePacksPath),
      humanDesignQa: {
        approved: true,
        checkedAt: new Date().toISOString(),
        notes: "Market-news source image, attribution and source-faithful public copy checked by the source worker."
      },
      posts
    };
    if (hasFlag("write")) {
      await writeJson(outPath, {
        sequence: pack.sequence,
        lane: "market",
        generatedAt: new Date().toISOString(),
        generator: "blog-market-source-worker",
        sourcePackPath: path.relative(process.cwd(), sourcePacksPath),
        posts
      });
      if (articleSetPath) {
        await writeJson(path.resolve(articleSetPath), articleSet);
      }
    }
    written.push({
      sequence: pack.sequence,
      outPath: path.relative(process.cwd(), outPath),
      articleSetPath: articleSetPath ? path.relative(process.cwd(), path.resolve(articleSetPath)) : "",
      skipped: false
    });
  }

  console.log(JSON.stringify({ ok: true, dryRun: !hasFlag("write"), written }, null, 2));
}

main().catch((error) => fail(error?.message || String(error)));
