#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const MARKET_FORBIDDEN_PATTERNS = [
  /\bTL\s*;?\s*DR\b/i,
  /文中牽涉/i,
  /報導「」/i,
  /OpenAI News's current AI coverage/i,
  /current AI coverage page for related reporting/i,
  /重點哪家公司發布新功能/i,
  /Frame \(4\)/i,
  /Oracle partnership 1x1 art card/i,
  /PRC-linked influence/i,
  /Confidential submission of draft S-1/i,
  /Built for broad benefit/i,
  /Economic research forum/i,
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
const MARKET_GENERIC_ADVICE_PATTERNS = [
  /這則新聞的重點不是抽象評論/i,
  /不是同類工具會不會更多，而是/i,
  /接下來要看(?:的是)?/i,
  /後續要看/i,
  /兩週內先跑/i,
  /選一個高頻但風險可控/i,
  /採購、產品、工程與營運/i,
  /進入下一輪預算與部署討論/i,
  /choose one workflow/i,
  /one owner/i,
  /stop condition/i
];

const COLUMN_FORBIDDEN_PATTERNS = [
  /\bTL\s*;?\s*DR\b/i,
  /###/i,
  /SEO\s*\/\s*GEO/i,
  /source-backed AI operations column/i,
  /for readers comparing implementation, governance, SEO and GEO decisions/i,
  /OpenAI,\s*Microsoft,\s*Google\/NIST\/IBM sources are used to turn the topic/i,
  /週三下午，團隊準備讓 AI 接手一段真實工作/i,
  /週三下午，行銷主管、營運負責人和工程窗口坐在同一張會議桌前/i,
  /要不要再買一套\s+.{8,90}\s+相關工具/i,
  /真正值得投資的是一條能回到來源、權限、成本和責任的證據鏈/i,
  /這篇不是在替新工具背書，而是把\s+.{8,110}\s+拆成可被團隊檢查的營運問題/i,
  /\bHermes\b|\bOpenClaw\b/i,
  /prompt card/i,
  /quality gate/i,
  /quality\s+pipeline|backend\s+pipeline|pipeline\s+gate|publishing\s+pipeline|automation\s+pipeline/i,
  /AI-generated\s+(cover|visual|content|article)/i,
  /作為一個 AI/i,
  /以下是/i
];

const WEAK_MARKET_TITLE_PATTERNS = [/更新：/i, /市場訊號/i, /可以拿來/i, /工作流/i, /流程/i];
const WEAK_COLUMN_TITLE_PATTERNS = [
  /基礎設施$/i,
  /完整指南$/i,
  /最佳實踐$/i,
  /深度解析$/i,
  /^AI\s*(流程|工具|搜尋|Agent).{0,8}(前|時代|要)/i,
  /^想被 AI 搜尋引用/i,
  /^先別讓 Agent/i,
  /先把.{0,10}寫(出來|進規格|清楚)/i
];
const RECYCLED_COLUMN_TAKEAWAYS = [
  /^先看普通工作日，不要只看 demo。?$/i,
  /^來源、權限、成本、責任要串成證據鏈。?$/i,
  /^發布後要用 GA4、Search Console 與讀者行為回頭修正。?$/i
];
const RECYCLED_COLUMN_FAQS = [/^這是不是會讓導入變慢？?$/i, /^小團隊也需要這麼做嗎？?$/i, /先從一條高頻流程、一個負責人、一個回滾方法開始/i];
const INTERNAL_SEARCH_WORD_PATTERNS = [/\bSEO\b/i, /\bGEO\b/i, /AI\s*referral/i, /Search Console/i, /GA4/i];
const COLUMN_SOURCE_BASKET_PATTERNS = [
  /OpenAI、Microsoft、NIST、IBM/i,
  /Microsoft、NIST、Google Cloud、IBM/i,
  /OpenAI,\s*Microsoft,\s*NIST,\s*and\s*IBM/i,
  /Microsoft,\s*NIST,\s*Google Cloud,\s*and\s*IBM/i
];
const GENERIC_COLUMN_HEADING_PATTERNS = [
  /^ALTOS LAB\s*(判斷|觀點|implementation note)$/i,
  /^下一步$/i,
  /^接下來看什麼$/i,
  /^FAQ[:：]/i,
  /^讀者會追問/i,
  /^小團隊也可以做/i,
  /^好工具要能留下決策證據/i,
  /^介面合約不是工程文件，是責任邊界$/i
];
const EDITORIAL_BRIDGE_LEAK_PATTERNS = [
  /在(?:進入|第二張圖|這張圖)之前/i,
  /第二張圖(?:應該|不應)/i,
  /接下來的視覺/i,
  /圖像接下來呈現/i,
  /這段文字存在的目的/i,
  /不是裝飾，而是/i
];
const BLAND_TITLE_VERBS = /(放大|擴大|優化|導入|更新|處理|進行|建立|提升|改善|寫清楚|寫出來)/i;
const TITLE_TENSION_PATTERNS = [
  /不是.+而是/,
  /不代表/,
  /最怕/,
  /別等/,
  /為什麼/,
  /真正/,
  /缺的是/,
  /先.+再/,
  /該.+不是/,
  /會吃掉/,
  /撐得住/,
  /停/
];

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

async function hydrateAuditPosts(root, posts) {
  const queue = posts
    .map((post, index) => ({ post, index }))
    .filter(({ post }) => {
      if (post.contentType === "column" || post.contentType === "feature") return true;
      if (post.contentType !== "breaking") return false;
      if (!Array.isArray(post.sourceLinks) || post.sourceLinks.length < 1) return true;
      if (!Array.isArray(post.keyTakeaways) || post.keyTakeaways.length < 2) return true;
      return false;
    });
  if (!queue.length) return posts;
  const next = [...posts];
  let cursor = 0;
  const workerCount = Math.min(8, queue.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        try {
          const detail = await fetchJson(
            `${root}/api/blog/${encodeURIComponent(item.post.slug)}?language=${encodeURIComponent(item.post.language)}`
          );
          if (detail?.post) next[item.index] = { ...item.post, ...detail.post };
        } catch {
          next[item.index] = item.post;
        }
      }
    })
  );
  return next;
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
    post.coverAlt,
    post.coverCredit,
    post.coverPrompt,
    JSON.stringify(post.coverGeneration || {}),
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

function comparableText(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .replace(/^(根據\s*)?(techcrunch|the verge|wired|venturebeat|mit technology review)\s*(報導|reported|reports|指出|稱)[,，:：]?\s*/i, "")
    .replace(/[，。,.!?！？；;:\s]/g, "");
}

function overlapRatio(a = "", b = "") {
  const left = comparableText(a);
  const right = comparableText(b);
  if (!left || !right) return 0;
  const n = left.length >= 18 || right.length >= 18 ? 3 : 2;
  const grams = (text) => {
    if (text.length <= n) return new Set([text]);
    const set = new Set();
    for (let index = 0; index <= text.length - n; index += 1) set.add(text.slice(index, index + n));
    return set;
  };
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  let shared = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) shared += 1;
  }
  return shared / Math.min(leftGrams.size, rightGrams.size);
}

function wordishLength(markdown = "", language = "zh-Hant") {
  const text = stripHtml(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (["en", "id", "vi", "ms", "fil"].includes(language)) return text.split(/\s+/).filter(Boolean).length;
  if (language === "zh-Hant") return (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (language === "ja") return (text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  if (language === "th") return (text.match(/[\u0e00-\u0e7f]/g) || []).length;
  return (text.match(/[\uac00-\ud7af]/g) || []).length;
}

function columnDensityMinimum(language = "zh-Hant") {
  if (["en", "id", "vi", "ms", "fil"].includes(language)) return 950;
  if (language === "th") return 2200;
  if (language === "ja" || language === "ko") return 1650;
  return 2000;
}

function imageMarkers(body = "") {
  return [...String(body).matchAll(/\[IMAGE:([^\]]+)\]/gi)].map((match) => ({
    name: String(match[1] || "").trim().toLowerCase().replace(/_/g, "-"),
    index: Number(match.index || 0)
  }));
}

function markdownHeadings(body = "") {
  return [...String(body || "").matchAll(/^##\s+(.+)$/gm)]
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
}

function looksLikeSearchVisibilityTopic(post) {
  return /GEO|SEO|AI Search|AI 搜尋|Search Console|搜尋|answer engine|content refresh/i.test(
    `${post.title || ""}\n${post.topic || ""}\n${post.newsCategory || ""}\n${(post.tags || []).join("\n")}`
  );
}

function uniqueRatio(items) {
  if (!items.length) return 1;
  return new Set(items.map((item) => comparableText(item))).size / items.length;
}

const ALLOWED_IMAGE_MARKERS = new Set(["opening", "mechanism", "synthesis", "evidence-desk", "source-desk", "operating-loop", "repair-scene"]);

function imagePacingIssues(post) {
  const contentImages = Array.isArray(post.contentImages) ? post.contentImages : [];
  const markers = imageMarkers(post.body || "");
  const issues = [];
  if (contentImages.length > 1 && markers.length < contentImages.length) {
    issues.push({ severity: "critical", id: "content-images-can-stack-without-markers" });
  }
  for (const marker of markers) {
    if (!ALLOWED_IMAGE_MARKERS.has(marker.name)) issues.push({ severity: "critical", id: "unknown-image-marker", marker: marker.name });
  }
  if (markers.length >= 2) {
    for (let index = 1; index < markers.length; index += 1) {
      const between = String(post.body || "").slice(markers[index - 1].index, markers[index].index);
      const minimumGap = ["en", "id", "vi", "ms", "fil"].includes(post.language) ? 250 : 650;
      if (wordishLength(between, post.language) < minimumGap) {
        issues.push({ severity: "critical", id: "content-images-too-close" });
        break;
      }
    }
  }
  return issues;
}

function repeatedSentenceIssues(post) {
  const text = stripHtml(post.body || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[。！？.!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);
  const counts = new Map();
  for (const sentence of sentences) {
    const key = comparableText(sentence);
    if (!key || key.length < 14) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const repeated = [...counts.entries()].filter(([, count]) => count >= 3);
  return repeated.length ? [{ severity: "critical", id: "repeated-sentence-block", repeats: repeated.slice(0, 3).map(([key, count]) => ({ key: key.slice(0, 80), count })) }] : [];
}

function titleCraftIssues(post, isMarket) {
  const issues = [];
  const title = stripHtml(post.title || "");
  if (!title) {
    issues.push({ severity: "critical", id: "title-missing" });
    return issues;
  }
  if (isMarket) {
    if (/發布[「"]|reported|launches with|here.?s how|如何.+新 AI|在新更新中新增/i.test(title)) {
      issues.push({ severity: "critical", id: "raw-source-title-or-machine-translation", title });
    }
    if (!/[A-Za-z0-9\u4e00-\u9fff]/.test(title) || title.length < 10) {
      issues.push({ severity: "critical", id: "market-title-too-thin", title });
    }
    return issues;
  }
  const hasTension = TITLE_TENSION_PATTERNS.some((pattern) => pattern.test(title));
  const hasConcreteSubject = /Agent|AI|搜尋|內容|成本|Copilot|供應商|資料|流程|模型|自動化|採購|回滾|權限/i.test(title);
  if (!hasTension && BLAND_TITLE_VERBS.test(title)) {
    issues.push({ severity: "critical", id: "column-title-lacks-editorial-tension", title });
  }
  if (!hasConcreteSubject) {
    issues.push({ severity: "warning", id: "column-title-lacks-concrete-subject", title });
  }
  if (title.length > 34 && post.language === "zh-Hant") {
    issues.push({ severity: "warning", id: "column-title-too-long-for-card", title });
  }
  return issues;
}

function auditPost(post) {
  const text = publicText(post);
  const isMarket = post.contentType === "breaking";
  const criticalPatterns = patternHits(text, isMarket ? MARKET_FORBIDDEN_PATTERNS : COLUMN_FORBIDDEN_PATTERNS);
  const genericAdvicePatterns = isMarket ? patternHits(text, MARKET_GENERIC_ADVICE_PATTERNS) : [];
  const weakTitlePatterns = patternHits(post.title || "", isMarket ? WEAK_MARKET_TITLE_PATTERNS : WEAK_COLUMN_TITLE_PATTERNS);
  const issues = [];
  for (const pattern of criticalPatterns) issues.push({ severity: "critical", id: "public-copy-pattern", pattern });
  for (const pattern of genericAdvicePatterns) issues.push({ severity: "critical", id: "generic-market-advice-filler", pattern });
  for (const pattern of weakTitlePatterns) issues.push({ severity: "warning", id: "weak-title-pattern", pattern });
  issues.push(...titleCraftIssues(post, isMarket));
  if (isMarket && (post.sourceLinks || []).length < 1) issues.push({ severity: "critical", id: "market-source-missing" });
  if (isMarket && !post.cover) issues.push({ severity: "critical", id: "market-cover-missing" });
  if (isMarket && post.geoSummary && post.excerpt && overlapRatio(post.geoSummary, post.excerpt) >= 0.72) {
    issues.push({ severity: "critical", id: "summary-repeats-standfirst" });
  }
  if (isMarket && post.seoDescription && post.excerpt && overlapRatio(post.seoDescription, post.excerpt) >= 0.86) {
    issues.push({ severity: "warning", id: "seo-description-repeats-standfirst" });
  }
  if (isMarket && (!Array.isArray(post.keyTakeaways) || post.keyTakeaways.length < 2)) {
    issues.push({ severity: "critical", id: "market-takeaways-too-thin" });
  }
  if (!isMarket) {
    const density = wordishLength(post.body || "", post.language);
    if (density < columnDensityMinimum(post.language)) {
      issues.push({ severity: "critical", id: "column-depth-too-thin", density, minimum: columnDensityMinimum(post.language) });
    }
    if (Number(post.readTimeMinutes || 0) >= 6 && density < columnDensityMinimum(post.language)) {
      issues.push({ severity: "critical", id: "readtime-inflated-vs-density", density, readTimeMinutes: post.readTimeMinutes });
    }
    for (const pattern of patternHits(post.body || "", EDITORIAL_BRIDGE_LEAK_PATTERNS)) {
      issues.push({ severity: "critical", id: "editorial-image-bridge-leaked-to-body", pattern });
    }
    issues.push(...repeatedSentenceIssues(post));
    issues.push(...imagePacingIssues(post));
    const recycledTakeaways = (post.keyTakeaways || []).filter((item) => RECYCLED_COLUMN_TAKEAWAYS.some((pattern) => pattern.test(String(item).trim())));
    if (recycledTakeaways.length >= 2) issues.push({ severity: "critical", id: "recycled-column-takeaways" });
    const recycledFaqs = (post.faqs || []).filter((faq) => RECYCLED_COLUMN_FAQS.some((pattern) => pattern.test(`${faq.question || ""}\n${faq.answer || ""}`)));
    if (recycledFaqs.length >= 1) issues.push({ severity: "critical", id: "recycled-column-faq" });
    const headings = markdownHeadings(post.body || "");
    if (headings.length < 3) issues.push({ severity: "critical", id: "column-section-headings-too-few", headings: headings.length });
    if (headings.length > 6) issues.push({ severity: "warning", id: "column-section-headings-too-many", headings: headings.length });
    if (uniqueRatio(headings) < 1) issues.push({ severity: "critical", id: "duplicate-column-section-heading" });
    const genericHeadings = headings.filter((heading) => GENERIC_COLUMN_HEADING_PATTERNS.some((pattern) => pattern.test(heading)));
    if (genericHeadings.length >= 1) issues.push({ severity: "warning", id: "generic-column-section-heading", headings: genericHeadings.slice(0, 4) });
    if (!looksLikeSearchVisibilityTopic(post)) {
      const publicSearchWords = patternHits(`${post.title || ""}\n${post.excerpt || ""}\n${post.seoDescription || ""}\n${post.geoSummary || ""}\n${post.body || ""}`, INTERNAL_SEARCH_WORD_PATTERNS);
      if (publicSearchWords.length) issues.push({ severity: "critical", id: "internal-search-optimization-language", patterns: publicSearchWords });
    }
    const sourceBasketHits = patternHits(`${post.excerpt || ""}\n${post.seoDescription || ""}\n${post.geoSummary || ""}\n${post.body || ""}`, COLUMN_SOURCE_BASKET_PATTERNS);
    if (sourceBasketHits.length >= 2) issues.push({ severity: "warning", id: "repeated-source-basket-copy", patterns: sourceBasketHits });
    if (post.geoSummary && post.excerpt && overlapRatio(post.geoSummary, post.excerpt) >= 0.72) {
      issues.push({ severity: "warning", id: "column-summary-repeats-excerpt" });
    }
    if (post.seoDescription && post.excerpt && overlapRatio(post.seoDescription, post.excerpt) >= 0.86) {
      issues.push({ severity: "warning", id: "column-seo-description-repeats-excerpt" });
    }
  }
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
  const posts = await hydrateAuditPosts(root, Array.isArray(payload.posts) ? payload.posts : []);
  const audited = posts.map(auditPost);
  const problemPosts = audited.filter((post) => post.issues.length);
  if (posts.length === 0) {
    problemPosts.push({
      id: "public-blog-inventory",
      slug: "api-blog",
      language: "all",
      contentType: "public-inventory",
      title: "Public blog inventory is empty",
      issues: [{ severity: "critical", id: "public-blog-posts-empty" }]
    });
  }
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
