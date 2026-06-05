#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_BREAKING_TARGET = 41;
const DEFAULT_COLUMN_TARGET = 9;
const REQUIRED_COLUMN_CONTENT_IMAGES = 2;

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

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function maybeReadJson(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[-#*_>`~=[\\\]+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function postsFromParsed(payload) {
  if (payload?.post && typeof payload.post === "object") return [payload.post];
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.articles)) return payload.articles.flatMap((article) => article.posts || []);
  return [];
}

async function parsedPosts(filePath) {
  const payload = await maybeReadJson(filePath);
  return postsFromParsed(payload);
}

function candidatePath(date, slot, lane) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}-${lane}.json`);
}

function legacyCandidatePath(date, slot) {
  return path.join(process.cwd(), "data/blog-prepared-candidates", `${date}-${slot}.json`);
}

async function liveCounts(baseUrl) {
  const rows = [];
  for (const language of LANGUAGES) {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog?language=${encodeURIComponent(language)}&limit=200`, {
      cache: "no-store",
      headers: { "User-Agent": "ALTOS-LAB-blog-ops-audit/1.0" }
    });
    const json = await response.json().catch(() => ({}));
    const posts = Array.isArray(json.posts) ? json.posts : [];
    const breaking = posts.filter((post) => post.contentType === "breaking" || post.category === "市場快訊" || (post.tags || []).includes("市場快訊")).length;
    const column = posts.filter((post) => post.contentType === "column" || post.category === "專欄" || (post.tags || []).includes("市場專欄")).length;
    rows.push({ language, total: posts.length, breaking, column });
  }
  return rows;
}

function launchAgentStatus() {
  if (process.platform !== "darwin") return { checked: false, reason: "non-macOS" };
  const uid = typeof process.getuid === "function" ? process.getuid() : "";
  const result = spawnSync("launchctl", ["print", `gui/${uid}/com.altoslab.blog-local-worker`], { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const lastExit = output.match(/last exit code = ([^\n]+)/)?.[1]?.trim() || "";
  const runs = output.match(/\nruns = ([^\n]+)/)?.[1]?.trim() || "";
  return {
    checked: true,
    loaded: result.status === 0,
    state: output.match(/\n\tstate = ([^\n]+)/)?.[1]?.trim() || "",
    runs: runs ? Number(runs) : null,
    lastExitCode: lastExit,
    triggers: [...output.matchAll(/"Hour" => (\d+)[\s\S]*?"Minute" => (\d+)/g)].map((match) => `${String(match[1]).padStart(2, "0")}:${String(match[2]).padStart(2, "0")}`)
  };
}

async function envFileKeys() {
  const filePath = path.join(process.env.HOME || "", ".altoslab-blog-worker.env");
  const text = await fs.readFile(filePath, "utf8").catch(() => "");
  const keys = new Set();
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

async function headlessProviderStatus() {
  const keys = await envFileKeys();
  const hasKey = (key) => Boolean(process.env[key]) || keys.has(key);
  const geminiVersion = spawnSync("gemini", ["--version"], { encoding: "utf8" });
  return {
    geminiCliInstalled: geminiVersion.status === 0,
    geminiAuthConfigured: hasKey("GEMINI_API_KEY") || hasKey("GOOGLE_GENAI_USE_VERTEXAI") || hasKey("GOOGLE_GENAI_USE_GCA"),
    openaiImageConfigured: hasKey("OPENAI_API_KEY"),
    uploadStorageConfigured: hasKey("BLOB_READ_WRITE_TOKEN") || hasKey("GCS_BUCKET") || hasKey("GOOGLE_CLOUD_PROJECT"),
    blogImageProviderConfigured: hasKey("BLOG_IMAGE_PROVIDER")
  };
}

async function candidateSummary(date) {
  const slots = ["morning", "afternoon"];
  const lanes = ["column", "market"];
  const rows = [];
  for (const slot of slots) {
    for (const lane of lanes) {
      const filePath = candidatePath(date, slot, lane);
      const candidate = await maybeReadJson(filePath);
      rows.push({
        slot,
        lane,
        path: path.relative(process.cwd(), filePath),
        exists: Boolean(candidate),
        status: candidate?.status || "",
        manifestPath: candidate?.manifestPath || "",
        translationGroupId: candidate?.translationGroupId || candidate?.ingestRunId || "",
        validateWouldPublish: candidate?.validateOnly?.wouldPublish === true,
        publishIds: candidate?.publish?.publishedIds?.length || 0,
        errors: candidate?.validateOnly?.errors || []
      });
    }
    const legacyPath = legacyCandidatePath(date, slot);
    const legacy = await maybeReadJson(legacyPath);
    if (legacy) {
      rows.push({
        slot,
        lane: "legacy",
        path: path.relative(process.cwd(), legacyPath),
        exists: true,
        status: legacy.status || "",
        manifestPath: legacy.manifestPath || "",
        translationGroupId: legacy.translationGroupId || legacy.ingestRunId || "",
        validateWouldPublish: legacy.validateOnly?.wouldPublish === true,
        publishIds: legacy.publish?.publishedIds?.length || 0,
        errors: legacy.validateOnly?.errors || []
      });
    }
  }
  return rows;
}

async function columnVisualGap(date) {
  let checkedDate = date;
  let columnDir = path.join(process.cwd(), "data/blog-backfill", checkedDate, "column-production");
  if (!(await exists(columnDir))) {
    const backfillRoot = path.join(process.cwd(), "data/blog-backfill");
    const dates = (await fs.readdir(backfillRoot).catch(() => []))
      .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort()
      .reverse();
    let fallback = "";
    for (const candidateDate of dates) {
      const candidateDir = path.join(backfillRoot, candidateDate, "column-production");
      const stat = await fs.stat(candidateDir).catch(() => null);
      if (stat?.isDirectory()) {
        fallback = candidateDate;
        break;
      }
    }
    if (fallback) {
      checkedDate = fallback;
      columnDir = path.join(backfillRoot, checkedDate, "column-production");
    }
  }
  if (!(await exists(columnDir))) return { checked: false, reason: "column-production directory missing" };
  const files = await fs.readdir(columnDir).catch(() => []);
  const sourceSequences = files
    .map((file) => file.match(/^column-seq-(\d+)-source\.parsed\.json$/)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
  const visualDir = path.join(columnDir, "visuals");
  const visualFiles = await fs.readdir(visualDir).catch(() => []);
  const scaffold = await maybeReadJson(path.join(columnDir, "column-visuals.scaffold.json"));
  const scaffoldBySequence = new Map(
    (Array.isArray(scaffold?.articles) ? scaffold.articles : [])
      .map((article) => [Number(article.sequence), article])
      .filter(([sequence]) => Number.isInteger(sequence))
  );
  const rows = [];
  for (const sequence of sourceSequences) {
    const sourcePath = path.join(columnDir, `column-seq-${sequence}-source.parsed.json`);
    const sourcePosts = await parsedPosts(sourcePath);
    const sourcePost = sourcePosts.find((post) => post.language === "zh-Hant") || sourcePosts[0] || null;
    const sourceBodyLength = stripMarkdown(sourcePost?.bodyMarkdown || sourcePost?.body).length;
    const sourceReady = Boolean(sourcePost?.language === "zh-Hant" && sourcePost?.title && sourceBodyLength >= 1200);
    const localizedFiles = files.filter((file) => file.startsWith(`column-seq-${sequence}-localized-`) && file.endsWith(".json"));
    const languages = new Set(sourcePosts.map((post) => post.language).filter(Boolean));
    for (const file of localizedFiles) {
      const posts = await parsedPosts(path.join(columnDir, file));
      for (const post of posts) {
        if (post.language) languages.add(post.language);
      }
    }
    const missingLanguages = LANGUAGES.filter((language) => !languages.has(language));
    const visualMatches = visualFiles.filter((file) => file.startsWith(`seq${sequence}-`) && /\.(png|jpe?g|webp)$/i.test(file));
    const hasCover = visualMatches.some((file) => /cover/i.test(file));
    const contentImageCount = visualMatches.filter((file) => !/cover/i.test(file)).length;
    const scaffoldItem = scaffoldBySequence.get(sequence) || {};
    const expectedContentImages = REQUIRED_COLUMN_CONTENT_IMAGES;
    const missingVisuals = [
      ...(hasCover ? [] : ["cover"]),
      ...Array.from({ length: Math.max(0, expectedContentImages - contentImageCount) }, (_, index) => `contentImage${contentImageCount + index + 1}`)
    ];
    const publishableVisuals = hasCover && contentImageCount >= REQUIRED_COLUMN_CONTENT_IMAGES && contentImageCount <= 3;
    const mergeReady = sourceReady && missingLanguages.length === 0 && publishableVisuals;
    rows.push({
      sequence,
      title: sourcePost?.title || "",
      sourceReady,
      sourceBodyLength,
      localizationFiles: localizedFiles.length,
      languages: LANGUAGES.filter((language) => languages.has(language)),
      missingLanguages,
      hasCover,
      contentImageCount,
      expectedContentImages,
      publishableVisuals,
      mergeReady,
      existingVisualFiles: visualMatches.map((file) => path.relative(process.cwd(), path.join(visualDir, file))).sort(),
      missingVisuals,
      blocker: mergeReady
        ? ""
        : [
            sourceReady ? "" : "source article is missing or too short",
            missingLanguages.length ? `missing languages: ${missingLanguages.join(", ")}` : "",
            publishableVisuals ? "" : `missing GPT visuals: ${missingVisuals.join(", ")}`
          ]
            .filter(Boolean)
            .join("; ")
    });
  }
  return { checked: true, date: checkedDate, rows };
}

function targetGaps(counts, breakingTarget, columnTarget) {
  return counts.map((row) => ({
    language: row.language,
    breakingGap: Math.max(0, breakingTarget - row.breaking),
    columnGap: Math.max(0, columnTarget - row.column)
  }));
}

function summarizeIssues({ counts, gaps, candidates, launchAgent, visualGap, targets }) {
  const issues = [];
  const minBreaking = Math.min(...counts.map((row) => row.breaking));
  const minColumn = Math.min(...counts.map((row) => row.column));
  const columnTarget = targets?.column || DEFAULT_COLUMN_TARGET;
  if (gaps.some((gap) => gap.breakingGap > 0)) issues.push(`market news below target: min breaking=${minBreaking}`);
  if (gaps.some((gap) => gap.columnGap > 0)) issues.push(`columns below target: min column=${minColumn}`);
  const legacyMarket = candidates.find((candidate) => candidate.lane === "legacy" && /market/i.test(candidate.translationGroupId || ""));
  if (legacyMarket) issues.push(`legacy candidate index still contains market release: ${legacyMarket.path}`);
  if (launchAgent.checked && !launchAgent.loaded) issues.push("LaunchAgent is not loaded");
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  if (minColumn < columnTarget && blockedVisuals.length) {
    issues.push(`column candidates blocked by visuals: ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`);
  }
  return issues;
}

function summarizeBottlenecks({ counts, gaps, candidates, launchAgent, visualGap, targets, headlessProviders }) {
  const minBreaking = Math.min(...counts.map((row) => row.breaking));
  const minColumn = Math.min(...counts.map((row) => row.column));
  const breakingTarget = targets?.breaking || DEFAULT_BREAKING_TARGET;
  const columnTarget = targets?.column || DEFAULT_COLUMN_TARGET;
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  const readyMarketCandidates = candidates.filter((candidate) => candidate.exists && candidate.lane === "market" && candidate.status === "ready");
  const readyColumnCandidates = candidates.filter((candidate) => candidate.exists && candidate.lane === "column" && candidate.status === "ready");
  return [
    {
      lane: "market",
      status: minBreaking >= breakingTarget && !readyMarketCandidates.length ? "stable" : "attention",
      summary:
        minBreaking >= breakingTarget
          ? `market news target met at ${minBreaking}/language; no Chrome needed for scanner/worker validation`
          : `market news below target at ${minBreaking}/language`
    },
    {
      lane: "column",
      status: minColumn >= columnTarget ? "stable" : "blocked",
      summary:
        minColumn >= columnTarget
          ? blockedVisuals.length > 0
            ? `column target met at ${minColumn}/language; next queued candidates need visuals: ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`
            : `column target met at ${minColumn}/language`
          : blockedVisuals.length > 0
          ? `columns stuck at ${minColumn}/language because GPT visual evidence is missing for ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")}`
          : readyColumnCandidates.length > 0
            ? `columns below target at ${minColumn}/language with ready candidates waiting for release`
            : `columns below target at ${minColumn}/language`
    },
    {
      lane: "automation",
      status: launchAgent.checked && launchAgent.loaded && String(launchAgent.lastExitCode || "0") === "0" ? "stable" : "attention",
      summary: launchAgent.checked
        ? `LaunchAgent ${launchAgent.loaded ? "loaded" : "not loaded"}; lastExit=${launchAgent.lastExitCode || "n/a"}; state=${launchAgent.state || "n/a"}`
        : `LaunchAgent not checked: ${launchAgent.reason || "n/a"}`
    },
    {
      lane: "headless-ai",
      status:
        headlessProviders?.geminiCliInstalled &&
        headlessProviders?.geminiAuthConfigured &&
        headlessProviders?.openaiImageConfigured &&
        headlessProviders?.uploadStorageConfigured
          ? "stable"
          : "attention",
      summary: `geminiCli=${headlessProviders?.geminiCliInstalled ? "installed" : "missing"}; geminiAuth=${headlessProviders?.geminiAuthConfigured ? "configured" : "missing"}; openaiImage=${headlessProviders?.openaiImageConfigured ? "configured" : "missing"}; uploadStorage=${headlessProviders?.uploadStorageConfigured ? "configured" : "missing"}`
    }
  ];
}

function nextActions({ gaps, visualGap, candidates, headlessProviders }) {
  const actions = [];
  const marketGap = Math.max(...gaps.map((gap) => gap.breakingGap));
  const columnGap = Math.max(...gaps.map((gap) => gap.columnGap));
  const blockedVisuals = visualGap.checked ? visualGap.rows.filter((row) => row.sourceReady && !row.publishableVisuals) : [];
  const readyMarketCandidates = candidates.filter((candidate) => candidate.exists && candidate.lane === "market" && candidate.status === "ready");
  if (marketGap > 0) {
    actions.push("Run no-Chrome market scan with mainstream-ai-us source profile until breaking count reaches target; publish only source-image candidates that pass validate-only.");
  } else if (readyMarketCandidates.length) {
    actions.push("Release or clear ready market candidates; do not leave /tmp-backed validate-only candidates in the production queue.");
  } else {
    actions.push("Keep market lane on scheduled no-Chrome scans; use --validate-only --no-index for tests so production candidates stay clean.");
  }
  if (columnGap > 0 && blockedVisuals.length) {
    actions.push(`Produce GPT cover plus 2-3 content images for ${blockedVisuals.map((row) => `seq${row.sequence}`).join(", ")} before column release.`);
    if (!headlessProviders?.openaiImageConfigured || !headlessProviders?.uploadStorageConfigured) {
      actions.push("To remove the Chrome bottleneck, configure a headless image provider plus upload storage; otherwise column visuals still require a controlled GPT browser session.");
    }
  } else if (columnGap > 0) {
    actions.push("Prepare/release enough Gemini-approved column sets to close the column target gap.");
  } else {
    const queued = blockedVisuals.map((row) => `seq${row.sequence}`).join(", ");
    actions.push(
      queued
        ? `Keep daily column cadence at one approved column set; next queued columns (${queued}) must wait for GPT visual evidence before release.`
        : "Keep daily column cadence at one approved column set; never release column candidates without visual evidence."
    );
  }
  return actions;
}

function textReport(report) {
  const lines = [];
  lines.push(`# ALTOS LAB Blog Operations Audit`);
  lines.push(`Checked: ${report.checkedAt}`);
  lines.push("");
  lines.push(`Targets: breaking ${report.targets.breaking} / language, column ${report.targets.column} / language`);
  lines.push("");
  lines.push("Live counts:");
  for (const row of report.counts) {
    lines.push(`- ${row.language}: total ${row.total}, breaking ${row.breaking}, column ${row.column}`);
  }
  lines.push("");
  lines.push("Candidate indexes:");
  for (const row of report.candidates.filter((candidate) => candidate.exists)) {
    lines.push(`- ${row.path}: ${row.status || "unknown"} (${row.lane}, ${row.translationGroupId || "no group"})`);
  }
  lines.push("");
  lines.push(`LaunchAgent: ${report.launchAgent.loaded ? "loaded" : "not loaded"}; state=${report.launchAgent.state || "n/a"}; lastExit=${report.launchAgent.lastExitCode || "n/a"}; runs=${report.launchAgent.runs ?? "n/a"}`);
  lines.push("");
  lines.push("Bottleneck summary:");
  for (const bottleneck of report.bottlenecks) {
    lines.push(`- ${bottleneck.lane}: ${bottleneck.status} - ${bottleneck.summary}`);
  }
  if (report.visualGap.checked) {
    lines.push("");
    lines.push(`Column visual gap (${report.visualGap.date || report.date}):`);
    for (const row of report.visualGap.rows.filter((item) => item.sourceReady && !item.publishableVisuals)) {
      lines.push(`- seq${row.sequence}: cover=${row.hasCover}, contentImages=${row.contentImageCount}, blocker=${row.blocker}`);
    }
  }
  lines.push("");
  lines.push(report.issues.length ? "Issues:" : "Issues: none");
  for (const issue of report.issues) lines.push(`- ${issue}`);
  lines.push("");
  lines.push("Next actions:");
  for (const action of report.nextActions) lines.push(`- ${action}`);
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-operations-audit.mjs [--base-url https://altoslab-ai.cc] [--date yyyy-mm-dd] [--format json|text]");
    return;
  }
  const date = arg("date", taiwanDate());
  const baseUrl = arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL);
  const breakingTarget = Number(arg("breaking-target", String(DEFAULT_BREAKING_TARGET))) || DEFAULT_BREAKING_TARGET;
  const columnTarget = Number(arg("column-target", String(DEFAULT_COLUMN_TARGET))) || DEFAULT_COLUMN_TARGET;
  const counts = await liveCounts(baseUrl);
  const gaps = targetGaps(counts, breakingTarget, columnTarget);
  const candidates = await candidateSummary(date);
  const launchAgent = launchAgentStatus();
  const headlessProviders = await headlessProviderStatus();
  const visualGap = await columnVisualGap(date);
  const report = {
    ok: gaps.every((gap) => gap.breakingGap === 0 && gap.columnGap === 0),
    checkedAt: new Date().toISOString(),
    date,
    baseUrl,
    targets: { breaking: breakingTarget, column: columnTarget },
    counts,
    gaps,
    candidates,
    launchAgent,
    headlessProviders,
    visualGap,
    issues: [],
    bottlenecks: [],
    nextActions: []
  };
  report.issues = summarizeIssues(report);
  report.bottlenecks = summarizeBottlenecks(report);
  report.nextActions = nextActions(report);
  if (arg("format", "json") === "text") {
    process.stdout.write(textReport(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
