#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";

const DEFAULT_SEEDS = "data/blog-research/nine-language-style-corpus-seeds.json";
const DEFAULT_OUT_DIR = "data/blog-research/nine-language-style-corpus";
const DEFAULT_MAX_PER_SITE = 50;
const DEFAULT_CONCURRENCY = 4;
const EXCERPT_CHAR_LIMIT = 1200;
const USER_AGENT = "ALTOS-LAB-style-corpus/1.0 (+https://altoslab-ai.cc)";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function positiveInt(name, fallback) {
  const value = Number.parseInt(arg(name, String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;|&#039;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, " ")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function sameHostOrPath(baseUrl, candidate) {
  try {
    const base = new URL(baseUrl);
    const url = new URL(candidate, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return cleanUrl(url.toString());
  } catch {
    return "";
  }
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function truncateChars(value = "", limit = EXCERPT_CHAR_LIMIT) {
  const chars = [...String(value || "").replace(/\s+/g, " ").trim()];
  if (chars.length <= limit) return chars.join("");
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

function attr(html, selector) {
  const match = html.match(selector);
  return match?.[1] ? stripHtml(match[1]) : "";
}

function parseFeed(xml, site) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomBlocks = blocks.length ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return [...blocks, ...atomBlocks]
    .map((block) => {
      const atomHref = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
      const link = cleanUrl(tag(block, ["link"]) || atomHref);
      return {
        siteId: site.id,
        url: link,
        sourceTitle: tag(block, ["title"]),
        sourcePublishedAt: tag(block, ["pubDate", "published", "updated", "dc:date"])
      };
    })
    .filter((item) => item.url);
}

function parseSitemap(xml, site) {
  const urls = [...xml.matchAll(/<url\b[\s\S]*?<\/url>/gi)]
    .map((match) => match[0])
    .map((block) => ({
      siteId: site.id,
      url: cleanUrl(tag(block, ["loc"])),
      sourcePublishedAt: tag(block, ["lastmod"])
    }))
    .filter((item) => item.url);
  return urls;
}

function looksArticleUrl(url) {
  return /\/(blog|news|article|articles|posts|post|index|topics|tag|category|helloworld|learn|artigos|actualites|thematique|magazin|tips|tricks|products|research|reports|inteligencia|kuenstliche|artificial|ai|ia|llm|agent|agents|生成|人工智慧|智能|인공지능|블로그|記事|ニュース)/i.test(url);
}

function looksArticleDetailUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (/\/(?:tag|tags|topic|topics|category|categories|search|rss|feed|page|archive)(?:\/|$)/i.test(path)) return false;
    if (/\/(?:blog|news|article|articles|posts|post)\/.+/i.test(path)) return true;
    if (/\/20\d{2}\/\d{1,2}\/\d{1,2}\//.test(path)) return true;
    if (/\/20\d{2}\/\d{1,2}\//.test(path)) return true;
    if (/\/news\/\d{4,}/.test(path)) return true;
    if (/\.(?:html|htm)$/i.test(path) && path.split("/").filter(Boolean).length >= 2) return true;
    return false;
  } catch {
    return false;
  }
}

function parseLinks(html, baseUrl, site) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = sameHostOrPath(baseUrl, match[1]);
    if (!url || !looksArticleUrl(url) || !looksArticleDetailUrl(url)) continue;
    links.push({
      siteId: site.id,
      url,
      sourceTitle: stripHtml(match[2])
    });
  }
  return links;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.5",
      "User-Agent": USER_AGENT
    },
    signal: AbortSignal.timeout(20_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return { text, contentType: response.headers.get("content-type") || "" };
}

async function discoverForSite(site, maxPerSite) {
  const candidates = new Map();
  const failures = [];
  const urls = [...site.hubUrls];
  for (const hub of site.hubUrls) {
    try {
      const parsed = new URL(hub);
      urls.push(`${parsed.origin}/sitemap.xml`, `${parsed.origin}/feed`, `${parsed.origin}/rss.xml`);
    } catch {
      // Ignore invalid seed URL.
    }
  }

  for (const url of [...new Set(urls.map(cleanUrl).filter(Boolean))]) {
    if (candidates.size >= maxPerSite * 2) break;
    try {
      const { text, contentType } = await fetchText(url);
      const rows =
        /xml|rss|atom/i.test(contentType) || /<(rss|feed|urlset)\b/i.test(text)
          ? text.includes("<urlset")
            ? parseSitemap(text, site)
            : parseFeed(text, site)
          : parseLinks(text, url, site);
      for (const row of rows) {
        if (!row.url || !looksArticleUrl(row.url) || !looksArticleDetailUrl(row.url)) continue;
        candidates.set(row.url, { ...row, discoveryUrl: url });
        if (candidates.size >= maxPerSite * 2) break;
      }
    } catch (error) {
      failures.push({ url, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    site,
    candidates: [...candidates.values()].slice(0, maxPerSite),
    failures
  };
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return attr(html, new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
}

function headings(html) {
  return [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({ level: `h${match[1]}`, text: stripHtml(match[2]) }))
    .filter((item) => item.text && item.text.length <= 180)
    .slice(0, 24);
}

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function extractArticle(html, site, candidate) {
  const outline = headings(html);
  const h1Title = outline.find((item) => item.level === "h1")?.text || "";
  const title =
    h1Title ||
    metaContent(html, "og:title") ||
    stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") ||
    candidate.sourceTitle ||
    "";
  const metaDescription =
    metaContent(html, "description") ||
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description");
  const publishedAt =
    metaContent(html, "article:published_time") ||
    attr(html, /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i) ||
    candidate.sourcePublishedAt ||
    "";
  const updatedAt = metaContent(html, "article:modified_time") || "";
  const bodyText = stripHtml(
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
      html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ||
      html
  );
  const lead = truncateChars(bodyText, 420);
  const excerpt = truncateChars(bodyText, EXCERPT_CHAR_LIMIT);
  const internalLinks = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => sameHostOrPath(candidate.url, match[1]))
    .filter((url) => {
      if (!url) return false;
      try {
        return new URL(url).hostname === new URL(candidate.url).hostname;
      } catch {
        return false;
      }
    }).length;
  const externalLinks = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => sameHostOrPath(candidate.url, match[1]))
    .filter((url) => {
      if (!url) return false;
      try {
        return new URL(url).hostname !== new URL(candidate.url).hostname;
      } catch {
        return false;
      }
    }).length;

  return {
    site: site.name,
    site_id: site.id,
    language: site.language,
    country: site.country,
    url: candidate.url,
    discovery_url: candidate.discoveryUrl,
    content_type: "article_or_guide",
    published_at: publishedAt,
    updated_at: updatedAt,
    title,
    meta_title: title,
    meta_description: metaDescription,
    lead_200: lead,
    outline,
    word_count: bodyText.split(/\s+/).filter(Boolean).length,
    primary_keyword_guess: title.split(/[|｜:：\-–—]/)[0]?.trim() || title,
    entities: [...new Set((`${title} ${metaDescription}`.match(/\b[A-Z][A-Za-z0-9.+-]{2,}\b/g) || []).slice(0, 12))],
    internal_link_count: internalLinks,
    external_link_count: externalLinks,
    image_count: countMatches(html, /<img\b/gi),
    video_flag: /<(video|iframe)\b/i.test(html),
    has_faq: /FAQ|常見問題|よくある質問|자주 묻는 질문|preguntas frecuentes|perguntas frequentes/i.test(html),
    copyright_note: "metadata_outline_short_excerpt_only",
    crawl_visibility_note: "seeded crawl; verify robots and terms before increasing excerpt retention",
    api_note: site.cadence,
    excerpt,
    hash: hash(`${candidate.url}\n${title}\n${metaDescription}\n${outline.map((item) => item.text).join("\n")}`),
    last_seen_at: new Date().toISOString()
  };
}

async function mapLimit(items, limit, task) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      results.push(await task(current));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function summarize(rows, seedSites, failures, maxPerSite) {
  const bySite = new Map(seedSites.map((site) => [site.id, []]));
  for (const row of rows) bySite.get(row.site_id)?.push(row);
  const sites = seedSites.map((site) => {
    const siteRows = bySite.get(site.id) || [];
    return {
      id: site.id,
      name: site.name,
      language: site.language,
      country: site.country,
      target: maxPerSite,
      absorbed: siteRows.length,
      meets_target: siteRows.length >= maxPerSite,
      title_median_chars: median(siteRows.map((row) => [...row.title || ""].length)),
      outline_ratio: siteRows.length ? Number((siteRows.filter((row) => row.outline.length >= 2).length / siteRows.length).toFixed(2)) : 0,
      faq_ratio: siteRows.length ? Number((siteRows.filter((row) => row.has_faq).length / siteRows.length).toFixed(2)) : 0,
      image_ratio: siteRows.length ? Number((siteRows.filter((row) => row.image_count > 0).length / siteRows.length).toFixed(2)) : 0
    };
  });
  return {
    generated_at: new Date().toISOString(),
    seed_sites: seedSites.length,
    target_per_site: maxPerSite,
    total_target: seedSites.length * maxPerSite,
    absorbed_total: rows.length,
    complete_sites: sites.filter((site) => site.meets_target).length,
    incomplete_sites: sites.filter((site) => !site.meets_target).map((site) => ({
      id: site.id,
      absorbed: site.absorbed,
      target: site.target
    })),
    sites,
    failures: failures.slice(0, 200)
  };
}

function median(values) {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!filtered.length) return 0;
  return filtered[Math.floor(filtered.length / 2)];
}

function markdownReport(summary) {
  const lines = [
    "# Nine-language AI SEO Style Corpus Intake",
    "",
    `Generated: ${summary.generated_at}`,
    `Seed sites: ${summary.seed_sites}`,
    `Target per site: ${summary.target_per_site}`,
    `Absorbed total: ${summary.absorbed_total}/${summary.total_target}`,
    "",
    "## Site Coverage",
    "",
    "| Site | Language | Country | Absorbed | Target | Outline ratio | FAQ ratio |",
    "|---|---|---|---:|---:|---:|---:|"
  ];
  for (const site of summary.sites) {
    lines.push(`| ${site.name} | ${site.language} | ${site.country} | ${site.absorbed} | ${site.target} | ${site.outline_ratio} | ${site.faq_ratio} |`);
  }
  if (summary.incomplete_sites.length) {
    lines.push("", "## Incomplete Sites", "");
    for (const site of summary.incomplete_sites) lines.push(`- ${site.id}: ${site.absorbed}/${site.target}`);
  }
  lines.push(
    "",
    "## Use Rules",
    "",
    "1. Hermes may learn structure, title patterns, lead rhythm, FAQ placement, and internal-link habits from this corpus.",
    "2. Hermes must not copy source passages. Generated articles need source-bounded facts plus original ALTOS LAB judgment.",
    "3. OpenClaw owns crawling and coverage repair; Codex owns quality gate and production release evidence.",
    "4. A site is style-ready only after `absorbed >= target_per_site` and the rows pass title, lead, outline, language-purity, and rights checks."
  );
  return `${lines.join("\n")}\n`;
}

async function main() {
  const seedsPath = arg("seeds", DEFAULT_SEEDS);
  const outDir = arg("out-dir", DEFAULT_OUT_DIR);
  const maxPerSite = positiveInt("max-per-site", DEFAULT_MAX_PER_SITE);
  const concurrency = positiveInt("concurrency", DEFAULT_CONCURRENCY);
  const onlySite = arg("site", "");
  const discoverOnly = hasFlag("discover-only");
  const seeds = JSON.parse(await fs.readFile(seedsPath, "utf8"));
  const seedSites = (seeds.sites || []).filter((site) => !onlySite || site.id === onlySite);
  if (!seedSites.length) throw new Error(`No seed sites selected from ${seedsPath}`);

  const discovery = await mapLimit(seedSites, Math.min(concurrency, 4), (site) => discoverForSite(site, maxPerSite));
  const discoveryFailures = discovery.flatMap((item) => item.failures.map((failure) => ({ site_id: item.site.id, ...failure })));
  const candidates = discovery.flatMap((item) => item.candidates.map((candidate) => ({ site: item.site, candidate })));

  const rows = [];
  const fetchFailures = [];
  if (!discoverOnly) {
    await mapLimit(candidates, concurrency, async ({ site, candidate }) => {
      try {
        const { text } = await fetchText(candidate.url);
        rows.push(extractArticle(text, site, candidate));
      } catch (error) {
        fetchFailures.push({
          site_id: site.id,
          url: candidate.url,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  const summary = summarize(rows, seedSites, [...discoveryFailures, ...fetchFailures], maxPerSite);
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawPath = path.join(outDir, `${stamp}-raw.json`);
  const summaryPath = path.join(outDir, `${stamp}-summary.json`);
  const reportPath = path.join(outDir, `${stamp}-report.md`);
  const latestRawPath = path.join(outDir, "latest-raw.json");
  const latestSummaryPath = path.join(outDir, "latest-summary.json");
  const latestReportPath = path.join(outDir, "latest-report.md");
  const discoveryPath = path.join(outDir, `${stamp}-discovery.json`);

  await fs.writeFile(discoveryPath, `${JSON.stringify({ generated_at: summary.generated_at, candidates, failures: discoveryFailures }, null, 2)}\n`);
  await fs.writeFile(rawPath, `${JSON.stringify(rows, null, 2)}\n`);
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(reportPath, markdownReport(summary));
  await fs.copyFile(rawPath, latestRawPath);
  await fs.copyFile(summaryPath, latestSummaryPath);
  await fs.copyFile(reportPath, latestReportPath);

  console.log(
    JSON.stringify(
      {
        ok: true,
        discoverOnly,
        seedSites: seedSites.length,
        candidates: candidates.length,
        absorbed: rows.length,
        target: seedSites.length * maxPerSite,
        completeSites: summary.complete_sites,
        outDir,
        rawPath,
        summaryPath,
        reportPath,
        discoveryPath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
