#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { extractSourceArticleFromHtml, cleanSourceTitle } from "./blog-market-source-article.mjs";
import { inferMarketFrame } from "./blog-market-newsroom.mjs";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_TARGET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const DEFAULT_MAX_PACKS = 10;
const SOURCE_PROFILES = {
  "mainstream-ai-us": new Set([
    "techcrunch-ai",
    "the-verge-ai",
    "venturebeat-ai",
    "mit-technology-review-ai",
    "wired-ai",
    "ars-technica-ai"
  ]),
  "longform-ai-news": new Set([
    "the-verge-ai",
    "mit-technology-review-ai",
    "wired-ai",
    "venturebeat-ai",
    "zdnet-ai",
    "the-decoder-ai",
    "ars-technica-ai",
    "the-register-ai",
    "infoworld-ai",
    "ieee-spectrum-ai",
    "the-new-stack-ai",
    "openai-news",
    "google-ai-blog",
    "google-deepmind",
    "microsoft-ai",
    "microsoft-azure-ai",
    "microsoft-research",
    "nvidia-blog-ai",
    "channel-newsasia-ai",
    "techcrunch-ai"
  ])
};
const FEED_TIMEOUT_MS = 8000;
const PAGE_TIMEOUT_MS = 12000;
const IMAGE_TIMEOUT_MS = 6500;
const MIN_IMAGE_WIDTH = Number(process.env.ALTOS_BLOG_MARKET_MIN_IMAGE_WIDTH || "768");
const MIN_IMAGE_HEIGHT = Number(process.env.ALTOS_BLOG_MARKET_MIN_IMAGE_HEIGHT || "432");
const MIN_IMAGE_BYTES = Number(process.env.ALTOS_BLOG_MARKET_MIN_IMAGE_BYTES || "25000");
const MIN_LONGFORM_FACTS = Number(process.env.ALTOS_BLOG_MARKET_LONGFORM_MIN_FACTS || "5");
const MIN_LONGFORM_BODY_CHARS = Number(process.env.ALTOS_BLOG_MARKET_LONGFORM_MIN_BODY_CHARS || "700");
const GENERIC_STOCK_HOSTS = [
  "unsplash.com",
  "images.unsplash.com",
  "pexels.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "openverse.org",
  "openverse.engineering",
  "api.openverse.org",
  "api.openverse.engineering"
];
const TOPIC_INCLUDE_PATTERN =
  /\b(AI|artificial intelligence|agent|agents|ChatGPT|Claude|Gemini|Codex|OpenAI|Anthropic|DeepMind|LLM|model|machine learning|inference|automation|robot|robotics|developer|software|cloud|data|governance|safety|security|compute|GPU|chip|search)\b/i;
const DIRECT_AI_NEWS_PATTERN =
  /\b(AI|artificial intelligence|agent|agents|ChatGPT|Claude|Gemini|Codex|OpenAI|Anthropic|DeepMind|LLM|model|machine learning|inference|automation|robot|robotics|GPU|chip|AI Search|search)\b/i;
const ENTERPRISE_INCLUDE_PATTERN =
  /\b(AI|artificial intelligence|agent|agents|ChatGPT|Claude|Gemini|Codex|OpenAI|Anthropic|DeepMind|LLM|model|machine learning|inference|automation|robot|robotics|developer|software|cloud|data|governance|safety|security|compute|GPU|chip|enterprise|business|workflow|API|runtime|platform|infrastructure)\b/i;
const CONSUMER_NOISE_PATTERN =
  /\b(thrift|vintage shopping|shopping|recipe|recipes|travel tips|fashion|movie|music|celebrity|sports|holiday|gift guide)\b/i;
const EVENT_PROMO_PATTERN =
  /\b(register now|tickets?|event|conference|summit|strictlyvc|agenda|speaker|fundraising take center stage)\b/i;
const OPINION_NOISE_PATTERN =
  /\b(you cowards|let us filter|podcast|uncanny valley|newsletter|the download|roundup|what we learned|opinion|editorial|shrugs off doubts|ahead of its ipo)\b/i;
const FUNDING_QUICK_PATTERN =
  /\b(raises?|raised|funding|fundraise|pre-seed|seed round|series [a-f]|valuation|valued at|venture round|venture funding|capital raise|led by|participated in the round)\b/i;

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function usage() {
  console.log(`
ALTOS LAB market-news source scanner

Finds source-verifiable AI market news candidates from the source registry,
extracts article/official images, checks live duplicates, and writes source
packs for the market-news fast lane. It does not publish and does not generate
public copy.

Examples:
  npm run blog:market-sources -- --date <date> --queue-dir data/blog-backfill/<date>/queue --write
  node scripts/blog-market-source-scanner.mjs --max-packs 6 --write --overwrite

Options:
  --base-url <url>       Defaults to ${DEFAULT_BASE_URL}
  --date <yyyy-mm-dd>    Defaults to today in Asia/Taipei
  --queue-dir <path>     Defaults to data/blog-backfill/<date>/queue
  --out <path>           Defaults to data/blog-backfill/<date>/market-source-packs.generated.json
  --max-packs <n>        Defaults to ${DEFAULT_MAX_PACKS}
  --source-profile <id>  Use a bounded source pool. Current: mainstream-ai-us, longform-ai-news.
  --news-depth <mode>    standard or longform. Longform rejects thin/funding-quick items. Defaults to ALTOS_BLOG_MARKET_NEWS_DEPTH or standard.
  --write                Write the source-pack file. Without it, prints dry-run output.
  --overwrite            Replace existing source-pack entries for selected sequences.
`);
}

function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function stripTags(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstXmlValue(item, tags) {
  for (const tag of tags) {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function firstXmlAttribute(item, patterns) {
  for (const pattern of patterns) {
    const match = item.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function parseRegistryEntries(registrySource) {
  const entries = [];
  const blocks = registrySource.match(/\{\s*id:\s*"[\s\S]*?\n\s*\}/g) || [];
  for (const block of blocks) {
    const entry = {};
    for (const key of ["id", "name", "url", "feedUrl", "tier", "market", "language", "category", "notes"]) {
      const match = block.match(new RegExp(`${key}:\\s*"([^"]*)"`, "m"));
      if (match?.[1]) entry[key] = match[1];
    }
    const authority = block.match(/authority:\s*(\d+)/);
    const freshness = block.match(/freshness:\s*(\d+)/);
    if (authority?.[1]) entry.authority = Number(authority[1]);
    if (freshness?.[1]) entry.freshness = Number(freshness[1]);
    if (entry.feedUrl && entry.tier !== "licensed-image") entries.push(entry);
  }
  return entries;
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "ALTOS-LAB-market-source-scanner/1.0; https://altoslab-ai.cc" }
    });
    if (!response.ok) return { ok: false, status: response.status, text: "" };
    return { ok: true, status: response.status, text: await response.text(), contentType: response.headers.get("content-type") || "" };
  } catch (error) {
    return { ok: false, status: 0, text: "", error: error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml, source) {
  const items = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  return items.slice(0, 20).map((item) => {
    const href = firstXmlAttribute(item, [
      /<link[^>]+href=["']([^"']+)["'][^>]*>/i
    ]);
    const linkText = firstXmlValue(item, ["link", "guid"]);
    const enclosure = firstXmlAttribute(item, [/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i]);
    const mediaThumbnail = firstXmlAttribute(item, [
      /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i,
      /<media:content[^>]+url=["']([^"']+)["'][^>]*>/i
    ]);
    return {
      title: firstXmlValue(item, ["title"]),
      url: href || linkText,
      publisher: source.name,
      publishedAt: firstXmlValue(item, ["pubDate", "updated", "published"]),
      summary: firstXmlValue(item, ["description", "summary", "content"]),
      feedImageUrl: mediaThumbnail || enclosure,
      sourceId: source.id,
      sourceUrl: source.url,
      sourceFeedUrl: source.feedUrl,
      tier: source.tier,
      category: source.category,
      authority: source.authority || 60,
      freshness: source.freshness || 60
    };
  }).filter((item) => item.title && /^https?:\/\//i.test(item.url));
}

function parsedHost(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGenericStockUrl(value) {
  const host = parsedHost(value);
  return Boolean(host && GENERIC_STOCK_HOSTS.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`)));
}

function absoluteUrl(value, base) {
  try {
    return new URL(stripTags(value), base).toString();
  } catch {
    return "";
  }
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrlForDuplicate(value = "") {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_|cmpid$|ito$|outputType$|ref$|ref_src$|guccounter$)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function normalizeCoverKey(value = "") {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...parsed.searchParams.keys()]) {
      if (!/^(id|asset|uuid)$/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.pathname = parsed.pathname
      .replace(/\/w_\d+(?:,[^/]+)?\//i, "/")
      .replace(/([?&])resize=\d+,\d+/i, "")
      .replace(/\.max-\d+x\d+\.format-webp\.webp$/i, "")
      .replace(/\/+$/, "");
    return `${parsed.hostname}${parsed.pathname}${parsed.search ? `?${parsed.searchParams.toString()}` : ""}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function recencyScore(value) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return 35;
  const hours = Math.max(0, (Date.now() - parsed) / 3_600_000);
  if (hours <= 24) return 100;
  if (hours <= 72) return 88;
  if (hours <= 168) return 72;
  if (hours <= 720) return 45;
  return 20;
}

function candidateScore(candidate) {
  const officialBoost = candidate.tier === "official-rss" ? 18 : candidate.tier === "trusted-media" ? 8 : 0;
  const title = candidate.title || "";
  const summary = candidate.summary || "";
  const directTitleBoost = DIRECT_AI_NEWS_PATTERN.test(title) ? 18 : -10;
  const directSummaryBoost = DIRECT_AI_NEWS_PATTERN.test(summary) ? 6 : 0;
  const opinionPenalty = OPINION_NOISE_PATTERN.test(`${title}\n${summary}`) ? -42 : 0;
  return candidate.authority * 0.36 + candidate.freshness * 0.24 + recencyScore(candidate.publishedAt) * 0.3 + officialBoost + directTitleBoost + directSummaryBoost + opinionPenalty;
}

function newsDepthMode() {
  const mode = (arg("news-depth", process.env.ALTOS_BLOG_MARKET_NEWS_DEPTH || "standard") || "standard").toLowerCase();
  if (mode !== "standard" && mode !== "longform") throw new Error(`unknown news depth: ${mode}`);
  return mode;
}

function isFundingQuickCandidate(candidate = {}) {
  const haystack = `${candidate.title || ""}\n${candidate.pageTitle || ""}\n${candidate.summary || ""}\n${candidate.pageDescription || ""}\n${candidate.sourceArticle?.standfirst || ""}`;
  return FUNDING_QUICK_PATTERN.test(haystack);
}

function longformIssues(candidate = {}) {
  const article = candidate.sourceArticle || {};
  const facts = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean) : [];
  const bodyChars = String(article.body || "").trim().length;
  const issues = [];
  if (isFundingQuickCandidate(candidate)) issues.push("funding/financing quick item");
  if (facts.length < MIN_LONGFORM_FACTS) issues.push(`source article facts ${facts.length} below longform threshold ${MIN_LONGFORM_FACTS}`);
  if (bodyChars < MIN_LONGFORM_BODY_CHARS) issues.push(`source article body ${bodyChars} chars below longform threshold ${MIN_LONGFORM_BODY_CHARS}`);
  if (Number(article.extractionConfidence || 0) < 0.7) issues.push("source extraction confidence below longform threshold");
  return issues;
}

function isRelevantMarketCandidate(candidate) {
  const titleAndSummary = `${candidate.title || ""}\n${candidate.summary || ""}`;
  const haystack = `${titleAndSummary}\n${candidate.category || ""}\n${candidate.url || ""}`;
  if (/how we used gemini to build google i\/o 2026/i.test(candidate.title || "")) return false;
  if (/(braintrust|endava|rosalind biodefense|trustworthy third party evaluations|qwen 3\.7|minimax m3)/i.test(candidate.title || "")) return false;
  if (EVENT_PROMO_PATTERN.test(haystack)) return false;
  if (OPINION_NOISE_PATTERN.test(haystack)) return false;
  if (CONSUMER_NOISE_PATTERN.test(haystack) && !ENTERPRISE_INCLUDE_PATTERN.test(candidate.title || "")) return false;
  if (/vercel/i.test(candidate.publisher || "") && !/\b(AI|artificial intelligence|agent|LLM|model|Grok|Qwen|MiniMax|gateway|inference)\b/i.test(candidate.title || "")) {
    return false;
  }
  return TOPIC_INCLUDE_PATTERN.test(titleAndSummary);
}

function coarseTopicKey(candidate) {
  const text = `${candidate.title || ""}\n${candidate.summary || ""}\n${candidate.url || ""}`.toLowerCase();
  if (/bioweapon|biological weapon|biosecurity/.test(text)) return "ai-bioweapons";
  if (/warehouse robot|proteus/.test(text)) return "amazon-warehouse-robot";
  if (/tsmc|semiconductor|chipmaker/.test(text)) return "tsmc-ai-demand";
  if (/ai search|publishers.*opt out|opt out.*ai search/.test(text)) return "ai-search-publisher-optout";
  if (/anthropic.*ipo|ipo.*anthropic/.test(text)) return "anthropic-ipo";
  if (/voice ai|aethex/.test(text)) return "voice-ai-aethex";
  if (/boston children|children.s hospital|rare disease|new diagnoses|new diagnosis/.test(text)) return "boston-childrens-ai-diagnoses";
  return normalizeTitle(candidate.title).split(" ").slice(0, 8).join(" ");
}

async function liveDuplicateState(baseUrl) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog?language=zh-Hant&limit=600`, {
    headers: { "User-Agent": "ALTOS-LAB-market-source-scanner/1.0" }
  });
  if (!response.ok) return { sourceUrls: new Set(), coverUrls: new Set(), coverKeys: new Set(), titleKeys: new Set(), topicKeys: new Set() };
  const payload = await response.json();
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const sourceUrls = posts.flatMap((post) => (post.sourceLinks || []).map((source) => source.url).filter(Boolean));
  const coverUrls = posts.map((post) => post.cover).filter(Boolean);
  return {
    sourceUrls: new Set([...sourceUrls, ...sourceUrls.map(normalizeUrlForDuplicate)]),
    coverUrls: new Set(coverUrls),
    coverKeys: new Set(coverUrls.map(normalizeCoverKey).filter(Boolean)),
    titleKeys: new Set(posts.flatMap((post) => [normalizeTitle(post.title), normalizeTitle(post.topic), normalizeTitle(post.slug)]).filter(Boolean)),
    topicKeys: new Set(posts.map((post) => coarseTopicKey({ title: post.title, summary: post.excerpt || post.topic || "", url: post.slug })).filter(Boolean))
  };
}

async function queueMarketSequences(queueDir, maxPacks) {
  const names = (await fs.readdir(queueDir).catch(() => []))
    .filter((name) => /^\d+-market\.json$/.test(name))
    .sort();
  const sequences = [];
  for (const name of names) {
    const item = await readJson(path.join(queueDir, name)).catch(() => null);
    const sequence = Number(item?.sequence);
    if (Number.isInteger(sequence) && sequence > 0) sequences.push(sequence);
  }
  return sequences.slice(0, maxPacks);
}

async function enrichCandidate(candidate) {
  const page = await fetchText(candidate.url, PAGE_TIMEOUT_MS);
  if (!page.ok) {
    return {
      ...candidate,
      pageStatus: page.status,
      pageTitle: candidate.title,
      pageDescription: candidate.summary,
      imageUrl: "",
      imageProbe: null,
      sourceArticle: null,
      sourceFetchFailed: true
    };
  }
  const imageRaw =
    candidate.feedImageUrl ||
    metaContent(page.text, "og:image") ||
    metaContent(page.text, "twitter:image") ||
    metaContent(page.text, "thumbnail");
  const imageUrl = imageRaw ? absoluteUrl(imageRaw, candidate.url) : "";
  const imageProbe = imageUrl ? await pickUsableImageUrl(imageUrl) : null;
  const sourceArticle = extractSourceArticleFromHtml(candidate, page.text, {
    url: imageProbe?.url || imageUrl,
    credit: candidate.publisher,
    creditUrl: candidate.url,
    probe: imageProbe
  });
  return {
    ...candidate,
    pageStatus: page.status,
    pageTitle: metaContent(page.text, "og:title") || candidate.title,
    pageDescription: metaContent(page.text, "og:description") || metaContent(page.text, "description") || candidate.summary,
    imageUrl: imageProbe?.url || imageUrl,
    imageProbe,
    sourceArticle
  };
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function parsePngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function parseJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: readUInt24LE(buffer, 24) + 1, height: readUInt24LE(buffer, 27) + 1 };
  if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    };
  }
  return null;
}

function parseImageDimensions(buffer) {
  return parsePngDimensions(buffer) || parseJpegDimensions(buffer) || parseWebpDimensions(buffer);
}

function imageUrlAlternates(url) {
  const alternates = [url];
  if (/storage\.googleapis\.com\/gweb-uniblog-publish-prod\/images\//.test(url)) {
    alternates.push(url.replace(/\.max-\d+x\d+\.format-webp\.webp$/i, ".width-1200.format-webp.webp"));
  }
  if (/assets\.vercel\.com\/image\/upload\/contentful\//.test(url)) {
    alternates.push(url.replace("/image/upload/contentful/", "/image/upload/w_1200,h_630,c_fill/contentful/"));
  }
  if (/techcrunch\.com\/wp-content\/uploads\//.test(url) && /[?&]resize=1200,\d+/i.test(url)) {
    alternates.push(url.replace(/([?&]resize=1200),\d+/i, "$1,675"));
  }
  if (/platform\.theverge\.com\/wp-content\/uploads\//.test(url) && /[?&]crop=/i.test(url)) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete("crop");
      parsed.searchParams.set("w", "1200");
      alternates.push(parsed.toString());
    } catch {
      // Keep the original URL if parsing fails.
    }
  }
  if (/wired\.com\/photos\//.test(url) && /\/master\/w_\d+/.test(url)) {
    alternates.push(url.replace(/\/master\/w_\d+/i, "/master/w_1200,c_limit"));
  }
  return [...new Set(alternates)];
}

async function probeImageUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Range: "bytes=0-131071",
        "User-Agent": "ALTOS-LAB-market-source-scanner/1.0; https://altoslab-ai.cc"
      }
    });
    if (!response.ok && response.status !== 206) return { ok: false, url, reason: `image HTTP ${response.status}` };
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = parseImageDimensions(buffer);
    if (!dimensions) return { ok: false, url, contentType, bytes: buffer.length, reason: "image dimensions unavailable" };
    if (!/^image\//.test(contentType) && contentType !== "application/octet-stream") {
      return { ok: false, url, contentType, bytes: buffer.length, dimensions, reason: `unsupported content type ${contentType}` };
    }
    if (buffer.length < MIN_IMAGE_BYTES) {
      return { ok: false, url, contentType, bytes: buffer.length, dimensions, reason: `image bytes ${buffer.length} below ${MIN_IMAGE_BYTES}` };
    }
    if (dimensions.width < MIN_IMAGE_WIDTH || dimensions.height < MIN_IMAGE_HEIGHT) {
      return {
        ok: false,
        url,
        contentType,
        bytes: buffer.length,
        dimensions,
        reason: `image dimensions ${dimensions.width}x${dimensions.height} below ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}`
      };
    }
    return { ok: true, url, contentType, bytes: buffer.length, dimensions };
  } catch (error) {
    return { ok: false, url, reason: error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function pickUsableImageUrl(url) {
  const probes = [];
  for (const candidate of imageUrlAlternates(url)) {
    const probe = await probeImageUrl(candidate);
    probes.push(probe);
    if (probe.ok) return probe;
  }
  return probes[0] || null;
}

function sourceSummary(candidate) {
  const text = String(candidate.sourceArticle?.standfirst || candidate.pageDescription || candidate.summary || "").slice(0, 260);
  return text || "";
}

function marketFrameKeyForCandidate(candidate) {
  const title = candidate.pageTitle || candidate.title;
  const frame = inferMarketFrame({
    topic: title,
    sourceLinks: [
      {
        title,
        url: candidate.url,
        publisher: candidate.publisher,
        publishedAt: candidate.publishedAt,
        summary: sourceSummary(candidate)
      }
    ]
  });
  return frame?.key || "ai-market-update";
}

function sourcePackFromCandidate(sequence, candidate, { newsDepth } = {}) {
  const title = candidate.pageTitle || candidate.title;
  const primaryUrl = candidate.url;
  const publishedAt = candidate.publishedAt || new Date().toISOString();
  const sourceLinks = [
    {
      title: cleanSourceTitle(title),
      url: primaryUrl,
      publisher: candidate.publisher,
      publishedAt,
      summary: sourceSummary(candidate)
    }
  ];
  return {
    sequence,
    topic: title,
    sourceLinks,
    sourceArticle: candidate.sourceArticle,
    primarySourceImageUrl: candidate.imageUrl,
    coverCredit: `Source image: ${candidate.publisher}`,
    coverCreditUrl: primaryUrl,
    whyNow: "This item was selected from verified AI source feeds with a usable credited source image and enough source facts for a source-faithful market brief.",
    zhHantAngle: "用市場快訊口吻整理來源事實，不延伸成專欄或導入方法論。",
    suggestedTitleZh: cleanSourceTitle(title),
    suggestedSubtitleZh: sourceSummary(candidate),
    duplicateRisk: "Scanner checked live source URLs, cover URLs and normalized titles. Main-brain still needs to compare final wording before publish.",
    scanner: {
      generatedAt: new Date().toISOString(),
      sourceId: candidate.sourceId,
      feedUrl: candidate.sourceFeedUrl,
      sourceIndexUrl: candidate.sourceUrl,
      newsDepth,
      sourceArticleFactCount: candidate.sourceArticle?.factBullets?.length || 0,
      sourceArticleBodyChars: String(candidate.sourceArticle?.body || "").length,
      score: Math.round(candidateScore(candidate)),
      pageStatus: candidate.pageStatus,
      imageProbe: candidate.imageProbe
    }
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }
  const date = arg("date", DEFAULT_TARGET_DATE);
  const maxPacks = Number.parseInt(arg("max-packs", String(DEFAULT_MAX_PACKS)), 10) || DEFAULT_MAX_PACKS;
  const baseUrl = arg("base-url", DEFAULT_BASE_URL);
  const sourceProfile = arg("source-profile", "");
  const newsDepth = newsDepthMode();
  const queueDir = path.resolve(arg("queue-dir", path.join(process.cwd(), "data/blog-backfill", date, "queue")));
  const outPath = path.resolve(arg("out", path.join(process.cwd(), "data/blog-backfill", date, "market-source-packs.generated.json")));
  const allRegistry = parseRegistryEntries(await readText(path.join(process.cwd(), "lib/blog-source-registry.ts")));
  const profileIds = SOURCE_PROFILES[sourceProfile];
  if (sourceProfile && !profileIds) throw new Error(`unknown source profile: ${sourceProfile}`);
  const registry = profileIds ? allRegistry.filter((source) => profileIds.has(source.id)) : allRegistry;
  if (profileIds && registry.length !== profileIds.size) {
    const found = new Set(registry.map((source) => source.id));
    const missing = [...profileIds].filter((id) => !found.has(id));
    throw new Error(`source profile ${sourceProfile} is missing registry ids: ${missing.join(", ")}`);
  }
  const live = await liveDuplicateState(baseUrl);
  const sequences = await queueMarketSequences(queueDir, maxPacks);
  if (!sequences.length) throw new Error(`no market queue sequences found in ${queueDir}`);
  const existing = await readJson(outPath).catch(() => []);
  const reservedSourceUrls = new Set(
    Array.isArray(existing)
      ? existing
          .filter((pack) => !sequences.includes(Number(pack.sequence)))
          .map((pack) => pack.sourceLinks?.[0]?.url)
          .filter(Boolean)
      : []
  );

  const feedResults = await Promise.all(
    registry.slice(0, sourceProfile ? registry.length : 18).map(async (source) => {
      const fetched = await fetchText(source.feedUrl, FEED_TIMEOUT_MS);
      return fetched.ok ? parseFeed(fetched.text, source) : [];
    })
  );
  const seenCandidateUrls = new Set();
  const candidates = feedResults
    .flat()
    .filter((candidate) => {
      if (seenCandidateUrls.has(candidate.url)) return false;
      seenCandidateUrls.add(candidate.url);
      if (reservedSourceUrls.has(candidate.url) || reservedSourceUrls.has(normalizeUrlForDuplicate(candidate.url))) return false;
      if (live.sourceUrls.has(candidate.url) || live.sourceUrls.has(normalizeUrlForDuplicate(candidate.url))) return false;
      if (live.titleKeys.has(normalizeTitle(candidate.title))) return false;
      if (live.topicKeys.has(coarseTopicKey(candidate))) return false;
      if (!isRelevantMarketCandidate(candidate)) return false;
      if (newsDepth === "longform" && isFundingQuickCandidate(candidate)) return false;
      return true;
    })
    .sort((a, b) => candidateScore(b) - candidateScore(a));

  const packs = [];
  const skipped = [];
  const sourceCounts = new Map();
  const topicKeys = new Set();
  const candidateWindow = sourceProfile ? maxPacks * 12 : maxPacks * 4;
  for (const candidate of candidates.slice(0, candidateWindow)) {
    if (packs.length >= sequences.length) break;
    const sourceCount = sourceCounts.get(candidate.sourceId) || 0;
    if (sourceProfile && sourceCount >= 2) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "source diversity cap" });
      continue;
    }
    const topicKey = coarseTopicKey(candidate);
    if (sourceProfile && topicKeys.has(topicKey)) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "same event already selected in batch" });
      continue;
    }
    const enriched = await enrichCandidate(candidate);
    if (enriched.sourceFetchFailed) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: `source page fetch failed ${enriched.pageStatus || ""}`.trim() });
      continue;
    }
    if (!enriched.imageUrl) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "missing og/twitter/source image" });
      continue;
    }
    if (!enriched.imageProbe?.ok) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: enriched.imageProbe?.reason || "source image failed preflight" });
      continue;
    }
    if (isGenericStockUrl(enriched.imageUrl)) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "generic stock image host" });
      continue;
    }
    if (live.coverUrls.has(enriched.imageUrl) || live.coverKeys.has(normalizeCoverKey(enriched.imageUrl))) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "cover image already used live" });
      continue;
    }
    if (!enriched.sourceArticle?.canonicalUrl || enriched.sourceArticle.extractionConfidence < 0.6 || enriched.sourceArticle.factBullets.length < 3) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "source article facts below market-news threshold" });
      continue;
    }
    if (newsDepth === "longform") {
      const issues = longformIssues(enriched);
      if (issues.length) {
        skipped.push({ title: candidate.title, url: candidate.url, reason: `longform gate: ${issues.join("; ")}` });
        continue;
      }
    }
    packs.push(sourcePackFromCandidate(sequences[packs.length], enriched, { newsDepth }));
    sourceCounts.set(candidate.sourceId, sourceCount + 1);
    topicKeys.add(topicKey);
  }

  const overwrite = hasFlag("overwrite");
  const existingKept = Array.isArray(existing)
    ? existing.filter((pack) => !overwrite && !sequences.includes(Number(pack.sequence)))
    : [];
  const merged = [...existingKept, ...packs].sort((a, b) => Number(a.sequence) - Number(b.sequence));

  if (hasFlag("write")) {
    await writeJson(outPath, merged);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: !hasFlag("write"),
        registryFeeds: registry.length,
        queueSequences: sequences,
        newsDepth,
        candidates: candidates.length,
        packsGenerated: packs.length,
        outPath,
        skipped: skipped.slice(0, 10).map((item) => ({ title: item.title, reason: item.reason }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
