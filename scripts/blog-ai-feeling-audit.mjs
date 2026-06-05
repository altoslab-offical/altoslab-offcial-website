#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const THRESHOLDS = {
  breaking: 90,
  column: 85,
  feature: 88
};

const GENERATED_COVER_NEEDS_TRACE = new Set(["generated", "gpt", "chatgpt", "editorial"]);

const RULES = [
  {
    id: "internal-process-leak",
    severity: "critical",
    score: -25,
    fields: ["title", "seoTitle", "seoDescription", "excerpt", "body"],
    pattern:
      /(AI\s*感|anti[-\s]?slop|source[-\s]?translation|來源轉譯|quality\s*gate|品質\s*gate|prompt\s*card|修稿隊列|rubric|pipeline|SEO\s*\/\s*GEO|GEO\s*結構|AI-generated|AI\s*協助產生)/i,
    message: "公開文案疑似出現內部流程或後台審核語彙。"
  },
  {
    id: "market-template-slop",
    severity: "critical",
    score: -30,
    fields: ["title", "seoTitle", "seoDescription", "excerpt", "body"],
    pattern:
      /(這則消息可以拿來|企業檢查|卡在哪個流程|原因是企業決策問題|Source:\s|Event:\s|Evidence:\s|Decision cue|Next action:|source brief|reader note|市場訊號而不是|AI\s*回答會怎麼引用)/i,
    message: "市場快訊出現舊版企業流程模板，應改回來源忠實新聞寫法。"
  },
  {
    id: "grandiose-language",
    severity: "major",
    score: -4,
    maxHits: 4,
    fields: ["title", "excerpt", "body"],
    pattern: /(災難性|夢魘|定時炸彈|不可逆|徹底|顛覆|革命|護城河|競爭力的延伸|正式進入|終局|唯一答案|game[-\s]?changer|revolutionary)/gi,
    message: "語氣過度放大，容易讀起來像生成式宣告。"
  },
  {
    id: "template-contrast",
    severity: "major",
    score: -3,
    maxHits: 5,
    fields: ["title", "excerpt", "body"],
    pattern: /(不是.{0,16}而是|不只是|不僅|不再只是|真正值得|真正的|共同指向|同一件事|下一個門檻|這件事|核心是|not just|not only)/gi,
    message: "過度依賴「不是 X 而是 Y」與通用轉折模板。"
  },
  {
    id: "generic-opening",
    severity: "major",
    score: -10,
    firstChars: 260,
    fields: ["body"],
    pattern: /^(AI|人工智慧|生成式 AI|搜尋引擎|企業|品牌|現代企業|數位行銷|隨著|在.+時代|近年來|如今|現在|當前|Today|Nowadays|As AI).{0,80}(正在|已經|逐漸|快速|持續|成為|面臨|reshaping|transforming)/i,
    message: "開頭沒有直接打中讀者問題，像通用 AI 文章開場。"
  },
  {
    id: "weak-title-shape",
    severity: "major",
    score: -8,
    fields: ["title"],
    pattern: /(為什麼|才有資格|別再|不再只是|不是|提醒：|該先|到底|完整解析|深入解析|必須知道)/i,
    message: "標題句型偏模板，可改成更具事件錨點與決策張力的說法。"
  },
  {
    id: "weak-heading",
    severity: "major",
    score: -4,
    maxHits: 5,
    headingOnly: true,
    fields: ["body"],
    pattern:
      /^(#+\s*)?(為什麼|發生什麼|市場訊號|對企業的意思|本週先檢查|ALTOS LAB\s*(觀點|判斷)|結語|來源轉譯|來源與參考|常見問題)/i,
    message: "小標太像固定模板，應改成具體場景、衝突或行動。"
  },
  {
    id: "missing-reader-action",
    severity: "major",
    score: -8,
    absent: true,
    fields: ["body", "excerpt"],
    pattern:
      /(本週|今天|下一步|先檢查|先做|不要做|判斷標準|行動清單|清單|盤點|優先|驗收|檢核|決定|what to check|next step|this week|checklist|priority|audit|今週|次に|チェック|이번 주|다음 단계|periksa|kiểm tra|ตรวจ|suriin)/i,
    message: "缺少明確下一步，讀者看完不知道今天能做什麼。"
  },
  {
    id: "missing-source-anchor",
    severity: "major",
    score: -8,
    sourceMinimum: 2,
    message: "來源數不足，市場/專欄都需要可回查的事實支撐。"
  },
  {
    id: "short-seo-title",
    severity: "minor",
    score: -4,
    seoTitleLength: "short",
    message: "seoTitle 偏短，搜尋結果缺少完整事件與決策脈絡。"
  },
  {
    id: "generated-cover-missing-trace",
    severity: "minor",
    score: -5,
    generatedCoverTrace: true,
    message: "生成封面缺 provider/prompt 追溯欄位，欄目圖像稽核不完整。"
  }
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB blog AI-feeling audit

Examples:
  node scripts/blog-ai-feeling-audit.mjs --base-url https://altoslab-ai.cc
  node scripts/blog-ai-feeling-audit.mjs --language zh-Hant --out-dir data/blog-repair

Options:
  --base-url <url>       Defaults to ${DEFAULT_BASE_URL}
  --language <lang|all>  Defaults to zh-Hant. Use all for every configured language.
  --out-dir <path>       Defaults to data/blog-repair
  --format <json|md|both> Defaults to both
  --limit <n>            Markdown queue limit, default 30
`);
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function taiwanDate(input = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(input);
}

function textFromPost(post, fields) {
  return fields.map((field) => String(post[field] || "")).join("\n");
}

function headingsFromBody(body = "") {
  return String(body)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{2,4}\s+/.test(line));
}

function countMatches(text, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const clone = new RegExp(pattern.source, flags);
  return [...String(text || "").matchAll(clone)].length;
}

function postUrl(baseUrl, post) {
  const languagePrefix = {
    "zh-Hant": "",
    en: "/en",
    ja: "/ja",
    ko: "/ko",
    id: "/id",
    vi: "/vi",
    th: "/th",
    ms: "/ms",
    fil: "/fil"
  }[post.language] || "";
  return `${normalizeBaseUrl(baseUrl)}${languagePrefix}/blog/${post.slug}`;
}

function repairLane(post) {
  if (post.contentType === "column" || post.contentType === "feature") {
    return "Gemini zh-Hant source rewrite, then spark localization";
  }
  return "terminal source-faithful rewrite; no Gemini unless judgment copy is structurally weak";
}

function isPrimarySourceMarketBrief(post) {
  return (
    post.contentType === "breaking" &&
    post.coverSource === "source" &&
    Array.isArray(post.sourceLinks) &&
    post.sourceLinks.length >= 1 &&
    Boolean(post.coverCreditUrl)
  );
}

function expectedThreshold(post) {
  return THRESHOLDS[post.contentType] || 88;
}

function band(score, threshold) {
  if (score >= threshold) return "pass";
  if (score >= threshold - 12) return "hold";
  return "repair";
}

function reviewPost(post, baseUrl) {
  let score = 100;
  const issues = [];
  const warnings = [];
  const hits = [];

  for (const rule of RULES) {
    if (rule.sourceMinimum) {
      const count = Array.isArray(post.sourceLinks) ? post.sourceLinks.length : 0;
      if (isPrimarySourceMarketBrief(post)) continue;
      if (count < rule.sourceMinimum) {
        score += rule.score;
        issues.push(rule.message);
        hits.push({ id: rule.id, severity: rule.severity, count: 1, score: rule.score });
      }
      continue;
    }

    if (rule.id === "missing-reader-action" && isPrimarySourceMarketBrief(post)) {
      continue;
    }

    if (rule.seoTitleLength) {
      const length = String(post.seoTitle || "").trim().length;
      if (length > 0 && (length < 24 || length > 72)) {
        score += rule.score;
        warnings.push(`${rule.message} 目前長度 ${length}。`);
        hits.push({ id: rule.id, severity: rule.severity, count: 1, score: rule.score });
      }
      continue;
    }

    if (rule.generatedCoverTrace) {
      const coverSource = String(post.coverSource || "").toLowerCase();
      const generated = GENERATED_COVER_NEEDS_TRACE.has(coverSource) || post.coverGeneration;
      const provider = post.coverGeneration?.provider;
      const prompt = post.coverGeneration?.prompt;
      if (generated && (!provider || !prompt)) {
        score += rule.score;
        warnings.push(rule.message);
        hits.push({ id: rule.id, severity: rule.severity, count: 1, score: rule.score });
      }
      continue;
    }

    const text = rule.headingOnly
      ? headingsFromBody(post.body).join("\n")
      : textFromPost(post, rule.fields || ["body"]);
    const target = rule.firstChars ? text.slice(0, rule.firstChars) : text;
    const count = countMatches(target, rule.pattern);
    const triggered = rule.absent ? count === 0 : count > 0;
    if (!triggered) continue;

    const hitCount = rule.absent ? 1 : Math.min(count, rule.maxHits || count);
    const delta = rule.score * hitCount;
    score += delta;
    const bucket = rule.severity === "minor" ? warnings : issues;
    bucket.push(rule.absent ? rule.message : `${rule.message} 命中 ${count} 次。`);
    hits.push({ id: rule.id, severity: rule.severity, count, score: delta });
  }

  score = Math.max(0, Math.min(100, score));
  const threshold = expectedThreshold(post);
  const status = band(score, threshold);
  return {
    slug: post.slug,
    language: post.language,
    translationGroupId: post.translationGroupId || post.slug,
    contentType: post.contentType,
    title: post.title,
    seoTitle: post.seoTitle,
    excerpt: post.excerpt,
    updatedAt: post.updatedAt || post.publishedAt || post.date,
    url: postUrl(baseUrl, post),
    score,
    threshold,
    band: status,
    repairLane: repairLane(post),
    sourceCount: Array.isArray(post.sourceLinks) ? post.sourceLinks.length : 0,
    headings: headingsFromBody(post.body).map((line) => line.replace(/^#{2,4}\s+/, "")),
    issues,
    warnings,
    hits
  };
}

async function fetchPosts(baseUrl, language) {
  const url = `${normalizeBaseUrl(baseUrl)}/api/blog${language && language !== "all" ? `?language=${encodeURIComponent(language)}` : ""}`;
  const response = await fetch(url, { headers: { "User-Agent": "ALTOS-LAB-blog-ai-feeling-audit/1.0" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`blog API failed: ${response.status} ${text.slice(0, 180)}`);
  const parsed = JSON.parse(text);
  return Array.isArray(parsed.posts) ? parsed.posts : [];
}

function groupCoverage(posts) {
  const groups = new Map();
  for (const post of posts) {
    const id = post.translationGroupId || post.slug;
    const group = groups.get(id) || { translationGroupId: id, languages: new Set(), title: post.title || "" };
    if (post.language) group.languages.add(post.language);
    groups.set(id, group);
  }
  return [...groups.values()].map((group) => ({
    translationGroupId: group.translationGroupId,
    title: group.title,
    languages: [...group.languages].sort(),
    missingLanguages: LANGUAGES.filter((language) => !group.languages.has(language))
  }));
}

function markdownReport({ baseUrl, language, posts, reviews, coverage, limit }) {
  const ordered = [...reviews].sort((a, b) => a.score - b.score || a.title.localeCompare(b.title));
  const repair = ordered.filter((item) => item.band !== "pass");
  const lines = [
    "# ALTOS LAB Article Repair Queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${normalizeBaseUrl(baseUrl)}`,
    `Language scope: ${language}`,
    `Posts reviewed: ${posts.length}`,
    `Repair/Hold items: ${repair.length}`,
    `Complete language groups: ${coverage.filter((group) => group.missingLanguages.length === 0).length}/${coverage.length}`,
    "",
    "## Priority Queue",
    ""
  ];

  for (const item of repair.slice(0, limit)) {
    lines.push(`### ${item.score}/${item.threshold} · ${item.band.toUpperCase()} · ${item.slug}`);
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Type: ${item.contentType}; Language: ${item.language}; Lane: ${item.repairLane}`);
    lines.push(`- URL: ${item.url}`);
    if (item.issues.length) lines.push(`- Issues: ${item.issues.join(" ")}`);
    if (item.warnings.length) lines.push(`- Warnings: ${item.warnings.join(" ")}`);
    if (item.headings.length) lines.push(`- Current headings: ${item.headings.slice(0, 8).join(" / ")}`);
    lines.push("");
  }

  const missingGroups = coverage.filter((group) => group.missingLanguages.length > 0);
  if (missingGroups.length) {
    lines.push("## Language Gaps");
    lines.push("");
    for (const group of missingGroups.slice(0, 20)) {
      lines.push(`- ${group.translationGroupId}: missing ${group.missingLanguages.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Operating Rule");
  lines.push("");
  lines.push("- Column/feature repair goes through Gemini for the approved zh-Hant source article, then bounded localization workers.");
  lines.push("- Market-news repair stays source-faithful and terminal-first; it does not open Gemini unless the editorial judgment paragraph is structurally broken.");
  lines.push("- Public copy must never mention internal QA, prompts, source-translation, SEO/GEO scoring, or model/pipeline language.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (hasFlag("help")) {
    usage();
    return;
  }
  const baseUrl = arg("base-url", process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL);
  const language = arg("language", "zh-Hant");
  const outDir = path.resolve(arg("out-dir", path.join(process.cwd(), "data/blog-repair")));
  const format = arg("format", "both");
  const limit = Number.parseInt(arg("limit", "30"), 10) || 30;

  const posts = await fetchPosts(baseUrl, language);
  const allPosts = language === "all" ? posts : await fetchPosts(baseUrl, "all");
  const reviews = posts.map((post) => reviewPost(post, baseUrl));
  const coverage = groupCoverage(allPosts);
  const stamp = taiwanDate();
  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: normalizeBaseUrl(baseUrl),
    language,
    postsReviewed: posts.length,
    repairItems: reviews.filter((item) => item.band !== "pass").length,
    coverage,
    reviews: [...reviews].sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))
  };

  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `ai-feeling-audit-${stamp}.json`);
  const mdPath = path.join(outDir, `ai-feeling-audit-${stamp}.md`);
  if (format === "json" || format === "both") {
    await fs.writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  if (format === "md" || format === "both") {
    await fs.writeFile(mdPath, markdownReport({ baseUrl, language, posts, reviews, coverage, limit }), "utf8");
  }

  const worst = payload.reviews.slice(0, 8).map((item) => `${item.score}/${item.threshold} ${item.slug}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        postsReviewed: payload.postsReviewed,
        repairItems: payload.repairItems,
        jsonPath: format === "md" ? undefined : jsonPath,
        mdPath: format === "json" ? undefined : mdPath,
        worst
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
