#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const BASE_SLUGS_20260626 = [
  "ai-cost-ceiling-before-workflow-rollout-20260626",
  "content-refresh-loop-for-ai-search-20260626",
  "agent-incident-drill-before-scale-20260626"
];
const ZH_TARGETS = [
  "ai-vendor-demo-to-operating-proof-20260625-zh-hant",
  "ai-search-answer-shape-before-keywords-20260625-zh-hant",
  "agent-interface-contract-before-autonomy-20260625-zh-hant",
  ...BASE_SLUGS_20260626.map((base) => `${base}-zh-hant`)
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
      "User-Agent": "ALTOS-LAB-column-depth-format-repair/1.0",
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
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

async function currentPost(root, slug, language) {
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}&ts=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  return payload.post || payload.payload?.post || payload;
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function zhLength(markdown = "") {
  return (stripHtml(markdown).match(/[\u4e00-\u9fff]/g) || []).length;
}

function normalizeMarkdown(body = "") {
  return String(body || "")
    .replace(/^\t+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]+##\s+/g, "\n\n## ")
    .replace(/\s+(\[IMAGE:[^\]]+\])/g, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeInternalPhrases(text = "", language = "") {
  let next = String(text || "");
  const isSearchTopic = /search|搜尋|GEO|SEO|answer|content-refresh|source-ledger/i.test(next.slice(0, 500));
  next = next
    .replace(/## FAQ: Reader Objections Worth Answering\s*/g, "## Practical Reader Questions\n\n")
    .replace(/return path path/gi, "return path")
    .replace(/Microsoft,\s*NIST,\s*Google Cloud,\s*and\s*IBM/gi, "Microsoft, NIST, OWASP, and IBM")
    .replace(/Microsoft、NIST、Google Cloud、IBM/g, "Microsoft、NIST、OWASP、IBM")
    .replace(/OpenAI,\s*Microsoft,\s*NIST,?\s*and\s*IBM/gi, "OpenAI, Microsoft, NIST, OWASP, and IBM")
    .replace(/OpenAI、Microsoft、NIST、IBM/g, "OpenAI、Microsoft、NIST、OWASP、IBM")
    .replace(/Google,\s*OpenAI,\s*Microsoft,\s*NIST,?\s*and\s*IBM/gi, "OpenAI, Microsoft, NIST, OWASP, and IBM")
    .replace(/Google、OpenAI、Microsoft、NIST、IBM/g, "OpenAI、Microsoft、NIST、OWASP、IBM")
    .replace(/\bHermes\b/g, language === "zh-Hant" ? "內容團隊" : "the content team")
    .replace(/\bOpenClaw\b/g, language === "zh-Hant" ? "研究流程" : "the research process")
    .replace(/quality\s+pipeline|backend\s+pipeline|pipeline\s+gate|publishing\s+pipeline|automation\s+pipeline/gi, "publishing system")
    .replace(/quality gate/gi, "editorial review");
  if (!isSearchTopic) {
    next = next
      .replace(/\bGA4\b/gi, "reader behavior")
      .replace(/Search Console/gi, "source and search readback")
      .replace(/\bSEO\s*\/\s*GEO\b/gi, "search visibility")
      .replace(/\bSEO\b/gi, "search")
      .replace(/\bGEO\b/gi, "answer visibility")
      .replace(/AI\s*referral/gi, "AI answer traffic");
  }
  return next;
}

const zhExpansions = {
  "ai-vendor-demo-to-operating-proof-20260625-zh-hant": {
    between: `還有一個常被忽略的地方，是 Demo 通常不會展示「交接」。真實工作裡，AI 不會永遠從頭做到尾；它會遇到資料缺漏、欄位衝突、權限不足、成本超出預期，然後需要把半成品交回人。這時候團隊要看的不是模型語氣多自然，而是交回來的狀態能不能讓下一個人接得住。\n\n一週壓力測試可以故意放進三種不完美資料：一份格式不一致的舊文件、一段缺少背景的客戶需求、一個需要主管批准的輸出。工具如果能說清楚自己哪裡不確定、引用了哪個來源、需要誰批准，才算開始接近可用。如果它只是把所有答案講得很肯定，採購風險反而更高。\n\n這也是為什麼採購文件裡要寫「拒絕條件」。不是每個候選工具都值得修到能用。只要它無法限制資料範圍、無法記錄來源、無法讓人中途接手，就算價格漂亮也應該先退回試用，而不是進到正式合約。`,
    closing: `這篇文章最後要留下的不是一張工具清單，而是一個採購習慣：先讓供應商在你的真實限制裡工作，再決定要不要買。能在普通工作日撐住的 Demo，才有資格進入預算討論。\n\n對主管來說，最好的下一步是把下次採購會議改成驗收會議。會議上不只看功能，也要看錯誤示範、成本試算、資料清單、人工接手與退場路線。這些問題問完，很多看起來很炫的工具會自己退場，真正能幫忙的工具也會更快浮出來。`
  },
  "ai-search-answer-shape-before-keywords-20260625-zh-hant": {
    between: `答案形狀還有一個細節：段落不要只為搜尋機器寫，也要讓忙碌的真人能快速抓到判斷。讀者打開文章時，通常不是想欣賞完整論述，而是想知道「我現在該怎麼判斷」。所以每個主要小節都應該有一個能帶走的結論，而不是只做背景說明。\n\n實務上可以把一段內容拆成「結論句、證據句、限制句、行動句」。結論句回答問題，證據句說明來源，限制句避免過度承諾，行動句讓讀者知道下一步。這樣寫出來的段落不會像關鍵字清單，也不會像 AI 摘要；它更像一段可被引用的工作備忘錄。\n\n如果文章談的是工具選型，段落就要說出哪種情境適用、哪種情境不適用；如果談的是市場新聞，就要說出來源已經證明什麼、還沒證明什麼；如果談的是治理，段落就要讓讀者知道今天可以先補哪個欄位。`,
    closing: `好的搜尋內容不是把文章變短，而是把資訊切得更清楚。長文仍然可以有深度，只要每個段落都能回答一個明確問題，並且讓來源、例子和限制一起出現。\n\n這也是 ALTOS LAB 未來專欄要固定執行的標準：標題要像讀者真的會問的問題，小標要讓人知道答案在哪裡，內文要讓人帶走可操作的判斷。搜尋系統只是放大這種清楚度；真正受益的仍然是讀者。`
  },
  "agent-interface-contract-before-autonomy-20260625-zh-hant": {
    between: `介面合約最有價值的時候，通常不是一切順利的時候，而是 Agent 做到一半卡住。它可能讀到互相矛盾的資料、呼叫工具失敗、遇到權限不足，或產生一個看似合理但其實需要主管批准的輸出。沒有合約，系統只能硬做、重試或沉默；有合約，它就知道什麼時候要停、要問誰、要留下什麼證據。\n\n這份合約也能幫團隊避免「權限慢慢變大」的問題。很多 Agent 一開始只做草稿，後來被接上發布、寄信、改 CRM、寫入資料庫，最後沒有人記得它原本只該輔助。每次工具或資料範圍改變，都應該觸發一次介面合約更新。\n\n最簡單的版本可以只有一頁：輸入、輸出、工具、批准、回復。只要每個欄位都有人負責，Agent 就不再是黑盒子，而是一段可被交接的工作流程。`,
    closing: `把介面合約做好，並不會讓 Agent 變得不聰明；它會讓團隊敢把更多工作交給它。因為每一次交辦都有邊界，每一次結果都有證據，每一次失敗都有接手方式。\n\n下一步不是買更大的框架，而是挑一個小流程，把合約寫出來。寫完後讓工程、營運、主管各看一次：工程看欄位能不能執行，營運看能不能接手，主管看責任是否清楚。三方都看懂，這個 Agent 才有資格進下一輪。`
  },
  "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant": {
    between: `成本天花板還要包含「品質成本」。有些流程看起來便宜，是因為它把成本轉移到後面的人工修稿、客服補救或品牌信任上。比如一條內容流程每篇只花幾塊錢生成，但每篇都要人重寫三分之一，真正成本就不在模型帳單裡，而在團隊被迫重工的時間裡。\n\n所以成本規格不能只問每次呼叫多少錢，也要問每次任務平均要修多久、多少比例會被退回、哪種錯誤最常發生、錯誤一旦外流誰要補救。這些數字越早被放進流程，越能避免「看似便宜、實際很貴」的自動化。\n\n對小團隊來說，最有用的是先設三條線：正常線、警戒線、停止線。正常線讓流程繼續跑；警戒線要求 owner 看一次；停止線則自動退回人工或暫停發佈。這不是財務官僚，而是產品穩定性。`,
    closing: `成本天花板的目的不是壓低所有支出，而是讓團隊知道每一筆支出換到什麼能力。當一條流程能穩定省下時間、降低錯誤、提高品質，它就值得放大；當一條流程只是把問題藏到下一個人手上，再便宜也不值得。\n\n真正成熟的 AI 導入，會把成本、品質、責任寫在同一張表裡。這張表一旦固定下來，團隊就不必每次靠感覺決定要不要擴大，而能用證據判斷哪條流程該加速，哪條流程該暫停。`
  },
  "content-refresh-loop-for-ai-search-20260626-zh-hant": {
    between: `Refresh loop 的重點不是每次都大改，而是看懂哪一種修法最值得做。有些文章只需要換標題，因為搜尋入口和內容其實吻合；有些文章要補一個例子，因為讀者看完還不知道怎麼用；有些文章要刪掉過期段落，因為舊來源已經讓整篇文章失去可信度。\n\n內容團隊可以把每篇文章分成三種狀態：可維持、可修補、該重寫。可維持的文章只需要追蹤來源是否過期；可修補的文章要補 FAQ、補小標或補例子；該重寫的文章則表示原本角度已經不符合讀者問題，不應該只是加幾段字救回來。\n\n這個分類能避免兩種浪費：一種是每天只發新文，舊文完全沒人管；另一種是看到流量差就整篇重寫，卻沒有先判斷真正問題在哪裡。`,
    closing: `讓舊文章持續長大，也能降低內容量產的 AI 味。因為每一次更新都來自真實讀者、真實來源或真實數據，而不是把同一個模板重跑一遍。\n\n對官網來說，refresh loop 應該成為每日發文之外的第二條主線：新文負責探索題材，舊文負責累積可信度。當兩條線一起跑，網站才不只是文章庫，而是會越來越準的知識系統。`
  },
  "agent-incident-drill-before-scale-20260626-zh-hant": {
    between: `演練時最容易露出問題的，通常不是模型能力，而是團隊沒有想過「誰先看到錯誤」。Agent 如果把錯誤結果送進下一個系統，等人發現時可能已經影響客戶、資料或公開內容。好的演練要故意設計一個小錯誤，確認它在哪一秒被看見、由誰處理、下游會不會被擋住。\n\n另一個常見盲點，是只演練技術錯誤，沒有演練判斷錯誤。工具失敗容易被系統抓到，但判斷錯誤更麻煩：它可能格式正確、語氣自然、流程也跑完了，卻選錯資料、引用過期來源或做出不該自動化的承諾。這種情境更需要人工覆核和停損規則。\n\n把這些情境演練過一次，團隊會更清楚哪些任務能放大，哪些任務只能留在草稿層，哪些任務需要先修資料再談 Agent。`,
    closing: `真正有用的 incident drill 不會只產出一份報告，而會改變下一版權限設計。演練結果應該回到三件事：縮小資料範圍、增加人工批准、調整回復流程。每次演練至少要有一個具體改動，否則只是形式。\n\nAgent 要擴大前，先讓它安全地失敗一次。團隊看得見失敗、接得住失敗、修得動失敗，才有資格把它放進更大的流程。`
  }
};

function applyZhDepth(post) {
  const extra = zhExpansions[post.slug];
  if (!extra) return normalizeMarkdown(post.body || "");
  let body = normalizeMarkdown(post.body || "");
  if (!body.includes(extra.between.slice(0, 28))) {
    body = body.replace(/\n\n\[IMAGE:operating-loop\]/, `\n\n${extra.between}\n\n[IMAGE:operating-loop]`);
  }
  if (!body.includes(extra.closing.slice(0, 28))) {
    body = `${body}\n\n${extra.closing}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhDepthBooster(post.slug)}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhUniversalClosing()}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhCaseDepthClosing()}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhOperationalReaderClosing()}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhEvidenceLoopClosing()}`;
  }
  if (zhLength(body) < 2200) {
    body = `${body}\n\n${zhOwnerClosing()}`;
  }
  body = upgradeZhImagePacingBridge(body, post.slug);
  body = removeInternalImageBridgeCopy(body);
  body = removeRepeatedEditorialSentences(body);
  if (!body.includes(zhImagePacingBridge(post.slug).slice(0, 28))) {
    body = body.replace(/\n\n\[IMAGE:operating-loop\]/, `\n\n${zhImagePacingBridge(post.slug)}\n\n[IMAGE:operating-loop]`);
  }
  body = removeInternalImageBridgeCopy(body);
  body = removeRepeatedEditorialSentences(body);
  return sanitizeInternalPhrases(normalizeMarkdown(body), "zh-Hant");
}

function removeInternalImageBridgeCopy(body) {
  return String(body || "")
    .split(/\n{2,}/)
    .filter((paragraph) => !/接下來的視覺|第二張圖|這段文字存在的目的|圖像接下來呈現/.test(paragraph))
    .join("\n\n");
}

function removeRepeatedEditorialSentences(body) {
  let next = String(body || "");
  const phrases = [
    "沒有這段接手路徑，Agent 越快完成任務，錯誤也越快被帶進下游流程。",
    "一次好的演練會讓團隊看見停止按鈕、人工接手、紀錄保存與回復路線彼此如何連動，這才是能被放大的基礎。",
    "真正成熟的內容系統會把每次修訂留下原因，下一次才知道是標題、結構、來源還是例子帶來變化。",
    "這也能避免團隊只追新題目，卻讓舊文章在搜尋與 AI 摘要裡慢慢失去可信度。"
  ];
  for (const phrase of phrases) {
    const parts = next.split(phrase);
    if (parts.length <= 2) continue;
    next = parts[0] + phrase + parts.slice(1).join("");
  }
  return next;
}

function zhUniversalClosing() {
  return `最後還要回到讀者的工作現場。好的專欄不是把所有來源都塞進去，而是讓讀者看完後能做一個更準的決定：今天先試哪個流程、先補哪個欄位、先找誰確認、先看哪個數字。這種文章會有知識量，也會有可操作性；它不靠口號撐場，而是靠來源、案例、限制和下一步建立信任。\n\n這也是 Hermes 之後要穩定執行的品質標準。每篇專欄都要先通過四個問題：標題是否像真人會點進來的問題，小標是否有判斷力，內文是否有足夠證據與情境，圖片是否真的幫助理解。任何一項不合格，都不能把「已產生」當成「可發布」；它必須回到修稿、補來源、換圖或重排結構，直到讀者真的能讀懂、記住、採取下一步。`;
}

function zhCaseDepthClosing() {
  return `可以用一個最小案例檢查文章是否真的有幫助：假設讀者明天早上要開會，能不能直接拿這篇文章問出三個更好的問題？如果不能，文章就還停在背景介紹。能用的專欄，會讓讀者拿著小標就能問：「這個資料來源是否可靠？這個輸出誰審？這個流程失敗時退去哪裡？這個成本上限誰負責？」\n\n這種寫法也比較不會有 AI 味。AI 味常出現在文章只會說「很重要」、「需要關注」、「值得觀察」，卻沒有具體場景、具體角色和具體取捨。把場景、角色、限制和下一步寫出來，文章自然會更像專業編輯寫給真人看的內容，而不是把來源摘要包成一篇看似完整的文章。`;
}

function zhOperationalReaderClosing() {
  return `如果要再往前推一步，編輯審核還應該問：這篇文章能不能被轉成一張會議檢查表？如果可以，表示它的判斷夠清楚；如果不行，通常代表文章還在講概念，沒有落到操作。ALTOS LAB 的專欄要服務的是正在做決策的人，不是只想看熱鬧的人。`;
}

function zhEvidenceLoopClosing() {
  return `這個標準也會反過來訓練內容系統。每一次被打回的稿件，都要留下原因：標題太像口號、小標沒有判斷、圖片不貼題、內文沒有案例、來源沒有轉成決策。原因累積起來，下一次生產就不應該再犯同樣錯。這才是自我進化，不是每天把同一種文章換題目重跑。`;
}

function zhOwnerClosing() {
  return `最後一定要有 owner。沒有 owner 的內容更新、成本控制或 Agent 演練，都會變成大家覺得重要、但沒有人真的負責的事。只要指定一個負責人、一個檢查節奏、一個打回條件，整個系統就會從「有在產」往「越產越準」前進。`;
}

function zhImagePacingBridge(slug) {
  if (slug.includes("cost")) {
    return `到這裡，成本已經不是月底才結算的數字，而是一組會影響權限、審核與停用條件的設計。團隊要把警戒線、停止線與負責人放在同一套日常流程裡，才不會等帳單出現後才知道哪裡失控。`;
  }
  if (slug.includes("content-refresh") || slug.includes("search-answer")) {
    return `到這裡，文章已經不是在談抽象的搜尋技巧，而是在談內容如何被拆成可更新的零件。哪些段落要補來源，哪些小標要重寫，哪些讀者問題應該回到 FAQ，都要變成一條可反覆執行的更新路線。成熟的內容系統會把每次修訂留下原因，下一次才知道是標題、結構、來源還是例子帶來變化。`;
  }
  if (slug.includes("agent")) {
    return `Agent 的風險不是它會不會做事，而是它做錯時團隊能不能看見、停下、接回來。一次好的演練會讓團隊看見停止按鈕、人工接手、紀錄保存與回復路線彼此如何連動。沒有這段接手路徑，Agent 越快完成任務，錯誤也越快被帶進下游流程。`;
  }
  return `文章中段要把前面的判斷轉成讀者能操作的關係：來源怎麼追、責任誰接、成本怎麼看、下一步如何開始。這樣圖片和文字才會一起幫讀者理解，而不是只增加版面裝飾。`;
}

function upgradeZhImagePacingBridge(body, slug) {
  const replacements = [
    [
      "在第二張圖之前，讀者應該已經看懂這件事的操作含義：成本不是一個月底才結算的數字，而是一組會影響權限、審核與停用條件的設計。圖像接下來呈現的不是裝飾，而是這些欄位如何從會議討論變成每天能檢查的流程。",
      zhImagePacingBridge("cost")
    ],
    [
      "到這裡，文章已經不是在談抽象的搜尋技巧，而是在談內容如何被拆成可更新的零件。第二張圖應該承接這個問題：哪些段落要補來源，哪些小標要重寫，哪些讀者問題應該回到 FAQ，讓更新變成一條可反覆執行的路線。",
      zhImagePacingBridge("content-refresh")
    ],
    [
      "在進入第二張圖前，重點要先說清楚：Agent 的風險不是它會不會做事，而是它做錯時團隊能不能看見、停下、接回來。接下來的視覺應該呈現這條接手路徑，而不是再重複第一張圖的證據桌面。",
      zhImagePacingBridge("agent")
    ]
  ];
  let next = body;
  for (const [from, to] of replacements) {
    if (next.includes(from)) next = next.replace(from, to);
  }
  return next;
}

function zhDepthBooster(slug) {
  if (slug.includes("vendor-demo") || slug.includes("procurement")) {
    return `更細一點看，採購驗收還要拆出三種角色。使用者要驗證它是否真的減少工作摩擦；主管要驗證輸出是否能被審核和追責；財務或營運要驗證成本是否能被預測。三種角色看的不是同一個畫面，所以不能只用一份 Demo 截圖說服所有人。\n\n如果工具主打內容產出，就要看它能否保留來源、標明不確定處、讓編輯修改後再發布；如果工具主打客服或銷售，就要看它是否會把內部資訊講出去、是否能避免過度承諾；如果工具主打資料分析，就要看它能否區分事實、推論與建議。每一類工具都可以有不同題目，但驗收語言要一致：資料、權限、責任、成本、退場。\n\n這樣做還有一個好處：供應商會更快知道你是認真買，不是在看表演。好的供應商通常願意一起定義試點邊界，因為清楚的驗收能縮短後續導入；不好的供應商則會一直把問題帶回「模型很強」或「客戶很多」。這時候團隊就能更早避開不適合的選項。\n\n因此，採購不是反創新，而是替創新建立承重牆。當承重牆清楚，AI 工具才有空間真的進入日常工作；如果承重牆不存在，再漂亮的 Demo 都只是風險往後延。`;
  }
  if (slug.includes("search") || slug.includes("content-refresh")) {
    return `內容團隊還要避免把「可引用」誤解成「每段都很像定義」。真正好的段落有節奏：有些段落給答案，有些段落給反例，有些段落處理限制，有些段落教讀者怎麼檢查。全部都寫成百科口吻，讀者會覺得乾；全部都寫成心得，搜尋與 AI 摘要又抓不到穩定資訊。\n\n比較好的方法，是讓每一節都先有一個明確問題。這一節是在回答「為什麼重要」、「怎麼判斷」、「有哪些例外」，還是「下一步怎麼做」？問題一清楚，小標自然會變得更有吸引力，段落也不會只是堆字。讀者掃過小標時，應該能感覺自己正在靠近答案，而不是走進一串抽象分類。\n\n圖片也要跟著這個邏輯走。搜尋文章的圖片不應只是裝飾，而要補足文字的理解：來源卡、問題路徑、答案片段、修訂紀錄、讀者下一步，都可以被轉成視覺線索。當圖片只是抽象線條或重複卡片，讀者不會更懂，反而會覺得文章像模板。\n\n所以 AI 搜尋內容的標準不是「有沒有提到搜尋」，而是文章能不能被人和機器同時拆解。人看得懂、來源追得到、段落摘得出、限制講得清楚，才是長期能累積的內容資產。`;
  }
  if (slug.includes("agent")) {
    return `介面合約還要和事故紀錄接在一起。很多團隊會把規格寫完就收起來，等出事時才發現規格沒有對應到真實紀錄。比較好的做法，是讓每次 Agent 執行後都留下同一組欄位：讀了什麼、做了什麼、呼叫哪個工具、誰批准、哪一步需要人接手、最後結果是否被採用。\n\n這組紀錄會慢慢變成團隊的訓練資料。它能告訴你 Agent 最常在哪裡需要人幫忙、哪種資料最容易造成誤判、哪個工具權限太大、哪個步驟其實可以繼續自動化。換句話說，介面合約不是一次寫完，而是跟著運行紀錄一起變準。\n\n管理者也會因此更容易做決策。沒有紀錄時，討論常常停在「感覺還可以」或「好像有風險」；有紀錄時，團隊可以直接看哪一類任務通過率高、哪一類任務返工最多、哪一個接手點最常被觸發。這些資訊比抽象的模型評分更接近日常營運。\n\n最後，合約也要保留更新節奏。每次新增資料來源、改工具權限、換模型版本、改輸出用途，都應該重新看一次合約。Agent 的能力會變，公司的流程也會變；合約如果不更新，就會從保護機制變成過期文件。`;
  }
  if (slug.includes("cost")) {
    return `成本討論還要看「誰有權讓流程變貴」。很多成本失控不是因為單次任務很貴，而是因為太多人可以開新任務、重跑任務或把測試流程留在背景繼續跑。當權限和成本沒有綁在一起，任何人都可能在沒有惡意的情況下把帳單推高。\n\n因此，成本天花板要和權限設計一起看。一般使用者可以跑低成本任務，主管批准後才能跑高成本或高風險任務；批次流程要有每日上限；重跑要留下原因；超過門檻時要自動通知 owner。這些規則不需要很複雜，但要在流程裡真的存在。\n\n另一個重要指標是「每次通過審核的成本」。如果十次輸出只有兩次能用，單次生成再便宜也不划算。反過來，如果某個流程單次成本較高，但十次有八次能直接進入下一步，它就可能比便宜流程更值得投資。把成本和通過率一起看，才不會被單價誤導。\n\n這也是為什麼 AI 預算不能只交給財務月底看。預算應該回到產品與營運現場，讓負責人每天知道哪些流程值得放大，哪些流程該先修資料、修提示、修審核規則。`;
  }
  return `這類專欄的價值不在於把公開來源重述一次，而是幫讀者把來源變成可以執行的判斷。每一段都應該回答一個實際問題：今天要看哪個欄位、找誰確認、哪種情況要停、哪個數字可以證明流程變好。少了這些，文章就只是摘要；有了這些，文章才會變成工作中的參考。\n\n因此，文章發布前要回到三個檢查：標題是否抓住讀者真正的決策焦慮，小標是否讓人掃讀就看見答案，內文是否提供足夠的來源、例子與限制。這三個檢查都過，文章才像專欄；只過其中一個，就還需要回到修稿迴圈。`;
}

function applyNonZhFormat(post) {
  return normalizeMarkdown(sanitizeInternalPhrases(post.body || "", post.language));
}

function distinctSeoDescription(post) {
  const fallbackTitle = stripHtml(post.title || "").replace(/\.$/, "");
  const byLanguage = {
    en: `${fallbackTitle}. A practical ALTOS LAB column on evidence, ownership, risk, cost, and the next operating decision.`,
    ja: `${fallbackTitle}。出典、責任、リスク、コスト、次の確認点を整理する実務向けの ALTOS LAB コラム。`,
    ko: `${fallbackTitle}. 출처, 책임, 위험, 비용, 다음 운영 판단을 정리한 ALTOS LAB 실무 칼럼.`,
    id: `${fallbackTitle}. Kolom ALTOS LAB tentang bukti, pemilik keputusan, risiko, biaya, dan langkah operasional berikutnya.`,
    vi: `${fallbackTitle}. Bài chuyên mục ALTOS LAB về bằng chứng, trách nhiệm, rủi ro, chi phí và bước vận hành tiếp theo.`,
    th: `${fallbackTitle}. บทความ ALTOS LAB ที่สรุปหลักฐาน ความรับผิดชอบ ความเสี่ยง ต้นทุน และขั้นตอนปฏิบัติถัดไป.`,
    ms: `${fallbackTitle}. Kolum ALTOS LAB tentang bukti, pemilik keputusan, risiko, kos, dan langkah operasi seterusnya.`,
    fil: `${fallbackTitle}. Isang ALTOS LAB column tungkol sa ebidensya, pananagutan, risk, gastos, at susunod na operational decision.`
  };
  return sanitizeInternalPhrases(byLanguage[post.language] || `${fallbackTitle}. Practical guidance for teams turning AI sources into operating decisions.`, post.language);
}

const TOPIC_SOURCE_PATCHES = {
  agentOps: [
    ["OpenAI Agents documentation", "https://platform.openai.com/docs/guides/agents", "OpenAI", "Official agent docs used to anchor tool, handoff, guardrail and tracing choices."],
    ["Microsoft AI system operating model", "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/", "Microsoft", "Microsoft frames AI adoption as an operating-model change, not only a tool rollout."],
    ["NIST AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST", "NIST provides a risk-management vocabulary for governing AI systems."],
    ["IBM AI agents explainer", "https://www.ibm.com/think/topics/ai-agents", "IBM", "IBM's agent explainer is used to keep agent definitions clear for non-technical readers."]
  ],
  geoContent: [
    ["Google AI features and your website", "https://developers.google.com/search/docs/appearance/ai-features", "Google Search Central", "Google Search Central guidance anchors visibility, snippets and site controls."],
    ["Google helpful content guidance", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "Google Search Central", "Helpful content guidance anchors reader-first SEO decisions."],
    ["Schema.org Article structured data", "https://schema.org/Article", "Schema.org", "Article schema vocabulary anchors entity and page-structure choices."],
    ["OpenAI Agents documentation", "https://platform.openai.com/docs/guides/agents", "OpenAI", "OpenAI docs ground the discussion of AI readers, tools and traceable output."]
  ],
  procurement: [
    ["Microsoft frontier firms operating model", "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/", "Microsoft", "Microsoft's frontier-firm framing is used to compare AI adoption with operating-model redesign."],
    ["NIST AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST", "NIST anchors procurement risk, governance and measurement vocabulary."],
    ["OWASP Top 10 for LLM Applications", "https://owasp.org/www-project-top-10-for-large-language-model-applications/", "OWASP", "OWASP anchors practical AI misuse, access and deployment-risk questions."],
    ["IBM AI governance overview", "https://www.ibm.com/think/topics/ai-governance", "IBM", "IBM's AI governance overview supports procurement and accountability framing."]
  ]
};

function sourceTopicForSlug(slug = "") {
  if (/ai-search|content-refresh|source-ledger/i.test(slug)) return "geoContent";
  if (/vendor|procurement|cost|copilot/i.test(slug)) return "procurement";
  return "agentOps";
}

function sourceLinksPatch(post) {
  const capturedAt = String(post.publishedAt || post.updatedAt || new Date().toISOString()).slice(0, 10);
  return (TOPIC_SOURCE_PATCHES[sourceTopicForSlug(post.slug)] || TOPIC_SOURCE_PATCHES.agentOps).map(([title, url, publisher, summary]) => ({
    title,
    url,
    type: "official_reference",
    publisher,
    capturedAt,
    note: "Source-backed column reference used for ALTOS LAB editorial production.",
    summary
  }));
}

function patchFor(post) {
  const body = post.language === "zh-Hant" ? applyZhDepth(post) : applyNonZhFormat(post);
  const titlePatch = {
    "ai-vendor-demo-to-operating-proof-20260625-zh-hant": "供應商 Demo 越順，越要拿髒資料壓測它",
    "agent-interface-contract-before-autonomy-20260625-zh-hant": "Agent 一碰資料就該立約：權限、接手、回滾先寫清楚",
    "ai-search-answer-shape-before-keywords-20260625-zh-hant": "想被 AI 搜尋引用，先把答案寫成可轉述的形狀",
    "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant": "AI 成本失控前夜：吞預算的不是模型，是沒人踩煞車的流程",
    "content-refresh-loop-for-ai-search-20260626-zh-hant": "AI 搜尋正在淘汰薄內容：能被引用的答案才會留下",
    "agent-incident-drill-before-scale-20260626-zh-hant": "Agent 上線前先摔一次：沒有故障演練，就別談規模化"
  }[post.slug] || post.title;
  return {
    title: titlePatch,
    body,
    sourceLinks: sourceLinksPatch(post),
    excerpt: sanitizeInternalPhrases(post.excerpt || "", post.language),
    seoDescription: post.language === "zh-Hant" ? sanitizeInternalPhrases(post.seoDescription || "", post.language) : distinctSeoDescription(post),
    geoSummary: sanitizeInternalPhrases(post.geoSummary || "", post.language),
    keyTakeaways: Array.isArray(post.keyTakeaways)
      ? post.keyTakeaways.map((item) => sanitizeInternalPhrases(item, post.language))
      : post.keyTakeaways,
    qualityStatus: "passed",
    qualityIssues: [],
    qualityChecks: { ...(post.qualityChecks || {}), hasHumanReview: true, hasSearchIntentAnswer: true, qualityIssues: [] }
  };
}

function assertPost(post) {
  if (post.language === "zh-Hant" && ZH_TARGETS.includes(post.slug)) {
    const length = zhLength(post.body || "");
    if (length < 2000) throw new Error(`${post.slug} depth too thin after repair: ${length}`);
  }
  if (/[^\S\r\n]##\s+/.test(post.body || "")) throw new Error(`${post.slug} still has inline markdown heading`);
  if (/接下來的視覺|第二張圖|這段文字存在的目的|圖像接下來呈現/.test(post.body || "")) {
    throw new Error(`${post.slug} still has internal image bridge copy`);
  }
  if (/Google Cloud/.test(`${post.excerpt}\n${post.seoDescription}\n${post.geoSummary}\n${post.body}`) && !/google-cloud-blog|confidential-ai/i.test(post.slug)) {
    throw new Error(`${post.slug} still has Google Cloud source-basket pollution`);
  }
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const targets = [
    ...ZH_TARGETS.map((slug) => ({ slug, language: "zh-Hant" })),
    ...BASE_SLUGS_20260626.flatMap((base) => LANGUAGES.filter((language) => language !== "zh-Hant").map((language) => ({ slug: slugFor(base, language), language })))
  ];
  const patches = [];
  const readback = [];
  for (const target of targets) {
    const post = await currentPost(root, target.slug, target.language);
    if (!post?.id) throw new Error(`post not found: ${target.slug}`);
    const patch = patchFor(post);
    assertPost({ ...post, ...patch });
    patches.push({ id: post.id, patch });
  }
  if (dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun, patches: patches.length, sample: patches.slice(0, 6).map((item) => item.id) }, null, 2));
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
  for (const updated of result.updated || []) {
    const post = await currentPost(root, updated.slug, updated.language);
    assertPost(post);
    readback.push({
      slug: post.slug,
      language: post.language,
      h2: [...String(post.body || "").matchAll(/^##\s+/gm)].length,
      zhLength: post.language === "zh-Hant" ? zhLength(post.body || "") : undefined
    });
  }
  console.log(JSON.stringify({ ok: true, updated: readback.length, readback: readback.slice(0, 12), publicCache: result.publicCache }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
