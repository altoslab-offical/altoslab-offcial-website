#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const PREP_WINDOWS = {
  morning: { hour: 8, minute: 10 },
  afternoon: { hour: 15, minute: 10 }
};
const RELEASE_WINDOWS = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 16, minute: 0 }
};

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

function usage() {
  console.log(`
ALTOS LAB scheduled blog runner

Daily flow:
  node scripts/blog-scheduled-runner.mjs --scheduled

Manual checks:
  node scripts/blog-scheduled-runner.mjs --prep --slot morning
  node scripts/blog-scheduled-runner.mjs --release --slot afternoon

This runner never creates production content by itself. Prep creates a prompt
and manifest skeleton. Release publishes only a ready prepared-candidate
manifest produced after Gemini/GPT + validate-only + main-brain QA.
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
  const indexPath = candidateIndexPath(date, slot);
  if ((await exists(indexPath)) && !hasFlag("force")) {
    const existing = await readJson(indexPath);
    if (existing.status === "ready" || existing.status === "awaiting_browser_production") {
      return {
        ok: true,
        skipped: true,
        phase: "prep",
        reason: `candidate already exists with status=${existing.status}`,
        manifestPath: existing.manifestPath || indexPath
      };
    }
  }

  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-${slot}-scheduled-${taiwanStamp()}`));
  const promptPath = path.join(runDir, "prompt-card.md");
  const articleSetPath = path.join(runDir, "article-set.json");
  const manifestPath = path.join(runDir, "prepared-candidate.json");
  const orchestratorPromptPath = path.join(runDir, "antigravity-prompt.md");

  await fs.mkdir(runDir, { recursive: true });
  const orchestrator = await runCommand(process.execPath, [
    "scripts/blog-antigravity-orchestrator.mjs",
    "--dry-run",
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
Gemini writes/revises the article set. ChatGPT/GPT creates the cover image.
Do not publish during prep. Do not change accounts or model selectors.

After Gemini/GPT output is saved, run:

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
  return { ok: true, skipped: false, phase: "prep", runDir, promptPath, articleSetPath, manifestPath, indexPath };
}

function releaseGateIssues(manifest, { date, slot }) {
  const issues = [];
  if (manifest.status !== "ready") issues.push(`manifest status must be ready, got ${manifest.status || "missing"}`);
  if (manifest.slot !== slot) issues.push(`manifest slot must be ${slot}`);
  if (manifest.expectedReleaseAt !== scheduledFor(date, slot)) {
    issues.push(`expectedReleaseAt must be ${scheduledFor(date, slot)}`);
  }
  if (!manifest.articleSetPath) issues.push("articleSetPath is required");
  if (manifest.chromeEvidence?.gemini?.usedExistingTab !== true) issues.push("Gemini existing-tab evidence is missing");
  if (manifest.chromeEvidence?.gemini?.changedModel === true) issues.push("Gemini model was changed");
  if (manifest.chromeEvidence?.chatgpt?.usedExistingTab !== true) issues.push("ChatGPT/GPT existing-tab evidence is missing");
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
  if (nowDate !== date || Number(parts.hour) !== window.hour || Number(parts.minute) !== window.minute) {
    return `release window is not open; expected ${scheduledFor(date, slot)}`;
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
  const issues = releaseGateIssues(manifest, { date, slot });
  const windowIssue = releaseWindowIssue({ date, slot });
  if (windowIssue) issues.push(windowIssue);
  if (manifest.articleSetPath && !(await exists(path.resolve(manifest.articleSetPath)))) {
    issues.push("articleSetPath file is missing");
  }
  if (issues.length) {
    return { ok: true, skipped: true, phase: "release", reason: "release gate held", issues, manifestPath };
  }

  const result = await runCommand(process.execPath, [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    manifest.articleSetPath,
    "--slot",
    slot,
    "--publish",
    "--manifest",
    manifestPath
  ], { cwd: process.cwd() });
  await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), result.stdout.trim());
  if (result.stderr.trim()) await appendLog(path.join(path.dirname(manifestPath), "scheduled-release.log"), result.stderr.trim());
  if (result.code !== 0) {
    return { ok: false, skipped: false, phase: "release", code: result.code, stdout: result.stdout, stderr: result.stderr, manifestPath };
  }
  const released = await readJson(manifestPath).catch(() => manifest);
  return {
    ok: true,
    skipped: false,
    phase: "release",
    status: released.status,
    publishedIds: released.publish?.publishedIds || [],
    heldDraftIds: released.publish?.heldDraftIds || [],
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
  if (hasFlag("scheduled")) {
    const parts = taiwanParts();
    const hour = Number(parts.hour);
    mode = hour === PREP_WINDOWS.morning.hour || hour === PREP_WINDOWS.afternoon.hour ? "prep" : "release";
  }
  if (!mode) throw new Error("Use --scheduled, --prep or --release");
  const slot = arg("slot") || slotFromClock(mode);
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");

  const result = mode === "prep" ? await createPrep({ date, slot }) : await release({ date, slot });
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
