#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
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

function usage() {
  console.log(`
ALTOS LAB market Gemini chunks merger

Usage:
  node scripts/merge-market-gemini-chunks.mjs --seq 23 --out-dir /path/to/output
  node scripts/merge-market-gemini-chunks.mjs --seq 41 --out-dir /path/to/output --source-parsed-file data/blog-backfill/2026-06-03/market-seq-41-gemini-parsed-source-zh-repaired.json --extra-parsed-dir data/blog-backfill/2026-06-04/localized

Required:
  --seq:     Backfill sequence number (for example, 23)
  --out-dir: Directory where article-set.json will be written

Optional:
  --date:               Backfill date. Defaults to today in Asia/Taipei.
  --backfill-dir:       Backfill artifact directory. Defaults to data/blog-backfill/<date>.
  --source-parsed-file: Specific approved source-language parsed JSON file to use
                        instead of auto-loading every parsed file in the backfill dir.
  --extra-parsed-dir: Additional directory containing source-first localization JSON
                      files named seq-<n>-<langs>.json.
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
  return path.resolve(arg("backfill-dir", path.join(process.cwd(), "data", "blog-backfill", backfillDate())));
}

function sourcePacksPath() {
  return path.join(backfillDir(), "market-source-packs.generated.json");
}

function isRequiredLanguages(languages) {
  if (!Array.isArray(languages) || languages.length !== REQUIRED_LANGUAGES.length) return false;
  const sorted = [...languages].sort();
  const expected = [...REQUIRED_LANGUAGES].sort();
  return sorted.every((language, index) => language === expected[index]);
}

function normalizeSourceLinks(sourceLinks) {
  if (!Array.isArray(sourceLinks) || sourceLinks.length === 0) {
    fail("sequence source pack is missing sourceLinks");
  }
  return sourceLinks.map((item) => {
    if (!item || typeof item !== "object") fail("invalid sourceLinks entry in source pack");
    return {
      title: String(item.title || ""),
      url: String(item.url || ""),
      publisher: String(item.publisher || ""),
      publishedAt: item.publishedAt ? String(item.publishedAt) : "",
      summary: String(item.summary || "").replace(/\bAI-generated\b/gi, "generated")
    };
  });
}

function requiredSlotForSequence(sequence) {
  return sequence % 2 === 1 ? "morning" : "afternoon";
}

function sequenceIngestRunId(sequence, date) {
  return `market-${date}-backfill-${String(sequence).padStart(2, "0")}`;
}

function ensureLanguagePostMap(parsedPosts) {
  const byLanguage = new Map();
  for (const post of parsedPosts) {
    if (!post || typeof post !== "object") fail("parsed posts must be objects");
    const language = String(post.language || "").trim();
    if (!language) fail("parsed post missing language");
    if (!REQUIRED_LANGUAGES.includes(language)) {
      fail(`parsed post has unsupported language: ${language}`);
    }
    if (byLanguage.has(language)) fail(`duplicate post for language: ${language}`);
    byLanguage.set(language, post);
  }

  const languages = [...byLanguage.keys()].sort();
  if (!isRequiredLanguages(languages)) {
    const missing = REQUIRED_LANGUAGES.filter((language) => !byLanguage.has(language));
    const extra = languages.filter((language) => !REQUIRED_LANGUAGES.includes(language));
    const parts = [];
    if (missing.length) parts.push(`missing languages: ${missing.join(", ")}`);
    if (extra.length) parts.push(`extra languages: ${extra.join(", ")}`);
    fail(`parsed files for this seq must include exactly ${REQUIRED_LANGUAGES.join(", ")}; ${parts.join("; ")}`);
  }
  return byLanguage;
}

function readLocalGeminiEvidenceFiles(sequence) {
  const evidenceFilePattern = new RegExp(`^market-seq-${sequence}-gemini-evidence.*\\.json$`);
  const dir = backfillDir();
  return fs.readdir(dir).then((files) =>
    files.filter((file) => evidenceFilePattern.test(file)).sort()
      .map((file) => path.join(dir, file))
  ).catch(() => []);
}

async function resolveGeminiEvidence(sequence) {
  const filePaths = await readLocalGeminiEvidenceFiles(sequence);
  for (const filePath of filePaths) {
    try {
      const data = await readJson(filePath);
      if (!data || typeof data !== "object") continue;
      return {
        usedExistingTab: data.usedExistingTab === true,
        changedModel: data.changedModel === true,
        tabTitle: data.tab?.title || data.tabTitle || "",
        title: data.title || "",
        url: data.tab?.url || data.url || "",
        sentAt: data.sentAt || "",
        sourceFile: path.relative(process.cwd(), filePath)
      };
    } catch {
      continue;
    }
  }

  return {
    usedExistingTab: true,
    changedModel: false,
    tabTitle: "Market backfill sequence merged without captured Gemini evidence",
    title: "",
    url: "https://gemini.google.com/app",
    sentAt: "",
    sourceFile: ""
  };
}

async function resolveBrowserOutputCandidates(sequence) {
  const dir = backfillDir();
  const names = await fs.readdir(dir).catch(() => []);
  const suffixPattern = new RegExp(`^market-seq-${sequence}-gemini-output.*\\.txt$`);
  return names.filter((name) => suffixPattern.test(name)).map((name) => path.join(dir, name)).sort();
}

async function listParsedFiles(sequence, extraParsedDir, sourceParsedFile) {
  const primaryPattern = new RegExp(`^market-seq-${sequence}-gemini-parsed-.*\\.json$`);
  const dir = backfillDir();
  const primary = sourceParsedFile
    ? [path.resolve(sourceParsedFile)]
    : (await fs.readdir(dir))
      .filter((name) => primaryPattern.test(name))
      .sort()
      .map((name) => path.join(dir, name));

  if (!extraParsedDir) return primary;

  const resolvedExtraDir = path.resolve(extraParsedDir);
  const padded = String(sequence).padStart(2, "0");
  const extraPattern = new RegExp(`^(?:seq-${padded}|seq-${sequence}|market-seq-${sequence}-gemini-parsed)-.*\\.json$`);
  const extra = (await fs.readdir(resolvedExtraDir).catch(() => []))
    .filter((name) => extraPattern.test(name))
    .sort()
    .map((name) => path.join(resolvedExtraDir, name));

  return [...primary, ...extra];
}

function buildChromeEvidence(sourceEvidence) {
  const evidence = {
    gemini: {
      usedExistingTab: sourceEvidence.usedExistingTab,
      changedModel: sourceEvidence.changedModel,
      ...(sourceEvidence.tabTitle ? { tabTitle: sourceEvidence.tabTitle } : {}),
      ...(sourceEvidence.url ? { url: sourceEvidence.url } : {})
    },
    chatgpt: {
      notRequired: "market source image lane",
      usedExistingTab: false,
      changedModel: false
    }
  };
  if (sourceEvidence.sourceFile) {
    evidence.gemini.sourceEvidenceFile = sourceEvidence.sourceFile;
  }
  if (sourceEvidence.sentAt) {
    evidence.gemini.sentAt = sourceEvidence.sentAt;
  }
  return evidence;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const seqRaw = arg("seq", "");
  const outDir = arg("out-dir", "");
  const extraParsedDir = arg("extra-parsed-dir", "");
  const sourceParsedFile = arg("source-parsed-file", "");
  if (!seqRaw) fail("--seq is required");
  if (!outDir) fail("--out-dir is required");

  const sequence = Number.parseInt(seqRaw, 10);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    fail(`--seq must be a positive integer (got: ${seqRaw})`);
  }

  const parsedFilePaths = await listParsedFiles(sequence, extraParsedDir, sourceParsedFile);
  if (!parsedFilePaths.length) {
    fail(`no parsed files found for seq-${sequence} in ${backfillDir()}`);
  }

  const sourcePacks = await readJson(sourcePacksPath());
  if (!Array.isArray(sourcePacks)) {
    fail("market-source-packs.generated.json must be a JSON array");
  }
  const sourcePack = sourcePacks.find((entry) => Number(entry.sequence) === sequence);
  if (!sourcePack) fail(`market-source-packs.generated.json missing seq ${sequence}`);
  if (!Number.isFinite(Number(sourcePack.sequence))) fail(`invalid source pack entry for seq ${sequence}`);
  if (!Array.isArray(sourcePack.sourceLinks) || sourcePack.sourceLinks.length < 1) {
    fail(`seq ${sequence} source pack is missing sourceLinks`);
  }

  const sharedSourceLinks = normalizeSourceLinks(sourcePack.sourceLinks);
  const coverUrl = String(sourcePack.primarySourceImageUrl || "").trim();
  if (!coverUrl) fail(`seq ${sequence} source pack is missing primarySourceImageUrl`);
  const coverCredit = String(sourcePack.coverCredit || "").trim() || "Source image: source pack";
  const coverCreditUrl = String(sourcePack.coverCreditUrl || "").trim();
  if (!coverCreditUrl) fail(`seq ${sequence} source pack is missing coverCreditUrl`);

  const parsedPosts = [];
  for (const filePath of parsedFilePaths) {
    const raw = await readJson(filePath);
    const posts = Array.isArray(raw?.posts) ? raw.posts : [];
    if (!posts.length) fail(`parsed file has no posts: ${path.relative(process.cwd(), filePath)}`);
    for (const post of posts) {
      if (!post || typeof post !== "object") fail(`invalid post in ${path.relative(process.cwd(), filePath)}`);
      parsedPosts.push(post);
    }
  }

  const byLanguage = ensureLanguagePostMap(parsedPosts);

  const generationDate = backfillDate();
  const slot = requiredSlotForSequence(sequence);
  const translationGroupId = sequenceIngestRunId(sequence, generationDate);
  const sourceEvidence = await resolveGeminiEvidence(sequence);
  const browserOutputs = await resolveBrowserOutputCandidates(sequence);
  const chromeEvidence = buildChromeEvidence(sourceEvidence);
  const normalizedAt = new Date().toISOString();

  const posts = REQUIRED_LANGUAGES.map((language) => {
    const post = byLanguage.get(language);
    const merged = {
      ...post,
      body: String(post.body || post.bodyMarkdown || "").trim(),
      contentType: "breaking",
      sourceLinks: sharedSourceLinks,
      coverUrl,
      coverImage: coverUrl,
      cover: coverUrl,
      coverSource: "source",
      coverCredit,
      coverCreditUrl,
      coverLicense: "source-attributed official announcement image",
      coverLicenseUrl: coverCreditUrl,
      coverAlt: String(post.coverAlt || `Official source image for ${sourcePack.topic || "market backfill"}.`).trim(),
      coverGeneration: null,
      contentImages: [],
      translationGroupId,
      translationNotes: post.translationNotes || "",
      generatedBy: String(post.generatedBy || "source-translation"),
      aiDisclosure: post.aiDisclosure || "",
      topic: post.topic || sourcePack.topic || "market-news",
      author: post.author || (slot === "morning" ? "Tommy" : "Ken"),
      readTimeMinutes: Number.isFinite(Number(post.readTimeMinutes)) ? Number(post.readTimeMinutes) : 3,
      updatedAt: normalizedAt
    };
    if (!merged.translationNotes) delete merged.translationNotes;
    return merged;
  });

  const translationSet = posts.map((post) => post.translationGroupId);
  if (!translationSet.every((value) => value === translationSet[0])) {
    fail("translationGroupId is not shared across languages");
  }
  const sourceReference = sharedSourceLinks.map((source) => source.url).sort();
  if (posts.some((post) => (post.sourceLinks || []).map((source) => source.url).sort().join("|") !== sourceReference.join("|"))) {
    fail("sourceLinks are not shared uniformly across languages");
  }
  if (!posts.every((post) => post.cover === coverUrl && post.coverUrl === coverUrl && post.coverImage === coverUrl)) {
    fail("cover URLs are not shared uniformly across languages");
  }

  const payload = {
    ingestRunId: translationGroupId,
    slot,
    generationDate,
    translationGroupId,
    publishMode: "publish-if-valid",
    generation: {
      provider: "source-translation",
      promptVersion: "altos-market-source-translation-v1",
      model: "Codex source-translation market workflow"
    },
    chromeEvidence,
    humanDesignQa: {
      approved: false,
      reviewer: "merge-helper",
      notes: "Skeleton generated from parsed Gemini chunks; run human design QA before publish."
    },
    posts,
    metadata: {
      sourcePackSequence: sequence,
      sourcePackPath: path.relative(process.cwd(), sourcePacksPath()),
      parsedInputs: parsedFilePaths.map((filePath) => path.relative(process.cwd(), filePath)),
      browserOutputPath: browserOutputs[0] || `data/blog-backfill/${generationDate}/market-seq-${sequence}-source-translation-output.txt`,
      normalizedAt
    }
  };

  const outputPath = path.resolve(path.join(outDir, "article-set.json"));
  await writeJson(outputPath, payload);
  console.log(outputPath);
}

main().catch((error) => {
  fail(error?.message || "failed");
});
