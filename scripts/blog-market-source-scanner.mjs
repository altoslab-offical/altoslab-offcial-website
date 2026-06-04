#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASE_URL = "https://altoslab-ai.cc";
const DEFAULT_TARGET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const DEFAULT_MAX_PACKS = 10;
const FEED_TIMEOUT_MS = 8000;
const PAGE_TIMEOUT_MS = 12000;
const IMAGE_TIMEOUT_MS = 6500;
const MIN_IMAGE_WIDTH = 1200;
const MIN_IMAGE_HEIGHT = 630;
const MIN_IMAGE_BYTES = 40_000;
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
const ENTERPRISE_INCLUDE_PATTERN =
  /\b(AI|artificial intelligence|agent|agents|ChatGPT|Claude|Gemini|Codex|OpenAI|Anthropic|DeepMind|LLM|model|machine learning|inference|automation|robot|robotics|developer|software|cloud|data|governance|safety|security|compute|GPU|chip|enterprise|business|workflow|API|runtime|platform|infrastructure)\b/i;
const CONSUMER_NOISE_PATTERN =
  /\b(thrift|vintage shopping|shopping|recipe|recipes|travel tips|fashion|movie|music|celebrity|sports|holiday|gift guide)\b/i;

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
  npm run blog:market-sources -- --date 2026-06-04 --queue-dir data/blog-backfill/2026-06-04/queue --write
  node scripts/blog-market-source-scanner.mjs --max-packs 6 --write --overwrite

Options:
  --base-url <url>       Defaults to ${DEFAULT_BASE_URL}
  --date <yyyy-mm-dd>    Defaults to today in Asia/Taipei
  --queue-dir <path>     Defaults to data/blog-backfill/<date>/queue
  --out <path>           Defaults to data/blog-backfill/<date>/market-source-packs.generated.json
  --max-packs <n>        Defaults to ${DEFAULT_MAX_PACKS}
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
  return candidate.authority * 0.36 + candidate.freshness * 0.24 + recencyScore(candidate.publishedAt) * 0.3 + officialBoost;
}

function isRelevantMarketCandidate(candidate) {
  const haystack = `${candidate.title || ""}\n${candidate.summary || ""}\n${candidate.category || ""}`;
  if (/how we used gemini to build google i\/o 2026/i.test(candidate.title || "")) return false;
  if (/(braintrust|endava|rosalind biodefense|trustworthy third party evaluations|qwen 3\.7|minimax m3)/i.test(candidate.title || "")) return false;
  if (CONSUMER_NOISE_PATTERN.test(haystack) && !ENTERPRISE_INCLUDE_PATTERN.test(candidate.title || "")) return false;
  if (/vercel/i.test(candidate.publisher || "") && !/\b(AI|artificial intelligence|agent|LLM|model|Grok|Qwen|MiniMax|gateway|inference)\b/i.test(candidate.title || "")) {
    return false;
  }
  return TOPIC_INCLUDE_PATTERN.test(haystack);
}

async function liveDuplicateState(baseUrl) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/blog`, {
    headers: { "User-Agent": "ALTOS-LAB-market-source-scanner/1.0" }
  });
  if (!response.ok) return { sourceUrls: new Set(), coverUrls: new Set(), titleKeys: new Set() };
  const payload = await response.json();
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  return {
    sourceUrls: new Set(posts.flatMap((post) => (post.sourceLinks || []).map((source) => source.url).filter(Boolean))),
    coverUrls: new Set(posts.map((post) => post.cover).filter(Boolean)),
    titleKeys: new Set(posts.map((post) => normalizeTitle(post.title)).filter(Boolean))
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
  const imageRaw =
    candidate.feedImageUrl ||
    metaContent(page.text, "og:image") ||
    metaContent(page.text, "twitter:image") ||
    metaContent(page.text, "thumbnail");
  const imageUrl = imageRaw ? absoluteUrl(imageRaw, candidate.url) : "";
  const imageProbe = imageUrl ? await pickUsableImageUrl(imageUrl) : null;
  return {
    ...candidate,
    pageStatus: page.status,
    pageTitle: metaContent(page.text, "og:title") || candidate.title,
    pageDescription: metaContent(page.text, "og:description") || metaContent(page.text, "description") || candidate.summary,
    imageUrl: imageProbe?.url || imageUrl,
    imageProbe
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
  const text = String(candidate.pageDescription || candidate.summary || "").slice(0, 220);
  return text || `${candidate.publisher} published an AI market update that should be checked against the original source.`;
}

function sourcePackFromCandidate(sequence, candidate) {
  const title = candidate.pageTitle || candidate.title;
  const primaryUrl = candidate.url;
  const publishedAt = candidate.publishedAt || new Date().toISOString();
  return {
    sequence,
    topic: title,
    sourceLinks: [
      {
        title,
        url: primaryUrl,
        publisher: candidate.publisher,
        publishedAt,
        summary: sourceSummary(candidate)
      },
      {
        title: `${candidate.publisher} source index`,
        url: candidate.sourceUrl,
        publisher: candidate.publisher,
        publishedAt,
        summary: `Source index used to confirm this item came from ${candidate.publisher}'s current AI feed; article claims should remain anchored to the primary source.`
      }
    ],
    primarySourceImageUrl: candidate.imageUrl,
    coverCredit: `Source image: ${candidate.publisher}`,
    coverCreditUrl: primaryUrl,
    whyNow: "This item was selected from the latest verified AI source feeds and has a usable source/official image, so it can move through the fast market-news lane without opening Gemini.",
    zhHantAngle: "把這則海外 AI 消息整理成台灣與亞洲企業能立刻判斷的採用訊號：它改變了哪個工作流、採購或風險檢查點。",
    suggestedTitleZh: title,
    suggestedSubtitleZh: "快速整理事件、來源與對企業下一步的影響，不延伸成長篇專欄。",
    duplicateRisk: "Scanner checked live source URLs, cover URLs and normalized titles. Main-brain still needs to compare final wording before publish.",
    scanner: {
      generatedAt: new Date().toISOString(),
      sourceId: candidate.sourceId,
      feedUrl: candidate.sourceFeedUrl,
      score: Math.round(candidateScore(candidate)),
      pageStatus: candidate.pageStatus
      ,
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
  const queueDir = path.resolve(arg("queue-dir", path.join(process.cwd(), "data/blog-backfill", date, "queue")));
  const outPath = path.resolve(arg("out", path.join(process.cwd(), "data/blog-backfill", date, "market-source-packs.generated.json")));
  const registry = parseRegistryEntries(await readText(path.join(process.cwd(), "lib/blog-source-registry.ts")));
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
    registry.slice(0, 18).map(async (source) => {
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
      if (reservedSourceUrls.has(candidate.url)) return false;
      if (live.sourceUrls.has(candidate.url)) return false;
      if (live.titleKeys.has(normalizeTitle(candidate.title))) return false;
      if (!isRelevantMarketCandidate(candidate)) return false;
      return true;
    })
    .sort((a, b) => candidateScore(b) - candidateScore(a));

  const packs = [];
  const skipped = [];
  for (const candidate of candidates.slice(0, maxPacks * 4)) {
    if (packs.length >= sequences.length) break;
    const enriched = await enrichCandidate(candidate);
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
    if (live.coverUrls.has(enriched.imageUrl)) {
      skipped.push({ title: candidate.title, url: candidate.url, reason: "cover image already used live" });
      continue;
    }
    packs.push(sourcePackFromCandidate(sequences[packs.length], enriched));
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
