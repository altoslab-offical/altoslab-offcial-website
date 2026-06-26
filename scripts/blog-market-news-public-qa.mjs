#!/usr/bin/env node

import process from "node:process";
import { cleanSourceTitle, extractEntities, extractNumbers, extractSourceArticleFromHtml } from "./blog-market-source-article.mjs";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

const INTERNAL_COPY_PATTERNS = [
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
  /來源可引用摘要/i,
  /來源摘要/i,
  /Source summary:/i,
  /出典要約/i,
  /출처 요약/i,
  /Ringkasan sumber/i,
  /Tóm tắt nguồn/i,
  /สรุปแหล่งที่มา/i,
  /Buod ng sanggunian/i,
  /讀者怎麼看/i,
  /擁抱臉|擁抱面孔|擁抱臉部/i,
  /產品 AI 雲端|資源 公司 客戶|Web Application Firewall/i,
  /404\s*(?:-|–|not found)|That page does not exist/i,
  /source-attributed official announcement image/i,
  /SEO\s*\/\s*GEO/i,
  /quality gate/i,
  /quality\s+pipeline|backend\s+pipeline|pipeline\s+gate/i,
  /AI-generated\s+(cover|visual|content|article)/i
];

const WEAK_MARKET_TITLE_PATTERNS = [/更新：/i, /市場訊號/i, /可以拿來/i, /工作流/i, /流程/i];
const SOURCE_RICH_BODY_MINIMUM = Number.parseInt(process.env.ALTOS_MARKET_QA_SOURCE_RICH_BODY_MIN || "780", 10);
const SOURCE_RICH_PARAGRAPH_MINIMUM = Number.parseInt(process.env.ALTOS_MARKET_QA_SOURCE_RICH_PARAGRAPH_MIN || "4", 10);
const SOURCE_RICH_COVERAGE_MINIMUM = Number.parseInt(process.env.ALTOS_MARKET_QA_SOURCE_RICH_COVERAGE_MIN || "4", 10);
const LEGACY_MARKET_TEMPLATE_PATTERNS = [
  /事件重點/i,
  /關鍵事實/i,
  /^##\s*背景\s*$/m,
  /報導主要提到/i,
  /文中提到的主要數字/i,
  /後續觀察/i,
  /這則快訊的重點是什麼/i,
  /這篇文章是否代表市場已經成熟/i,
  /消息落在哪個產品環節/i,
  /來源裡的具體細節/i,
  /先看採用而不是聲量/i,
  /下一步先看三個指標/i,
  /實際使用量是否增加、付費或正式採用/i,
  /客戶採用、服務穩定性與實際營收/i,
  /具體使用者與可觀察的使用量/i,
  /Adoption matters more than buzz/i,
  /Next step: watch three signals/i,
  /real usage, paid adoption, and service stability/i
];
const GENERIC_MARKET_BODY_PATTERNS = [
  /企業讀者應先判斷/i,
  /企業團隊需要先核對/i,
  /後續可追蹤文件更新/i,
  /這則新聞的重點不是抽象評論/i,
  /不是同類工具會不會更多，而是/i,
  /接下來要看(?:的是)?/i,
  /後續要看/i,
  /兩週內先跑/i,
  /選一個高頻但風險可控/i,
  /採購、產品、工程與營運/i,
  /進入下一輪預算與部署討論/i,
  /speed.*stable workflow/i,
  /choose one workflow/i,
  /one owner/i,
  /stop condition/i
];

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

function articleHtmlScope(html = "") {
  const text = String(html || "");
  return (
    text.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    text
  );
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

async function fetchPostForLanguage(root, slug, language, cache) {
  const apiUrl = `${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}`;
  try {
    const json = await fetchJson(apiUrl);
    const post = json.post || json.payload?.post;
    if (post) return post;
  } catch (error) {
    if (!String(error?.message || error).startsWith("404 ")) throw error;
  }
  if (!cache.posts) {
    const json = await fetchJson(`${root}/api/blog`);
    cache.posts = json.posts || json.blogPosts || json.payload?.posts || [];
  }
  const anchor = cache.posts.find((post) => post.slug === slug);
  const translationGroupId = anchor?.translationGroupId;
  if (translationGroupId) {
    const translated = cache.posts.find((post) => post.translationGroupId === translationGroupId && post.language === language);
    if (translated) return translated;
  }
  const sourceUrl = anchor?.sourceLinks?.[0]?.url;
  if (sourceUrl) {
    const translated = cache.posts.find((post) => post.language === language && post.sourceLinks?.[0]?.url === sourceUrl);
    if (translated) return translated;
  }
  return null;
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

function qaPost(post, mustTerms = []) {
  const issues = [];
  const source = post.sourceLinks?.[0] || {};
  const publisher = shortPublisher(source.publisher);
  const text = publicText(post);
  const body = String(post.body || "");
  for (const pattern of INTERNAL_COPY_PATTERNS) {
    if (pattern.test(text)) issues.push({ severity: "critical", id: "internal-copy-leak", pattern: String(pattern) });
  }
  for (const pattern of LEGACY_MARKET_TEMPLATE_PATTERNS) {
    if (pattern.test(text)) issues.push({ severity: "critical", id: "legacy-market-template", pattern: String(pattern) });
  }
  for (const pattern of GENERIC_MARKET_BODY_PATTERNS) {
    if (pattern.test(text)) issues.push({ severity: "major", id: "generic-market-advice-filler", pattern: String(pattern) });
  }
  for (const pattern of WEAK_MARKET_TITLE_PATTERNS) {
    if (pattern.test(post.title || "")) issues.push({ severity: "major", id: "weak-market-title", pattern: String(pattern) });
  }
  if (post.contentType !== "breaking") issues.push({ severity: "major", id: "not-breaking", value: post.contentType });
  if (post.coverSource !== "source") issues.push({ severity: "major", id: "cover-not-source", value: post.coverSource });
  if (!post.coverCreditUrl) issues.push({ severity: "major", id: "missing-cover-credit-url" });
  if (!Array.isArray(post.sourceLinks) || post.sourceLinks.length < 1) issues.push({ severity: "major", id: "missing-source-links" });
  const sourceTitle = cleanSourceTitle(source.title || "");
  if (
    post.language !== "en" &&
    sourceTitle.length > 30 &&
    /[a-z]{4,}\s+[a-z]{4,}/i.test(sourceTitle) &&
    text.includes(sourceTitle)
  ) {
    issues.push({ severity: "major", id: "raw-source-title-leaked", sourceTitle });
  }
  if (publisher && !String(post.excerpt || "").includes(publisher)) {
    issues.push({ severity: "major", id: "standfirst-missing-source", publisher, excerpt: post.excerpt || "" });
  }
  if (post.geoSummary && post.excerpt && overlapRatio(post.geoSummary, post.excerpt) >= 0.72) {
    issues.push({
      severity: "major",
      id: "summary-repeats-standfirst",
      excerpt: String(post.excerpt || "").slice(0, 160),
      geoSummary: String(post.geoSummary || "").slice(0, 160)
    });
  }
  if (post.seoDescription && post.excerpt && overlapRatio(post.seoDescription, post.excerpt) >= 0.86) {
    issues.push({
      severity: "major",
      id: "seo-description-repeats-standfirst",
      excerpt: String(post.excerpt || "").slice(0, 160),
      seoDescription: String(post.seoDescription || "").slice(0, 160)
    });
  }
  const repeatedTakeaways = (post.keyTakeaways || []).filter((item) => overlapRatio(item, post.excerpt || "") >= 0.72);
  if (repeatedTakeaways.length >= 1) {
    issues.push({
      severity: "major",
      id: "takeaway-repeats-standfirst",
      repeatedTakeaways: repeatedTakeaways.slice(0, 3)
    });
  }
  if (!Array.isArray(post.keyTakeaways) || post.keyTakeaways.length < 2) {
    issues.push({ severity: "major", id: "market-takeaways-too-thin", count: post.keyTakeaways?.length || 0 });
  }
  const unrelatedImageCaptions = (post.contentImages || [])
    .map((image) => `${image.alt || ""} ${image.caption || ""}`)
    .filter((text) =>
      /Frame \(4\)|Oracle partnership|PRC-linked influence|Confidential submission of draft S-1|Built for broad benefit|Economic research forum/i.test(text)
    );
  if (unrelatedImageCaptions.length) {
    issues.push({ severity: "critical", id: "unrelated-source-inline-images", captions: unrelatedImageCaptions });
  }
  const sourceNumbers = extractNumbers(source.title || "", source.summary || "")
    .filter((term) => !/^(?:19|20)\d{2}$/.test(String(term)))
    .filter((term) => String(term).length >= 2);
  const excerptText = String(post.excerpt || "").toLowerCase();
  const numberCovered = (term) => {
    const raw = String(term || "").toLowerCase();
    const numericCore = raw.match(/\d[\d,.]*/)?.[0] || "";
    const normalizedCore = numericCore.replace(/[,.]/g, "");
    const normalizedExcerpt = excerptText.replace(/[,.]/g, "");
    if (/\$?\s*200\s*m\b/i.test(raw)) {
      return /(\$?\s*200\s*m\b|200\s*million|200\s*juta|200\s*triệu|200\s*ล้าน|200\s*milyon|2\s*億|2\s*亿|2\s*억|2\s*億ドル|2\s*億美元|2\s*億美金)/i.test(post.excerpt || "");
    }
    if (/17,?000/i.test(raw)) {
      return /(17[,.]?\s*000|1\s*万\s*7000|1万7000|1만\s*7000|หนึ่งหมื่นเจ็ดพัน|17\s*พัน)/i.test(post.excerpt || "");
    }
    if (/\$?\s*85\s*b(?:illion)?/i.test(raw) || /\b85\s*billion\b/i.test(raw)) {
      return /(\$?\s*85\s*b(?:illion)?|850\s*億|850億|850\s*亿|850亿|850\s*억|85\s*พันล้าน|85\s*tỷ|85\s*miliar|85\s*bilion|85\s*bilyon)/i.test(
        post.excerpt || ""
      );
    }
    return excerptText.includes(raw) || (normalizedCore.length >= 2 && normalizedExcerpt.includes(normalizedCore));
  };
  if (
    sourceNumbers.length > 0 &&
    !sourceNumbers.some(numberCovered) &&
    !(/5x/i.test(sourceNumbers.join(" ")) && /fivefold|5\s*倍|5배|gấp\s*5|5\s*lần|5\s*เท่า|5x|5\s*kali|5\s*kali\s*lipat|5\s*beses/i.test(post.excerpt || ""))
  ) {
    issues.push({ severity: "major", id: "standfirst-missing-number", excerpt: post.excerpt || "", sourceNumbers });
  }
  for (const term of mustTerms) {
    if (!text.toLowerCase().includes(term.toLowerCase())) {
      issues.push({ severity: "major", id: "missing-required-term", term });
    }
  }
  const sourceEvidenceTerms = [
    ...extractEntities(source.summary || ""),
    ...sourceNumbers
  ]
    .filter((term) => String(term).length >= 2)
    .filter((term) => !/^(TechCrunch|OpenAI|Google|AI|LLM)$/i.test(term))
    .slice(0, 6);
  const evidenceCovered = (term) => {
    const raw = String(term || "").trim();
    const lowerText = text.toLowerCase();
    if (/\d/.test(raw) && numberCovered(raw)) return true;
    if (lowerText.includes(raw.toLowerCase())) return true;
    if (/^publishers?$/i.test(raw) && /(出版商|出版社|퍼블리셔|publisher|penerbit|nhà xuất bản|ผู้เผยแพร่|publishers?)/i.test(text)) return true;
    if (/^companies?$/i.test(raw) && /(company|companies|企業|公司|会社|企業|기업|회사|perusahaan|syarikat|công ty|doanh nghiệp|บริษัท|kompanya)/i.test(text)) return true;
    if (/^debt$/i.test(raw) && /(debt|loan|borrow|borrows|financing|bond|債務|負債|融資|貸款|借款|債券|ローン|融資|借入|債券|대출|부채|채권|자금 조달|pinjaman|utang|pembiayaan|obligasi|vay|khoản vay|trái phiếu|tài chính|กู้|เงินกู้|พันธบัตร|หนี้|เงินทุน|hutang|pembiayaan|bon|utang|pondo)/i.test(text)) return true;
    if (/^u\.?k\.?$/i.test(raw) && /(U\.?K\.?|UK|英國|英国|영국|Inggris|Anh|สหราชอาณาจักร|United Kingdom)/i.test(text)) return true;
    if (/^africa$/i.test(raw) && /(Africa|非洲|アフリカ|아프리카|Afrika|châu Phi|แอฟริกา)/i.test(text)) return true;
    if (/^middle\s+east$/i.test(raw) && /(Middle East|中東|中东|중동|Timur Tengah|Trung Đông|ตะวันออกกลาง|Gitnang Silangan)/i.test(text)) return true;
    const tokens = raw
      .match(/[A-Z][A-Za-z0-9+.-]{2,}|[A-Za-z]+-\d+|\d[\d,.]*(?:x|%|m|b)?/g)
      ?.filter((token) => !/^(Welcome|First|Open|The|Action|Whether)$/i.test(token))
      ?.filter((token) => token.length >= 3) || [];
    return tokens.some((token) => lowerText.includes(token.toLowerCase()));
  };
  const coveredEvidenceTerms = sourceEvidenceTerms.filter(evidenceCovered);
  if (sourceEvidenceTerms.length >= 3 && coveredEvidenceTerms.length < 2) {
    issues.push({ severity: "major", id: "weak-source-fact-coverage", requiredEvidence: sourceEvidenceTerms, coveredEvidence: coveredEvidenceTerms });
  }
  const meaningfulParagraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => stripHtml(paragraph))
    .filter((paragraph) => paragraph.length >= 60);
  const bodyTextLength = stripHtml(body).length;
  if (sourceEvidenceTerms.length >= 8 && (meaningfulParagraphs.length < 4 || bodyTextLength < 820)) {
    issues.push({
      severity: "major",
      id: "source-rich-market-body-too-thin",
      evidenceCount: sourceEvidenceTerms.length,
      paragraphCount: meaningfulParagraphs.length,
      bodyLength: bodyTextLength
    });
  }
  if (meaningfulParagraphs[0] && overlapRatio(meaningfulParagraphs[0], post.excerpt || "") >= 0.76) {
    issues.push({
      severity: "major",
      id: "body-repeats-standfirst",
      paragraph: meaningfulParagraphs[0].slice(0, 160)
    });
  }
  if (meaningfulParagraphs.length >= 2 && meaningfulParagraphs.every((paragraph) => /^(TechCrunch|The Verge|WIRED|VentureBeat|Reuters|Bloomberg)?\s*(報導|指出|reported|reports|says|melaporkan|đưa tin|รายงาน)/i.test(paragraph))) {
    issues.push({ severity: "major", id: "market-body-all-report-sentences" });
  }
  if (meaningfulParagraphs.some((paragraph, index) => meaningfulParagraphs.slice(index + 1).some((other) => overlapRatio(paragraph, other) >= 0.78))) {
    issues.push({ severity: "major", id: "repeated-market-paragraph" });
  }
  if (meaningfulParagraphs.length < 2 && bodyTextLength < 120) {
    issues.push({
      severity: "major",
      id: "market-body-too-thin",
      paragraphCount: meaningfulParagraphs.length,
      bodyLength: bodyTextLength
    });
  }
  return issues;
}

function sourceReaderUrl(url = "") {
  try {
    const parsed = new URL(url);
    return `https://r.jina.ai/http://${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return `https://r.jina.ai/http://${String(url || "").replace(/^https?:\/\//i, "")}`;
  }
}

function edgeProtectionBody(text = "") {
  return /Attention Required!|Just a moment|cf-error-code|checking your browser|SecurityCompromiseError|<title>\s*Access Denied\s*<\/title>|Cloudflare Ray ID/i.test(
    String(text || "").slice(0, 3000)
  );
}

async function fetchSourceArticle(source = {}, cache) {
  const url = source.url || "";
  if (!url) return { ok: false, reason: "missing-source-url" };
  if (cache.has(url)) return cache.get(url);
  const read = async (target) => {
    try {
      const text = await fetchText(target);
      if (!text || edgeProtectionBody(text)) return null;
      return text;
    } catch {
      return null;
    }
  };
  const html = (await read(url)) || (await read(sourceReaderUrl(url)));
  if (!html) {
    const result = { ok: false, reason: "source-fetch-failed" };
    cache.set(url, result);
    return result;
  }
  const article = extractSourceArticleFromHtml(source, html, {});
  const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
  const bodyLength = stripHtml(article.body || "").length;
  const result =
    article.canonicalUrl && (facts.length >= 3 || bodyLength >= 900)
      ? { ok: true, article, bodyLength, factCount: facts.length }
      : { ok: false, reason: "source-extraction-too-thin", bodyLength, factCount: facts.length };
  cache.set(url, result);
  return result;
}

function sourceEvidenceAnchors(article = {}, source = {}) {
  const facts = Array.isArray(article.factBullets) ? article.factBullets : [];
  const anchors = [
    ...extractEntities(article.headline || "", article.standfirst || "", ...facts.slice(0, 8)),
    ...extractNumbers(article.headline || "", article.standfirst || "", ...facts.slice(0, 8))
  ]
    .map((term) => String(term || "").trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !/^(The|This|That|How|Why|What|AI|Google|OpenAI|TechCrunch|The Verge|WIRED)$/i.test(term));
  const seen = new Set();
  return anchors.filter((term) => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 14);
}

function sourceRichLiveIssues(post, sourceArticleResult = null) {
  const issues = [];
  if (!sourceArticleResult?.ok) return issues;
  const article = sourceArticleResult.article || {};
  const source = post.sourceLinks?.[0] || {};
  const bodyLength = stripHtml(article.body || "").length;
  const factCount = (article.factBullets || []).filter(Boolean).length;
  const sourceRich = bodyLength >= 1800 || factCount >= 8;
  if (!sourceRich) return issues;
  const body = String(post.body || "");
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => stripHtml(paragraph).replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 60);
  const postBodyLength = stripHtml(body).length;
  if (postBodyLength < SOURCE_RICH_BODY_MINIMUM || paragraphs.length < SOURCE_RICH_PARAGRAPH_MINIMUM) {
    issues.push({
      severity: "critical",
      id: "live-source-rich-body-too-thin",
      sourceBodyLength: bodyLength,
      sourceFactCount: factCount,
      postBodyLength,
      paragraphCount: paragraphs.length
    });
  }
  const text = publicText(post).toLowerCase();
  const anchors = sourceEvidenceAnchors(article, source);
  const covered = anchors.filter((term) => {
    const lower = term.toLowerCase();
    if (text.includes(lower)) return true;
    const numeric = lower.match(/\d[\d,.]*/)?.[0]?.replace(/[,.]/g, "");
    return numeric && numeric.length >= 2 && text.replace(/[,.]/g, "").includes(numeric);
  });
  if (anchors.length >= 6 && covered.length < SOURCE_RICH_COVERAGE_MINIMUM) {
    issues.push({
      severity: "critical",
      id: "live-source-fact-coverage-too-low",
      sourceAnchors: anchors.slice(0, 10),
      coveredAnchors: covered
    });
  }
  if (/發布「/.test(post.title || "") || /published\s+["“]/i.test(post.title || "")) {
    issues.push({ severity: "major", id: "source-headline-wrapper-title" });
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
  const postCache = {};
  const sourceArticleCache = new Map();

  for (const language of languages) {
    const post = await fetchPostForLanguage(root, slug, language, postCache);
    if (!post) {
      results.push({ language, ok: false, issues: [{ severity: "critical", id: "missing-post" }] });
      continue;
    }
    const sourceArticle = await fetchSourceArticle(post.sourceLinks?.[0] || {}, sourceArticleCache);
    const issues = [...qaPost(post, mustTerms), ...sourceRichLiveIssues(post, sourceArticle)];
    results.push({
      language,
      ok: issues.length === 0,
      title: post.title,
      excerpt: post.excerpt,
      liveSource: sourceArticle.ok
        ? {
            bodyLength: sourceArticle.bodyLength,
            factCount: sourceArticle.factCount,
            headline: sourceArticle.article?.headline,
            canonicalUrl: sourceArticle.article?.canonicalUrl
          }
        : sourceArticle,
      issues
    });
  }

  const html = await fetchText(`${root}/blog/${encodeURIComponent(slug)}`);
  const htmlText = stripHtml(articleHtmlScope(html));
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
