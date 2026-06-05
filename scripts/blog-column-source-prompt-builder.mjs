#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BACKFILL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

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
      const date = source.publishedAt || source.accessedAt || `accessed ${DEFAULT_BACKFILL_DATE}`;
      return `${index + 1}. ${source.title} - ${source.publisher} (${date})
   URL: ${source.url}
   usable context: ${source.summary || source.context || ""}`;
    })
    .join("\n");
}

function promptForPack(pack, date) {
  const sequence = Number(pack.sequence);
  const title = pack.workingTitleZh;
  return `請沿用前文，不要重置上下文。

你是 ALTOS LAB 的資深市場專欄主筆與總編。請用繁體中文寫一篇「市場專欄」。
這不是快訊翻譯，也不是報告模板；它要像讀者願意讀完、願意轉給同事的專業專欄。

文章目標：
- 題目方向：${title}
- 讀者：${pack.targetReader}
- 核心判斷：${pack.coreThesis}
- 為什麼現在要寫：${pack.whyNow}
- 文章要好讀、有節奏、有真人觀點，但不能誇張、不能空泛、不能編案例。
- 先把一篇 zh-Hant 源稿寫好；其他語言會另外本地化，不需要你翻譯。

請先用這些寫作校準自己：
- 好專欄的開頭不是「隨著 AI 發展」，而是一個具體變化、一個現場問題、一個數字，或一個讓讀者想繼續看的判斷。
- 好 subtitle 不是重複標題，也不是管理建議；它要補上「誰、發生什麼、為什麼現在值得看」。
- 文章段落要像新聞專欄：短段落推進、每個小標承接上一段，不要每段都變成「先做三件事」。
- 可以有 ALTOS LAB 的觀點，但它要自然落在段落裡，不要變成每篇一樣的「ALTOS LAB 判斷」模板標題。
- 參考 ABMedia、Blockcast、Foresight News 這類市場文章的節奏：先把事件和衝突說清楚，再把作者判斷放進去，不要一上來就教企業做流程。

來源素材，必須只根據這些來源延伸，不要補假資料：
${sourceLines(pack)}

寫法要求：
- 開頭 40-80 字就要讓讀者知道「為什麼這篇值得看」。
- title 和 subtitle 要自然、有吸引力，不要像報告題名；subtitle 要像可發布的新聞專欄 standfirst。
- 6-8 個 ## 小標，不能出現 ###。小標禁止連續使用「先...」「為什麼...」「接下來...」這種固定節奏。
- 全文要有 1800-2600 個中文字左右。
- 要有 3-5 個可掃讀的重點 bullets。
- 至少 1 段可引用的 ALTOS LAB 觀點，但必須自然寫在正文，不要把它寫成制式標題。
- 可以有短表格或決策清單，但只有在真的能幫助讀者理解時才用；不要每篇都像 checklist。
- 需要 FAQ 3 則。
- 可用 **粗體** 標出真正重要的短句；不要整段粗體。
- 不要在公開文案中提到 SEO、GEO、AI-generated、prompt、pipeline、quality gate、rubric。
- 不要寫「來源轉譯」、「內部流程」、「品質審核」這類後台字眼。
- 不要替任何產品做銷售。
- 不要用這些模板句型：不是 X 而是 Y、真正的問題是、核心在於、本週先做、先檢查三件事、導入前的提醒、接下來要看三個指標。

視覺需求：
- 文章會有一張 GPT 共享封面與 2-3 張內文圖；請在 body 中於適合位置放入 [IMAGE:opening] 與 [IMAGE:mechanism]，必要時可放 [IMAGE:synthesis]。
- 圖片佔位前後要有自然段落，不要讓圖片像硬插入。

自我檢查：
- 如果拿掉標題後，每篇文章看起來仍像同一個骨架，請重寫。
- 如果第一段像 AI 文章的開場白，請重寫。
- 如果每個小標都像管理顧問簡報，請重寫。
- 如果沒有具體來源、具體場景、具體取捨，請回 status="held"。

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
  const outDir = path.resolve(arg("out-dir", path.join("data", "blog-backfill", DEFAULT_BACKFILL_DATE, "column-production", "prompts")));
  const date = arg("date", DEFAULT_BACKFILL_DATE);
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
