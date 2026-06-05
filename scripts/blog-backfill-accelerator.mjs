#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const OFFICIAL_BASE_URL = "https://altoslab-ai.cc";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog backfill accelerator

Usage:
  node scripts/blog-backfill-accelerator.mjs [--date <date>] [--max-groups 6] [--max-parallel 3] [--publish] [--allow-production]

What it does:
  1. Scans the backfill queue.
  2. Produces market article sets from source packs, or merges approved column/GPT artifacts.
  3. Runs the fail-closed batch runner on ready article-set.json items.
  4. Writes an acceleration status board with exact missing artifacts.

This tool does not generate public copy. Market-news source-translation and column Gemini/GPT production still happen upstream.
`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runCommand(command, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function parsePositiveInt(name, fallback) {
  const value = Number.parseInt(arg(name, ""), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function queueFileName(sequence, lane) {
  return `${String(sequence).padStart(2, "0")}-${lane}.json`;
}

function normalizeLanguages(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function missingLanguages(found) {
  const set = new Set(found);
  return REQUIRED_LANGUAGES.filter((language) => !set.has(language));
}

function isCompleteLanguageSet(found) {
  return missingLanguages(found).length === 0 && found.length === REQUIRED_LANGUAGES.length;
}

async function marketLanguages(backfillDir, sequence) {
  const names = await fs.readdir(backfillDir).catch(() => []);
  const pattern = new RegExp(`^market-seq-${sequence}-gemini-parsed-.*\\.json$`);
  const languages = [];
  const files = [];

  for (const name of names.filter((fileName) => pattern.test(fileName)).sort()) {
    const filePath = path.join(backfillDir, name);
    const parsed = await readJson(filePath).catch(() => null);
    const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
    for (const post of posts) languages.push(String(post?.language || "").trim());
    files.push(path.relative(process.cwd(), filePath));
  }

  return { languages: normalizeLanguages(languages), files };
}

async function columnLanguages(backfillDir, sequence) {
  const names = await fs.readdir(backfillDir).catch(() => []);
  const languages = [];
  const files = [];

  for (const name of names.filter((fileName) => /^column-batch-.*\.parsed\.json$/.test(fileName)).sort()) {
    const filePath = path.join(backfillDir, name);
    const parsed = await readJson(filePath).catch(() => null);
    const articles = Array.isArray(parsed?.articles) ? parsed.articles : [];
    const matched = articles.filter((article) => Number(article?.sequence) === sequence);
    if (!matched.length) continue;
    for (const article of matched) {
      for (const post of article.posts || []) languages.push(String(post?.language || "").trim());
    }
    files.push(path.relative(process.cwd(), filePath));
  }

  return { languages: normalizeLanguages(languages), files };
}

async function columnVisuals(backfillDir, sequence) {
  const candidates = [
    path.join(backfillDir, `column-seq-${sequence}-gpt-visuals.json`),
    path.join(backfillDir, `column-seq-${sequence}-gpt-visuals.parsed.json`),
    path.join(backfillDir, "column-batch-1-gpt-visuals.parsed.json"),
    path.join(backfillDir, "column-batch-1-gpt-visuals.json")
  ];

  for (const filePath of candidates) {
    const parsed = await readJson(filePath).catch(() => null);
    const articles = Array.isArray(parsed) ? parsed : parsed?.articles;
    if (!Array.isArray(articles)) continue;
    const article = articles.find((item) => Number(item?.sequence) === sequence);
    if (!article) continue;
    const hasCover = Boolean(article.cover?.url || article.cover?.publicUrl);
    const contentImageCount = Array.isArray(article.contentImages) ? article.contentImages.length : 0;
    return {
      ok: hasCover && contentImageCount >= 2 && contentImageCount <= 3,
      filePath,
      relativePath: path.relative(process.cwd(), filePath),
      hasCover,
      contentImageCount
    };
  }

  return { ok: false, filePath: "", relativePath: "", hasCover: false, contentImageCount: 0 };
}

async function marketSourcePackStatus(backfillDir, sequence) {
  const filePath = path.join(backfillDir, "market-source-packs.generated.json");
  const packs = await readJson(filePath).catch(() => null);
  if (!Array.isArray(packs)) return { ok: false, reason: "missing market-source-packs.generated.json" };
  const pack = packs.find((entry) => Number(entry.sequence) === sequence);
  if (!pack) return { ok: false, reason: "missing source pack" };
  const ok = Boolean(pack.primarySourceImageUrl && pack.coverCreditUrl && Array.isArray(pack.sourceLinks) && pack.sourceLinks.length);
  return { ok, reason: ok ? "" : "source pack missing image, credit URL, or source links" };
}

async function scanQueue({ backfillDir, queueDir }) {
  const names = (await fs.readdir(queueDir).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const items = [];

  for (const name of names) {
    const filePath = path.join(queueDir, name);
    const raw = await readJson(filePath).catch(() => null);
    if (!raw || typeof raw !== "object") {
      items.push({ filePath, status: "invalid", reasons: ["invalid queue JSON"] });
      continue;
    }

    const sequence = Number(raw.sequence);
    const lane = raw.lane || "unknown";
    const articleSetPath = raw.articleSetPath ? path.resolve(raw.articleSetPath) : "";
    const articleSetExists = articleSetPath ? await exists(articleSetPath) : false;
    const status = {
      filePath,
      relativeFilePath: path.relative(process.cwd(), filePath),
      sequence,
      lane,
      queueStatus: raw.status || "unknown",
      slot: raw.slot || "",
      runDir: raw.runDir || "",
      articleSetPath,
      articleSetExists,
      readyToMerge: false,
      merged: false,
      mergeCommand: [],
      reasons: []
    };

    if (!Number.isInteger(sequence) || sequence <= 0) status.reasons.push("missing valid sequence");
    if (!articleSetPath) status.reasons.push("missing articleSetPath");
    if (articleSetExists) {
      status.readyToMerge = false;
      status.reasons.push("article-set already exists");
      items.push(status);
      continue;
    }

    if (lane === "market") {
      const sourcePackStatus = await marketSourcePackStatus(backfillDir, sequence);
      status.languages = REQUIRED_LANGUAGES;
      status.artifactFiles = [];
      status.missingLanguages = [];
      if (!sourcePackStatus.ok) status.reasons.push(sourcePackStatus.reason);
      status.readyToMerge = sourcePackStatus.ok;
      if (status.readyToMerge) {
        status.mergeCommand = [
          "node",
          "scripts/blog-market-source-worker.mjs",
          "--seq",
          String(sequence),
          "--backfill-dir",
          backfillDir,
          "--source-packs",
          path.join(backfillDir, "market-source-packs.generated.json"),
          "--article-set",
          articleSetPath,
          "--write",
          "--overwrite"
        ];
      }
    } else if (lane === "column") {
      const languageStatus = await columnLanguages(backfillDir, sequence);
      const visualStatus = await columnVisuals(backfillDir, sequence);
      status.languages = languageStatus.languages;
      status.artifactFiles = languageStatus.files;
      status.visuals = visualStatus.relativePath
        ? {
          filePath: visualStatus.relativePath,
          hasCover: visualStatus.hasCover,
          contentImageCount: visualStatus.contentImageCount
        }
        : null;
      status.missingLanguages = missingLanguages(languageStatus.languages);
      if (!isCompleteLanguageSet(languageStatus.languages)) status.reasons.push(`missing Gemini column languages: ${status.missingLanguages.join(", ")}`);
      if (!visualStatus.ok) status.reasons.push("missing GPT visual payload with 1 cover and 2-3 content images");
      status.readyToMerge = isCompleteLanguageSet(languageStatus.languages) && visualStatus.ok;
      if (status.readyToMerge) {
        status.mergeCommand = [
          "node",
          "scripts/merge-column-gemini-gpt.mjs",
          "--sequences",
          String(sequence),
          "--visuals-file",
          visualStatus.filePath
        ];
      }
    } else {
      status.reasons.push(`unsupported lane: ${lane}`);
    }

    items.push(status);
  }

  return items;
}

async function mergeReadyItems(items, { dryRun }) {
  const merged = [];
  const held = [];
  for (const item of items.filter((entry) => entry.readyToMerge)) {
    if (dryRun) {
      held.push({ ...item, dryRun: true });
      continue;
    }
    const [command, ...args] = item.mergeCommand;
    const result = await runCommand(command, args);
    if (result.code === 0) {
      merged.push({
        ...item,
        merged: true,
        mergeExitCode: result.code,
        mergeStdout: result.stdout.trim()
      });
    } else {
      held.push({
        ...item,
        merged: false,
        mergeExitCode: result.code,
        reasons: [...item.reasons, `merge failed: ${result.stderr.trim() || result.stdout.trim()}`]
      });
    }
  }
  return { merged, held };
}

async function runBatch({ queueDir, date, maxGroups, maxParallel, publish, allowProduction, statusOutput }) {
  if (hasFlag("merge-only")) {
    return null;
  }
  const args = [
    "scripts/blog-backfill-batch-runner.mjs",
    "--queue-dir",
    queueDir,
    "--base-url",
    OFFICIAL_BASE_URL,
    "--max-groups",
    String(maxGroups),
    "--max-parallel",
    String(maxParallel),
    "--resume",
    "--retry-held",
    "--status-output",
    statusOutput,
    "--skip-existing-live"
  ];
  if (publish) args.push("--publish");
  if (allowProduction) args.push("--allow-production");
  if (hasFlag("fail-closed")) args.push("--fail-closed");

  const result = await runCommand(process.execPath, args);
  const batchStatus = await readJson(statusOutput).catch(() => null);
  return {
    ok: result.code === 0,
    code: result.code,
    command: [process.execPath, ...args].join(" "),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    statusOutput: path.relative(process.cwd(), statusOutput),
    summary: batchStatus?.summary || null
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const date = arg("date", DEFAULT_DATE);
  const backfillDir = path.resolve("data/blog-backfill", date);
  const queueDir = path.join(backfillDir, "queue");
  const statusOutput = path.resolve(arg("status-output", path.join(backfillDir, "batch-status.json")));
  const accelerationOutput = path.resolve(arg("acceleration-output", path.join(backfillDir, "acceleration-status.json")));
  const maxGroups = parsePositiveInt("max-groups", 8);
  const publish = hasFlag("publish") && !hasFlag("dry-run");
  const requestedMaxParallel = process.argv.includes("--max-parallel");
  const maxParallel = publish && !requestedMaxParallel
    ? 1
    : parsePositiveInt("max-parallel", publish ? 1 : 3);
  const allowProduction = hasFlag("allow-production");

  if (publish && !allowProduction) {
    fail("Refuse production publish unless --allow-production is provided.");
  }
  if (!(await exists(queueDir))) fail(`queue directory not found: ${queueDir}`);

  const before = await scanQueue({ backfillDir, queueDir });
  const mergeResult = await mergeReadyItems(before, { dryRun: hasFlag("dry-run") });
  const after = await scanQueue({ backfillDir, queueDir });
  const batch = await runBatch({
    queueDir,
    date,
    maxGroups,
    maxParallel,
    publish,
    allowProduction,
    statusOutput
  });

  const summary = {
    totalQueueItems: after.length,
    articleSetReady: after.filter((item) => item.articleSetExists).length,
    readyToMergeNow: after.filter((item) => item.readyToMerge).length,
    mergedThisRun: mergeResult.merged.length,
    blockedBeforeBrowserProduction: after.filter((item) => !item.articleSetExists && !item.readyToMerge).length,
    publishMode: publish ? "publish" : "validate-only",
    maxGroups,
    maxParallel
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    date,
    backfillDir: path.relative(process.cwd(), backfillDir),
    queueDir: path.relative(process.cwd(), queueDir),
    summary,
    batch,
    merged: mergeResult.merged.map((item) => ({
      sequence: item.sequence,
      lane: item.lane,
      articleSetPath: path.relative(process.cwd(), item.articleSetPath),
      mergeStdout: item.mergeStdout
    })),
    blocked: after
      .filter((item) => !item.articleSetExists && !item.readyToMerge)
      .map((item) => ({
        sequence: item.sequence,
        lane: item.lane,
        missingLanguages: item.missingLanguages || [],
        reasons: item.reasons,
        artifactFiles: item.artifactFiles || [],
        visuals: item.visuals || null
      })),
    queue: after.map((item) => ({
      sequence: item.sequence,
      lane: item.lane,
      articleSetExists: item.articleSetExists,
      readyToMerge: item.readyToMerge,
      reasons: item.reasons,
      missingLanguages: item.missingLanguages || []
    }))
  };

  await writeJson(accelerationOutput, payload);

  console.log(JSON.stringify({
    ok: batch ? batch.ok : true,
    accelerationOutput: path.relative(process.cwd(), accelerationOutput),
    statusOutput: path.relative(process.cwd(), statusOutput),
    summary,
    batchSummary: batch?.summary || null
  }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
