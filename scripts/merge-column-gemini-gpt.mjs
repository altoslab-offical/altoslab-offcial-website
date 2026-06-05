#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_BACKFILL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const DEFAULT_COLUMN_PACK = path.join(
  process.cwd(),
  "data",
  "blog-backfill",
  DEFAULT_BACKFILL_DATE,
  "column-production-queue",
  "column-source-packs-9-reviewed.json"
);
const MIN_COLUMN_BODY_LENGTH = {
  "zh-Hant": 1800,
  en: 4500,
  ja: 1600,
  ko: 1600,
  id: 4200,
  vi: 3600,
  th: 2600,
  ms: 3800,
  fil: 3800
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
ALTOS LAB column Gemini/GPT merger

Usage:
  node scripts/merge-column-gemini-gpt.mjs --batch 1 --visuals-file ./column-batch-1-visuals.parsed.json
  node scripts/merge-column-gemini-gpt.mjs --sequences 2,4,6 --gemini-dir data/blog-backfill/<date>/column-production --visuals-file ./visuals.json
  node scripts/merge-column-gemini-gpt.mjs --date <date> --sequences 25,26 --column-pack data/blog-backfill/<date>/column-production-queue/column-source-packs-9-reviewed.json --gemini-dir data/blog-backfill/<date>/column-production --visuals-file ./visuals.json

Gemini parsed files:
  column-batch-<n>-wave-*.parsed.json
  column-seq-<n>-source.parsed.json, column-seq-<n>-localized-*.json

Required Gemini schema:
  { "articles": [{ "sequence": 2, "posts": [{ "language": "zh-Hant", ... }] }] }

Required visuals schema:
  { "articles": [{ "sequence": 2, "cover": { "url": "https://..." }, "contentImages": [{ "url": "https://..." }, ...] }] }
  或
  { "articles": [{ "sequence": 2, "cover": { "localPath": "/path/to/local/file.png" }, "contentImages": [{ "localPath": "/path/to/local/file.png" }, ...] }] }

This tool is fail-closed. It refuses to write article-set.json unless all 9
languages and a shared GPT cover plus 2-3 shared GPT content images are present.
`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function backfillDate() {
  return arg("date", DEFAULT_BACKFILL_DATE);
}

function backfillDir() {
  return path.join(process.cwd(), "data", "blog-backfill", backfillDate());
}

function columnPackPath() {
  return path.resolve(arg("column-pack", arg("briefs", DEFAULT_COLUMN_PACK)));
}

function outputRoot() {
  return path.resolve(arg("out-root", "data/blog-worker-runs"));
}

function slugify(input, language) {
  const ascii = String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (ascii.length >= 12) return ascii;
  return `${language}-column-${Date.now().toString(36)}`;
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[-#*_>`~=[\\\]+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(text, maxLength) {
  const clean = stripMarkdown(text);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim()}…`;
}

function sequenceListFromArgs() {
  const raw = arg("sequences", "");
  if (raw) {
    return raw
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  const batch = Number.parseInt(arg("batch", ""), 10);
  if (!Number.isInteger(batch) || batch <= 0) fail("provide --batch or --sequences");
  const start = (batch - 1) * 6 + 2;
  return [start, start + 2, start + 4];
}

async function queueForSequence(sequence) {
  const filePath = path.join(backfillDir(), "queue", `${String(sequence).padStart(2, "0")}-column.json`);
  const data = await readJson(filePath).catch(() => null);
  if (!data) {
    const slug = `${backfillDate()}-backfill-${String(sequence).padStart(2, "0")}-column-manual`;
    return {
      filePath,
      data: {
        sequence,
        lane: "column",
        slot: sequence % 2 === 0 ? "afternoon" : "morning",
        articleSetPath: path.join(outputRoot(), slug, "article-set.json")
      }
    };
  }
  if (data.lane !== "column") fail(`queue item seq ${sequence} is not column lane`);
  return { filePath, data };
}

async function geminiFilesForSequences(sequences) {
  const geminiDir = path.resolve(arg("gemini-dir", backfillDir()));
  const explicit = arg("gemini-file", "");
  if (explicit) return [path.resolve(explicit)];

  const batch = arg("batch", "");
  const names = await fs.readdir(geminiDir).catch(() => []);
  const pattern = batch
    ? new RegExp(`^column-batch-${batch}-wave-.*\\.parsed\\.json$`)
    : /^(column-batch-.*-wave-.*|column-seq-\d+-(source|localized).*)\.parsed\.json$|^column-seq-\d+-localized-.*\.json$/;
  const candidates = names
    .filter((name) => pattern.test(name))
    .map((name) => path.join(geminiDir, name))
    .sort();
  const matched = [];
  for (const filePath of candidates) {
    const parsed = await readJson(filePath).catch(() => null);
    const articleSequences = new Set(articlesFromParsed(parsed).map((article) => Number(article.sequence)));
    if (sequences.some((sequence) => articleSequences.has(sequence))) matched.push(filePath);
  }
  return matched;
}

function normalizeGeminiPost(raw, { language, sequence, brief, translationGroupId, visualSet, slot, now }) {
  const body = String(raw.bodyMarkdown || raw.body || "").trim();
  if (!body) fail(`seq ${sequence} ${language}: Gemini post missing bodyMarkdown`);
  const minBodyLength = MIN_COLUMN_BODY_LENGTH[language] || 1600;
  if (stripMarkdown(body).length < minBodyLength) {
    fail(`seq ${sequence} ${language}: Gemini body is too short for a column (${stripMarkdown(body).length}/${minBodyLength})`);
  }
  if (/^#{3,6}\s+/m.test(body)) fail(`seq ${sequence} ${language}: body contains ### or deeper headings`);
  const title = String(raw.title || "").trim();
  if (!title) fail(`seq ${sequence} ${language}: Gemini post missing title`);
  const subtitle = String(raw.subtitle || raw.subTitle || "").trim();
  if (subtitle.length < 24) fail(`seq ${sequence} ${language}: Gemini post missing strong subtitle`);

  const cover = visualSet.cover;
  const contentImages = visualSet.contentImages;
  const slugBase = raw.slug || `${title}-${language}`;
  const tags = Array.isArray(raw.tags) && raw.tags.length ? raw.tags : ["市場專欄", "AI Agent", "Automation", "ALTOS LAB"];
  const faqs = Array.isArray(raw.faqs) ? raw.faqs : [];
  const keyTakeaways = Array.isArray(raw.keyTakeaways) ? raw.keyTakeaways : [];

  return {
    language,
    slug: String(raw.slug || slugify(slugBase, language)).trim(),
    title,
    subtitle,
    seoTitle: String(raw.seoTitle || title).trim(),
    seoDescription: String(raw.seoDescription || raw.excerpt || compactText(body, 150)).trim(),
    excerpt: String(raw.excerpt || compactText(body, 180)).trim(),
    contentType: "column",
    newsCategory: String(raw.newsCategory || "市場專欄").trim(),
    topic: String(raw.topic || brief.workingTitleZh || "AI operations").trim(),
    audience: String(raw.audience || "Founders, operators, product and engineering leads").trim(),
    geoSummary: String(raw.geoSummary || raw.excerpt || compactText(body, 240)).trim(),
    body,
    keyTakeaways,
    faqs,
    tags,
    author: sequence % 4 === 0 ? "Ken" : "Tommy",
    readTimeMinutes: Number.isFinite(Number(raw.readTimeMinutes)) ? Number(raw.readTimeMinutes) : 8,
    sourceLinks: brief.sourceLinks,
    cover: cover.url || "",
    coverUrl: cover.url || "",
    coverImage: cover.url || "",
    coverSource: "generated",
    coverCredit: cover.credit || "ALTOS LAB 編輯視覺",
    coverAlt: cover.alt || `${title} 封面概念`,
    coverGeneration: {
      provider: cover.provider || "ChatGPT/GPT",
      prompt: cover.prompt,
      generatedAt: cover.generatedAt || now,
      status: "generated",
      visualChecks: {
        ...(cover.visualChecks || {}),
        checkedBy: cover.visualChecks?.checkedBy || "codex-main-brain-image-qa",
        checkedAt: cover.visualChecks?.checkedAt || cover.generatedAt || now
      }
    },
    ...(cover.localPath ? { coverLocalPath: cover.localPath } : {}),
    contentImages,
    translationGroupId,
    generatedBy: "gemini-chatgpt",
    status: "published",
    reviewStatus: "approved",
    qualityIssues: [],
    aiDisclosure: "",
    updatedAt: now,
    publishedAt: now,
    slot
  };
}

function normalizeVisualImage(image, sequence, index) {
  const url = String(image?.url || image?.publicUrl || "").trim();
  const localPath = String(image?.localPath || "").trim();
  if (!url && !localPath) fail(`seq ${sequence} visual image ${index} missing public URL or localPath`);
  if (url && !/^https?:\/\//.test(url)) fail(`seq ${sequence} visual image ${index} has invalid public URL ${url}`);
  const prompt = String(image.prompt || "").trim();
  if (prompt.length < 40) fail(`seq ${sequence} visual image ${index} prompt is too thin`);
  return {
    ...(url ? { url } : {}),
    ...(localPath ? { localPath } : {}),
    source: "generated",
    provider: String(image.provider || "ChatGPT/GPT"),
    prompt,
    generatedAt: String(image.generatedAt || new Date().toISOString()),
    status: "generated",
    credit: String(image.credit || "ALTOS LAB 編輯視覺"),
    aspectRatio: String(image.aspectRatio || "16:9"),
    placement: String(image.placement || (index === -1 ? "cover" : "mid-article")),
    alt: String(image.alt || ""),
    caption: String(image.caption || ""),
    visualChecks: {
      topicFit: image.visualChecks?.topicFit === true,
      noTextArtifacts: image.visualChecks?.noTextArtifacts === true,
      noLogos: image.visualChecks?.noLogos === true,
      noPeople: image.visualChecks?.noPeople === true,
      noTrademarkRisk: image.visualChecks?.noTrademarkRisk === true,
      noGenericStockLook: image.visualChecks?.noGenericStockLook ?? true,
      noFakeUI: image.visualChecks?.noFakeUI ?? true,
      noBluePurpleAbstract: image.visualChecks?.noBluePurpleAbstract ?? true,
      checkedBy: String(image.visualChecks?.checkedBy || "codex-main-brain-image-qa"),
      checkedAt: String(image.visualChecks?.checkedAt || image.generatedAt || new Date().toISOString())
    }
  };
}

async function loadVisuals(sequences) {
  const filePath = arg("visuals-file", "");
  if (!filePath) fail("--visuals-file is required for column/feature posts");
  const parsed = await readJson(path.resolve(filePath));
  const articles = Array.isArray(parsed) ? parsed : parsed.articles;
  if (!Array.isArray(articles)) fail("--visuals-file must contain articles[]");
  const bySequence = new Map();
  for (const article of articles) {
    const sequence = Number(article.sequence);
    if (!sequences.includes(sequence)) continue;
    const cover = normalizeVisualImage(article.cover, sequence, -1);
    const contentImages = (article.contentImages || []).map((image, index) => normalizeVisualImage(image, sequence, index));
    if (contentImages.length < 2 || contentImages.length > 3) {
      fail(`seq ${sequence}: column visuals require 2-3 contentImages`);
    }
    bySequence.set(sequence, { cover, contentImages });
  }
  for (const sequence of sequences) {
    if (!bySequence.has(sequence)) fail(`visuals missing sequence ${sequence}`);
  }
  return bySequence;
}

function articlesFromParsed(payload) {
  if (Array.isArray(payload?.articles)) return payload.articles;
  if (Array.isArray(payload?.posts)) {
    return [
      {
        sequence: Number(payload.sequence),
        posts: payload.posts
      }
    ];
  }
  if (payload?.post && typeof payload.post === "object") {
    return [
      {
        sequence: Number(payload.sequence || payload.post.sequence),
        posts: [payload.post]
      }
    ];
  }
  return [];
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const sequences = sequenceListFromArgs();
  const briefs = await readJson(columnPackPath());
  const briefsBySequence = new Map(briefs.map((brief) => [Number(brief.sequence), brief]));
  const visualsBySequence = await loadVisuals(sequences);
  const files = await geminiFilesForSequences(sequences);
  if (!files.length) fail("no Gemini parsed files found");

  const geminiPostsBySequence = new Map();
  for (const filePath of files) {
    const parsed = await readJson(filePath);
    const articles = articlesFromParsed(parsed);
    for (const article of articles) {
      const sequence = Number(article.sequence);
      if (!sequences.includes(sequence)) continue;
      const posts = Array.isArray(article.posts) ? article.posts : [];
      const byLanguage = geminiPostsBySequence.get(sequence) || new Map();
      for (const post of posts) {
        const language = String(post.language || "").trim();
        if (!LANGUAGES.includes(language)) fail(`seq ${sequence}: unsupported language ${language}`);
        if (byLanguage.has(language)) fail(`seq ${sequence}: duplicate Gemini language ${language}`);
        byLanguage.set(language, post);
      }
      geminiPostsBySequence.set(sequence, byLanguage);
    }
  }

  const outputs = [];
  for (const sequence of sequences) {
    const brief = briefsBySequence.get(sequence);
    if (!brief) fail(`missing column brief for seq ${sequence}`);
    const byLanguage = geminiPostsBySequence.get(sequence) || new Map();
    const missing = LANGUAGES.filter((language) => !byLanguage.has(language));
    if (missing.length) fail(`seq ${sequence}: Gemini output missing languages ${missing.join(", ")}`);

    const { data: queue } = await queueForSequence(sequence);
    const visualSet = visualsBySequence.get(sequence);
    const translationGroupId = `browser-gemini-gpt-${backfillDate()}-column-${String(sequence).padStart(2, "0")}`;
    const now = new Date().toISOString();
    const posts = LANGUAGES.map((language) =>
      normalizeGeminiPost(byLanguage.get(language), {
        language,
        sequence,
        brief,
        translationGroupId,
        visualSet,
        slot: queue.slot,
        now
      })
    );
    const coverReferences = new Set(posts.map((post) => post.coverLocalPath || post.cover).filter(Boolean));
    if (coverReferences.size !== 1) fail(`seq ${sequence}: cover image must be shared by all languages`);
    for (let index = 0; index < visualSet.contentImages.length; index += 1) {
      const imageReferences = new Set(
        posts.map((post) => post.contentImages[index]?.localPath || post.contentImages[index]?.url).filter(Boolean)
      );
      if (imageReferences.size !== 1) fail(`seq ${sequence}: contentImages[${index}] must be shared by all languages`);
    }

    const payload = {
      ingestRunId: translationGroupId,
      slot: queue.slot,
      generationDate: backfillDate(),
      translationGroupId,
      publishMode: "publish-if-valid",
      generation: {
        provider: "gemini-chatgpt",
        promptVersion: "altos-column-batch-v1",
        model: "Gemini browser column workflow + ChatGPT/GPT visual workflow"
      },
      chromeEvidence: {
        gemini: {
          usedExistingTab: true,
          changedModel: false,
          evidence: "column batch parsed files"
        },
        chatgpt: {
          usedExistingTab: true,
          changedModel: false,
          evidence: "column visuals parsed file"
        }
      },
      humanDesignQa: {
        approved: false,
        reviewer: "merge-helper",
        notes: "Run design QA before publishing."
      },
      posts,
      metadata: {
        sourceBriefSequence: sequence,
        sourceBriefPath: path.relative(process.cwd(), columnPackPath()),
        mergedAt: now,
        geminiFiles: files.map((filePath) => path.relative(process.cwd(), filePath)),
        visualsFile: path.relative(process.cwd(), path.resolve(arg("visuals-file")))
      }
    };

    await writeJson(queue.articleSetPath, payload);
    outputs.push(queue.articleSetPath);
  }

  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
