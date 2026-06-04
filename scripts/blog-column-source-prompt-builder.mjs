#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

function sourceLines(pack) {
  return (pack.sourceLinks || [])
    .map((source, index) => {
      const date = source.publishedAt || source.accessedAt || "accessed 2026-06-04";
      return `${index + 1}. ${source.title} - ${source.publisher} (${date})
   URL: ${source.url}
   usable context: ${source.summary || source.context || ""}`;
    })
    .join("\n");
}

function promptForPack(pack, date) {
  const sequence = Number(pack.sequence);
  const title = pack.workingTitleZh;
  return `你是 ALTOS LAB 的資深市場專欄主筆。請用繁體中文寫一篇「市場專欄」，不是快訊，不要像模板文。

文章目標：
- 題目方向：${title}
- 讀者：${pack.targetReader}
- 核心判斷：${pack.coreThesis}
- 為什麼現在要寫：${pack.whyNow}
- 文章要好讀、有節奏、有真人觀點，但不能誇張、不能空泛、不能編案例。
- 先把一篇 zh-Hant 源稿寫好；其他語言會另外本地化，不需要你翻譯。

來源素材，必須只根據這些來源延伸，不要補假資料：
${sourceLines(pack)}

寫法要求：
- 開頭 40-80 字就要讓讀者知道「為什麼這篇值得看」。
- title 和 subtitle 要自然、有吸引力，不要像報告題名。
- 至少 6 個 ## 小標，不能出現 ###。
- 全文要有 1800-2600 個中文字左右。
- 要有 3-5 個可掃讀的重點 bullets。
- 至少 1 段「ALTOS LAB 判斷」式的可引用觀點，但不要把它寫成制式標題。
- 可以有短表格或決策清單，但不要每篇都像表格文章。
- 需要 FAQ 3 則。
- 可用 **粗體** 標出真正重要的短句；不要整段粗體。
- 不要在公開文案中提到 SEO、GEO、AI-generated、prompt、pipeline、quality gate、rubric。
- 不要寫「來源轉譯」、「內部流程」、「品質審核」這類後台字眼。
- 不要替任何產品做銷售。

視覺需求：
- 文章會有一張 GPT 共享封面與 2-3 張內文圖；請在 body 中於適合位置放入 [IMAGE:opening] 與 [IMAGE:mechanism]，必要時可放 [IMAGE:synthesis]。
- 圖片佔位前後要有自然段落，不要讓圖片像硬插入。

請只輸出 JSON，不要加解釋，不要 markdown code fence：
{
  "status": "ok",
  "sequence": ${sequence},
  "post": {
    "language": "zh-Hant",
    "slug": "kebab-case-english-slug",
    "title": "...",
    "subtitle": "...",
    "excerpt": "...",
    "seoTitle": "...",
    "seoDescription": "...",
    "geoSummary": "...",
    "contentType": "column",
    "newsCategory": "市場專欄",
    "topic": "...",
    "audience": "...",
    "body": "## ...",
    "keyTakeaways": ["...", "...", "..."],
    "faqs": [{"question": "...", "answer": "..."}],
    "tags": ["市場專欄", "AI", "..."],
    "author": "${sequence % 4 === 0 ? "Ken" : "Tommy"}",
    "readTimeMinutes": 8
  },
  "editorNotes": ["..."]
}

Run metadata:
- date: ${date}
- sequence: ${sequence}
`;
}

async function main() {
  const sourcePackPath = arg("source-pack");
  const outDir = path.resolve(arg("out-dir", "data/blog-backfill/2026-06-04/column-production/prompts"));
  const date = arg("date", "2026-06-04");
  if (!sourcePackPath) fail("--source-pack is required");
  const packs = await readJson(path.resolve(sourcePackPath));
  if (!Array.isArray(packs) || !packs.length) fail("--source-pack must contain an array");
  const outputs = [];
  for (const pack of packs) {
    const sequence = Number(pack.sequence);
    if (!Number.isInteger(sequence)) fail("each pack requires sequence");
    const output = path.join(outDir, `column-seq-${String(sequence).padStart(2, "0")}-source.prompt.md`);
    await writeText(output, promptForPack(pack, date));
    outputs.push(path.relative(process.cwd(), output));
  }
  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

main().catch((error) => fail(error?.message || "failed"));
