#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_BACKFILL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const DEFAULT_QUEUE_DIR = path.join(process.cwd(), "data/blog-backfill", DEFAULT_BACKFILL_DATE, "queue");
const LOCAL_BASE_URL = "http://localhost:3000";
const OFFICIAL_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_CHILD_TIMEOUT_MS = Number.parseInt(process.env.ALTOS_BLOG_CHILD_TIMEOUT_MS || "120000", 10);

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog backfill batch runner

Usage:
  node scripts/blog-backfill-batch-runner.mjs [--queue-dir <path>] [--base-url <url>] [--max-groups <n>] [--max-parallel <n>] [--status-output <path>]
  [--resume] [--retry-held] [--dry-run] [--publish] [--fail-closed] [--skip-existing-live]

Examples:
  node scripts/blog-backfill-batch-runner.mjs
  node scripts/blog-backfill-batch-runner.mjs --base-url http://localhost:3000 --max-groups 5
  node scripts/blog-backfill-batch-runner.mjs --base-url http://localhost:3000 --max-groups 5 --max-parallel 2 --resume --dry-run

Notes:
- Scans --queue-dir for queue JSON entries, and only processes items that include an existing article-set.json.
- For each queue item: validate-only -> publish (reuse validated manifest) -> verify.
- Dry-run mode runs validate-only only and skips publish/verify.
- Default is dry-run; add --publish to actually publish and verify.
- Failures are recorded as held and do not block other queue items.
- Add --fail-closed to exit non-zero whenever any processed item is held.
- Add --skip-existing-live to skip article sets whose translationGroupId already exists on the target /api/blog.
- Production publish is intentionally single-lane. Concurrent publish is refused unless --allow-concurrent-publish is explicitly provided after a durable CMS write lock exists.
- --resume skips items already completed in the previous run unless --retry-held is set.
- Default base URL is localhost to avoid accidental production publish.
`);
}

function runCommand(command, args, { cwd = process.cwd(), timeoutMs = DEFAULT_CHILD_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => {
          stderr += `\ncommand timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`;
          child.kill("SIGTERM");
          finish({ code: 124, stdout, stderr, timedOut: true });
        }, timeoutMs)
      : null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      finish({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonSafe(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function liveTranslationGroups(baseUrl) {
  if (!baseUrl || /^https?:\/\/localhost(?::\d+)?$/i.test(baseUrl)) return new Set();
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/blog`);
  if (!response.ok) {
    throw new Error(`failed to read live blog API (${response.status})`);
  }
  const payload = await response.json();
  const posts = payload?.payload?.posts || payload?.posts || [];
  return new Set(
    posts
      .map((post) => post?.translationGroupId || "")
      .filter(Boolean)
  );
}

async function translationGroupIdForArticleSet(articleSetPath) {
  const payload = await readJson(articleSetPath);
  return String(payload?.translationGroupId || payload?.posts?.[0]?.translationGroupId || payload?.ingestRunId || "").trim();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveBaseUrl() {
  const userBaseUrl = arg("base-url", LOCAL_BASE_URL).trim().replace(/\/$/, "");
  if ((userBaseUrl === OFFICIAL_BASE_URL || userBaseUrl === `${OFFICIAL_BASE_URL}/`) && !hasFlag("allow-production")) {
    throw new Error("Refuse to run against production base URL by default. Add --allow-production to explicitly opt in.");
  }
  if (!hasFlag("base-url")) return LOCAL_BASE_URL;
  if (!userBaseUrl) throw new Error("--base-url is required when provided");
  return userBaseUrl;
}

function parsePositiveInt(name, fallback = 0) {
  const value = Number.parseInt(arg(name, ""), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parseLastJson(raw) {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Best-effort fallback below.
  }

  const candidates = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(trimmed.slice(start, index + 1));
        start = -1;
      }
    }
  }

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(candidates[index]);
    } catch {
      continue;
    }
  }

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith("{") || !lines[i].endsWith("}")) continue;
    try {
      return JSON.parse(lines[i]);
    } catch {
      continue;
    }
  }

  return null;
}

function statusFromOutput(result) {
  const output = parseLastJson(result.stdout);
  if (!output || typeof output !== "object") return null;
  return output;
}

function extractQueueItem(filePath, data, index) {
  if (!data || typeof data !== "object") {
    return {
      filePath,
      index,
      parseError: "queue item is not a JSON object",
      eligible: false,
      skipped: true
    };
  }

  const articleSetPath = data.articleSetPath ? path.resolve(path.resolve(path.dirname(filePath), data.articleSetPath)) : "";
  const manifestPath = data.manifestPath
    ? path.resolve(path.resolve(path.dirname(filePath), data.manifestPath))
    : (articleSetPath ? path.resolve(path.dirname(articleSetPath), "prepared-candidate.json") : "");
  const hasArticleSetJson = Boolean(articleSetPath && path.basename(articleSetPath) === "article-set.json");
  const slot = data.slot === "morning" || data.slot === "afternoon" ? data.slot : "";

  return {
    filePath,
    index,
    queueStatus: data.status || "unknown",
    lane: data.lane || "unknown",
    sequence: data.sequence,
    slot,
    articleSetPath,
    hasArticleSetJson,
    manifestPath,
    promptPath: data.promptPath || "",
    runDir: data.runDir || "",
    status: "pending"
  };
}

function normalizeSlot(queueItem, sequenceHint) {
  if (queueItem.slot === "morning" || queueItem.slot === "afternoon") return queueItem.slot;
  const sequence = Number(sequenceHint);
  if (Number.isInteger(sequence) && sequence > 0) {
    return sequence % 2 === 1 ? "morning" : "afternoon";
  }
  return "morning";
}

function compactArray(value, cap = 6) {
  if (!Array.isArray(value)) return value;
  if (value.length <= cap) return value;
  return [...value.slice(0, cap), `... (${value.length - cap} more)`];
}

function isSkippedByLimit(item) {
  return Array.isArray(item?.reasons) && item.reasons.length === 1 && item.reasons[0] === "skipped by --max-groups";
}

async function processQueueItem(queueItem, opts) {
  const startedAt = new Date().toISOString();
  const slot = normalizeSlot(queueItem, queueItem.sequence);
  const report = {
    filePath: queueItem.filePath,
    queueStatus: queueItem.queueStatus,
    lane: queueItem.lane,
    sequence: queueItem.sequence,
    slot,
    articleSetPath: queueItem.articleSetPath,
    manifestPath: queueItem.manifestPath,
    promptPath: queueItem.promptPath,
    runDir: queueItem.runDir,
    status: "held",
    held: true,
    reasons: [],
    validate: {
      ok: false,
      code: null,
      wouldPublish: false,
      data: null,
      held: true
    },
    publish: {
      ok: false,
      code: null,
      data: null,
      held: true
    },
    verify: {
      ok: false,
      code: null,
      data: null,
      held: true
    },
    startedAt,
    completedAt: null
  };

  if (!queueItem.articleSetPath) {
    report.reasons.push("missing articleSetPath");
    report.completedAt = new Date().toISOString();
    return report;
  }

  if (!(await exists(queueItem.articleSetPath))) {
    report.reasons.push(`article-set file not found: ${queueItem.articleSetPath}`);
    report.completedAt = new Date().toISOString();
    return report;
  }

  const translationGroupId = await translationGroupIdForArticleSet(queueItem.articleSetPath).catch(() => "");
  report.translationGroupId = translationGroupId;
  if (opts.skipExistingLive && translationGroupId && opts.liveGroups?.has(translationGroupId)) {
    report.status = "skipped_live_existing";
    report.reasons.push("translationGroupId already exists on target /api/blog");
    report.completedAt = new Date().toISOString();
    return report;
  }

  if (!queueItem.manifestPath) {
    report.manifestPath = "";
    report.reasons.push("missing manifestPath");
    report.completedAt = new Date().toISOString();
    return report;
  }

  const argsCommon = ["scripts/blog-local-worker.mjs", "--article-set", queueItem.articleSetPath, "--slot", slot, "--manifest", queueItem.manifestPath, "--approve-design-qa"];
  if (opts.baseUrl) {
    argsCommon.push("--base-url", opts.baseUrl);
  }

  const validate = await runCommand(process.execPath, [...argsCommon, "--validate-only"], { cwd: process.cwd() });
  const validatePayload = statusFromOutput(validate);
  report.validate = {
    ok: validate.code === 0,
    code: validate.code,
    wouldPublish: Boolean(validatePayload?.response?.wouldPublish || validatePayload?.wouldPublish),
    data: validatePayload,
    held: !(validate.code === 0)
  };

  if (!report.validate.ok || !report.validate.wouldPublish) {
    if (!report.validate.ok) {
      report.reasons.push(`validate-only failed (exit ${validate.code})`);
    } else {
      report.reasons.push("validate-only passed but wouldPublish=false");
    }
    report.completedAt = new Date().toISOString();
    return report;
  }

  if (!opts.publish) {
    report.status = "validated";
    report.held = false;
    report.validate.held = false;
    report.reasons.push("dry-run: publish/verify skipped");
    report.completedAt = new Date().toISOString();
    return report;
  }

  const publish = await runCommand(
    process.execPath,
    [...argsCommon, "--publish", "--reuse-validated-manifest"],
    { cwd: process.cwd() }
  );
  const publishPayload = statusFromOutput(publish);
  report.publish = {
    ok: publish.code === 0,
    code: publish.code,
    data: publishPayload,
    held: publish.code !== 0
  };

  if (!report.publish.ok) {
    report.reasons.push(`publish failed (exit ${publish.code})`);
    report.completedAt = new Date().toISOString();
    return report;
  }

  const verifyArgs = ["scripts/verify-blog-release.mjs", "--manifest", queueItem.manifestPath, "--no-write-manifest"];
  if (opts.baseUrl) {
    verifyArgs.push("--base-url", opts.baseUrl);
  }
  const verify = await runCommand(process.execPath, verifyArgs, { cwd: process.cwd() });
  const verifyPayload = statusFromOutput(verify);
  report.verify = {
    ok: verify.code === 0,
    code: verify.code,
    data: verifyPayload,
    held: !(verify.code === 0)
  };

  if (!report.verify.ok) {
    report.reasons.push(`verify failed (exit ${verify.code})`);
    report.completedAt = new Date().toISOString();
    return report;
  }

  report.status = "released";
  report.held = false;
  report.validate.held = false;
  report.publish.held = false;
  report.verify.held = false;
  report.completedAt = new Date().toISOString();
  return report;
}

async function runWithConcurrency(items, worker, maxParallel) {
  const done = [];
  for (let index = 0; index < items.length; index += maxParallel) {
    const chunk = items.slice(index, index + maxParallel);
    const chunkResults = await Promise.all(
      chunk.map(async (entry) => {
        try {
          const report = await worker(entry.item, entry.itemIndex);
          return { ...entry, report };
        } catch (error) {
          return {
            ...entry,
            report: {
              filePath: entry.item.filePath,
              queueStatus: entry.item.queueStatus || "error",
              lane: entry.item.lane || "unknown",
              sequence: entry.item.sequence,
              slot: normalizeSlot(entry.item, entry.item.sequence),
              articleSetPath: entry.item.articleSetPath || "",
              manifestPath: entry.item.manifestPath || "",
              promptPath: entry.item.promptPath || "",
              runDir: entry.item.runDir || "",
              status: "held",
              held: true,
              reasons: [`processing error: ${error instanceof Error ? error.message : String(error)}`],
              validate: { ok: false, code: null, wouldPublish: false, data: null, held: true },
              publish: { ok: false, code: null, data: null, held: true },
              verify: { ok: false, code: null, data: null, held: true },
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString()
            }
          };
        }
      })
    );
    done.push(...chunkResults);
  }
  return done;
}

function makeSkippedEntry(item, reason) {
  return {
    filePath: item.filePath,
    queueStatus: item.queueStatus || "skipped",
    lane: item.lane || "unknown",
    sequence: item.sequence,
    slot: normalizeSlot(item, item.sequence),
    articleSetPath: item.articleSetPath || "",
    manifestPath: item.manifestPath || "",
    promptPath: item.promptPath || "",
    runDir: item.runDir || "",
    status: "held",
    held: true,
    reasons: [reason],
    validate: { ok: false, code: null, wouldPublish: false, data: null, held: true },
    publish: { ok: false, code: null, data: null, held: true },
    verify: { ok: false, code: null, data: null, held: true },
    startedAt: null,
    completedAt: new Date().toISOString()
  };
}

async function run() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const queueDir = arg("queue-dir", DEFAULT_QUEUE_DIR);
  const queueDirPath = path.resolve(queueDir);
  const statusOutputPath = arg("status-output", path.join(path.dirname(queueDirPath), "batch-status.json"));
  const baseUrl = resolveBaseUrl();
  const maxGroups = parsePositiveInt("max-groups", 0);
  const doPublish = hasFlag("publish") && !hasFlag("dry-run");
  const maxParallel = parsePositiveInt("max-parallel", 1);
  if (doPublish && maxParallel > 1 && !hasFlag("allow-concurrent-publish")) {
    throw new Error("Refuse concurrent production publish because CMS writes are not race-safe. Use --max-parallel 1, or add --allow-concurrent-publish only after adding a durable write lock.");
  }
  const skipExistingLive = hasFlag("skip-existing-live");
  const liveGroups = skipExistingLive ? await liveTranslationGroups(baseUrl) : new Set();
  const resume = hasFlag("resume");
  const retryHeld = hasFlag("retry-held");
  const previousStatus = resume ? await readJsonSafe(statusOutputPath) : null;
  const previousItemsByPath = new Map(
    (previousStatus?.items || [])
      .filter((item) => typeof item?.filePath === "string")
      .map((item) => [item.filePath, item])
  );
  const previousRun = {
    generatedAt: previousStatus?.generatedAt || null,
    held: Array.isArray(previousStatus?.items)
      ? previousStatus.items.filter((item) => item.held === true).length
      : 0,
    totalItems: Array.isArray(previousStatus?.items) ? previousStatus.items.length : 0
  };

  if (!(await exists(queueDirPath))) {
    throw new Error(`Queue directory not found: ${queueDirPath}`);
  }

  const queueFiles = (await fs.readdir(queueDirPath))
    .filter((fileName) => fileName.endsWith(".json") && fileName !== "plan.json")
    .sort()
    .map((fileName) => path.join(queueDirPath, fileName));

  const queueEntries = [];
  for (let index = 0; index < queueFiles.length; index += 1) {
    const filePath = queueFiles[index];
    try {
      queueEntries.push(extractQueueItem(filePath, await readJson(filePath), index + 1));
    } catch (error) {
      queueEntries.push({
        filePath,
        index: index + 1,
        parseError: error instanceof Error ? error.message : String(error),
        eligible: false,
        skipped: true
      });
    }
  }

  const invalidEntries = queueEntries.filter((item) => item.parseError);
  const processableEntries = queueEntries.filter((item) => !item.parseError && item.hasArticleSetJson && item.articleSetPath);
  const resumeEligible = resume
    ? processableEntries.filter((entry) => {
      const previous = previousItemsByPath.get(entry.filePath);
      if (!previous) return true;
      if (previous.held === false) return false;
      if (!retryHeld && previous.completedAt && !isSkippedByLimit(previous)) return false;
      return true;
    })
    : processableEntries;
  const itemsToProcess = maxGroups > 0 ? resumeEligible.slice(0, maxGroups) : resumeEligible;
  const skippedByLimit = maxGroups > 0 ? Math.max(0, resumeEligible.length - itemsToProcess.length) : 0;
  const skippedByResume = processableEntries.length - resumeEligible.length;
  const processableSet = new Set(itemsToProcess.map((entry) => entry.filePath));
  const nextReady = resume
    ? resumeEligible.slice(itemsToProcess.length, itemsToProcess.length + 12).map((item) => item.sequence)
    : [];
  const nextReadyCount = maxGroups > 0 ? Math.max(0, processableEntries.length - itemsToProcess.length) : 0;
  const skipByReason = new Map();
  for (const item of processableEntries) {
    if (!processableSet.has(item.filePath)) {
      const previous = previousItemsByPath.get(item.filePath);
      const reason = resume
        ? previous?.held === false
          ? "already completed in previous run"
          : previous?.completedAt && !retryHeld
            ? "skipped by --resume (from previous run)"
            : "skipped by --max-groups"
        : "skipped by --max-groups";
      skipByReason.set(item.filePath, reason);
    }
  }

  const results = new Array(queueEntries.length).fill(null);
  const queueWork = [];
  for (let index = 0; index < queueEntries.length; index += 1) {
    const item = queueEntries[index];
    if (item.parseError) {
      results[index] = makeSkippedEntry({ ...item, queueStatus: "parse-error", lane: item.lane || "unknown", sequence: item.sequence }, item.parseError || "unknown queue item parse error");
      continue;
    }
    if (!item.hasArticleSetJson || !item.articleSetPath) {
      results[index] = makeSkippedEntry(item, "missing article-set.json in queue manifest");
      continue;
    }
    if (!processableSet.has(item.filePath)) {
      results[index] = makeSkippedEntry(item, skipByReason.get(item.filePath) || "skipped by --max-groups");
      continue;
    }
    queueWork.push({ itemIndex: index, item });
  }

  const processed = await runWithConcurrency(
    queueWork,
    (entryItem) => processQueueItem(entryItem, { baseUrl, publish: doPublish, skipExistingLive, liveGroups }),
    maxParallel
  );
  for (const chunk of processed) {
    results[chunk.itemIndex] = chunk.report;
  }

  const total = results.length;
  const released = results.filter((item) => item.held === false).length;
  const held = results.filter((item) => item.held === true).length;
  const validated = results.filter((item) => item.validate && item.validate.ok).length;
  const published = results.filter((item) => item.publish && item.publish.ok).length;
  const verified = results.filter((item) => item.verify && item.verify.ok).length;
  const queueStatusSummary = results.reduce((acc, item) => {
    const key = item.queueStatus || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const status = {
    generatedAt: new Date().toISOString(),
    queueDir: queueDirPath,
    statusOutputPath,
    baseUrl,
    allowProduction: hasFlag("allow-production"),
    maxGroups: maxGroups > 0 ? maxGroups : null,
    maxParallel,
    resume,
    retryHeld,
    publish: doPublish,
    skipExistingLive,
    liveGroupsChecked: skipExistingLive ? liveGroups.size : 0,
    failClosed: hasFlag("fail-closed"),
    dryRun: !doPublish,
    totalQueueFiles: queueEntries.length,
    parsedItems: queueEntries.filter((item) => !item.parseError).length,
    missingOrInvalid: invalidEntries.length + (queueEntries.length - processableEntries.length - invalidEntries.length),
    processed: itemsToProcess.length,
    skipped: queueEntries.length - itemsToProcess.length,
    skippedByLimit,
    skippedByResume,
    nextReadyCount,
    nextReadySequences: nextReady,
    previousRun,
    queueStatusSummary,
    summary: {
      total,
      released,
      held,
      validated,
      published,
      verified
    },
    items: results
  };

  await writeJson(statusOutputPath, status);

  if (!hasFlag("quiet")) {
    console.log(JSON.stringify(
      {
        queueDir: status.queueDir,
        statusOutputPath,
        baseUrl: status.baseUrl,
        summary: status.summary,
        mode: {
          dryRun: status.dryRun,
          publish: status.publish,
          maxParallel,
          resume
        },
        nextReadyCount: status.nextReadyCount,
        nextReadySequences: status.nextReadySequences,
        previousRun: status.previousRun,
        details: results.map((item) => ({
          queueStatus: item.queueStatus,
          lane: item.lane,
          sequence: item.sequence,
          slot: item.slot,
          held: item.held,
          reasons: compactArray(item.reasons, 3),
          validate: item.validate?.code,
          publish: item.publish?.code,
          verify: item.verify?.code
        }))
      },
      null,
      2
    ));
  }

  if (hasFlag("fail-closed")) {
    const processedHeld = results.some(
      (item) => item.held === true && item.queueStatus !== "skipped" && item.queueStatus !== "missing"
    );
    if (processedHeld) {
      console.error("batch fail-closed: at least one processed backfill item was held");
      process.exit(1);
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
