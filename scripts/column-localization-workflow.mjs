#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const REQUIRED_LANGUAGES = ["en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_GROUPS = [
  ["en", "ja", "ko"],
  ["id", "vi"],
  ["th", "ms", "fil"]
];
const DEFAULT_BACKFILL_DATE = new Intl.DateTimeFormat("en-CA", {
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

function parseIntSet(raw) {
  if (!raw) return null;
  const values = String(raw)
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
  return new Set(values);
}

function usage() {
  console.log(`
ALTOS LAB column localization workflow helper

Usage:
  node scripts/column-localization-workflow.mjs --check-only
  node scripts/column-localization-workflow.mjs --sequences 25,26
  node scripts/column-localization-workflow.mjs --sequences 25,26 --localization-languages en,ja,ko
  node scripts/column-localization-workflow.mjs --source-dir data/blog-backfill/<date>/column-production --localized-dir data/blog-backfill/<date>/column-production

Options:
  --source-pack path      default: data/blog-backfill/<date>/column-production-queue/column-source-packs-9-reviewed.json
  --source-dir path       default: data/blog-backfill/<date>/column-production
  --localized-dir path    default: data/blog-backfill/<date>/column-production
  --prompt-dir path       default: <source-dir>/prompts
  --sequences n1,n2       optional sequence list; default: all in source-pack
  --localization-languages langs
                          optional expected languages subset for validation
  --check-only            skip prompt-generation, only validation
`);
}

function normalizeSourceForChecks(sourcePost, packEntry) {
  return {
    sourceLinks: normalizeSourceLinks(
      (Array.isArray(sourcePost?.sourceLinks) && sourcePost.sourceLinks.length)
        ? sourcePost.sourceLinks
        : packEntry?.sourceLinks
    ),
    translationGroupId: sourcePost?.translationGroupId || packEntry?.translationGroupId || "",
  };
}

function detectBackfillDate(filePath) {
  const normalized = path.resolve(filePath);
  const matched = normalized.match(/blog-backfill[\\/](\d{4}-\d{2}-\d{2})[\\/]/);
  return matched?.[1] || DEFAULT_BACKFILL_DATE;
}

function inferExpectedTranslationGroupId(sequence, sourcePost, packEntry, sourcePath) {
  const fromPostOrPack = sourcePost?.translationGroupId || packEntry?.translationGroupId;
  if (fromPostOrPack) return fromPostOrPack;
  return `browser-gemini-${detectBackfillDate(sourcePath)}-column-${String(sequence).padStart(2, "0")}`;
}

function normalizeExpectedSourceForSequence(sequence, sourcePost, packEntry, sourcePath) {
  return {
    ...normalizeSourceForChecks(sourcePost, packEntry),
    translationGroupId: inferExpectedTranslationGroupId(sequence, sourcePost, packEntry, sourcePath),
  };
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

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function fileExists(filePath) {
  return fs.access(filePath).then(() => true).catch(() => false);
}

function expectedLocalizedPath(localizedDir, sequence, group) {
  const pad = String(sequence).padStart(2, "0");
  return path.join(localizedDir, `column-seq-${pad}-localized-${group.join("-")}.json`);
}

function expectedLocalizedFiles(localizedDir, sequence) {
  return LANGUAGE_GROUPS.map((group) => ({ group, path: expectedLocalizedPath(localizedDir, sequence, group) }));
}

function normalizeSourceLinks(sourceLinks = []) {
  return (Array.isArray(sourceLinks) ? sourceLinks : [])
    .map((item) => ({
      title: String(item?.title || ""),
      url: String(item?.url || ""),
      publisher: String(item?.publisher || ""),
      publishedAt: String(item?.publishedAt || "")
    }))
    .sort((a, b) => a.url.localeCompare(b.url) || a.title.localeCompare(b.title));
}

function sourceLinksEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left.title !== right.title || left.url !== right.url || left.publisher !== right.publisher || left.publishedAt !== right.publishedAt) {
      return false;
    }
  }
  return true;
}

function parseLocalizedContent(content) {
  const posts = Array.isArray(content?.posts) ? content.posts : [];
  const byLanguage = new Map();
  for (const post of posts) {
    const language = String(post?.language || "").trim();
    if (!language) continue;
    if (!byLanguage.has(language)) byLanguage.set(language, []);
    byLanguage.get(language).push(post);
  }
  return {
    sequence: Number(content?.sequence),
    status: String(content?.status || "").trim(),
    posts,
    byLanguage
  };
}

async function validateLocalizationSequence(localizedDir, sequence, expectedSourcePost, selectedLanguages) {
  const expectedSource = normalizeExpectedSourceForSequence(
    sequence,
    expectedSourcePost?.post,
    expectedSourcePost?.packEntry || {},
    expectedSourcePost?.sourcePath || ""
  );
  const expectedSourceLinks = expectedSource.sourceLinks;
  const files = expectedLocalizedFiles(localizedDir, sequence);
  const missingFiles = [];
  const reasons = [];
  const presentLanguages = new Set();

  for (const file of files) {
    const filePath = file.path;
    const exists = await fileExists(filePath);
    if (!exists) {
      missingFiles.push(filePath);
      continue;
    }

    const raw = await readJson(filePath).catch(() => null);
    if (!raw) {
      reasons.push(`parse failure: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }

    if (Number(raw?.sequence) !== sequence) {
      reasons.push(`sequence mismatch in ${path.relative(process.cwd(), filePath)}: expected ${sequence}`);
    }

    const parsed = parseLocalizedContent(raw);
    if ((file.group.length !== 0) && !parsed.posts.length) {
      reasons.push(`no posts in ${path.relative(process.cwd(), filePath)}`);
    }

    for (const [language, list] of parsed.byLanguage) {
      if (file.group.includes(language)) {
        list.forEach(() => {
          presentLanguages.add(language);
        });
      } else {
        reasons.push(`unexpected language ${language} in ${path.relative(process.cwd(), filePath)}`);
      }
      list.slice(0, 1).forEach((post) => {
        if (expectedSource.translationGroupId) {
          const translationGroupId = String(post?.translationGroupId || "");
          if (translationGroupId !== expectedSource.translationGroupId) {
            reasons.push(`translationGroupId mismatch in ${path.relative(process.cwd(), filePath)} (${language})`);
          }
        }
        if (post.sourceLinks && expectedSourceLinks.length > 0) {
          if (!sourceLinksEqual(expectedSourceLinks, normalizeSourceLinks(post.sourceLinks))) {
            reasons.push(`sourceLinks mismatch in ${path.relative(process.cwd(), filePath)} (${language})`);
          }
        }
      });
      if (list.length > 1) {
        reasons.push(`duplicate language ${language} in ${path.relative(process.cwd(), filePath)}`);
      }
    }
  }

  const selectedSet = new Set(selectedLanguages);
  const shouldCheck = selectedSet.size ? selectedSet : new Set(REQUIRED_LANGUAGES);

  const missingLanguages = [...shouldCheck].filter((language) => !presentLanguages.has(language));
  const extras = [...presentLanguages].filter((language) => !REQUIRED_LANGUAGES.includes(language));

  return {
    sequence,
    missingFiles,
    missingLanguages,
    extras,
    fileCount: files.length,
    presentLanguages: [...presentLanguages].sort(),
    reasons,
    ok: missingFiles.length === 0 && missingLanguages.length === 0 && reasons.length === 0
  };
}

async function ensureSourcesReady(sourcePackPath, sourceDir, sequences) {
  const pack = await readJson(path.resolve(sourcePackPath));
  if (!Array.isArray(pack) || !pack.length) fail("column source pack must be a non-empty array");

  const selected = (sequences ? [...sequences] : pack.map((entry) => Number(entry.sequence)).filter(Number.isFinite))
    .map((sequence) => Number(sequence))
    .filter((sequence) => Number.isInteger(sequence) && sequence > 0)
    .sort((a, b) => a - b);

  const uniq = [...new Set(selected)];
  const bySequence = new Map(pack.map((entry) => [Number(entry.sequence), entry]));
  const results = [];

  for (const sequence of uniq) {
    const sourcePath = path.join(sourceDir, `column-seq-${String(sequence).padStart(2, "0")}-source.parsed.json`);
    const exists = await fileExists(sourcePath);
    if (!exists) {
      results.push({ sequence, ready: false, reason: `missing source file: ${path.relative(process.cwd(), sourcePath)}` });
      continue;
    }

    const sourcePayload = await readJson(sourcePath).catch(() => null);
    const sourcePost = sourcePayload ? pickSourcePost(sourcePayload) : null;
    if (!sourcePost) {
      results.push({ sequence, ready: false, reason: `invalid source structure: ${path.relative(process.cwd(), sourcePath)}` });
      continue;
    }

    const packEntry = bySequence.get(sequence) || null;
    if (!packEntry) {
      results.push({ sequence, ready: false, reason: `missing sequence ${sequence} in source pack` });
      continue;
    }

    results.push({ sequence, ready: true, sourcePath: path.relative(process.cwd(), sourcePath), packEntry, sourcePost });
  }

  const missing = results.filter((entry) => !entry.ready).map((entry) => entry.reason);
  return { selectedSequences: uniq, entries: results, missing };
}

function runPromptBuilder({ sourcePath, sequence, sourcePackPath, promptDir, localizedDir }) {
  const builder = path.resolve("scripts/blog-localization-prompt-builder.mjs");
  const args = [
    builder,
    "--source-post",
    sourcePath,
    "--sequence",
    String(sequence),
    "--source-pack",
    sourcePackPath,
    "--out-dir",
    promptDir,
    "--localized-output-dir",
    localizedDir
  ];
  const extraLanguages = arg("languages", "").trim();
  if (extraLanguages) {
    args.push("--languages", extraLanguages);
  }

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const message = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    fail(`prompt builder failed for seq ${sequence}: ${message}`);
  }

  const output = JSON.parse(result.stdout || "{}");
  return output.outputs || [];
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const sourcePackPath = arg(
    "source-pack",
    path.join(process.cwd(), "data", "blog-backfill", DEFAULT_BACKFILL_DATE, "column-production-queue", "column-source-packs-9-reviewed.json")
  );
  const sourceDir = path.resolve(arg("source-dir", path.join(process.cwd(), "data", "blog-backfill", DEFAULT_BACKFILL_DATE, "column-production")));
  const promptDir = path.resolve(arg("prompt-dir", path.join(sourceDir, "prompts")));
  const localizedDir = path.resolve(arg("localized-dir", path.join(process.cwd(), "data", "blog-backfill", DEFAULT_BACKFILL_DATE, "column-production")));
  const selected = parseIntSet(arg("sequences", ""));
  const selectedLanguages = arg("localization-languages", "").trim()
    ? arg("localization-languages", "").split(",").map((item) => item.trim()).filter(Boolean)
    : REQUIRED_LANGUAGES;

  if (selectedLanguages.some((language) => !REQUIRED_LANGUAGES.includes(language))) {
    fail("--localization-languages contains unsupported values");
  }

  const sourceStatus = await ensureSourcesReady(sourcePackPath, sourceDir, selected);
  if (sourceStatus.missing.length) {
    console.log(JSON.stringify({
      ok: false,
      error: "missing-source-drafts",
      missing: sourceStatus.missing
    }, null, 2));
    process.exit(1);
  }

  if (!hasFlag("check-only")) {
    const builderOutputs = [];
    for (const entry of sourceStatus.entries) {
      const sourcePath = path.resolve(process.cwd(), entry.sourcePath);
      const promptOutputs = runPromptBuilder({
        sourcePath,
        sequence: entry.sequence,
        sourcePackPath,
        promptDir,
        localizedDir
      });
      builderOutputs.push(...promptOutputs);
    }
    console.log(JSON.stringify({
      ok: true,
      mode: "prompts-generated",
      outputs: builderOutputs.map((output) => path.relative(process.cwd(), output))
    }, null, 2));
  }

  const checks = [];
  for (const entry of sourceStatus.entries) {
    const result = await validateLocalizationSequence(localizedDir, entry.sequence, {
      post: entry.sourcePost,
      packEntry: entry.packEntry,
      sourcePath: entry.sourcePath
    }, selectedLanguages);
    checks.push(result);
  }

  const missing = checks.filter((check) => !check.ok);
  const report = {
    ok: missing.length === 0,
    mode: hasFlag("check-only") ? "check-only" : "generate-and-check",
    sequences: sourceStatus.selectedSequences,
    checks
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => fail(error?.message || "failed"));
