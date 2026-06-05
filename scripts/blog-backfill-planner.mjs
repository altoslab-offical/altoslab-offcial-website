#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { subagentModelPolicyText } from "./blog-subagent-model-policy.mjs";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const LANGUAGE_LABEL = LANGUAGES.join(", ");
const POSTS_PER_SET = LANGUAGES.length;
const DEFAULT_TARGET_POSTS = 40;
const DEFAULT_LANES = ["market", "column"];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog backfill planner

Creates a fail-closed backfill queue when the public blog has fewer posts than
the per-language target. It never publishes and never fabricates production content.

Examples:
  node scripts/blog-backfill-planner.mjs --target-posts 40 --write
  node scripts/blog-backfill-planner.mjs --base-url https://altoslab-ai.cc --date <date> --force --write
`);
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

function slotForSequence(sequence) {
  return sequence % 2 === 1 ? "morning" : "afternoon";
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function runRoot() {
  return path.resolve(process.env.ALTOS_BLOG_WORKER_RUN_DIR || path.join(process.cwd(), "data/blog-worker-runs"));
}

function backfillRoot(date) {
  return path.resolve(arg("backfill-dir") || path.join(process.cwd(), "data/blog-backfill", date));
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

function runCommand(command, args, { cwd }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
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

async function fetchPublicInventory(baseUrl) {
  const url = `${normalizeBaseUrl(baseUrl)}/api/blog`;
  const response = await fetch(url, { headers: { "User-Agent": "ALTOS-LAB-blog-backfill-planner/1.0" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`public blog inventory fetch failed: ${response.status} ${text.slice(0, 160)}`);
  }
  const parsed = JSON.parse(text);
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  const groups = new Map();
  for (const post of posts) {
    const groupId = post.translationGroupId || post.slug;
    const group = groups.get(groupId) || {
      translationGroupId: groupId,
      count: 0,
      languages: new Set(),
      contentTypes: new Set(),
      coverSources: new Set(),
      title: post.title || ""
    };
    group.count += 1;
    if (post.language) group.languages.add(post.language);
    if (post.contentType) group.contentTypes.add(post.contentType);
    if (post.coverSource) group.coverSources.add(post.coverSource);
    groups.set(groupId, group);
  }

  return {
    url,
    publishedPosts: posts.length,
    completeLanguageGroups: [...groups.values()].filter((group) => LANGUAGES.every((language) => group.languages.has(language))).length,
    languageCoverage: LANGUAGES.map((language) => ({
      language,
      count: posts.filter((post) => post.language === language).length
    })),
    groups: [...groups.values()].map((group) => ({
      translationGroupId: group.translationGroupId,
      count: group.count,
      languages: [...group.languages].sort(),
      contentTypes: [...group.contentTypes].sort(),
      coverSources: [...group.coverSources].sort(),
      title: group.title
    }))
  };
}

function lanesFromArgs() {
  const raw = arg("lanes", DEFAULT_LANES.join(","));
  const lanes = raw
    .split(",")
    .map((lane) => lane.trim())
    .filter(Boolean);
  for (const lane of lanes) {
    if (!["market", "column"].includes(lane)) throw new Error("--lanes can only include market,column");
  }
  return lanes.length ? lanes : DEFAULT_LANES;
}

function queueStatusForLane(lane) {
  return lane === "market" ? "awaiting_source_translation_production" : "awaiting_browser_production";
}

function languageBackfillSummary(languageCoverage, targetPosts) {
  return languageCoverage.map((item) => `${item.language}: ${item.count}/${targetPosts}`).join(", ");
}

function promptCard({ date, lane, slot, sequence, targetPosts, inventory, articleSetPath, manifestPath, orchestratorPrompt }) {
  const publicCount = inventory.publishedPosts;
  const targetLine = `Current public posts: ${publicCount}. Per-language target: ${targetPosts}. Current language coverage: ${languageBackfillSummary(inventory.languageCoverage, targetPosts)}. This is backfill set ${sequence}.`;
  const isMarket = lane === "market";
  const laneLine =
    isMarket
      ? "Market news lane: source-translation from verified source articles; cover must be a credited source article or official announcement image shared across every language. No Gemini requirement, no GPT art and no stock/free/fallback image."
      : "Column lane: Gemini writes/revises one zh-Hant source-of-truth article first. Main-brain QA must pass before subagent workers localize en, ja, ko, id, vi, th, ms and fil. ChatGPT/GPT creates one shared cover plus 2-3 shared in-article images for every language.";
  const evidenceLine = isMarket
    ? "- Do not write a ready manifest until source-translation fidelity, source-image QA, local preflight, validate-only and design QA pass."
    : "- Do not write a ready manifest until Gemini/GPT browser evidence, local preflight, validate-only, image/source QA and design QA pass.";
  const releaseCommand = isMarket
    ? `
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
`
    : `
Do not publish from this backfill prompt card. Column posts wait for the scheduled release gate after the manifest becomes status="ready".
`;
  const detailedPromptLabel = isMarket ? "Detailed source-translation/source-image prompt" : "Detailed Gemini/GPT browser prompt";

  return `# ALTOS LAB Blog Backfill Prompt Card

${targetLine}
Lane: ${lane}
Slot context: ${slot}
Article set output: ${articleSetPath}
Prepared manifest: ${manifestPath}

Use only the ALTOS Blog QA Chrome tab group.
${laneLine}
Required languages: ${LANGUAGE_LABEL}.
${isMarket ? "" : `\nSubagent model fallback policy:\n${subagentModelPolicyText()}\n`}

Hard release rule:
- Do not publish from this prompt card.
${evidenceLine}
- Do not use old 4-language article sets to satisfy this queue.
- Do not expose SEO, GEO, AI-generation, prompt, model or quality-gate language in public copy.
- Every language version must share the same translationGroupId, sourceLinks, cover URL, cover credit and visual metadata.
- Southeast Asia editions must be naturally localized for Indonesia, Vietnam, Thailand, Malaysia and the Philippines.

After the ${lane === "market" ? "source-translation and source-image output" : "browser production output"} is saved, run:

\`\`\`bash
node scripts/blog-local-worker.mjs \\
  --article-set "${articleSetPath}" \\
  --slot ${slot} \\
  --validate-only \\
  --manifest "${manifestPath}" \\
  --approve-design-qa
\`\`\`
${releaseCommand}
${detailedPromptLabel}:

\`\`\`text
${orchestratorPrompt}
\`\`\`
`;
}

async function createQueueItem({ date, lane, sequence, targetPosts, inventory }) {
  const slot = slotForSequence(sequence);
  const stamp = taiwanStamp();
  const runDir = path.join(runRoot(), `${date}-backfill-${String(sequence).padStart(2, "0")}-${lane}-${stamp}`);
  const articleSetPath = path.join(runDir, "article-set.json");
  const manifestPath = path.join(runDir, "prepared-candidate.json");
  const orchestratorPromptPath = path.join(runDir, "browser-production-prompt.md");
  const backfillQueueDir = path.join(backfillRoot(date), "queue");
  const queuePath = path.join(backfillQueueDir, `${String(sequence).padStart(2, "0")}-${lane}.json`);
  const promptPath = path.join(backfillQueueDir, `${String(sequence).padStart(2, "0")}-${lane}-prompt-card.md`);

  await fs.mkdir(runDir, { recursive: true });
  const orchestrator = await runCommand(process.execPath, [
    "scripts/blog-antigravity-orchestrator.mjs",
    "--dry-run",
    "--lane",
    lane,
    "--slot",
    slot,
    "--date",
    date,
    "--run-dir",
    runDir
  ], { cwd: process.cwd() });
  if (orchestrator.code !== 0) {
    throw new Error(`orchestrator dry-run failed for ${lane}: ${orchestrator.stderr || orchestrator.stdout}`);
  }

  const orchestratorPrompt = await fs.readFile(orchestratorPromptPath, "utf8").catch(() => "");
  const prompt = promptCard({
    date,
    lane,
    slot,
    sequence,
    targetPosts,
    inventory,
    articleSetPath,
    manifestPath,
    orchestratorPrompt
  });
  await fs.mkdir(backfillQueueDir, { recursive: true });
  await fs.writeFile(promptPath, prompt, "utf8");

  const manifest = {
    status: queueStatusForLane(lane),
    lane,
    slot,
    backfillSequence: sequence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runDir,
    promptPath,
    articleSetPath,
    manifestPath,
    expectedPosts: POSTS_PER_SET,
    requiredLanguages: LANGUAGES,
    chromeEvidence: {
      gemini: { usedExistingTab: false, changedModel: false, required: lane !== "market" },
      chatgpt: { usedExistingTab: false, changedModel: false, required: lane !== "market" }
    },
    validateOnly: {
      wouldPublish: false,
      errors: [
        lane === "market"
          ? "Backfill market set has not passed source-translation/source-image production and validate-only yet."
          : "Backfill column set has not passed Gemini/GPT browser production and validate-only yet."
      ]
    },
    humanDesignQa: { approved: false }
  };
  await writeJson(manifestPath, manifest);

  const queueItem = {
    status: queueStatusForLane(lane),
    lane,
    slot,
    sequence,
    expectedPosts: POSTS_PER_SET,
    requiredLanguages: LANGUAGES,
    runDir,
    promptPath,
    articleSetPath,
    manifestPath,
    releasePolicy:
      lane === "market"
        ? "publish immediately only after source-translation fidelity, source-image QA, validate-only and verification pass"
        : "hold for the matching release gate only after Gemini copy, GPT cover/contentImages, validate-only and verification pass",
    blockers: [
      lane === "market" ? "waiting for source-translation production" : "waiting for Gemini browser production",
      lane === "market" ? "waiting for credited source article/official image" : "waiting for ChatGPT/GPT cover and 2-3 content images",
      "waiting for validate-only quality/image/design QA"
    ]
  };
  await writeJson(queuePath, queueItem);
  return queueItem;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const date = arg("date") || taiwanDate();
  const targetPosts = Number(arg("target-posts", String(process.env.ALTOS_BLOG_BACKFILL_TARGET_POSTS || DEFAULT_TARGET_POSTS)));
  if (!Number.isFinite(targetPosts) || targetPosts < 1) throw new Error("--target-posts must be a positive number");
  const baseUrl = normalizeBaseUrl(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL));
  const planPath = path.join(backfillRoot(date), "plan.json");
  const write = hasFlag("write");
  const force = hasFlag("force");

  const inventory = await fetchPublicInventory(baseUrl);
  const missingByLanguage = inventory.languageCoverage.map((item) => ({
    language: item.language,
    currentPosts: item.count,
    missingPosts: Math.max(0, targetPosts - item.count)
  }));
  const setsNeeded = Math.max(0, ...missingByLanguage.map((item) => item.missingPosts));
  const missingPosts = missingByLanguage.reduce((sum, item) => sum + item.missingPosts, 0);
  const maxSets = Number(arg("max-sets", String(setsNeeded || 0)));
  const plannedSets = Math.max(0, Math.min(setsNeeded, Number.isFinite(maxSets) ? maxSets : setsNeeded));
  const lanes = lanesFromArgs();

  if (!force && (await exists(planPath))) {
    const existing = await readJson(planPath);
    const reusable =
      existing.targetPostsPerLanguage === targetPosts &&
      existing.publishedPosts === inventory.publishedPosts &&
      existing.plannedSets >= plannedSets &&
      Array.isArray(existing.queue);
    if (reusable) {
      console.log(JSON.stringify({ ok: true, reused: true, planPath, plan: existing }, null, 2));
      return;
    }
  }

  const queue = [];
  if (write) {
    await fs.rm(path.join(backfillRoot(date), "queue"), { recursive: true, force: true });
    for (let index = 0; index < plannedSets; index += 1) {
      const lane = lanes[index % lanes.length];
      queue.push(await createQueueItem({
        date,
        lane,
        sequence: index + 1,
        targetPosts,
        inventory
      }));
    }
  } else {
    for (let index = 0; index < plannedSets; index += 1) {
      const lane = lanes[index % lanes.length];
      queue.push({
        status: queueStatusForLane(lane),
        lane,
        slot: slotForSequence(index + 1),
        sequence: index + 1,
        expectedPosts: POSTS_PER_SET,
        requiredLanguages: LANGUAGES
      });
    }
  }

  const plan = {
    ok: true,
    status: missingPosts > 0 ? "needs_backfill" : "target_met",
    createdAt: new Date().toISOString(),
    date,
    baseUrl,
    targetPostsPerLanguage: targetPosts,
    publishedPosts: inventory.publishedPosts,
    currentMinPostsPerLanguage: Math.min(...inventory.languageCoverage.map((item) => item.count)),
    currentMaxPostsPerLanguage: Math.max(...inventory.languageCoverage.map((item) => item.count)),
    missingPosts,
    missingByLanguage,
    postsPerSet: POSTS_PER_SET,
    setsNeeded,
    plannedSets,
    plannedPublishedPosts: inventory.publishedPosts + plannedSets * POSTS_PER_SET,
    plannedPostsPerLanguage: inventory.languageCoverage.map((item) => ({
      language: item.language,
      currentPosts: item.count,
      plannedPosts: item.count + plannedSets,
      targetPosts
    })),
    requiredLanguages: LANGUAGES,
    alternatingLanes: lanes,
    inventory,
    queue,
    failClosedRules: [
      "Columns/features must use Gemini to produce or revise one approved zh-Hant source-of-truth article before localization.",
      "Market news must use source-translation from verified source articles and does not require Gemini by default.",
      "Original columns need ChatGPT/GPT cover plus 2-3 shared in-article images.",
      "Market news must use the credited source article or official announcement image.",
      "Old 4-language sets and candidates missing browser evidence cannot satisfy backfill.",
      "Publish only after validate-only, image QA, design QA and live verification pass."
    ]
  };

  if (write) {
    await writeJson(planPath, plan);
  }
  console.log(JSON.stringify({ ok: true, planPath: write ? planPath : undefined, plan }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
