#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_LABEL = LANGUAGES.join(", ");
const COLUMN_SLOT_SETTING = (process.env.ALTOS_BLOG_COLUMN_SLOTS || "morning")
  .split(",")
  .map((slot) => slot.trim())
  .filter(Boolean);
const COLUMN_SLOTS = new Set(COLUMN_SLOT_SETTING.length ? COLUMN_SLOT_SETTING : ["morning"]);
const ALL_PREP_WINDOWS = {
  morning: { hour: 8, minute: 10 },
  afternoon: { hour: 15, minute: 10 }
};
const ALL_RELEASE_WINDOWS = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 16, minute: 0 }
};
const PREP_WINDOWS = Object.fromEntries(Object.entries(ALL_PREP_WINDOWS).filter(([slot]) => COLUMN_SLOTS.has(slot)));
const RELEASE_WINDOWS = Object.fromEntries(Object.entries(ALL_RELEASE_WINDOWS).filter(([slot]) => COLUMN_SLOTS.has(slot)));
const MARKET_SCAN_WINDOWS = [
  { hour: 10, minute: 30 },
  { hour: 12, minute: 30 },
  { hour: 14, minute: 30 },
  { hour: 18, minute: 30 },
  { hour: 20, minute: 30 }
];
const RELEASE_GRACE_MINUTES = 5;
const PREP_GRACE_MINUTES = Number(process.env.ALTOS_BLOG_PREP_GRACE_MINUTES || "2");
const MARKET_SCAN_GRACE_MINUTES = Number(process.env.ALTOS_BLOG_MARKET_SCAN_GRACE_MINUTES || "2");
const RUNNER_LOCK_STALE_MINUTES = Number(process.env.ALTOS_BLOG_RUNNER_LOCK_STALE_MINUTES || "30");
const DEFAULT_CHILD_TIMEOUT_MS = Number.parseInt(process.env.ALTOS_BLOG_CHILD_TIMEOUT_MS || "120000", 10);
const CHROME_GUARD_TOTAL_RSS_MB = Number(process.env.ALTOS_BLOG_CHROME_TOTAL_RSS_MB || "5200");
const CHROME_GUARD_RENDERER_RSS_MB = Number(process.env.ALTOS_BLOG_CHROME_RENDERER_RSS_MB || "1200");
const CHROME_MEMORY_DOCTOR = path.join(
  process.env.HOME || "",
  "Library/Application Support/ChromeMemoryKit/chrome-memory-doctor"
);

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function shouldRunBackfillWithScheduled(mode) {
  if (hasFlag("skip-backfill") || process.env.ALTOS_BLOG_SKIP_BACKFILL === "true") return false;
  if (mode === "prep") return true;
  return mode === "market-scan" && process.env.ALTOS_BLOG_BACKFILL_ON_MARKET_SCAN === "true";
}

function currentNow() {
  const raw = arg("now") || process.env.ALTOS_BLOG_NOW || "";
  return raw ? new Date(raw) : new Date();
}

function taiwanParts(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(input)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
}

function taiwanDate(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function taiwanStamp(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

function scheduledFor(date, slot) {
  return `${date}T${SLOT_HOURS[slot]}:00+08:00`;
}

function slotFromClock(kind, input = new Date()) {
  const parts = taiwanParts(input);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const table = kind === "prep" ? PREP_WINDOWS : RELEASE_WINDOWS;
  for (const [slot, time] of Object.entries(table)) {
    if (hour === time.hour && minute === time.minute) return slot;
  }
  if (hasFlag("slot")) return arg("slot");
  return hour < 12 ? "morning" : "afternoon";
}

function isMarketScanClock(input = new Date()) {
  const parts = taiwanParts(input);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return MARKET_SCAN_WINDOWS.some((window) => window.hour === hour && window.minute === minute);
}

function minutesSinceMidnight(parts) {
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function matchWindow(table, { input = new Date(), graceMinutes = 0 }) {
  const parts = taiwanParts(input);
  const nowMinutes = minutesSinceMidnight(parts);
  for (const [slot, window] of Object.entries(table)) {
    const targetMinutes = window.hour * 60 + window.minute;
    const delta = nowMinutes - targetMinutes;
    if (delta >= 0 && delta <= graceMinutes) return { slot, deltaMinutes: delta, window };
  }
  return null;
}

function matchMarketWindow({ input = new Date(), graceMinutes = 0 }) {
  const parts = taiwanParts(input);
  const nowMinutes = minutesSinceMidnight(parts);
  for (const window of MARKET_SCAN_WINDOWS) {
    const targetMinutes = window.hour * 60 + window.minute;
    const delta = nowMinutes - targetMinutes;
    if (delta >= 0 && delta <= graceMinutes) return { deltaMinutes: delta, window };
  }
  return null;
}

function scheduledModeFromClock(input = new Date()) {
  const market = matchMarketWindow({ input, graceMinutes: MARKET_SCAN_GRACE_MINUTES });
  if (market) return { mode: "market-scan", slot: slotFromClock("market-scan", input), match: market };
  const prep = matchWindow(PREP_WINDOWS, { input, graceMinutes: PREP_GRACE_MINUTES });
  if (prep) return { mode: "prep", slot: prep.slot, match: prep };
  const release = matchWindow(RELEASE_WINDOWS, { input, graceMinutes: RELEASE_GRACE_MINUTES });
  if (release) return { mode: "release", slot: release.slot, match: release };
  const parts = taiwanParts(input);
  return {
    mode: "idle",
    reason: `outside scheduled blog windows at ${parts.hour}:${parts.minute} Asia/Taipei`,
    checkedAtTaipei: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
  };
}

function runRoot() {
  return path.resolve(process.env.ALTOS_BLOG_WORKER_RUN_DIR || path.join(process.cwd(), "data/blog-worker-runs"));
}

function candidateIndexPath(date, slot, lane = "column") {
  const normalizedLane = lane === "market" ? "market" : "column";
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}-${normalizedLane}.json`);
}

function legacyCandidateIndexPath(date, slot) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
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
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadEnvFileIfPresent() {
  const envFile = arg("env-file") || path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  if (!envFile || !(await exists(envFile))) return { envFile, loaded: false };
  const raw = await fs.readFile(envFile, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return { envFile, loaded: true };
}

function isMarketArticleSet(articleSet) {
  const posts = Array.isArray(articleSet?.posts) ? articleSet.posts : [];
  return articleSet?.generation?.provider === "source-translation" && posts.length > 0 && posts.every((post) => post.contentType === "breaking");
}

async function candidateLooksLikeLane(index, lane) {
  const manifestPath = index?.manifestPath || "";
  const manifest = manifestPath && (await exists(manifestPath)) ? await readJson(manifestPath).catch(() => null) : index;
  const articleSetPath = manifest?.articleSetPath ? path.resolve(manifest.articleSetPath) : "";
  const articleSet = articleSetPath && (await exists(articleSetPath)) ? await readJson(articleSetPath).catch(() => null) : null;
  const market = isMarketArticleSet(articleSet);
  return lane === "market" ? market : !market;
}

async function resolveCandidateIndexPath({ date, slot, lane = "column" }) {
  const lanePath = candidateIndexPath(date, slot, lane);
  if (await exists(lanePath)) return lanePath;
  const legacyPath = legacyCandidateIndexPath(date, slot);
  if (!(await exists(legacyPath))) return lanePath;
  const legacyIndex = await readJson(legacyPath).catch(() => null);
  if (await candidateLooksLikeLane(legacyIndex, lane)) return legacyPath;
  return lanePath;
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function appendLog(filePath, message) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${new Date().toISOString()} ${message}\n`, "utf8");
}

async function acquireRunLock({ mode, date, slot }) {
  if (hasFlag("no-lock")) return { ok: true, skipped: true, release: async () => {} };
  const filePath = scheduleLockPath();
  const payload = {
    pid: process.pid,
    mode,
    date,
    slot,
    startedAt: new Date().toISOString()
  };
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  for (const attempt of [0, 1]) {
    try {
      await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
      return {
        ok: true,
        filePath,
        payload,
        release: async () => {
          const current = await readJson(filePath).catch(() => null);
          if (current?.pid === process.pid) await fs.unlink(filePath).catch(() => {});
        }
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readJson(filePath).catch(() => null);
      const startedAt = existing?.startedAt ? Date.parse(existing.startedAt) : 0;
      const ageMinutes = startedAt ? (Date.now() - startedAt) / 60000 : Number.POSITIVE_INFINITY;
      if (attempt === 0 && ageMinutes > RUNNER_LOCK_STALE_MINUTES) {
        await fs.unlink(filePath).catch(() => {});
        continue;
      }
      return {
        ok: false,
        filePath,
        existing,
        ageMinutes: Number.isFinite(ageMinutes) ? Math.round(ageMinutes * 10) / 10 : null,
        staleAfterMinutes: RUNNER_LOCK_STALE_MINUTES,
        release: async () => {}
      };
    }
  }
  return { ok: false, filePath, release: async () => {} };
}

function parseJsonObject(raw) {
  if (!raw || !String(raw).trim()) return null;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return null;
  }
}

function globalScheduleLogPath() {
  return path.join(runRoot(), "scheduled-runner.log");
}

function scheduleLockPath() {
  return path.join(runRoot(), ".locks/blog-scheduled-runner.lock");
}

function compactDoctorResult(doctor) {
  const parsed = doctor.json || parseJsonObject(doctor.stdout);
  return parsed
    ? {
        ok: parsed.ok === true,
        checkedAt: parsed.checkedAt,
        errorCount: parsed.errors?.length || 0,
        warningCount: parsed.warnings?.length || 0,
        candidate: parsed.summary?.candidate
          ? {
              status: parsed.summary.candidate.status,
              postCount: parsed.summary.candidate.postCount,
              manifestPath: parsed.summary.candidate.manifestPath
            }
          : undefined,
        production: parsed.summary?.production?.health
          ? {
              cmsProvider: parsed.summary.production.health.cmsStorage?.provider,
              cmsWritable: parsed.summary.production.health.cmsStorage?.writable,
              legacyDeepSeekCronDisabled: parsed.summary.production.health.legacyDeepSeekCronDisabled
            }
          : undefined
      }
    : {
        ok: doctor.ok === true,
        errorCount: doctor.ok ? 0 : 1,
        warningCount: 0
      };
}

async function runDoctor({ mode, date, slot }) {
  if (hasFlag("skip-doctor")) return { ok: true, skipped: true };
  const result = await runCommand(process.execPath, [
    "scripts/blog-sop-doctor.mjs",
    "--mode",
    mode,
    "--date",
    date,
    "--slot",
    slot
  ], { cwd: process.cwd() });
  if (result.code !== 0) {
    return {
      ok: false,
      skipped: false,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      json: parseJsonObject(result.stdout)
    };
  }
  return {
    ok: true,
    skipped: false,
    stdout: result.stdout,
    stderr: result.stderr,
    json: parseJsonObject(result.stdout)
  };
}

async function checkChromeMemoryGuard({ date, slot }) {
  if (hasFlag("skip-chrome-guard")) return { ok: true, skipped: true };
  if (!(await exists(CHROME_MEMORY_DOCTOR))) {
    return {
      ok: true,
      skipped: true,
      missing: true,
      warning: "ChromeMemoryKit is not installed; browser prep can proceed but memory pressure is not preflighted."
    };
  }
  const result = await runCommand(CHROME_MEMORY_DOCTOR, [
    "guard",
    "--total-rss-mb",
    String(CHROME_GUARD_TOTAL_RSS_MB),
    "--renderer-rss-mb",
    String(CHROME_GUARD_RENDERER_RSS_MB)
  ], { cwd: process.cwd() });
  const parsed = parseJsonObject(result.stdout);
  const guard = {
    ok: result.code === 0 && parsed?.status === "ok",
    status: parsed?.status || "unknown",
    totalRssMb: parsed?.total_rss_mb,
    topRendererMb: parsed?.top_renderer_mb,
    processCount: parsed?.process_count,
    thresholds: {
      totalRssMb: CHROME_GUARD_TOTAL_RSS_MB,
      rendererRssMb: CHROME_GUARD_RENDERER_RSS_MB
    },
    warnings: parsed?.warnings || [],
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "chrome-memory-guard", date, slot, guard }));
  return guard;
}

function usage() {
  console.log(`
ALTOS LAB scheduled blog runner

Daily flow:
  node scripts/blog-scheduled-runner.mjs --scheduled

Manual checks:
  node scripts/blog-scheduled-runner.mjs --prep --slot morning
  node scripts/blog-scheduled-runner.mjs --release --slot afternoon
  node scripts/blog-scheduled-runner.mjs --market-scan
  node scripts/blog-scheduled-runner.mjs --backfill --target-posts 40

This runner never creates production content by itself. Column prep creates a
prompt and manifest skeleton. Market scan creates a separate fast-lane source
prompt for source-translation plus a credited source or official image.
Release publishes only a ready prepared-candidate manifest produced after
lane-specific evidence + validate-only + main-brain QA.
Backfill creates an alternating market/column prompt queue only; it never
publishes or bypasses the same release gates.
`);
}

function runCommand(command, args, { cwd, env = process.env, timeoutMs = DEFAULT_CHILD_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
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
    child.on("error", (error) => finish({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => finish({ code: code ?? 1, stdout, stderr }));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runReleaseVerification(manifestPath, { timeoutMs = DEFAULT_CHILD_TIMEOUT_MS } = {}) {
  const attempts = Math.max(1, Number(process.env.ALTOS_BLOG_VERIFY_RETRY_ATTEMPTS || "3"));
  const retryDelayMs = Math.max(0, Number(process.env.ALTOS_BLOG_VERIFY_RETRY_DELAY_MS || "25000"));
  let lastResult = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await runCommand(process.execPath, [
      "scripts/verify-blog-release.mjs",
      "--manifest",
      manifestPath
    ], { cwd: process.cwd(), timeoutMs });
    result.attempt = attempt;
    result.attempts = attempts;
    lastResult = result;
    if (result.code === 0) return result;
    await appendLog(globalScheduleLogPath(), JSON.stringify({
      phase: "release-verification-retry",
      manifestPath,
      attempt,
      attempts,
      code: result.code
    }));
    if (attempt < attempts && retryDelayMs > 0) await sleep(retryDelayMs);
  }
  return lastResult;
}

async function createPrep({ date, slot }) {
  const doctor = await runDoctor({ mode: "prep", date, slot });
  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "prep-doctor", date, slot, doctor: compactDoctorResult(doctor) }));
  if (!doctor.ok) {
    return { ok: false, phase: "prep-doctor", stdout: doctor.stdout, stderr: doctor.stderr };
  }

  const indexPath = candidateIndexPath(date, slot);
  if ((await exists(indexPath)) && !hasFlag("force")) {
    const existing = await readJson(indexPath);
    if (existing.status === "ready" || existing.status === "awaiting_browser_production") {
      return {
        ok: true,
        skipped: true,
        phase: "prep",
        reason: `candidate already exists with status=${existing.status}`,
        manifestPath: existing.manifestPath || indexPath,
        doctor: compactDoctorResult(doctor)
      };
    }
  }

  const chromeGuard = await checkChromeMemoryGuard({ date, slot });
  if (!chromeGuard.ok && !hasFlag("force")) {
    return {
      ok: true,
      skipped: true,
      phase: "prep",
      reason: "chrome memory guard held browser production prep",
      chromeGuard,
      doctor: compactDoctorResult(doctor)
    };
  }

  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-${slot}-scheduled-${taiwanStamp(currentNow())}`));
  const promptPath = path.join(runDir, "prompt-card.md");
  const articleSetPath = path.join(runDir, "article-set.json");
  const manifestPath = path.join(runDir, "prepared-candidate.json");
  const orchestratorPromptPath = path.join(runDir, "browser-production-prompt.md");

  await fs.mkdir(runDir, { recursive: true });
  const orchestrator = await runCommand(process.execPath, [
    "scripts/blog-antigravity-orchestrator.mjs",
    "--dry-run",
    "--slot",
    slot,
    "--lane",
    "column",
    "--date",
    date,
    "--run-dir",
    runDir
  ], { cwd: process.cwd() });
  if (orchestrator.code !== 0) {
    return {
      ok: false,
      phase: "prep",
      error: "orchestrator dry-run failed",
      stdout: orchestrator.stdout,
      stderr: orchestrator.stderr
    };
  }

  const promptCard = `# ALTOS LAB Blog Prompt Card

Run date: ${date}
Slot: ${slot}
Expected release: ${scheduledFor(date, slot)}
Article set output: ${articleSetPath}
Prepared manifest: ${manifestPath}

Use only the ALTOS Blog QA Chrome tab group.
This is a daily column slot. Gemini writes/revises one zh-Hant source-of-truth column first. Main-brain quality QA must pass before any localization starts.
After the zh-Hant source article passes, gpt-5.3-codex-spark subagents localize the approved article into: en, ja, ko, id, vi, th, ms, fil. The localized articles must sound native to each market and must not collapse the column into a summary.
ChatGPT/GPT creates one shared cover and 2-3 shared in-article images for the ${LANGUAGES.length} language versions.
Required final languages: ${LANGUAGE_LABEL}.
Column contentImages must serve editorial jobs: opening anchor, mechanism/evidence, and optional closing synthesis. Use the same image URLs across every language version.
Do not publish during prep. Do not change accounts or model selectors.

After the approved source article, localization output, and GPT visual output are merged into article-set.json, run:

\`\`\`bash
node scripts/blog-local-worker.mjs \\
  --article-set "${articleSetPath}" \\
  --slot ${slot} \\
  --validate-only \\
  --manifest "${manifestPath}" \\
  --approve-design-qa
\`\`\`

The release window will publish only if this manifest becomes status="ready".

Detailed column production prompt:

\`\`\`text
${await fs.readFile(orchestratorPromptPath, "utf8").catch(() => "")}
\`\`\`
`;
  await fs.writeFile(promptPath, promptCard, "utf8");

  const manifest = {
    status: "awaiting_browser_production",
    slot,
    expectedReleaseAt: scheduledFor(date, slot),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runDir,
    promptPath,
    articleSetPath,
    manifestPath,
    chromeEvidence: {
      gemini: { usedExistingTab: false, changedModel: false },
      chatgpt: { usedExistingTab: false, changedModel: false }
    },
    validateOnly: {
      wouldPublish: false,
      errors: ["Gemini/GPT browser production has not produced a validated article set yet."]
    },
    chromeGuard,
    humanDesignQa: { approved: false }
  };
  await writeJson(manifestPath, manifest);
  await writeJson(indexPath, { ...manifest, manifestPath });
  return { ok: true, skipped: false, phase: "prep", runDir, promptPath, articleSetPath, manifestPath, indexPath, doctor: compactDoctorResult(doctor) };
}

async function createMarketScan({ date }) {
  const slot = Number(taiwanParts(currentNow()).hour) < 12 ? "morning" : "afternoon";
  const doctor = await runDoctor({ mode: "prep", date, slot });
  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "market-scan-doctor", date, slot, doctor: compactDoctorResult(doctor) }));
  if (!doctor.ok) {
    return { ok: false, phase: "market-scan-doctor", stdout: doctor.stdout, stderr: doctor.stderr };
  }

  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-market-scan-${taiwanStamp(currentNow())}`));
  const promptPath = path.join(runDir, "market-fast-lane-prompt-card.md");
  const articleSetPath = path.join(runDir, "article-set.json");
  const repairedArticleSetPath = path.join(runDir, "article-set.source-repaired.json");
  const manifestPath = path.join(runDir, "prepared-candidate.json");
  const orchestratorPromptPath = path.join(runDir, "browser-production-prompt.md");
  const queueDir = path.join(runDir, "queue");
  const sourcePacksPath = path.join(runDir, "market-source-packs.generated.json");
  const mergedDir = path.join(runDir, "merged");
  const writeMarketIndex = async (payload) => {
    if (hasFlag("no-index")) return;
    await writeJson(candidateIndexPath(date, slot, "market"), payload);
  };

  await fs.mkdir(queueDir, { recursive: true });
  await writeJson(path.join(queueDir, "01-market.json"), {
    sequence: 1,
    lane: "market",
    status: "awaiting_source_translation_production",
    slot,
    runDir,
    articleSetPath
  });

  const orchestrator = await runCommand(process.execPath, [
    "scripts/blog-antigravity-orchestrator.mjs",
    "--dry-run",
    "--lane",
    "market",
    "--slot",
    slot,
    "--date",
    date,
    "--run-dir",
    runDir
  ], { cwd: process.cwd() });
  if (orchestrator.code !== 0) {
    return {
      ok: false,
      phase: "market-scan",
      error: "orchestrator dry-run failed",
      stdout: orchestrator.stdout,
      stderr: orchestrator.stderr
    };
  }

  const promptCard = `# ALTOS LAB Market News Fast-Lane Prompt Card

Run date: ${date}
Detected slot context: ${slot}
Article set output: ${articleSetPath}
Prepared manifest: ${manifestPath}

Market-news fast lane uses source-translation, not Gemini by default.
Translate/adapt the verified source article into ALTOS LAB's reader-first brief format. The cover must be the source article or official announcement image, shared by all ${LANGUAGES.length} languages.
Required languages: ${LANGUAGE_LABEL}. Every market-news item must be translated/localized into all of them before validate-only.
Do not use GPT art, Unsplash, Pexels, Pixabay, Openverse, reused covers, or local fallback art for market news.
If no qualified source image exists, hold the candidate and report no publish.

Set generation.provider to "source-translation" and generatedBy to "source-translation" (or a source-translation provenance string) for market-news posts.

After source image + source-translation output is saved, run:

\`\`\`bash
node scripts/blog-local-worker.mjs \\
  --article-set "${articleSetPath}" \\
  --slot ${slot} \\
  --validate-only \\
  --manifest "${manifestPath}" \\
  --approve-design-qa
\`\`\`

If validate-only and main-brain QA pass, publish immediately with:

\`\`\`bash
node scripts/blog-local-worker.mjs \\
  --article-set "${articleSetPath}" \\
  --slot ${slot} \\
  --publish \\
  --manifest "${manifestPath}" \\
  --reuse-validated-manifest \\
  --approve-design-qa
node scripts/verify-blog-release.mjs --manifest "${manifestPath}"
\`\`\`

Detailed source-production prompt:

\`\`\`text
${await fs.readFile(orchestratorPromptPath, "utf8").catch(() => "")}
\`\`\`
`;
  await fs.writeFile(promptPath, promptCard, "utf8");

  const manifest = {
    status: "awaiting_source_translation_production",
    lane: "market",
    slot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runDir,
    promptPath,
    articleSetPath,
    manifestPath,
    chromeEvidence: {
      gemini: { usedExistingTab: false, changedModel: false },
      chatgpt: { usedExistingTab: false, changedModel: false }
    },
    validateOnly: {
      wouldPublish: false,
      errors: ["Market scan has not produced a source-translation/source-image validated article set yet."]
    },
    humanDesignQa: { approved: false }
  };
  await writeJson(manifestPath, manifest);

  if (hasFlag("prompt-only") || process.env.ALTOS_BLOG_MARKET_SCAN_PROMPT_ONLY === "true") {
    return { ok: true, skipped: false, phase: "market-scan", mode: "prompt-only", runDir, promptPath, articleSetPath, manifestPath, doctor: compactDoctorResult(doctor) };
  }

  const scanner = await runCommand(process.execPath, [
    "scripts/blog-market-source-scanner.mjs",
    "--date",
    date,
    "--queue-dir",
    queueDir,
    "--out",
    sourcePacksPath,
    "--max-packs",
    "1",
    "--source-profile",
    arg("source-profile", process.env.ALTOS_BLOG_MARKET_SOURCE_PROFILE || "mainstream-ai-us"),
    "--write",
    "--overwrite"
  ], { cwd: process.cwd(), timeoutMs: Number(process.env.ALTOS_BLOG_MARKET_SCAN_TIMEOUT_MS || "90000") });
  if (scanner.code !== 0) {
    const held = {
      ...manifest,
      status: "held",
      updatedAt: new Date().toISOString(),
      validateOnly: {
        wouldPublish: false,
        errors: [`market source scanner held: ${scanner.stderr.trim() || scanner.stdout.trim() || "no qualified source"}`]
      },
      pipeline: { scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() } }
    };
    await writeJson(manifestPath, held);
    await writeMarketIndex({ ...held, manifestPath });
    return { ok: true, skipped: true, phase: "market-scan", reason: "no qualified source pack", runDir, manifestPath, scanner: held.pipeline.scanner, doctor: compactDoctorResult(doctor) };
  }
  const sourcePacks = await readJson(sourcePacksPath).catch(() => []);
  if (!Array.isArray(sourcePacks) || !sourcePacks.some((pack) => Number(pack?.sequence) === 1)) {
    const scannerParsed = parseJsonObject(scanner.stdout) || {};
    const held = {
      ...manifest,
      status: "held",
      updatedAt: new Date().toISOString(),
      validateOnly: {
        wouldPublish: false,
        errors: ["no new, non-duplicate market source passed source-image and fact extraction gates"]
      },
      pipeline: {
        scanner: {
          code: scanner.code,
          packsGenerated: scannerParsed.packsGenerated ?? 0,
          candidates: scannerParsed.candidates ?? null,
          skipped: scannerParsed.skipped || [],
          stdout: scanner.stdout.trim(),
          stderr: scanner.stderr.trim()
        }
      }
    };
    await writeJson(manifestPath, held);
    await writeMarketIndex({ ...held, manifestPath });
    return {
      ok: true,
      skipped: true,
      phase: "market-scan",
      reason: "no qualified source pack",
      runDir,
      manifestPath,
      scanner: held.pipeline.scanner,
      doctor: compactDoctorResult(doctor)
    };
  }

  const sourceWorker = await runCommand(process.execPath, [
    "scripts/blog-market-source-worker.mjs",
    "--date",
    date,
    "--backfill-dir",
    runDir,
    "--source-packs",
    sourcePacksPath,
    "--seq",
    "1",
    "--article-set",
    repairedArticleSetPath,
    "--write",
    "--overwrite"
  ], { cwd: process.cwd(), timeoutMs: Number(process.env.ALTOS_BLOG_MARKET_SCAN_TIMEOUT_MS || "90000") });
  if (sourceWorker.code !== 0) {
    const held = {
      ...manifest,
      status: "held",
      updatedAt: new Date().toISOString(),
      validateOnly: {
        wouldPublish: false,
        errors: [`market source worker held: ${sourceWorker.stderr.trim() || sourceWorker.stdout.trim()}`]
      },
      pipeline: {
        scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() },
        sourceWorker: { code: sourceWorker.code, stdout: sourceWorker.stdout.trim(), stderr: sourceWorker.stderr.trim() }
      }
    };
    await writeJson(manifestPath, held);
    await writeMarketIndex({ ...held, manifestPath });
    return { ok: true, skipped: true, phase: "market-scan", reason: "source worker held", runDir, manifestPath, sourceWorker: held.pipeline.sourceWorker, doctor: compactDoctorResult(doctor) };
  }

  const merge = {
    code: 0,
    stdout: repairedArticleSetPath,
    stderr: "",
    note: "source worker writes article-set directly; legacy market Gemini merge disabled"
  };
  const repair = {
    code: 0,
    stdout: "source-only renderer; public-copy repair bypassed for fresh market scan",
    stderr: ""
  };

  const validate = await runCommand(process.execPath, [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    repairedArticleSetPath,
    "--slot",
    slot,
    "--validate-only",
    "--manifest",
    manifestPath,
    "--approve-design-qa",
    ...(hasFlag("no-index") ? ["--no-index"] : [])
  ], { cwd: process.cwd(), timeoutMs: Number(process.env.ALTOS_BLOG_MARKET_SCAN_TIMEOUT_MS || "90000") });
  if (validate.code !== 0) {
    const nextManifest = await readJson(manifestPath).catch(() => manifest);
    const held = {
      ...nextManifest,
      status: nextManifest.status || "held",
      updatedAt: new Date().toISOString(),
      pipeline: {
        scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() },
        sourceWorker: { code: sourceWorker.code, stdout: sourceWorker.stdout.trim(), stderr: sourceWorker.stderr.trim() },
        merge: { code: merge.code, stdout: merge.stdout.trim(), stderr: merge.stderr.trim() },
        repair: { code: repair.code, stdout: repair.stdout.trim(), stderr: repair.stderr.trim() },
        validate: { code: validate.code, stdout: validate.stdout.trim(), stderr: validate.stderr.trim() }
      }
    };
    await writeJson(manifestPath, held);
    await writeMarketIndex({ ...held, manifestPath });
    return { ok: true, skipped: true, phase: "market-scan", reason: "validate held", runDir, manifestPath, validate: held.pipeline.validate, doctor: compactDoctorResult(doctor) };
  }

  if (hasFlag("validate-only") || process.env.ALTOS_BLOG_MARKET_SCAN_VALIDATE_ONLY === "true") {
    const ready = await readJson(manifestPath).catch(() => manifest);
    const readyWithPipeline = {
      ...ready,
      updatedAt: new Date().toISOString(),
      pipeline: {
        scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() },
        sourceWorker: { code: sourceWorker.code, stdout: sourceWorker.stdout.trim(), stderr: sourceWorker.stderr.trim() },
        merge: { code: merge.code, stdout: merge.stdout.trim(), stderr: merge.stderr.trim() },
        repair: { code: repair.code, stdout: repair.stdout.trim(), stderr: repair.stderr.trim() },
        validate: { code: validate.code, stdout: validate.stdout.trim(), stderr: validate.stderr.trim() }
      }
    };
    await writeJson(manifestPath, readyWithPipeline);
    await writeMarketIndex({ ...readyWithPipeline, manifestPath });
    return {
      ok: true,
      skipped: false,
      phase: "market-scan",
      status: readyWithPipeline.status,
      mode: "validate-only",
      runDir,
      articleSetPath: repairedArticleSetPath,
      manifestPath,
      validate: readyWithPipeline.pipeline.validate,
      doctor: compactDoctorResult(doctor)
    };
  }

  const publish = await runCommand(process.execPath, [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    repairedArticleSetPath,
    "--slot",
    slot,
    "--publish",
    "--manifest",
    manifestPath,
    "--reuse-validated-manifest",
    "--approve-design-qa"
  ], { cwd: process.cwd(), timeoutMs: Number(process.env.ALTOS_BLOG_MARKET_SCAN_TIMEOUT_MS || "90000") });
  if (publish.code !== 0) {
    const nextManifest = await readJson(manifestPath).catch(() => manifest);
    const held = {
      ...nextManifest,
      updatedAt: new Date().toISOString(),
      pipeline: {
        scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() },
        sourceWorker: { code: sourceWorker.code, stdout: sourceWorker.stdout.trim(), stderr: sourceWorker.stderr.trim() },
        merge: { code: merge.code, stdout: merge.stdout.trim(), stderr: merge.stderr.trim() },
        repair: { code: repair.code, stdout: repair.stdout.trim(), stderr: repair.stderr.trim() },
        validate: { code: validate.code, stdout: validate.stdout.trim(), stderr: validate.stderr.trim() },
        publish: { code: publish.code, stdout: publish.stdout.trim(), stderr: publish.stderr.trim() }
      }
    };
    await writeJson(manifestPath, held);
    await writeMarketIndex({ ...held, manifestPath });
    return { ok: false, skipped: false, phase: "market-scan", reason: "publish failed", runDir, manifestPath, publish: held.pipeline.publish, doctor: compactDoctorResult(doctor) };
  }

  const verification = await runReleaseVerification(manifestPath, {
    timeoutMs: Number(process.env.ALTOS_BLOG_MARKET_SCAN_TIMEOUT_MS || "90000")
  });
  const released = await readJson(manifestPath).catch(() => manifest);
  const releasedWithPipeline = {
    ...released,
    updatedAt: new Date().toISOString(),
    pipeline: {
      scanner: { code: scanner.code, stdout: scanner.stdout.trim(), stderr: scanner.stderr.trim() },
      sourceWorker: { code: sourceWorker.code, stdout: sourceWorker.stdout.trim(), stderr: sourceWorker.stderr.trim() },
      merge: { code: merge.code, stdout: merge.stdout.trim(), stderr: merge.stderr.trim() },
      repair: { code: repair.code, stdout: repair.stdout.trim(), stderr: repair.stderr.trim() },
      validate: { code: validate.code, stdout: validate.stdout.trim(), stderr: validate.stderr.trim() },
      publish: { code: publish.code, stdout: publish.stdout.trim(), stderr: publish.stderr.trim() },
      verification: { code: verification.code, stdout: verification.stdout.trim(), stderr: verification.stderr.trim() }
    }
  };
  await writeJson(manifestPath, releasedWithPipeline);
  await writeMarketIndex({ ...releasedWithPipeline, manifestPath });
  if (verification.code !== 0) {
    return { ok: false, skipped: false, phase: "market-scan-verification", runDir, manifestPath, verification: releasedWithPipeline.pipeline.verification, doctor: compactDoctorResult(doctor) };
  }
  return {
    ok: true,
    skipped: false,
    phase: "market-scan",
    status: releasedWithPipeline.status,
    runDir,
    articleSetPath: repairedArticleSetPath,
    manifestPath,
    publishedIds: releasedWithPipeline.publish?.publishedIds || [],
    verification: releasedWithPipeline.pipeline.verification,
    doctor: compactDoctorResult(doctor)
  };
}

async function runBackfillPlanner({ date }) {
  const targetPosts = arg("target-posts", String(process.env.ALTOS_BLOG_BACKFILL_TARGET_POSTS || "40"));
  const baseUrl = arg("base-url", process.env.ALTOS_BLOG_BASE_URL || "https://altoslab-ai.cc");
  const args = [
    "scripts/blog-backfill-planner.mjs",
    "--date",
    date,
    "--target-posts",
    targetPosts,
    "--base-url",
    baseUrl,
    "--write"
  ];
  const maxSets = arg("max-sets", process.env.ALTOS_BLOG_BACKFILL_MAX_SETS || "");
  if (maxSets) args.push("--max-sets", maxSets);
  const lanes = arg("lanes", process.env.ALTOS_BLOG_BACKFILL_LANES || "");
  if (lanes) args.push("--lanes", lanes);
  if (hasFlag("force")) args.push("--force");

  const result = await runCommand(process.execPath, args, { cwd: process.cwd() });
  const parsed = parseJsonObject(result.stdout);
  const payload = parsed?.plan
    ? {
        ok: parsed.ok === true,
        planPath: parsed.planPath,
        status: parsed.plan.status,
        publishedPosts: parsed.plan.publishedPosts,
        targetPostsPerLanguage: parsed.plan.targetPostsPerLanguage,
        currentMinPostsPerLanguage: parsed.plan.currentMinPostsPerLanguage,
        missingPosts: parsed.plan.missingPosts,
        missingByLanguage: parsed.plan.missingByLanguage,
        setsNeeded: parsed.plan.setsNeeded,
        plannedSets: parsed.plan.plannedSets,
        plannedPublishedPosts: parsed.plan.plannedPublishedPosts,
        plannedPostsPerLanguage: parsed.plan.plannedPostsPerLanguage,
        queue: parsed.plan.queue?.map((item) => ({
          lane: item.lane,
          status: item.status,
          sequence: item.sequence,
          promptPath: item.promptPath,
          manifestPath: item.manifestPath
        }))
      }
    : { ok: result.code === 0, stdout: result.stdout, stderr: result.stderr };

  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "backfill", date, result: payload }));
  if (result.code !== 0) {
    return { ok: false, phase: "backfill", code: result.code, stdout: result.stdout, stderr: result.stderr };
  }
  return { ok: true, phase: "backfill", ...payload };
}

function releaseGateIssues(manifest, { date, slot, articleSet }) {
  const issues = [];
  const posts = Array.isArray(articleSet?.posts) ? articleSet.posts : [];
  const isSourceTranslationMarketOnly =
    articleSet?.generation?.provider === "source-translation" &&
    posts.length > 0 &&
    posts.every((post) => post.contentType === "breaking");
  const requiresGptCover = posts.some((post) => post.contentType !== "breaking");
  const retryableHeldManifest =
    manifest.status === "held" &&
    manifest.validateOnly?.wouldPublish === true &&
    manifest.validateOnly?.qualityApproved === true &&
    manifest.validateOnly?.imageApproved === true &&
    (!Array.isArray(manifest.validateOnly?.errors) || manifest.validateOnly.errors.length === 0) &&
    (!Array.isArray(manifest.publish?.publishedIds) || manifest.publish.publishedIds.length === 0);
  if (manifest.status !== "ready" && !retryableHeldManifest) {
    issues.push(`manifest status must be ready, got ${manifest.status || "missing"}`);
  }
  if (manifest.slot !== slot) issues.push(`manifest slot must be ${slot}`);
  if (manifest.expectedReleaseAt !== scheduledFor(date, slot)) {
    issues.push(`expectedReleaseAt must be ${scheduledFor(date, slot)}`);
  }
  if (!manifest.articleSetPath) issues.push("articleSetPath is required");
  if (!isSourceTranslationMarketOnly && manifest.chromeEvidence?.gemini?.usedExistingTab !== true) {
    issues.push("Gemini existing-tab evidence is missing");
  }
  if (!isSourceTranslationMarketOnly && manifest.chromeEvidence?.gemini?.changedModel === true) issues.push("Gemini model was changed");
  if (requiresGptCover && manifest.chromeEvidence?.chatgpt?.usedExistingTab !== true) {
    issues.push("ChatGPT/GPT existing-tab evidence is missing for generated covers");
  }
  if (manifest.chromeEvidence?.chatgpt?.changedModel === true) issues.push("ChatGPT/GPT model was changed");
  if (manifest.validateOnly?.wouldPublish !== true) issues.push("validateOnly.wouldPublish is not true");
  if (manifest.validateOnly?.qualityApproved !== true) issues.push("quality gate is not approved");
  if (manifest.validateOnly?.imageApproved !== true) issues.push("image gate is not approved");
  if (Array.isArray(manifest.validateOnly?.errors) && manifest.validateOnly.errors.length > 0) {
    issues.push(`validateOnly has errors: ${manifest.validateOnly.errors.join("; ")}`);
  }
  if (manifest.humanDesignQa?.approved !== true) issues.push("humanDesignQa.approved is not true");
  return issues;
}

function releaseWindowIssue({ date, slot }) {
  if (hasFlag("force-release")) return "";
  const parts = taiwanParts(currentNow());
  const nowDate = `${parts.year}-${parts.month}-${parts.day}`;
  const window = RELEASE_WINDOWS[slot];
  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const releaseMinutes = window.hour * 60 + window.minute;
  const minutesAfterRelease = nowMinutes - releaseMinutes;
  if (nowDate !== date || minutesAfterRelease < 0 || minutesAfterRelease > RELEASE_GRACE_MINUTES) {
    return `release window is not open; expected ${scheduledFor(date, slot)} within ${RELEASE_GRACE_MINUTES} minutes`;
  }
  return "";
}

async function release({ date, slot }) {
  const indexPath = await resolveCandidateIndexPath({ date, slot, lane: "column" });
  if (!(await exists(indexPath))) {
    return { ok: true, skipped: true, phase: "release", reason: "missing prepared candidate", indexPath };
  }
  const index = await readJson(indexPath);
  const manifestPath = index.manifestPath || indexPath;
  if (!(await exists(manifestPath))) {
    return { ok: true, skipped: true, phase: "release", reason: "prepared candidate manifest file missing", manifestPath };
  }
  const manifest = await readJson(manifestPath);
  const articleSetPath = manifest.articleSetPath ? path.resolve(manifest.articleSetPath) : "";
  const articleSet = articleSetPath && (await exists(articleSetPath)) ? await readJson(articleSetPath) : null;
  if (manifest.status === "released") {
    const verification = await runReleaseVerification(manifestPath);
    await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), verification.stdout.trim());
    if (verification.stderr.trim()) await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), verification.stderr.trim());
    if (verification.code !== 0) {
      return {
        ok: false,
        skipped: false,
        phase: "post-release-verification",
        code: verification.code,
        stdout: verification.stdout,
        stderr: verification.stderr,
        manifestPath
      };
    }
    const verified = JSON.parse(verification.stdout || "{}");
    const releaseVerification = {
      ok: verified.ok === true,
      checkedAt: verified.checkedAt || new Date().toISOString(),
      errors: verified.errors || [],
      warnings: verified.warnings || [],
      summary: verified.summary || {}
    };
    const manifestWithVerification = {
      ...manifest,
      updatedAt: new Date().toISOString(),
      releaseVerification
    };
    await writeJson(manifestPath, manifestWithVerification);
    await writeJson(indexPath, { ...manifestWithVerification, manifestPath });
    return {
      ok: true,
      skipped: false,
      phase: "post-release-verification",
      status: "released",
      releaseVerification,
      manifestPath
    };
  }
  const issues = releaseGateIssues(manifest, { date, slot, articleSet });
  const windowIssue = releaseWindowIssue({ date, slot });
  if (windowIssue) issues.push(windowIssue);
  if (manifest.articleSetPath && !articleSet) {
    issues.push("articleSetPath file is missing");
  }
  if (issues.length) {
    await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "release-held", date, slot, manifestPath, issues }));
    return { ok: true, skipped: true, phase: "release", reason: "release gate held", issues, manifestPath };
  }

  const doctor = await runDoctor({ mode: "release", date, slot });
  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "release-doctor", date, slot, doctor: compactDoctorResult(doctor) }));
  if (!doctor.ok) {
    return { ok: false, skipped: false, phase: "release-doctor", stdout: doctor.stdout, stderr: doctor.stderr };
  }

  const result = await runCommand(process.execPath, [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    manifest.articleSetPath,
    "--slot",
    slot,
    "--publish",
    "--manifest",
    manifestPath,
    "--reuse-validated-manifest"
  ], { cwd: process.cwd() });
  await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), result.stdout.trim());
  if (result.stderr.trim()) await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), result.stderr.trim());
  if (result.code !== 0) {
    return { ok: false, skipped: false, phase: "release", code: result.code, stdout: result.stdout, stderr: result.stderr, manifestPath };
  }
  const released = await readJson(manifestPath).catch(() => manifest);
  const verification = await runReleaseVerification(manifestPath);
  await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), verification.stdout.trim());
  if (verification.stderr.trim()) await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), verification.stderr.trim());
  if (verification.code !== 0) {
    return {
      ok: false,
      skipped: false,
      phase: "release-verification",
      code: verification.code,
      stdout: verification.stdout,
      stderr: verification.stderr,
      manifestPath
    };
  }
  const verified = JSON.parse(verification.stdout || "{}");
  const releaseVerification = {
    ok: verified.ok === true,
    checkedAt: verified.checkedAt || new Date().toISOString(),
    errors: verified.errors || [],
    warnings: verified.warnings || [],
    summary: verified.summary || {}
  };
  const releasedWithVerification = {
    ...released,
    updatedAt: new Date().toISOString(),
    releaseVerification
  };
  await writeJson(manifestPath, releasedWithVerification);
  await writeJson(indexPath, { ...releasedWithVerification, manifestPath });
  return {
    ok: true,
    skipped: false,
    phase: "release",
    status: released.status,
    publishedIds: released.publish?.publishedIds || [],
    heldDraftIds: released.publish?.heldDraftIds || [],
    releaseVerification,
    doctor: compactDoctorResult(doctor),
    manifestPath
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }
  await loadEnvFileIfPresent();
  const now = currentNow();
  const date = arg("date") || taiwanDate(now);
  let mode = hasFlag("prep") ? "prep" : hasFlag("release") ? "release" : "";
  let scheduledSlot = "";
  let scheduledMatch = null;
  if (hasFlag("market-scan")) mode = "market-scan";
  if (hasFlag("backfill")) mode = "backfill";
  if (hasFlag("scheduled")) {
    const scheduled = scheduledModeFromClock(now);
    if (scheduled.mode === "idle") {
      const result = { ok: true, skipped: true, phase: "scheduled", reason: scheduled.reason, checkedAtTaipei: scheduled.checkedAtTaipei };
      await appendLog(globalScheduleLogPath(), JSON.stringify(result));
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    mode = scheduled.mode;
    scheduledSlot = scheduled.slot || "";
    scheduledMatch = scheduled.match || null;
  }
  if (!mode) throw new Error("Use --scheduled, --prep, --release, --market-scan or --backfill");
  const slot = arg("slot") || scheduledSlot || slotFromClock(mode, now);
  if (mode !== "market-scan" && !SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");

  const lock = await acquireRunLock({ mode, date, slot });
  if (!lock.ok) {
    const result = {
      ok: true,
      skipped: true,
      phase: "scheduled-lock",
      reason: "another blog scheduled runner is active",
      lock: {
        filePath: lock.filePath,
        existing: lock.existing,
        ageMinutes: lock.ageMinutes,
        staleAfterMinutes: lock.staleAfterMinutes
      }
    };
    await appendLog(globalScheduleLogPath(), JSON.stringify(result));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  let result;
  try {
    result =
      mode === "prep"
        ? await createPrep({ date, slot })
        : mode === "market-scan"
          ? await createMarketScan({ date })
          : mode === "backfill"
            ? await runBackfillPlanner({ date })
            : await release({ date, slot });
    if (scheduledMatch) result.scheduledMatch = scheduledMatch;
    if (hasFlag("scheduled") && shouldRunBackfillWithScheduled(mode)) {
      result.backfill = await runBackfillPlanner({ date });
    }
  } finally {
    await lock.release();
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
