#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const MIN_EXCERPT_LENGTH = 82;
const MAX_EXCERPT_LENGTH = 238;
const MIN_SEO_DESCRIPTION_LENGTH = 92;
const MAX_SEO_DESCRIPTION_LENGTH = 176;

const BAD_PUBLIC_PATTERNS = [
  /這則消息可以拿來[^。\n]*(?:。|\n)?/gi,
  /企業檢查[^。\n]*(?:。|\n)?/gi,
  /兩週內先跑[^。\n]*(?:。|\n)?/gi,
  /選一個高頻但風險可控[^。\n]*(?:。|\n)?/gi,
  /下一步先看三個指標[^。\n]*(?:。|\n)?/gi,
  /Source:\s*[^。\n]*(?:。|\n)?/gi,
  /Event:\s*[^。\n]*(?:。|\n)?/gi,
  /Evidence:\s*[^。\n]*(?:。|\n)?/gi,
  /Decision cue[^。\n]*(?:。|\n)?/gi,
  /Next action[^.\n]*(?:\.|\n)?/gi,
  /來源可引用摘要[:：]?/gi,
  /Source summary[:：]?/gi,
  /出典要約[:：]?/gi,
  /출처 요약[:：]?/gi,
  /Ringkasan sumber[:：]?/gi,
  /Tóm tắt nguồn[:：]?/gi,
  /สรุปแหล่งที่มา[:：]?/gi,
  /Buod ng sanggunian[:：]?/gi,
  /source[- ]translation/gi,
  /quality gate/gi,
  /pipeline/gi,
  /SEO\s*\/\s*GEO/gi
];

const AUDIO_NOISE_PATTERNS = [
  /使用者的瀏覽器不支援音訊元素[。.]?/gi,
  /你的瀏覽器不支援音訊元素[。.]?/gi,
  /your browser does not support the audio element[.]?/gi,
  /ブラウザは音声要素をサポートしていません[。.]?/gi,
  /브라우저가 오디오 요소를 지원하지 않습니다[.]?/gi,
  /browser (?:Anda|tidak) (?:tidak )?mendukung elemen audio[.]?/gi,
  /trình duyệt của bạn không hỗ trợ phần tử âm thanh[.]?/gi,
  /เบราว์เซอร์ของคุณไม่รองรับองค์ประกอบเสียง[.]?/gi,
  /pelayar anda tidak menyokong elemen audio[.]?/gi,
  /hindi sinusuportahan ng iyong browser ang audio element[.]?/gi
];

const LANGUAGE_CONFIG = {
  "zh-Hant": {
    reportVerb: "報導",
    sourceCue: "來源指出",
    citationCue: "重點摘要",
    titleQuote: (title) => `「${title}」`,
    excerpt: ({ publisher, title, fact }) => `${publisher} 報導，${title}；${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} 報導 ${title}。${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} 報導 ${title}。${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} 報導 ${title}。${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  en: {
    reportVerb: "reports",
    sourceCue: "The source says",
    citationCue: "Quick summary",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher} reports ${title}; ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} reports ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} reports ${title}. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} reports ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  ja: {
    reportVerb: "報じました",
    sourceCue: "出典によると",
    citationCue: "出典要約",
    titleQuote: (title) => `「${title}」`,
    excerpt: ({ publisher, title, fact }) => `${publisher} は ${title} と報じました。${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} は ${title} と報じました。${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} は ${title} と報じました。${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} は ${title} と報じました。${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  ko: {
    reportVerb: "보도했습니다",
    sourceCue: "출처에 따르면",
    citationCue: "출처 요약",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher}는 ${title}라고 보도했습니다. ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher}는 ${title}라고 보도했습니다. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher}는 ${title}라고 보도했습니다. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher}는 ${title}라고 보도했습니다. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  id: {
    reportVerb: "melaporkan",
    sourceCue: "Sumber itu menyebut",
    citationCue: "Ringkasan sumber",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher} melaporkan ${title}. ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} melaporkan ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} melaporkan ${title}. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} melaporkan ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  vi: {
    reportVerb: "đưa tin",
    sourceCue: "Nguồn tin cho biết",
    citationCue: "Tóm tắt nguồn",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher} đưa tin ${title}. ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} đưa tin ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} đưa tin ${title}. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} đưa tin ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  th: {
    reportVerb: "รายงาน",
    sourceCue: "แหล่งข่าวระบุว่า",
    citationCue: "สรุปแหล่งที่มา",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher} รายงาน ${title} ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} รายงาน ${title} ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} รายงาน ${title} ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} รายงาน ${title} ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  ms: {
    reportVerb: "melaporkan",
    sourceCue: "Sumber menyatakan",
    citationCue: "Ringkasan sumber",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `${publisher} melaporkan ${title}. ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `${publisher} melaporkan ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `${publisher} melaporkan ${title}. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `${publisher} melaporkan ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  },
  fil: {
    reportVerb: "iniulat",
    sourceCue: "Ayon sa pinagmulan",
    citationCue: "Buod ng sanggunian",
    titleQuote: (title) => title,
    excerpt: ({ publisher, title, fact }) => `Iniulat ng ${publisher} ang ${title}. ${fact}`,
    geo: ({ publisher, title, fact, secondFact }) => `Iniulat ng ${publisher} ang ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`,
    seo: ({ publisher, title, fact }) => `Iniulat ng ${publisher} ang ${title}. ${fact}`,
    lead: ({ publisher, title, fact, secondFact }) => `Iniulat ng ${publisher} ang ${title}. ${fact}${secondFact ? ` ${secondFact}` : ""}`
  }
};

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function decodeEntities(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(value = "") {
  let text = decodeEntities(value)
    .replace(/\r/g, "")
    .replace(/[–—]/g, "-")
    .replace(/([,，]){2,}/g, "$1")
    .replace(/\s+([。！？.!?])/g, "$1");
  for (const pattern of AUDIO_NOISE_PATTERNS) text = text.replace(pattern, " ");
  for (const pattern of BAD_PUBLIC_PATTERNS) text = text.replace(pattern, " ");
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,，;；])/g, "$1")
    .replace(/([。.!?！？]){2,}/g, "$1")
    .trim();
}

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function sourcePublisher(post) {
  const source = post.sourceLinks?.[0] || {};
  if (source.publisher) return cleanText(source.publisher);
  try {
    return new URL(source.url || "").hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function sourceTitle(post) {
  const source = post.sourceLinks?.[0] || {};
  return cleanText(post.title || source.title || post.topic || "AI market update");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitParagraphs(body = "") {
  return cleanText(body)
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^##\s*(事件重點|關鍵事實|背景|後續觀察)\s*$/i.test(item))
    .filter((item) => !/^(事件重點|關鍵事實|背景|後續觀察)$/i.test(item));
}

function splitSentences(text = "") {
  return cleanText(text)
    .replace(/([。.!?！？])\s+/g, "$1\n")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 18)
    .filter((item) => !AUDIO_NOISE_PATTERNS.some((pattern) => pattern.test(item)));
}

function factCandidates(post) {
  const source = post.sourceLinks?.[0] || {};
  const sourceFacts = [source.summary, post.geoSummary, post.excerpt, ...(post.keyTakeaways || [])]
    .filter(Boolean)
    .flatMap((item) => splitSentences(String(item)));
  const bodyFacts = splitParagraphs(post.body)
    .filter((paragraph) => !/^##\s+/i.test(paragraph))
    .flatMap((paragraph) => splitSentences(paragraph));
  const seen = new Set();
  return [...sourceFacts, ...bodyFacts]
    .map((item) => cleanSentence(item))
    .filter((item) => item.length >= 24)
    .filter((item) => {
      const key = item.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanSentence(value = "") {
  return cleanText(value)
    .replace(/^[-*]\s+/, "")
    .replace(/^#+\s+/, "")
    .replace(/^(?:來源指出|Source summary:|Source:|出典要約：|출처 요약:|Ringkasan sumber:|Tóm tắt nguồn:|สรุปแหล่งที่มา:|Buod ng sanggunian:)\s*/i, "")
    .trim();
}

function metadataFact(post, value = "", max = 150) {
  const publisher = sourcePublisher(post);
  const title = sourceTitle(post);
  let text = cleanSentence(value)
    .replace(new RegExp(`^${escapeRegExp(publisher)}\\s*(?:來源指出|報導|reports?|reported|says|によると|は|는|melaporkan|đưa tin|รายงาน|iniulat)[,，:：]?\\s*`, "i"), "")
    .replace(new RegExp(`^${escapeRegExp(publisher)}\\s*(?:在|on|は|는)?[^。.!?！？]{0,45}(?:報導|reported|reports|보도|melaporkan|đưa tin|รายงาน|iniulat)[^。.!?！？]{0,80}${escapeRegExp(title)}[^,，。.!?！？]*[,，。.]?\\s*`, "i"), "")
    .replace(new RegExp(escapeRegExp(title), "gi"), "")
    .replace(/^(?:根據|來源指出|出典によると|출처에 따르면|Sumber itu menyebut|Nguồn tin cho biết|แหล่งข่าวระบุว่า|Ayon sa pinagmulan)[,，:：]?\s*/i, "")
    .replace(/\b(?:see how|look at how|learn how)\b[:,]?\s*/i, "")
    .replace(/(?:看看|見てみましょう|살펴보세요|lihat bagaimana|xem cách|สำรวจ|tingnan kung paano)[,，:：]?\s*/i, "")
    .trim();
  if (/Google/i.test(publisher)) {
    text = text
      .replace(/我們在/g, "Google 在")
      .replace(/我們/g, "Google")
      .replace(/\bwe launched\b/gi, "Google launched")
      .replace(/\bwe (?:are seeing|see)\b/gi, "Google says it is seeing")
      .replace(/\bwe\b/gi, "Google")
      .replace(/저희는/g, "Google은")
      .replace(/저희/g, "Google")
      .replace(/เราได้/g, "Google ได้")
      .replace(/เรา/g, "Google");
  }
  text = text.replace(/^[,，。.!?！？\s]+/, "").trim();
  text = text
    .replace(/\b(?:report on|reports on|reported on|about|regarding)\s*(?:says?:?)?\s*/gi, "")
    .replace(/(?:について|に関する)\s*(?:と報じました|によると)?/gi, "")
    .replace(/(?:에 대해)\s*(?:다음과 같이 설명했습니다|보도했습니다)?/gi, "")
    .replace(/\b(?:tentang|mengenai)\s*/gi, "")
    .replace(/\b(?:về)\s*/gi, "")
    .replace(/เกี่ยวกับ\s*(?:Google AI Blog ระบุว่า)?/gi, "")
    .replace(/tungkol sa,?\s*(?:sinabi ng Google AI Blog:?)?/gi, "")
    .replace(/^(?:said|says|กล่าวว่า|ระบุว่า|sinabi)[:,]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return capText(text || cleanSentence(value), max);
}

function sourceReportSentence(language, publisher, fact) {
  const cleanFact = cleanText(fact);
  if (language === "zh-Hant") return `${publisher} 報導，${cleanFact}`;
  if (language === "ja") return `${publisher} は、${cleanFact}`;
  if (language === "ko") return `${publisher}는 ${cleanFact}`;
  if (language === "id") return `${publisher} melaporkan ${cleanFact}`;
  if (language === "vi") return `${publisher} đưa tin ${cleanFact}`;
  if (language === "th") return `${publisher} รายงานว่า ${cleanFact}`;
  if (language === "ms") return `${publisher} melaporkan ${cleanFact}`;
  if (language === "fil") return `Iniulat ng ${publisher}: ${cleanFact}`;
  return `${publisher} reports: ${cleanFact}`;
}

function compactCompare(value = "") {
  return cleanText(value).toLowerCase().replace(/[，。,.!?！？；;:\s"'「」]/g, "");
}

function overlapLike(a = "", b = "") {
  const left = compactCompare(a);
  const right = compactCompare(b);
  if (!left || !right) return false;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  if (shorter.length >= 36 && longer.includes(shorter.slice(0, Math.min(shorter.length, 90)))) return true;
  const probe = shorter.slice(0, Math.min(48, shorter.length));
  return probe.length >= 28 && longer.includes(probe);
}

function combineMetadataFacts(facts = [], { avoid = [], start = 0, count = 2, max = 170 } = {}) {
  const picked = [];
  for (const fact of facts.slice(start)) {
    if (!fact || picked.some((item) => overlapLike(item, fact))) continue;
    if (avoid.some((item) => overlapLike(item, fact))) continue;
    picked.push(fact);
    if (picked.length >= count) break;
  }
  if (!picked.length) {
    for (const fact of facts) {
      if (fact && !picked.some((item) => overlapLike(item, fact))) picked.push(fact);
      if (picked.length >= count) break;
    }
  }
  return capText(picked.join(" "), max);
}

function metadataFactScore(text = "") {
  let score = 0;
  if (/\d|億|万|ล้าน|billion|million|bilyon|miliar|tỷ/i.test(text)) score += 6;
  if (/(AI|Google|OpenAI|Anthropic|Microsoft|NVIDIA|Search|Cloud|Mode|Gemini|ChatGPT|Claude)/i.test(text)) score += 4;
  if (text.length >= 55 && text.length <= 170) score += 2;
  if (/(see how|look at how|看看|見てみましょう|살펴보세요|เกี่ยวกับ|tungkol sa|report on says|about says)/i.test(text)) score -= 8;
  if (/^(?:said|says|about|regarding|เกี่ยวกับ|tungkol sa)\b/i.test(text)) score -= 5;
  return score;
}

function bestMetadataFacts(post, count = 3) {
  const seen = new Set();
  return bestFacts(post, 8)
    .map((fact) => metadataFact(post, fact, 170))
    .filter((fact) => fact.length >= 24)
    .filter((fact) => {
      const key = fact.toLowerCase().replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => metadataFactScore(b) - metadataFactScore(a))
    .slice(0, count);
}

function sentenceScore(sentence = "") {
  let score = 0;
  if (/\d/.test(sentence)) score += 5;
  if (/(OpenAI|Anthropic|Google|Microsoft|NVIDIA|Meta|Amazon|Sakana|AI Mode|ChatGPT|Claude|Gemini|GPU|API|Search|Cloud)/i.test(sentence)) score += 4;
  if (/(發布|推出|報導|宣布|完成|reports|reported|released|launched|announced|published|보도|출시|발표|melaporkan|diluncurkan|đưa tin|ra mắt|รายงาน|เปิดตัว|iniulat)/i.test(sentence)) score += 3;
  if (sentence.length >= 65 && sentence.length <= 220) score += 2;
  if (/(本文|this article|この記事|이 글에서는)/i.test(sentence)) score -= 4;
  if (/(see how|看看|看.*如何|살펴보세요|lihat bagaimana|xem cách|สำรวจ|tingnan kung paano)/i.test(sentence)) score -= 6;
  return score;
}

function bestFacts(post, count = 3) {
  const candidates = factCandidates(post)
    .map((sentence, index) => ({ sentence, index, score: sentenceScore(sentence) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.sentence);
  const fallback = cleanSentence(post.excerpt || post.title || "");
  return [...candidates, fallback].filter(Boolean).slice(0, count);
}

function capText(value = "", max = MAX_EXCERPT_LENGTH) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max).replace(/[，,;；:：\s]+$/g, "");
  const sentenceBoundary = Math.max(
    clipped.lastIndexOf("。"),
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?"),
    clipped.lastIndexOf("！"),
    clipped.lastIndexOf("？")
  );
  if (sentenceBoundary >= Math.max(40, Math.floor(max * 0.55))) return clipped.slice(0, sentenceBoundary + 1).trim();
  return clipped.replace(/[，,;；:：\s]+$/g, "").trim();
}

function ensureMinimum(value, additions, min = MIN_EXCERPT_LENGTH, max = MAX_EXCERPT_LENGTH) {
  let text = cleanText(value);
  for (const addition of additions) {
    if (text.length >= min) break;
    const clean = cleanSentence(addition);
    if (!clean || text.includes(clean.slice(0, 24))) continue;
    text = cleanText(`${text} ${clean}`);
  }
  return capText(text, max);
}

function buildExcerpt(post) {
  const language = LANGUAGES.includes(post.language) ? post.language : "en";
  const facts = bestMetadataFacts(post, 4);
  const publisher = sourcePublisher(post);
  const bodyParagraphs = splitParagraphs(post.body);
  const fact = combineMetadataFacts(facts, { avoid: bodyParagraphs.slice(0, 1), start: 1, count: 2, max: 170 }) || facts[0] || sourceTitle(post);
  return ensureMinimum(sourceReportSentence(language, publisher, fact), facts.slice(1), MIN_EXCERPT_LENGTH, MAX_EXCERPT_LENGTH);
}

function buildSeoDescription(post) {
  const language = LANGUAGES.includes(post.language) ? post.language : "en";
  const facts = bestMetadataFacts(post, 4);
  const publisher = sourcePublisher(post);
  const primary = combineMetadataFacts(facts, { avoid: [post.excerpt], start: 2, count: 1, max: 145 }) || facts[1] || facts[0] || post.excerpt || sourceTitle(post);
  return ensureMinimum(sourceReportSentence(language, publisher, primary), facts.slice(3), MIN_SEO_DESCRIPTION_LENGTH, MAX_SEO_DESCRIPTION_LENGTH);
}

function buildGeoSummary(post) {
  const language = LANGUAGES.includes(post.language) ? post.language : "en";
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const facts = bestMetadataFacts(post, 4);
  const publisher = sourcePublisher(post);
  const title = sourceTitle(post);
  const fact = combineMetadataFacts(facts, { avoid: [post.excerpt, post.seoDescription], start: 1, count: 1, max: 120 }) || facts[1] || facts[0] || title;
  const secondFact = combineMetadataFacts(facts, { avoid: [post.excerpt, post.seoDescription, fact], start: 2, count: 1, max: 110 });
  return ensureMinimum(
    config.geo({ publisher, title, fact, secondFact }),
    facts.slice(3),
    92,
    230
  );
}

function buildLead(post) {
  const language = LANGUAGES.includes(post.language) ? post.language : "en";
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const facts = bestFacts(post, 4);
  const publisher = sourcePublisher(post);
  const title = sourceTitle(post);
  return ensureMinimum(
    config.lead({ publisher, title, fact: capText(facts[0] || post.excerpt || title, 180), secondFact: capText(facts[1] || "", 150) }),
    facts.slice(2).map((fact) => capText(fact, 120)),
    95,
    360
  );
}

function repairAntiSlop(text = "") {
  return cleanText(text)
    .replace(/不只是單純([^。]{0,60})而是/gi, "$1，重點在於")
    .replace(/不只是([^。]{0,60})而是/gi, "$1，重點在於")
    .replace(/不僅是([^。]{0,60})而是/gi, "$1，重點在於")
    .replace(/不是單純([^。]{0,60})而是/gi, "$1，重點在於")
    .replace(/\bnot (?:just|only)\b([^.!?]{0,90})\bbut\b/gi, "$1; the report focuses on")
    .replace(/(?:単なる|ただの)([^。]{0,60})(?:ではなく|ではない)/gi, "$1にとどまらず")
    .replace(/(?:단순히|그저)\s*/gi, "")
    .replace(/\b(game-changing|cutting-edge|revolutionary|transformative|ever-evolving|landscape|delve|showcase)\b/gi, "")
    .replace(/(?:賦能|顛覆|革新|不可忽視|至關重要|重大意義|深遠影響|快速變化|全面解析|深入探討|關鍵轉折)/g, "")
    .replace(/(?:革新的|変革的|見逃せない|重要な意味|深掘り|包括的に解説)/g, "")
    .replace(/(?:혁신적|변혁적|중요한 의미|간과할 수 없는|심층 분석)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function bodyNeedsNewLead(post, firstParagraph) {
  const publisher = sourcePublisher(post);
  if (!firstParagraph) return true;
  if (/(本文|這篇文章|this article|in this article|この記事では|本稿では|이 글에서는|이번 글에서는)/i.test(firstParagraph)) return true;
  if (!firstParagraph.includes(publisher) && post.sourceLinks?.[0]?.publisher) return true;
  if (!/(AI|Agent|agent|OpenAI|Anthropic|Google|Microsoft|NVIDIA|Gemini|ChatGPT|Claude|Search|Cloud|自動化|搜尋|検索|검색|cloud|คลาวด์)/i.test(firstParagraph)) {
    return true;
  }
  if (firstParagraph.length < 80) return true;
  return false;
}

function repairBody(post) {
  const paragraphs = splitParagraphs(post.body).map(repairAntiSlop).filter(Boolean);
  const lead = buildLead(post);
  if (!paragraphs.length) return lead;

  const first = paragraphs[0];
  const nextParagraphs = paragraphs.slice(1).filter((paragraph) => {
    const compact = paragraph.toLowerCase().replace(/\s+/g, "");
    return !compact || !lead.toLowerCase().replace(/\s+/g, "").includes(compact.slice(0, Math.min(60, compact.length)));
  });

  const repaired = bodyNeedsNewLead(post, first) ? [lead, ...nextParagraphs] : [first, ...nextParagraphs];
  return repaired
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function repairTakeaways(post, excerpt = "") {
  const existing = Array.isArray(post.keyTakeaways) ? post.keyTakeaways.map(cleanSentence).filter((item) => item.length >= 18) : [];
  const facts = bestFacts(post, 6).filter((item) => !existing.some((taken) => overlapLike(taken, item)));
  return [...existing, ...facts]
    .map((item) => cleanSentence(item))
    .filter((item) => item && !overlapLike(item, excerpt))
    .filter((item, index, array) => array.findIndex((other) => overlapLike(other, item)) === index)
    .slice(0, 3);
}

function repairFaqs(post) {
  if (Array.isArray(post.faqs) && post.faqs.length) {
    return post.faqs.map((faq) => ({
      question: cleanText(faq.question || ""),
      answer: cleanText(faq.answer || "")
    }));
  }
  return [];
}

function repairPost(post, { attempt, manifestIssues }) {
  const next = { ...post };
  next.slug = normalizeSlug(next.slug || next.title || next.sourceLinks?.[0]?.title || "");
  next.newsCategory = "AI";
  next.excerpt = buildExcerpt(post);
  next.seoDescription = buildSeoDescription({ ...post, excerpt: next.excerpt });
  next.geoSummary = buildGeoSummary({ ...post, excerpt: next.excerpt, seoDescription: next.seoDescription });
  next.body = repairBody(next);
  next.keyTakeaways = repairTakeaways(next, next.excerpt);
  next.faqs = repairFaqs(next);
  next.title = cleanText(next.title);
  next.seoTitle = cleanText(next.seoTitle || `${next.title} | ALTOS LAB`);
  next.coverAlt = cleanText(next.coverAlt || `${next.title} - ${sourcePublisher(next)}`);
  next.topic = cleanText(next.topic || next.title);
  next.audience = cleanText(next.audience || "AI market readers");
  const traceRecord = {
    step: "market-auto-repair",
    script: "blog-market-auto-repair",
    attempt,
    repairedAt: new Date().toISOString(),
    issuesSeen: manifestIssues.slice(0, 12)
  };
  next.generationTrace = Array.isArray(next.generationTrace)
    ? [...next.generationTrace, traceRecord]
    : {
        ...(next.generationTrace || {}),
        marketAutoRepair: traceRecord
      };
  return next;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-market-auto-repair.mjs --article-set <path> --out <path> [--manifest <path>] [--attempt 1]");
    return;
  }
  const articleSetPath = arg("article-set");
  const outPath = arg("out", articleSetPath);
  if (!articleSetPath) throw new Error("--article-set is required");
  if (!outPath) throw new Error("--out is required");
  const attempt = Number(arg("attempt", "1")) || 1;
  const manifestPath = arg("manifest");
  const manifest = manifestPath ? await readJson(manifestPath).catch(() => null) : null;
  const manifestIssues = [
    ...(manifest?.validateOnly?.errors || []),
    ...(manifest?.validateOnly?.warnings || []),
    ...(manifest?.qualityManifest?.qualitySummary?.issues || []),
    ...(manifest?.qualityManifest?.qualitySummary?.warnings || [])
  ].map((item) => String(item || ""));

  const payload = await readJson(articleSetPath);
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  if (!posts.length) throw new Error("article set has no posts");
  const repairedPosts = posts.map((post) => repairPost(post, { attempt, manifestIssues }));
  const repaired = {
    ...payload,
    posts: repairedPosts,
    generation: {
      ...(payload.generation || {}),
      autoRepair: {
        script: "blog-market-auto-repair",
        attempt,
        repairedAt: new Date().toISOString(),
        sourceArticleSetPath: path.resolve(articleSetPath),
        sourceManifestPath: manifestPath ? path.resolve(manifestPath) : "",
        issueCount: manifestIssues.length
      }
    }
  };
  if (payload.translationGroupId) repaired.translationGroupId = payload.translationGroupId;
  await writeJson(outPath, repaired);
  console.log(JSON.stringify({
    ok: true,
    articleSetPath: path.resolve(articleSetPath),
    outPath: path.resolve(outPath),
    attempt,
    posts: repairedPosts.length,
    languages: repairedPosts.map((post) => post.language).filter(Boolean)
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
