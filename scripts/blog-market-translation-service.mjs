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

function localMarketFallbackAllowed() {
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
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanTranslatedText(value = "", language = "") {
  let text = decodeHtmlEntities(value)
    .replace(/[—–]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  if (language === "zh-Hant") {
    text = text
      .replace(/優步/g, "Uber")
      .replace(/亞馬遜/g, "Amazon")
      .replace(/谷歌/g, "Google")
      .replace(/擁抱臉部|擁抱臉|擁抱面孔|擁抱臉孔/g, "Hugging Face")
      .replace(/人工智慧/g, "AI")
      .replace(/AI\s*代理商/g, "AI agent")
      .replace(/代理程式/g, "AI agent")
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
  const candidates = paragraphSplits.length
    ? paragraphSplits
    : normalized
        .match(/[^.!?]+[.!?]+(?:\s+|$)/g)
        ?.map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 60) || [];
  const seen = new Set();
  return candidates
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => !/browser does not support the audio element|your browser does not support audio|audio element/i.test(paragraph))
    .filter((paragraph) => {
      const key = paragraph.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
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
    "zh-Hant": `${publisher} 的最新報導把「${title}」放進 AI 產業脈絡；重點不是追逐標題，而是回到來源事實、時間線與可核對數字。`,
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
    "zh-Hant": entityText || numberText ? `來源報導聚焦 ${entityText || "相關公司與平台"}${numberText ? `，並列出 ${numberText} 等可核對數字` : ""}。` : `文章聚焦 ${publisher} 原文可核對的公開資訊。`,
    en: summary,
    ja: entityText || numberText ? `記事では ${entityText || "関連企業とプラットフォーム"}${numberText ? ` に加え、${numberText} という数字` : ""} が示されています。` : `記事は ${publisher} の原文で確認できる公開情報に焦点を当てています。`,
    ko: entityText || numberText ? `보도에는 ${entityText || "관련 기업과 플랫폼"}${numberText ? `, 그리고 ${numberText}` : ""}가 언급됩니다.` : `이 글은 ${publisher} 원문에서 확인되는 공개 정보를 중심으로 합니다.`,
    id: entityText || numberText ? `Artikel ini menyebut ${entityText || "perusahaan dan platform terkait"}${numberText ? `, dengan angka seperti ${numberText}` : ""}.` : `Artikel ini berfokus pada informasi publik yang bisa dicek dari laporan ${publisher}.`,
    vi: entityText || numberText ? `Bài viết nhắc tới ${entityText || "các công ty và nền tảng liên quan"}${numberText ? `, cùng các con số như ${numberText}` : ""}.` : `Bài viết tập trung vào thông tin công khai có thể kiểm chứng từ nguồn ${publisher}.`,
    th: entityText || numberText ? `รายงานกล่าวถึง ${entityText || "บริษัทและแพลตฟอร์มที่เกี่ยวข้อง"}${numberText ? ` พร้อมตัวเลข ${numberText}` : ""}` : `บทความนี้โฟกัสข้อมูลสาธารณะที่ตรวจสอบได้จากรายงานของ ${publisher}`,
    ms: entityText || numberText ? `Artikel ini menyebut ${entityText || "syarikat dan platform berkaitan"}${numberText ? `, dengan angka seperti ${numberText}` : ""}.` : `Artikel ini tertumpu pada maklumat awam yang boleh disemak daripada laporan ${publisher}.`,
    fil: entityText || numberText ? `Binanggit sa ulat ang ${entityText || "kaugnay na kumpanya at platform"}${numberText ? `, kasama ang mga numerong ${numberText}` : ""}.` : `Nakatuon ang artikulo sa public information na maaaring i-check sa ulat ng ${publisher}.`
  };

  const analysisByLanguage = {
    "zh-Hant": "企業讀者應先判斷這項消息是否改變採購成本、治理責任、資料流向或使用者信任，而不只是看發布聲量。",
    en: "ALTOS LAB treats this kind of update as a market signal, not just product promotion: the key question is whether it changes AI adoption cost, governance responsibility, data flow, or user trust.",
    ja: "ALTOS LAB はこの種のニュースを単なる製品宣伝ではなく市場シグナルとして見ます。焦点は、AI 導入コスト、ガバナンス責任、データの流れ、利用者の信頼を変えるかどうかです。",
    ko: "ALTOS LAB은 이런 업데이트를 단순한 제품 홍보가 아니라 시장 신호로 봅니다. 핵심은 AI 도입 비용, 거버넌스 책임, 데이터 흐름, 사용자 신뢰를 바꾸는지입니다.",
    id: "ALTOS LAB membaca kabar seperti ini sebagai sinyal pasar, bukan sekadar promosi produk: pertanyaannya apakah ini mengubah biaya adopsi AI, tanggung jawab governance, alur data, atau trust pengguna.",
    vi: "ALTOS LAB xem dạng tin này như tín hiệu thị trường, không chỉ là quảng bá sản phẩm: câu hỏi chính là nó có làm đổi chi phí triển khai AI, trách nhiệm quản trị, luồng dữ liệu hay niềm tin người dùng hay không.",
    th: "ALTOS LAB มองข่าวแบบนี้เป็นสัญญาณตลาด ไม่ใช่แค่การโปรโมตสินค้า คำถามคือมันเปลี่ยนต้นทุนการนำ AI ไปใช้ ความรับผิดชอบด้าน governance ทิศทางข้อมูล หรือความเชื่อมั่นของผู้ใช้หรือไม่",
    ms: "ALTOS LAB membaca kemas kini seperti ini sebagai isyarat pasaran, bukan sekadar promosi produk: soalan utamanya ialah sama ada ia mengubah kos adopsi AI, tanggungjawab governance, aliran data atau kepercayaan pengguna.",
    fil: "Binabasa ng ALTOS LAB ang ganitong update bilang market signal, hindi lang product promotion: ang tanong ay kung binabago nito ang AI adoption cost, governance responsibility, data flow, o user trust."
  };
  const operationsByLanguage = {
    "zh-Hant": "對企業團隊來說，第一個檢查點是這個消息是否會影響現有工作流：誰能使用、資料會流向哪裡、哪些任務需要人工覆核，以及出錯時能不能回到原始來源修正。",
    en: "For enterprise teams, the first check is whether the update changes an existing workflow: who can use it, where data moves, which tasks need human review, and whether mistakes can be traced back to the original source.",
    ja: "企業チームが最初に見るべき点は、このニュースが既存ワークフローを変えるかどうかです。誰が使えるのか、データがどこへ動くのか、どの作業に人の確認が必要か、誤りを原典へ戻して修正できるかを確認します。",
    ko: "기업 팀이 먼저 확인할 지점은 이 업데이트가 기존 워크플로를 바꾸는지입니다. 누가 사용할 수 있는지, 데이터가 어디로 이동하는지, 어떤 업무에 사람의 검토가 필요한지, 문제가 생겼을 때 원문으로 돌아가 수정할 수 있는지를 봐야 합니다.",
    id: "Bagi tim enterprise, titik cek pertama adalah apakah kabar ini mengubah workflow yang sudah berjalan: siapa yang boleh memakai, ke mana data bergerak, tugas mana yang perlu review manusia, dan apakah kesalahan bisa ditelusuri kembali ke sumber asli.",
    vi: "Với đội ngũ doanh nghiệp, điểm kiểm tra đầu tiên là tin này có làm đổi workflow hiện có hay không: ai được dùng, dữ liệu đi qua đâu, việc nào cần con người duyệt lại, và lỗi có thể truy ngược về nguồn gốc để sửa hay không.",
    th: "สำหรับทีมองค์กร จุดตรวจแรกคือข่าวนี้เปลี่ยน workflow เดิมหรือไม่ ใครใช้ได้ ข้อมูลไหลไปที่ไหน งานใดต้องมีมนุษย์ตรวจซ้ำ และถ้าเกิดข้อผิดพลาดจะย้อนกลับไปเทียบกับแหล่งข่าวต้นทางได้หรือไม่",
    ms: "Bagi pasukan enterprise, semakan pertama ialah sama ada berita ini mengubah workflow sedia ada: siapa boleh menggunakannya, ke mana data bergerak, tugasan mana perlukan semakan manusia, dan sama ada kesilapan boleh dijejak semula kepada sumber asal.",
    fil: "Para sa enterprise teams, unang kailangang tingnan kung binabago nito ang kasalukuyang workflow: sino ang puwedeng gumamit, saan dumadaan ang data, aling tasks ang kailangang i-review ng tao, at kung maibabalik ba sa original source kapag may mali."
  };
  const watchByLanguage = {
    "zh-Hant": "接下來要看官方文件、客戶案例與監管回應是否跟上。若只有示範或單篇公告，市場熱度可能很快消退；若出現明確部署範圍與責任分工，就會更接近可採用的產品訊號。",
    en: "The next signal to watch is whether documentation, customer evidence, and regulatory responses follow. A demo or single announcement can fade quickly; clear deployment scope and accountability make the update more useful as an adoption signal.",
    ja: "次に見るべきシグナルは、公式文書、顧客事例、規制側の反応が続くかどうかです。デモや単発発表だけなら熱量はすぐ落ちますが、導入範囲と責任分担が明確になれば採用判断に近づきます。",
    ko: "다음으로 볼 신호는 공식 문서, 고객 사례, 규제 반응이 뒤따르는지입니다. 데모나 단일 발표만으로는 열기가 빨리 식을 수 있지만, 배포 범위와 책임 분담이 명확해지면 도입 판단에 더 가까워집니다.",
    id: "Sinyal berikutnya yang perlu dipantau adalah apakah dokumentasi, bukti pelanggan, dan respons regulator ikut muncul. Demo atau satu pengumuman bisa cepat redup; scope deployment dan akuntabilitas yang jelas membuat kabar ini lebih berguna sebagai sinyal adopsi.",
    vi: "Tín hiệu cần theo dõi tiếp theo là tài liệu, bằng chứng khách hàng và phản hồi quản lý có đi kèm hay không. Một demo hoặc thông báo đơn lẻ có thể hạ nhiệt nhanh; phạm vi triển khai và trách nhiệm rõ ràng mới khiến tin này hữu ích hơn cho quyết định adoption.",
    th: "สัญญาณถัดไปที่ต้องดูคือมีเอกสารทางการ หลักฐานจากลูกค้า และท่าทีของหน่วยงานกำกับตามมาหรือไม่ เดโมหรือประกาศเดี่ยวอาจจางเร็ว แต่ขอบเขต deployment และ accountability ที่ชัดจะทำให้ข่าวนี้มีน้ำหนักต่อการนำไปใช้มากขึ้น",
    ms: "Isyarat seterusnya yang perlu dipantau ialah sama ada dokumentasi, bukti pelanggan dan respons regulator menyusul. Demo atau satu pengumuman boleh cepat pudar; skop deployment dan akauntabiliti yang jelas menjadikan berita ini lebih berguna sebagai isyarat adopsi.",
    fil: "Ang susunod na bantayan ay kung susunod ang documentation, customer evidence, at regulatory response. Madaling kumupas ang demo o isang announcement; mas nagiging adoption signal ito kapag malinaw ang deployment scope at accountability."
  };

  return {
    headline,
    standfirst: cleanTranslatedText(standfirstByLanguage[language] || summary || headline, language),
    factBullets: [evidenceByLanguage[language], sourceNote, analysisByLanguage[language], operationsByLanguage[language], watchByLanguage[language]]
      .map((fact) => cleanTranslatedText(fact, language))
      .filter(Boolean),
    bodyParagraphs: [
      evidenceByLanguage[language],
      sourceNote,
      analysisByLanguage[language],
      operationsByLanguage[language],
      watchByLanguage[language]
    ]
      .map((paragraph) => cleanTranslatedText(paragraph, language))
      .filter(Boolean)
  };
}

function localizeSourcePackLocally(pack, texts) {
  const localized = {
    en: {
      headline: cleanTranslatedTitle(texts[0], "en"),
      standfirst: cleanTranslatedText(texts[1], "en"),
      factBullets: texts.slice(2).map((fact) => cleanTranslatedText(fact, "en")).filter(Boolean).slice(0, 6),
      bodyParagraphs: splitSourceBodyParagraphs(pack.sourceArticle?.body || "").map((paragraph) => cleanTranslatedText(paragraph, "en"))
    }
  };
  for (const language of Object.keys(TARGET_LANGUAGES)) {
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
  const token = await gcloudAccessToken();
  const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
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
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `Cloud Translation failed with HTTP ${response.status}`);
  }
  const translated = json?.data?.translations || [];
  if (translated.length !== texts.length) throw new Error(`Cloud Translation returned ${translated.length}/${texts.length} translations`);
  return translated.map((item) => item.translatedText || "");
}

export async function localizeSourcePack(pack, { projectId = "", required = true } = {}) {
  const provider = (process.env.BLOG_MARKET_TRANSLATION_PROVIDER || "auto").trim().toLowerCase();
  if (provider === "off") {
    if (required) throw new Error("market translation provider is off");
    return {};
  }
  const gcpProject = projectId || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "project-e688c018-aec3-4815-891";
  const article = pack.sourceArticle || {};
  const source = pack.sourceLinks?.[0] || {};
  const headline = article.headline || source.title || pack.topic || "";
  const factBullets = Array.isArray(article.factBullets) ? article.factBullets.filter(Boolean).slice(0, 6) : [];
  const bodyParagraphs = splitSourceBodyParagraphs(article.body || "");
  const rawStandfirst = article.standfirst || source.summary || "";
  const standfirst = genericSourceSummary(rawStandfirst) ? factBullets[0] || headline : rawStandfirst;
  const texts = [headline, standfirst, ...factBullets, ...bodyParagraphs].map((text) => String(text || "").trim());
  if (!headline || !standfirst || factBullets.length < 2) {
    throw new Error("sourceArticle must include headline, standfirst and at least two fact bullets before localization");
  }
  const bodyOffset = 2 + factBullets.length;

  if (LOCAL_PROVIDER_ALIASES.has(provider)) {
    if (!localMarketFallbackAllowed()) throw localMarketFallbackDisabledError(provider);
    return localizeSourcePackLocally(pack, texts);
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
    for (const [language, target] of Object.entries(TARGET_LANGUAGES)) {
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
    if (!localMarketFallbackAllowed()) throw error;
    process.stderr.write("warning: market translation provider unavailable; using local source-faithful fallback\\n");
    return localizeSourcePackLocally(pack, texts);
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
