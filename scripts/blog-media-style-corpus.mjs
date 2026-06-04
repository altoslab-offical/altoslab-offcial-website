#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_TARGET = 1000;
const DEFAULT_OUT_DIR = "data/blog-research";
const DESCRIPTION_LIMIT = 280;

const SOURCES = [
  { id: "abmedia", name: "ABMedia", template: "https://abmedia.io/feed/?paged={page}", pages: 60 },
  { id: "blockcast", name: "Blockcast", template: "https://blockcast.it/feed/?paged={page}", pages: 60 },
  { id: "foresight", name: "Foresight News", template: "https://foresightnews.pro/sitemap.xml", pages: 1, mode: "sitemap" },
  { id: "foresight-global", name: "Foresight News Global", template: "https://global.foresightnews.pro/sitemap.xml", pages: 1, mode: "sitemap" },
  { id: "techcrunch-ai", name: "TechCrunch AI", template: "https://techcrunch.com/category/artificial-intelligence/feed/?paged={page}", pages: 30 },
  { id: "venturebeat-ai", name: "VentureBeat AI", template: "https://venturebeat.com/category/ai/feed/?paged={page}", pages: 30 },
  { id: "mit-technology-review", name: "MIT Technology Review", template: "https://www.technologyreview.com/feed/?paged={page}", pages: 30 },
  { id: "the-decoder", name: "The Decoder", template: "https://the-decoder.com/feed/?paged={page}", pages: 30 },
  { id: "the-verge-ai", name: "The Verge AI", template: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", pages: 1 },
  { id: "openai", name: "OpenAI News", template: "https://openai.com/news/rss.xml", pages: 1 },
  { id: "anthropic", name: "Anthropic News", template: "https://www.anthropic.com/news/rss.xml", pages: 1 },
  { id: "deepmind", name: "Google DeepMind", template: "https://deepmind.google/discover/blog/rss.xml", pages: 1 }
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateChars(value = "", limit = DESCRIPTION_LIMIT) {
  const chars = [...String(value || "")];
  if (chars.length <= limit) return String(value || "");
  return `${chars.slice(0, limit).join("").replace(/\s+\S*$/, "").trim()}...`;
}

function tag(block, names) {
  for (const name of names) {
    const escaped = name.replace(/:/g, "\\:");
    const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
    if (match) return stripHtml(match[1]);
  }
  return "";
}

function tags(block, name) {
  const escaped = name.replace(/:/g, "\\:");
  return [...block.matchAll(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "gi"))]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
}

function parseRss(xml, source) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomBlocks = blocks.length ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return [...blocks, ...atomBlocks]
    .map((block) => {
      const link =
        tag(block, ["link"]) ||
        (block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ? stripHtml(block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]) : "");
      return {
        sourceId: source.id,
        sourceName: source.name,
        title: tag(block, ["title"]),
        link,
	        publishedAt: tag(block, ["pubDate", "published", "updated", "dc:date"]),
	        author: tag(block, ["dc:creator", "author", "name"]),
	        categories: tags(block, "category").slice(0, 8),
	        description: truncateChars(tag(block, ["description", "summary", "content:encoded"]))
	      };
    })
    .filter((item) => item.title && item.link);
}

function parseSitemap(xml, source) {
  return [...xml.matchAll(/<url\b[\s\S]*?<\/url>/gi)]
    .map((match) => match[0])
    .map((block) => {
      const link = tag(block, ["loc"]);
      return {
        sourceId: source.id,
        sourceName: source.name,
        title: link.split("/").filter(Boolean).pop()?.replace(/[-_]+/g, " ") || link,
        link,
        publishedAt: tag(block, ["lastmod"]),
        author: "",
        categories: [],
        description: ""
      };
    })
    .filter((item) => item.link && /\/article\//.test(item.link));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5",
      "User-Agent": "ALTOS-LAB-media-style-corpus/1.0"
    },
    signal: AbortSignal.timeout(15_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return text;
}

function uniqKey(item) {
  return (item.link || item.title).replace(/[?#].*$/, "").toLowerCase();
}

function statsFor(item) {
  const text = `${item.title} ${item.description}`;
  return {
    titleLength: [...item.title].length,
    descriptionLength: [...(item.description || "")].length,
    hasNumber: /\d|萬|億|%|％|million|billion|trillion|美元|US\$|\$|円|원/.test(text),
    hasColon: /[:：]/.test(item.title),
    hasQuestion: /[?？]/.test(item.title),
    hasQuote: /[「」『』"“”]/.test(item.title),
    hasDateWord: /\b20\d{2}\b|今日|昨日|本週|今年|月|日|today|yesterday|week|year/i.test(text),
    hasCompanyEntity: /\b(OpenAI|Google|Anthropic|Microsoft|Meta|Amazon|NVIDIA|AethexAI|TechCrunch|a16z|OKX|Binance|Coinbase|Apple)\b/i.test(text)
  };
}

function ratio(items, key) {
  if (!items.length) return 0;
  return Number((items.filter((item) => item.stats[key]).length / items.length).toFixed(3));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarize(items, failures) {
  const bySource = new Map();
  for (const item of items) {
    if (!bySource.has(item.sourceId)) bySource.set(item.sourceId, []);
    bySource.get(item.sourceId).push(item);
  }
  const sourceStats = [...bySource.entries()].map(([sourceId, rows]) => ({
    sourceId,
    sourceName: rows[0]?.sourceName || sourceId,
    count: rows.length,
    titleMedianLength: median(rows.map((row) => row.stats.titleLength)),
    descriptionMedianLength: median(rows.map((row) => row.stats.descriptionLength)),
    numberRatio: ratio(rows, "hasNumber"),
    colonRatio: ratio(rows, "hasColon"),
    questionRatio: ratio(rows, "hasQuestion"),
    quoteRatio: ratio(rows, "hasQuote"),
    dateRatio: ratio(rows, "hasDateWord"),
    companyEntityRatio: ratio(rows, "hasCompanyEntity")
  }));
  return {
    generatedAt: new Date().toISOString(),
    target: Number(arg("target", String(DEFAULT_TARGET))),
    total: items.length,
    sourceStats,
    failures,
    editorialRules: [
      "Market-news subtitle must read like a news standfirst: source/publisher + named entity + concrete event + one number/date/market consequence.",
      "Do not start a market-news excerpt with generic reader utility phrases such as '這則消息可以拿來', '企業檢查', 'market signal', or 'workflow'.",
      "Use one main claim per subtitle. If two claims compete, keep the verifiable event and move interpretation into the final paragraph.",
      "Prefer concrete nouns and reported facts over consultant verbs: raised, launched, reported, acquired, expanded, shipped, disclosed.",
      "For source-translation fast lane, preserve the article identity and do not replace the source story with ALTOS LAB process advice.",
      "Columns may carry a stronger ALTOS LAB thesis, but the first 80 words still need a scene, conflict, or proof point before abstract judgment."
    ]
  };
}

function markdown(summary, examples) {
  const sourceRows = summary.sourceStats
    .map(
      (row) =>
        `| ${row.sourceName} | ${row.count} | ${row.titleMedianLength} | ${row.descriptionMedianLength} | ${row.numberRatio} | ${row.colonRatio} | ${row.companyEntityRatio} |`
    )
    .join("\n");
  const examplesBySource = new Map();
  for (const item of examples) {
    if (!examplesBySource.has(item.sourceName)) examplesBySource.set(item.sourceName, []);
    const list = examplesBySource.get(item.sourceName);
    if (list.length < 6) list.push(item);
  }
  const sampleRows = Array.from(examplesBySource.entries())
    .flatMap(([sourceName, list]) => [
      `### ${sourceName}`,
      ...list.map((item) => `- ${item.title} (${item.link})`),
      ""
    ])
    .join("\n");
  return `# ALTOS LAB Media Style Corpus

Generated: ${summary.generatedAt}

Sampled article metadata: ${summary.total}

## Source Stats

| Source | Count | Median title | Median description | Number ratio | Colon ratio | Entity ratio |
|---|---:|---:|---:|---:|---:|---:|
${sourceRows}

## Editorial Rules

${summary.editorialRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}

## Example Titles

${sampleRows}

## Fetch Failures

${summary.failures.length ? summary.failures.map((failure) => `- ${failure.sourceId}: ${failure.url} - ${failure.error}`).join("\n") : "- None"}
`;
}

async function main() {
  const target = Number.parseInt(arg("target", String(DEFAULT_TARGET)), 10) || DEFAULT_TARGET;
  const outDir = path.resolve(arg("out-dir", DEFAULT_OUT_DIR));
  const maxPages = Number.parseInt(arg("pages", "0"), 10) || 0;
  const perSourceLimit = Number.parseInt(arg("per-source-limit", "250"), 10) || 250;
  const dryRun = hasFlag("dry-run");
  const items = [];
  const seen = new Set();
  const failures = [];

  for (const source of SOURCES) {
    let stagnantPages = 0;
    let sourceCount = 0;
    const pageLimit = maxPages || source.pages || 1;
    for (let page = 1; page <= pageLimit && items.length < target && sourceCount < perSourceLimit; page += 1) {
      const url = source.template.replace("{page}", String(page));
      try {
        const text = await fetchText(url);
        const parsed = source.mode === "sitemap" ? parseSitemap(text, source) : parseRss(text, source);
        if (page === 1 && parsed.length === 0) {
          failures.push({ sourceId: source.id, url, error: "no parseable RSS/sitemap articles" });
        }
        let added = 0;
        for (const item of parsed) {
          const key = uniqKey(item);
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({ ...item, stats: statsFor(item) });
          added += 1;
          sourceCount += 1;
          if (items.length >= target || sourceCount >= perSourceLimit) break;
        }
        stagnantPages = added ? 0 : stagnantPages + 1;
        if (stagnantPages >= 2) break;
      } catch (error) {
        failures.push({ sourceId: source.id, url, error: error instanceof Error ? error.message : String(error) });
        break;
      }
    }
  }

  const summary = summarize(items, failures);
  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "media-style-corpus.json"), `${JSON.stringify({ summary, items }, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(outDir, "media-style-corpus.md"), markdown(summary, items), "utf8");
  console.log(JSON.stringify({ ok: true, outDir, total: items.length, failures: failures.length }, null, 2));
  if (items.length < Math.min(target, 500)) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
