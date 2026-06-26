import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let cachedToken = "";
let cachedTokenAt = 0;

const TARGET_LANGUAGES = {
  "zh-Hant": "zh-TW",
  ja: "ja",
  ko: "ko",
  id: "id",
  vi: "vi",
  th: "th",
  ms: "ms",
  fil: "tl"
};

const LOCAL_PROVIDER_ALIASES = new Set(["local", "deterministic", "source-faithful"]);
const HERMES_DETERMINISTIC_PROVIDER_ALIASES = new Set(["hermes-owner", "codex-gpt-5.4", "codex-gpt-5.4-subagent"]);
const GOOGLE_WEB_PROVIDER_ALIASES = new Set(["google-web", "google-gtx", "public-google"]);
const TRANSLATION_FETCH_TIMEOUT_MS = Math.max(
  2_000,
  Number.parseInt(process.env.BLOG_MARKET_TRANSLATION_FETCH_TIMEOUT_MS || "8000", 10) || 8_000
);

function localMarketFallbackAllowed(provider = "") {
  if (LOCAL_PROVIDER_ALIASES.has(provider)) return process.env.BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK === "1";
  if (HERMES_DETERMINISTIC_PROVIDER_ALIASES.has(provider)) {
    return process.env.BLOG_MARKET_HERMES_ALLOW_DETERMINISTIC_SOURCE_TRANSLATION === "1";
  }
  return process.env.BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK === "1";
}

function localMarketFallbackDisabledError(provider) {
  return new Error(
    `market translation provider "${provider}" requires BLOG_MARKET_ALLOW_LOCAL_TRANSLATION_FALLBACK=1; local fallback is disabled for production publishing`
  );
}

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanTranslatedText(value = "", language = "") {
  let text = decodeHtmlEntities(value)
    .replace(/[—–]/g, ",")
    .replace(/\bnot only\s+([^.!?;,]{8,160}),?\s+but also\s+/gi, "$1 and ")
    .replace(/\s+/g, " ")
    .trim();
  if (language === "zh-Hant") {
    text = text
      .replace(/優步/g, "Uber")
      .replace(/亞馬遜/g, "Amazon")
      .replace(/谷歌/g, "Google")
      .replace(/当今/g, "當今")
      .replace(/组织/g, "組織")
      .replace(/数据/g, "資料")
      .replace(/數據/g, "資料")
      .replace(/无处不在/g, "無所不在")
      .replace(/构建/g, "建構")
      .replace(/软件/g, "軟體")
      .replace(/协作/g, "協作")
      .replace(/批准/g, "核准")
      .replace(/创建/g, "建立")
      .replace(/执行/g, "執行")
      .replace(/后台/g, "背景")
      .replace(/擁抱臉部|擁抱臉|擁抱面孔|擁抱臉孔/g, "Hugging Face")
      .replace(/人工智慧/g, "AI")
      .replace(/法學碩士/g, "LLM")
      .replace(/AI\s*代理商/g, "AI agent")
      .replace(/代理\s*AI/g, "agentic AI")
      .replace(/代理程式/g, "AI agent")
      .replace(/代理邏輯/g, "Agent Logic")
      .replace(/人類代理(?:人)?(?:的)?(?:協作|合作)?模式/g, "人機協作模式")
      .replace(/人類代理(?:人)?協作/g, "人機協作")
      .replace(/人類與代理(?:人)?協作模式/g, "人機協作模式")
      .replace(/人類與代理(?:人)?協作/g, "人機協作")
      .replace(/人工代理(?:人)?協作/g, "人機協作")
      .replace(/後台/g, "背景")
      .replace(/視頻/g, "影片")
      .replace(/音頻/g, "音訊")
      .replace(/取得瞭/g, "已經有")
      .replace(/已經已經有/g, "已有")
      .replace(/有報道稱/g, "報導稱")
      .replace(/美國 Pickle 抄寫員 Simon Rich/g, "《An American Pickle》編劇 Simon Rich")
      .replace(/美國 Pickle/g, "An American Pickle")
      .replace(/關註/g, "關注")
      .replace(/聯合創始人/g, "共同創辦人")
      .replace(/首席執行官/g, "執行長")
      .replace(/華納兄弟的《Clockwork》/g, "Warner Bros. 旗下 Clockwork")
      .replace(/Netflix、A24、Focus Features 和 Warner Bros[。.]?/g, "Netflix、A24、Focus Features 與 Warner Bros. 旗下 Clockwork")
      .replace(/報導指出，?《Clockwork》都決定不再接手/g, "報導指出，Netflix、A24、Focus Features 與 Warner Bros. 旗下 Clockwork 都決定不再接手")
      .replace(/不再選擇([^，。]+)作為發行協議/g, "不再接手$1的發行")
      .replace(/進行發行交易/g, "洽談發行")
      .replace(/大型科技的批評故事/g, "大型科技公司的批評故事")
      .replace(/《人工》/g, "《Artificial》")
      .replace(/人工(?=的後期|還計劃|感覺|》)/g, "Artificial")
      .replace(/Amazon 米高梅/g, "Amazon MGM")
      .replace(/Amazon\s*米高梅/g, "Amazon MGM")
      .replace(/圖像到視訊/g, "影像轉影片")
      .replace(/圖像到視頻/g, "影像轉影片")
      .replace(/字元一致性/g, "角色一致性")
      .replace(/照片真實感/g, "寫實度")
      .replace(/準備好大吃特吃/g, "仍願意押注")
      .replace(/可以看到投資者已經仍願意押注/g, "代表投資者仍願意押注")
      .replace(/使客戶能夠/g, "讓客戶能夠")
      .replace(/總監：你/g, "Director：你")
      .replace(/作者：你正在製作作品，並根據需要調用 AI 來提供幫助/g, "Author：你自己產出成果，並在需要時讓 AI 協助")
      .replace(/編輯：您設定意圖/g, "Editor：你設定意圖")
      .replace(/調試/g, "除錯")
      .replace(/Google雲端/g, "Google Cloud")
      .replace(/Google Cloud/g, "Google Cloud")
      .replace(/Anthropic克勞德/g, "Anthropic Claude")
      .replace(/克勞德/g, "Claude")
      .replace(/200\s*美元/g, "2 億美元")
      .replace(/出於某種原因，?/g, "")
      .replace(/據報道，?/g, "報導指出，")
      .replace(/據\s*TechCrunch\s*報導[:：，]?/g, "TechCrunch 報導，")
      .replace(/TechCrunch\s*報導[:：]/g, "TechCrunch 報導，")
      .replace(/據報道，Uber此次裁員是在該公司鼓勵員工盡可能使用 AI 之後發生的。?/g, "報導指出，Uber 先前鼓勵員工盡可能使用 AI，隨後因相關支出超出預算而設定使用上限。")
      .replace(/報導指出，Uber\s*這次支出限制是在該公司鼓勵員工盡可能使用 AI 之後發生的。?/g, "報導指出，Uber 先前鼓勵員工盡可能使用 AI，隨後因相關支出超出預算而設定使用上限。")
      .replace(/Uber此次裁員/g, "Uber 這次支出限制")
      .replace(/此次裁員/g, "這次支出限制")
      .replace(/TechCrunch\s*通報[:：]/g, "TechCrunch 報導，")
      .replace(/TechCrunch\s*reported[:：]/gi, "TechCrunch 報導，")
      .replace(/資料來源包含以下具體數字[:：]/g, "文中提到的主要數字包括")
      .replace(/消息來源包含以下具體數字[:：]/g, "文中提到的主要數字包括")
      .replace(/存取權限/g, "使用權")
      .replace(/（在新視窗中開啟）/g, "")
      .replace(/\(在新視窗中開啟\)/g, "")
      .replace(/[,，]{2,}/g, "，")
      .replace(/資源佔用規模/g, "用量")
      .replace(/資源佔用量/g, "用量")
      .replace(/規模擴大/g, "用量擴大")
      .replace(/該協議涉及/g, "協議內容包括")
      .replace(/氛圍編碼/g, "vibe coding")
      .replace(/更能找到/g, "更容易找到")
      .replace(/根據新協議，它將是一個規模更大的項目。?/g, "新協議會讓 Lovable 在 Google Cloud 上的使用規模明顯擴大。")
      .replace(/報告指出[:：]\s*/g, "")
      .replace(/剛剛對\s*Google\s*的\s*AI\s*搜尋攻勢施加了法律限制。?/g, "這讓出版商在 AI Search 內容使用上取得新的選擇權。")
      .replace(/網站發布商/g, "網站出版商")
      .replace(/網站發布者/g, "網站出版商")
      .replace(/Google\s+和/g, "Google 與")
      .replace(/Lovable\s+和/g, "Lovable 與")
      .replace(/AI agent的/g, "AI agent 的")
      .replace(/AI 系統投入生產/g, "AI 系統進入正式環境")
      .replace(/保持其可靠運行/g, "維持可靠運作")
      .replace(/排除故障/g, "除錯")
      .replace(/部落格文章《Hugging Face》/g, "Hugging Face 部落格")
      .replace(/程式碼庫/g, "Codex")
      .replace(/您的/g, "使用者的")
      .replace(/向您展示/g, "向使用者展示")
      .replace(/向使用者的展示/g, "向使用者展示")
      .replace(/向使用者展示與使用者的搜尋查詢/g, "向使用者展示與搜尋查詢")
      .replace(/用戶/g, "使用者")
      .replace(/([A-Za-z0-9])(?=[\u4e00-\u9fff])/g, "$1 ")
      .replace(/([\u4e00-\u9fff])(?=[A-Za-z0-9])/g, "$1 ")
      .replace(/\s+([，。；：！？])/g, "$1")
      .replace(/。\s+/g, "。")
      .replace(/([（「])\s+/g, "$1")
      .replace(/\s+([）」])/g, "$1");
  }
  return text;
}

function cleanTranslatedTitle(value = "", language = "") {
  return cleanTranslatedText(value, language).replace(/[.。]\s*$/, "").trim();
}

function genericSourceSummary(value = "") {
  return /^A Blog post by .* on Hugging Face\b/i.test(String(value || "").trim());
}

function splitSourceBodyParagraphs(value = "") {
  const normalized = decodeHtmlEntities(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  const paragraphSplits = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 60);
  const sentenceSplits =
    normalized
      .match(/[^.!?]+[.!?]+(?:\s+|$)/g)
      ?.map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 60) || [];
  const groupedSentences = [];
  let currentGroup = "";
  for (const sentence of sentenceSplits) {
    const next = currentGroup ? `${currentGroup} ${sentence}` : sentence;
    if (next.length <= 420) {
      currentGroup = next;
      continue;
    }
    if (currentGroup) groupedSentences.push(currentGroup);
    currentGroup = sentence;
  }
  if (currentGroup) groupedSentences.push(currentGroup);
  const readableSentenceParagraphs = groupedSentences
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 120);
  const candidates = paragraphSplits.length === 1 && paragraphSplits[0].length >= 1200
    ? readableSentenceParagraphs.length
      ? readableSentenceParagraphs
      : sentenceSplits
    : paragraphSplits.length
    ? paragraphSplits
    : readableSentenceParagraphs.length
    ? readableSentenceParagraphs
    : sentenceSplits;
  const seen = new Set();
  return candidates
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => !/browser does not support the audio element|your browser does not support audio|audio element|latest posts|related research|research area methods and algorithms conference/i.test(paragraph))
    .filter((paragraph) => {
      const key = paragraph.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 14);
}

function cleanSourceFact(value = "") {
  return cleanTranslatedText(value, "en")
    .replace(/^We…\s*/i, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNewsText(value = "") {
  return decodeHtmlEntities(value)
    .replace(/\r\n/g, "\n")
    .replace(/[—–]/g, ",")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortPublisher(value = "") {
  return normalizeNewsText(value)
    .replace(/\s+AI$/i, "")
    .replace(/\s+News$/i, "")
    .trim() || "source";
}

function formatDate(value, language) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value || "");
  const locale = {
    "zh-Hant": "zh-TW",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    id: "id-ID",
    vi: "vi-VN",
    th: "th-TH",
    ms: "ms-MY",
    fil: "fil-PH"
  }[language] || "en-US";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function joinList(items = [], language = "en") {
  const clean = items.map((item) => normalizeNewsText(item)).filter(Boolean);
  if (!clean.length) return "";
  if (language === "zh-Hant" || language === "ja") return clean.join("、");
  if (language === "ko") return clean.join(", ");
  return clean.join(", ");
}

function localHeadline(language, publisher, title) {
  const cleanTitle = normalizeNewsText(title || "AI market update");
  return {
    "zh-Hant": `${publisher} 發布「${cleanTitle}」`,
    en: cleanTitle,
    ja: `${publisher} が「${cleanTitle}」を公開`,
    ko: `${publisher}가 "${cleanTitle}"를 공개`,
    id: `${publisher} merilis "${cleanTitle}"`,
    vi: `${publisher} công bố "${cleanTitle}"`,
    th: `${publisher} เผยแพร่ "${cleanTitle}"`,
    ms: `${publisher} menerbitkan "${cleanTitle}"`,
    fil: `Inilathala ng ${publisher} ang "${cleanTitle}"`
  }[language] || cleanTitle;
}

function localSourceNote(language, publisher, date, sourceUrl) {
  const hasSource = Boolean(sourceUrl);
  return {
    "zh-Hant": `${publisher} 的原文發布於 ${date}；${hasSource ? "來源連結可回查圖片出處、原始脈絡與後來更新。" : "仍需以原始發布資料核對圖片出處與事件脈絡。"}`,
    en: `${publisher}'s original report was published on ${date}; ${hasSource ? "the source link remains the reference for image attribution, original context, and later updates." : "the original material should remain the reference for image attribution and context."}`,
    ja: `${publisher} の原文は ${date} に公開されており、${hasSource ? "画像クレジット、原文脈、その後の更新は出典リンクで確認できます。" : "画像クレジットと文脈は原資料で確認する必要があります。"}`,
    ko: `${publisher}의 원문은 ${date}에 공개됐으며, ${hasSource ? "이미지 출처와 원래 맥락, 이후 업데이트는 출처 링크에서 확인할 수 있습니다." : "이미지 출처와 맥락은 원자료에서 확인해야 합니다."}`,
    id: `Laporan asli ${publisher} terbit pada ${date}; ${hasSource ? "tautan sumber tetap menjadi rujukan untuk atribusi gambar, konteks asli, dan pembaruan berikutnya." : "materi asli tetap menjadi rujukan untuk atribusi gambar dan konteks."}`,
    vi: `Bài gốc của ${publisher} được công bố ngày ${date}; ${hasSource ? "liên kết nguồn vẫn là điểm đối chiếu cho ghi nhận hình ảnh, bối cảnh gốc và cập nhật sau đó." : "tài liệu gốc vẫn là điểm đối chiếu cho ghi nhận hình ảnh và bối cảnh."}`,
    th: `รายงานต้นทางของ ${publisher} เผยแพร่เมื่อ ${date}; ${hasSource ? "ลิงก์แหล่งข่าวยังเป็นจุดอ้างอิงสำหรับเครดิตภาพ บริบทต้นฉบับ และอัปเดตภายหลัง" : "ควรอ้างอิงเอกสารต้นทางเมื่อตรวจเครดิตภาพและบริบท"}`,
    ms: `Laporan asal ${publisher} diterbitkan pada ${date}; ${hasSource ? "pautan sumber kekal sebagai rujukan untuk atribusi imej, konteks asal dan kemas kini selepas itu." : "bahan asal kekal sebagai rujukan untuk atribusi imej dan konteks."}`,
    fil: `Nalathala ang orihinal na ulat ng ${publisher} noong ${date}; ${hasSource ? "ang source link pa rin ang reference para sa image attribution, orihinal na konteksto, at mga susunod na update." : "ang orihinal na materyal pa rin ang reference para sa image attribution at konteksto."}`
  }[language];
}

function localFallbackTranslation(language, pack, texts) {
  const article = pack.sourceArticle || {};
  const source = pack.sourceLinks?.[0] || {};
  const publisher = shortPublisher(article.publisher || source.publisher || pack.coverCredit);
  const title = article.headline || source.title || pack.topic || texts[0] || "AI market update";
  const date = formatDate(article.publishedAt || source.publishedAt || new Date(), language);
  const summary = normalizeNewsText(article.standfirst || source.summary || texts[1] || title);
  const entities = Array.isArray(article.entities) ? article.entities.filter(Boolean).slice(0, 5) : [];
  const numbers = Array.isArray(article.numbers) ? article.numbers.filter(Boolean).slice(0, 5) : [];
  const sourceUrl = article.canonicalUrl || source.url || "";
  const entityText = joinList(entities, language);
  const numberText = joinList(numbers, language);
  const sourceNote = localSourceNote(language, publisher, date, sourceUrl);
  const headline = localHeadline(language, publisher, title);

  const standfirstByLanguage = {
    "zh-Hant": `${publisher} 報導「${title}」。本文保留來源中的功能、時間線與可核對數字，供企業讀者判斷後續影響。`,
    en: summary,
    ja: `${publisher} の最新報道は「${title}」を AI 産業の文脈で扱っています。見出しだけでなく、出典事実、時系列、確認できる数字を見る必要があります。`,
    ko: `${publisher}의 최신 보도는 "${title}"를 AI 산업 맥락에서 다룹니다. 제목보다 출처의 사실, 시간선, 확인 가능한 숫자가 중요합니다.`,
    id: `Laporan terbaru ${publisher} menempatkan "${title}" dalam konteks industri AI; yang penting adalah fakta sumber, timeline, dan angka yang bisa dicek.`,
    vi: `Bài viết mới của ${publisher} đặt "${title}" vào bối cảnh ngành AI; trọng tâm là dữ kiện nguồn, mốc thời gian và các con số có thể kiểm chứng.`,
    th: `รายงานล่าสุดของ ${publisher} วาง "${title}" ไว้ในบริบทอุตสาหกรรม AI จุดสำคัญคือข้อเท็จจริงจากแหล่งข่าว ไทม์ไลน์ และตัวเลขที่ตรวจสอบได้`,
    ms: `Laporan terbaru ${publisher} meletakkan "${title}" dalam konteks industri AI; yang penting ialah fakta sumber, garis masa dan angka yang boleh disemak.`,
    fil: `Inilagay ng pinakabagong ulat ng ${publisher} ang "${title}" sa konteksto ng AI industry; mas mahalaga ang source facts, timeline, at mga numerong puwedeng i-check.`
  };

  const evidenceByLanguage = {
    "zh-Hant": entityText || numberText ? `報導提到 ${entityText || "相關公司與平台"}${numberText ? `，並列出 ${numberText} 等具體數字` : ""}。` : `文章整理 ${publisher} 原文中可回查的公開資訊。`,
    en: summary,
    ja: entityText || numberText ? `記事では ${entityText || "関連企業とプラットフォーム"}${numberText ? ` に加え、${numberText} という数字` : ""} が示されています。` : `記事は ${publisher} の原文で確認できる公開情報に焦点を当てています。`,
    ko: entityText || numberText ? `보도에는 ${entityText || "관련 기업과 플랫폼"}${numberText ? `, 그리고 ${numberText}` : ""}가 언급됩니다.` : `이 글은 ${publisher} 원문에서 확인되는 공개 정보를 중심으로 합니다.`,
    id: entityText || numberText ? `Artikel ini menyebut ${entityText || "perusahaan dan platform terkait"}${numberText ? `, dengan angka seperti ${numberText}` : ""}.` : `Artikel ini berfokus pada informasi publik yang bisa dicek dari laporan ${publisher}.`,
    vi: entityText || numberText ? `Bài viết nhắc tới ${entityText || "các công ty và nền tảng liên quan"}${numberText ? `, cùng các con số như ${numberText}` : ""}.` : `Bài viết tập trung vào thông tin công khai có thể kiểm chứng từ nguồn ${publisher}.`,
    th: entityText || numberText ? `รายงานกล่าวถึง ${entityText || "บริษัทและแพลตฟอร์มที่เกี่ยวข้อง"}${numberText ? ` พร้อมตัวเลข ${numberText}` : ""}` : `บทความนี้โฟกัสข้อมูลสาธารณะที่ตรวจสอบได้จากรายงานของ ${publisher}`,
    ms: entityText || numberText ? `Artikel ini menyebut ${entityText || "syarikat dan platform berkaitan"}${numberText ? `, dengan angka seperti ${numberText}` : ""}.` : `Artikel ini tertumpu pada maklumat awam yang boleh disemak daripada laporan ${publisher}.`,
    fil: entityText || numberText ? `Binanggit sa ulat ang ${entityText || "kaugnay na kumpanya at platform"}${numberText ? `, kasama ang mga numerong ${numberText}` : ""}.` : `Nakatuon ang artikulo sa public information na maaaring i-check sa ulat ng ${publisher}.`
  };

  const sourceOnlyBoundaryByLanguage = {
    "zh-Hant": "這篇快訊只保留來源已寫出的事件、功能、時間、公司與數字；尚未由來源證明的採用速度、商業結果或後續影響，不在本文擴寫。",
    en: "This brief stays with the event, product details, dates, companies, and numbers stated by the source; adoption speed, business impact, and follow-up outcomes are not expanded beyond the source.",
    ja: "この速報は、出典に書かれた出来事、機能、時期、企業、数字に限定します。導入速度、事業影響、後続結果は出典を超えて広げません。",
    ko: "이 브리프는 출처가 쓴 사건, 기능, 시점, 기업, 숫자에 머뭅니다. 도입 속도, 사업 영향, 후속 결과는 출처 밖으로 확장하지 않습니다.",
    id: "Brief ini hanya mempertahankan peristiwa, detail produk, tanggal, perusahaan, dan angka yang ditulis sumber; kecepatan adopsi, dampak bisnis, dan hasil lanjutan tidak diperluas di luar sumber.",
    vi: "Bản tin này chỉ giữ lại sự kiện, chi tiết sản phẩm, thời điểm, công ty và số liệu mà nguồn đã nêu; tốc độ adoption, tác động kinh doanh và kết quả tiếp theo không được mở rộng ngoài nguồn.",
    th: "ข่าวสั้นนี้ยึดเฉพาะเหตุการณ์ รายละเอียดผลิตภัณฑ์ วันที่ บริษัท และตัวเลขที่แหล่งข่าวระบุไว้ ไม่ขยายความเรื่อง adoption speed ผลทางธุรกิจ หรือผลลัพธ์ต่อเนื่องนอกเหนือจากแหล่งข่าว",
    ms: "Brief ini hanya mengekalkan peristiwa, butiran produk, tarikh, syarikat dan angka yang dinyatakan sumber; kelajuan adopsi, impak perniagaan dan hasil susulan tidak diperluas melebihi sumber.",
    fil: "Nananatili ang brief na ito sa event, product details, petsa, kumpanya, at numerong nakasaad sa source; hindi nito palalawakin ang adoption speed, business impact, o follow-up outcomes lampas sa source."
  };

  return {
    headline,
    standfirst: cleanTranslatedText(standfirstByLanguage[language] || summary || headline, language),
    factBullets: [evidenceByLanguage[language], sourceNote, sourceOnlyBoundaryByLanguage[language]]
      .map((fact) => cleanTranslatedText(fact, language))
      .filter(Boolean),
    bodyParagraphs: [
      evidenceByLanguage[language],
      sourceNote,
      sourceOnlyBoundaryByLanguage[language]
    ]
      .map((paragraph) => cleanTranslatedText(paragraph, language))
      .filter(Boolean)
  };
}

function targetLanguageEntries(languages = []) {
  const requested = Array.isArray(languages) && languages.length ? new Set(languages) : null;
  return Object.entries(TARGET_LANGUAGES).filter(([language]) => !requested || requested.has(language));
}

function localizeSourcePackLocally(pack, texts, languages = []) {
  const localized = {
    en: {
      headline: cleanTranslatedTitle(texts[0], "en"),
      standfirst: cleanTranslatedText(texts[1], "en"),
      factBullets: texts.slice(2).map((fact) => cleanTranslatedText(fact, "en")).filter(Boolean).slice(0, 10),
      bodyParagraphs: splitSourceBodyParagraphs(pack.sourceArticle?.body || "").map((paragraph) => cleanTranslatedText(paragraph, "en"))
    }
  };
  for (const [language] of targetLanguageEntries(languages)) {
    localized[language] = localFallbackTranslation(language, pack, texts);
  }
  return localized;
}

async function gcloudAccessToken() {
  if (cachedToken && Date.now() - cachedTokenAt < 45 * 60 * 1000) return cachedToken;
  const attempts = [
    ["auth", "print-access-token"],
    ["auth", "application-default", "print-access-token"]
  ];
  const failures = [];
  for (const args of attempts) {
    try {
      const { stdout } = await execFileAsync("gcloud", args, { timeout: 12_000 });
      const token = stdout.trim();
      if (token) {
        cachedToken = token;
        cachedTokenAt = Date.now();
        return token;
      }
    } catch (error) {
      failures.push(`${args.join(" ")}: ${error?.message || error}`);
    }
  }
  throw new Error(`gcloud token fallback failed: ${failures.join(" | ")}`);
}

async function translateTexts(texts, { target, projectId }) {
  if (process.env.BLOG_MARKET_ENABLE_GCP_TRANSLATION !== "1") {
    throw new Error("GCP Cloud Translation is disabled for ALTOS LAB production; use BLOG_MARKET_TRANSLATION_PROVIDER=google-web, or explicitly opt in before using hermes-owner deterministic fallback");
  }
  if (!projectId) {
    throw new Error("GCP Cloud Translation requires an explicit projectId when BLOG_MARKET_ENABLE_GCP_TRANSLATION=1");
  }
  const token = await gcloudAccessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATION_FETCH_TIMEOUT_MS);
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": projectId
    },
    body: JSON.stringify({
      q: texts,
      source: "en",
      target,
      format: "text"
    })
  }).finally(() => clearTimeout(timer));
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `Cloud Translation failed with HTTP ${response.status}`);
  }
  const translated = json?.data?.translations || [];
  if (translated.length !== texts.length) throw new Error(`Cloud Translation returned ${translated.length}/${texts.length} translations`);
  return translated.map((item) => item.translatedText || "");
}

const GOOGLE_WEB_TRANSLATION_CHARS = Math.max(
  350,
  Number.parseInt(process.env.BLOG_MARKET_GOOGLE_WEB_CHUNK_CHARS || "850", 10) || 850
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTranslationText(value = "", limit = GOOGLE_WEB_TRANSLATION_CHARS) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return [text].filter(Boolean);
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+(?:\s+|$)|[^.!?。！？]+$/g)?.map((item) => item.trim()).filter(Boolean) || [text];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if (`${current} ${sentence}`.length <= limit) current = `${current} ${sentence}`;
    else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => {
    if (chunk.length <= limit) return [chunk];
    const parts = [];
    for (let index = 0; index < chunk.length; index += limit) parts.push(chunk.slice(index, index + limit));
    return parts;
  });
}

async function translateGoogleWebChunk(text, { target, attempt = 1 }) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSLATION_FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      Accept: "application/json,text/plain",
      "User-Agent": "ALTOS-LAB-market-translation/1.0"
    }
  }).finally(() => clearTimeout(timer));
  const raw = await response.text();
  if (!response.ok) {
    if (attempt < 3) {
      await sleep(250 * attempt);
      return translateGoogleWebChunk(text, { target, attempt: attempt + 1 });
    }
    throw new Error(`Google web translation failed with HTTP ${response.status}`);
  }
  const json = JSON.parse(raw);
  const value = Array.isArray(json?.[0]) ? json[0].map((item) => item?.[0] || "").join("") : "";
  if (!value) throw new Error("Google web translation returned an empty translation");
  return value;
}

async function translateTextsGoogleWeb(texts, { target }) {
  const translated = [];
  for (const text of texts) {
    const chunks = splitTranslationText(text);
    const parts = [];
    for (const chunk of chunks) {
      parts.push(await translateGoogleWebChunk(chunk, { target }));
      await sleep(80);
    }
    translated.push(parts.join(" "));
  }
  return translated;
}

export async function localizeSourcePack(pack, { projectId = "", required = true, languages = [] } = {}) {
  const provider = (process.env.BLOG_MARKET_TRANSLATION_PROVIDER || "google-web").trim().toLowerCase();
  if (provider === "off") {
    if (required) throw new Error("market translation provider is off");
    return {};
  }
  const gcpProject = projectId || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
  const article = pack.sourceArticle || {};
  const source = pack.sourceLinks?.[0] || {};
  const headline = article.headline || source.title || pack.topic || "";
  const factBullets = Array.isArray(article.factBullets)
    ? article.factBullets
        .map(cleanSourceFact)
        .filter((fact) => fact.length >= 35)
        .filter((fact, index, list) => list.findIndex((item) => item.toLowerCase() === fact.toLowerCase()) === index)
        .slice(0, 10)
    : [];
  const bodyParagraphs = splitSourceBodyParagraphs(article.body || "");
  const richSource = String(article.body || "").length >= 1800 || factBullets.length >= 8 || bodyParagraphs.length >= 4;
  const rawStandfirst = article.standfirst || source.summary || "";
  const standfirst = genericSourceSummary(rawStandfirst) ? factBullets[0] || headline : rawStandfirst;
  const texts = [headline, standfirst, ...factBullets, ...bodyParagraphs].map((text) => String(text || "").trim());
  if (!headline || !standfirst || factBullets.length < 2) {
    throw new Error("sourceArticle must include headline, standfirst and at least two fact bullets before localization");
  }
  const bodyOffset = 2 + factBullets.length;

  if (GOOGLE_WEB_PROVIDER_ALIASES.has(provider)) {
    const localized = {
      en: {
        headline: cleanTranslatedTitle(headline, "en"),
        standfirst: cleanTranslatedText(standfirst, "en"),
        factBullets: factBullets.map((fact) => cleanTranslatedText(fact, "en")),
        bodyParagraphs: bodyParagraphs.map((paragraph) => cleanTranslatedText(paragraph, "en"))
      }
    };
    for (const [language, target] of targetLanguageEntries(languages)) {
      const result = await translateTextsGoogleWeb(texts, { target });
      localized[language] = {
        headline: cleanTranslatedTitle(result[0], language),
        standfirst: cleanTranslatedText(result[1], language),
        factBullets: result.slice(2, bodyOffset).map((fact) => cleanTranslatedText(fact, language)).filter(Boolean),
        bodyParagraphs: result.slice(bodyOffset).map((paragraph) => cleanTranslatedText(paragraph, language)).filter(Boolean)
      };
    }
    return localized;
  }

  if (LOCAL_PROVIDER_ALIASES.has(provider) || HERMES_DETERMINISTIC_PROVIDER_ALIASES.has(provider)) {
    if (richSource && process.env.BLOG_MARKET_ALLOW_RICH_LOCAL_TRANSLATION_FALLBACK !== "1") {
      throw new Error("rich source market news requires a real translation provider; deterministic fallback would compress source detail and drift from the original article");
    }
    if (!localMarketFallbackAllowed(provider)) throw localMarketFallbackDisabledError(provider);
    return localizeSourcePackLocally(pack, texts, languages);
  }

  const localized = {
    en: {
      headline: cleanTranslatedTitle(headline, "en"),
      standfirst: cleanTranslatedText(standfirst, "en"),
      factBullets: factBullets.map((fact) => cleanTranslatedText(fact, "en")),
      bodyParagraphs: bodyParagraphs.map((paragraph) => cleanTranslatedText(paragraph, "en"))
    }
  };

  try {
    for (const [language, target] of targetLanguageEntries(languages)) {
      const result = await translateTexts(texts, { target, projectId: gcpProject });
      localized[language] = {
        headline: cleanTranslatedTitle(result[0], language),
        standfirst: cleanTranslatedText(result[1], language),
        factBullets: result.slice(2, bodyOffset).map((fact) => cleanTranslatedText(fact, language)).filter(Boolean),
        bodyParagraphs: result.slice(bodyOffset).map((paragraph) => cleanTranslatedText(paragraph, language)).filter(Boolean)
      };
    }
  } catch (error) {
    if (provider === "google-strict") throw error;
    if (richSource && process.env.BLOG_MARKET_ALLOW_RICH_LOCAL_TRANSLATION_FALLBACK !== "1") throw error;
    if (!localMarketFallbackAllowed(provider)) throw error;
    process.stderr.write("warning: market translation provider unavailable; using local source-faithful fallback\\n");
    return localizeSourcePackLocally(pack, texts, languages);
  }

  return localized;
}

export function packForLanguage(pack, language, localized = {}) {
  const translation = localized[language];
  if (!translation) return pack;
  const sourceArticle = {
    ...(pack.sourceArticle || {}),
    headline: translation.headline || pack.sourceArticle?.headline,
    standfirst: translation.standfirst || pack.sourceArticle?.standfirst,
    factBullets: translation.factBullets?.length ? translation.factBullets : pack.sourceArticle?.factBullets,
    body: translation.bodyParagraphs?.length ? translation.bodyParagraphs.join("\n\n") : pack.sourceArticle?.body,
    bodyParagraphs: translation.bodyParagraphs?.length ? translation.bodyParagraphs : pack.sourceArticle?.bodyParagraphs,
    localizedLanguage: language
  };
  return {
    ...pack,
    sourceArticle
  };
}
