#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function chars(value = "") {
  return [...String(value || "").trim()].length;
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function invalidTitle(title = "") {
  const text = cleanText(title);
  if (chars(text) < 12) return true;
  return /^(The Verge|MIT Technology Review|Artificial intelligence|Newsletters|ニュース|More From|Posts pagination|전체 < 기사목록|Berita|Feature|Review|Indeks Berita|AI - Cập nhật|Tổng hợp Tin tức|Techsauce \||Guides Archives|News Archives|Gadget Reviews Archives|Ledge\.ai \| ラーニング)$/i.test(text);
}

function validHeading(text = "") {
  const value = cleanText(text);
  if (chars(value) < 8 || chars(value) > 110) return false;
  if (/^(More From|Most Popular|Pagination|Top Stories|The Verge Daily|Posts pagination|Frequently Asked Questions|Review|FAQ|熱門新聞|大會資訊|專題報導)$/i.test(value)) {
    return false;
  }
  return true;
}

function languageRules(language, rows) {
  const titles = rows.map((row) => cleanText(row.title)).filter(Boolean);
  const headings = rows.flatMap((row) => (row.outline || []).filter((item) => item.level === "h2").map((item) => cleanText(item.text))).filter(validHeading);
  const leads = rows.map((row) => cleanText(row.lead_200)).filter((lead) => chars(lead) >= 80);
  const withColon = titles.filter((title) => /[:：]/.test(title)).length;
  const withQuestion = titles.filter((title) => /[?？]/.test(title)).length;
  const withNumber = titles.filter((title) => /\d/.test(title)).length;
  const titleLengths = titles.map(chars).sort((a, b) => a - b);
  const medianTitleChars = titleLengths[Math.floor(titleLengths.length / 2)] || 0;
  const h2Lengths = headings.map(chars).sort((a, b) => a - b);
  const medianH2Chars = h2Lengths[Math.floor(h2Lengths.length / 2)] || 0;

  return {
    language,
    validArticleCount: rows.length,
    siteCount: new Set(rows.map((row) => row.site)).size,
    medianTitleChars,
    medianH2Chars,
    titlePatterns: {
      colonRatio: titles.length ? Number((withColon / titles.length).toFixed(2)) : 0,
      questionRatio: titles.length ? Number((withQuestion / titles.length).toFixed(2)) : 0,
      numberRatio: titles.length ? Number((withNumber / titles.length).toFixed(2)) : 0
    },
    titleSignals: titles.slice(0, 18),
    sectionSubtitleSignals: headings.slice(0, 30),
    leadSignals: leads.slice(0, 10),
    productionRules: [
      "Title must carry a decision tension, concrete entity, number, or useful contrast; do not use a plain declarative sentence when a sharper reader promise is available.",
      "Section subtitles are article pacing devices, not process labels. Prefer 4-6 H2s with tension, mechanism, evidence, reader decision, and next move.",
      "Every H2 should make the reader want the next paragraph; avoid generic labels such as field note, decision framework, next signal, and control points.",
      "For GEO, the lead and at least two sections need named entities, source-backed facts, and a citable claim that remains accurate without hype."
    ]
  };
}

function markdown(signals, coverage) {
  const lines = [
    "# ALTOS LAB Multilingual Column Style Signals",
    "",
    `Generated: ${signals.generatedAt}`,
    `Valid rows used: ${signals.validRows}/${signals.rawRows}`,
    "",
    "## Coverage Truth",
    "",
    "| Language | Valid rows | Sites | Median title chars | Median H2 chars |",
    "|---|---:|---:|---:|---:|"
  ];
  for (const item of signals.languages) {
    lines.push(`| ${item.language} | ${item.validArticleCount} | ${item.siteCount} | ${item.medianTitleChars} | ${item.medianH2Chars} |`);
  }
  lines.push("", "## Platform Coverage Gaps", "");
  for (const site of coverage.incompleteSites || []) {
    lines.push(`- ${site.id}: ${site.absorbed}/${site.target}`);
  }
  lines.push("", "## Durable Editorial Rules", "");
  lines.push("- H2/H3 are section subtitles. They must be compact, reader-facing, and specific to the article argument.");
  lines.push("- Good column titles usually combine entity + tension + implication; weak titles merely describe the topic.");
  lines.push("- Keep column bodies to 4-6 major sections unless it is a true feature. More sections should mean more editorial assets, not more template labels.");
  lines.push("- In-article images must be placed by explicit markers or separated across the argument; two generated images cannot sit together.");
  lines.push("- Save compact style signals only. Do not copy or store full third-party articles.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const rawPath = path.resolve(arg("raw"));
  const summaryPath = path.resolve(arg("summary", ""));
  const outPath = path.resolve(arg("out", "data/blog-research/nine-language-column-style-signals-20260624.json"));
  if (!rawPath || rawPath === process.cwd()) throw new Error("--raw is required");
  const rows = JSON.parse(await fs.readFile(rawPath, "utf8"));
  const summary = summaryPath && summaryPath !== process.cwd() ? JSON.parse(await fs.readFile(summaryPath, "utf8")) : {};
  const validRows = rows.filter((row) => !invalidTitle(row.title) && (row.outline || []).some((item) => item.level === "h2" && validHeading(item.text)));
  const byLanguage = new Map();
  for (const row of validRows) {
    const bucket = byLanguage.get(row.language) || [];
    bucket.push(row);
    byLanguage.set(row.language, bucket);
  }
  const signals = {
    generatedAt: new Date().toISOString(),
    sourceRawPath: path.relative(process.cwd(), rawPath),
    rawRows: rows.length,
    validRows: validRows.length,
    copyrightPolicy: "compact_style_signals_only_no_full_articles",
    languages: [...byLanguage.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([language, items]) => languageRules(language, items))
  };
  const coverage = {
    incompleteSites: summary.incomplete_sites || [],
    failures: (summary.failures || []).slice(0, 80)
  };
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify({ signals, coverage }, null, 2)}\n`);
  const reportPath = outPath.replace(/\.json$/i, ".md");
  await fs.writeFile(reportPath, markdown(signals, coverage));
  console.log(JSON.stringify({ ok: true, rawRows: rows.length, validRows: validRows.length, outPath, reportPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
