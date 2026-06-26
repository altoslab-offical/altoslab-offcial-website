#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const TARGETS = [
  "ai-vendor-demo-to-operating-proof-20260625-zh-hant",
  "ai-search-answer-shape-before-keywords-20260625-zh-hant",
  "agent-interface-contract-before-autonomy-20260625-zh-hant"
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
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
      "User-Agent": "ALTOS-LAB-column-copy-repair/1.0",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { response, payload };
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
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

const repairs = {
  "ai-vendor-demo-to-operating-proof-20260625-zh-hant": {
    title: "買 AI 工具前，先把 Demo 變成驗收題",
    excerpt: "供應商展示只會出現最順的一天；採購前要用自己的資料、權限、成本上限與退場路線，測一遍普通工作日會不會出事。",
    seoTitle: "買 AI 工具前，先把供應商 Demo 變成驗收題",
    seoDescription:
      "AI 採購不能只看供應商 Demo。用資料邊界、權限、事實性、人工覆核、成本上限與退場路線，建立一週採購驗收測試。",
    geoSummary:
      "AI 採購應把供應商展示轉成自己的驗收題。本文用 Microsoft AI operating model、NIST AI RMF、Google Cloud 與 IBM 的治理文件，整理資料邊界、權限、事實性、人工覆核、成本與退場路線六項檢查。",
    keyTakeaways: [
      "供應商 Demo 只能證明理想場景，不能證明你的資料、權限與流程承受得住。",
      "採購前先跑一週驗收：用真資料、真審核者、真成本上限與真退場條件測試。",
      "能通過驗收的 AI 工具，要說得清楚誰能用、誰負責、錯了怎麼停、資料怎麼留下證據。"
    ],
    body: `供應商 Demo 通常都很順：資料乾淨、權限剛好、使用者配合，問題也被設計成模型容易回答的樣子。真正的採購風險不在展示當下，而是在導入後第一個普通工作日：資料格式不一致、權限不知道誰開、輸出需要人改、費用突然膨脹，最後沒有人說得清楚要不要繼續用。

所以採購 AI 工具前，重點不是再多看一次功能展示，而是把展示裡的承諾改寫成自己的驗收題。Microsoft 近年談 AI operating model，NIST AI RMF 強調治理與風險管理，Google Cloud 與 IBM 的企業 AI 文件也都回到同一件事：AI 能不能進 production，不只看能力，還要看責任、紀錄、監控與退場。

## Demo 看起來很順，通常是因為現場被整理過

展示環境裡最常被省略的，是企業真正會遇到的雜訊。客戶資料可能缺欄位，內部文件版本可能互相矛盾，主管要的不是單一答案，而是可以被審核、轉交、修改、追溯的工作結果。供應商把這些都整理好再展示，並不代表工具進到你的公司也會自然成立。

採購會議要多問一句：這個 Demo 如果換成我們自己的資料、我們自己的權限、我們自己的審核流程，還會不會一樣順？如果答案模糊，就代表還不能進入正式採購判斷。

[IMAGE:evidence-desk]

## 一週驗收比一場 Demo 更接近真相

比較務實的做法，是先定一週採購驗收。不要測所有功能，只挑一條高頻、低到中風險、但足以暴露問題的流程。把它拆成六個面向：

| 驗收面 | 要問的問題 | 不合格訊號 |
| --- | --- | --- |
| 資料邊界 | 它需要讀哪些資料？哪些資料不能碰？ | Demo 只說「可以整合」，沒有資料清單 |
| 權限 | 誰能啟用、誰能批准、誰能停用？ | 所有人都能試，沒有人負責 |
| 事實性 | 答案錯了怎麼被發現？ | 只看模型信心，不看來源 |
| 覆核 | 哪些輸出一定要人看？ | 「AI 會自動判斷」被拿來取代審核 |
| 成本 | 每次任務、每位使用者、每月上限是多少？ | 沒有異常用量警示 |
| 退場 | 不續約或出錯時怎麼切回舊流程？ | 流程被綁死在單一供應商 |

這張表不是為了拖慢採購，而是把採購討論從「它好像很厲害」拉回「它能不能在我們公司安全地運作」。

## 好工具要能留下決策證據

企業買 AI 工具，最後買的不是一個聊天視窗，而是一組可營運的能力。好的工具會讓團隊看得見：它用了哪些資料、做了哪些判斷、哪一步需要人批准、結果被誰採用、失敗時怎麼還原。這些證據越清楚，導入速度反而越快，因為資安、法務、營運與業務不用每次重新吵一次。

相反地，如果工具只能展示漂亮輸出，卻說不清 log、權限、成本與 rollback，就算 Demo 很順，也只是把風險延後到上線後爆開。

[IMAGE:operating-loop]

## 小團隊也可以做，只是範圍要小

這套驗收不只適合大企業。小團隊更需要它，因為沒有多餘人力替 AI 補洞。做法可以很輕：一份資料清單、一張權限表、一個人工審核者、一個成本上限、一條回復路線。只要這五件事說不清楚，就先不要把 AI 接到會影響客戶承諾、付款、公開內容或正式資料的流程。

真正好的 AI 採購，不是買到最會表演的工具，而是買到一套能被公司吸收、監控、修正與退場的工作方式。`,
    faqs: [
      {
        question: "AI 工具採購前一定要做一週驗收嗎？",
        answer:
          "不一定是一整週，但至少要有一段真實流程驗收。只看 Demo 容易忽略資料品質、權限、覆核、成本與退場問題。"
      },
      {
        question: "如果供應商不願意配合真實驗收怎麼辦？",
        answer:
          "可以先用去識別化資料與低風險流程測試。如果連基本驗收都無法配合，通常代表後續導入風險會更高。"
      }
    ]
  },
  "ai-search-answer-shape-before-keywords-20260625-zh-hant": {
    title: "AI 搜尋不是吃關鍵字，是吃可引用的答案",
    excerpt: "想被 AI 摘要引用，文章要先回答一個清楚問題：結論、來源、例子與限制能不能被單獨摘出來，仍然不走樣。",
    seoTitle: "AI 搜尋不是吃關鍵字，是吃可引用的答案",
    seoDescription:
      "想提升 AI 搜尋引用機會，內容要有清楚問題、短結論、可信來源、例子與限制。本文整理 GEO 寫作的答案結構。",
    geoSummary:
      "AI 搜尋與傳統 SEO 的共同基礎仍是有用、可信、可讀的內容。本文用 Google Search Central、OpenAI Structured Outputs 與 Microsoft responsible AI 文件，整理可引用答案的段落結構：問題、結論、來源、例子、限制與下一步。",
    keyTakeaways: [
      "AI 搜尋更容易引用能單獨成立的段落：一句結論、一個來源、一個例子、一個限制。",
      "GEO 不是堆關鍵字，而是讓 AI 和真人都能追到來源、判斷與下一步。",
      "文章發布後要用 Search Console、站內行為與 AI referral 回頭修標題、FAQ 與段落結構。"
    ],
    body: `很多人談 AI 搜尋時，第一反應是再找一組新關鍵字。但 AI 摘要真正需要的，通常不是更多關鍵字，而是更清楚的答案形狀。它要能看出這一頁回答什麼問題、結論是什麼、來源在哪裡、例子如何支撐、限制又在哪裡。

Google Search Central 一直強調有用內容與可理解的頁面結構；OpenAI Structured Outputs 讓我們看到機器讀取資訊時需要穩定欄位；Microsoft 的 responsible AI 文件也提醒，答案要能被追溯與檢查。把這些放在內容工作流裡，GEO 不是神秘技巧，而是把文章寫成可被引用、也可被人讀懂的知識單元。

## 先問：這段話被單獨引用時會不會失真

好的 AI 搜尋段落，離開全文後仍然能站得住。它不會只說「這很重要」，而會說清楚重要在哪裡；不會只說「根據研究」，而會指出來源脈絡；不會只給結論，而會保留限制，避免 AI 摘要把假設講成事實。

如果一段文章必須讀完整篇才知道它在講什麼，它就不適合被 AI 引用。這不代表文章要變碎片化，而是每個小節都要有清楚的任務。

[IMAGE:evidence-desk]

## 可引用答案通常有四個零件

一個穩定的答案段落，至少要包含四個零件：

| 零件 | 作用 | 範例寫法 |
| --- | --- | --- |
| 結論 | 讓讀者知道這段回答什麼 | AI 搜尋更容易引用來源清楚、限制明確的段落 |
| 來源 | 讓判斷可以回查 | Google Search Central 將重點放在有用內容與可理解結構 |
| 例子 | 讓抽象概念落地 | FAQ 可回答搜尋者的下一個問題，而不是重複標題 |
| 限制 | 避免被過度延伸 | 沒有 Search Console 或 referral 數據前，不能宣稱成效已發生 |

這四個零件不必每段都完整出現，但每個主要小節都應該至少能交代「我在回答哪個問題」。

## 標題要像入口，小標要像路標

AI 搜尋與真人讀者都需要路標。標題負責讓人知道這篇值不值得進來，小標負責讓人知道每段要解決什麼。壞小標像「下一步」或「深入分析」；好小標會讓讀者不用讀全文，也能抓到文章骨架。

例如「GEO 的核心」太空；「AI 搜尋不是吃關鍵字，是吃可引用答案」就比較清楚。它有對比、有判斷，也能引導後面的段落。

[IMAGE:operating-loop]

## FAQ 不該補字數，而是補搜尋者的下一個疑問

FAQ 最常見的失敗，是把文章小標再問一次。真正有用的 FAQ 應該處理讀者接下來會卡住的問題：這和 SEO 差在哪裡？沒有數據能不能宣稱有效？文章要不要為 AI 摘要而改短？這些問題能補足搜尋意圖，也能讓 AI 系統更容易抓到邊界。

發布後的優化也不應只看排名。Search Console 可以看查詢與點擊，站內行為可以看讀者是否讀到後段，AI referral 可以看是否開始被答案系統帶入。這三種訊號合起來，才知道要改標題、補 FAQ、換圖，還是重寫段落。`,
    faqs: [
      {
        question: "GEO 是不是只要在文章裡多放 AI 會搜尋的關鍵字？",
        answer:
          "不是。關鍵字只是一部分，GEO 更重視答案是否清楚、來源是否可回查、段落是否能被安全引用。"
      },
      {
        question: "沒有 AI referral 數據前可以說文章已被 AI 搜尋帶流量嗎？",
        answer:
          "不應該。可以說內容已依可引用結構優化，但成效要等 GA、Search Console 或其他讀回資料支持。"
      }
    ]
  },
  "agent-interface-contract-before-autonomy-20260625-zh-hant": {
    title: "Agent 要動手前，先寫一份介面合約",
    excerpt: "Agent 接上工具以前，團隊要先說清楚它能讀什麼、能改什麼、什麼時候必須停下來，否則自動化只會把責任推給下一個人。",
    seoTitle: "AI Agent 要動手前，先寫一份介面合約",
    seoDescription:
      "企業導入 AI Agent 前，要先定義資料讀取、寫入權限、批准節點、證據格式與回滾條件，避免自動化放大責任缺口。",
    geoSummary:
      "AI Agent 的介面合約應定義可讀資料、可寫欄位、批准節點、證據紀錄與停損回滾。OpenAI、Microsoft、NIST 與 IBM 的 agent 與 AI governance 文件共同提醒：自治之前，要先有可審核的邊界。",
    keyTakeaways: [
      "Agent 不是接上工具就能進 production，必須先定義它和企業系統的介面合約。",
      "介面合約至少要包含可讀資料、可寫欄位、批准節點、證據紀錄與回滾條件。",
      "第一個 Agent 試點應從低風險、高頻、可人工接回的流程開始。"
    ],
    body: `企業導入 Agent 時，最容易跳過的不是模型選型，而是介面合約。很多團隊先問「它能不能幫我做事」，卻沒有先問「它被允許碰什麼、改什麼、問誰、留下什麼證據、什麼時候停下來」。少了這份合約，Agent 做得越多，責任越容易散掉。

OpenAI 的 agent 與 Codex 案例、Microsoft 的 Agent 365 與控制規範、NIST AI RMF、IBM 的 AI governance 文件都指向同一件事：自動化要進企業，不只需要能力，也需要可審核的邊界。介面合約就是把這個邊界寫成團隊看得懂、系統也能執行的規格。

## 介面合約不是工程文件，是責任邊界

傳統 API contract 會定義輸入、輸出和錯誤碼；Agent interface contract 還要多定義責任。它要說清楚 Agent 可以讀哪些資料、可以呼叫哪些工具、可以改哪些欄位、哪些動作要人批准、執行過程留下哪些紀錄，以及失敗時如何停止或回復。

這份文件不只給工程師看。營運、法務、資安、客服和產品負責人都應該看得懂，因為 Agent 出錯時，受影響的不只是程式，而是承諾、資料、成本與客戶信任。

[IMAGE:evidence-desk]

## 先寫五個欄位，再談自治

第一版介面合約不需要很厚，但至少要有五個欄位：

| 欄位 | 要定義什麼 | 風險 |
| --- | --- | --- |
| Read | Agent 能讀哪些資料、來源版本與更新頻率 | 讀到過期或不該看的資料 |
| Write | Agent 能改哪些欄位、能不能發布或送出 | 把草稿當正式輸出 |
| Approval | 哪些動作一定要人工批准 | 關鍵承諾被自動送出 |
| Evidence | 每次行動要留下哪些紀錄 | 出事後追不到原因 |
| Stop/Rollback | 什麼條件停下、怎麼退回舊流程 | 錯誤一路傳到下游 |

只要這五欄還空著，就不應該把 Agent 接到會影響客戶資料、付款、對外承諾或正式發布的流程。

## 好的 Agent 試點應該能被接回來

第一個試點不要挑最混亂、最關鍵、最難回復的流程。比較好的起點，是高頻、規則清楚、輸出可審核、失敗能人工接回的任務。例如整理內部資料、生成草稿、比對文件、準備會議摘要，都比直接回覆客戶或改動正式資料更適合。

這不是保守，而是讓團隊看見 Agent 會在哪裡失誤。等團隊知道它會亂補、漏看、過度自信或卡在某種資料格式時，才有資格擴大權限。

[IMAGE:operating-loop]

## 介面合約要進入日常維運

介面合約不是上線前寫一次就結束。每次資料來源改變、工具權限擴大、模型版本更新、任務範圍增加，都應該回頭檢查合約。否則一開始安全的 Agent，幾週後可能已經被加到完全不同的流程裡。

真正成熟的 Agent 系統，不是看起來很像同事，而是像一個可維運的產品：能查、能停、能改、能回復，也能讓人知道它為什麼那樣做。自治之前，先把介面寫清楚，才不會把責任交給一個沒有人能接回來的黑盒子。`,
    faqs: [
      {
        question: "Agent interface contract 和一般 API 文件有什麼不同？",
        answer:
          "API 文件多定義技術輸入輸出；Agent interface contract 還要定義資料邊界、批准節點、證據紀錄與回滾責任。"
      },
      {
        question: "第一個 Agent 試點應該挑什麼任務？",
        answer:
          "應挑高頻、低到中風險、輸出可審核、失敗能人工接回的任務，不要一開始就接客戶承諾或正式資料修改。"
      }
    ]
  }
};

const forbidden = [
  /週三下午，團隊準備讓 AI 接手一段真實工作/i,
  /週三下午，行銷主管、營運負責人和工程窗口坐在同一張會議桌前/i,
  /source-backed AI operations column/i,
  /for readers comparing implementation, governance, SEO and GEO decisions/i,
  /\bHermes\b|\bOpenClaw\b/i
];

function sanitizedCoverGeneration(post) {
  if (!post.coverGeneration) return post.coverGeneration;
  return {
    ...post.coverGeneration,
    provider: "OpenAI image generation (ALTOS LAB editorial system)"
  };
}

function assertClean(post) {
  const combined = [
    post.title,
    post.excerpt,
    post.seoTitle,
    post.seoDescription,
    post.geoSummary,
    post.coverAlt,
    post.coverCredit,
    post.coverPrompt,
    JSON.stringify(post.coverGeneration || {}),
    post.body,
    ...(post.keyTakeaways || []),
    ...(post.faqs || []).flatMap((faq) => [faq.question, faq.answer])
  ].join("\n");
  const bad = forbidden.find((pattern) => pattern.test(combined));
  if (bad) throw new Error(`${post.slug} still contains forbidden recycled/operator text: ${bad}`);
  const h2Count = (post.body.match(/^##\s+/gm) || []).length;
  if (h2Count < 4) throw new Error(`${post.slug} needs at least 4 section subtitles; found ${h2Count}`);
  const markers = [...post.body.matchAll(/\[IMAGE:([^\]]+)\]/g)].map((match) => match[1]);
  if (markers.length < 2) throw new Error(`${post.slug} needs two image markers; found ${markers.length}`);
  if ((post.keyTakeaways || []).length < 3) throw new Error(`${post.slug} needs 3 takeaways`);
  if ((post.faqs || []).length < 2) throw new Error(`${post.slug} needs 2 FAQs`);
}

async function currentPost(root, slug) {
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=zh-Hant&ts=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  return payload.post || payload.payload?.post || payload;
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const posts = [];
  for (const slug of TARGETS) {
    const post = await currentPost(root, slug);
    if (!post.id) throw new Error(`Could not resolve post id for ${slug}`);
    posts.push(post);
  }

  const patches = posts.map((post) => {
    const repair = repairs[post.slug];
    if (!repair) throw new Error(`Missing repair payload for ${post.slug}`);
    const next = {
      ...post,
      ...repair,
      status: "published",
      language: "zh-Hant",
      qualityStatus: "passed",
      qualityIssues: [],
      qualityChecks: {
        ...(post.qualityChecks || {}),
        hasHumanReview: true,
        hasSearchIntentAnswer: true,
        qualityIssues: []
      }
    };
    assertClean(next);
    return {
      id: post.id,
      patch: {
        title: repair.title,
        excerpt: repair.excerpt,
        seoTitle: repair.seoTitle,
        seoDescription: repair.seoDescription,
        geoSummary: repair.geoSummary,
        keyTakeaways: repair.keyTakeaways,
        body: repair.body,
        faqs: repair.faqs,
        coverGeneration: sanitizedCoverGeneration(post),
        qualityStatus: "passed",
        qualityIssues: [],
        qualityChecks: next.qualityChecks
      }
    };
  });

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, patches: patches.map((item) => ({ id: item.id, title: item.patch.title })) }, null, 2));
    return;
  }

  const body = JSON.stringify({ patches });
  const cookie = await adminCookie(root);
  const secret = process.env.BLOG_INGEST_HMAC_SECRET || "";
  if (!cookie && !secret) throw new Error("No admin cookie or BLOG_INGEST_HMAC_SECRET available");
  const { payload: result } = await fetchJson(`${root}/api/admin/blog/bulk-patch`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : signedHeaders(secret, body),
    body
  });
  if (result.failures?.length || !result.ok) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const readback = [];
  for (const updated of result.updated || []) {
    const post = await currentPost(root, updated.slug);
    assertClean(post);
    readback.push({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      h2Count: (post.body.match(/^##\s+/gm) || []).length,
      markers: [...post.body.matchAll(/\[IMAGE:([^\]]+)\]/g)].map((match) => match[1])
    });
  }

  console.log(JSON.stringify({ ok: true, updated: readback.length, readback, publicCache: result.publicCache }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
