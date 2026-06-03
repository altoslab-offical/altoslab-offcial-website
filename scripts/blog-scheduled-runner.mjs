#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_LABEL = LANGUAGES.join(", ");
const PREP_WINDOWS = {
  morning: { hour: 8, minute: 10 },
  afternoon: { hour: 15, minute: 10 }
};
const RELEASE_WINDOWS = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 16, minute: 0 }
};
const MARKET_SCAN_WINDOWS = [
  { hour: 10, minute: 30 },
  { hour: 12, minute: 30 },
  { hour: 14, minute: 30 },
  { hour: 18, minute: 30 },
  { hour: 20, minute: 30 }
];
const RELEASE_GRACE_MINUTES = 5;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
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

function runRoot() {
  return path.resolve(process.env.ALTOS_BLOG_WORKER_RUN_DIR || path.join(process.cwd(), "data/blog-worker-runs"));
}

function candidateIndexPath(date, slot) {
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

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function appendLog(filePath, message) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${new Date().toISOString()} ${message}\n`, "utf8");
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

function usage() {
  console.log(`
ALTOS LAB scheduled blog runner

Daily flow:
  node scripts/blog-scheduled-runner.mjs --scheduled

Manual checks:
  node scripts/blog-scheduled-runner.mjs --prep --slot morning
  node scripts/blog-scheduled-runner.mjs --release --slot afternoon
  node scripts/blog-scheduled-runner.mjs --market-scan

This runner never creates production content by itself. Column prep creates a
prompt and manifest skeleton. Market scan creates a separate fast-lane source
prompt only when the main brain can then use Gemini and a credited source image.
Release publishes only a ready prepared-candidate manifest produced after
Gemini/source-image-or-GPT + validate-only + main-brain QA.
`);
}

function runCommand(command, args, { cwd, env = process.env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
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

  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-${slot}-scheduled-${taiwanStamp()}`));
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
This is a daily column slot. Gemini writes/revises the article set; ChatGPT/GPT creates one shared cover and 2-3 shared in-article images for the ${LANGUAGES.length} language versions.
Required languages: ${LANGUAGE_LABEL}.
Column contentImages must serve three editorial jobs: opening anchor, mechanism/evidence, and optional closing synthesis. Use the same image URLs across every language version.
Do not publish during prep. Do not change accounts or model selectors.

After the Gemini/source-image/GPT output is saved, run:

\`\`\`bash
node scripts/blog-local-worker.mjs \\
  --article-set "${articleSetPath}" \\
  --slot ${slot} \\
  --validate-only \\
  --manifest "${manifestPath}" \\
  --approve-design-qa
\`\`\`

The release window will publish only if this manifest becomes status="ready".

Detailed browser prompt:

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
    humanDesignQa: { approved: false }
  };
  await writeJson(manifestPath, manifest);
  await writeJson(indexPath, { ...manifest, manifestPath });
  return { ok: true, skipped: false, phase: "prep", runDir, promptPath, articleSetPath, manifestPath, indexPath, doctor: compactDoctorResult(doctor) };
}

async function createMarketScan({ date }) {
  const slot = Number(taiwanParts().hour) < 12 ? "morning" : "afternoon";
  const doctor = await runDoctor({ mode: "prep", date, slot });
  await appendLog(globalScheduleLogPath(), JSON.stringify({ phase: "market-scan-doctor", date, slot, doctor: compactDoctorResult(doctor) }));
  if (!doctor.ok) {
    return { ok: false, phase: "market-scan-doctor", stdout: doctor.stdout, stderr: doctor.stderr };
  }

  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-market-scan-${taiwanStamp()}`));
  const promptPath = path.join(runDir, "market-fast-lane-prompt-card.md");
  const articleSetPath = path.join(runDir, "article-set.json");
  const manifestPath = path.join(runDir, "prepared-candidate.json");
  const orchestratorPromptPath = path.join(runDir, "browser-production-prompt.md");

  await fs.mkdir(runDir, { recursive: true });
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

Use only the ALTOS Blog QA Chrome tab group.
Gemini writes/revises the market-news article set. The cover must be the source article or official announcement image, shared by all ${LANGUAGES.length} languages.
Required languages: ${LANGUAGE_LABEL}. Every market-news item must be translated/localized into all of them before validate-only.
Do not use GPT art, Unsplash, Pexels, Pixabay, Openverse, reused covers, or local fallback art for market news.
If no qualified source image exists, hold the candidate and report no publish.

After source image + Gemini output is saved, run:

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

Detailed browser prompt:

\`\`\`text
${await fs.readFile(orchestratorPromptPath, "utf8").catch(() => "")}
\`\`\`
`;
  await fs.writeFile(promptPath, promptCard, "utf8");

  const manifest = {
    status: "awaiting_market_browser_production",
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
      errors: ["Market scan has not produced a Gemini/source-image validated article set yet."]
    },
    humanDesignQa: { approved: false }
  };
  await writeJson(manifestPath, manifest);
  return { ok: true, skipped: false, phase: "market-scan", runDir, promptPath, articleSetPath, manifestPath, doctor: compactDoctorResult(doctor) };
}

function releaseGateIssues(manifest, { date, slot, articleSet }) {
  const issues = [];
  const posts = Array.isArray(articleSet?.posts) ? articleSet.posts : [];
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
  if (manifest.chromeEvidence?.gemini?.usedExistingTab !== true) issues.push("Gemini existing-tab evidence is missing");
  if (manifest.chromeEvidence?.gemini?.changedModel === true) issues.push("Gemini model was changed");
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
  const parts = taiwanParts();
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
  const indexPath = candidateIndexPath(date, slot);
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
    const verification = await runCommand(process.execPath, [
      "scripts/verify-blog-release.mjs",
      "--manifest",
      manifestPath
    ], { cwd: process.cwd() });
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
  const verification = await runCommand(process.execPath, [
    "scripts/verify-blog-release.mjs",
    "--manifest",
    manifestPath
  ], { cwd: process.cwd() });
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
  const date = arg("date") || taiwanDate();
  let mode = hasFlag("prep") ? "prep" : hasFlag("release") ? "release" : "";
  if (hasFlag("market-scan")) mode = "market-scan";
  if (hasFlag("scheduled")) {
    const parts = taiwanParts();
    const hour = Number(parts.hour);
    mode = isMarketScanClock() ? "market-scan" : hour === PREP_WINDOWS.morning.hour || hour === PREP_WINDOWS.afternoon.hour ? "prep" : "release";
  }
  if (!mode) throw new Error("Use --scheduled, --prep, --release or --market-scan");
  const slot = arg("slot") || slotFromClock(mode);
  if (mode !== "market-scan" && !SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");

  const result = mode === "prep" ? await createPrep({ date, slot }) : mode === "market-scan" ? await createMarketScan({ date }) : await release({ date, slot });
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
