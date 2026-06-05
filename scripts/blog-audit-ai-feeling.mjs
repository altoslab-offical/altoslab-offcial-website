#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const MARKET_FORBIDDEN_PATTERNS = [
  /消息落在哪個產品環節/i,
  /來源裡的具體細節/i,
  /先看採用而不是聲量/i,
  /下一步先看三個指標/i,
  /事件重點/i,
  /關鍵事實/i,
  /報導主要提到/i,
  /文中提到的主要數字/i,
  /後續觀察/i,
  /這則快訊的重點是什麼/i,
  /這篇文章是否代表市場已經成熟/i,
  /這則消息可以拿來/i,
  /企業檢查/i,
  /卡在哪個流程/i,
  /原因是企業決策問題/i,
  /Source:\s/i,
  /Event:\s/i,
  /Evidence:\s/i,
  /Decision cue/i,
  /Next action/i,
  /source brief/i,
  /source index/i,
  /article claims should remain anchored/i,
  /source-attributed official announcement image/i,
  /SEO\s*\/\s*GEO/i,
  /quality gate/i,
  /quality\s+pipeline|backend\s+pipeline|pipeline\s+gate|publishing\s+pipeline|automation\s+pipeline/i,
  /AI-generated\s+(cover|visual|content|article)/i
];

const COLUMN_FORBIDDEN_PATTERNS = [
  /###/i,
  /SEO\s*\/\s*GEO/i,
  /prompt card/i,
  /quality gate/i,
  /quality\s+pipeline|backend\s+pipeline|pipeline\s+gate|publishing\s+pipeline|automation\s+pipeline/i,
  /AI-generated\s+(cover|visual|content|article)/i,
  /作為一個 AI/i,
  /以下是/i
];

const WEAK_MARKET_TITLE_PATTERNS = [/更新：/i, /市場訊號/i, /可以拿來/i, /工作流/i, /流程/i];
const WEAK_COLUMN_TITLE_PATTERNS = [/基礎設施$/i, /完整指南$/i, /最佳實踐$/i, /深度解析$/i];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function baseUrl() {
  return String(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL)).replace(/\/+$/, "");
}

async function fetchJson(url) {
  const timeoutMs = Number.parseInt(arg("timeout-ms", process.env.BLOG_AI_FEELING_AUDIT_TIMEOUT_MS || "45000"), 10);
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "ALTOS-LAB-ai-feeling-audit/1.0" },
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function publicText(post) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    ...(post.keyTakeaways || []),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ]
    .map(stripHtml)
    .filter(Boolean)
    .join("\n");
}

function patternHits(text, patterns) {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => String(pattern));
}

function auditPost(post) {
  const text = publicText(post);
  const isMarket = post.contentType === "breaking";
  const criticalPatterns = patternHits(text, isMarket ? MARKET_FORBIDDEN_PATTERNS : COLUMN_FORBIDDEN_PATTERNS);
  const weakTitlePatterns = patternHits(post.title || "", isMarket ? WEAK_MARKET_TITLE_PATTERNS : WEAK_COLUMN_TITLE_PATTERNS);
  const issues = [];
  for (const pattern of criticalPatterns) issues.push({ severity: "critical", id: "public-copy-pattern", pattern });
  for (const pattern of weakTitlePatterns) issues.push({ severity: "warning", id: "weak-title-pattern", pattern });
  if (isMarket && (post.sourceLinks || []).length < 1) issues.push({ severity: "critical", id: "market-source-missing" });
  if (isMarket && !post.cover) issues.push({ severity: "critical", id: "market-cover-missing" });
  if (!post.excerpt && !post.seoDescription) issues.push({ severity: "warning", id: "subtitle-missing" });
  return {
    id: post.id,
    slug: post.slug,
    language: post.language,
    contentType: post.contentType,
    title: post.title,
    issues
  };
}

function renderText(report) {
  const lines = [
    "# ALTOS LAB Public Copy AI-Feeling Audit",
    `Checked: ${report.checkedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Posts: ${report.postCount}`,
    `Critical issues: ${report.criticalCount}`,
    `Warnings: ${report.warningCount}`,
    ""
  ];
  if (!report.problemPosts.length) {
    lines.push("No public AI-feeling/template blockers detected.");
    return `${lines.join("\n")}\n`;
  }
  lines.push("Problem posts:");
  for (const post of report.problemPosts.slice(0, 80)) {
    lines.push(`- ${post.language}/${post.slug} (${post.contentType}): ${post.issues.map((issue) => `${issue.severity}:${issue.id}`).join(", ")}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const root = baseUrl();
  const payload = await fetchJson(`${root}/api/blog`);
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const audited = posts.map(auditPost);
  const problemPosts = audited.filter((post) => post.issues.length);
  const criticalCount = problemPosts.reduce((sum, post) => sum + post.issues.filter((issue) => issue.severity === "critical").length, 0);
  const warningCount = problemPosts.reduce((sum, post) => sum + post.issues.filter((issue) => issue.severity === "warning").length, 0);
  const report = {
    checkedAt: new Date().toISOString(),
    baseUrl: root,
    postCount: posts.length,
    criticalCount,
    warningCount,
    problemPosts
  };
  const format = arg("format", hasFlag("json") ? "json" : "text");
  const outDir = arg("out-dir");
  const rendered = format === "json" ? JSON.stringify(report, null, 2) : renderText(report);
  if (outDir) {
    await fs.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, `blog-ai-feeling-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.${format === "json" ? "json" : "txt"}`);
    await fs.writeFile(filePath, rendered, "utf8");
  }
  process.stdout.write(rendered);
  if (criticalCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
