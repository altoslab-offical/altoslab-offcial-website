#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

function usage() {
  console.log(`
ALTOS LAB missing production helper

Usage:
  node scripts/blog-backfill-missing-prompts.mjs --date <date> --max-market 5 --max-column 3

Outputs:
  data/blog-backfill/<date>/missing-prompts/market-source-worker-missing.md
  data/blog-backfill/<date>/missing-prompts/gemini-column-missing.md
  data/blog-backfill/<date>/missing-prompts/chatgpt-column-visuals-missing.md

Market items use terminal source-worker commands. Column items still create
task-scoped Gemini/GPT prompts. This helper does not publish.
`);
}

function listToMarkdown(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function sourceLinksToMarkdown(sourceLinks = []) {
  return sourceLinks
    .map((source, index) => `${index + 1}. ${source.title || "Untitled"} (${source.publisher || "source"}, ${source.publishedAt || "n.d."})\n   URL: ${source.url}\n   summary: ${source.summary || ""}`)
    .join("\n");
}

function languageBlock(languages) {
  return languages.length === REQUIRED_LANGUAGES.length
    ? REQUIRED_LANGUAGES.join(", ")
    : `${languages.join(", ")}（只補這些缺的語言；不要重做已完成語言）`;
}

function requestedLanguageSet() {
  const raw = arg("languages", "").trim();
  if (!raw) return null;
  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const invalid = values.filter((language) => !REQUIRED_LANGUAGES.includes(language));
  if (invalid.length) fail(`unsupported --languages: ${invalid.join(", ")}`);
  return new Set(values);
}

function requestedSequenceSet(name) {
  const raw = arg(name, "").trim();
  if (!raw) return null;
  const values = raw
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (!values.length) fail(`--${name} must include at least one positive sequence number`);
  return new Set(values);
}

function filterBySequence(items, sequenceSet) {
  if (!sequenceSet) return items;
  return items.filter((item) => sequenceSet.has(Number(item.sequence)));
}

function filterMissingLanguages(item, allowedLanguages) {
  const missing = Array.isArray(item.missingLanguages) ? item.missingLanguages : REQUIRED_LANGUAGES;
  if (!allowedLanguages) return missing;
  return missing.filter((language) => allowedLanguages.has(language));
}

function publicCopyRules() {
  return [
    "文章品質優先，標題和副標要像真正媒體文章，不要像內部任務名稱。",
    "市場快訊只做 source-faithful rewrite/localization：保留事實與來源，不複製原文段落。",
    "專欄要有 ALTOS LAB 的判斷、讀者張力、具體操作情境與可行動段落。",
    "所有 public copy 禁止出現 SEO、GEO、AI-generated、prompt、pipeline、quality gate、rubric 等後台字眼。",
    "不要輸出 ###；H2 只用 ##。",
    "東南亞語言要像當地科技/商業媒體在寫，不要直譯中文語序。"
  ].join("\n");
}

function marketPrompt(items, sourcePacksBySequence) {
  const sections = items.map((item) => {
    const sourcePack = sourcePacksBySequence.get(Number(item.sequence));
    return `## Market sequence ${item.sequence}
Topic: ${sourcePack?.topic || "market news"}
Source image URL: ${sourcePack?.primarySourceImageUrl || ""}
Cover credit: ${sourcePack?.coverCredit || ""} / ${sourcePack?.coverCreditUrl || ""}

Sources:
${sourceLinksToMarkdown(sourcePack?.sourceLinks || [])}

Command:
\`\`\`bash
node scripts/blog-market-source-worker.mjs \\
  --date ${arg("date", DEFAULT_DATE)} \\
  --backfill-dir data/blog-backfill/${arg("date", DEFAULT_DATE)} \\
  --source-packs data/blog-backfill/${arg("date", DEFAULT_DATE)}/market-source-packs.generated.json \\
  --seq ${item.sequence} \\
  --article-set "${item.articleSetPath || ""}" \\
  --write \\
  --overwrite
\`\`\``;
  }).join("\n\n");

  return `# Market Source Worker Missing Items

Market news no longer uses Gemini missing-language prompts. Use the source
worker below so every configured language is generated from the same source
article, source links and credited source image.

${sections}
`;
}

function columnPrompt(items, briefsBySequence) {
  const sections = items.map((item) => {
    const brief = briefsBySequence.get(Number(item.sequence));
    return `## Column sequence ${item.sequence}
Missing languages: ${languageBlock(item.missingLanguages || REQUIRED_LANGUAGES)}
Working title: ${brief?.workingTitleZh || ""}
Subtitle: ${brief?.subtitleZh || ""}
Reader promise: ${brief?.readerPromise || ""}
ALTOS LAB judgment: ${brief?.altosLabJudgment || ""}
Duplicate risk: ${brief?.duplicateRisk || ""}

Argument outline:
${listToMarkdown(brief?.argumentOutline || [])}

FAQ ideas:
${listToMarkdown(brief?.faqIdeas || [])}

Sources:
${sourceLinksToMarkdown(brief?.sourceLinks || [])}`;
  }).join("\n\n");

  return `你是 ALTOS LAB 的深度專欄編輯，請沿用目前 Gemini 對話，不切模型、不重置、不提內部流程。

任務：只補下列專欄缺的語言。若該 sequence 已有部分語言，請不要重寫已完成語言。每個語言都要是當地自然寫法，不要直譯中文。

共通規則：
${publicCopyRules()}

輸出固定 JSON：
{
  "status": "ok",
  "articles": [
    {
      "sequence": <number>,
      "posts": [
        {
          "language": "<requested missing language>",
          "slug": "<localized stable slug>",
          "title": "<magazine-quality title>",
          "subtitle": "<specific, interesting, no template>",
          "excerpt": "<strong hook>",
          "seoTitle": "<public title>",
          "seoDescription": "<public meta description>",
          "geoSummary": "<plain public answer-style summary, no GEO wording>",
          "bodyMarkdown": "<full column body; use ## only; include readable pacing, bold key sentences, no tables unless truly useful>",
          "keyTakeaways": ["<3 bullets>"],
          "faqs": [{"question":"<q>","answer":"<a>"}],
          "tags": ["市場專欄", "AI Agent", "Automation", "ALTOS LAB"],
          "newsCategory": "市場專欄",
          "topic": "<topic>",
          "readTimeMinutes": 8
        }
      ]
    }
  ]
}

只輸出 JSON，不要附解釋。

${sections}
`;
}

function visualPrompt(items, briefsBySequence) {
  const sections = items.map((item) => {
    const brief = briefsBySequence.get(Number(item.sequence));
    return `## Column sequence ${item.sequence}
Working title: ${brief?.workingTitleZh || ""}
Subtitle: ${brief?.subtitleZh || ""}
Reader promise: ${brief?.readerPromise || ""}
Visual need: 1 shared cover + 2-3 shared in-article images for all 9 languages.
Avoid: fake UI, readable text, logos, real people, blue/purple abstract tech wallpaper, repeated glass-tile workflow style.`;
  }).join("\n\n");

  return `你是 ALTOS LAB 的 ChatGPT/GPT visual production tab。請在同一個對話中批次生成/規劃下列專欄視覺，勿切模型、勿換帳號。

任務：每個 sequence 需要 1 張封面 + 2~3 張內文圖。所有語言共用同一組圖片。圖片完成後輸出可回填網站的 JSON metadata。

視覺要求：
- 多樣化，不要每篇都是玻璃流程圖。
- 無真人肖像、無品牌 logo、無可讀文字、無假 UI、無商標風險。
- editorial / magazine / product strategy visual，比例 cover 16:9，內文圖可 16:9 或 4:3。
- 每張都要有 provider, prompt, generatedAt, credit, aspectRatio, placement, alt, caption, visualChecks。

輸出固定 JSON：
{
  "status": "ok",
  "articles": [
    {
      "sequence": <number>,
      "cover": {
        "url": "<public or local URL after upload>",
        "provider": "ChatGPT/GPT",
        "prompt": "<final prompt>",
        "generatedAt": "<ISO>",
        "credit": "ALTOS LAB 編輯視覺",
        "aspectRatio": "16:9",
        "placement": "cover",
        "alt": "<accurate alt>",
        "caption": "<short caption>",
        "visualChecks": {
          "topicFit": true,
          "noTextArtifacts": true,
          "noLogos": true,
          "noPeople": true,
          "noTrademarkRisk": true,
          "noGenericStockLook": true,
          "noFakeUI": true,
          "noBluePurpleAbstract": true
        }
      },
      "contentImages": [
        { "url": "<url>", "provider": "ChatGPT/GPT", "prompt": "<prompt>", "generatedAt": "<ISO>", "credit": "ALTOS LAB 編輯視覺", "aspectRatio": "16:9", "placement": "after-lead", "alt": "<alt>", "caption": "<caption>", "visualChecks": { "topicFit": true, "noTextArtifacts": true, "noLogos": true, "noPeople": true, "noTrademarkRisk": true, "noGenericStockLook": true, "noFakeUI": true, "noBluePurpleAbstract": true } },
        { "url": "<url>", "provider": "ChatGPT/GPT", "prompt": "<prompt>", "generatedAt": "<ISO>", "credit": "ALTOS LAB 編輯視覺", "aspectRatio": "16:9", "placement": "mid-article", "alt": "<alt>", "caption": "<caption>", "visualChecks": { "topicFit": true, "noTextArtifacts": true, "noLogos": true, "noPeople": true, "noTrademarkRisk": true, "noGenericStockLook": true, "noFakeUI": true, "noBluePurpleAbstract": true } }
      ]
    }
  ]
}

${sections}
`;
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    usage();
    return;
  }

  const date = arg("date", DEFAULT_DATE);
  const backfillDir = path.resolve("data/blog-backfill", date);
  const statusPath = path.resolve(arg("status", path.join(backfillDir, "acceleration-status.json")));
  const outputDir = path.resolve(arg("output-dir", path.join(backfillDir, "missing-prompts")));
  const allowedLanguages = requestedLanguageSet();
  const marketSequenceSet = requestedSequenceSet("market-sequences");
  const columnSequenceSet = requestedSequenceSet("column-sequences");
  const visualSequenceSet = requestedSequenceSet("visual-sequences");
  const languageSuffix = allowedLanguages ? `-${[...allowedLanguages].join("-")}` : "";
  const maxMarket = Number.parseInt(arg("max-market", "6"), 10);
  const maxColumn = Number.parseInt(arg("max-column", "3"), 10);

  const status = await readJson(statusPath).catch(() => null);
  if (!status) fail(`missing acceleration status: ${statusPath}`);
  const blocked = Array.isArray(status.blocked) ? status.blocked : [];
  const sourcePacks = await readJson(path.join(backfillDir, "market-source-packs.generated.json")).catch(() => []);
  const briefs = await readJson(path.join(backfillDir, "column-briefs.generated.json")).catch(() => []);
  const sourcePacksBySequence = new Map((Array.isArray(sourcePacks) ? sourcePacks : []).map((item) => [Number(item.sequence), item]));
  const briefsBySequence = new Map((Array.isArray(briefs) ? briefs : []).map((item) => [Number(item.sequence), item]));

  const marketItems = filterBySequence(blocked, marketSequenceSet)
    .filter((item) => item.lane === "market")
    .map((item) => ({ ...item, missingLanguages: filterMissingLanguages(item, allowedLanguages) }))
    .filter((item) => (item.missingLanguages || []).length)
    .slice(0, maxMarket);
  const columnTextItems = filterBySequence(blocked, columnSequenceSet)
    .filter((item) => item.lane === "column")
    .map((item) => ({ ...item, missingLanguages: filterMissingLanguages(item, allowedLanguages) }))
    .filter((item) => (item.missingLanguages || []).length)
    .slice(0, maxColumn);
  const columnVisualItems = filterBySequence(blocked, visualSequenceSet || columnSequenceSet)
    .filter((item) => item.lane === "column")
    .filter((item) => (item.reasons || []).some((reason) => /visual/i.test(reason)))
    .slice(0, maxColumn);

  const outputs = [];
  if (marketItems.length) {
    const filePath = path.join(outputDir, `market-source-worker-missing${languageSuffix}.md`);
    await writeText(filePath, marketPrompt(marketItems, sourcePacksBySequence));
    outputs.push(filePath);
  }
  if (columnTextItems.length) {
    const filePath = path.join(outputDir, `gemini-column-missing${languageSuffix}.md`);
    await writeText(filePath, columnPrompt(columnTextItems, briefsBySequence));
    outputs.push(filePath);
  }
  if (columnVisualItems.length) {
    const filePath = path.join(outputDir, "chatgpt-column-visuals-missing.md");
    await writeText(filePath, visualPrompt(columnVisualItems, briefsBySequence));
    outputs.push(filePath);
  }

  console.log(JSON.stringify({
    ok: true,
    outputDir: path.relative(process.cwd(), outputDir),
    languages: allowedLanguages ? [...allowedLanguages] : "all-missing",
    marketItems: marketItems.map((item) => item.sequence),
    columnTextItems: columnTextItems.map((item) => item.sequence),
    columnVisualItems: columnVisualItems.map((item) => item.sequence),
    outputs: outputs.map((filePath) => path.relative(process.cwd(), filePath))
  }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
