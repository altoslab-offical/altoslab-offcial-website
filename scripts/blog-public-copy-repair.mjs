#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildMarketNewsroomPost } from "./blog-market-newsroom.mjs";
import { extractNumbers, extractSourceArticleFromHtml, sourceArticleFromPackOrPost } from "./blog-market-source-article.mjs";
import { localizeSourcePack, packForLanguage } from "./blog-market-translation-service.mjs";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const ADMIN_COOKIE = "altos_admin";
const BLOG_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const FORBIDDEN_MARKET_PATTERNS = [
  /消息落在哪個產品環節/i,
  /來源裡的具體細節/i,
  /先看採用而不是聲量/i,
  /下一步先看三個指標/i,
  /事件重點/i,
  /關鍵事實/i,
  /這則快訊的重點是什麼/i,
  /這篇文章是否代表市場已經成熟/i,
  /這則消息可以拿來/i,
  /卡在哪個流程/i,
  /原因是企業決策問題/i,
  /Decision cue/i,
  /Next action/i,
  /source[-\s]?translation/i,
  /quality gate/i,
  /rubric/i,
  /prompt card/i,
  /AI-generated/i,
  /擁抱臉|擁抱面孔|擁抱臉部/i,
  /產品 AI 雲端|資源 公司 客戶|Web Application Firewall/i,
  /404\s*(?:-|–|not found)|That page does not exist/i
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function repeatedArgs(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === `--${name}` && process.argv[index + 1]) values.push(process.argv[index + 1]);
  }
  return values;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rest] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function baseUrl() {
  return String(arg("base-url", process.env.ALTOS_ADMIN_BASE_URL || process.env.ALTOS_BLOG_BASE_URL || DEFAULT_BASE_URL)).replace(/\/+$/, "");
}

function password() {
  return arg("admin-password") || process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
}

function hmacSecret() {
  return process.env.BLOG_INGEST_HMAC_SECRET || "";
}

function sign(secret, timestamp, nonce, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": sign(secret, timestamp, nonce, body)
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.parseInt(process.env.BLOG_REPAIR_TIMEOUT_MS || "25000", 10));
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ALTOS-LAB-market-copy-repair/2.0",
      ...(options.headers || {})
    }
  }).finally(() => clearTimeout(timeout));
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { payload, response };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.parseInt(process.env.BLOG_REPAIR_SOURCE_TIMEOUT_MS || "16000", 10));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ALTOS-LAB-market-copy-repair/2.0; https://altoslab-ai.cc"
      }
    });
    const text = await response.text();
    if (response.ok && !edgeProtectionBody(text)) return { ok: true, status: response.status, text };
    if ([403, 429, 503].includes(response.status) || edgeProtectionBody(text)) {
      const reader = await fetch(sourceReaderUrl(url), {
        cache: "no-store",
        headers: {
          Accept: "text/plain,text/markdown",
          "User-Agent": "ALTOS-LAB-market-copy-repair/2.0; https://altoslab-ai.cc"
        }
      });
      const readerText = await reader.text();
      if (reader.ok && readerText && !edgeProtectionBody(readerText)) return { ok: true, status: reader.status, text: readerText, via: "reader" };
    }
    return { ok: false, status: response.status, text: "" };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
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

async function optionalAdminCookie(root) {
  const pass = password();
  if (!pass) return { cookie: "", warning: "admin password unavailable; using HMAC signed mutation if configured" };
  try {
    return { cookie: await login(root), warning: "" };
  } catch (error) {
    if (hmacSecret()) {
      return { cookie: "", warning: `admin login failed; using HMAC signed mutation: ${error?.message || String(error)}` };
    }
    throw error;
  }
}

function contentTypeMatches(post, contentTypeArg) {
  if (!contentTypeArg || contentTypeArg === "all") return true;
  if (contentTypeArg === "market" || contentTypeArg === "breaking") return post.contentType === "breaking";
  return post.contentType === contentTypeArg;
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
    post.coverAlt,
    ...(post.keyTakeaways || []),
    ...(post.sourceLinks || []).flatMap((source) => [source.title, source.summary]),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].filter(Boolean).join("\n");
}

function readerFacingText(post) {
  return [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    post.coverAlt,
    ...(post.keyTakeaways || []),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].filter(Boolean).join("\n");
}

function comparableText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/^(根據\s*)?(techcrunch|the verge|wired|venturebeat|mit technology review|siliconangle|semrush)\s*(報導|reported|reports|指出|稱)[,，:：]?\s*/i, "")
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

function splitSourceSentences(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?])\s+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 36 && sentence.length <= 260)
    .filter((sentence) => !/cookie|subscribe|newsletter|sign up|advertisement|privacy policy|terms of use/i.test(sentence));
}

function sourceArticleForRepair(sourcePack = {}) {
  return sourcePack.pack?.sourceArticle || sourcePack.sourceArticle || {};
}

function publisherFromUrl(url = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (host.includes("siliconangle.com")) return "SiliconANGLE";
    if (host.includes("techcrunch.com")) return "TechCrunch";
    if (host.includes("the-decoder.com")) return "The Decoder";
    if (host.includes("wired.com")) return "WIRED";
    if (host.includes("semrush.com")) return "Semrush Blog";
    if (host.includes("artificialintelligence-news.com")) return "AI News";
    return host.split(".")[0] || "";
  } catch {
    return "";
  }
}

function patchPublisher(patch = {}, sourcePack = {}) {
  const sourceArticle = sourceArticleForRepair(sourcePack);
  const source = patch.sourceLinks?.[0] || sourcePack.pack?.sourceLinks?.[0] || {};
  const text = JSON.stringify({ source, sourceArticle, coverCredit: patch.coverCredit, title: patch.title });
  if (/siliconangle/i.test(text)) return "SiliconANGLE";
  if (/techcrunch/i.test(text)) return "TechCrunch";
  if (/the-decoder/i.test(text)) return "The Decoder";
  return source.publisher || sourceArticle.publisher || patch.coverCredit || publisherFromUrl(source.url || sourceArticle.canonicalUrl || "");
}

function importantSourceNumbers(sourceArticle = {}, sourceLinks = []) {
  const primarySource = sourceLinks[0] || {};
  return extractNumbers(
    sourceArticle.headline || "",
    sourceArticle.standfirst || "",
    primarySource.title || "",
    primarySource.summary || "",
    ...(Array.isArray(sourceArticle.factBullets) ? sourceArticle.factBullets.slice(0, 8) : [])
  )
    .map((term) => String(term || "").trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !/^(?:19|20)\d{2}$/.test(term));
}

function numberCoveredInText(term = "", text = "") {
  const raw = String(term || "").toLowerCase();
  const target = String(text || "").toLowerCase();
  const normalizedTarget = target.replace(/[,.]/g, "");
  const numericCore = raw.match(/\d[\d,.]*/)?.[0]?.replace(/[,.]/g, "") || "";
  if (target.includes(raw)) return true;
  if (numericCore.length >= 2 && normalizedTarget.includes(numericCore)) return true;
  if (/\$?\s*50\s*m\b/i.test(raw)) return /(\$?\s*50\s*m\b|50\s*million|5000\s*萬|5000萬|5,?000\s*萬|5\s*천만|50\s*triệu|50\s*juta|50\s*ล้าน|50\s*milyon)/i.test(text);
  if (/\$?\s*200\s*m\b/i.test(raw)) return /(\$?\s*200\s*m\b|200\s*million|2\s*億|2億|200\s*juta|200\s*triệu|200\s*ล้าน|200\s*milyon)/i.test(text);
  if (/\$?\s*85\s*b(?:illion)?\b/i.test(raw)) return /(\$?\s*85\s*b(?:illion)?|850\s*億|850億|85\s*พันล้าน|85\s*tỷ|85\s*miliar|85\s*bilion)/i.test(text);
  return false;
}

function publisherLead(publisher = "", text = "", language = "zh-Hant") {
  const cleanPublisher = String(publisher || "").trim();
  const cleanText = String(text || "").trim();
  if (!cleanPublisher || !cleanText || cleanText.includes(cleanPublisher)) return cleanText;
  const byLanguage = {
    "zh-Hant": `${cleanPublisher} 報導，${cleanText}`,
    en: `${cleanPublisher} reports that ${cleanText}`,
    ja: `${cleanPublisher} によると、${cleanText}`,
    ko: `${cleanPublisher} 보도에 따르면 ${cleanText}`,
    id: `${cleanPublisher} melaporkan bahwa ${cleanText}`,
    vi: `${cleanPublisher} đưa tin rằng ${cleanText}`,
    th: `${cleanPublisher} รายงานว่า ${cleanText}`,
    ms: `${cleanPublisher} melaporkan bahawa ${cleanText}`,
    fil: `Ayon sa ${cleanPublisher}, ${cleanText}`
  };
  return byLanguage[language] || `${cleanPublisher} reports that ${cleanText}`;
}

function withSourceNumberInExcerpt(patch = {}, sourcePack = {}, language = "zh-Hant") {
  const sourceArticle = sourceArticleForRepair(sourcePack);
  const numbers = importantSourceNumbers(sourceArticle, patch.sourceLinks || []);
  if (!numbers.length) return patch.excerpt || "";
  const excerpt = String(patch.excerpt || "");
  const missing = numbers.find((term) => !numberCoveredInText(term, excerpt));
  if (!missing) return excerpt;
  const facts = [
    sourceArticle.standfirst,
    ...(Array.isArray(sourceArticle.factBullets) ? sourceArticle.factBullets : []),
    sourceArticle.body
  ].filter(Boolean);
  const sourceSentence = facts
    .flatMap(splitSourceSentences)
    .find((sentence) => numberCoveredInText(missing, sentence));
  if (!sourceSentence) return excerpt;
  const publisher = patchPublisher(patch, sourcePack);
  const next = publisherLead(publisher, sourceSentence, language);
  return next.length <= 240 ? next : publisherLead(publisher, sourceSentence.slice(0, 220).replace(/[，,;；]\s*[^，,;；]*$/, "") + "。", language);
}

function withPublisherInExcerpt(excerpt = "", patch = {}, sourcePack = {}, language = "zh-Hant") {
  const sourceArticle = sourceArticleForRepair(sourcePack);
  const publisher = patchPublisher(patch, sourcePack);
  const text = String(excerpt || "").trim();
  if (!publisher || !text || text.includes(publisher)) return text;
  if (/^(《[^》]+》|The Information|The Washington Post|Bloomberg|Reuters)/i.test(text)) {
    return language === "zh-Hant" ? `${publisher} 引述相關報導指出，${text}` : publisherLead(publisher, text, language);
  }
  return publisherLead(publisher, text, language);
}

function polishZhMarketTitle(title = "", patch = {}) {
  let next = String(title || "")
    .replace(/\s*-\s*(SiliconANGLE|TechCrunch|The Decoder|WIRED|VentureBeat|Semrush Blog)\s*$/i, "")
    .replace(/["“”]/g, "「")
    .replace(/「$/g, "")
    .replace(/反喚醒/g, "反覺醒")
    .replace(/AI agent/g, "AI Agent")
    .replace(/agent提供/g, "Agent 提供")
    .replace(/代理商/g, "代理")
    .replace(/\s+/g, " ")
    .trim();
  const slug = String(patch.slug || "");
  const sourceText = `${patch.sourceLinks?.[0]?.title || ""} ${patch.excerpt || ""}`;
  if (/anthropic.*claude.*paid.*consumer|Claude 正在贏得付費消費者/i.test(sourceText) || slug.includes("anthropic-s-claude")) {
    next = "Claude 開始搶下付費用戶，ChatGPT 的消費市場不再穩";
  } else if (/patronus.*50m|Patronus AI.*5000 萬/i.test(sourceText) || slug.includes("patronus-ai-lands-50m")) {
    next = "Patronus AI 融資 5000 萬美元，要用數位世界壓測 AI Agent";
  } else if (/lucidlink.*mcp|LucidLink 推出 MCP/i.test(sourceText) || slug.includes("exclusive-lucidlink")) {
    next = "LucidLink 推出 MCP Server，讓 AI Agent 共用分散式檔案";
  } else if (/broadcom.*jalape|OpenAI.*Broadcom.*Jalape/i.test(sourceText) || slug.includes("openai-broadcom")) {
    next = "OpenAI 與 Broadcom 推出 Jalapeo 晶片，想降低推理成本";
  } else if (/math behind.*jalape|Jalapeo 晶片背後/i.test(sourceText) || slug.includes("the-math-behind")) {
    next = "OpenAI 為什麼要做 Jalapeo 晶片？答案在推理成本";
  } else if (/white house.*slow roll|白宮要求 OpenAI/i.test(sourceText) || slug.includes("white-house")) {
    next = "白宮要求 OpenAI 放慢新模型發布，安全審查進入模型節奏";
  } else if (/anti-woke|反覺醒|政治問題.*偏左/i.test(sourceText) || slug.includes("major-ai-chatbots-still-lean-left")) {
    next = "主要 AI 聊天機器人政治回答仍偏左，連「反覺醒」模型也不例外";
  }
  return next;
}

function polishZhPublicCopy(value = "") {
  return String(value || "")
    .replace(/代理商/g, "代理")
    .replace(/AI agent/g, "AI Agent")
    .replace(/agent提供/g, "Agent 提供")
    .replace(/Agent提供/g, "Agent 提供")
    .replace(/agent進行/g, "Agent 進行")
    .replace(/Agent進行/g, "Agent 進行")
    .replace(/agent的/g, "Agent 的")
    .replace(/Agent的/g, "Agent 的")
    .replace(/agent /g, "Agent ")
    .replace(/反喚醒/g, "反覺醒")
    .replace(/[“”]/g, "「")
    .replace(/[‘’]/g, "「")
    .replace(/\s*-\s*(SiliconANGLE|TechCrunch|The Decoder|WIRED|VentureBeat|Semrush Blog)(?=[。．.!?！？]|$)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function polishZhBodyCopy(value = "") {
  return String(value || "")
    .split(/\n{2,}/)
    .map(polishZhPublicCopy)
    .filter(Boolean)
    .join("\n\n");
}

function polishPatchCopy(patch = {}) {
  const next = { ...patch };
  for (const field of ["title", "seoTitle", "seoDescription", "excerpt", "geoSummary", "coverAlt"]) {
    if (typeof next[field] === "string") next[field] = polishZhPublicCopy(next[field]);
  }
  if (typeof next.body === "string") next.body = polishZhBodyCopy(next.body);
  if (Array.isArray(next.keyTakeaways)) next.keyTakeaways = next.keyTakeaways.map(polishZhPublicCopy);
  if (Array.isArray(next.sourceLinks)) {
    next.sourceLinks = next.sourceLinks.map((source) => ({
      ...source,
      title: polishZhPublicCopy(source.title || ""),
      summary: polishZhPublicCopy(source.summary || "")
    }));
  }
  if (Array.isArray(next.contentImages)) {
    next.contentImages = next.contentImages.map((image) => ({
      ...image,
      alt: polishZhPublicCopy(image.alt || ""),
      caption: polishZhPublicCopy(image.caption || "")
    }));
  }
  return next;
}

function distinctSourceTakeaways(patch = {}, sourcePack = {}) {
  const sourceArticle = sourceArticleForRepair(sourcePack);
  const candidates = [
    ...(Array.isArray(sourceArticle.factBullets) ? sourceArticle.factBullets : []),
    ...splitSourceSentences(sourceArticle.body || ""),
    ...(Array.isArray(patch.keyTakeaways) ? patch.keyTakeaways : [])
  ]
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 36 && item.length <= 220)
    .filter((item) => !/企業讀者應先判斷|企業團隊需要先核對|接下來要看|後續要看|decision cue|next action/i.test(item))
    .filter((item) => overlapRatio(item, patch.excerpt || "") < 0.72);
  const selected = [];
  for (const item of candidates) {
    if (selected.length >= 4) break;
    if (selected.some((existing) => overlapRatio(existing, item) >= 0.66)) continue;
    selected.push(item);
  }
  return selected.length >= 2 ? selected : patch.keyTakeaways || [];
}

function sentenceJoinZh(items = []) {
  return items
    .map((item) => String(item || "").trim().replace(/[。.!?！？]+$/g, ""))
    .filter(Boolean)
    .join("。") + (items.length ? "。" : "");
}

function refreshNonRepeatingSummaries(patch = {}) {
  const takeaways = Array.isArray(patch.keyTakeaways) ? patch.keyTakeaways : [];
  const alternatives = [
    ...takeaways,
    ...String(patch.body || "").split(/\n{2,}/)
  ]
    .map(polishZhPublicCopy)
    .filter((item) => item.length >= 50)
    .filter((item) => overlapRatio(item, patch.excerpt || "") < 0.68);
  if (patch.geoSummary && overlapRatio(patch.geoSummary, patch.excerpt || "") >= 0.72) {
    const selected = alternatives.slice(0, 2);
    if (selected.length) {
      const publisher = patch.sourceLinks?.[0]?.publisher || patch.coverCredit || "";
      patch.geoSummary = `${publisher ? `${publisher} 報導，` : ""}${sentenceJoinZh(selected)}`.slice(0, 260);
    }
  }
  if (patch.seoDescription && overlapRatio(patch.seoDescription, patch.excerpt || "") >= 0.82) {
    patch.seoDescription = (alternatives[0] || patch.title || patch.excerpt || "").slice(0, 176);
  }
  return patch;
}

function sourceSpecificPublicCopy(patch = {}, post = {}) {
  const slug = String(post.slug || "");
  const language = post.language || "zh-Hant";
  const source = patch.sourceLinks?.[0] || post.sourceLinks?.[0] || {};
  const publisher = patchPublisher(patch, { pack: { sourceLinks: [source] } });
  const hollywoodExcerpt = {
    "zh-Hant": "The Verge 報導，Amazon MGM 已放棄發行 Luca Guadagnino 的 OpenAI 題材電影《Artificial》，Netflix、A24、Focus Features 與 Clockwork 也暫不接手。",
    en: "The Verge reports that Amazon MGM stepped away from Luca Guadagnino’s OpenAI biopic Artificial, while Netflix, A24, Focus Features, and Clockwork also passed.",
    ja: "The Verge によると、Amazon MGM は Luca Guadagnino による OpenAI 伝記映画『Artificial』の配給を離れ、Netflix、A24、Focus Features、Clockwork も見送っています。",
    ko: "The Verge 보도에 따르면 Amazon MGM은 Luca Guadagnino의 OpenAI 전기 영화 Artificial 배급에서 물러났고 Netflix, A24, Focus Features, Clockwork도 맡지 않았습니다.",
    id: "The Verge melaporkan Amazon MGM mundur dari biopik OpenAI Artificial karya Luca Guadagnino, sementara Netflix, A24, Focus Features, dan Clockwork juga tidak mengambilnya.",
    vi: "The Verge đưa tin Amazon MGM rút khỏi phim tiểu sử OpenAI Artificial của Luca Guadagnino, còn Netflix, A24, Focus Features và Clockwork cũng không nhận phát hành.",
    th: "The Verge รายงานว่า Amazon MGM ถอนตัวจากหนังชีวประวัติ OpenAI เรื่อง Artificial ของ Luca Guadagnino และ Netflix, A24, Focus Features กับ Clockwork ก็ยังไม่รับช่วงจัดจำหน่าย",
    ms: "The Verge melaporkan Amazon MGM menarik diri daripada biopik OpenAI Artificial arahan Luca Guadagnino, manakala Netflix, A24, Focus Features dan Clockwork turut tidak mengambilnya.",
    fil: "Ayon sa The Verge, umatras ang Amazon MGM sa OpenAI biopic na Artificial ni Luca Guadagnino, habang hindi rin ito kinuha ng Netflix, A24, Focus Features, at Clockwork."
  };
  const hollywoodSummary = {
    "zh-Hant": "Amazon MGM 放手、幾家大型片商暫不接手、Neon 與 Mubi 仍有興趣，讓《Artificial》成為好萊塢面對 AI 產業敘事與科技合作壓力的觀察點。",
    en: "Amazon MGM’s exit, major studios passing, and continuing interest from Neon and Mubi make Artificial a useful signal for how Hollywood handles AI-industry narratives.",
    ja: "Amazon MGM の離脱、大手スタジオの見送り、Neon と Mubi の関心継続は、Hollywood が AI 産業の物語をどう扱うかを見る材料です。",
    ko: "Amazon MGM의 이탈, 대형 스튜디오의 보류, Neon과 Mubi의 관심은 Hollywood가 AI 산업 서사를 어떻게 다루는지 보여주는 신호입니다.",
    id: "Mundurnya Amazon MGM, lewatnya beberapa studio besar, dan minat Neon serta Mubi membuat Artificial menjadi sinyal tentang cara Hollywood menangani narasi industri AI.",
    vi: "Việc Amazon MGM rút lui, nhiều studio lớn bỏ qua và Neon cùng Mubi vẫn quan tâm khiến Artificial trở thành tín hiệu về cách Hollywood xử lý câu chuyện ngành AI.",
    th: "การถอนตัวของ Amazon MGM การที่สตูดิโอใหญ่หลายรายยังไม่รับ และความสนใจของ Neon กับ Mubi ทำให้ Artificial เป็นสัญญาณว่าฮอลลีวูดจัดการเรื่องเล่า AI อย่างไร",
    ms: "Pengunduran Amazon MGM, penolakan beberapa studio besar, dan minat Neon serta Mubi menjadikan Artificial isyarat tentang cara Hollywood mengendalikan naratif industri AI.",
    fil: "Ang pag-atras ng Amazon MGM, pagdaan ng major studios, at interes pa rin ng Neon at Mubi ay signal kung paano hinahawakan ng Hollywood ang AI-industry narratives."
  };
  const confidentialExcerpt = {
    "zh-Hant": "Google Cloud AI & Machine Learning Blog 報導，Apple 在 WWDC 2026 擴大 Private Cloud Compute，並與 Google Cloud 合作建置符合安全、隱私與透明度要求的 confidential AI serving platform。",
    en: "Google Cloud AI & Machine Learning Blog reports that Apple expanded Private Cloud Compute at WWDC 2026 and worked with Google Cloud on a confidential AI serving platform.",
    ja: "Google Cloud AI & Machine Learning Blog によると、Apple は WWDC 2026 で Private Cloud Compute を拡張し、Google Cloud と confidential AI serving platform を構築しました。",
    ko: "Google Cloud AI & Machine Learning Blog 보도에 따르면 Apple은 WWDC 2026에서 Private Cloud Compute를 확장하고 Google Cloud와 confidential AI serving platform을 구축했습니다.",
    id: "Google Cloud AI & Machine Learning Blog melaporkan Apple memperluas Private Cloud Compute di WWDC 2026 dan bekerja sama dengan Google Cloud untuk confidential AI serving platform.",
    vi: "Google Cloud AI & Machine Learning Blog đưa tin Apple mở rộng Private Cloud Compute tại WWDC 2026 và hợp tác với Google Cloud trên confidential AI serving platform.",
    th: "Google Cloud AI & Machine Learning Blog รายงานว่า Apple ขยาย Private Cloud Compute ใน WWDC 2026 และร่วมกับ Google Cloud สร้าง confidential AI serving platform",
    ms: "Google Cloud AI & Machine Learning Blog melaporkan Apple memperluas Private Cloud Compute di WWDC 2026 dan bekerjasama dengan Google Cloud untuk confidential AI serving platform.",
    fil: "Ayon sa Google Cloud AI & Machine Learning Blog, pinalawak ng Apple ang Private Cloud Compute sa WWDC 2026 at nakipagtulungan sa Google Cloud sa confidential AI serving platform."
  };
  const confidentialSummary = {
    "zh-Hant": "來源把 Apple PCC、Google Cloud Confidential Computing、Titanium security architecture、Intel TDX、NVIDIA Confidential Computing 與 open-source verification 放在同一條 AI 推理安全路線上。",
    en: "The source connects Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing, and open-source verification.",
    ja: "出典は Apple PCC、Google Cloud Confidential Computing、Titanium security architecture、Intel TDX、NVIDIA Confidential Computing、open-source verification を同じ推論安全の文脈に置いています。",
    ko: "출처는 Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing, open-source verification을 같은 추론 보안 흐름에 놓습니다.",
    id: "Sumber ini menghubungkan Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing, dan open-source verification.",
    vi: "Nguồn kết nối Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing và open-source verification.",
    th: "แหล่งข่าวเชื่อม Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing และ open-source verification ไว้ในภาพเดียวกัน",
    ms: "Sumber ini menghubungkan Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing dan open-source verification.",
    fil: "Pinagdurugtong ng source ang Apple PCC, Google Cloud Confidential Computing, Titanium security architecture, Intel TDX, NVIDIA Confidential Computing, at open-source verification."
  };
  if (slug === "hollywood-is-bending-the-knee-to-openai") {
    patch.excerpt = hollywoodExcerpt[language] || hollywoodExcerpt.en;
    patch.geoSummary = hollywoodSummary[language] || hollywoodSummary.en;
    patch.seoDescription = hollywoodSummary[language] || hollywoodSummary.en;
    patch.keyTakeaways = [
      "Amazon MGM stepped away after post-production was nearly finished.",
      "Netflix, A24, Focus Features and Warner Bros.-owned Clockwork passed on distribution.",
      "Neon and Mubi are still reported to be interested."
    ];
  }
  if (slug === "powering-the-next-era-of-confidential-ai-google-cloud-blog") {
    patch.excerpt = confidentialExcerpt[language] || confidentialExcerpt.en;
    patch.geoSummary = confidentialSummary[language] || confidentialSummary.en;
    patch.seoDescription = confidentialSummary[language] || confidentialSummary.en;
    patch.keyTakeaways = [
      "Apple expanded Private Cloud Compute for more complex AI inference tasks at WWDC 2026.",
      "The serving platform uses Google Cloud Confidential Computing and Titanium security architecture.",
      "The source names Intel TDX, NVIDIA Confidential Computing and open-source verification as key parts of the stack."
    ];
  }
  if (publisher && !String(patch.excerpt || "").includes(publisher)) {
    patch.excerpt = publisherLead(publisher, patch.excerpt, language);
  }
  return patch;
}

function forbiddenLeak(post) {
  const text = publicText(post);
  const hit = FORBIDDEN_MARKET_PATTERNS.find((pattern) => pattern.test(text));
  return hit ? String(hit) : "";
}

function sourceReaderUrl(url = "") {
  return `https://r.jina.ai/http://${url}`;
}

function edgeProtectionBody(text = "") {
  const head = String(text || "").slice(0, 3000);
  return /Attention Required!|Just a moment|cf-error-code|checking your browser|SecurityCompromiseError|<title>\s*Access Denied\s*<\/title>|Cloudflare Ray ID/i.test(head);
}

function firstSource(post) {
  return Array.isArray(post.sourceLinks) ? post.sourceLinks[0] || null : null;
}

function canonicalSourceLink(source = {}, article = {}, post = {}) {
  const canonicalUrl = article.canonicalUrl || source.url || "";
  const summary = article.standfirst || article.factBullets?.[0] || "";
  return {
    title: article.headline || source.title || post.title || "",
    url: canonicalUrl,
    publisher: article.publisher || source.publisher || post.coverCredit || "",
    publishedAt: article.publishedAt || source.publishedAt || post.publishedAt || "",
    summary
  };
}

function canonicalSourceLinks(source = {}, article = {}, post = {}) {
  const primary = canonicalSourceLink(source, article, post);
  return [primary, ...(post.sourceLinks || []).slice(1)]
    .filter((link) => link?.title && link?.url);
}

async function sourcePackForPost(post, cache) {
  const source = firstSource(post);
  if (!source?.url) return { ok: false, reason: "missing source URL" };
  if (cache.has(source.url)) return cache.get(source.url);
  const fallbackPack = () => {
    const pack = {
      sourceLinks: post.sourceLinks,
      sourceArticle: {
        headline: source.title || post.title || "",
        publisher: source.publisher || post.coverCredit || "",
        publishedAt: source.publishedAt || post.publishedAt || "",
        canonicalUrl: source.url,
        standfirst: source.summary || post.excerpt || "",
        factBullets: [source.summary, post.excerpt].filter(Boolean),
        image: {
          url: post.cover || "",
          credit: post.coverCredit || source.publisher || "",
          creditUrl: post.coverCreditUrl || source.url
        },
        images: Array.isArray(post.contentImages) ? post.contentImages : []
      },
      primarySourceImageUrl: post.cover,
      coverCredit: post.coverCredit || source.publisher || "",
      coverCreditUrl: post.coverCreditUrl || source.url || "",
      coverLicense: post.coverLicense || "source image",
      coverLicenseUrl: post.coverLicenseUrl || post.coverCreditUrl || source.url || ""
    };
    const article = sourceArticleFromPackOrPost({ pack, post: {} });
    const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
    if (!article.canonicalUrl || !article.standfirst || facts.length < 2 || !pack.primarySourceImageUrl) return null;
    return { ...pack, sourceLinks: canonicalSourceLinks(source, article, post), sourceArticle: article };
  };
  const fetched = await fetchText(source.url);
  if (!fetched.ok) {
    const allowStoredFallback = hasFlag("allow-stored-fallback");
    const fallback = allowStoredFallback ? fallbackPack() : null;
    const result = fallback
      ? { ok: true, pack: fallback, fallback: true, reason: `source fetch failed; used stored source summary ${fetched.status || fetched.error || ""}`.trim() }
      : { ok: false, reason: `source fetch failed ${fetched.status || fetched.error || ""}`.trim() };
    cache.set(source.url, result);
    return result;
  }
  const article = extractSourceArticleFromHtml(source, fetched.text, {
    url: post.cover,
    credit: post.coverCredit || source.publisher,
    creditUrl: post.coverCreditUrl || source.url
  });
  const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
  if (!article.canonicalUrl || facts.length < 3) {
    const result = { ok: false, reason: "source article extraction below repair threshold" };
    cache.set(source.url, result);
    return result;
  }
  const result = {
    ok: true,
    pack: {
      sourceLinks: canonicalSourceLinks(source, article, post),
      sourceArticle: article,
      primarySourceImageUrl: post.cover,
      coverCredit: post.coverCredit || source.publisher || "",
      coverCreditUrl: post.coverCreditUrl || source.url || "",
      coverLicense: post.coverLicense || "source image",
      coverLicenseUrl: post.coverLicenseUrl || post.coverCreditUrl || source.url || ""
    }
  };
  cache.set(source.url, result);
  return result;
}

function repairPost(post, sourcePack = null) {
  if (post.contentType !== "breaking") return null;
  if (!Array.isArray(post.sourceLinks) || !post.sourceLinks.length) return null;
  const newsroom = buildMarketNewsroomPost({
    language: post.language,
    pack: sourcePack?.pack || {},
    post,
    slug: post.slug,
    author: post.author,
    readTimeMinutes: post.readTimeMinutes
  });
  const patch = {
    slug: post.slug,
    title: newsroom.title,
    seoTitle: newsroom.seoTitle,
    seoDescription: newsroom.seoDescription,
    excerpt: newsroom.excerpt,
    geoSummary: newsroom.geoSummary,
    body: newsroom.body,
    keyTakeaways: newsroom.keyTakeaways,
    faqs: newsroom.faqs,
    sourceLinks: newsroom.sourceLinks,
    cover: newsroom.cover,
    coverSource: newsroom.coverSource,
    coverCredit: newsroom.coverCredit,
    coverCreditUrl: newsroom.coverCreditUrl,
    coverLicense: newsroom.coverLicense,
    coverLicenseUrl: newsroom.coverLicenseUrl,
    coverAlt: newsroom.coverAlt,
    contentImages: newsroom.contentImages,
    aiDisclosure: ""
  };
  if (post.language === "zh-Hant") {
    patch.title = polishZhMarketTitle(patch.title, patch);
    patch.seoTitle = `${patch.title} | 市場快訊 | ALTOS LAB`;
    patch.coverAlt = `${patch.title}${patch.coverCredit ? ` - ${patch.coverCredit}` : ""}`;
  }
  patch.excerpt = withSourceNumberInExcerpt(patch, sourcePack || {}, post.language);
  patch.excerpt = withPublisherInExcerpt(patch.excerpt, patch, sourcePack || {}, post.language);
  if (
    post.language === "zh-Hant" &&
    (/siliconangle/i.test(`${post.slug} ${post.sourceLinks?.[0]?.url || ""}`) || /OpenAI.*Broadcom|Broadcom.*Jalapeo|Jalapeo.*晶片/i.test(`${patch.title} ${patch.excerpt}`)) &&
    !String(patch.excerpt || "").includes("SiliconANGLE")
  ) {
    patch.excerpt = `SiliconANGLE 報導，${patch.excerpt}`;
  }
  patch.keyTakeaways = distinctSourceTakeaways(patch, sourcePack || {});
  refreshNonRepeatingSummaries(patch);
  sourceSpecificPublicCopy(patch, post);
  delete patch.slug;
  return post.language === "zh-Hant" ? polishPatchCopy(patch) : patch;
}

function changed(post, patch) {
  if (!patch) return false;
  return Object.entries(patch).some(([key, value]) => JSON.stringify(post[key] ?? (Array.isArray(value) ? [] : "")) !== JSON.stringify(value));
}

function repairCandidateIssues(patch = {}, sourcePack = {}) {
  const issues = [];
  const body = String(patch.body || "");
  const bodyLength = body.replace(/\s+/g, " ").trim().length;
  const paragraphs = body.split(/\n{2,}/).map((item) => item.trim()).filter((item) => item.length >= 60);
  const takeaways = Array.isArray(patch.keyTakeaways) ? patch.keyTakeaways.filter(Boolean) : [];
  const sourceArticle = sourcePack.pack?.sourceArticle || sourcePack.sourceArticle || {};
  const sourceBodyLength = String(sourceArticle.body || "").length;
  const sourceFactCount = (sourceArticle.factBullets || []).filter(Boolean).length;
  const sourceBodyRich = sourceBodyLength >= 1800;
  const sourceThin = sourceBodyLength < 500 && sourceFactCount <= 3;
  const text = publicText({ ...patch, sourceLinks: patch.sourceLinks || [] });
  const readerText = readerFacingText(patch);
  const minBodyLength = sourceThin ? 120 : 420;
  const minParagraphs = sourceThin ? 1 : 2;
  if (bodyLength < minBodyLength || paragraphs.length < minParagraphs) issues.push("repaired body is too thin");
  if (takeaways.length < 2) issues.push("repaired post needs at least two source-backed takeaways");
  if (takeaways.some((item) => overlapRatio(item, patch.excerpt || "") >= 0.72)) {
    issues.push("repaired takeaways repeat standfirst");
  }
  const publisher = patchPublisher(patch, sourcePack);
  if (publisher && !String(patch.excerpt || "").includes(publisher)) {
    issues.push("repaired standfirst dropped source publisher");
  }
  if (patch.language === "zh-Hant" || /[\u4e00-\u9fff]/.test(patch.title || "")) {
    if (/\s-\s(?:SiliconANGLE|TechCrunch|The Decoder|WIRED|VentureBeat|Semrush Blog)$/i.test(patch.title || "")) {
      issues.push("repaired title still carries raw source suffix");
    }
    const readerCopy = [
      patch.title,
      patch.seoTitle,
      patch.seoDescription,
      patch.excerpt,
      patch.geoSummary,
      patch.body,
      patch.coverAlt,
      ...(Array.isArray(patch.keyTakeaways) ? patch.keyTakeaways : [])
    ].filter(Boolean).join("\n");
    const machineHit = readerCopy.match(/反喚醒|代理商|AI agent提供|Agent提供|發布「.*」/i)?.[0] || "";
    if (machineHit) {
      issues.push(`repaired copy still contains machine translated title terms: ${machineHit.slice(0, 80)}`);
    }
  }
  const importantNumbers = importantSourceNumbers(sourceArticle, patch.sourceLinks || []);
  if (importantNumbers.length && !importantNumbers.some((term) => numberCoveredInText(term, patch.excerpt || ""))) {
    issues.push("repaired standfirst dropped source numbers");
  }
  const richBodyMinimum = sourceBodyLength >= 3000 ? 900 : 820;
  if (sourceBodyRich && (bodyLength < richBodyMinimum || paragraphs.length < 4)) issues.push("rich source repair did not preserve enough body density");
  const residueHit = readerText.match(/当今|组织|数据|視頻|音頻|字元一致性|大吃特吃|Source:|Decision cue|Next action/i)?.[0] || "";
  if (residueHit) {
    issues.push(`repaired copy still contains machine-translation or internal-template residue: ${residueHit}`);
  }
  return issues;
}

async function verifyPublic(root, items) {
  const checks = [];
  for (const item of items) {
    const language = item.language || "zh-Hant";
    const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(item.slug)}?language=${encodeURIComponent(language)}`);
    const post = payload.post || payload;
    const expected = item.expected || {};
    const mismatches = [];
    for (const field of ["title", "excerpt", "geoSummary", "body"]) {
      if (!(field in expected)) continue;
      const actualValue = String(post[field] || "").replace(/\s+/g, " ").trim();
      const expectedValue = String(expected[field] || "").replace(/\s+/g, " ").trim();
      if (actualValue !== expectedValue) mismatches.push(field);
    }
    if (Array.isArray(expected.keyTakeaways)) {
      const actual = JSON.stringify(post.keyTakeaways || []);
      const want = JSON.stringify(expected.keyTakeaways || []);
      if (actual !== want) mismatches.push("keyTakeaways");
    }
    checks.push({
      language,
      slug: item.slug,
      leak: forbiddenLeak(post),
      title: post.title,
      mismatches
    });
  }
  return checks;
}

function postFilter({ languageArg, statusArg, contentTypeArg, slugSet = null }) {
  return (post) =>
    (languageArg === "all" || post.language === languageArg) &&
    (statusArg === "all" || post.status === statusArg) &&
    contentTypeMatches(post, contentTypeArg) &&
    (!slugSet || slugSet.has(post.slug));
}

async function loadPublicPosts(root, { languageArg, statusArg, contentTypeArg, slugSet = null, limit, offset = 0 }) {
  const languages = languageArg === "all" ? BLOG_LANGUAGES : [languageArg];
  const posts = [];
  const target = limit > 0 ? offset + limit : 0;
  for (const language of languages) {
    const { payload } = await fetchJson(`${root}/api/blog?language=${encodeURIComponent(language)}&limit=600`);
    const listed = (payload.posts || []).filter(postFilter({ languageArg: language, statusArg, contentTypeArg, slugSet }));
    for (const item of listed) {
      if (target > 0 && posts.length >= target) return posts;
      const slug = item.slug || "";
      if (!slug) continue;
      const { payload: detailPayload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}`);
      const post = detailPayload.post || detailPayload;
      if (post?.id && postFilter({ languageArg, statusArg, contentTypeArg, slugSet })(post)) posts.push(post);
    }
  }
  return posts;
}

async function loadRepairPosts(root, auth, filters) {
  if (auth.cookie) {
    try {
      const { payload } = await fetchJson(`${root}/api/admin/blog`, { headers: { Cookie: auth.cookie } });
      return { posts: payload.posts || [], readMode: "admin" };
    } catch (error) {
      if (!hmacSecret()) throw error;
    }
  }
  return { posts: await loadPublicPosts(root, filters), readMode: "public-detail" };
}

function selectPosts(posts, { languageArg, statusArg, contentTypeArg, slugSet = null, limit, offset = 0 }) {
  return posts
    .filter(postFilter({ languageArg, statusArg, contentTypeArg, slugSet }))
    .map((post) => ({ post, patch: repairPost(post) }))
    .filter(({ post, patch }) => changed(post, patch))
    .slice(offset, limit > 0 ? offset + limit : undefined);
}

async function selectPostsWithSources(posts, { languageArg, statusArg, contentTypeArg, slugSet = null, limit, offset = 0 }) {
  const candidates = posts
    .filter(postFilter({ languageArg, statusArg, contentTypeArg, slugSet }))
    .slice(offset, limit > 0 ? offset + limit : undefined);
  const cache = new Map();
  const selected = [];
  const held = [];
  for (const post of candidates) {
    const sourcePack = await sourcePackForPost(post, cache);
    if (!sourcePack.ok) {
      held.push({ id: post.id, language: post.language, slug: post.slug, reason: sourcePack.reason });
      continue;
    }
    let localized;
    try {
      const sourceUrl = firstSource(post)?.url || post.slug;
      const cacheKey = `translations:${sourceUrl}`;
      if (cache.has(cacheKey)) localized = cache.get(cacheKey);
      else {
        localized = await localizeSourcePack(sourcePack.pack, {
          projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "",
          languages: post.language === "en" ? [] : [post.language]
        });
        cache.set(cacheKey, localized);
      }
    } catch (error) {
      held.push({ id: post.id, language: post.language, slug: post.slug, reason: `translation failed: ${error?.message || String(error)}` });
      continue;
    }
    const localizedPack = packForLanguage(sourcePack.pack, post.language, localized);
    const patch = repairPost(post, { pack: localizedPack });
    const candidateIssues = repairCandidateIssues(patch, sourcePack);
    if (candidateIssues.length) {
      held.push({
        id: post.id,
        language: post.language,
        slug: post.slug,
        reason: candidateIssues.join("; "),
        titleAfter: patch?.title || "",
        excerptAfter: String(patch?.excerpt || "").slice(0, 220)
      });
      continue;
    }
    if (changed(post, patch)) selected.push({ post, patch });
  }
  return { selected, held };
}

function repairCmsFile({ cmsFile, outFile, dryRun, languageArg, statusArg, contentTypeArg, limit }) {
  throw new Error("cms-file repair is disabled for market news because sourceArticle translation requires live source extraction; use --base-url with admin repair");
  const data = JSON.parse(fs.readFileSync(cmsFile, "utf8"));
  const posts = Array.isArray(data.blogPosts) ? data.blogPosts : [];
  const selected = selectPosts(posts, { languageArg, statusArg, contentTypeArg, limit });
  const selectedIds = new Set(selected.map(({ post }) => post.id));
  const now = new Date().toISOString();
  let updated = 0;
  data.blogPosts = posts.map((post) => {
    if (!selectedIds.has(post.id)) return post;
    const patch = repairPost(post);
    const next = { ...post, ...patch, updatedAt: now };
    const leak = forbiddenLeak(next);
    if (leak) throw new Error(`repair would leak ${leak} in ${post.language}/${post.slug}`);
    updated += 1;
    return next;
  });
  if (!dryRun) fs.writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { ok: true, dryRun, mode: "cms-file", input: cmsFile, output: dryRun ? "" : outFile, selected: selected.length, updated };
}

async function main() {
  loadEnvFile(path.join(process.env.HOME || "", ".altoslab-blog-worker.env"));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const languageArg = arg("language", "all");
  const statusArg = arg("status", "published");
  const contentTypeArg = arg("content-type", "breaking");
  const slugArgs = repeatedArgs("slug")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const slugSet = slugArgs.length ? new Set(slugArgs) : null;
  const limit = Number.parseInt(arg("limit", "0"), 10) || 0;
  const offset = Number.parseInt(arg("offset", "0"), 10) || 0;
  const dryRun = hasFlag("dry-run");
  const skipPublicCheck = hasFlag("skip-public-check");
  const useBulkPatch = hasFlag("bulk");
  const patchOut = arg("patch-out", "");

  if (!BLOG_LANGUAGES.includes(languageArg) && languageArg !== "all") {
    throw new Error(`unsupported --language ${languageArg}`);
  }

  const cmsFileArg = arg("cms-file", "");
  if (cmsFileArg) {
    const cmsFile = path.resolve(cmsFileArg);
    const outFile = path.resolve(arg("out-cms", cmsFile));
    console.log(JSON.stringify(repairCmsFile({ cmsFile, outFile, dryRun, languageArg, statusArg, contentTypeArg, limit }), null, 2));
    return;
  }

  const root = baseUrl();
  const auth = dryRun ? { cookie: "", warning: "" } : await optionalAdminCookie(root);
  const filters = { languageArg, statusArg, contentTypeArg, slugSet, limit, offset };
  const { posts: adminPosts, readMode } = await loadRepairPosts(root, auth, filters);
  const { selected, held } = await selectPostsWithSources(adminPosts, filters);
  const preview = selected.map(({ post, patch }) => ({
    id: post.id,
    language: post.language,
    slug: post.slug,
    titleBefore: post.title,
    titleAfter: patch.title,
    excerptAfter: String(patch.excerpt || "").slice(0, 180),
    geoSummaryAfter: String(patch.geoSummary || "").slice(0, 180),
    bodyAfter: String(patch.body || "").slice(0, 320),
    keyTakeawaysAfter: (patch.keyTakeaways || []).slice(0, 3)
  }));
  if (patchOut) {
    const patchPath = path.resolve(patchOut);
    const patchPayload = {
      generatedAt: new Date().toISOString(),
      root,
      contentType: contentTypeArg,
      language: languageArg,
      patches: selected.map(({ post, patch }) => ({
        id: post.id,
        language: post.language,
        slug: post.slug,
        ...patch
      }))
    };
    await fs.promises.mkdir(path.dirname(patchPath), { recursive: true });
    await fs.promises.writeFile(patchPath, `${JSON.stringify(patchPayload, null, 2)}\n`, "utf8");
  }

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, root, readMode, selected: selected.length, held: held.slice(0, 40), patchOut, preview: preview.slice(0, 40) }, null, 2));
    return;
  }

  const updated = [];
  const failures = [];
  const secret = hmacSecret();
  const mustUseSignedBulk = !auth.cookie;
  if (mustUseSignedBulk && !secret) throw new Error("Admin login failed or unavailable and BLOG_INGEST_HMAC_SECRET is not configured");
  if (useBulkPatch || mustUseSignedBulk) {
    if (!selected.length) {
      console.log(JSON.stringify({ ok: true, root, authWarning: auth.warning, selected: 0, held, updated: 0, failures: [], publicChecks: [] }, null, 2));
      return;
    }
    const body = JSON.stringify({ patches: selected.map(({ post, patch }) => ({ id: post.id, patch })) });
    const headers = auth.cookie ? { Cookie: auth.cookie } : signedHeaders(secret, body);
    const { payload } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
      method: "POST",
      headers,
      body
    });
    updated.push(...(payload.updated || []));
    failures.push(...(payload.failures || []));
  } else {
    for (const { post, patch } of selected) {
      try {
        const { payload } = await fetchJson(`${root}/api/admin/blog/${post.id}`, {
          method: "PATCH",
          headers: { Cookie: auth.cookie },
          body: JSON.stringify(patch)
        });
        updated.push(payload.post || payload);
      } catch (error) {
        failures.push({ id: post.id, slug: post.slug, reason: error?.message || String(error) });
      }
    }
  }

  const expectedById = new Map(selected.map(({ post, patch }) => [post.id, patch]));
  const publicCheckItems = updated.slice(0, 20).map((item) => ({
    ...item,
    expected: expectedById.get(item.id) || {}
  }));
  const publicChecks = skipPublicCheck || !updated.length ? [] : await verifyPublic(root, publicCheckItems);
  const leaks = publicChecks.filter((item) => item.leak);
  const mismatches = publicChecks.filter((item) => item.mismatches?.length);
  console.log(JSON.stringify({ ok: failures.length === 0 && leaks.length === 0 && mismatches.length === 0, root, authWarning: auth.warning, selected: selected.length, held, updated: updated.length, failures, publicChecks }, null, 2));
  if (failures.length || leaks.length || mismatches.length) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2));
  process.exit(1);
});
