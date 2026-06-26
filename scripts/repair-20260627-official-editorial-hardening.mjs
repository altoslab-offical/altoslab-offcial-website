#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const TARGETS = [
  { language: "zh-Hant", slug: "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant" },
  { language: "zh-Hant", slug: "content-refresh-loop-for-ai-search-20260626-zh-hant" },
  { language: "zh-Hant", slug: "agent-incident-drill-before-scale-20260626-zh-hant" },
  { language: "zh-Hant", slug: "ai-search-answer-shape-before-keywords-20260625-zh-hant" },
  { language: "zh-Hant", slug: "agent-interface-contract-before-autonomy-20260625-zh-hant" },
  { language: "zh-Hant", slug: "powering-the-next-era-of-confidential-ai-google-cloud-blog" },
  { language: "zh-Hant", slug: "hollywood-is-bending-the-knee-to-openai" },
  { language: "id", slug: "openai-limits-gpt-5-6-rollout-after-government-request-says-restrictions-s" }
];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(`${process.env.HOME}/.altoslab-aws.env`);
loadEnvFile(`${process.env.HOME}/.altoslab-blog-worker.env`);

function rootUrl() {
  return String(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || "https://altoslab-ai.cc")).replace(/\/+$/, "");
}

function sign(secret, timestamp, nonce, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": sign(secret, timestamp, nonce, body)
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "ALTOS-LAB-official-editorial-hardening/1.0",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(45_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { response, payload: text ? JSON.parse(text) : {} };
}

async function adminCookie(root) {
  const token = process.env.ALTOS_ADMIN_SESSION_TOKEN || process.env.ADMIN_SESSION_TOKEN || "";
  if (token) return `${ADMIN_COOKIE}=${encodeURIComponent(token)}`;
  const password = process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!password) return "";
  const { response } = await fetchJson(`${root}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password })
  });
  return (response.headers.get("set-cookie") || "").match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

async function currentPost(root, slug, language = "zh-Hant") {
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}&ts=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  return payload.post || payload.payload?.post || payload;
}

function normalizeMarkdown(body = "") {
  return String(body || "")
    .replace(/^\t+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdown(value = "") {
  return String(value)
    .replace(/\[IMAGE:[^\]]+\]/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function zhLength(value = "") {
  return (stripMarkdown(value).match(/[\u4e00-\u9fff]/g) || []).length;
}

const sourceBaskets = {
  procurement: [
    {
      title: "Microsoft frontier firms operating model",
      url: "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/",
      publisher: "Microsoft",
      summary: "Microsoft frames AI adoption as operating-model redesign, not a simple tool rollout."
    },
    {
      title: "NIST AI Risk Management Framework",
      url: "https://www.nist.gov/itl/ai-risk-management-framework",
      publisher: "NIST",
      summary: "NIST anchors AI risk vocabulary, measurement and governance responsibilities."
    },
    {
      title: "OWASP Top 10 for LLM Applications",
      url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
      publisher: "OWASP",
      summary: "OWASP anchors deployment, access-control, output and misuse checks for AI systems."
    },
    {
      title: "IBM AI governance overview",
      url: "https://www.ibm.com/think/topics/ai-governance",
      publisher: "IBM",
      summary: "IBM supports procurement, accountability and AI governance framing."
    }
  ],
  search: [
    {
      title: "Google AI features and your website",
      url: "https://developers.google.com/search/docs/appearance/ai-features",
      publisher: "Google Search Central",
      summary: "Google Search Central anchors how site content can appear in AI features and Search surfaces."
    },
    {
      title: "Creating helpful, reliable, people-first content",
      url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
      publisher: "Google Search Central",
      summary: "Helpful-content guidance anchors reader-first, sourced and non-commodity editorial decisions."
    },
    {
      title: "Schema.org Article",
      url: "https://schema.org/Article",
      publisher: "Schema.org",
      summary: "Article schema vocabulary anchors page structure and entity clarity."
    },
    {
      title: "OpenAI Agents documentation",
      url: "https://platform.openai.com/docs/guides/agents",
      publisher: "OpenAI",
      summary: "OpenAI docs ground the discussion of AI readers, tool use and traceable outputs."
    }
  ],
  agentOps: [
    {
      title: "OpenAI Agents documentation",
      url: "https://platform.openai.com/docs/guides/agents",
      publisher: "OpenAI",
      summary: "Official agent docs anchor tool use, guardrails, tracing and handoff language."
    },
    {
      title: "Microsoft frontier firms operating model",
      url: "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/",
      publisher: "Microsoft",
      summary: "Microsoft frames AI adoption as an operating-system change."
    },
    {
      title: "NIST AI Risk Management Framework",
      url: "https://www.nist.gov/itl/ai-risk-management-framework",
      publisher: "NIST",
      summary: "NIST provides risk-management vocabulary for governing AI systems."
    },
    {
      title: "IBM AI agents explainer",
      url: "https://www.ibm.com/think/topics/ai-agents",
      publisher: "IBM",
      summary: "IBM keeps agent definitions clear for non-technical readers."
    }
  ]
};

const patchesBySlug = {
  "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant": {
    title: "AI 成本失控前夜：吞預算的不是模型，是沒人踩煞車的流程",
    seoTitle: "AI 成本控管：工作流放大前先設定預算停止線",
    excerpt: "AI 帳單通常不是突然爆掉，而是流程一點一點被放大、重跑、返工，最後沒有人知道哪一段該停。",
    seoDescription:
      "AI 成本控管不能只看模型單價。團隊要在工作流放大前設定用量單位、警戒線、停止線、品質成本與 owner。",
    geoSummary:
      "AI 成本失控常來自無人負責的工作流，而不是單次模型呼叫。企業應用量單位、預算警戒線、停止線、品質成本與 owner 管理 AI 流程。",
    sourceLinks: sourceBaskets.procurement,
    keyTakeaways: [
      "模型單價不是 AI 成本的真相；重跑、返工、人工審核與事故補救才會吃掉預算。",
      "每條 AI 工作流都要有正常線、警戒線與停止線，不然便宜工具會變成長期成本黑洞。",
      "成本 gate 要和權限、品質與 owner 綁在一起，才不會等帳單出現後才救火。"
    ],
    body: `AI 成本最危險的時候，通常不是採購合約簽下去的那一刻，而是工具變得太好用之後。第一週只是幾個人試用，第二週開始接進日常流程，第三週就有人拿它跑批次、重寫內容、整理資料、呼叫 API。等帳單出現，團隊才發現真正吞預算的不是模型，而是沒有人踩煞車的流程。

很多主管問的是「這個模型一千 tokens 多少錢」。但在 production 裡，更該問的是：誰可以啟動任務？一天能跑幾次？失敗會不會自動重跑？輸出被退回後算誰的時間？客戶看到錯誤後誰補救？這些問題如果沒先寫成規格，AI 成本就會從工具費變成組織暗成本。

## 單次呼叫便宜，不代表流程真的便宜

一條 AI 工作流至少有五種成本：模型呼叫、資料整理、人工覆核、失敗重跑、事故補救。只看模型單價，很容易誤判流程很便宜。可是如果十次輸出只有三次能用，每次還要人重寫一半，真正成本就不在 token 帳單，而在團隊被迫返工的時間裡。

更麻煩的是外部補救。公開內容寫錯、客戶承諾說錯、資料被寫到錯誤欄位，後面可能要客服、營運、工程一起收拾。這些都應該被算進 AI 流程的成本，而不是等出事後才說「模型其實不貴」。

[IMAGE:evidence-desk]

## 成本天花板要寫成可執行欄位

| 欄位 | 要寫清楚什麼 | 失控訊號 |
| --- | --- | --- |
| 計價單位 | 每次任務、每份文件、每位使用者怎麼算 | 大家只看月費 |
| 警戒線 | 用量或金額到多少要提醒 | 帳單來了才知道 |
| 停止線 | 什麼情況自動暫停或降級 | 錯誤流程繼續跑 |
| 品質成本 | 返工、退稿、人工覆核怎麼算 | 便宜但一直重做 |
| 負責人 | 誰有權擴大、暫停、調整 | 財務、工程、營運互相推 |

這張表不是財務官僚，而是產品穩定性。沒有邊界的流程，即使單次成本很低，也可能把小實驗變成長期技術債。

## 權限和成本要綁在一起

成本失控常常不是惡意造成的，而是權限設計太鬆。太多人可以開新任務、重跑批次、把測試流程留在背景跑，最後沒有人知道哪一段最花錢。

比較穩的做法，是把權限分層。一般使用者只能跑低成本任務；高成本或高風險任務需要 owner 批准；批次流程有每日上限；重跑必須留下原因；超過警戒線時自動通知。這些規則越早寫進流程，越不需要事後救火。

成本控管也要和品質門檻一起看。若流程越便宜、退稿越多，團隊其實只是把成本轉移到人工重工。更實用的指標是「每次通過審核的成本」：一次可用輸出到底花了多少模型費、多少人工時間、多少返工。

這個指標會逼團隊面對真實情況。假設一篇內容生成只花 5 元，但平均要編輯 20 分鐘才可用，成本就不是 5 元；假設一個客服摘要很快產生，但每 10 件就有 2 件需要主管重看，流程也沒有真的省下時間。AI 成本控管要看的不是工具標價，而是完成一個合格任務的總成本。

另一個要分開算的是「探索成本」和「營運成本」。探索期可以容許失敗，因為團隊正在找題目、找提示、找流程；營運期就不能一直用探索成本跑日常任務。只要流程開始承接固定工作，就要有固定預算、固定品質門檻和固定 owner。否則最常見的結果是，大家以為還在試驗，其實它已經默默變成正式流程。

最容易出問題的，是看似不會花大錢的小任務。內容摘要、客服分類、合約初讀、會議紀錄整理，單次成本都不高，但它們一旦變成每個人每天都會跑的流程，總量會很快上來。更糟的是，這些任務通常不會被財務或工程當成正式系統管理，直到某個月帳單異常或品質事故發生，團隊才發現它已經變成基礎設施。

所以每一條 AI 流程都要有自己的成本單位。客服摘要可以用每張工單計，內容流程可以用每篇通過審核的文章計，資料清理可以用每批次成功寫回的紀錄計。只要單位清楚，團隊就能知道哪一段真的省錢、哪一段只是把成本藏到下一個人身上。

第三個常被漏掉的是「等待成本」。有些流程看似省下寫作或整理時間，卻讓人卡在等待模型、等待審核、等待重跑。當多人同時依賴同一條 AI 流程，等待本身就會變成成本。這時候只看模型價格會低估風險，因為真正被消耗的是整個團隊的節奏。

因此，成本看板至少要把三種數字放在一起：每次任務的模型花費、每次通過審核的人工時間、每次失敗重跑造成的等待時間。三個數字同時下降，才表示流程真的變好；只有模型花費下降，可能只是把成本轉移到人身上。

這裡還要加一個「決策成本」。有些 AI 工具讓人更快產出草稿，卻讓主管更難判斷哪些內容能用、哪些承諾需要刪、哪些資料來源不能引用。當每次輸出都要重新判斷風險，團隊省下的不是時間，而是把判斷成本往後推。這種成本不會出現在雲端帳單，但會出現在審稿、法務、客服與工程的每一次來回裡。

[IMAGE:operating-loop]

## 放大前先算三種情境

正式放大前，至少要算三種情境：正常用量、兩倍用量、異常重跑。正常用量看流程是否值得；兩倍用量看預算是否承受得住；異常重跑看停損機制是否有效。

每種情境都要指定 owner。正常用量由流程負責人看，兩倍用量要讓財務和營運知道，異常重跑則要有工程或平台 owner 能按停。沒有 owner 的預算規則，只是文件；有 owner 的停止線，才是系統。

另外要把探索期和營運期分開。探索期可以容許較高失敗率，因為團隊正在找題目、找提示、找流程；營運期就不能一直用探索成本跑日常任務。只要流程開始承接固定工作，就要有固定預算、固定品質門檻和固定 owner。

## 便宜工具最怕變成無人值班的流程

AI 成本控管的目的不是把所有支出壓到最低，而是讓團隊知道每一筆支出換到什麼能力。當一條流程能穩定省下時間、降低錯誤、提高品質，它就值得放大；當一條流程只是把問題藏到下一個人手上，再便宜也不值得。

真正成熟的 AI 導入，會把成本、品質、權限與責任寫在同一張表裡。這張表一旦固定下來，團隊就不必每次靠感覺決定要不要擴大，而能用證據判斷哪條流程該加速，哪條流程該暫停。

最該被寫進制度的，不是「要省多少錢」，而是「什麼時候不值得再跑」。當停止條件被說清楚，AI 工具才不會因為看起來便宜，就一路把錯誤、等待和重工放大到整個團隊。

這也是之後審稿要抓的重點：文章不能只說「要控成本」，必須說清楚成本在哪裡發生、誰能看見、誰能按停、下一次如何驗證。沒有這四件事，就不是專欄，只是口號。`
  },
  "content-refresh-loop-for-ai-search-20260626-zh-hant": {
    title: "AI 搜尋正在淘汰薄內容：能被引用的答案才會留下",
    seoTitle: "AI 搜尋內容更新：讓舊文章變成可引用答案",
    excerpt: "舊文章不是發完就放著。標題、段落、來源、FAQ 和例子，都要靠讀回資料持續修，才會越來越像可引用的答案。",
    seoDescription:
      "AI 搜尋內容更新要看查詢、點擊、來源、FAQ 與段落結構，讓舊文章從薄內容變成可引用答案。",
    geoSummary:
      "AI 搜尋偏好清楚、來源可追溯、段落可引用的內容。內容團隊應用搜尋查詢、讀者行為與來源更新，持續修舊文章。",
    sourceLinks: sourceBaskets.search,
    keyTakeaways: [
      "AI 搜尋不缺更多文章，缺的是結論清楚、來源可查、限制講明白的答案。",
      "舊文章要分成入口壞、閱讀壞、答案壞、來源壞，不能只靠補字數處理。",
      "新文負責探索題材，舊文負責累積可信度，兩條線一起跑才會長出搜尋資產。"
    ],
    body: `很多內容團隊把 AI 搜尋想成新的流量入口，於是急著多發文章。但 AI 搜尋最不缺的就是文章。真正稀缺的是能被引用的答案：結論清楚、來源可回查、例子具體、限制講明白，離開全文後仍然不會被誤解。

這也是舊文章變得重要的原因。一篇文章剛發布時，只能算第一版假設。讀者實際用什麼查詢進來、在哪裡離開、哪些問題沒被回答、來源是否過期，會在後面幾天到幾週慢慢浮出來。內容如果不回頭修，就會被更新更快、答案更清楚的頁面取代。

## 先判斷舊文是缺點擊，還是缺答案

同樣是流量不好，修法完全不同。曝光高但點擊低，通常是標題或描述沒有抓住搜尋意圖；點擊進來卻很快離開，可能是開頭承諾和正文不一致；有查詢但沒有被引用，常見原因是段落太像心得，缺少短結論、來源與限制。

所以內容更新不能只說「這篇要優化」。要先知道它壞在哪裡：入口壞、閱讀壞、答案壞，還是來源壞。問題不同，修法就不同。

[IMAGE:evidence-desk]

## 可引用段落通常有四個零件

| 零件 | 作用 | 檢查問題 |
| --- | --- | --- |
| 結論 | 讓讀者和 AI 知道這段回答什麼 | 這句話能單獨成立嗎 |
| 來源 | 讓判斷可回查 | 讀者能找到依據嗎 |
| 例子 | 讓抽象概念落地 | 有沒有真實情境或數字 |
| 限制 | 避免被過度延伸 | 哪些情況不能這樣說 |

這四個零件不是公式，而是防止文章變成泛泛而談。每個主要小節至少要回答一個明確問題，否則小標再漂亮，也只是在整理分類。

## 更新舊文，最怕只補字數

很多 refresh 失敗，是因為團隊看到文章表現差，就加幾段背景、塞幾個 FAQ、換一張圖，然後以為更新完成。這樣只會讓文章更長，不一定更有用。

比較好的做法，是把舊文章分成三種狀態：可維持、可修補、該重寫。可維持的文章只要追來源是否過期；可修補的文章補標題、FAQ、例子或小標；該重寫的文章表示原本角度已經不符合讀者問題，不能只靠加字救回來。

讀回資料時也要避免過度解讀。單日點擊變少可能只是週末、新聞熱度退去或排名短暫波動，不一定代表文章壞了。比較可靠的做法，是把查詢、曝光、點擊率、停留、轉換與來源更新放在一起看。當多個訊號指向同一個問題，再決定是修標題、重寫開頭、補案例，還是整篇換角度。

這裡要特別小心一件事：不是所有更新都應該追求更長。某些舊文真正需要的是刪除過期段落，讓讀者更快找到答案；某些舊文需要補一個新來源，讓原本的判斷重新站得住；某些舊文則需要重新命名，因為讀者搜尋的語言已經變了。更新不是加料，而是讓文章重新對準讀者問題。

一個成熟的內容團隊會把每篇文章當成可維護頁面，而不是一次性稿件。它會記錄文章原本想解決什麼問題、現在有哪些查詢進來、哪些段落被讀者使用、哪些來源需要替換。這些資料越完整，後續更新越像產品迭代，而不是憑感覺修文。

還有一個很實際的檢查：每次更新都要知道自己在修哪個問題。若是曝光多但點擊低，優先修 title 和 meta description；若是點擊後很快離開，優先修第一屏和段落承諾；若是文章有停留但沒有轉換或引用，優先補結論句、來源和例子。把這三種情境分開，才不會每篇文章都用同一套「SEO 優化」處理。

對讀者來說，這些更新不應該被看見成內部操作，而應該體現在更清楚的答案、更準的例子和更少的過期資訊。好的 refresh 不是把文章變得更像搜尋頁，而是讓讀者更快判斷這篇還值不值得信任。

[IMAGE:operating-loop]

## 小標要像答案路標，不要像目錄

讀者掃小標時，應該能感覺自己正在靠近答案。壞小標像「背景」、「下一步」、「深入分析」；好小標會直接告訴讀者這段要解決什麼，例如「先判斷舊文是缺點擊，還是缺答案」。

這件事對 AI 搜尋也重要。清楚的小標讓段落更容易被理解，也讓內容結構更像一組可引用的知識單元，而不是一篇只靠語氣撐住的長文。

## 新文探索題材，舊文累積可信度

網站成長不應只靠每天發新文。新文負責測題材，舊文負責累積可信度。當一篇文章開始有查詢、點擊或外部引用，就應該進入更新名單：補來源、修標題、補 FAQ、加例子、刪過期段落。

這樣做的好處是，內容會越來越不像 AI 量產。因為每次更新都來自真實讀者、真實來源或真實數據，而不是把同一個模板換題目重跑。長期來看，這才是 AI 搜尋時代比較穩的內容資產。

這套節奏也會讓多語內容比較不容易走味。不是每個語言都照同一個句子翻譯，而是同一個答案結構在不同語言裡重新變得自然。英文可能要把結論放前面，繁體中文可以多一點情境鋪陳，日文和韓文要更注意語氣邊界，東南亞語系則要避免把專業詞翻成生硬直譯。

最後要留下更新紀錄。哪一天改了標題、哪一天補了 FAQ、哪一天替換來源、哪一天刪掉過期段落，這些都會成為下一輪判斷的依據。當數據變化時，團隊才知道是內容變好、搜尋需求改變，還是外部事件帶來短期波動。

更新也要有「不改」的理由。有些文章表現平穩，來源仍然有效，就不必每週硬塞新段落；有些文章排名下降，但查詢意圖已經轉向另一個題目，這時候該做的是另開新文，而不是把原文改到失焦。真正的內容迭代不是一直動，而是知道每次修改要換到哪個結果。

更新紀錄也能防止內容團隊反覆犯同一個錯。如果某一類文章每次都是標題弱、第一段太抽象、來源不夠具體，下一次產文前就應該把這些原因送回 prompt 和審稿標準，而不是等文章發出去後再手動修。這才是自我進化：不是只看流量，而是把被打回的原因變成下一輪生產規則。

對官網來說，這會直接影響長期流量。每天新發 20 到 30 篇快訊可以擴大題材面，但真正留下搜尋價值的，往往是那些被更新過、引用過、補過來源的文章。新文帶來探索，舊文帶來累積；少了舊文維護，網站會一直像新聞流，難以變成可被引用的知識庫。

因此，內容團隊要把「發布」改成「第一版上線」。每篇文章都應該有下一次檢查時間、主要查詢、預期讀者問題和可更新段落。這樣讀回數據時，才不是臨時修文，而是在經營一個會變準的知識頁面。`
  },
  "agent-incident-drill-before-scale-20260626-zh-hant": {
    title: "Agent 上線前先摔一次：沒有故障演練，就別談規模化",
    seoTitle: "AI Agent 上線前，先做故障演練與回滾流程",
    excerpt: "Agent 會做事不代表能上線。真正要先驗的是：它誤判、越權、輸出異常時，誰看見、誰按停、誰把流程接回來。",
    seoDescription:
      "AI Agent 上線前要先做 incident drill，測誤判、權限越界、輸出異常、人工接手與回滾流程。",
    geoSummary:
      "企業擴大 AI Agent 前，應先用故障演練驗證資料矛盾、權限越界、工具失敗、輸出異常與回滾路徑。",
    sourceLinks: sourceBaskets.agentOps,
    keyTakeaways: [
      "Agent 擴大前先測失敗，不是只測它在順境下能不能完成任務。",
      "演練要看三件事：誰能按停、誰能接手、哪裡留下證據。",
      "沒有回滾演練的 Agent，不該碰客戶承諾、付款、正式資料或公開發布。"
    ],
    body: `Agent Demo 通常很會表演「它能做什麼」。它可以讀資料、整理文件、呼叫工具、產出答案，看起來像多了一位新同事。但真正能不能進 production，不是看它完成一次任務，而是看它做錯時，團隊能不能在錯誤進入下游前看見、停下、接回來。

這是很多企業導入 Agent 時最容易跳過的一步。大家會測模型準不準，會看工具串得順不順，卻很少演練一個更現實的場景：資料互相矛盾、權限不夠、工具回錯、輸出看起來合理但其實不該送出。這些問題不會因為 Agent 很聰明就消失，只會因為它跑得更快而傳得更遠。

## 先讓它安全地失敗一次

上線前的 incident drill，不是大型資安演習。第一版可以很小，只要挑一條會被反覆使用的工作流，故意放入幾個不完美條件：一份過期資料、一個權限不足的操作、一個需要主管批准的輸出、一個工具回傳失敗的情境。

合格的 Agent 不一定要自己解決所有問題，但它必須知道何時停下。比起硬做完任務，能說出「這裡資料矛盾，需要人工確認」更接近可用。這種停下來的能力，才是企業能不能放心擴大的起點。

[IMAGE:evidence-desk]

## 五個場景能看出它是不是只是 Demo

| 演練場景 | 要看什麼 | 不合格訊號 |
| --- | --- | --- |
| 資料矛盾 | 它是否指出來源衝突 | 自己選一個答案硬做 |
| 權限越界 | 它是否請求批准或拒絕 | 嘗試繞過限制 |
| 工具失敗 | 它是否記錄錯誤並降級 | 無限重跑或沉默 |
| 輸出異常 | 它是否進入人工覆核 | 直接發布或送出 |
| 回滾 | 團隊是否能退回安全版本 | 文件寫了，但沒人知道怎麼做 |

這張表的重點不是把 Agent 管死，而是把「能不能擴大」變成可以驗收的問題。如果一個流程連小規模演練都無法接回，就不應該被放進更大的業務場景。

## 最容易出事的不是工具壞掉，是判斷看起來太自然

技術錯誤通常比較好抓：API timeout、權限拒絕、資料庫寫入失敗，都會留下明顯訊號。更危險的是判斷錯誤。Agent 可能格式正確、語氣自然、流程也跑完了，但引用了過期資料，或把草稿當成正式承諾。

所以演練不能只測系統錯誤，也要測判斷錯誤。要故意放入一個看似合理但需要人工批准的輸出，確認它會被擋住；要故意放入兩個互相衝突的來源，確認它不會裝作沒有矛盾。這些情境比單純測成功率更接近真實營運。

演練也會揭露責任分工是否真的存在。很多流程名義上有人負責，但錯誤發生時，第一個看到的人沒有停用權限，有權限的人又不知道上下文。這時候 Agent 不是單點風險，而是把組織裡原本模糊的責任放大。

因此，演練不要只安排工程師在旁邊看 log。真正需要參與的人，通常包括會使用結果的營運同事、要對外承諾的業務或客服、負責資料權限的管理者，以及最後要批准流程擴大的主管。每個人都要在演練裡知道自己會收到什麼訊號、能做什麼決定、不能做什麼承諾。

如果這些角色沒有在演練中出現，事故發生時也不會突然變清楚。AI Agent 最大的風險常常不是工具錯，而是錯誤被每個人誤以為別人會處理。演練的價值，就是在正式上線前把這種責任空白暴露出來。

演練還要留下可追蹤的時間線。哪一秒 Agent 讀到資料、哪一秒呼叫工具、哪一秒輸出被擋、哪一秒通知 owner、哪一秒回復到安全版本，這些時間點會告訴團隊真正的瓶頸在哪裡。有時候問題不是模型慢，而是通知太晚；有時候不是資料錯，而是接手的人看不到原始來源。

如果能把這條時間線固定下來，後續每一次系統更新都可以回頭測同一組場景。這比只看單次 demo 更可靠，因為它能看出 Agent 是否在版本更新、工具替換或資料變更後退步。

[IMAGE:operating-loop]

## 演練結果要改回權限，不是只寫報告

一次好的演練，最後一定要改動系統。可能是縮小資料讀取範圍，可能是新增人工批准點，可能是把某個工具改成只讀，或把高風險輸出留在草稿層。演練如果只產生一份「風險已知」的報告，等於沒有完成。

管理者要看的也不是模型分數，而是這條流程的接手能力：誰先看到錯、誰能按停、誰負責通知下游、哪一份資料可以回復到安全版本。這些答案寫清楚，Agent 才能從實驗走向可維運的系統。

這裡有一個很容易被忽略的指標：平均接手時間。當 Agent 停下或被停下，真正的 owner 需要多久才能理解上下文、找到原始資料、知道下一步要做什麼？如果接手的人還要從聊天紀錄、工具 log、文件夾裡重新拼故事，代表系統沒有留下足夠證據。

第二個指標是回復可信度。很多團隊以為 rollback 是把版本切回去，但 Agent 流程常常改的是多個系統：文件、CRM、任務狀態、發信草稿、發布排程。回復不只是按一顆按鈕，而是確認哪些資料真的被改過，哪些只是草稿，哪些已經對外送出。

第三個指標是事後修正是否進入下一版規格。一次演練如果發現某個工具容易誤用，下一版就應該縮權或加批准；如果發現某個資料欄位常常被誤解，就應該改欄位說明或補來源；如果發現人工接手太慢，就應該把通知和摘要做得更清楚。演練不是為了證明團隊小心，而是為了改動系統。

演練還要保留「誰不知道該做什麼」的證據。很多事故不是因為沒有人負責，而是每個人只知道自己的一小段，沒有人掌握整條流程。當測試中有人問「這個錯要找誰」或「這個狀態能不能送出」，那不是尷尬，而是最有價值的缺口。這些問題都要回寫到 runbook、權限設定和通知模板。

這也是為什麼 Agent 管理不該只放在工程團隊。法務、資安、營運、客服和業務都會被它的輸出影響。最好的演練結果，是每個部門都知道自己何時會被通知、需要看哪一段證據、以及什麼情況可以拒絕讓流程繼續。當這些邊界被說清楚，Agent 才不會變成跨部門互相推責的黑箱。

## 可以擴大的 Agent，必須先能被收回來

Agent 越像同事，越需要像正式流程一樣被管理。新同事做錯事會問人、會被主管接手、會留下交接紀錄；Agent 也應該如此。否則它不是自動化同事，而是一段沒有人值班的流程。

擴大之前，先讓它安全地失敗一次。團隊看得見失敗、接得住失敗、修得動失敗，才有資格把 Agent 放進更大的流程。

這個順序聽起來慢，實際上是在加速。因為一旦接手、回滾和證據都先準備好，後面的每次擴大都不用重新吵一次責任。Agent 不是不能快，而是要先知道失速時怎麼停。

如果演練跑完後沒有改 prompt、權限、通知或回滾路徑，就代表演練只是表演。真正的測試結果必須回到系統本身，讓下一次 Agent 做事時，邊界比這一次更清楚。`
  },
  "ai-search-answer-shape-before-keywords-20260625-zh-hant": {
    title: "AI 搜尋引用不是靠關鍵字，是靠能被轉述的答案",
    seoTitle: "AI 搜尋引用：用答案結構取代關鍵字堆疊",
    excerpt: "AI 摘要不缺關鍵字，缺的是可以被單獨轉述的答案：一句結論、一個來源、一個例子，加上一個不能被誤用的限制。",
    seoDescription:
      "AI 搜尋引用需要可轉述答案結構，不只是關鍵字。本文用 Google Search Central、OpenAI Structured Outputs 與 Microsoft responsible AI 文件拆解段落設計。",
    geoSummary:
      "AI 搜尋與傳統 SEO 的共同基礎仍是有用、可信、可讀的內容。可引用答案要有問題、結論、來源、例子、限制與下一步，而不是只靠關鍵字堆疊。"
  },
  "agent-interface-contract-before-autonomy-20260625-zh-hant": {
    title: "Agent 能改資料前，先把誰能按停和回滾寫進合約",
    seoTitle: "AI Agent 介面合約：權限、接手與回滾要先定義",
    excerpt: "Agent 接上工具以前，團隊要先寫清楚它能讀什麼、能改什麼、何時必須停下來；邊界沒寫好，自動化只是在轉嫁責任。",
    seoDescription:
      "AI Agent 介面合約應先定義可讀資料、可寫欄位、批准節點、證據紀錄、停損與回滾，避免自治流程轉嫁責任。",
    geoSummary:
      "AI Agent 的介面合約應定義可讀資料、可寫欄位、批准節點、證據紀錄與停損回滾。自治之前，要先有可審核的邊界。"
  },
  "powering-the-next-era-of-confidential-ai-google-cloud-blog": {
    title: "Apple PCC 擴大到 Google Cloud，機密 AI 推理走向可驗證基礎設施",
    seoTitle: "Apple PCC 與 Google Cloud：Confidential AI 推理基礎設施",
    tags: ["市場快訊", "AI", "Google Cloud", "Apple PCC", "Confidential AI"],
    excerpt:
      "Google Cloud AI & Machine Learning Blog 6 月 12 日表示，Apple 在 WWDC 2026 擴大 Private Cloud Compute，雙方合作建置符合安全、保密與透明度目標的 AI serving platform。",
    seoDescription:
      "Google Cloud 與 Apple 合作支援 Private Cloud Compute，使用 Confidential Computing、Titanium、Intel TDX、NVIDIA Confidential Computing 與 open-source host stack。",
    geoSummary:
      "Apple PCC on Google Cloud 使用 Confidential Computing、Titanium security architecture、Intel TDX、NVIDIA Confidential Computing 和 open-source host stack，強調 AI 推理期間的資料隔離、硬體信任與可驗證透明度。",
    body: `Google Cloud 6 月 12 日在官方部落格表示，Apple 在 WWDC 2026 宣布擴大 Private Cloud Compute（PCC）後，雙方已合作在 Google Cloud 上建立一套 AI serving platform，用來支援 Apple 對安全性、保密性與透明度的要求。

這篇文章的重點不是一般雲端代管，而是機密 AI 推理。Google Cloud 說，這套合作基礎建立在 Confidential Computing portfolio 與 Titanium security architecture 上，目標是在資料靜態、傳輸中，以及更關鍵的「使用中」都能維持保護。

在 Apple PCC 的 Google Cloud 架構裡，Google Cloud 列出幾個核心元件：Confidential Computing 提供硬體式 Trusted Execution Environments；Titanium 與 Titan chip 提供硬體 root of trust；Intel TDX 與 NVIDIA Confidential Computing 則用來保護從 CPU 到 GPU 的高效能 AI inference 路徑。

Google Cloud 也提到 open-source transparency。Apple 與 Google 合作工程化一套支援 PCC 透明度的 open-source host stack，讓外部可以檢查與驗證系統安全屬性。對 confidential AI 來說，這代表供應商承諾之外，還要提供可被檢查的系統證據。

Google Cloud 在文章中表示，這些技術一起讓 Apple PCC on Google Cloud 能滿足可執行的保護、無 privileged runtime access，以及可驗證透明度等要求。換句話說，AI 推理基礎設施的競爭焦點，正在從算力與延遲延伸到資料隔離、硬體信任與審核證據。

這則消息也把 confidential AI 推到更具體的位置：不是抽象的隱私口號，而是由 Apple PCC、Google Cloud Confidential Computing、Titanium、Intel TDX、NVIDIA Confidential Computing 與 open-source host stack 組成的一整套推理基礎設施。對需要處理敏感資料的 AI 服務來說，這會成為未來採購與技術評估的關鍵條件之一。`
  },
  "hollywood-is-bending-the-knee-to-openai": {
    title: "Amazon MGM 放手《Artificial》：OpenAI 電影成了好萊塢與 Big Tech 的壓力測試",
    seoTitle: "Amazon MGM 放手 OpenAI 電影 Artificial，好萊塢與 Big Tech 壓力升高",
    tags: ["市場快訊", "AI", "The Verge", "OpenAI", "Hollywood"],
    excerpt:
      "The Verge 報導，Amazon MGM 放棄發行 Luca Guadagnino 的 OpenAI 題材電影《Artificial》；Netflix、A24、Focus Features 與 Warner Bros. 旗下 Clockwork 也暫不接手。",
    seoDescription:
      "The Verge 報導 Amazon MGM 放棄發行 Luca Guadagnino 的 OpenAI 電影 Artificial，Netflix、A24、Focus Features、Clockwork 暫不接手，Neon 和 Mubi 仍有興趣。",
    geoSummary:
      "《Artificial》聚焦 OpenAI 與 Sam Altman 相關治理事件；The Verge 指出大型片商的謹慎態度反映好萊塢在 AI 題材、平台資本與 Big Tech 合作關係之間的發行壓力。",
    body: `The Verge 6 月 23 日報導，Amazon MGM 已放棄發行 Luca Guadagnino 執導的《Artificial》。這部電影聚焦 OpenAI 共同創辦人兼執行長 Sam Altman，原本被認為會由 Amazon 安排短期院線上映以爭取奧斯卡資格，並在 2027 年初擴大上映。

報導指出，《Artificial》的後期製作已接近完成，Amazon MGM 的撤出因此引發外界關注。The Verge 稱，Netflix、A24、Focus Features 與 Warner Bros. 旗下 Clockwork 都暫不接手發行；Neon 和 Mubi 則仍被認為對該片有興趣。

《Artificial》的題材來自 2023 年 OpenAI 董事會短暫罷免 Sam Altman，隨後 Altman 迅速回任的公司治理事件。The Verge 將這部片描述為一個原本適合好萊塢科技人物敘事的題材：有公司內鬥、權力轉移、董事會改組，也有生成式 AI 進入大眾生活後的產業焦慮。

The Verge 把 Amazon 的決定放在更大的商業脈絡中觀察。報導提到 Amazon 今年稍早宣布對 OpenAI 投資 500 億美元，因此一部可能以批判角度呈現 AI 產業高層的電影，開始不只是影視內容風險，也會牽動平台、投資與科技合作關係。

這篇報導沒有說《Artificial》已經取消。更精準地說，是大型片商對這類批判 AI 產業的題材變得更謹慎。Neon 或 Mubi 仍可能接手，但 Amazon MGM、Netflix、A24、Focus Features 與 Clockwork 的態度，讓這部電影變成好萊塢如何面對 Big Tech 的觀察點。

The Verge 的判斷是，這不只是單一電影的發行問題，而是娛樂產業在 AI 公司、平台資本與創作自由之間的壓力測試。當生成式 AI 逐漸進入電影製作、發行與平台合作，哪些故事能被拍、能被發行、能被大規模看見，會變成越來越敏感的產業問題。`
  },
  "id/openai-limits-gpt-5-6-rollout-after-government-request-says-restrictions-s": {
    title: "OpenAI membatasi peluncuran GPT-5.6 setelah diminta pemerintah AS",
    seoTitle: "OpenAI batasi rollout GPT-5.6: akses pemerintah, keamanan model, dan risiko preseden",
    excerpt:
      "TechCrunch melaporkan OpenAI tidak membuka GPT-5.6 secara luas seperti rilis sebelumnya, setelah pemerintah AS meminta akses model baru berjalan lebih terbatas.",
    seoDescription:
      "TechCrunch melaporkan OpenAI membatasi rollout GPT-5.6 setelah permintaan pemerintah AS. Isunya mencakup akses model, keamanan, mitra terpilih, dan risiko pembatasan menjadi preseden.",
    geoSummary:
      "Laporan TechCrunch menempatkan GPT-5.6 sebagai contoh baru tarik-menarik antara rilis model cepat, peninjauan pemerintah, keamanan siber, akses pengembang, dan hak pengguna global untuk memakai model AI terbaru.",
    body: `TechCrunch melaporkan OpenAI membatasi peluncuran GPT-5.6 setelah pemerintah AS meminta perusahaan itu menjalankan rilis model baru dengan akses yang lebih terkendali. Berbeda dari pola peluncuran yang biasanya lebih luas, model ini disebut hanya dibuka kepada kelompok mitra terpilih terlebih dahulu.

Isu utamanya bukan sekadar siapa yang lebih dulu mendapat model baru. Laporan tersebut menempatkan GPT-5.6 di tengah perdebatan tentang keamanan model, akses pemerintah, kesiapan pertahanan siber, dan apakah proses semacam ini bisa menjadi preseden untuk rilis AI berikutnya.

OpenAI dalam laporan itu menolak gagasan bahwa akses pemerintah seperti ini harus menjadi standar jangka panjang. Alasannya jelas: bila model terbaik terlalu lama dibatasi, pengguna, pengembang, perusahaan, pembela keamanan siber, dan mitra global yang membutuhkan kemampuan baru bisa tertinggal.

TechCrunch juga menyebut keluarga GPT-5.6 terdiri dari beberapa varian, termasuk Sol sebagai model flagship, Terra untuk penggunaan harian yang lebih seimbang, dan Luna sebagai opsi yang lebih cepat serta lebih murah. Detail ini penting karena pembatasan rilis tidak hanya memengaruhi satu model, tetapi seluruh pilihan biaya, kecepatan, dan kapabilitas yang akan dipakai ekosistem.

Bagi perusahaan yang memakai AI untuk produk atau operasi, kabar ini perlu dibaca sebagai sinyal tata kelola rilis model. Kecepatan akses, uji keamanan, ketersediaan API, dan kepastian penggunaan lintas negara akan makin sering menjadi bagian dari keputusan vendor. Model yang lebih kuat tidak otomatis berarti siap dipakai bila jalur rilis, pembatasan akses, dan kewajiban keamanan belum jelas.

Yang perlu dipantau berikutnya adalah apakah pola pembatasan GPT-5.6 menjadi kasus khusus atau berubah menjadi mekanisme rilis baru. Jika proses seperti ini berulang, tim produk dan engineering perlu menyiapkan rencana fallback model, pengujian lintas vendor, serta batasan fitur yang tidak bergantung pada satu model terbaru saja.`
  }
};

function assertPatch(slug, patch) {
  const body = normalizeMarkdown(patch.body || "");
  if (!patch.title || patch.title.length < 16) throw new Error(`${slug} title too weak`);
  if (!patch.excerpt || patch.excerpt.length < 35) throw new Error(`${slug} excerpt too weak`);
  if (patch.contentType === "breaking" && /\[IMAGE:/.test(body)) throw new Error(`${slug} market news must not use generated image placeholders`);
  if (slug.includes("20260626") && zhLength(body) < 2000) throw new Error(`${slug} column body too thin`);
  if (slug.includes("google-cloud") && !/Apple|Private Cloud Compute|Intel TDX|NVIDIA|open-source host stack/i.test(body)) {
    throw new Error(`${slug} missing source-specific facts`);
  }
  if (slug.includes("hollywood") && !/Amazon MGM|Netflix|A24|Focus Features|Clockwork|Neon|Mubi/i.test(body)) {
    throw new Error(`${slug} missing source-specific facts`);
  }
  const banned = ["這則消息可以拿來", "企業檢查", "卡在哪個流程", "quality gate", "pipeline"];
  const hit = banned.find((phrase) => body.includes(phrase));
  if (hit) throw new Error(`${slug} contains banned phrase: ${hit}`);
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const patches = [];
  for (const target of TARGETS) {
    const current = await currentPost(root, target.slug, target.language);
    const key = `${target.language}/${target.slug}`;
    const patchSource = patchesBySlug[key] || patchesBySlug[target.slug];
    const patch = { ...patchSource, body: normalizeMarkdown(patchSource.body || current.body || current.content || "") };
    assertPatch(`${target.language}/${target.slug}`, { ...current, ...patch });
    patches.push({ id: current.id, patch });
  }
  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, patches: patches.map((item, index) => ({ ...TARGETS[index], id: item.id, title: item.patch.title })) }, null, 2));
    return;
  }

  const body = JSON.stringify({ patches });
  const secret = process.env.BLOG_INGEST_HMAC_SECRET || process.env.ALTOS_BLOG_INGEST_HMAC_SECRET || "";
  const headers = secret ? signedHeaders(secret, body) : {};
  const cookie = await adminCookie(root);
  const { payload } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
    method: "POST",
    headers: {
      ...headers,
      ...(cookie ? { Cookie: cookie } : {})
    },
    body
  });

  const readback = [];
  for (const target of TARGETS) {
    const post = await currentPost(root, target.slug, target.language);
    readback.push({
      ...target,
      title: post.title,
      excerpt: post.excerpt,
      zhLength: zhLength(post.body || post.content || ""),
      h2: (String(post.body || post.content || "").match(/^##\s+/gm) || []).length,
      sourceCount: post.sourceLinks?.length || 0
    });
  }
  console.log(JSON.stringify({ ok: true, result: payload, readback }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
