#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_GROUPS = [
  ["en", "ja", "ko"],
  ["id", "vi"],
  ["th", "ms", "fil"]
];
const DEFAULT_LOCALIZED_OUTPUT_DIR = path.join(process.cwd(), "data", "blog-backfill", "2026-06-04", "column-production");

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
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

function usage() {
  console.log(`
ALTOS LAB blog localization prompt builder

Usage:
  node scripts/blog-localization-prompt-builder.mjs \\
    --source-post <json> \\
    --sequence <n> \\
    --out-dir data/blog-backfill/2026-06-04/column-production/prompts \\
    --localized-output-dir data/blog-backfill/2026-06-04/column-production \\
    [--source-pack <json>] \\
    [--translation-group-id <id>] \\
    [--languages en,ja,ko,id,vi,th,ms,fil]

Notes:
- The source post must already be approved by Codex.
- This tool only writes subagent prompt files. It does not localize or publish.
- Defaults split target languages into en-ja-ko, id-vi, th-ms-fil.
`);
}

function detectBackfillDate(filePath) {
  const normalized = path.resolve(filePath);
  const match = normalized.match(/blog-backfill[\\/](\d{4}-\d{2}-\d{2})[\\/]/);
  return match?.[1] || "2026-06-04";
}

function inferLocalizedOutputDir(sourcePostPath, fallback) {
  const sourceDir = path.dirname(path.resolve(sourcePostPath));
  if (path.basename(sourceDir) === "raw") return path.dirname(sourceDir);
  return path.resolve(fallback || sourceDir);
}

function pickSourcePost(payload) {
  if (payload?.post) return payload.post;
  if (Array.isArray(payload?.articles?.[0]?.posts)) {
    return payload.articles[0].posts.find((post) => post.language === "zh-Hant") || payload.articles[0].posts[0];
  }
  if (Array.isArray(payload?.posts)) {
    return payload.posts.find((post) => post.language === "zh-Hant") || payload.posts[0];
  }
  if (payload?.language) return payload;
  return null;
}

function parseLanguages() {
  const raw = arg("languages", "");
  const values = raw
    ? raw.split(",").map((item) => item.trim()).filter(Boolean)
    : REQUIRED_LANGUAGES.filter((language) => language !== "zh-Hant");
  const invalid = values.filter((language) => !REQUIRED_LANGUAGES.includes(language) || language === "zh-Hant");
  if (invalid.length) fail(`unsupported target languages: ${invalid.join(", ")}`);
  return values;
}

function groupLanguages(languages) {
  const targetSet = new Set(languages);
  return DEFAULT_GROUPS
    .map((group) => group.filter((language) => targetSet.has(language)))
    .filter((group) => group.length > 0);
}

function sourceLinksFrom(sourcePost, sourcePack) {
  const links = Array.isArray(sourcePost?.sourceLinks) && sourcePost.sourceLinks.length
    ? sourcePost.sourceLinks
    : Array.isArray(sourcePack?.sourceLinks)
      ? sourcePack.sourceLinks
      : [];
  return links.map((source, index) => `${index + 1}. ${source.title || "Untitled"} (${source.publisher || "source"}, ${source.publishedAt || "n.d."})
   URL: ${source.url}
   summary: ${source.summary || ""}`).join("\n");
}

function sharedMedia(sourcePost, sourcePack, translationGroupId) {
  const cover = sourcePost.cover || sourcePost.coverUrl || sourcePost.coverImage || sourcePack?.primarySourceImageUrl || "";
  const sourceLinks = Array.isArray(sourcePost?.sourceLinks)
    ? sourcePost.sourceLinks
    : Array.isArray(sourcePack?.sourceLinks)
      ? sourcePack.sourceLinks
      : [];
  return {
    translationGroupId,
    cover,
    sourceLinks,
    coverCredit: sourcePost.coverCredit || sourcePack?.coverCredit || "",
    coverCreditUrl: sourcePost.coverCreditUrl || sourcePack?.coverCreditUrl || "",
    coverLicense: sourcePost.coverLicense || "source-attributed official announcement image",
    coverLicenseUrl: sourcePost.coverLicenseUrl || sourcePost.coverCreditUrl || sourcePack?.coverCreditUrl || "",
    contentImages: Array.isArray(sourcePost.contentImages) ? sourcePost.contentImages : []
  };
}

function promptForGroup({ sequence, group, sourcePost, sourcePack, promptDir, localizedOutputDir, translationGroupId }) {
  const media = sharedMedia(sourcePost, sourcePack, translationGroupId);
  const groupId = group.join("-");
  const outputFile = path.join(promptDir, `column-seq-${String(sequence).padStart(2, "0")}-localized-${groupId}.prompt.md`);
  const parsedOutputHint = path.join(
    path.resolve(localizedOutputDir),
    `column-seq-${String(sequence).padStart(2, "0")}-localized-${groupId}.json`
  );
  const sourceBody = String(sourcePost.body || sourcePost.bodyMarkdown || "");
  const sourceH2Count = (sourceBody.match(/^##\s+/gm) || []).length;
  const sourceParagraphCount = sourceBody.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean).length;
  const sourceCharCount = [...sourceBody].length;
  const prompt = `You are gpt-5.3-codex-spark.
cwd: /Users/asdc163/Documents/官方網站

Task: Localize one approved ALTOS LAB source-of-truth article into: ${group.join(", ")}.

Own only:
- ${parsedOutputHint}

Read only:
- docs/content/blog-localization-operating-model.md
- The source article and source pack included below

Rules:
- This is localization, not literal translation and not a new article.
- Preserve the source facts, article angle, translationGroupId, sourceLinks, cover and contentImages.
- Rewrite title, subtitle, body rhythm, examples and FAQ so the target language sounds native for its market.
- Do not shrink the article. Keep roughly the same depth as the source: source body has ${sourceCharCount} characters, ${sourceH2Count} H2 sections and ${sourceParagraphCount} scannable blocks.
- Each localized body should keep at least ${Math.max(2, sourceH2Count)} H2 sections and should not collapse the source into a short summary.
- Do not use public backend words: SEO, GEO, AI-generated, prompt, pipeline, quality gate, rubric.
- Do not add unsupported claims, fake numbers, fake case studies or unverified dates.
- Body uses site-supported Markdown only: ##, lists, short callouts, limited tables. No ###.
- Market news remains a source-faithful news brief. Columns may include ALTOS LAB judgment, but do not invent new facts.
- If a language sounds translated or weak, set status="held" and explain exactly why.

  Shared fields that must not change:
${JSON.stringify({
  sequence,
  translationGroupId: media.translationGroupId,
  contentType: sourcePost.contentType || "column",
  topic: sourcePost.topic || sourcePack?.topic || "",
  cover: media.cover,
  coverUrl: media.cover,
  coverImage: media.cover,
  coverCredit: media.coverCredit,
  coverCreditUrl: media.coverCreditUrl,
  coverLicense: media.coverLicense,
  coverLicenseUrl: media.coverLicenseUrl,
  contentImages: media.contentImages
}, null, 2)}

Source links:
${sourceLinksFrom(sourcePost, sourcePack)}

Approved source-of-truth post:
${JSON.stringify(sourcePost, null, 2)}

Output JSON only and write it to ${parsedOutputHint}:
{
  "status": "ok",
  "sequence": ${sequence},
  "posts": [
    {
      "language": "${group[0]}",
      "slug": "...",
      "translationGroupId": "${media.translationGroupId}",
      "title": "...",
      "subtitle": "...",
      "excerpt": "...",
      "seoTitle": "...",
      "seoDescription": "...",
      "geoSummary": "...",
      "body": "## ...",
      "keyTakeaways": ["...", "...", "..."],
      "faqs": [{"question": "...", "answer": "..."}],
      "tags": ["..."],
      "newsCategory": "${sourcePost.newsCategory || "市場快訊"}",
      "topic": "${sourcePost.topic || sourcePack?.topic || ""}",
      "author": "${sourcePost.author || "Tommy"}",
      "readTimeMinutes": ${Number(sourcePost.readTimeMinutes || 3)},
      "sourceLinks": ${JSON.stringify(media.sourceLinks || [], null, 2)},
      "cover": "${media.cover}",
      "coverUrl": "${media.cover}",
      "coverImage": "${media.cover}",
      "coverCredit": "${media.coverCredit}",
      "coverCreditUrl": "${media.coverCreditUrl}",
      "coverLicense": "${media.coverLicense}",
      "coverLicenseUrl": "${media.coverLicenseUrl}",
      "contentImages": ${JSON.stringify(media.contentImages, null, 2)},
      "coverAlt": "..."
    }
  ],
  "localizationNotes": ["..."]
}
`;
  return { outputFile, prompt };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const sourcePostPath = arg("source-post", "");
  const sequence = Number.parseInt(arg("sequence", ""), 10);
  const promptDir = path.resolve(arg("out-dir", "data/blog-backfill/2026-06-04/column-production/prompts"));
  const localizedOutputDir = path.resolve(
    arg("localized-output-dir", inferLocalizedOutputDir(sourcePostPath, DEFAULT_LOCALIZED_OUTPUT_DIR))
  );
  if (!sourcePostPath) fail("--source-post is required");
  if (!Number.isInteger(sequence) || sequence <= 0) fail("--sequence must be a positive integer");

  const sourcePayload = await readJson(path.resolve(sourcePostPath));
  const sourcePost = pickSourcePost(sourcePayload);
  if (!sourcePost) fail("source-post did not contain a post");

  const sourcePackPath = arg("source-pack", "");
  const sourcePack = sourcePackPath ? await readJson(path.resolve(sourcePackPath)) : null;
  const sourcePackEntry = Array.isArray(sourcePack)
    ? sourcePack.find((entry) => Number(entry.sequence) === sequence)
    : sourcePack;

  const translationGroupId = arg(
    "translation-group-id",
    sourcePost.translationGroupId
      || sourcePackEntry?.translationGroupId
      || `browser-gemini-${detectBackfillDate(sourcePostPath)}-column-${String(sequence).padStart(2, "0")}`
  );

  const groups = groupLanguages(parseLanguages());
  const outputs = [];
  for (const group of groups) {
    const { outputFile, prompt } = promptForGroup({
      sequence,
      group,
      sourcePost,
      sourcePack: sourcePackEntry,
      promptDir,
      localizedOutputDir,
      translationGroupId
    });
    await writeText(outputFile, prompt);
    outputs.push(path.relative(process.cwd(), outputFile));
  }

  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
