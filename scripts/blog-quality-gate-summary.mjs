#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const QUALITY_TMP_DIR = "/tmp/altoslab-blog-quality-gate";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_MARKET_SLUGS = [
  "amazon-will-show-ai-product-images-when-you-search-for-some-reason-techc",
  "lovable-signs-multiyear-deal-with-google-cloud-to-up-usage-5x-source-say",
  "these-two-founders-left-goldman-and-meta-to-build-voice-ai-for-markets-e"
];

const BAD_TEMPLATE_PATTERN =
  /消息落在哪個|來源裡的具體細節|先看採用而不是聲量|下一步先看三個指標|這則消息可以拿來企業檢查|Decision cue|source-translation|quality gate|AI-generation|卡在哪個流程|原因是企業決策問題/i;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function repeatedArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === `--${name}` && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function runJson(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 1024 * 1024 * 16) stdout = stdout.slice(-1024 * 1024 * 16);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 1024 * 1024) stderr = stderr.slice(-1024 * 1024);
    });
    child.on("close", (code) => {
      const text = `${stdout || ""}${stderr || ""}`.trim();
      if (code !== 0) {
        resolve({ ok: false, exitCode: code, error: text.slice(-1600) });
        return;
      }
      try {
        resolve({ ok: true, payload: JSON.parse(text) });
      } catch (error) {
        resolve({ ok: false, exitCode: code, error: `JSON parse failed: ${error.message}; tail=${text.slice(-800)}` });
      }
    });
    child.on("error", (error) => {
      resolve({ ok: false, exitCode: 1, error: error.message });
    });
  });
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function liveTemplateScan(baseUrl) {
  const rows = [];
  for (const language of LANGUAGES) {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog?language=${encodeURIComponent(language)}&limit=200`, {
      cache: "no-store",
      headers: { "User-Agent": "ALTOS-LAB-blog-quality-gate/1.0" },
      signal: AbortSignal.timeout(15_000)
    });
    const json = await response.json().catch(() => ({}));
    const posts = Array.isArray(json.posts) ? json.posts : [];
    const badSlugs = posts
      .filter((post) =>
        BAD_TEMPLATE_PATTERN.test(
          [post.title, post.seoTitle, post.seoDescription, post.excerpt, post.geoSummary, post.body, post.bodyMarkdown]
            .filter(Boolean)
            .join("\n")
            .slice(0, 6000)
        )
      )
      .map((post) => post.slug)
      .filter(Boolean);
    rows.push({ language, total: posts.length, badTemplate: badSlugs.length, badSlugs });
  }
  return rows;
}

function summarizeMarketQa(result) {
  if (!result.ok) return { ok: false, checkedLanguages: 0, issues: [{ id: "command-failed", detail: result.error }] };
  const payload = result.payload || {};
  const issues = [
    ...(Array.isArray(payload.results)
      ? payload.results.flatMap((row) => (row.issues || []).map((issue) => ({ language: row.language, ...issue })))
      : []),
    ...(payload.htmlIssues || [])
  ];
  return { ok: payload.ok === true && issues.length === 0, checkedLanguages: payload.checkedLanguages || 0, issues };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-quality-gate-summary.mjs [--base-url url] [--date yyyy-mm-dd] [--slug market-slug] [--allow-repair-queue]");
    return;
  }

  const baseUrl = normalizeBaseUrl(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL));
  const date = arg("date", "");
  const marketSlugs = repeatedArgs("slug");
  const slugs = marketSlugs.length ? marketSlugs : DEFAULT_MARKET_SLUGS;

  const opsArgs = ["scripts/blog-operations-audit.mjs", "--base-url", baseUrl, "--format", "json"];
  if (date) opsArgs.push("--date", date);
  const [ops, aiFeeling, templateRows, marketQa] = await Promise.all([
    runJson("node", opsArgs),
    runJson("node", ["scripts/blog-ai-feeling-audit.mjs", "--base-url", baseUrl, "--format", "json", "--limit", "8", "--out-dir", QUALITY_TMP_DIR]),
    liveTemplateScan(baseUrl),
    Promise.all(
      slugs.map(async (slug) => ({
        slug,
        ...summarizeMarketQa(
          await runJson("node", ["scripts/blog-market-news-public-qa.mjs", "--base-url", baseUrl, "--slug", slug, "--languages", "all"])
        )
      }))
    )
  ]);

  const countsOk = ops.ok && ops.payload?.ok === true && Array.isArray(ops.payload?.issues) && ops.payload.issues.length === 0;
  const templateOk = templateRows.every((row) => row.badTemplate === 0);
  const marketOk = marketQa.every((row) => row.ok);
  const repairItems = aiFeeling.ok ? Number(aiFeeling.payload?.repairItems || 0) : 999;
  const aiFeelingOk = aiFeeling.ok && (repairItems === 0 || hasFlag("allow-repair-queue"));
  const ok = countsOk && templateOk && marketOk && aiFeelingOk;

  const lines = [];
  lines.push("# ALTOS LAB Blog Quality Gate Summary");
  lines.push(`Checked: ${new Date().toISOString()}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push("");
  lines.push(`Status: ${ok ? "PASS" : "ATTENTION"}`);
  lines.push("");
  if (ops.ok) {
    lines.push("Live counts:");
    for (const row of ops.payload.counts || []) {
      lines.push(`- ${row.language}: total ${row.total}, breaking ${row.breaking}, column ${row.column}`);
    }
    lines.push(`- LaunchAgent: ${ops.payload.launchAgent?.loaded ? "loaded" : "not loaded"}; state=${ops.payload.launchAgent?.state || "n/a"}; lastExit=${ops.payload.launchAgent?.lastExitCode || "n/a"}`);
    lines.push(`- Headless AI: geminiAuth=${ops.payload.headlessProviders?.geminiAuthConfigured ? "configured" : "missing"}, openaiImage=${ops.payload.headlessProviders?.openaiImageConfigured ? "configured" : "missing"}, uploadStorage=${ops.payload.headlessProviders?.uploadStorageConfigured ? "configured" : "missing"}`);
  } else {
    lines.push(`Operations audit failed: ${ops.error}`);
  }
  lines.push("");
  lines.push("Market QA:");
  for (const row of marketQa) {
    lines.push(`- ${row.slug}: ${row.ok ? "pass" : "fail"} (${row.checkedLanguages}/9 languages)`);
    for (const issue of row.issues.slice(0, 4)) lines.push(`  - ${issue.language || "html"} ${issue.id || "issue"}`);
  }
  lines.push("");
  lines.push("Template slop scan:");
  for (const row of templateRows) {
    lines.push(`- ${row.language}: badTemplate=${row.badTemplate}`);
  }
  lines.push("");
  if (aiFeeling.ok) {
    lines.push(`AI-feeling audit: repairItems=${repairItems}; postsReviewed=${aiFeeling.payload.postsReviewed}`);
    for (const item of aiFeeling.payload.worst || []) lines.push(`- ${item}`);
  } else {
    lines.push(`AI-feeling audit failed: ${aiFeeling.error}`);
  }
  lines.push("");
  lines.push("Interpretation:");
  if (!countsOk) lines.push("- Counts, automation, or operations audit is not clean.");
  if (!templateOk) lines.push("- Public copy still has old market-news template language.");
  if (!marketOk) lines.push("- One or more sampled market-news posts failed public QA.");
  if (!aiFeelingOk) lines.push("- Column/article repair queue is not empty; do not call the full blog corpus clean until it is repaired through the correct lane.");
  if (ok) lines.push("- Counts, sampled market QA, template scan, and allowed repair policy are clean.");

  console.log(lines.join("\n"));
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
