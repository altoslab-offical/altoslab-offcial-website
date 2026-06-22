#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { subagentModelPolicyText } from "./blog-subagent-model-policy.mjs";
import { columnVisualStylePromptBlock } from "./blog-column-visual-style-library.mjs";
import { spawn } from "node:child_process";

const SLOT_HOURS = { morning: "09:00", afternoon: "16:00", evening: "20:00" };
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_LABEL = LANGUAGES.join(", ");
function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB external AI blog orchestrator

Daily scheduler entrypoint:
  node scripts/blog-antigravity-orchestrator.mjs --publish

Useful checks:
  node scripts/blog-antigravity-orchestrator.mjs --dry-run --slot morning --topic "AI agents"
  node scripts/blog-antigravity-orchestrator.mjs --skip-browser-wait --article-set ./article-set.json --publish

Environment:
  BLOG_INGEST_HMAC_SECRET      Shared HMAC secret configured in Vercel
  ALTOS_BLOG_BASE_URL          Defaults to ${DEFAULT_BASE_URL}
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
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function runRoot() {
  return path.resolve(process.env.ALTOS_BLOG_WORKER_RUN_DIR || path.join(process.cwd(), "data/blog-worker-runs"));
}

function buildPrompt({ slot, date, articleSetPath, topic, lane }) {
  const marketLane = lane === "market";
  const visualStyleBlock = marketLane ? "" : `\n${columnVisualStylePromptBlock({ date, slot, topic })}\n`;
  const runIdHint = `${marketLane ? "source-translation" : "browser-gemini-gpt"}-${date}-${slot}-${marketLane ? "market-fast-lane" : "column"}`;
  const productionWorkspaceLine = marketLane
    ? "You are the source-translation production workspace for ALTOS LAB's official website blog. Market news uses verified source articles, source-faithful adaptation, and the credited source article or official announcement image. Create one high-quality market-news article set only after the source pack and source image pass QA, then write the final JSON to this exact path:"
    : "You are the production workspace for ALTOS LAB's official website blog. Columns/features use a staged workflow: Gemini writes or revises one zh-Hant source-of-truth column first, main-brain QA approves it, then bounded subagents localize the approved source into the other languages. ChatGPT/GPT generates covers only for columns/features. Create one high-quality article set only after the source article has passed QA, then write the final JSON to this exact path:";
  const productionControlLines = marketLane
    ? `- This run is market news: contentType must be breaking, facts must come from the source pack, copy is source-translated/adapted by Codex/source workers, and the cover must be the credited source article or official announcement image.
- Do not use Gemini by default for market-news backfill. Use Gemini only if the main-brain explicitly requests an editorial rewrite after source-translation QA.
- Market news/breaking posts must use the source article or official announcement image with visible attribution; do not use GPT art or stock/free images for market news.`
    : `- This run is an original ALTOS LAB column: contentType must be column, not breaking. Gemini must create the zh-Hant source-of-truth first. Do not localize or assemble all languages until that source article passes main-brain QA. The cover and in-article visuals must be generated through ChatGPT/GPT.
- Column/feature cover images must be generated through ChatGPT/GPT in the ALTOS Blog QA Chrome group.
- Subagent model fallback policy:
${subagentModelPolicyText()}
- Close or release Gemini/GPT tabs after the run so Chrome memory is not held.`;
  const sourceTruthLine = marketLane
    ? "Translate/adapt one verified source article package into zh-Hant first, then localize en, ja, ko, id, vi, th, ms, fil from the same source package."
    : `Write zh-Hant first as the source of truth, then localize ${LANGUAGES.filter((language) => language !== "zh-Hant").join(", ")} from the same argument.`;

  return `# ALTOS LAB daily AI blog article set

${productionWorkspaceLine}

${articleSetPath}

Do not publish. Do not call any ALTOS LAB API. Do not write Markdown around the JSON.

Slot: ${slot} (${SLOT_HOURS[slot]} Asia/Taipei)
Date: ${date}
Lane: ${marketLane ? "market-news-fast-lane" : "deep-column-lane"}
Topic: ${topic || (marketLane ? "Choose the strongest current AI market signal from reliable sources." : "Choose the strongest original ALTOS LAB AI column angle for founders and operators.")}

Editorial bar:
${productionControlLines}
- Check existing published/draft articles first; do not repeat a topic, headline angle or source package.
- ${sourceTruthLine}
- Southeast Asia editions must sound native for Indonesia, Vietnam, Thailand, Malaysia and the Philippines; do not ship literal translation tone.
- All ${LANGUAGES.length} languages must share the same cover URL and the same contentImages URLs. The language changes; the article identity and images do not.
- The first 40-80 words must answer why the reader should care today.
- Use a clear ALTOS LAB judgment. Do not write a generic news summary.
- No fake case studies, unsupported metrics, keyword stuffing, or templated AI filler.
- Keep paragraphs scannable. Include one practical decision, not just context.
- Fill SEO title/meta and GEO summary as backend metadata fields only; never mention SEO, GEO, AI-generation, prompts, models or quality pipeline in public title, excerpt, body, FAQ, captions, credits or review notes.
- Add natural FAQ, key takeaways and visible source links for readers. Do not include public AI-generation disclosure copy.

Source bar:
- breaking/news article: at least 2 reliable sources.
- column/feature: at least 4 reliable sources.
- Prefer official AI labs, product/research blogs, trusted technology media, and primary documentation.
- All ${LANGUAGES.length} languages must use the exact same sourceLinks array and one translationGroupId.

Image bar:
- For market news, attach a source image URL from the source article or official announcement, set coverSource to "source", and include coverCredit, coverCreditUrl and coverLicense. Do not use Unsplash, Pexels, Pixabay, Openverse, GPT art or any previously used cover.
- For columns/features, attach one ChatGPT/GPT-generated cover as coverLocalPath or an uploaded managed HTTPS media URL before validate-only.
- For columns/features, also attach 2-3 ChatGPT/GPT-generated in-article images in contentImages: opening anchor, mechanism/evidence, and optional closing synthesis. These images must be shared by every language version.
- For generated covers, coverGeneration.provider must say ChatGPT, GPT or OpenAI image generation.
- For generated contentImages, each image must include source "generated", provider, prompt, generatedAt, alt, caption, credit, aspectRatio and visualChecks.
- Never use local fallback art, generic stock photo URLs, repeated covers, real people, misleading logos, fake UI, or text-heavy graphics.
${visualStyleBlock}

Required JSON shape:
{
  "ingestRunId": "${runIdHint}",
  "slot": "${slot}",
  "generationDate": "${date}",
  "translationGroupId": "${runIdHint}",
  "publishMode": "publish-if-valid",
  "generation": {
    "provider": "${marketLane ? "source-translation" : "gemini-chatgpt"}",
    "promptVersion": "${marketLane ? "altos-source-translation-market-v1" : "altos-gemini-gpt-browser-v1"}",
    "model": "${marketLane ? "Codex source translation + source image workflow" : "Gemini copy + ChatGPT/GPT image browser workflow"}"
  },
  "chromeEvidence": {
    "gemini": {
      "usedExistingTab": ${marketLane ? "false" : "true"},
      "continuedExistingConversation": ${marketLane ? "false" : "true"},
      "changedModel": false,
      "profileEmail": "${marketLane ? "" : "john.wu0120@gmail.com"}",
      "title": "",
      "url": "https://gemini.google.com/app"
    },
    "chatgpt": {
      "usedExistingTab": ${marketLane ? "false" : "true"},
      "continuedExistingConversation": ${marketLane ? "false" : "true"},
      "changedModel": false,
      "profileEmail": "${marketLane ? "" : "john.wu0120@gmail.com"}",
      "title": "",
      "url": "https://chatgpt.com/"
    }
  },
  "posts": [
    {
      "language": "zh-Hant",
      "slug": "lowercase-hyphen-slug-zh-hant",
      "title": "",
      "seoTitle": "",
      "seoDescription": "",
      "excerpt": "",
      "contentType": "${marketLane ? "breaking" : "column"}",
      "newsCategory": "AI",
      "topic": "",
      "audience": "",
      "geoSummary": "",
      "body": "Markdown body with H2 sections. Use ==important sentence== for one short highlighted sentence when helpful.",
      "keyTakeaways": ["", "", ""],
      "faqs": [{ "question": "", "answer": "" }],
      "sourceLinks": [{ "title": "", "url": "", "publisher": "", "publishedAt": "", "summary": "" }],
      "tags": ["AI", "ALTOS LAB"],
      "author": "${slot === "morning" ? "Tommy" : "Ken"}",
      "coverAlt": "",
      "coverSource": "${marketLane ? "source" : "generated"}",
      "coverCredit": "${marketLane ? "Source image: [publisher or official source]" : "ALTOS LAB 編輯視覺"}",
      "coverCreditUrl": "${marketLane ? "https://source-article-or-official-announcement.example" : ""}",
      "coverLicense": "${marketLane ? "source-attributed" : ""}",
      "coverGeneration": ${marketLane ? "null" : "{ \"source\": \"generated\", \"provider\": \"ChatGPT/GPT\", \"prompt\": \"\", \"generatedAt\": \"\", \"status\": \"generated\", \"visualChecks\": { \"topicFit\": true, \"noTextArtifacts\": true, \"noLogos\": true, \"noPeople\": true, \"noTrademarkRisk\": true, \"noGenericStockLook\": true } }"},
      "contentImages": ${marketLane ? "[]" : "[{ \"url\": \"\", \"localPath\": \"\", \"alt\": \"\", \"caption\": \"\", \"source\": \"generated\", \"credit\": \"ALTOS LAB editorial visual\", \"aspectRatio\": \"wide\", \"placement\": \"after-lead\", \"provider\": \"ChatGPT/GPT\", \"prompt\": \"\", \"generatedAt\": \"\", \"visualChecks\": { \"topicFit\": true, \"noTextArtifacts\": true, \"noLogos\": true, \"noPeople\": true, \"noTrademarkRisk\": true, \"noGenericStockLook\": true } }, { \"url\": \"\", \"localPath\": \"\", \"alt\": \"\", \"caption\": \"\", \"source\": \"generated\", \"credit\": \"ALTOS LAB editorial visual\", \"aspectRatio\": \"wide\", \"placement\": \"mid-article\", \"provider\": \"ChatGPT/GPT\", \"prompt\": \"\", \"generatedAt\": \"\", \"visualChecks\": { \"topicFit\": true, \"noTextArtifacts\": true, \"noLogos\": true, \"noPeople\": true, \"noTrademarkRisk\": true, \"noGenericStockLook\": true } }]"},
      "generatedBy": "${marketLane ? "source-translation" : "gemini"}",
      "aiDisclosure": ""
    }
  ]
}

Create exactly ${LANGUAGES.length} posts: ${LANGUAGE_LABEL}.`;
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
  throw new Error(`Gemini/GPT browser production did not produce a valid article set within ${Math.round(timeoutMs / 60000)} minutes: ${filePath}`);
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
  if (!SLOT_HOURS[slot]) throw new Error("--slot must be morning, afternoon or evening");

  const date = arg("date") || taiwanDate();
  const lane = arg("lane") || "column";
  if (!["column", "market"].includes(lane)) throw new Error("--lane must be column or market");
  const stamp = taiwanStamp();
  const runDir = path.resolve(arg("run-dir") || path.join(runRoot(), `${date}-${slot}-${stamp}`));
  const articleSetPath = path.resolve(arg("article-set") || path.join(runDir, "article-set.json"));
  const promptPath = path.join(runDir, "browser-production-prompt.md");
  const logPath = path.join(runDir, "orchestrator.log");
  const coverDir = path.join(runDir, "covers");
  const prompt = buildPrompt({ slot, date, articleSetPath, topic: arg("topic"), lane });

  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(promptPath, prompt, "utf8");

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ ok: true, slot, date, runDir, promptPath, articleSetPath }, null, 2));
    return;
  }

  if (!hasFlag("skip-antigravity") && !hasFlag("skip-browser-wait")) {
    const laneLabel = lane === "market" ? "source-translation/source-image production" : "browser Gemini/GPT production";
    await appendLog(logPath, `${laneLabel} required; prompt written to ${promptPath}`);
    throw new Error(
      lane === "market"
        ? `Source-translation market production must write the article set first from verified sources and a credited source image. Use ${promptPath}, then rerun with --skip-browser-wait --article-set ${articleSetPath}.`
        : `Browser Gemini/GPT production must write the article set first. Use the ALTOS Blog QA Chrome group with ${promptPath}, then rerun with --skip-browser-wait --article-set ${articleSetPath}.`
    );
  }

  const waitMinutes = Number(arg("wait-minutes") || process.env.ALTOS_BLOG_WORKER_WAIT_MINUTES || 45);
  await waitForArticleSet(articleSetPath, Math.max(1, waitMinutes) * 60_000);

  const workerArgs = [
    "scripts/blog-local-worker.mjs",
    "--article-set",
    articleSetPath,
    "--slot",
    slot,
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
