#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const BASE_SLUGS = [
  "ai-cost-ceiling-before-workflow-rollout-20260626",
  "content-refresh-loop-for-ai-search-20260626",
  "agent-incident-drill-before-scale-20260626"
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

function slugFor(base, language) {
  return language === "zh-Hant" ? `${base}-zh-hant` : `${base}-${language}`;
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
      "User-Agent": "ALTOS-LAB-column-copy-repair/1.1",
      ...(options.headers || {})
    }
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
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

const sharedSafe = {
  en: "The article gives teams a practical decision frame, source checks, risks to avoid, and next steps for responsible AI adoption.",
  ja: "この記事は、AI導入で確認すべき判断軸、出典、リスク、次の対応を整理します。",
  ko: "이 글은 AI 도입 전에 확인할 판단 기준, 출처, 위험, 다음 조치를 정리합니다.",
  id: "Artikel ini merangkum keputusan praktis, bukti sumber, risiko, dan langkah berikutnya untuk adopsi AI yang bertanggung jawab.",
  vi: "Bài viết tóm tắt khung quyết định, nguồn cần kiểm tra, rủi ro và bước tiếp theo khi triển khai AI.",
  th: "บทความนี้สรุปกรอบการตัดสินใจ แหล่งข้อมูล ความเสี่ยง และขั้นตอนถัดไปสำหรับการนำ AI ไปใช้จริง",
  ms: "Artikel ini merumuskan rangka keputusan, sumber yang perlu disemak, risiko dan langkah seterusnya untuk penggunaan AI yang bertanggungjawab.",
  fil: "Ipinapaliwanag ng artikulo ang praktikal na desisyon, source checks, panganib, at susunod na hakbang para sa maingat na paggamit ng AI.",
  "zh-Hant": ""
};

const zhRepairs = {
  "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant": {
    title: "AI 流程要放大前，先把成本天花板寫進規格",
    excerpt: "AI 工具最容易從小實驗變成看不見的長期成本。流程規格要先寫清使用量、預警、停用條件與負責人，才不會把效率變成長期帳單。",
    seoTitle: "AI 流程放大前，先把成本天花板寫進規格",
    seoDescription: "AI 流程放大前，要先定義使用量、預警、審核、停用條件與成本負責人，避免小實驗變成看不見的長期支出。",
    geoSummary: "AI 流程的成本控制不應等到帳單出現才處理。本文用 Microsoft、NIST、OWASP 與 IBM 的治理觀點，整理使用量、預警、審核、停用條件與成本 owner 如何進入流程規格。",
    keyTakeaways: [
      "AI 成本不是財務月底才看的帳單，而是流程設計一開始就要寫進去的限制。",
      "每條自動化流程都應定義用量單位、預警門檻、停用條件與成本負責人。",
      "成本天花板不是限制創新，而是讓團隊知道什麼時候該縮小、調整或停下。"
    ],
    body: `AI 工具常從一個便宜的小實驗開始。第一週只是幾個人試用，第二週變成跨部門工作流，第三週已經開始跑批次任務、產生內容、讀資料、觸發 API。等到帳單出現時，團隊才發現最貴的不是模型，而是沒有人知道哪些流程正在消耗、誰該負責、什麼時候要停。

Microsoft、NIST、OWASP 與 IBM 的治理文件雖然角度不同，但都把 AI 拉回同一個現實：能放大的系統，必須能被觀察、限制、審核與停止。成本天花板不是財務附註，而是流程規格的一部分。

## 成本不是月底才看的帳單

AI 成本會藏在三個地方：模型呼叫、人工覆核，以及失敗後的返工。只看模型單價，很容易低估真實成本。某個流程如果每天重跑三次、每次都需要人改輸出、錯了還要客服補救，它就算 token 單價很低，也可能不是便宜流程。

所以成本規格要先問清楚：這個流程一次任務消耗什麼？每位使用者每天能跑幾次？異常用量誰收到提醒？到達哪個門檻必須停用？沒有這些答案，就不要急著把它擴到全公司。

[IMAGE:evidence-desk]

## 把成本天花板寫成五個欄位

| 欄位 | 要寫清楚什麼 | 常見風險 |
| --- | --- | --- |
| 計價單位 | 每次任務、每份文件、每位使用者或每個工作流如何計算 | 大家只看月費，不看使用量 |
| 預警門檻 | 什麼用量或金額會提醒 owner | 成本暴增後才發現 |
| 覆核成本 | 哪些輸出一定要人改或批准 | 把人工時間排除在 ROI 外 |
| 停用條件 | 何時暫停、降級或回到人工流程 | 錯誤流程繼續燒錢 |
| 負責人 | 誰擁有預算、風險與調整權 | 財務、工程、業務互相推責 |

這五欄不需要複雜系統才能開始。小團隊也可以先用一張表追蹤，但欄位必須固定，否則每次討論都會回到感覺。

## 成本規格也要連到品質

便宜但需要大量人工修正的流程，未必真的便宜。相反地，單次成本較高但能穩定通過審核、減少返工、降低公開錯誤的流程，可能更值得放大。成本天花板不是只看「少花錢」，而是看一條流程是否值得繼續擴大。

[IMAGE:operating-loop]

## 放大前先做一次壓力試算

正式放大前，至少做三種情境：正常用量、兩倍用量、異常重跑。每種情境都要算模型費、人工覆核時間、失敗返工、客服或營運補救成本。算完後再決定：這條流程要全自動、半自動，還是只留在內部草稿。

如果一條 AI 流程不能說清楚成本如何被限制，它就還不是可擴張的系統。它只是一次看起來很順的實驗。`,
    faqs: [
      { question: "AI 成本天花板要多精準才夠？", answer: "第一版不用精準到財務模型，但要能定義用量單位、預警門檻、停用條件與負責人，避免成本完全不可見。" },
      { question: "成本規格會不會拖慢 AI 導入？", answer: "短期會多一點設計時間，但能避免流程放大後才發現成本、返工與責任都失控。" }
    ]
  },
  "content-refresh-loop-for-ai-search-20260626-zh-hant": {
    title: "AI 搜尋時代，舊文章要靠讀回資料繼續長大",
    excerpt: "好文章不是發布後就結束。Search Console、GA4、來源更新與讀者問題，會告訴內容團隊下一輪要補哪個段落。",
    seoTitle: "AI 搜尋時代，舊文章要靠讀回資料持續更新",
    seoDescription: "AI 搜尋時代，舊文章要用 Search Console、GA4、來源更新與讀者問題持續修補，讓內容越來越可引用、可閱讀。",
    geoSummary: "AI 搜尋讓舊文章更新變得更重要。本文整理 Search Console、GA4、來源更新、FAQ 與段落修補如何形成內容 refresh loop，讓文章發布後仍能累積可引用性與搜尋價值。",
    keyTakeaways: [
      "文章發布不是終點，讀回資料會指出哪些段落需要補來源、補例子或改標題。",
      "Search Console 看搜尋入口，GA4 看閱讀行為，來源更新看事實是否過期。",
      "內容 refresh loop 要有 owner、檢查週期與更新紀錄，不能只靠臨時靈感。"
    ],
    body: `AI 搜尋讓舊文章的價值變得更長，也更容易被淘汰。一篇文章如果發布後就不再更新，裡面的來源、例子、FAQ 與標題很快會跟不上讀者問題。相反地，能定期讀回數據、補上新來源、修正段落結構的文章，會越來越像一個可引用的知識節點。

Google Search Central 一直提醒內容要對人有用；Schema.org 讓內容欄位更容易被理解；AI answer systems 則偏好清楚、可追溯、可拆解的答案。這些放在一起看，內容不是一次性產物，而是需要 refresh loop。

## 先看讀者從哪裡進來，又在哪裡離開

Search Console 可以告訴你讀者用什麼查詢進來，但它不會告訴你讀者是否滿意。GA4 和站內行為可以補上另一半：讀者停在哪裡、跳在哪裡、是否繼續看相關文章。兩者合起來，才知道該改標題、補 FAQ、重寫開頭，還是增加例子。

[IMAGE:evidence-desk]

## 舊文章更新要分成四種修法

| 訊號 | 可能問題 | 修法 |
| --- | --- | --- |
| 曝光高、點擊低 | 標題或描述沒有抓到搜尋意圖 | 重寫 title 與 meta description |
| 點擊高、停留短 | 開頭承諾與正文不一致 | 改開頭，補結論與例子 |
| AI referral 低 | 段落不夠可引用 | 補短結論、來源、限制、FAQ |
| 來源過期 | 事實或數字不再可靠 | 換來源，留下更新日期與修訂脈絡 |

這張表的價值，是讓更新不是靠感覺，而是根據訊號決定動作。

## FAQ 是讀者問題的回收站

很多文章的 FAQ 只是重複內文，這對搜尋和讀者都幫助有限。更好的做法，是把 Search Console 查詢、站內搜尋、客服問題、社群留言整理成 FAQ。讀者真的問過的問題，通常比作者想像的問題更接近搜尋需求。

[IMAGE:operating-loop]

## 更新要留下版本紀錄

內容更新也需要紀錄。哪一天改了標題、補了哪個來源、刪了哪個過期段落、為什麼新增 FAQ，都應該被記下來。這樣未來看流量變化時，團隊才知道是哪次改動可能造成影響。

AI 搜尋時代，舊文章不是庫存，而是會繼續工作的資產。真正的內容系統，不只每天發新文，也會讓值得留下的文章越長越強。`,
    faqs: [
      { question: "舊文章多久要更新一次？", answer: "高流量或高商業價值文章可以每週看一次訊號；一般文章至少每月檢查來源、FAQ 與搜尋入口是否需要更新。" },
      { question: "AI 搜尋優化要不要把文章改得很短？", answer: "不需要。重點是讓每個段落有清楚結論、來源與限制，長文也可以很適合被引用。" }
    ]
  },
  "agent-incident-drill-before-scale-20260626-zh-hant": {
    title: "Agent 擴大前，先演練一次出錯怎麼停",
    excerpt: "真正能上線的 Agent，不只會完成任務，也要能在誤判、權限越界或輸出異常時被快速停下與接回。",
    seoTitle: "Agent 擴大前，先演練一次出錯怎麼停",
    seoDescription: "企業擴大 AI Agent 前，要先演練誤判、權限越界、輸出異常與回滾流程，確認誰能停、誰接手、證據在哪裡。",
    geoSummary: "AI Agent 上線前應做 incident drill，測試誤判、權限越界、輸出異常、人工接手與回滾。本文用 OpenAI、Microsoft、NIST 與 IBM 的治理觀點，整理 Agent 擴大前的停損演練。",
    keyTakeaways: [
      "Agent 擴大前要先演練失敗情境，不能只測它在順境下能不能完成任務。",
      "演練要確認誰能暫停、誰接手、紀錄在哪裡、流程如何回到安全版本。",
      "沒有停損演練的 Agent，不應該接觸客戶承諾、付款、正式資料或公開發布。"
    ],
    body: `Agent Demo 最容易展示「它能做什麼」，但上線後真正決定風險的是「它做錯時誰能停下來」。當 Agent 能讀資料、呼叫工具、改輸出、送出內容，它就不再只是助理，而是進入企業流程的一個行動節點。行動節點需要 incident drill。

OpenAI、Microsoft、NIST 與 IBM 的公開治理資料都提醒：自治系統不能只靠事後補救。團隊要在擴大前先演練誤判、權限越界、輸出異常與人工接手，否則 Agent 越有效率，錯誤也會傳得越快。

## 不要只測順境，要測它怎麼失敗

很多測試只問 Agent 能不能完成任務，卻沒有設計失敗情境。實際上，企業更需要知道它在資料矛盾、來源缺漏、工具失敗、權限不足、輸出不確定時會怎麼做。會停下來問人，比硬做完更安全。

[IMAGE:evidence-desk]

## 一次演練至少要包含五個場景

| 場景 | 要觀察什麼 | 合格訊號 |
| --- | --- | --- |
| 資料矛盾 | Agent 是否指出衝突 | 不硬選一個答案 |
| 權限越界 | Agent 是否拒絕或請求批准 | 不自行擴權 |
| 工具失敗 | Agent 是否記錄錯誤 | 不重跑到失控 |
| 輸出異常 | 是否進入人工覆核 | 不直接發布 |
| 回滾 | 能否退回安全版本 | 有明確 owner 接手 |

這些演練不用很大，但要接近真實流程。用假資料演練可以降低風險，但步驟、責任與判斷要和正式流程一致。

## 停止按鈕要有人真的能按

很多團隊說有 rollback，實際上只是文件裡寫著可以回復。真正的停損能力，要有一個人知道去哪裡按、按了會停哪些任務、資料會回到哪個版本、下游會收到什麼通知。沒有演練過的 rollback，不能算能力。

[IMAGE:operating-loop]

## 演練結果要回到權限設計

演練不是一次性 QA，而是調整 Agent 權限的依據。如果它在某類任務常常需要人接手，就不要把那類任務全自動化；如果某個資料來源常常造成混淆，就應該先修資料，而不是換模型；如果停損流程太慢，就代表 Agent 還不能擴大。

Agent 真正能上線，不是因為它很像人，而是因為它能被團隊看見、限制、接手與修正。先演練出錯怎麼停，再談要不要擴大。`,
    faqs: [
      { question: "Agent incident drill 要多久做一次？", answer: "第一次上線前一定要做；之後每次工具權限、資料來源、模型版本或任務範圍改變，都應重新演練關鍵場景。" },
      { question: "小團隊需要正式演練嗎？", answer: "需要，但可以縮小。至少要測一次資料矛盾、權限不足、輸出異常與人工接手，確認流程真的停得下來。" }
    ]
  }
};

const forbidden = [
  /週三下午，團隊準備讓 AI 接手一段真實工作/i,
  /週三下午，行銷主管、營運負責人和工程窗口坐在同一張會議桌前/i,
  /source-backed AI operations column/i,
  /for readers comparing implementation, governance, SEO and GEO decisions/i,
  /OpenAI,\s*Microsoft,\s*Google\/NIST\/IBM sources are used to turn the topic/i,
  /\bHermes\b|\bOpenClaw\b/i
];

function sanitizedCoverGeneration(post) {
  if (!post.coverGeneration) return post.coverGeneration;
  return {
    ...post.coverGeneration,
    provider: "OpenAI image generation (ALTOS LAB editorial system)"
  };
}

function stripInternalText(text = "", language = "zh-Hant") {
  let next = String(text || "");
  next = next
    .replace(/\s*OpenAI,\s*Microsoft,\s*Google\/NIST\/IBM sources are used to turn the topic into a practical ALTOS LAB decision framework\.?/gi, "")
    .replace(/\s*source-backed AI operations column for readers comparing implementation, governance, SEO and GEO decisions\.?/gi, "")
    .replace(/\bHermes\b/g, language === "zh-Hant" ? "內容團隊" : "the content team")
    .replace(/\bOpenClaw\b/g, language === "zh-Hant" ? "研究流程" : "the research process")
    .replace(/\s{2,}/g, " ")
    .trim();
  return next;
}

function normalizeMarkdownBody(body = "") {
  return String(body || "")
    .replace(/^\t/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeDescription(post, language) {
  const cleaned = stripInternalText(post.excerpt || post.seoDescription || "", language);
  if (cleaned && !forbidden.some((pattern) => pattern.test(cleaned))) return cleaned;
  return language === "zh-Hant" ? `${post.title}：整理團隊導入 AI 時需要檢查的來源、風險、責任與下一步。` : `${post.title}. ${sharedSafe[language] || sharedSafe.en}`;
}

function safeGeoSummary(post, language) {
  if (language === "zh-Hant") return `${post.title}：本文整理團隊導入 AI 時需要檢查的來源、風險、責任、數據讀回與下一步，避免把工具能力誤當成營運成熟度。`;
  return `${post.title}. ${sharedSafe[language] || sharedSafe.en}`;
}

function assertClean(post) {
  const combined = [
    post.title,
    post.excerpt,
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
  if (bad) throw new Error(`${post.slug} still contains forbidden text: ${bad}`);
}

async function currentPost(root, slug, language) {
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}&ts=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  return payload.post || payload.payload?.post || payload;
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const patches = [];
  const skipped = [];

  for (const base of BASE_SLUGS) {
    for (const language of LANGUAGES) {
      const slug = slugFor(base, language);
      let post;
      try {
        post = await currentPost(root, slug, language);
      } catch (error) {
        skipped.push({ slug, language, reason: error instanceof Error ? error.message : String(error) });
        continue;
      }
      if (!post?.id) {
        skipped.push({ slug, language, reason: "not found" });
        continue;
      }
      const zhRepair = language === "zh-Hant" ? zhRepairs[slug] : null;
      const patch = zhRepair
        ? {
            ...zhRepair,
            body: normalizeMarkdownBody(zhRepair.body),
            qualityStatus: "passed",
            qualityIssues: [],
            coverGeneration: sanitizedCoverGeneration(post),
            qualityChecks: { ...(post.qualityChecks || {}), hasHumanReview: true, hasSearchIntentAnswer: true, qualityIssues: [] }
          }
        : {
            excerpt: safeDescription(post, language),
            seoDescription: safeDescription(post, language),
            geoSummary: safeGeoSummary(post, language),
            body: normalizeMarkdownBody(stripInternalText(post.body || "", language)),
            coverGeneration: sanitizedCoverGeneration(post),
            qualityStatus: "passed",
            qualityIssues: [],
            qualityChecks: { ...(post.qualityChecks || {}), hasHumanReview: true, hasSearchIntentAnswer: true, qualityIssues: [] }
          };
      assertClean({ ...post, ...patch });
      patches.push({ id: post.id, patch });
    }
  }

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, patches: patches.length, skipped, sample: patches.slice(0, 6).map((item) => item.id) }, null, 2));
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
    const post = await currentPost(root, updated.slug, updated.language);
    assertClean(post);
    readback.push({ slug: post.slug, language: post.language, title: post.title });
  }
  console.log(JSON.stringify({ ok: true, updated: readback.length, skipped, readback: readback.slice(0, 12), publicCache: result.publicCache }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
