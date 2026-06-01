#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const SLOT_HOURS = { morning: "09:00", afternoon: "16:00" };
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_ANTIGRAVITY_BIN = "/Users/asdc163/.antigravity/antigravity/bin/antigravity";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB Antigravity blog orchestrator

Daily scheduler entrypoint:
  node scripts/blog-antigravity-orchestrator.mjs --publish

Useful checks:
  node scripts/blog-antigravity-orchestrator.mjs --dry-run --slot morning --topic "AI agents"
  node scripts/blog-antigravity-orchestrator.mjs --skip-antigravity --article-set ./article-set.json --publish

Environment:
  BLOG_INGEST_HMAC_SECRET      Shared HMAC secret configured in Vercel
  ALTOS_BLOG_BASE_URL          Defaults to ${DEFAULT_BASE_URL}
  ALTOS_ANTIGRAVITY_BIN        Defaults to ${DEFAULT_ANTIGRAVITY_BIN}
  ALTOS_BLOG_WORKER_RUN_DIR    Defaults to ./data/blog-worker-runs
  ALTOS_BLOG_WORKER_WAIT_MINUTES defaults to 45
`);
}

function taiwanParts(input = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
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
  return parts;
}

function taiwanDate(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function taiwanStamp(input = new Date()) {
  const parts = taiwanParts(input);
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

function inferSlot(input = new Date()) {
  const hour = Number(taiwanParts(input).hour);
  return hour < 12 ? "morning" : "afternoon";
}

function runRoot() {
  return path.resolve(process.env.ALTOS_BLOG_WORKER_RUN_DIR || path.join(process.cwd(), "data/blog-worker-runs"));
}

function buildPrompt({ slot, date, articleSetPath, topic }) {
  const runIdHint = `local-antigravity-${date}-${slot}-short-topic`;
  return `# ALTOS LAB daily AI blog article set

You are the writing engine for ALTOS LAB's official website blog. Create one high-quality article set and write the final JSON to this exact path:

${articleSetPath}

Do not publish. Do not call any ALTOS LAB API. Do not write Markdown around the JSON.

Slot: ${slot} (${SLOT_HOURS[slot]} Asia/Taipei)
Date: ${date}
Topic: ${topic || "Choose the strongest current AI market signal from reliable sources."}

Editorial bar:
- Write zh-Hant first as the source of truth, then localize en, ja and ko from the same argument.
- The first 40-80 words must answer why the reader should care today.
- Use a clear ALTOS LAB judgment. Do not write a generic news summary.
- No fake case studies, unsupported metrics, keyword stuffing, or templated AI filler.
- Keep paragraphs scannable. Include one practical decision, not just context.
- Add FAQ, SEO title/meta, GEO summary, key takeaways, visible source links and AI disclosure.

Source bar:
- breaking/news article: at least 2 reliable sources.
- column/feature: at least 4 reliable sources.
- Prefer official AI labs, product/research blogs, trusted technology media, and primary documentation.
- All four languages must use the exact same sourceLinks array and one translationGroupId.

Image bar:
- If you already generated safe local PNG covers, set coverLocalPath for each post.
- Otherwise leave cover and coverLocalPath empty; the ALTOS LAB worker will generate wordless bitmap covers, upload them, and run image QA.
- Never use stock photo URLs, third-party copyrighted images, real people, logos, trademarks, screenshots, fake UI, or text-heavy graphics.

Required JSON shape:
{
  "ingestRunId": "${runIdHint}",
  "slot": "${slot}",
  "generationDate": "${date}",
  "translationGroupId": "${runIdHint}",
  "publishMode": "publish-if-valid",
  "generation": {
    "provider": "local-antigravity",
    "promptVersion": "altos-local-antigravity-v1",
    "model": "Antigravity local editorial workflow"
  },
  "posts": [
    {
      "language": "zh-Hant",
      "slug": "lowercase-hyphen-slug-zh-hant",
      "title": "",
      "seoTitle": "",
      "seoDescription": "",
      "excerpt": "",
      "contentType": "breaking",
      "newsCategory": "AI",
      "topic": "",
      "audience": "",
      "geoSummary": "",
      "body": "Markdown body with H2 sections. Use ==important sentence== for one short highlighted sentence when helpful.",
      "keyTakeaways": ["", "", ""],
      "faqs": [{ "question": "", "answer": "" }],
      "sourceLinks": [{ "title": "", "url": "", "publisher": "", "publishedAt": "", "summary": "" }],
      "tags": ["AI", "ALTOS LAB"],
      "author": "ALTOS LAB",
      "coverAlt": "",
      "coverSource": "generated",
      "coverCredit": "AI-generated by ALTOS LAB",
      "aiDisclosure": "本文章由 AI 協助產生，發布前已通過 ALTOS LAB 自動品質審核與來源檢查。"
    }
  ]
}

Create exactly four posts: zh-Hant, en, ja, ko.`;
}

async function ensureFileStable(filePath, intervalMs) {
  const first = await fs.stat(filePath);
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  const second = await fs.stat(filePath);
  return first.size > 0 && first.size === second.size && first.mtimeMs === second.mtimeMs;
}

async function waitForArticleSet(filePath, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await ensureFileStable(filePath, 1500)) {
        const raw = await fs.readFile(filePath, "utf8");
        JSON.parse(raw);
        return;
      }
    } catch {
      // Keep waiting until timeout; incomplete JSON should fail closed.
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Antigravity did not produce a valid article set within ${Math.round(timeoutMs / 60000)} minutes: ${filePath}`);
}

async function appendLog(logPath, text) {
  await fs.appendFile(logPath, `${new Date().toISOString()} ${text}\n`, "utf8");
}

async function runCommand(command, args, { cwd, logPath, env = process.env }) {
  await appendLog(logPath, `$ ${[command, ...args].join(" ")}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => void appendLog(logPath, chunk.toString().trimEnd()));
    child.stderr.on("data", (chunk) => void appendLog(logPath, chunk.toString().trimEnd()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const slot = arg("slot") || inferSlot();
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning or afternoon");

  const date = arg("date") || taiwanDate();
  const stamp = taiwanStamp();
  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-${slot}-${stamp}`));
  const articleSetPath = path.resolve(arg("article-set") || path.join(runDir, "article-set.json"));
  const promptPath = path.join(runDir, "antigravity-prompt.md");
  const logPath = path.join(runDir, "orchestrator.log");
  const coverDir = path.join(runDir, "covers");
  const prompt = buildPrompt({ slot, date, articleSetPath, topic: arg("topic") });

  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(promptPath, prompt, "utf8");

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ ok: true, slot, date, runDir, promptPath, articleSetPath }, null, 2));
    return;
  }

  if (!hasFlag("skip-antigravity")) {
    const antigravityBin = process.env.ALTOS_ANTIGRAVITY_BIN || DEFAULT_ANTIGRAVITY_BIN;
    await runCommand(antigravityBin, ["chat", "--mode", "agent", "--reuse-window", prompt], {
      cwd: process.cwd(),
      logPath
    });
  }

  const waitMinutes = Number(arg("wait-minutes") || process.env.ALTOS_BLOG_WORKER_WAIT_MINUTES || 45);
  await waitForArticleSet(articleSetPath, Math.max(1, waitMinutes) * 60_000);

  const workerArgs = [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    articleSetPath,
    "--slot",
    slot,
    "--generate-missing-covers",
    "--cover-dir",
    coverDir
  ];
  if (hasFlag("publish")) workerArgs.push("--publish");
  else workerArgs.push("--validate-only");

  const workerEnv = {
    ...process.env,
    ALTOS_BLOG_BASE_URL: arg("base-url") || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL
  };
  await runCommand(process.execPath, workerArgs, { cwd: process.cwd(), logPath, env: workerEnv });
  console.log(JSON.stringify({ ok: true, slot, date, runDir, articleSetPath, logPath, published: hasFlag("publish") }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
