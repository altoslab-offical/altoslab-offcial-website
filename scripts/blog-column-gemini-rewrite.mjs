#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const ADMIN_COOKIE = "altos_admin";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const BANNED_PUBLIC_PATTERNS = [
  /ALTOS LAB\s*(?:判斷|觀點)[:：]\s*ALTOS LAB/i,
  /先守住這三個控制點/i,
  /先從一條真實工作流開始/i,
  /先拿一個場景演練/i,
  /ALTOS LAB 現場筆記/i,
  /把判斷放進四格矩陣/i,
  /本週先檢查三件事/i,
  /導入實踐[:：]/i,
  /決策法則與行動清單/i,
  /核心挑戰[:：]/i,
  /不可控的黑箱|無法掌控的夢魘|停止按鈕/i,
  /prompt\s*(?:version|card|chain|process|workflow)|quality gate/i
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...parts] = trimmed.split("=");
    if (!key || process.env[key]) continue;
    process.env[key] = parts.join("=").replace(/^['"]|['"]$/g, "");
  }
}

function baseUrl() {
  return String(arg("base-url", process.env.ALTOS_ADMIN_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL)).replace(/\/+$/, "");
}

function password() {
  return arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { text };
  }
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed ${response.status}: ${text.slice(0, 500)}`);
  return { response, ...json };
}

async function login(root) {
  const pass = password();
  if (!pass) throw new Error("ALTOS_ADMIN_PASSWORD or ADMIN_PASSWORD is required");
  const { response } = await fetchJson(`${root}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password: pass })
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)(${ADMIN_COOKIE}=[^;]+)`));
  if (!match?.[1]) throw new Error("Admin login did not return an altos_admin cookie");
  return match[1];
}

function stripMarkdownFences(value = "") {
  return String(value)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function repairJsonEscapes(value = "") {
  return String(value).replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

function extractJson(value = "") {
  const raw = stripMarkdownFences(value);
  try {
    return JSON.parse(repairJsonEscapes(raw));
  } catch {
    const first = raw.indexOf("{");
    if (first >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = first; index < raw.length; index += 1) {
        const char = raw[index];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === "\"") {
          inString = !inString;
          continue;
        }
        if (inString) continue;
        if (char === "{") depth += 1;
        if (char === "}") {
          depth -= 1;
          if (depth === 0) return JSON.parse(repairJsonEscapes(raw.slice(first, index + 1)));
        }
      }
    }
    throw new Error(`Gemini output was not JSON: ${raw.slice(0, 300)}`);
  }
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function normalizeColumnBody(value = "") {
  return normalizeText(value).replace(/^###\s+/gm, "## ");
}

function publicText(post = {}) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    ...(post.keyTakeaways || []),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].filter(Boolean).join("\n");
}

function hasBannedPattern(post = {}) {
  const text = publicText(post);
  return BANNED_PUBLIC_PATTERNS.find((pattern) => pattern.test(text)) || null;
}

function h2Headings(body = "") {
  return String(body).split(/\n/).filter((line) => /^#{2,3}\s+/.test(line)).map((line) => line.replace(/^#{2,3}\s+/, "").trim());
}

function validateRewrite(result, groupId) {
  const posts = result?.posts || [];
  const errors = [];
  const languages = new Set(posts.map((post) => post.language));
  for (const language of LANGUAGES) {
    if (!languages.has(language)) errors.push(`${groupId}: missing ${language}`);
  }
  if (posts.length !== LANGUAGES.length) errors.push(`${groupId}: expected ${LANGUAGES.length} posts, got ${posts.length}`);
  for (let post of posts) {
    post = completePost(post);
    const prefix = `${groupId}/${post.language || "unknown"}`;
    if (!post.title || post.title.length < 8) errors.push(`${prefix}: title too short`);
    if (!post.excerpt || post.excerpt.length < 40) errors.push(`${prefix}: excerpt too short`);
    if (!post.body || normalizeText(post.body).length < (post.language === "zh-Hant" ? 1200 : 800)) errors.push(`${prefix}: body too short`);
    const headings = h2Headings(post.body || "");
    if (headings.length < 3) errors.push(`${prefix}: needs at least 3 natural H2 headings`);
    if (headings.some((heading) => /ALTOS LAB|判斷|觀點|^(?:背景|後續觀察|關鍵事實|事件重點|導入實踐|核心挑戰)$/i.test(heading))) {
      errors.push(`${prefix}: heading still looks templated`);
    }
    const banned = hasBannedPattern(post);
    if (banned) errors.push(`${prefix}: banned public pattern ${banned.source}`);
    if (!Array.isArray(post.keyTakeaways) || post.keyTakeaways.length < 3) errors.push(`${prefix}: keyTakeaways incomplete`);
    if (!Array.isArray(post.faqs) || post.faqs.length < 2) errors.push(`${prefix}: faqs incomplete`);
  }
  return errors;
}

function slimPost(post = {}) {
  return {
    language: post.language,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: normalizeText(post.body || "").slice(0, 5000),
    keyTakeaways: post.keyTakeaways || [],
    faqs: post.faqs || [],
    sourceLinks: post.sourceLinks || [],
    tags: post.tags || [],
    author: post.author || "",
    coverAlt: post.coverAlt || "",
    contentImages: (post.contentImages || []).map((image) => ({
      placement: image.placement,
      alt: image.alt,
      caption: image.caption
    }))
  };
}

function buildGeminiPrompt(groupId, posts) {
  const zh = posts.find((post) => post.language === "zh-Hant") || posts[0];
  const sourceLinks = zh.sourceLinks || [];
  const imageMarkers = Array.from(new Set(String(zh.body || "").match(/\[IMAGE:[^\]]+\]/g) || []));
  const original = posts.map(slimPost);

  return `你是 ALTOS LAB 的資深中文總編與多語在地化編輯。請重寫這一組已發布專欄，目標是去掉 AI 感和固定模板感，讓它像成熟產品/科技專欄，而不是報告、檢查表或顧問框架。

風格參考只用來感受節奏，不要模仿句子：
- 人人都是產品經理式專欄：先丟出真實工作場景或矛盾，再一層一層拆問題；段落像人在講清楚一件事，不是硬塞清單。
- 好的科技專欄會有觀點、例子、取捨、反直覺處，標題與小標都服務閱讀節奏，不是服務模板。

硬要求：
- 請先重寫 zh-Hant source-of-truth，再自然在地化 en, ja, ko, id, vi, th, ms, fil。
- 不要新增來源、數字、公司案例或圖片。可重組既有來源與概念，但不得編造。
- 保留相同文章身份與主題；不要改 slug、language、translationGroupId、sourceLinks、cover、contentImages。
- public copy 不准出現 SEO、GEO、prompt、pipeline、quality gate、AI-generated。
- 不准出現固定標題或句型：ALTOS LAB 判斷、ALTOS LAB 觀點、先守住這三個控制點、先從一條真實工作流開始、先拿一個場景演練、ALTOS LAB 現場筆記、四格矩陣、導入實踐、決策法則與行動清單、本週先檢查三件事。
- 小標必須為文章主題量身寫，不要用「背景／後續觀察／關鍵事實／清單／框架」這種萬用小標。
- 可以有列表，但只有在自然需要時才用；整篇不能像 checklist。
- 第一段 60-100 字要有鉤子：一個具體場景、矛盾或判斷，讓人想讀下去。
- 每篇 body 需要有完整專欄厚度：zh-Hant 至少 5 個自然段落與 3 個主題化 H2；其他語言要完整在地化，不要濃縮成摘要。
- 每篇 body 保留這些圖片 marker，放在自然位置：${imageMarkers.join(", ") || "無"}。
- 每個語言都要符合當地自然語氣，尤其 id、vi、th、ms、fil 不能像直譯。

請輸出純 JSON，不要 Markdown code fence。Schema:
{
  "translationGroupId": ${JSON.stringify(groupId)},
  "posts": [
    {
      "language": "zh-Hant",
      "title": "",
      "seoTitle": "",
      "seoDescription": "",
      "excerpt": "",
      "geoSummary": "",
      "body": "Markdown body; use H2 headings; keep image markers if provided.",
      "keyTakeaways": ["", "", ""],
      "faqs": [{"question": "", "answer": ""}, {"question": "", "answer": ""}]
    }
  ]
}

來源連結（所有語言共用，不要改）:
${JSON.stringify(sourceLinks, null, 2)}

目前文章資料:
${JSON.stringify(original, null, 2)}`;
}

function languageName(language) {
  return {
    "zh-Hant": "繁體中文（台灣）",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    id: "Bahasa Indonesia",
    vi: "Tiếng Việt",
    th: "ภาษาไทย",
    ms: "Bahasa Melayu",
    fil: "Filipino"
  }[language] || language;
}

function buildGeminiLanguagePrompt(groupId, posts, language, zhRewrite = null) {
  const zh = posts.find((post) => post.language === "zh-Hant") || posts[0];
  const existing = posts.find((post) => post.language === language) || zh;
  const sourceLinks = zh.sourceLinks || [];
  const imageMarkers = Array.from(new Set(String(zhRewrite?.body || zh.body || "").match(/\[IMAGE:[^\]]+\]/g) || []));
  const baseRules = `你是 ALTOS LAB 的資深總編。請重寫這篇已發布專欄，去掉 AI 感和固定模板感，讓它像成熟產品/科技專欄，而不是報告、檢查表或顧問框架。

風格只用來感受節奏，不要套公式：
- 先從真實工作情境、矛盾或反直覺判斷切入。
- 段落要像人在把一件事講清楚：有場景、有取捨、有原因、有例子。
- 小標為這篇文章量身寫，不能是「背景／後續觀察／關鍵事實／清單／框架」這種萬用小標。

硬要求：
- 不要新增來源、數字、公司案例或圖片。可重組既有來源與概念，但不得編造。
- 不要改 slug、language、translationGroupId、sourceLinks、cover、contentImages。
- public copy 不准出現 SEO、GEO、prompt、pipeline、quality gate、AI-generated。
- 不准出現：ALTOS LAB 判斷、ALTOS LAB 觀點、先守住這三個控制點、先從一條真實工作流開始、先拿一個場景演練、ALTOS LAB 現場筆記、四格矩陣、導入實踐、決策法則與行動清單、本週先檢查三件事、停止按鈕、黑箱、夢魘。
- 如果想表達風險控制，不要寫「停止按鈕／黑箱／夢魘」這種誇張 AI 感詞，改用「接管點、復原路徑、邊界、可追蹤、交接」等自然產品語彙。
- body 至少 3 個主題化 H2。zh-Hant 目標 1,600-2,200 個中文字；其他語言也要保留完整論述，不可縮成摘要。第一段 60-100 字要能讓人想讀下去。
- 可以有列表，但不能讓整篇看起來像 checklist。
- 保留這些圖片 marker，放在自然位置：${imageMarkers.join(", ") || "無"}。`;

  if (language === "zh-Hant") {
    return `${baseRules}

這次只輸出繁體中文（台灣）一篇。請輸出純 JSON，不要 Markdown code fence：
{
  "post": {
    "language": "zh-Hant",
    "title": "",
    "seoTitle": "",
    "seoDescription": "",
    "excerpt": "",
    "geoSummary": "",
    "body": "Markdown body",
    "keyTakeaways": ["", "", ""],
    "faqs": [{"question": "", "answer": ""}, {"question": "", "answer": ""}]
  }
}

來源連結（不要改）:
${JSON.stringify(sourceLinks, null, 2)}

目前中文稿:
${JSON.stringify(slimPost(zh), null, 2)}`;
  }

  return `${baseRules}

你現在只負責 ${languageName(language)}。請根據「已批准的 zh-Hant 定稿」在地化，不要逐句直譯，也不要擅自新增事實。語氣要像當地產品/科技專欄，而不是機器翻譯。

請輸出純 JSON，不要 Markdown code fence：
{
  "post": {
    "language": ${JSON.stringify(language)},
    "title": "",
    "seoTitle": "",
    "seoDescription": "",
    "excerpt": "",
    "geoSummary": "",
    "body": "Markdown body",
    "keyTakeaways": ["", "", ""],
    "faqs": [{"question": "", "answer": ""}, {"question": "", "answer": ""}]
  }
}

來源連結（不要改）:
${JSON.stringify(sourceLinks, null, 2)}

已批准 zh-Hant 定稿:
${JSON.stringify(zhRewrite, null, 2)}

目前 ${languageName(language)} 舊稿（只參考既有名詞，不要保留模板節奏）:
${JSON.stringify(slimPost(existing), null, 2)}`;
}

function validateSinglePost(post = {}, groupId = "") {
  const errors = [];
  post = completePost(post);
  const prefix = `${groupId}/${post.language || "unknown"}`;
  if (!post.title || post.title.length < 8) errors.push(`${prefix}: title too short`);
  if (!post.excerpt || post.excerpt.length < 40) errors.push(`${prefix}: excerpt too short`);
  if (!post.body || normalizeText(post.body).length < (post.language === "zh-Hant" ? 1200 : 800)) errors.push(`${prefix}: body too short`);
  const headings = h2Headings(post.body || "");
  if (headings.length < 3) errors.push(`${prefix}: needs at least 3 natural H2 headings`);
  if (headings.some((heading) => /ALTOS LAB|判斷|觀點|^(?:背景|後續觀察|關鍵事實|事件重點|導入實踐|核心挑戰)$/i.test(heading))) {
    errors.push(`${prefix}: heading still looks templated`);
  }
  const banned = hasBannedPattern(post);
  if (banned) errors.push(`${prefix}: banned public pattern ${banned.source}`);
  if (!Array.isArray(post.keyTakeaways) || post.keyTakeaways.length < 3) errors.push(`${prefix}: keyTakeaways incomplete`);
  if (!Array.isArray(post.faqs) || post.faqs.length < 2) errors.push(`${prefix}: faqs incomplete`);
  return errors;
}

function extractPostResult(value = "") {
  const parsed = extractJson(value);
  const post = parsed.post || parsed.posts?.[0] || parsed;
  if (!post?.language) throw new Error("Gemini output did not include post.language");
  return post;
}

function bodySentences(body = "") {
  return normalizeText(body)
    .replace(/\[IMAGE:[^\]]+\]/g, "")
    .split(/\n+/)
    .filter((line) => line && !/^#{1,6}\s+/.test(line))
    .join(" ")
    .split(/(?<=[。！？.!?])\s+/)
    .map((sentence) => normalizeText(sentence).replace(/[。！？.!?]+$/, ""))
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 6);
}

function fallbackTakeaways(post = {}) {
  const existing = Array.isArray(post.keyTakeaways) ? post.keyTakeaways.map(normalizeText).filter(Boolean) : [];
  if (existing.length >= 3) return existing.slice(0, 5);
  const fromBody = bodySentences(post.body || "").filter((sentence) => !existing.includes(sentence));
  return [...existing, ...fromBody].slice(0, 3);
}

function fallbackFaqs(post = {}) {
  const existing = Array.isArray(post.faqs)
    ? post.faqs.map((faq) => ({ question: normalizeText(faq.question), answer: normalizeText(faq.answer) })).filter((faq) => faq.question && faq.answer)
    : [];
  if (existing.length >= 2) return existing.slice(0, 4);
  const title = normalizeText(post.title || "");
  const excerpt = normalizeText(post.excerpt || bodySentences(post.body || "")[0] || "");
  const bodySentence = bodySentences(post.body || "")[1] || excerpt;
  const generic = {
    "zh-Hant": [
      { question: `這篇專欄主要在提醒什麼？`, answer: excerpt },
      { question: `讀者可以怎麼使用這個觀點？`, answer: bodySentence }
    ],
    en: [
      { question: `What is the main point of this column?`, answer: excerpt },
      { question: `How should readers use this perspective?`, answer: bodySentence }
    ],
    ja: [
      { question: `このコラムの主な論点は何ですか？`, answer: excerpt },
      { question: `読者はこの視点をどう使えますか？`, answer: bodySentence }
    ],
    ko: [
      { question: `이 칼럼의 핵심은 무엇인가요?`, answer: excerpt },
      { question: `독자는 이 관점을 어떻게 활용할 수 있나요?`, answer: bodySentence }
    ],
    id: [
      { question: `Apa inti kolom ini?`, answer: excerpt },
      { question: `Bagaimana pembaca bisa memakai perspektif ini?`, answer: bodySentence }
    ],
    vi: [
      { question: `Ý chính của bài viết này là gì?`, answer: excerpt },
      { question: `Độc giả có thể dùng góc nhìn này như thế nào?`, answer: bodySentence }
    ],
    th: [
      { question: `ประเด็นหลักของบทความนี้คืออะไร?`, answer: excerpt },
      { question: `ผู้อ่านควรใช้มุมมองนี้อย่างไร?`, answer: bodySentence }
    ],
    ms: [
      { question: `Apakah inti utama kolum ini?`, answer: excerpt },
      { question: `Bagaimana pembaca boleh menggunakan perspektif ini?`, answer: bodySentence }
    ],
    fil: [
      { question: `Ano ang pangunahing punto ng column na ito?`, answer: excerpt },
      { question: `Paano magagamit ng reader ang perspektibang ito?`, answer: bodySentence }
    ]
  }[post.language] || [
    { question: `What is the main point of ${title || "this column"}?`, answer: excerpt },
    { question: `How can readers use this perspective?`, answer: bodySentence }
  ];
  return [...existing, ...generic].slice(0, 2);
}

function completePost(post = {}) {
  return {
    ...post,
    body: normalizeColumnBody(post.body || ""),
    keyTakeaways: fallbackTakeaways(post),
    faqs: fallbackFaqs(post)
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function runNext() {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}

async function rewriteGroupPerLanguage(groupId, posts, { model, timeoutMs, concurrency }) {
  const zhOutput = await runGemini(buildGeminiLanguagePrompt(groupId, posts, "zh-Hant"), { model, timeoutMs });
  const zhPost = extractPostResult(zhOutput);
  const zhErrors = validateSinglePost(zhPost, groupId);
  if (zhErrors.length) return { translationGroupId: groupId, posts: [zhPost], earlyErrors: zhErrors };

  const localized = await mapLimit(
    LANGUAGES.filter((language) => language !== "zh-Hant"),
    concurrency,
    async (language) => {
      const output = await runGemini(buildGeminiLanguagePrompt(groupId, posts, language, zhPost), { model, timeoutMs });
      return extractPostResult(output);
    }
  );
  return { translationGroupId: groupId, posts: [zhPost, ...localized] };
}

function runGemini(prompt, { model, timeoutMs }) {
  const env = {
    ...process.env,
    GOOGLE_GENAI_USE_VERTEXAI: process.env.GOOGLE_GENAI_USE_VERTEXAI || "true",
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "project-e688c018-aec3-4815-891",
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION || "us-central1"
  };
  return new Promise((resolve, reject) => {
    const child = spawn("gemini", ["-m", model, "-p", prompt], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Gemini timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`Gemini exited ${code}: ${stderr.slice(0, 1000)}`));
    });
  });
}

function patchFromRewrite(post = {}) {
  post = completePost(post);
  return {
    title: normalizeText(post.title),
    seoTitle: normalizeText(post.seoTitle || post.title).slice(0, 88),
    seoDescription: normalizeText(post.seoDescription || post.excerpt).slice(0, 220),
    excerpt: normalizeText(post.excerpt).slice(0, 320),
    geoSummary: normalizeText(post.geoSummary || post.excerpt).slice(0, 260),
    body: normalizeColumnBody(post.body),
    keyTakeaways: (post.keyTakeaways || []).map(normalizeText).filter(Boolean).slice(0, 5),
    faqs: (post.faqs || [])
      .map((faq) => ({ question: normalizeText(faq.question), answer: normalizeText(faq.answer) }))
      .filter((faq) => faq.question && faq.answer)
      .slice(0, 4),
    generatedBy: "gemini-cli-vertex-rewrite"
  };
}

async function main() {
  loadEnvFile(path.join(process.env.HOME || "", ".altoslab-blog-worker.env"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const root = baseUrl();
  const cookie = await login(root);
  const admin = await fetchJson(`${root}/api/admin/blog`, { headers: { Cookie: cookie } });
  const adminPosts = admin.payload?.posts || admin.posts || [];
  if (!adminPosts.length) throw new Error("Admin blog readback returned no posts");

  const slugs = arg("slugs", "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
  const onlyBad = hasFlag("only-bad");
  const dryRun = hasFlag("dry-run");
  const model = arg("model", "gemini-2.5-pro");
  const limit = Number.parseInt(arg("limit", "0"), 10) || 0;
  const timeoutMs = Number.parseInt(arg("timeout-ms", "180000"), 10);
  const concurrency = Number.parseInt(arg("concurrency", "3"), 10) || 3;

  const columns = adminPosts.filter((post) => post.status === "published" && post.contentType === "column");
  const selectedGroupIds = new Set();
  if (slugs.length) {
    for (const post of columns) {
      if (slugs.includes(post.slug)) selectedGroupIds.add(post.translationGroupId || post.slug);
    }
  }
  const groups = new Map();
  for (const post of columns) {
    if (selectedGroupIds.size && !selectedGroupIds.has(post.translationGroupId || post.slug)) continue;
    const key = post.translationGroupId || post.slug;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }
  let selected = Array.from(groups.entries()).filter(([, posts]) => LANGUAGES.every((language) => posts.some((post) => post.language === language)));
  if (onlyBad) selected = selected.filter(([, posts]) => posts.some((post) => hasBannedPattern(post)));
  if (limit > 0) selected = selected.slice(0, limit);

  const outDir = path.resolve(arg("out-dir", path.join("data", "blog-repair")));
  await fsp.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(outDir, `column-gemini-rewrite-${stamp}.json`);
  const report = { ok: true, root, dryRun, model, selected: selected.length, groups: [], patches: [] };

  for (const [groupId, posts] of selected) {
    let result = null;
    try {
      result = hasFlag("single-pass")
        ? extractJson(await runGemini(buildGeminiPrompt(groupId, posts), { model, timeoutMs }))
        : await rewriteGroupPerLanguage(groupId, posts, { model, timeoutMs, concurrency });
    } catch (error) {
      report.groups.push({
        groupId,
        titleBefore: posts.find((post) => post.language === "zh-Hant")?.title || posts[0]?.title || "",
        titleAfter: "",
        errors: [error?.message || String(error)],
        patchCount: 0,
        preview: []
      });
      continue;
    }
    const errors = validateRewrite(result, groupId);
    if (Array.isArray(result.earlyErrors)) errors.unshift(...result.earlyErrors);
    const byLanguage = new Map((result.posts || []).map((post) => [post.language, post]));
    const patches = [];
    for (const livePost of posts) {
      const rewritten = byLanguage.get(livePost.language);
      if (!rewritten) continue;
      patches.push({ id: livePost.id, slug: livePost.slug, language: livePost.language, patch: patchFromRewrite(rewritten) });
    }
    report.groups.push({
      groupId,
      titleBefore: posts.find((post) => post.language === "zh-Hant")?.title || posts[0]?.title || "",
      titleAfter: byLanguage.get("zh-Hant")?.title || "",
      errors,
      patchCount: patches.length,
      preview: LANGUAGES.map((language) => {
        const post = byLanguage.get(language);
        return post
          ? {
              language,
              title: post.title || "",
              excerpt: post.excerpt || "",
              bodyStart: normalizeText(post.body || "").slice(0, 500)
            }
          : { language, missing: true };
      })
    });
    if (errors.length) continue;
    report.patches.push(...patches);
  }

  if (!dryRun && report.patches.length) {
    const { payload } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ patches: report.patches.map(({ id, patch }) => ({ id, patch })) })
    });
    report.updated = payload?.updated?.length || 0;
    report.failures = payload?.failures || [];
  }

  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, dryRun, selected: report.selected, patchable: report.patches.length, updated: report.updated || 0, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
