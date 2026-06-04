#!/usr/bin/env node

import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

const INTERNAL_COPY_PATTERNS = [
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
  /ALTOS LAB reader note/i,
  /article claims should remain anchored/i,
  /可引用事實/i,
  /來源摘要/i,
  /讀者怎麼看/i,
  /source-attributed official announcement image/i,
  /SEO\s*\/\s*GEO/i,
  /quality gate/i,
  /pipeline/i,
  /AI-generated/i
];

const WEAK_MARKET_TITLE_PATTERNS = [/更新：/i, /市場訊號/i, /可以拿來/i, /工作流/i, /流程/i];

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

function baseUrl() {
  return String(arg("base-url", DEFAULT_BASE_URL)).replace(/\/+$/, "");
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

function shortPublisher(value = "") {
  return String(value || "")
    .replace(/\s+AI$/i, "")
    .replace(/\s+News$/i, "")
    .trim();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "ALTOS-LAB-market-public-qa/1.0" },
    signal: AbortSignal.timeout(15_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return text ? JSON.parse(text) : {};
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "ALTOS-LAB-market-public-qa/1.0" },
    signal: AbortSignal.timeout(15_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 200)}`);
  return text;
}

function publicText(post) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    post.coverCredit,
    post.coverLicense,
    ...(Array.isArray(post.keyTakeaways) ? post.keyTakeaways : []),
    ...(Array.isArray(post.faqs) ? post.faqs.flatMap((faq) => [faq.question, faq.answer]) : [])
  ]
    .filter(Boolean)
    .join("\n");
}

function qaPost(post, mustTerms = []) {
  const issues = [];
  const source = post.sourceLinks?.[0] || {};
  const publisher = shortPublisher(source.publisher);
  const text = publicText(post);
  for (const pattern of INTERNAL_COPY_PATTERNS) {
    if (pattern.test(text)) issues.push({ severity: "critical", id: "internal-copy-leak", pattern: String(pattern) });
  }
  for (const pattern of WEAK_MARKET_TITLE_PATTERNS) {
    if (pattern.test(post.title || "")) issues.push({ severity: "major", id: "weak-market-title", pattern: String(pattern) });
  }
  if (post.contentType !== "breaking") issues.push({ severity: "major", id: "not-breaking", value: post.contentType });
  if (post.coverSource !== "source") issues.push({ severity: "major", id: "cover-not-source", value: post.coverSource });
  if (!post.coverCreditUrl) issues.push({ severity: "major", id: "missing-cover-credit-url" });
  if (!Array.isArray(post.sourceLinks) || post.sourceLinks.length < 1) issues.push({ severity: "major", id: "missing-source-links" });
  if (publisher && !String(post.excerpt || "").includes(publisher)) {
    issues.push({ severity: "major", id: "standfirst-missing-source", publisher, excerpt: post.excerpt || "" });
  }
  if (!/[\d$%]|美元|萬|億|million|billion|juta|triệu|ล้าน|17,000|17000/i.test(post.excerpt || "")) {
    issues.push({ severity: "major", id: "standfirst-missing-number", excerpt: post.excerpt || "" });
  }
  for (const term of mustTerms) {
    if (!text.toLowerCase().includes(term.toLowerCase())) {
      issues.push({ severity: "major", id: "missing-required-term", term });
    }
  }
  return issues;
}

async function main() {
  const slug = arg("slug");
  if (!slug) throw new Error("--slug is required");
  const root = baseUrl();
  const languages = arg("languages", "all") === "all" ? LANGUAGES : arg("languages").split(",").map((item) => item.trim()).filter(Boolean);
  const mustTerms = repeatedArgs("must");
  const results = [];

  for (const language of languages) {
    const apiUrl = `${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}`;
    const json = await fetchJson(apiUrl);
    const post = json.post || json.payload?.post;
    if (!post) {
      results.push({ language, ok: false, issues: [{ severity: "critical", id: "missing-post" }] });
      continue;
    }
    const issues = qaPost(post, mustTerms);
    results.push({
      language,
      ok: issues.length === 0,
      title: post.title,
      excerpt: post.excerpt,
      issues
    });
  }

  const html = await fetchText(`${root}/blog/${encodeURIComponent(slug)}`);
  const htmlText = stripHtml(html);
  const htmlIssues = INTERNAL_COPY_PATTERNS
    .filter((pattern) => pattern.test(htmlText))
    .map((pattern) => ({ severity: "critical", id: "html-internal-copy-leak", pattern: String(pattern) }));

  const failures = [...results.flatMap((result) => result.issues.map((issue) => ({ language: result.language, ...issue }))), ...htmlIssues];
  console.log(JSON.stringify({ ok: failures.length === 0, root, slug, checkedLanguages: languages.length, results, htmlIssues }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
