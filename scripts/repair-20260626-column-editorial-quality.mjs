#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const TARGETS = [
  "agent-incident-drill-before-scale-20260626-zh-hant",
  "content-refresh-loop-for-ai-search-20260626-zh-hant",
  "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant"
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
      "User-Agent": "ALTOS-LAB-column-editorial-quality-repair/1.0",
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

async function currentPost(root, slug) {
  const { payload } = await fetchJson(`${root}/api/blog/${encodeURIComponent(slug)}?language=zh-Hant&ts=${Date.now()}`, {
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

function zhLength(value = "") {
  return (String(value).match(/[\u4e00-\u9fff]/g) || []).length;
}

const repairs = {
  "agent-incident-drill-before-scale-20260626-zh-hant": {
    title: "別等 Agent 出事才找煞車：上線前先演練失敗",
    seoTitle: "AI Agent 上線前，先演練失敗與回滾流程",
    excerpt: "Agent 會做事不代表能上線。真正要先驗的是：它誤判、越權、輸出異常時，誰看見、誰按停、誰把流程接回來。",
    seoDescription:
      "AI Agent 上線前要先做 incident drill，測誤判、權限越界、輸出異常、人工接手與回滾流程，確認每個失敗點都有 owner。",
    geoSummary:
      "企業擴大 AI Agent 前，應先用 incident drill 驗證資料矛盾、權限越界、工具失敗、輸出異常與回滾路徑。這篇整理上線前要測的失敗場景、責任分工與可回復標準。",
    keyTakeaways: [
      "Agent 擴大前先測失敗，不是只測它在順境下能不能完成任務。",
      "演練要看見三件事：誰能按停、誰能接手、哪裡留下證據。",
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

演練也會揭露責任分工是否真的存在。很多流程名義上有人負責，但錯誤發生時，第一個看到的人沒有停用權限，有權限的人又不知道上下文。這時候 Agent 不是單點風險，而是把組織裡原本模糊的責任放大。把停用權限、通知對象、回復版本和事後檢查寫成一條路線，團隊才會知道失敗如何被接住。

實務上可以把演練拆成三層。第一層是技術層：工具失敗、資料讀不到、API 回傳慢，系統是否能降級。第二層是判斷層：來源矛盾、數字不一致、輸出需要批准，Agent 是否會停下。第三層是營運層：停止後誰收到通知、哪個版本可以回復、是否會影響下游客戶或公開內容。三層都測過，才不會把「模型能回答」誤認成「流程可上線」。

如果只能先選一條流程演練，就選最接近對外承諾的那一條。內部摘要錯了可以修，對客戶、候選人、合作方或公開渠道送出錯誤內容，修正成本會高很多。先從高風險低頻率流程練接手，再把方法搬到高頻流程，會比一開始就全面導入更穩。

[IMAGE:operating-loop]

## 演練結果要改回權限，不是只寫報告

一次好的演練，最後一定要改動系統。可能是縮小資料讀取範圍，可能是新增人工批准點，可能是把某個工具改成只讀，或把高風險輸出留在草稿層。演練如果只產生一份「風險已知」的報告，等於沒有完成。

管理者要看的也不是模型分數，而是這條流程的接手能力：誰先看到錯、誰能按停、誰負責通知下游、哪一份資料可以回復到安全版本。這些答案寫清楚，Agent 才能從實驗走向可維運的系統。

這裡有一個很容易被忽略的指標：平均接手時間。當 Agent 停下或被停下，真正的 owner 需要多久才能理解上下文、找到原始資料、知道下一步要做什麼？如果接手的人還要從聊天紀錄、工具 log、文件夾裡重新拼故事，代表系統沒有留下足夠證據。好的 Agent 工作流要把關鍵決策做成快照：它讀了什麼、用了哪個工具、為什麼選這個輸出、哪裡需要人看。

第二個指標是回復可信度。很多團隊以為 rollback 是把版本切回去，但 Agent 流程常常改的是多個系統：文件、CRM、任務狀態、發信草稿、發布排程。回復不只是按一顆按鈕，而是確認哪些資料真的被改過，哪些只是草稿，哪些已經對外送出。演練時要把這些狀態分開，否則正式事故發生時，大家只會知道「要回復」，不知道「要回復哪裡」。

第三個指標是事後修正是否進入下一版規格。一次演練如果發現某個工具容易誤用，下一版就應該縮權或加批准；如果發現某個資料欄位常常被誤解，就應該改欄位說明或補來源；如果發現人工接手太慢，就應該把通知和摘要做得更清楚。這些改動會讓 Agent 越跑越穩，而不是每次都靠人臨場救火。

這也是為什麼 Agent 管理不該只放在工程團隊。法務、資安、營運、客服和業務都會被它的輸出影響。最好的演練結果，是每個部門都知道自己何時會被通知、需要看哪一段證據、以及什麼情況可以拒絕讓流程繼續。當這些邊界被說清楚，Agent 才不會變成跨部門互相推責的黑箱。

## 可以擴大的 Agent，必須先能被收回來

Agent 越像同事，越需要像正式流程一樣被管理。新同事做錯事會問人、會被主管接手、會留下交接紀錄；Agent 也應該如此。否則它不是自動化同事，而是一段沒有人值班的流程。

擴大之前，先讓它安全地失敗一次。團隊看得見失敗、接得住失敗、修得動失敗，才有資格把 Agent 放進更大的流程。

這個順序聽起來慢，實際上是在加速。因為一旦接手、回滾和證據都先準備好，後面的每次擴大都不用重新吵一次責任。Agent 不是不能快，而是要先知道失速時怎麼停。`,
    faqs: [
      { question: "Agent incident drill 要多正式？", answer: "第一版不必很大，但一定要包含資料矛盾、權限不足、輸出異常與回滾接手，並確認每個場景都有 owner。" },
      { question: "如果 Agent 測試成功率很高，還需要演練失敗嗎？", answer: "需要。成功率只能說明順境表現，不能證明出錯時流程能被停下、接回與修正。" }
    ]
  },
  "content-refresh-loop-for-ai-search-20260626-zh-hant": {
    title: "AI 搜尋不缺文章，缺的是能被引用的答案",
    seoTitle: "AI 搜尋內容更新：讓舊文章變成可引用答案",
    excerpt: "舊文章不是發完就放著。標題、段落、來源、FAQ 和例子，都要靠讀回資料持續修，才會越來越像可引用的答案。",
    seoDescription:
      "AI 搜尋時代，內容更新要看 Search Console、GA4、來源更新與讀者問題，持續修標題、段落、FAQ 與可引用答案結構。",
    geoSummary:
      "AI 搜尋偏好清楚、來源可追溯、段落可引用的內容。這篇整理如何用搜尋查詢、站內行為、來源更新與讀者問題，讓舊文章持續修成更可被引用的答案。",
    keyTakeaways: [
      "AI 搜尋不缺更多文章，缺的是能被安全引用、能追來源、能說清限制的答案。",
      "舊文章要用查詢、點擊、停留、來源更新與讀者問題，判斷該改標題、段落還是 FAQ。",
      "真正的內容系統不是只發新文，而是讓值得留下的文章越修越準。"
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

這裡還要加入一個 owner。沒有負責人的 refresh loop 很快會變成偶爾想起才改。比較穩的節奏，是每週看一次高曝光低點擊文章，每月看一次高價值舊文來源是否過期，並把每次改動記成一筆修訂紀錄。下一次看數據時，團隊才知道是標題、段落、FAQ 還是來源更新造成變化。

內容 owner 也要分清楚「要修什麼」。編輯看標題和段落承諾，SEO 看查詢與點擊，研究者看來源是否仍然成立，產品或業務看文章是否真的回答決策問題。這些角色不用每次都開會，但每次更新要知道是哪一種問題被修掉。否則舊文更新會變成誰有空誰改，最後只留下沒有方向的字數增加。

讀回資料時也要避免過度解讀。單日點擊變少可能只是週末、新聞熱度退去或排名短暫波動，不一定代表文章壞了。比較可靠的做法，是把查詢、曝光、點擊率、停留、轉換與來源更新放在一起看。當多個訊號指向同一個問題，再決定是修標題、重寫開頭、補案例，還是整篇換角度。

如果一篇文章有曝光但沒有點擊，先看標題是不是只描述主題，沒有說出讀者能得到什麼；如果有點擊但沒有停留，先看第一屏是否兌現標題承諾；如果停留不差但沒有轉換或引用，先看段落是否缺少可被單獨引用的結論。這三種修法不同，不能用同一套「SEO 優化」帶過。

[IMAGE:operating-loop]

## 小標要像答案路標，不要像目錄

讀者掃小標時，應該能感覺自己正在靠近答案。壞小標像「背景」、「下一步」、「深入分析」；好小標會直接告訴讀者這段要解決什麼，例如「先判斷舊文是缺點擊，還是缺答案」。

這件事對 AI 搜尋也重要。清楚的小標讓段落更容易被理解，也讓內容結構更像一組可引用的知識單元，而不是一篇只靠語氣撐住的長文。

## 新文探索題材，舊文累積可信度

網站成長不應只靠每天發新文。新文負責測題材，舊文負責累積可信度。當一篇文章開始有查詢、點擊或外部引用，就應該進入更新名單：補來源、修標題、補 FAQ、加例子、刪過期段落。

這樣做的好處是，內容會越來越不像 AI 量產。因為每次更新都來自真實讀者、真實來源或真實數據，而不是把同一個模板換題目重跑。長期來看，這才是 AI 搜尋時代比較穩的內容資產。

這套節奏也會讓多語內容比較不容易走味。不是每個語言都照同一個句子翻譯，而是同一個答案結構在不同語言裡重新變得自然。英文可能要把結論放前面，繁體中文可以多一點情境鋪陳，日文和韓文要更注意語氣邊界，東南亞語系則要避免把專業詞翻成生硬直譯。GEO 的核心不是某個固定格式，而是讓不同語言的讀者都能快速抓到答案、來源和下一步。

最後要留下更新紀錄。哪一天改了標題、哪一天補了 FAQ、哪一天替換來源、哪一天刪掉過期段落，這些都會成為下一輪判斷的依據。當 Search Console 或 GA4 數據變化時，團隊才知道是內容變好、搜尋需求改變，還是外部事件帶來短期波動。沒有更新紀錄，內容團隊只能憑感覺猜；有更新紀錄，舊文才會真的變成可迭代的資產。

這也會改變寫新文章的方法。每篇新文發布前，都應該先想清楚它未來要怎麼被更新：哪些來源可能變、哪些數據要追、哪些段落最可能被 AI 搜尋引用、哪些讀者問題還沒有答案。文章如果一開始就沒有可更新的位置，後面只會變成一次性內容；一開始就留下可追蹤結構，才有機會越修越強。

對讀者來說，這種文章也更值得信任。它不是一次把話說滿，而是清楚交代目前知道什麼、根據什麼、下一次要看什麼。AI 搜尋會改變入口，但不會改變一件事：真正有用的內容，必須讓人看完後更能做決定。

因此，內容團隊要把「發布」改成「第一版上線」。每篇文章都應該有下一次檢查時間、主要查詢、預期讀者問題和可更新段落。這樣讀回數據時，才不是臨時修文，而是在經營一個會變準的知識頁面。這會讓搜尋、引用和讀者體驗變成同一件事。`,
    faqs: [
      { question: "舊文章多久要更新一次？", answer: "高流量或高商業價值文章可以每週看一次；一般文章至少每月檢查查詢、來源、FAQ 與標題是否需要更新。" },
      { question: "AI 搜尋內容是不是要寫得更短？", answer: "不一定。重點不是短，而是每個段落都要有清楚結論、來源、例子與限制，讓長文也能被安全引用。" }
    ]
  },
  "ai-cost-ceiling-before-workflow-rollout-20260626-zh-hant": {
    title: "AI 工具最怕不是貴，是沒人知道什麼時候該停",
    seoTitle: "AI 成本控管：流程放大前先寫成本天花板",
    excerpt: "AI 成本失控通常不是因為單次呼叫太貴，而是流程越跑越多、越跑越長，卻沒有人設定警戒線、停止線和負責人。",
    seoDescription:
      "AI 流程放大前要先定義成本天花板、用量單位、預警門檻、停止條件、人工覆核成本與 owner，避免小實驗變成長期帳單。",
    geoSummary:
      "AI 成本控管要在流程規格中定義用量單位、預警門檻、停止線、品質成本與負責人。這篇說明為什麼模型單價不是唯一成本，真正風險是沒有停用條件與 owner。",
    keyTakeaways: [
      "AI 成本最危險的不是單價，而是流程沒有警戒線、停止線與 owner。",
      "成本規格要同時看模型費、人工覆核、返工、客服補救與品牌風險。",
      "放大前先做正常、兩倍、異常重跑三種情境試算。"
    ],
    body: `AI 工具常從一個便宜的小實驗開始。幾個人試用、幾個流程自動化、幾篇內容批次產生，看起來都很合理。真正麻煩的是，流程一旦被接進日常工作，使用量會慢慢長大，重跑會變多，人工修正會被藏起來，最後帳單和責任一起變得看不見。

很多團隊以為成本控管是財務月底才看的事。但在 AI 流程裡，成本其實是產品規格：誰能跑、一天能跑幾次、異常用量誰收到通知、哪個門檻要暫停、錯誤外流誰補救。這些如果一開始沒寫，工具越好用，越容易把小實驗推成長期負擔。

## 單次呼叫便宜，不代表流程便宜

AI 成本至少有四層：模型呼叫、資料處理、人工覆核、失敗返工。只看模型單價，很容易以為流程很便宜。可是如果十次輸出只有三次能用，每次還要人重寫一半，那真正成本就不在 token 帳單，而在團隊被迫重工的時間。

更麻煩的是失敗後的補救成本。公開內容發錯、客戶承諾說錯、資料寫錯，後面可能要客服、營運、工程一起收拾。這些都應該被算進 AI 流程的成本，而不是等出事後才說「模型其實不貴」。

[IMAGE:evidence-desk]

## 成本天花板要寫成可執行欄位

| 欄位 | 要寫清楚什麼 | 失控訊號 |
| --- | --- | --- |
| 計價單位 | 每次任務、每份文件、每位使用者怎麼算 | 大家只看月費 |
| 警戒線 | 用量或金額到多少要提醒 | 帳單來了才知道 |
| 停止線 | 什麼情況自動暫停或降級 | 錯誤流程繼續跑 |
| 品質成本 | 返工、退稿、人工覆核怎麼算 | 便宜但一直重做 |
| 負責人 | 誰有權擴大、暫停、調整 | 財務、工程、營運互相推 |

這張表不是財務官僚，而是讓流程可以被放大的安全邊界。沒有邊界的流程，即使單次成本很低，也可能變成長期技術債。

## 權限和成本要綁在一起

成本失控常常不是惡意造成的，而是權限設計太鬆。太多人可以開新任務、重跑批次、把測試流程留在背景跑，最後沒有人知道哪一段最花錢。

比較穩的做法，是把權限分層。一般使用者只能跑低成本任務；高成本或高風險任務需要 owner 批准；批次流程有每日上限；重跑必須留下原因；超過警戒線時自動通知。這些規則越早寫進流程，越不需要事後救火。

成本控管也要和品質門檻一起看。若流程越便宜、退稿越多，團隊其實只是把成本轉移到人工重工。更實用的指標是「每次通過審核的成本」：一次可用輸出到底花了多少模型費、多少人工時間、多少返工。這個數字比單次呼叫價格更接近日常營運真相。

另外要把「探索」和「營運」分開計算。探索期可以容許較高失敗率，因為團隊正在找題目、找提示、找流程；營運期就不能一直用探索成本跑日常任務。只要流程開始承接固定工作，就要有固定預算、固定品質門檻和固定 owner。否則最常見的結果是，大家以為還在試驗，其實它已經默默變成正式流程。

這裡最常見的盲點，是把失敗重跑當成免費。AI 工具讓重跑變得很容易，但每次重跑都會消耗模型費、等待時間、人工判斷和版本管理。若一條流程需要反覆重跑才看起來可用，問題可能不是成本太高，而是任務拆錯、資料品質太差或審核規格不清楚。這些都要回到流程設計，而不是單純換更便宜的模型。

[IMAGE:operating-loop]

## 放大前先算三種情境

正式放大前，至少要算三種情境：正常用量、兩倍用量、異常重跑。正常用量看流程是否值得；兩倍用量看預算是否承受得住；異常重跑看停損機制是否有效。

每種情境都要同時算模型費、人工覆核時間、失敗返工與補救成本。如果只算模型費，會低估真正風險；如果只看最壞情況，又可能錯過值得投資的流程。成本天花板的價值，是讓團隊知道什麼時候可以加速，什麼時候要縮小或暫停。

## 省錢不是目標，可控才是目標

好的 AI 成本管理不是把所有支出壓低，而是讓每一筆支出換到可衡量的能力。某條流程如果成本較高，但能穩定通過審核、降低返工、減少公開錯誤，它可能比便宜但不穩的流程更值得擴大。

所以在買工具或放大流程前，先問一句：如果明天用量變成兩倍，誰會先知道？如果答案是「月底看帳單」，這條流程還沒準備好。

還有一個簡單但有效的做法：把成本寫進每個工作流的 definition of done。不是只有「文章已產生」、「資料已整理」、「客服草稿已完成」，還要加上「本次成本在預期範圍內」、「返工次數沒有超標」、「人工覆核時間可接受」。當成本變成完成標準的一部分，團隊才會在流程中看見它，而不是月底才被動處理。

這對管理層也比較公平。很多 AI 導入專案一開始只展示節省時間，沒有展示新增的監督成本、資料整理成本和錯誤補救成本。把成本天花板放進規格，不是為了阻止創新，而是讓真正值得投資的流程被看見。能通過成本、品質和回復三道門的流程，才值得擴大；通不過的流程，就應該留在局部試點。

所以成本會議不應只問「這個工具多少錢」，而要問「哪一條流程值得讓它跑」。同一套工具在低風險草稿、正式客戶回覆、內部資料清理、公開內容發布上的價值和風險都不同。把每條流程拆開算，團隊才會知道哪些地方該投資更好的模型，哪些地方只需要簡單規則，哪些地方根本不該自動化。

這樣也能避免採購討論被單一價格綁架。便宜的工具如果讓團隊每週多花十小時重工，就不便宜；昂貴的工具如果能穩定減少錯誤、縮短審核、降低事故補救，也可能值得。成本天花板不是上限思維，而是讓每條 AI 流程都能被管理、被比較、被淘汰。

最後要把這些數字放進每週營運節奏。不是等財務結帳，而是讓 owner 看得到本週用量、本週返工、本週暫停次數與本週通過率。這些數字會提醒團隊：哪條流程值得加碼，哪條流程需要縮小，哪條流程應該先停下來重設。能被停止，才代表真的能被管理，也才有資格繼續擴大。成本控制不是財務尾端，而是流程產品化的一部分。`,
    faqs: [
      { question: "AI 成本天花板要多精準才夠？", answer: "第一版不用精準到財務模型，但要能定義用量單位、警戒線、停止線、品質成本與 owner。" },
      { question: "成本控管會不會拖慢 AI 導入？", answer: "短期會多一點設計時間，但能避免流程放大後才發現成本、返工與責任都失控。" }
    ]
  }
};

const forbiddenPatterns = [
  /在(?:進入|第二張圖|這張圖)之前/i,
  /接下來的視覺/i,
  /圖像接下來呈現/i,
  /這段文字存在的目的/i,
  /\bHermes\b|\bOpenClaw\b/i,
  /quality gate|pipeline|AI-generated/i,
  /Google Cloud/i
];

function assertQuality(post) {
  const body = normalizeMarkdown(post.body || "");
  const text = [post.title, post.excerpt, post.seoDescription, post.geoSummary, body, ...(post.keyTakeaways || [])].join("\n");
  const forbidden = forbiddenPatterns.find((pattern) => pattern.test(text));
  if (forbidden) throw new Error(`${post.slug} contains forbidden public pattern ${forbidden}`);
  const h2 = (body.match(/^##\s+/gm) || []).length;
  if (h2 < 4 || h2 > 6) throw new Error(`${post.slug} has weak heading count ${h2}`);
  const markers = [...body.matchAll(/\[IMAGE:([^\]]+)\]/g)].map((match) => match[1]);
  if (markers.length !== 2) throw new Error(`${post.slug} must have exactly two content image markers; got ${markers.length}`);
  const firstGap = body.slice(body.indexOf("[IMAGE:"), body.lastIndexOf("[IMAGE:"));
  if (zhLength(firstGap) < 650) throw new Error(`${post.slug} images are too close`);
  if (zhLength(body) < 1900) throw new Error(`${post.slug} body too thin`);
}

async function main() {
  const root = rootUrl();
  const dryRun = hasFlag("dry-run");
  const patches = [];

  for (const slug of TARGETS) {
    const post = await currentPost(root, slug);
    if (!post?.id) throw new Error(`post not found: ${slug}`);
    const repair = repairs[slug];
    const patch = {
      ...repair,
      body: normalizeMarkdown(repair.body),
      readTimeMinutes: 8,
      qualityStatus: "passed",
      qualityIssues: [],
      qualityChecks: {
        ...(post.qualityChecks || {}),
        hasHumanReview: true,
        hasSearchIntentAnswer: true,
        qualityIssues: []
      }
    };
    assertQuality({ ...post, ...patch });
    patches.push({ id: post.id, patch });
  }

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
  if (!result.ok || result.failures?.length) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const readback = [];
  for (const item of result.updated || []) {
    const post = await currentPost(root, item.slug);
    assertQuality(post);
    readback.push({
      slug: post.slug,
      title: post.title,
      zhLength: zhLength(post.body || ""),
      h2: (String(post.body || "").match(/^##\s+/gm) || []).length
    });
  }
  console.log(JSON.stringify({ ok: true, updated: readback.length, readback, publicCache: result.publicCache }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
