import {
  sourceArticleFromPackOrPost,
  shortPublisher as sourceArticlePublisher,
  cleanSourceTitle as cleanArticleSourceTitle,
  normalizeNewsText as normalizeArticleNewsText
} from "./blog-market-source-article.mjs";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNewsText(value = "") {
  return decodeEntities(value)
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[—–]/g, ",")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\bAI-generated\b/gi, "generated")
    .replace(/\s+([。！？,.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function cleanMarketPublicText(value = "", language = "") {
  let text = normalizeNewsText(value);
  if (language === "zh-Hant") {
    text = text
      .replace(/AI\s*代理/g, "AI agent")
      .replace(/GoogleAI/g, "Google AI")
      .replace(/根\s+(TechCrunch|NVIDIA|Google|OpenAI)\s*報導/g, "根據 $1 報導")
      .replace(/雙子座\s*3\s*號「深度思考」/g, "Gemini 3 Deep Think")
      .replace(/雙子座\s*3\s*Deep Think/g, "Gemini 3 Deep Think")
      .replace(/特工/g, "AI agent")
      .replace(/智能體 AI/g, "agentic AI")
      .replace(/押注需要有人監督 AI agent/g, "押注 AI agent 監控需求升溫")
      .replace(/您的/g, "使用者的")
      .replace(/向您展示/g, "向使用者展示")
      .replace(/向使用者的展示/g, "向使用者展示")
      .replace(/向使用者展示與使用者的搜尋查詢/g, "向使用者展示與搜尋查詢")
      .replace(/與使用者的搜尋查詢相符/g, "與搜尋查詢相符")
      .replace(/用戶/g, "使用者")
      .replace(/AI agent的/g, "AI agent 的")
      .replace(/AI 系統投入生產/g, "AI 系統進入正式環境")
      .replace(/保持其可靠運行/g, "維持可靠運作")
      .replace(/該公司堅稱/g, "Amazon 表示")
      .replace(/公司堅稱/g, "Amazon 表示")
      .replace(/出於某種原因，?/g, "")
      .replace(/\.\s+(?=[A-Z\u4e00-\u9fff])/g, "。")
      .replace(/\s+([，。；：！？])/g, "$1")
      .replace(/([。！？])[ \t]+/g, "$1")
      .replace(/([（「])[ \t]+/g, "$1")
      .replace(/[ \t]+([）」])/g, "$1");
  }
  if (language === "ja") {
    text = text
      .replace(/Coralogix社は/g, "Coralogix は")
      .replace(/AIエージェントを監視する人が必要だという賭けで2億ドルを調達した/g, "AI agent の監視需要を見込み 2 億ドルを調達した")
      .replace(/\.[ \t]+(?=[A-Z\u3040-\u30ff\u4e00-\u9fff])/g, "。");
  }
  if (language === "ko") {
    text = text
      .replace(/AI 에이전트를 감시할 사람이 필요하다는 데 투자하여 2억 달러를 모금했습니다/g, "AI agent 모니터링 수요에 베팅하며 2억 달러를 조달했습니다")
      .replace(/\.[ \t]+(?=[A-Z\uac00-\ud7af])/g, ". ");
  }
  return normalizeNewsText(text);
}

function cleanSourceTitle(value = "") {
  return stripHtml(value)
    .replace(/\s*\|\s*(TechCrunch|OpenAI|Google|Google AI Blog|Amazon Web Services|AWS|Vercel|Hugging Face)$/i, "")
    .trim();
}

function shortPublisher(value = "") {
  return stripHtml(value)
    .replace(/\s+AI$/i, "")
    .replace(/\s+News$/i, "")
    .trim() || "source";
}

function cleanSourceCredit(value = "") {
  return normalizeNewsText(value)
    .replace(/^Source image:\s*/i, "")
    .replace(/^來源圖片：\s*/i, "")
    .trim();
}

function cleanSourceLicense(value = "") {
  const normalized = normalizeNewsText(value);
  if (!normalized || /source-attributed official announcement image/i.test(normalized)) return "source image";
  return normalized;
}

function cleanCoverAlt(value = "", fallbackTitle = "", credit = "") {
  const normalized = normalizeNewsText(value)
    .replace(/\s+-\s+Source image:\s*.+$/i, "")
    .replace(/\s+-\s+來源圖片：\s*.+$/i, "")
    .replace(/^Source image:\s*/i, "")
    .replace(/^來源圖片：\s*/i, "")
    .trim();
  return normalized || `${fallbackTitle} - ${credit || "source image"}`;
}

function cleanReportLead(value = "") {
  return normalizeNewsText(value)
    .replace(/^(報導指出|報導稱|來源指出|文章指出)[，:：]\s*/i, "")
    .replace(/^(the report says|the article says|the source says)[:：,]?\s*/i, "")
    .replace(/^(記事では|報道によると|보도에 따르면|laporan itu menyebut|bài viết cho biết|รายงานระบุว่า|ayon sa ulat)[:：,]?\s*/i, "")
    .trim();
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

function truncate(value = "", limit = 180) {
  const text = normalizeNewsText(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function sourceText(input) {
  const first = input?.sourceLinks?.[0] || {};
  return `${input?.topic || ""} ${first.title || ""} ${first.summary || ""} ${first.publisher || ""}`.toLowerCase();
}

function localizedSourceSummary(language, source, frame) {
  const summary = normalizeNewsText(source.summary);
  const lower = summary.toLowerCase();
  const focus = frame.focus[language] || frame.focus.en;

  if (/17,000|17000|calls per day|africa|middle east/.test(lower)) {
    return {
      "zh-Hant": "AethexAI 表示，自建的語音 AI 系統已在非洲與中東市場每天處理超過 17,000 通電話。",
      en: "AethexAI says its own stack for Africa and the Middle East now handles more than 17,000 calls a day.",
      ja: "AethexAI は、アフリカと中東向けに構築した自社スタックが現在 1 日 17,000 件超の通話を処理していると説明しています。",
      ko: "AethexAI는 아프리카와 중동을 겨냥해 만든 자체 스택이 하루 17,000건이 넘는 전화를 처리한다고 설명합니다.",
      id: "AethexAI menyebut stack internalnya untuk Afrika dan Timur Tengah kini menangani lebih dari 17.000 panggilan per hari.",
      vi: "AethexAI cho biết stack tự xây cho châu Phi và Trung Đông hiện xử lý hơn 17.000 cuộc gọi mỗi ngày.",
      th: "AethexAI ระบุว่า stack ที่สร้างเองสำหรับตลาดแอฟริกาและตะวันออกกลาง รองรับสายโทรศัพท์มากกว่า 17,000 ครั้งต่อวันแล้ว",
      ms: "AethexAI berkata stack sendiri untuk Afrika dan Timur Tengah kini mengendalikan lebih 17,000 panggilan sehari.",
      fil: "Ayon sa AethexAI, ang sarili nitong stack para sa Africa at Middle East ay humahawak na ng mahigit 17,000 tawag bawat araw."
    }[language];
  }

  if (/coralogix|watch the ai agents|monitor.*ai agents|ai systems move into production|troubleshoot failures|operational data|observability/.test(lower)) {
    return {
      "zh-Hant": "TechCrunch 報導，Coralogix 完成 2 億美元融資，押注 AI agent 進入正式環境後，企業會更需要監控、除錯與營運資料。",
      en: "TechCrunch reported that Coralogix raised $200 million, betting that production AI agents will increase demand for monitoring, troubleshooting, and operational data.",
      ja: "TechCrunch は、Coralogix が 2 億ドルを調達し、本番環境に入る AI agent の監視、障害対応、運用データ需要に賭けていると報じました。",
      ko: "TechCrunch는 Coralogix가 2억 달러를 조달했으며, 운영 환경에 들어가는 AI agent가 모니터링·장애 대응·운영 데이터 수요를 키울 것으로 보고 있다고 전했습니다.",
      id: "TechCrunch melaporkan Coralogix menggalang US$200 juta, dengan taruhan bahwa AI agent di produksi akan menaikkan kebutuhan monitoring, troubleshooting, dan data operasional.",
      vi: "TechCrunch đưa tin Coralogix huy động 200 triệu USD, đặt cược rằng AI agent trong môi trường production sẽ kéo nhu cầu giám sát, khắc phục lỗi và dữ liệu vận hành đi lên.",
      th: "TechCrunch รายงานว่า Coralogix ระดมทุน 200 ล้านดอลลาร์ โดยเดิมพันว่า AI agent ใน production จะทำให้ความต้องการ monitoring, troubleshooting และข้อมูลปฏิบัติการสูงขึ้น",
      ms: "TechCrunch melaporkan Coralogix mengumpul AS$200 juta, dengan pertaruhan bahawa AI agent dalam production akan meningkatkan permintaan untuk monitoring, troubleshooting dan data operasi.",
      fil: "Iniulat ng TechCrunch na nakalikom ang Coralogix ng $200 milyon, habang tumataya na production AI agents ang magpapalaki ng demand para sa monitoring, troubleshooting, at operational data."
    }[language];
  }

  if (/85b|\$85|record-breaking|alphabet|capital spending|capex/.test(lower)) {
    return {
      "zh-Hant": "報導把 Alphabet / Google 的高額 AI 資本支出，視為雲端基礎設施與模型競賽持續升溫的訊號。",
      en: "The report frames Alphabet / Google's AI spending as a signal that cloud infrastructure and model competition remain intense.",
      ja: "報道は、Alphabet / Google の AI 投資を、クラウド基盤とモデル競争が続くシグナルとして位置づけています。",
      ko: "이 보도는 Alphabet / Google의 AI 지출을 클라우드 인프라와 모델 경쟁이 계속 치열하다는 신호로 봅니다.",
      id: "Laporan itu membaca belanja AI Alphabet / Google sebagai sinyal bahwa persaingan cloud infrastructure dan model masih panas.",
      vi: "Bài viết xem chi tiêu AI của Alphabet / Google là tín hiệu cho thấy hạ tầng cloud và cạnh tranh mô hình vẫn rất nóng.",
      th: "รายงานมองงบ AI ของ Alphabet / Google เป็นสัญญาณว่าการแข่งขันด้าน cloud infrastructure และโมเดลยังร้อนแรง",
      ms: "Laporan itu membaca perbelanjaan AI Alphabet / Google sebagai isyarat bahawa persaingan infrastruktur cloud dan model masih sengit.",
      fil: "Binasa ng ulat ang AI spending ng Alphabet / Google bilang senyales na mainit pa rin ang labanan sa cloud infrastructure at models."
    }[language];
  }

  if (/gemini omni|multimodal generation|natural editing|text, image and video/.test(lower)) {
    return {
      "zh-Hant": "Google 介紹 Gemini Omni，重點放在文字、圖片與影片提示下的多模態生成，以及更自然的編輯方式。",
      en: "Google introduced Gemini Omni for multimodal generation and more natural editing across text, image, and video prompts.",
      ja: "Google は Gemini Omni を紹介し、テキスト・画像・動画プロンプトをまたぐマルチモーダル生成と自然な編集に焦点を当てています。",
      ko: "Google은 텍스트, 이미지, 비디오 프롬프트를 아우르는 멀티모달 생성과 더 자연스러운 편집을 위한 Gemini Omni를 소개했습니다.",
      id: "Google memperkenalkan Gemini Omni untuk generasi multimodal dan editing yang lebih natural di prompt teks, gambar, dan video.",
      vi: "Google giới thiệu Gemini Omni cho tạo sinh đa phương thức và chỉnh sửa tự nhiên hơn trên prompt văn bản, hình ảnh và video.",
      th: "Google เปิดตัว Gemini Omni สำหรับการสร้างแบบ multimodal และการแก้ไขที่เป็นธรรมชาติมากขึ้นผ่าน prompt ข้อความ รูปภาพ และวิดีโอ",
      ms: "Google memperkenalkan Gemini Omni untuk penjanaan multimodal dan penyuntingan yang lebih semula jadi merentas prompt teks, imej dan video.",
      fil: "Ipinakilala ng Google ang Gemini Omni para sa multimodal generation at mas natural na editing sa text, image, at video prompts."
    }[language];
  }

  if (/product images|shopping|amazon|search/.test(lower)) {
    return {
      "zh-Hant": "報導指出，Amazon 正在部分搜尋結果中加入 AI 生成的商品圖像，讓購物搜尋更像互動式介面。",
      en: "The report says Amazon is adding AI-generated product images to some search results, making shopping search feel more like an interactive interface.",
      ja: "報道によると、Amazon は一部の商品検索結果に AI 生成画像を加え、検索体験をよりインタラクティブにしています。",
      ko: "보도에 따르면 Amazon은 일부 쇼핑 검색 결과에 AI 생성 상품 이미지를 넣어 검색 경험을 더 인터랙티브하게 만들고 있습니다.",
      id: "Laporan itu menyebut Amazon menambahkan gambar produk buatan AI ke sebagian hasil pencarian, membuat shopping search terasa lebih interaktif.",
      vi: "Bài viết cho biết Amazon thêm hình ảnh sản phẩm tạo bằng AI vào một số kết quả tìm kiếm, khiến tìm kiếm mua sắm giống giao diện tương tác hơn.",
      th: "รายงานระบุว่า Amazon ใส่ภาพสินค้าที่สร้างด้วย AI ในผลการค้นหาบางส่วน ทำให้ shopping search คล้ายอินเทอร์เฟซโต้ตอบมากขึ้น",
      ms: "Laporan itu menyebut Amazon menambah imej produk janaan AI dalam sebahagian hasil carian, menjadikan carian membeli-belah lebih interaktif.",
      fil: "Ayon sa ulat, nagdadagdag ang Amazon ng AI-generated product images sa ilang search results, kaya mas nagiging interactive ang shopping search."
    }[language];
  }

  if (/lovable|google cloud|usage 5x|5x expansion|anthropic claude|multiyear deal/.test(lower)) {
    return {
      "zh-Hant": "TechCrunch 報導，Lovable 與 Google 擴大多年合作，內容包括把 Lovable 在 Google Cloud 上的用量提高 5 倍，並取得更多 Anthropic Claude 使用權。",
      en: "TechCrunch reported that Lovable and Google expanded a multiyear partnership that includes a 5x increase in Lovable's Google Cloud usage and broader access to Anthropic Claude.",
      ja: "TechCrunch は、Lovable と Google が複数年の提携を拡大し、Lovable の Google Cloud 利用量を 5 倍へ増やし、Anthropic Claude へのアクセスも広げると報じました。",
      ko: "TechCrunch는 Lovable과 Google이 다년 파트너십을 확대했으며, Lovable의 Google Cloud 사용량 5배 확대와 Anthropic Claude 접근 확대가 포함된다고 전했습니다.",
      id: "TechCrunch melaporkan Lovable dan Google memperluas kerja sama multiyear yang mencakup peningkatan penggunaan Google Cloud Lovable sebesar 5x dan akses Anthropic Claude yang lebih luas.",
      vi: "TechCrunch đưa tin Lovable và Google mở rộng hợp tác nhiều năm, bao gồm tăng mức dùng Google Cloud của Lovable lên 5 lần và mở rộng quyền truy cập Anthropic Claude.",
      th: "TechCrunch รายงานว่า Lovable และ Google ขยายความร่วมมือหลายปี โดยรวมถึงการเพิ่มการใช้ Google Cloud ของ Lovable เป็น 5 เท่า และการเข้าถึง Anthropic Claude ที่มากขึ้น",
      ms: "TechCrunch melaporkan Lovable dan Google memperluas kerjasama bertahun yang merangkumi peningkatan penggunaan Google Cloud Lovable sebanyak 5x dan akses Anthropic Claude yang lebih luas.",
      fil: "Iniulat ng TechCrunch na pinalawak ng Lovable at Google ang multiyear partnership na kinabibilangan ng 5x na pagtaas sa Google Cloud usage ng Lovable at mas malawak na access sa Anthropic Claude."
    }[language];
  }

  if (/ai cloud ecosystem|earth-2|global ai compute|weather/.test(lower)) {
    return {
      "zh-Hant": "NVIDIA 宣布擴大全球 AI Cloud 生態系，並以 Earth-2 開放模型補上可自建、可微調的部署選項。",
      en: "NVIDIA announced a broader global AI Cloud ecosystem, while Earth-2 open models add options teams can host, tune, and deploy.",
      ja: "NVIDIA はグローバルな AI Cloud エコシステム拡大を発表し、Earth-2 のオープンモデルで自社構築・調整・展開の選択肢を広げています。",
      ko: "NVIDIA는 글로벌 AI Cloud 생태계 확장을 발표했고, Earth-2 오픈 모델은 팀이 직접 호스팅·튜닝·배포할 수 있는 선택지를 더합니다.",
      id: "NVIDIA mengumumkan perluasan ekosistem AI Cloud global, sementara model terbuka Earth-2 menambah opsi untuk di-host, di-tune, dan di-deploy sendiri.",
      vi: "NVIDIA công bố mở rộng hệ sinh thái AI Cloud toàn cầu, còn các mô hình mở Earth-2 bổ sung lựa chọn tự host, tinh chỉnh và triển khai.",
      th: "NVIDIA ประกาศขยายระบบนิเวศ AI Cloud ทั่วโลก ขณะที่โมเดลเปิด Earth-2 เพิ่มทางเลือกให้ทีม host, ปรับแต่ง และ deploy เองได้",
      ms: "NVIDIA mengumumkan peluasan ekosistem AI Cloud global, manakala model terbuka Earth-2 menambah pilihan untuk host, tune dan deploy sendiri.",
      fil: "Inanunsyo ng NVIDIA ang mas malawak na global AI Cloud ecosystem, habang nagdadagdag ang Earth-2 open models ng opsyon para i-host, i-tune, at i-deploy ng mga team."
    }[language];
  }

  if (/google summarized more than 100|i\/o 2026|developer-focused/.test(lower)) {
    return {
      "zh-Hant": "Google I/O 2026 一次整理超過百項 AI、Search、Workspace、Android 與開發者工具更新。",
      en: "Google I/O 2026 collected more than 100 updates across AI, Search, Workspace, Android, and developer tools.",
      ja: "Google I/O 2026 では、AI、Search、Workspace、Android、開発者ツールにまたがる 100 件超の更新が整理されました。",
      ko: "Google I/O 2026은 AI, Search, Workspace, Android, 개발자 도구 전반의 100개가 넘는 업데이트를 정리했습니다.",
      id: "Google I/O 2026 merangkum lebih dari 100 pembaruan di AI, Search, Workspace, Android, dan developer tools.",
      vi: "Google I/O 2026 tổng hợp hơn 100 cập nhật về AI, Search, Workspace, Android và công cụ dành cho lập trình viên.",
      th: "Google I/O 2026 รวมอัปเดตกว่า 100 รายการครอบคลุม AI, Search, Workspace, Android และเครื่องมือสำหรับนักพัฒนา",
      ms: "Google I/O 2026 menghimpunkan lebih 100 kemas kini merentas AI, Search, Workspace, Android dan alat pembangun.",
      fil: "Pinagsama ng Google I/O 2026 ang mahigit 100 update sa AI, Search, Workspace, Android, at developer tools."
    }[language];
  }

  if (/project glasswing|critical infrastructure|150 organizations|15 countries/.test(lower)) {
    return {
      "zh-Hant": "Anthropic 擴大 Project Glasswing，新增約 150 個組織，範圍涵蓋多國關鍵基礎設施與開源安全合作。",
      en: "Anthropic expanded Project Glasswing to about 150 organizations across multiple countries, including critical infrastructure and open-source security work.",
      ja: "Anthropic は Project Glasswing を約 150 組織へ拡大し、複数国の重要インフラとオープンソース安全協力を対象にしました。",
      ko: "Anthropic은 Project Glasswing을 여러 국가의 약 150개 조직으로 확대해 중요 인프라와 오픈소스 보안 협력을 포함했습니다.",
      id: "Anthropic memperluas Project Glasswing ke sekitar 150 organisasi di berbagai negara, termasuk infrastruktur kritis dan kerja keamanan open-source.",
      vi: "Anthropic mở rộng Project Glasswing tới khoảng 150 tổ chức ở nhiều quốc gia, bao gồm hạ tầng trọng yếu và hợp tác bảo mật nguồn mở.",
      th: "Anthropic ขยาย Project Glasswing ไปสู่องค์กรราว 150 แห่งในหลายประเทศ รวมถึงโครงสร้างพื้นฐานสำคัญและงานความปลอดภัยโอเพนซอร์ส",
      ms: "Anthropic memperluas Project Glasswing kepada sekitar 150 organisasi di pelbagai negara, termasuk infrastruktur kritikal dan kerja keselamatan sumber terbuka.",
      fil: "Pinalawak ng Anthropic ang Project Glasswing sa humigit-kumulang 150 organisasyon sa maraming bansa, kabilang ang critical infrastructure at open-source security work."
    }[language];
  }

  if (/autonomous data engineering|osmos|fabric|etl/.test(lower)) {
    return {
      "zh-Hant": "Microsoft 收購 Osmos，目標是把 Fabric 裡的資料工程自動化，減少 AI 專案在 ETL 與資料整備上的反覆卡關。",
      en: "Microsoft acquired Osmos to accelerate autonomous data engineering in Fabric, aiming to reduce repeated ETL and data-prep bottlenecks for AI projects.",
      ja: "Microsoft は Osmos を買収し、Fabric における自律的なデータエンジニアリングを加速して、AI プロジェクトの ETL とデータ準備の詰まりを減らそうとしています。",
      ko: "Microsoft는 Fabric의 자율 데이터 엔지니어링을 가속하기 위해 Osmos를 인수했으며, AI 프로젝트의 반복적인 ETL·데이터 준비 병목을 줄이려 합니다.",
      id: "Microsoft mengakuisisi Osmos untuk mempercepat autonomous data engineering di Fabric, dengan tujuan mengurangi hambatan ETL dan data prep yang berulang dalam proyek AI.",
      vi: "Microsoft mua Osmos để tăng tốc data engineering tự động trong Fabric, nhằm giảm nút thắt ETL và chuẩn bị dữ liệu lặp lại trong dự án AI.",
      th: "Microsoft ซื้อ Osmos เพื่อเร่ง autonomous data engineering ใน Fabric และลดคอขวด ETL กับ data prep ที่เกิดซ้ำในโปรเจกต์ AI",
      ms: "Microsoft mengambil alih Osmos untuk mempercepat autonomous data engineering dalam Fabric, dengan tujuan mengurangkan bottleneck ETL dan data prep yang berulang dalam projek AI.",
      fil: "Binili ng Microsoft ang Osmos para pabilisin ang autonomous data engineering sa Fabric at bawasan ang paulit-ulit na bottleneck sa ETL at data prep ng AI projects."
    }[language];
  }

  if (language === "en") return summary;
  return {
    "zh-Hant": `${focus}。`,
    ja: `${focus}。`,
    ko: `${focus}.`,
    id: `${focus}.`,
    vi: `${focus}.`,
    th: `${focus}`,
    ms: `${focus}.`,
    fil: `${focus}.`
  }[language];
}

function localizedProduct(language, frame) {
  const products = {
    "voice-ai-markets": {
      "zh-Hant": "語音 AI 新創",
      en: "voice AI startups",
      ja: "音声 AI スタートアップ",
      ko: "음성 AI 스타트업",
      id: "startup voice AI",
      vi: "startup voice AI",
      th: "สตาร์ทอัพ voice AI",
      ms: "startup voice AI",
      fil: "voice AI startup"
    },
    "ai-shopping-search": {
      "zh-Hant": "購物搜尋",
      en: "shopping search",
      ja: "ショッピング検索",
      ko: "쇼핑 검색",
      id: "shopping search",
      vi: "tìm kiếm mua sắm",
      th: "shopping search",
      ms: "carian membeli-belah",
      fil: "shopping search"
    },
    "ai-capital-spending": {
      "zh-Hant": "AI 資本支出",
      en: "AI capital spending",
      ja: "AI 投資",
      ko: "AI 투자",
      id: "belanja modal AI",
      vi: "chi tiêu vốn cho AI",
      th: "งบลงทุน AI",
      ms: "perbelanjaan modal AI",
      fil: "AI capital spending"
    },
    "ai-agent-observability": {
      "zh-Hant": "AI agent 監控",
      en: "AI agent observability",
      ja: "AI agent 監視",
      ko: "AI agent 관측성",
      id: "observability AI agent",
      vi: "observability cho AI agent",
      th: "observability สำหรับ AI agent",
      ms: "observability AI agent",
      fil: "AI agent observability"
    },
    "nvidia-ai-cloud": {
      "zh-Hant": "AI Cloud 算力",
      en: "AI Cloud capacity",
      ja: "AI Cloud の計算容量",
      ko: "AI Cloud 컴퓨팅 용량",
      id: "kapasitas AI Cloud",
      vi: "năng lực AI Cloud",
      th: "กำลังประมวลผล AI Cloud",
      ms: "kapasiti AI Cloud",
      fil: "AI Cloud capacity"
    },
    "google-io-2026": {
      "zh-Hant": "Google I/O AI 更新",
      en: "Google I/O AI updates",
      ja: "Google I/O の AI 更新",
      ko: "Google I/O AI 업데이트",
      id: "update AI Google I/O",
      vi: "cập nhật AI tại Google I/O",
      th: "อัปเดต AI จาก Google I/O",
      ms: "kemas kini AI Google I/O",
      fil: "AI updates ng Google I/O"
    },
    "anthropic-glasswing": {
      "zh-Hant": "AI 資安協作",
      en: "AI security collaboration",
      ja: "AI セキュリティ協力",
      ko: "AI 보안 협력",
      id: "kolaborasi keamanan AI",
      vi: "hợp tác bảo mật AI",
      th: "ความร่วมมือด้าน AI security",
      ms: "kerjasama keselamatan AI",
      fil: "AI security collaboration"
    },
    "autonomous-data-engineering": {
      "zh-Hant": "資料工程自動化",
      en: "autonomous data engineering",
      ja: "自律データエンジニアリング",
      ko: "자율 데이터 엔지니어링",
      id: "autonomous data engineering",
      vi: "data engineering tự động",
      th: "autonomous data engineering",
      ms: "autonomous data engineering",
      fil: "autonomous data engineering"
    },
    "gemini-omni": {
      "zh-Hant": "多模態生成",
      en: "multimodal generation",
      ja: "マルチモーダル生成",
      ko: "멀티모달 생성",
      id: "generasi multimodal",
      vi: "tạo sinh đa phương thức",
      th: "multimodal generation",
      ms: "penjanaan multimodal",
      fil: "multimodal generation"
    }
  };
  return products[frame.key]?.[language] || frame.product;
}

function localizedSourceTitle(language, frame, source) {
  const fallback = cleanSourceTitle(source.title || frame.focus[language] || frame.focus.en);
  if (frame.key === "voice-ai-markets") {
    return {
      "zh-Hant": "AethexAI 為非洲與中東打造語音 AI，創辦人來自 Goldman 與 Meta",
      en: fallback,
      ja: "Goldman と Meta 出身の創業者が AethexAI でアフリカ・中東向け音声 AI を作る",
      ko: "Goldman·Meta 출신 창업자들이 AethexAI로 아프리카와 중동용 음성 AI를 만든다",
      id: "AethexAI membangun voice AI untuk Afrika dan Timur Tengah, didirikan alumni Goldman dan Meta",
      vi: "AethexAI xây voice AI cho châu Phi và Trung Đông, do cựu nhân sự Goldman và Meta sáng lập",
      th: "AethexAI สร้าง voice AI สำหรับแอฟริกาและตะวันออกกลาง โดยผู้ก่อตั้งจาก Goldman และ Meta",
      ms: "AethexAI membina voice AI untuk Afrika dan Timur Tengah, diasaskan bekas bakat Goldman dan Meta",
      fil: "Gumagawa ang AethexAI ng voice AI para sa Africa at Middle East, mula sa founders na galing Goldman at Meta"
    }[language] || fallback;
  }
  if (frame.key === "gemini-omni") {
    return {
      "zh-Hant": "Gemini Omni 把文字、圖片與影片編輯放進同一條多模態工作流",
      en: "Gemini Omni brings text, image, and video editing into one multimodal workflow",
      ja: "Gemini Omni がテキスト・画像・動画編集を一つのマルチモーダルワークフローへ",
      ko: "Gemini Omni가 텍스트·이미지·비디오 편집을 하나의 멀티모달 워크플로로 묶는다",
      id: "Gemini Omni menyatukan editing teks, gambar, dan video dalam satu workflow multimodal",
      vi: "Gemini Omni đưa chỉnh sửa văn bản, hình ảnh và video vào một workflow đa phương thức",
      th: "Gemini Omni รวมการแก้ไขข้อความ รูปภาพ และวิดีโอไว้ใน workflow แบบ multimodal",
      ms: "Gemini Omni menghimpunkan penyuntingan teks, imej dan video dalam satu workflow multimodal",
      fil: "Pinagsasama ng Gemini Omni ang text, image, at video editing sa isang multimodal workflow"
    }[language];
  }
  return fallback;
}

function cleanPublicSourceLinks(sourceLinks = []) {
  return sourceLinks
    .filter((source) => {
      const text = `${source.title || ""} ${source.url || ""} ${source.summary || ""}`.toLowerCase();
      return !/source index|article claims should remain anchored|current ai feed/.test(text);
    })
    .map((source) => ({
      ...source,
      title: cleanSourceTitle(source.title || ""),
      summary: cleanPublicSourceSummary(source.summary || "")
    }))
    .filter((source) => source.title && source.url);
}

function supplementalSourceLink(source = {}, profile = {}) {
  profile = profile || {};
  const url = `${source.url || ""} ${source.publisher || ""}`.toLowerCase();
  const publishedAt = source.publishedAt || "";
  const publisher = sourceArticlePublisher(source.publisher || "");
  if (/vercel\.com/.test(url)) {
    return {
      title: "Vercel AI Gateway documentation",
      url: "https://vercel.com/docs/ai-gateway",
      publisher: "Vercel",
      publishedAt,
      summary: "Vercel documents AI Gateway as the product surface for routing model access through one gateway."
    };
  }
  if (/openai\.com/.test(url) || /^openai-/.test(profile.key || "")) {
    return {
      title: "OpenAI News",
      url: "https://openai.com/news/",
      publisher: "OpenAI",
      publishedAt,
      summary: "OpenAI News is the official index for current company announcements, product updates and research notes."
    };
  }
  if (/techcrunch\.com/.test(url) || /techcrunch/i.test(publisher)) {
    return {
      title: "TechCrunch Artificial Intelligence",
      url: "https://techcrunch.com/category/artificial-intelligence/",
      publisher: "TechCrunch",
      publishedAt,
      summary: "TechCrunch's Artificial Intelligence section collects related AI startup, product and platform reporting."
    };
  }
  if (/theverge\.com/.test(url) || /verge/i.test(publisher)) {
    return {
      title: "The Verge AI",
      url: "https://www.theverge.com/ai-artificial-intelligence",
      publisher: "The Verge",
      publishedAt,
      summary: "The Verge's AI section collects related platform, product and policy reporting."
    };
  }
  if (/venturebeat\.com/.test(url) || /venturebeat/i.test(publisher)) {
    return {
      title: "VentureBeat AI",
      url: "https://venturebeat.com/category/ai/",
      publisher: "VentureBeat",
      publishedAt,
      summary: "VentureBeat's AI section collects related enterprise AI, model and startup reporting."
    };
  }
  if (/technologyreview\.com/.test(url) || /technology review/i.test(publisher)) {
    return {
      title: "MIT Technology Review AI",
      url: "https://www.technologyreview.com/topic/artificial-intelligence/",
      publisher: "MIT Technology Review",
      publishedAt,
      summary: "MIT Technology Review's artificial intelligence topic page collects related AI research, policy and industry reporting."
    };
  }
  if (/wired\.com/.test(url) || /wired/i.test(publisher)) {
    return {
      title: "WIRED Artificial Intelligence",
      url: "https://www.wired.com/tag/artificial-intelligence/",
      publisher: "WIRED",
      publishedAt,
      summary: "WIRED's artificial intelligence coverage collects related technology, business and policy reporting."
    };
  }
  return null;
}

function publicSourceLinks(sourceLinks = [], source = {}, profile = {}) {
  const links = cleanPublicSourceLinks(sourceLinks);
  if (links.length >= 1) return links;
  const supplemental = supplementalSourceLink(source, profile);
  if (!supplemental) return links;
  return cleanPublicSourceLinks([...links, supplemental]);
}

function cleanPublicSourceSummary(value = "") {
  const text = normalizeNewsText(value);
  if (/Source:\s|Event:\s|Evidence:\s|Decision cue/i.test(text)) {
    const evidence = text.match(/Evidence:\s*([^。]+?)(?:\.|。| Decision cue:|$)/i)?.[1];
    return normalizeNewsText(evidence || "");
  }
  return text
    .replace(/\ba market signal that\b/gi, "a report that")
    .replace(/\bmarket signal\b/gi, "public signal")
    .replace(/市場訊號/g, "公開訊號")
    .trim();
}

function publicArticleStandfirst(article = {}, source = {}) {
  return cleanPublicSourceSummary(article.standfirst || source.summary || "");
}

function publicArticleFact(value = "") {
  const text = cleanPublicSourceSummary(value);
  return /Source:\s|Event:\s|Evidence:\s|Decision cue|source index|article claims should remain anchored/i.test(text)
    ? ""
    : text;
}

function localizedNewsTitle(language, frame, source) {
  if (frame.key === "voice-ai-markets") {
    return {
      "zh-Hant": localizedSourceTitle("zh-Hant", frame, source),
      en: localizedSourceTitle("en", frame, source),
      ja: localizedSourceTitle("ja", frame, source),
      ko: localizedSourceTitle("ko", frame, source),
      id: localizedSourceTitle("id", frame, source),
      vi: localizedSourceTitle("vi", frame, source),
      th: localizedSourceTitle("th", frame, source),
      ms: localizedSourceTitle("ms", frame, source),
      fil: localizedSourceTitle("fil", frame, source)
    }[language];
  }
  const publisher = shortPublisher(source.publisher);
  const focus = frame.focus[language] || frame.focus.en;
  return {
    "zh-Hant": `${focus}：${publisher} 報導`,
    en: `${focus}: reported by ${publisher}`,
    ja: `${focus}：${publisher} 報道`,
    ko: `${focus}: ${publisher} 보도`,
    id: `${focus}: laporan ${publisher}`,
    vi: `${focus}: ${publisher} đưa tin`,
    th: `${focus}: รายงานจาก ${publisher}`,
    ms: `${focus}: laporan ${publisher}`,
    fil: `${focus}: ulat ng ${publisher}`
  }[language] || `${focus}: ${publisher}`;
}

export function inferMarketFrame(input = {}) {
  const text = sourceText(input);
  const source = input.sourceLinks?.[0] || {};
  const publisher = shortPublisher(source.publisher);

  if (/aethex|voice ai/.test(text) || (/goldman/.test(text) && /meta/.test(text) && /(africa|middle east|17,000|17000)/.test(text))) {
    return {
      key: "voice-ai-markets",
      entity: "Voice AI",
      product: "voice AI startup",
      focus: {
    "zh-Hant": "語音 AI 新創把市場放在大平台忽略的地區",
        en: "a voice AI startup is betting on markets big platforms often overlook",
        ja: "音声 AI スタートアップが大手の見落とす市場へ向かう",
        ko: "음성 AI 스타트업이 대형 플랫폼이 놓친 시장을 겨냥한다",
        id: "startup voice AI membidik pasar yang sering dilewatkan platform besar",
        vi: "startup voice AI nhắm tới các thị trường thường bị nền tảng lớn bỏ qua",
        th: "สตาร์ทอัพ voice AI เลือกตลาดที่แพลตฟอร์มใหญ่มักมองข้าม",
        ms: "startup voice AI menyasar pasaran yang sering terlepas pandang oleh platform besar",
        fil: "isang voice AI startup ang tumataya sa markets na madalas lampasan ng malalaking platform"
      }
    };
  }

  if (/amazon.*product image|shopping search|search for some reason/.test(text)) {
    return {
      key: "ai-shopping-search",
      entity: "Amazon",
      product: "AI shopping search",
      focus: {
        "zh-Hant": "Amazon 把搜尋結果中的商品圖像推進生成式介面",
        en: "Amazon is adding generated product images to some shopping searches",
        ja: "Amazon が一部の商品検索に生成画像を入れ始める",
        ko: "Amazon이 일부 쇼핑 검색에 생성 상품 이미지를 넣기 시작한다",
        id: "Amazon mulai menampilkan gambar produk generatif dalam sebagian pencarian belanja",
        vi: "Amazon đưa hình ảnh sản phẩm tạo sinh vào một số truy vấn mua sắm",
        th: "Amazon เริ่มใส่ภาพสินค้าแบบ generative ในบางการค้นหาสินค้า",
        ms: "Amazon mula memasukkan imej produk generatif dalam sebahagian carian membeli-belah",
        fil: "naglalagay ang Amazon ng generated product images sa ilang shopping search"
      }
    };
  }

  if (/gemini omni|multimodal generation|natural editing|text, image and video/.test(text)) {
    return {
      key: "gemini-omni",
      entity: "Google",
      product: "Gemini Omni",
      focus: {
        "zh-Hant": "Gemini Omni 把文字、圖片與影片編輯放進同一條多模態工作流",
        en: "Gemini Omni brings text, image, and video editing into one multimodal workflow",
        ja: "Gemini Omni がテキスト・画像・動画編集を一つのマルチモーダルワークフローへ",
        ko: "Gemini Omni가 텍스트·이미지·비디오 편집을 하나의 멀티모달 워크플로로 묶는다",
        id: "Gemini Omni menyatukan editing teks, gambar, dan video dalam satu workflow multimodal",
        vi: "Gemini Omni đưa chỉnh sửa văn bản, hình ảnh và video vào một workflow đa phương thức",
        th: "Gemini Omni รวมการแก้ไขข้อความ รูปภาพ และวิดีโอไว้ใน workflow แบบ multimodal",
        ms: "Gemini Omni menghimpunkan penyuntingan teks, imej dan video dalam satu workflow multimodal",
        fil: "pinagsasama ng Gemini Omni ang text, image, at video editing sa isang multimodal workflow"
      }
    };
  }

  if (/coralogix|watch the ai agents|monitor.*ai agents|ai systems move into production|troubleshoot failures|operational data|observability/.test(text)) {
    return {
      key: "ai-agent-observability",
      entity: "Coralogix",
      product: "AI agent observability",
      focus: {
        "zh-Hant": "Coralogix 押注 AI agent 上線後會帶動監控與除錯需求",
        en: "Coralogix is betting production AI agents will need more monitoring",
        ja: "Coralogix は本番 AI agent の監視需要に賭ける",
        ko: "Coralogix가 운영 AI agent의 모니터링 수요에 베팅한다",
        id: "Coralogix bertaruh AI agent di produksi akan butuh lebih banyak monitoring",
        vi: "Coralogix đặt cược AI agent production sẽ cần giám sát nhiều hơn",
        th: "Coralogix เดิมพันว่า AI agent ใน production จะต้องการ monitoring มากขึ้น",
        ms: "Coralogix bertaruh AI agent dalam production memerlukan lebih banyak monitoring",
        fil: "tumataya ang Coralogix na kailangan ng production AI agents ng mas maraming monitoring"
      }
    };
  }

  if (/(alphabet|google).*(85b|\$85|capital spend|capital spending|capex|record-breaking raise)|85b|\$85/.test(text)) {
    return {
      key: "ai-capital-spending",
      entity: "Alphabet / Google",
      product: "AI capital spending",
      focus: {
        "zh-Hant": "Google 的 AI 資本支出把雲端與模型競賽推到前線",
        en: "Google's AI spending keeps cloud and model competition in the foreground",
        ja: "Google の AI 投資がクラウドとモデル競争を前面に押し出す",
        ko: "Google의 AI 투자가 클라우드와 모델 경쟁을 다시 전면에 세운다",
        id: "belanja AI Google menempatkan cloud dan kompetisi model di garis depan",
        vi: "chi tiêu AI của Google đưa cloud và cạnh tranh mô hình lên tuyến đầu",
        th: "งบ AI ของ Google ดัน cloud และการแข่งขันโมเดลขึ้นมาอยู่แถวหน้า",
        ms: "perbelanjaan AI Google meletakkan cloud dan persaingan model di barisan hadapan",
        fil: "inutulak ng AI spending ng Google ang cloud at model competition sa unahan"
      }
    };
  }

  if (/codex|wasmer|node\.js runtime|productivity tool/.test(text)) {
    return {
      key: "codex-workflows",
      entity: "OpenAI Codex",
      product: "Codex workflows",
      focus: {
        "zh-Hant": "Codex 從工程任務延伸到更廣的知識工作",
        en: "Codex is moving from engineering tasks into broader knowledge work",
        ja: "Codex が開発作業からより広い知識業務へ広がる",
        ko: "Codex가 개발 업무를 넘어 지식 업무로 넓어진다",
        id: "Codex bergerak dari tugas engineering menuju pekerjaan pengetahuan yang lebih luas",
        vi: "Codex đang đi từ nhiệm vụ kỹ thuật sang các công việc tri thức rộng hơn",
        th: "Codex กำลังขยายจากงานวิศวกรรมไปสู่งานความรู้ที่กว้างขึ้น",
        ms: "Codex bergerak daripada tugas kejuruteraan kepada kerja pengetahuan yang lebih luas",
        fil: "lumalawak ang Codex mula engineering tasks patungo sa mas malawak na knowledge work"
      }
    };
  }

  if (/lovable|google cloud|usage 5x|anthropic claude/.test(text)) {
    return {
      key: "ai-app-platform-cloud",
      entity: "Lovable / Google Cloud",
      product: "AI app-building platform",
      focus: {
        "zh-Hant": "Lovable 與 Google Cloud 簽下多年協議，雲端用量將擴大 5 倍",
        en: "Lovable signed a multiyear Google Cloud deal to expand usage fivefold",
        ja: "Lovable が Google Cloud と複数年契約を結び、利用量を 5 倍へ拡大",
        ko: "Lovable이 Google Cloud와 다년 계약을 맺고 사용량을 5배 확대한다",
        id: "Lovable meneken kontrak multiyear dengan Google Cloud untuk memperluas usage 5x",
        vi: "Lovable ký thỏa thuận nhiều năm với Google Cloud để mở rộng mức dùng gấp 5 lần",
        th: "Lovable เซ็นดีลหลายปีกับ Google Cloud เพื่อขยาย usage 5 เท่า",
        ms: "Lovable menandatangani perjanjian bertahun dengan Google Cloud untuk meluaskan penggunaan 5x",
        fil: "pumirma ang Lovable ng multiyear deal sa Google Cloud para palawakin ang usage nang 5x"
      }
    };
  }

  if (/mufg|ai-native|ai native|financial institution/.test(text)) {
    return {
      key: "mufg-openai-ai-native",
      entity: "MUFG / OpenAI",
      product: "enterprise AI adoption",
      focus: {
        "zh-Hant": "MUFG 與 OpenAI 合作，推動大型金融機構走向 AI-native",
        en: "MUFG is working with OpenAI to move deeper into AI-native operations",
        ja: "MUFG が OpenAI と連携し、大手金融機関の AI-native 化を進める",
        ko: "MUFG가 OpenAI와 협력해 대형 금융기관의 AI-native 전환을 추진한다",
        id: "MUFG bekerja sama dengan OpenAI untuk mendorong operasi AI-native di institusi keuangan besar",
        vi: "MUFG hợp tác với OpenAI để đẩy hoạt động AI-native trong một định chế tài chính lớn",
        th: "MUFG ร่วมมือกับ OpenAI เพื่อผลักดันสถาบันการเงินขนาดใหญ่ไปสู่การทำงานแบบ AI-native",
        ms: "MUFG bekerjasama dengan OpenAI untuk membawa institusi kewangan besar ke operasi AI-native",
        fil: "nakikipagtulungan ang MUFG sa OpenAI para gawing mas AI-native ang operasyon ng isang malaking financial institution"
      }
    };
  }

  if (/cosmos|physical ai|omni model/.test(text)) {
    return {
      key: "nvidia-cosmos-physical-ai",
      entity: "NVIDIA",
      product: "Cosmos physical AI model",
      focus: {
        "zh-Hant": "NVIDIA Cosmos 3 把開放模型推向 Physical AI 推理",
        en: "NVIDIA Cosmos 3 brings open models further into physical AI reasoning",
        ja: "NVIDIA Cosmos 3 がオープンモデルを Physical AI 推論へ広げる",
        ko: "NVIDIA Cosmos 3가 오픈 모델을 피지컬 AI 추론으로 확장한다",
        id: "NVIDIA Cosmos 3 membawa model terbuka lebih jauh ke penalaran physical AI",
        vi: "NVIDIA Cosmos 3 đưa mô hình mở tiến sâu hơn vào suy luận physical AI",
        th: "NVIDIA Cosmos 3 ดันโมเดลเปิดเข้าสู่การ reasoning สำหรับ physical AI มากขึ้น",
        ms: "NVIDIA Cosmos 3 membawa model terbuka lebih jauh ke penaakulan physical AI",
        fil: "dinadala ng NVIDIA Cosmos 3 ang open models sa mas malalim na physical AI reasoning"
      }
    };
  }

  if (/ai gateway|grok imagine|qwen|minimax|model availability|vercel/.test(text)) {
    return {
      key: "vercel-ai-gateway-models",
      entity: "Vercel",
      product: "AI Gateway",
      focus: {
        "zh-Hant": "Grok Imagine Video 1.5 登上 Vercel AI Gateway",
        en: "Grok Imagine Video 1.5 is now on Vercel AI Gateway",
        ja: "Grok Imagine Video 1.5 が Vercel AI Gateway に追加",
        ko: "Grok Imagine Video 1.5, Vercel AI Gateway에 추가",
        id: "Grok Imagine Video 1.5 hadir di Vercel AI Gateway",
        vi: "Grok Imagine Video 1.5 đã có trên Vercel AI Gateway",
        th: "Grok Imagine Video 1.5 พร้อมใช้งานบน Vercel AI Gateway",
        ms: "Grok Imagine Video 1.5 kini tersedia di Vercel AI Gateway",
        fil: "Grok Imagine Video 1.5 available na sa Vercel AI Gateway"
      }
    };
  }

  if (/agent logic|scalable enterprise ai adoption|beyond llms/.test(text)) {
    return {
      key: "enterprise-agent-logic",
      entity: "Hugging Face",
      product: "enterprise AI adoption",
      focus: {
        "zh-Hant": "Hugging Face 提醒企業，AI 規模化不只靠更大的模型",
        en: "Hugging Face argues enterprise AI scale needs more than larger models",
        ja: "Hugging Face は、企業 AI の規模化には大きなモデルだけでは足りないと指摘する",
        ko: "Hugging Face는 기업 AI 확장에는 더 큰 모델만으로 부족하다고 지적한다",
        id: "Hugging Face mengingatkan bahwa skala AI enterprise butuh lebih dari model yang lebih besar",
        vi: "Hugging Face nhấn mạnh mở rộng AI trong doanh nghiệp không chỉ cần mô hình lớn hơn",
        th: "Hugging Face ชี้ว่า enterprise AI scale ต้องการมากกว่าโมเดลที่ใหญ่ขึ้น",
        ms: "Hugging Face menegaskan skala AI enterprise memerlukan lebih daripada model yang lebih besar",
        fil: "paalala ng Hugging Face na hindi sapat ang mas malaking model para sa enterprise AI scale"
      }
    };
  }

  if (/boston children|diagnos|new diagnoses|clinical/.test(text)) {
    return {
      key: "clinical-ai-diagnosis",
      entity: "OpenAI / Boston Children's",
      product: "clinical AI",
      focus: {
        "zh-Hant": "Boston Children's 用 AI 追查更難發現的診斷線索",
        en: "Boston Children's is using AI to surface harder diagnostic signals",
        ja: "Boston Children's が AI で見つけにくい診断手がかりを探る",
        ko: "Boston Children's가 AI로 더 어려운 진단 단서를 찾는다",
        id: "Boston Children's memakai AI untuk menemukan sinyal diagnosis yang lebih sulit",
        vi: "Boston Children's dùng AI để tìm các tín hiệu chẩn đoán khó hơn",
        th: "Boston Children's ใช้ AI เพื่อค้นหาสัญญาณวินิจฉัยที่ยากขึ้น",
        ms: "Boston Children's menggunakan AI untuk mencari isyarat diagnosis yang lebih sukar",
        fil: "ginagamit ng Boston Children's ang AI para hanapin ang mas mahirap na diagnostic signals"
      }
    };
  }

  if (/intelligence age|michigan|stargate|data[- ]center|data center/.test(text)) {
    return {
      key: "ai-infrastructure-michigan",
      entity: "OpenAI",
      product: "AI infrastructure",
      focus: {
        "zh-Hant": "OpenAI 在 Michigan 推進 AI 基礎設施，資料中心投資走向區域政策題",
        en: "OpenAI's Michigan infrastructure plan turns data-center investment into a regional policy question",
        ja: "OpenAI の Michigan インフラ計画が、データセンター投資を地域政策の論点にする",
        ko: "OpenAI의 Michigan 인프라 계획이 데이터센터 투자를 지역 정책 이슈로 만든다",
        id: "rencana infrastruktur OpenAI di Michigan membuat investasi data center jadi isu kebijakan regional",
        vi: "kế hoạch hạ tầng của OpenAI tại Michigan biến đầu tư data center thành vấn đề chính sách khu vực",
        th: "แผนโครงสร้างพื้นฐานของ OpenAI ใน Michigan ทำให้การลงทุน data center เป็นประเด็นนโยบายระดับภูมิภาค",
        ms: "pelan infrastruktur OpenAI di Michigan menjadikan pelaburan data center isu dasar wilayah",
        fil: "ginagawa ng plano ng OpenAI sa Michigan na regional policy issue ang data-center investment"
      }
    };
  }

  if (/political advocacy|ai policy|public policy/.test(text)) {
    return {
      key: "openai-policy-advocacy",
      entity: "OpenAI",
      product: "AI policy",
      focus: {
        "zh-Hant": "OpenAI 公開 AI policy 與政治倡議立場",
        en: "OpenAI set out its views on AI policy and political advocacy",
        ja: "OpenAI が AI policy と政治的アドボカシーへの見解を示す",
        ko: "OpenAI가 AI policy와 정치적 advocacy에 대한 입장을 밝혔다",
        id: "OpenAI memaparkan pandangannya tentang AI policy dan political advocacy",
        vi: "OpenAI nêu quan điểm về AI policy và vận động chính sách",
        th: "OpenAI เปิดเผยมุมมองต่อ AI policy และ political advocacy",
        ms: "OpenAI menghuraikan pandangannya tentang AI policy dan political advocacy",
        fil: "inilahad ng OpenAI ang pananaw nito sa AI policy at political advocacy"
      }
    };
  }

  if (/ai cloud ecosystem|earth-2|global ai compute|nvidia.*cloud/.test(text)) {
    return {
      key: "nvidia-ai-cloud",
      entity: "NVIDIA",
      product: "AI Cloud capacity",
      focus: {
        "zh-Hant": "NVIDIA 擴大 AI Cloud，讓企業重新分配算力預算",
        en: "NVIDIA is expanding AI Cloud capacity as companies revisit compute budgets",
        ja: "NVIDIA が AI Cloud を拡大し、企業は計算予算の見直しを迫られる",
        ko: "NVIDIA가 AI Cloud를 확대하며 기업은 컴퓨팅 예산을 다시 봐야 한다",
        id: "NVIDIA memperluas AI Cloud saat perusahaan menata ulang anggaran compute",
        vi: "NVIDIA mở rộng AI Cloud khi doanh nghiệp phải chia lại ngân sách compute",
        th: "NVIDIA ขยาย AI Cloud ขณะที่องค์กรต้องจัดงบ compute ใหม่",
        ms: "NVIDIA memperluas AI Cloud ketika syarikat menyusun semula belanjawan compute",
        fil: "lumalawak ang AI Cloud ng NVIDIA habang kailangang ayusin ang compute budget"
      }
    };
  }

  if (/google i\/o 2026|100 things we announced|developer tools collection/.test(text)) {
    return {
      key: "google-io-2026",
      entity: "Google",
      product: "Google I/O AI updates",
      focus: {
        "zh-Hant": "Google I/O 2026 的 AI 更新需要先被分類，再決定採用順序",
        en: "Google I/O 2026's AI updates need sorting before adoption",
        ja: "Google I/O 2026 の AI 更新は、採用前に分類が必要になる",
        ko: "Google I/O 2026의 AI 업데이트는 도입 전 먼저 분류해야 한다",
        id: "update AI Google I/O 2026 perlu disaring sebelum diadopsi",
        vi: "các cập nhật AI tại Google I/O 2026 cần được phân loại trước khi áp dụng",
        th: "อัปเดต AI จาก Google I/O 2026 ต้องถูกคัดแยกก่อนนำไปใช้",
        ms: "kemas kini AI Google I/O 2026 perlu ditapis sebelum diadopsi",
        fil: "kailangang salain muna ang AI updates ng Google I/O 2026 bago gamitin"
      }
    };
  }

  if (/project glasswing|anthropic.*glasswing|critical software security/.test(text)) {
    return {
      key: "anthropic-glasswing",
      entity: "Anthropic",
      product: "Project Glasswing",
      focus: {
        "zh-Hant": "Anthropic 擴大 Glasswing，讓 AI 資安從找漏洞走向修補部署",
        en: "Anthropic is expanding Glasswing as AI security shifts from finding bugs to fixing them",
        ja: "Anthropic が Glasswing を拡大し、AI セキュリティは発見から修正展開へ移る",
        ko: "Anthropic이 Glasswing을 확대하며 AI 보안은 취약점 발견에서 수정 배포로 이동한다",
        id: "Anthropic memperluas Glasswing saat keamanan AI bergeser dari menemukan bug ke memperbaikinya",
        vi: "Anthropic mở rộng Glasswing khi bảo mật AI chuyển từ tìm lỗi sang triển khai bản vá",
        th: "Anthropic ขยาย Glasswing ขณะที่ AI security ขยับจากการหา bug ไปสู่การแก้และ deploy",
        ms: "Anthropic memperluas Glasswing ketika keselamatan AI bergerak daripada mencari pepijat kepada membaikinya",
        fil: "pinalawak ng Anthropic ang Glasswing habang lumilipat ang AI security mula bug finding tungo sa patch deployment"
      }
    };
  }

  if (/\bosmos\b|autonomous data engineering|\bfabric\b/.test(text)) {
    return {
      key: "autonomous-data-engineering",
      entity: "Microsoft",
      product: "autonomous data engineering",
      focus: {
        "zh-Hant": "Microsoft 收購 Osmos，把資料工程自動化推進 Fabric",
        en: "Microsoft acquired Osmos to push autonomous data engineering into Fabric",
        ja: "Microsoft が Osmos を買収し、Fabric に自律データエンジニアリングを取り込む",
        ko: "Microsoft가 Osmos를 인수해 자율 데이터 엔지니어링을 Fabric에 넣는다",
        id: "Microsoft mengakuisisi Osmos untuk membawa autonomous data engineering ke Fabric",
        vi: "Microsoft mua Osmos để đưa data engineering tự động vào Fabric",
        th: "Microsoft ซื้อ Osmos เพื่อนำ autonomous data engineering เข้า Fabric",
        ms: "Microsoft mengambil alih Osmos untuk membawa autonomous data engineering ke Fabric",
        fil: "binili ng Microsoft ang Osmos para dalhin ang autonomous data engineering sa Fabric"
      }
    };
  }

  if (/gpt-rosalind|rosalind/.test(text)) {
    return {
      key: "gpt-rosalind",
      entity: "OpenAI",
      product: "GPT-Rosalind",
      focus: {
        "zh-Hant": "GPT-Rosalind 新能力把生物研究推向更可審核的 AI 協作",
        en: "GPT-Rosalind adds capabilities for more reviewable AI-assisted biology research",
        ja: "GPT-Rosalind が検証しやすい AI 共同研究機能を追加する",
        ko: "GPT-Rosalind가 검토 가능한 AI 생물학 연구 기능을 더한다",
        id: "GPT-Rosalind menambah kemampuan untuk riset biologi berbantuan AI yang lebih mudah ditinjau",
        vi: "GPT-Rosalind thêm năng lực cho nghiên cứu sinh học có AI hỗ trợ và dễ kiểm tra hơn",
        th: "GPT-Rosalind เพิ่มความสามารถให้งานวิจัยชีววิทยาที่ใช้ AI ตรวจทานได้มากขึ้น",
        ms: "GPT-Rosalind menambah keupayaan untuk penyelidikan biologi berbantukan AI yang lebih mudah disemak",
        fil: "nagdadagdag ang GPT-Rosalind ng kakayahan para sa mas reviewable na AI-assisted biology research"
      }
    };
  }

  if (/claim|travelers|insurance/.test(text)) {
    return {
      key: "claims-ai",
      entity: "OpenAI / Travelers",
      product: "AI claims assistant",
      focus: {
        "zh-Hant": "保險理賠 AI 開始進入全國性部署",
        en: "AI-assisted insurance claims are moving into nationwide deployment",
        ja: "保険請求 AI が全国展開へ進み始める",
        ko: "보험 청구 AI가 전국 단위 배포로 이동한다",
        id: "AI untuk klaim asuransi mulai masuk ke deployment nasional",
        vi: "AI hỗ trợ xử lý bồi thường bảo hiểm bắt đầu được triển khai toàn quốc",
        th: "AI สำหรับเคลมประกันเริ่มเข้าสู่การใช้งานระดับประเทศ",
        ms: "AI untuk tuntutan insurans mula bergerak ke pelaksanaan nasional",
        fil: "pumapasok na sa nationwide deployment ang AI-assisted insurance claims"
      }
    };
  }

  const fallback = cleanSourceTitle(source.title || input.topic || "AI update");
  return {
    key: "ai-market-update",
    entity: publisher,
    product: fallback,
    focus: {
      "zh-Hant": `${publisher} 發布「${fallback}」`,
      en: `${publisher} published "${fallback}"`,
      ja: `${publisher} が「${fallback}」を公開`,
      ko: `${publisher}가 "${fallback}"를 공개`,
      id: `${publisher} merilis "${fallback}"`,
      vi: `${publisher} công bố "${fallback}"`,
      th: `${publisher} เผยแพร่ "${fallback}"`,
      ms: `${publisher} menerbitkan "${fallback}"`,
      fil: `inilathala ng ${publisher} ang "${fallback}"`
    }
  };
}

function sourceFact(language, source, date, summary) {
  const publisher = shortPublisher(source.publisher);
  const frame = inferMarketFrame({ sourceLinks: [source] });
  const title = localizedSourceTitle(language, frame, source);
  const byLanguage = {
    "zh-Hant": `${publisher}（${date}）報導了這則消息；原文標題為「${title}」。`,
    en: `${publisher} published the source story on ${date}: "${title}".`,
    ja: `${publisher} は ${date} に原文「${title}」を公開しました。`,
    ko: `${publisher}는 ${date} 원문 "${title}"를 공개했습니다.`,
    id: `${publisher} menerbitkan sumber pada ${date}: "${title}".`,
    vi: `${publisher} công bố nguồn tin vào ${date}: "${title}".`,
    th: `${publisher} เผยแพร่แหล่งข่าวเมื่อ ${date}: "${title}"`,
    ms: `${publisher} menerbitkan sumber pada ${date}: "${title}".`,
    fil: `${publisher} inilathala ang source noong ${date}: "${title}".`
  };
  return `${byLanguage[language] || byLanguage.en} ${summary}`;
}

const NEWS_LABELS = {
  "zh-Hant": {
    category: "市場快訊",
    sourceIntro: (publisher, date, title) => `${publisher} 在 ${date} 報導「${title}」。`
  },
  en: {
    category: "Market Brief",
    sourceIntro: (publisher, date, title) => `${publisher} reported on ${date}: "${title}."`
  }
};

const LOCALIZED_NEWS_LABELS = {
  ja: {
    category: "マーケット速報",
    sourceIntro: (publisher, date, title) => `${publisher} は ${date}、「${title}」と報じました。`
  },
  ko: {
    category: "시장 브리프",
    sourceIntro: (publisher, date, title) => `${publisher}는 ${date} "${title}"라고 보도했습니다.`
  },
  id: {
    category: "Kabar Pasar",
    sourceIntro: (publisher, date, title) => `${publisher} melaporkan pada ${date}: "${title}."`
  },
  vi: {
    category: "Tin nhanh thị trường",
    sourceIntro: (publisher, date, title) => `${publisher} đưa tin vào ${date}: "${title}."`
  },
  th: {
    category: "ข่าวตลาด",
    sourceIntro: (publisher, date, title) => `${publisher} รายงานเมื่อ ${date}: "${title}"`
  },
  ms: {
    category: "Berita Pasaran",
    sourceIntro: (publisher, date, title) => `${publisher} melaporkan pada ${date}: "${title}."`
  },
  fil: {
    category: "Market Brief",
    sourceIntro: (publisher, date, title) => `Iniulat ng ${publisher} noong ${date}: "${title}."`
  }
};

function labelsFor(language) {
  return NEWS_LABELS[language] || LOCALIZED_NEWS_LABELS[language] || NEWS_LABELS.en;
}

function sourceTextForArticle(article = {}) {
  return `${article.headline || ""}\n${article.standfirst || ""}\n${(article.factBullets || []).join("\n")}`.toLowerCase();
}

function knownProfile(article = {}, frame = {}) {
  const text = `${frame?.key || ""}\n${article.canonicalUrl || ""}\n${article.url || ""}\n${sourceTextForArticle(article)}`.toLowerCase();
  if (/openai.*lockdown[-\s]mode|lockdown[-\s]mode.*openai|prompt[-\s]injection.*sensitive data|提示注入.*敏感資料|プロンプトインジェクション.*機密データ/.test(text)) {
    return {
      title: {
        "zh-Hant": "OpenAI 推出 Lockdown Mode，降低 ChatGPT prompt injection 資料外洩風險",
        en: "OpenAI introduces Lockdown Mode to reduce ChatGPT prompt-injection data risks",
        ja: "OpenAI、ChatGPT の prompt injection 対策として Lockdown Mode を発表",
        ko: "OpenAI, ChatGPT prompt injection 위험 줄이는 Lockdown Mode 공개",
        id: "OpenAI merilis Lockdown Mode untuk menekan risiko data dari prompt injection ChatGPT",
        vi: "OpenAI ra mắt Lockdown Mode để giảm rủi ro dữ liệu từ prompt injection trên ChatGPT",
        th: "OpenAI เปิดตัว Lockdown Mode ลดความเสี่ยงข้อมูลจาก prompt injection ใน ChatGPT",
        ms: "OpenAI memperkenalkan Lockdown Mode untuk kurangkan risiko data akibat prompt injection ChatGPT",
        fil: "Inilabas ng OpenAI ang Lockdown Mode para bawasan ang data risk mula sa prompt injection sa ChatGPT"
      },
      standfirst: {
        "zh-Hant": "TechCrunch AI 報導，OpenAI 新增 Lockdown Mode，會關閉即時瀏覽、網路圖片擷取、deep research 與 agent mode，用來降低敏感資料遭 prompt injection 帶出系統的風險。",
        en: "TechCrunch AI reports that OpenAI's Lockdown Mode disables live browsing, web image retrieval, deep research, and agent mode to reduce prompt-injection data-exfiltration risk.",
        ja: "TechCrunch AI は、OpenAI の Lockdown Mode がリアルタイム閲覧、ウェブ画像取得、deep research、agent mode を無効にし、prompt injection によるデータ流出リスクを下げると報じました。",
        ko: "TechCrunch AI는 OpenAI의 Lockdown Mode가 실시간 웹 브라우징, 웹 이미지 검색, deep research, agent mode를 꺼 prompt injection에 따른 데이터 유출 위험을 낮춘다고 보도했습니다.",
        id: "TechCrunch AI melaporkan Lockdown Mode OpenAI mematikan live browsing, pengambilan gambar web, deep research, dan agent mode untuk menekan risiko data exfiltration akibat prompt injection.",
        vi: "TechCrunch AI đưa tin Lockdown Mode của OpenAI tắt duyệt web trực tiếp, truy xuất hình ảnh web, deep research và agent mode để giảm rủi ro dữ liệu bị đưa ra ngoài qua prompt injection.",
        th: "TechCrunch AI รายงานว่า Lockdown Mode ของ OpenAI จะปิด live browsing, การดึงภาพจากเว็บ, deep research และ agent mode เพื่อลดความเสี่ยงข้อมูลรั่วจาก prompt injection",
        ms: "TechCrunch AI melaporkan Lockdown Mode OpenAI mematikan live browsing, pengambilan imej web, deep research dan agent mode untuk mengurangkan risiko data exfiltration akibat prompt injection.",
        fil: "Iniulat ng TechCrunch AI na idi-disable ng Lockdown Mode ng OpenAI ang live browsing, web image retrieval, deep research, at agent mode para bawasan ang data-exfiltration risk mula sa prompt injection."
      }
    };
  }
  return null;
}

function profileText(profile, field, language, fallback = "") {
  const value = profile?.[field];
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[language] || value.en || value["zh-Hant"] || fallback;
}

function profileFacts(profile, language) {
  const facts = profile?.facts;
  if (!facts) return [];
  if (Array.isArray(facts)) return facts;
  return facts[language] || facts.en || facts["zh-Hant"] || [];
}

function articleTitle(language, frame, source, article, profile) {
  const profiled = profileText(profile, "title", language);
  if (profiled) return profiled;
  const sourceHeadline = cleanArticleSourceTitle(article.headline || source.title || "");
  if (sourceHeadline) return sourceHeadline;
  const focus = frame.focus?.[language] || frame.focus?.en;
  if (focus && !/generic|ai-market-update/i.test(frame.key || "") && !/source index|current ai feed|article claims should remain anchored/i.test(focus)) return focus;
  return "AI market update";
}

function cleanExistingMarketTitle(value = "", publisher = "") {
  const short = sourceArticlePublisher(publisher);
  const publisherPattern = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return normalizeNewsText(value)
    .replace(new RegExp(`\\s*[:：]\\s*reported by\\s+${publisherPattern}$`, "i"), "")
    .replace(new RegExp(`\\s*[:：]\\s*${publisherPattern}\\s*(?:報導|報道|보도)$`, "i"), "")
    .replace(new RegExp(`\\s*[:：]\\s*(?:laporan|ulat ng)\\s+${publisherPattern}$`, "i"), "")
    .replace(new RegExp(`\\s*[:：]\\s*${publisherPattern}\\s*(?:đưa tin|รายงานจาก)$`, "i"), "")
    .replace(new RegExp(`\\s*[:：]\\s*รายงานจาก\\s+${publisherPattern}$`, "i"), "")
    .replace(/\s*[:：]\s*reported by\s+[A-Za-z /]+$/i, "")
    .replace(/\s*[:：]\s*(laporan|ulat ng)\s+[A-Za-z /]+$/i, "")
    .replace(/\s*[:：]\s*[A-Za-z /]+\s*(đưa tin|보도|報道)$/i, "")
    .replace(/\s*[:：]\s*รายงานจาก\s+[A-Za-z /]+$/i, "")
    .replace(/\s*[:：]\s*(TechCrunch|OpenAI|Google|Microsoft|NVIDIA|Anthropic|Hugging Face Blog|Vercel)\s*報導$/i, "")
    .replace(/\bI\s*\/\s*O\b/g, "I/O")
    .trim();
}

function usableExistingMarketTitle(value = "") {
  const text = normalizeNewsText(value);
  if (text.length < 8 || text.length > 160) return false;
  if (/這則消息可以拿來|來源轉譯|source|source index|article claims should remain anchored/i.test(text)) return false;
  if (/市場訊號|market signal/i.test(text)) return false;
  if (/tool procurement|daily operations|supply[- ]chain question|governance lens/i.test(text)) return false;
  if (/^.+ published ["「]/i.test(text)) return false;
  if (/^(OpenAI|Google|Microsoft|NVIDIA|Anthropic|Vercel|Hugging Face|TechCrunch).*(發布|公開|merilis|menerbitkan|công bố|เผยแพร่|inilathala|공개|公開).*(["「]).*[A-Za-z]{4}/i.test(text)) return false;
  if (/^(OpenAI|Google|Microsoft|NVIDIA|Anthropic|Vercel|Hugging Face|TechCrunch).*(["「])[^"」]*[A-Za-z]{4}[^"」]*(["」])?.*(發布|公開|merilis|menerbitkan|công bố|เผยแพร่|inilathala|공개|公開)/i.test(text)) return false;
  return true;
}

function titleCompatibleWithArticle(title = "", article = {}, frame = {}) {
  const normalizedTitle = normalizeNewsText(title).toLowerCase();
  const sourceText = `${article.headline || ""} ${article.standfirst || ""} ${frame.key || ""}`.toLowerCase();
  if (/cosmos|physical ai/.test(sourceText) && !/cosmos|nvidia|physical ai|피지컬 ai|fizikal|thể chất|กายภาพ/.test(normalizedTitle)) {
    return false;
  }
  if (/mufg|ai-native|ai native/.test(sourceText) && !/mufg|openai|ai-native|financial|finance|金融|keuangan|tài chính|การเงิน|kewangan/.test(normalizedTitle)) {
    return false;
  }
  if (/grok imagine|ai gateway|vercel/.test(sourceText) && !/grok|vercel|gateway|model|โมเดล|modelo|mô hình/.test(normalizedTitle)) {
    return false;
  }
  if (/grok imagine/.test(sourceText) && !/grok|imagine|1\.5/.test(normalizedTitle)) {
    return false;
  }
  return true;
}

function usableSourceSummary(value = "") {
  const text = normalizeNewsText(value);
  if (!text) return "";
  if (/^A Blog post by .* on Hugging Face\b/i.test(text)) return "";
  if (/Source:\s|Event:\s|Evidence:\s|Decision cue|source index|article claims should remain anchored/i.test(text)) return "";
  return text;
}

function includesPublisher(text = "", publisher = "") {
  const normalizedPublisher = sourceArticlePublisher(publisher);
  if (!normalizedPublisher) return true;
  return normalizeNewsText(text).toLowerCase().includes(normalizedPublisher.toLowerCase());
}

function sourceLeadWithPublisher(language, publisher, text = "") {
  const cleanText = cleanReportLead(cleanMarketPublicText(text, language));
  if (!cleanText || includesPublisher(cleanText, publisher)) return cleanText;
  const cleanPublisher = sourceArticlePublisher(publisher);
  const byLanguage = {
    "zh-Hant": `${cleanPublisher} 報導，${cleanText}`,
    en: `${cleanPublisher} reports that ${cleanText}`,
    ja: `${cleanPublisher} によると、${cleanText}`,
    ko: `${cleanPublisher}에 따르면 ${cleanText}`,
    id: `${cleanPublisher} melaporkan, ${cleanText}`,
    vi: `${cleanPublisher} đưa tin, ${cleanText}`,
    th: `${cleanPublisher} รายงานว่า ${cleanText}`,
    ms: `${cleanPublisher} melaporkan, ${cleanText}`,
    fil: `Iniulat ng ${cleanPublisher}: ${cleanText}`
  };
  return cleanMarketPublicText(byLanguage[language] || byLanguage.en, language);
}

function sentenceEnd(language = "") {
  return language === "zh-Hant" || language === "ja" || language === "ko" ? "。" : ".";
}

function splitReadableSentences(value = "") {
  const decimalDot = "__ALTOS_DECIMAL_DOT__";
  const text = normalizeNewsText(value).replace(/(\d)\.(\d)/g, `$1${decimalDot}$2`);
  const matches = text.match(/[^。！？.!?]+[。！？.!?]?/g) || [];
  return matches.map((sentence) => sentence.replaceAll(decimalDot, ".").trim()).filter(Boolean);
}

function primaryTitleEntity(title = "") {
  const match = normalizeNewsText(title).match(/\b(?:Amazon|Google|Microsoft|OpenAI|Anthropic|NVIDIA|Vercel|Lovable|Coralogix|AethexAI|IBM|Hugging Face|MUFG|Codex|Gemini|Claude|ChatGPT|Grok)\b/i);
  return match?.[0] || "";
}

function publisherLeadPrefix(value = "") {
  return normalizeNewsText(value).match(/^(.*?(?:報導|指出|reported|reports|says|によると|報じました|에 따르면|melaporkan|đưa tin|รายงานว่า|Iniulat ng)[,，:：]?\s*)/i)?.[1] || "";
}

function compactNewsDeck(language, title, standfirst) {
  const text = cleanMarketPublicText(standfirst, language);
  const sentences = splitReadableSentences(text);
  let first = sentences[0] || text;
  const entity = primaryTitleEntity(title);
  if (entity && !first.toLowerCase().includes(entity.toLowerCase()) && /該公司|這家公司|這家|the company|the retailer|the startup|公司堅稱/i.test(first)) {
    const prefix = publisherLeadPrefix(first);
    const cleaned = first
      .replace(prefix, "")
      .replace(/^該公司/, "公司")
      .replace(/^這家公司|^這家/, "公司")
      .replace(/^the company/i, "the company")
      .trim();
    first = `${prefix}${title}${sentenceEnd(language)} ${cleaned}`;
  }
  return truncate(cleanMarketPublicText(first, language), 190);
}

function compactFact(value = "", language = "", limit = 180) {
  const sentence = splitReadableSentences(value)[0] || value;
  return truncate(cleanMarketPublicText(sentence, language), limit);
}

function isOrphanContinuationFact(value = "") {
  return /^(然後|接著|随后|之後|Then|And then|After that|Kemudian|Selanjutnya|Sau đó|ต่อจากนั้น|Pagkatapos)/i.test(normalizeNewsText(value));
}

function continuationTail(value = "", language = "") {
  const text = cleanMarketPublicText(value, language)
    .replace(/^(然後|接著|随后|之後)\s*/i, "")
    .replace(/^(Then|And then|After that)\s*/i, "")
    .replace(/^(Kemudian|Selanjutnya|Sau đó|ต่อจากนั้น|Pagkatapos)\s*/i, "")
    .trim();
  return text.replace(/[。.!?！？]+$/, "");
}

function mergeContinuationFacts(facts = [], language = "") {
  const merged = [];
  for (const fact of facts) {
    if (isOrphanContinuationFact(fact) && merged.length) {
      const tail = continuationTail(fact, language);
      const separator = language === "zh-Hant" || language === "ja" || language === "ko" ? "，" : ", ";
      if (tail) merged[merged.length - 1] = `${merged[merged.length - 1].replace(/[。.!?！？]+$/, "")}${separator}${tail}${sentenceEnd(language)}`;
      continue;
    }
    merged.push(fact);
  }
  return merged;
}

function hasImportantNewsNumber(value = "") {
  return /(?:[$€£]|US\$|AS\$)?\s*\d[\d,.]*(?:\s*(?:k|m|b|bn|tn|million|billion|trillion|億|亿|억|ドル|달러|juta|triệu|ล้าน|milyon|usd|美元|美金|倍|x|%|calls?|users?|parameters?|organizations?|countries?|通電話|參數|家|國))/i.test(
    normalizeNewsText(value)
  );
}

function includeTitleWhenItCarriesNumbers(title = "", standfirst = "", language = "") {
  const cleanTitle = cleanMarketPublicText(title, language);
  const cleanStandfirst = cleanMarketPublicText(standfirst, language);
  if (!cleanTitle) return cleanStandfirst;
  if (hasImportantNewsNumber(cleanTitle) && !hasImportantNewsNumber(cleanStandfirst)) {
    const separator = language === "zh-Hant" || language === "ja" ? "。" : ".";
    return cleanMarketPublicText(`${cleanTitle}${separator} ${cleanStandfirst}`, language);
  }
  return cleanStandfirst;
}

function articleStandfirst(language, frame, source, article, profile) {
  const profiled = profileText(profile, "standfirst", language);
  if (profiled) return cleanMarketPublicText(profiled, language);
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const date = formatDate(article.publishedAt || source.publishedAt, language);
  const sourceSummary = publicArticleStandfirst(article, source);
  const fallbackSummary = usableSourceSummary(source.summary || "");
  const title = articleTitle(language, frame, source, article, profile);
  const sourceSummaryLooksEnglish =
    article.localizedLanguage !== language &&
    /[a-z]{4,}\s+[a-z]{4,}/i.test(sourceSummary) &&
    !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(sourceSummary);
  let standfirst = "";
  if (language === "en" && sourceSummary) standfirst = sourceSummary;
  else if (language === "zh-Hant") {
    if (sourceSummary && !sourceSummaryLooksEnglish) standfirst = sourceSummary;
    else standfirst = localizedSourceSummary(language, { ...source, summary: sourceSummary || fallbackSummary || title }, frame) || title;
  } else if (sourceSummary && !sourceSummaryLooksEnglish) {
    standfirst = sourceSummary;
  } else {
    standfirst = localizedSourceSummary(language, { ...source, summary: sourceSummary || fallbackSummary || title }, frame) || title;
  }
  const numberCarrier =
    language === "en" || article.localizedLanguage === language
      ? article.headline || source.title || title
      : title;
  standfirst = includeTitleWhenItCarriesNumbers(numberCarrier, standfirst, language);
  return sourceLeadWithPublisher(language, publisher, standfirst);
}

function localizedFallbackFacts(language, frame, source, article, publisher, title, numbers = [], entities = []) {
  const localizedSummary = localizedSourceSummary(language, source, frame);
  const numberText = numbers.slice(0, 4).join(", ");
  const entityText = entities.slice(0, 5).join(", ");
  const byLanguage = {
    "zh-Hant": [
      localizedSummary,
      entityText && numberText ? `報導牽涉 ${entityText}；文中提到 ${numberText}。` : "",
      !numberText && entityText ? `報導牽涉 ${entityText}。` : "",
      numberText && !entityText ? `文中提到 ${numberText}。` : ""
    ],
    en: [
      localizedSummary,
      entityText && numberText ? `The story involves ${entityText}; figures in the report include ${numberText}.` : "",
      !numberText && entityText ? `The story involves ${entityText}.` : "",
      numberText && !entityText ? `Figures in the report include ${numberText}.` : ""
    ],
    ja: [
      localizedSummary,
      entityText && numberText ? `報道では ${entityText} に触れ、数字として ${numberText} が示されています。` : "",
      !numberText && entityText ? `報道では ${entityText} に触れています。` : "",
      numberText && !entityText ? `文中では ${numberText} が示されています。` : ""
    ],
    ko: [
      localizedSummary,
      entityText && numberText ? `보도에는 ${entityText}가 언급됐고, 숫자로는 ${numberText}가 제시됐습니다.` : "",
      !numberText && entityText ? `보도에는 ${entityText}가 언급됐습니다.` : "",
      numberText && !entityText ? `본문에는 ${numberText}가 제시됐습니다.` : ""
    ],
    id: [
      localizedSummary,
      entityText && numberText ? `Laporan ini menyebut ${entityText}; angkanya mencakup ${numberText}.` : "",
      !numberText && entityText ? `Laporan ini menyebut ${entityText}.` : "",
      numberText && !entityText ? `Angka yang disebut mencakup ${numberText}.` : ""
    ],
    vi: [
      localizedSummary,
      entityText && numberText ? `Bài viết nhắc tới ${entityText}; các con số được nêu gồm ${numberText}.` : "",
      !numberText && entityText ? `Bài viết nhắc tới ${entityText}.` : "",
      numberText && !entityText ? `Các con số được nêu gồm ${numberText}.` : ""
    ],
    th: [
      localizedSummary,
      entityText && numberText ? `รายงานกล่าวถึง ${entityText} และระบุตัวเลข ${numberText}` : "",
      !numberText && entityText ? `รายงานกล่าวถึง ${entityText}` : "",
      numberText && !entityText ? `ตัวเลขที่ถูกกล่าวถึงคือ ${numberText}` : ""
    ],
    ms: [
      localizedSummary,
      entityText && numberText ? `Laporan ini menyebut ${entityText}; angkanya termasuk ${numberText}.` : "",
      !numberText && entityText ? `Laporan ini menyebut ${entityText}.` : "",
      numberText && !entityText ? `Angka yang disebut termasuk ${numberText}.` : ""
    ],
    fil: [
      localizedSummary,
      entityText && numberText ? `Binanggit sa ulat ang ${entityText}; kasama sa mga numero ang ${numberText}.` : "",
      !numberText && entityText ? `Binanggit sa ulat ang ${entityText}.` : "",
      numberText && !entityText ? `Kasama sa mga numerong binanggit ang ${numberText}.` : ""
    ]
  };
  return (byLanguage[language] || byLanguage.en).filter(Boolean).slice(0, 4);
}

function factsForArticle(language, frame, source, article, profile) {
  const profiled = profileFacts(profile, language);
  if (profiled.length) return profiled;
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const title = articleTitle(language, frame, source, article, profile);
  const normalizedTitle = normalizeNewsText(title).toLowerCase();
  const sourceFacts = (article.factBullets || [])
    .map(publicArticleFact)
    .filter(Boolean)
    .filter((fact) => {
      const normalizedFact = normalizeNewsText(fact).toLowerCase();
      if (!normalizedFact) return false;
      if (normalizedTitle && normalizedFact.includes(normalizedTitle)) return false;
      if (normalizedFact.startsWith(`${publisher.toLowerCase()} 報導`) && normalizedTitle && normalizedFact.length < normalizedTitle.length + 24) return false;
      if (/^techcrunch\s*(報導|reported)/i.test(normalizedFact) && normalizedTitle && normalizedFact.includes(normalizedTitle.slice(0, Math.min(24, normalizedTitle.length)))) return false;
      return true;
    })
    .slice(0, 8);
  if (article.localizedLanguage === language) return sourceFacts;
  if (language === "en") return sourceFacts;
  if (!sourceFacts.some((fact) => /[a-z]{4,}\s+[a-z]{4,}/i.test(fact))) return sourceFacts;
  return [];
}

function localizedFactsForArticle(language, frame, source, article, profile, lead = "") {
  const title = articleTitle(language, frame, source, article, profile);
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const explicitFacts = factsForArticle(language, frame, source, article, profile)
    .map((fact) => cleanMarketPublicText(fact, language))
    .filter(Boolean);
  const fallbackFacts = localizedFallbackFacts(
    language,
    frame,
    { ...source, summary: publicArticleStandfirst(article, source) || source.summary || title },
    article,
    publisher,
    title,
    article.numbers || [],
    article.entities || []
  )
    .map((fact) => cleanMarketPublicText(fact, language))
    .filter(Boolean);
  const combined = explicitFacts.length ? explicitFacts : fallbackFacts;
  return mergeContinuationFacts(combined, language)
    .filter((fact) => !lead || factDiffersFromLead(fact, lead))
    .filter((fact, index, list) => list.findIndex((candidate) => !factDiffersFromLead(fact, candidate)) === index)
    .slice(0, 7);
}

function sourceDetailParagraph(language, publisher, date, title, article = {}, source = {}, localizedFact = "") {
  const canonical = article.canonicalUrl || source.url || "";
  const sourceTitle = cleanArticleSourceTitle(article.headline || source.title || title);
  const fact = localizedFact || (article.factBullets || []).map(publicArticleFact).filter(Boolean)[0] || publicArticleStandfirst(article, source) || title;
  const host = (() => {
    try {
      return canonical ? new URL(canonical).hostname.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  })();
  const sourceNote = {
    "zh-Hant": "後續若有公司、平台或主管機關補充，仍應回到原文與官方資料對照。",
    en: "If companies, platforms, or regulators issue follow-up statements, the original report and official materials should remain the reference point.",
    ja: "企業、プラットフォーム、規制当局が続報を出す場合も、原文と公式資料を参照点にする必要があります。",
    ko: "기업, 플랫폼, 규제 기관이 후속 입장을 내더라도 원문과 공식 자료가 기준점이 됩니다.",
    id: "Jika perusahaan, platform, atau regulator memberi pernyataan lanjutan, laporan asli dan materi resmi tetap menjadi rujukan utama.",
    vi: "Nếu doanh nghiệp, nền tảng hoặc cơ quan quản lý có phản hồi tiếp theo, bài gốc và tài liệu chính thức vẫn là điểm đối chiếu chính.",
    th: "หากบริษัท แพลตฟอร์ม หรือหน่วยงานกำกับดูแลมีคำชี้แจงเพิ่มเติม รายงานต้นทางและเอกสารทางการยังควรเป็นจุดอ้างอิงหลัก",
    ms: "Jika syarikat, platform atau pengawal selia mengeluarkan kenyataan susulan, laporan asal dan bahan rasmi kekal sebagai rujukan utama.",
    fil: "Kapag naglabas ng follow-up statement ang kumpanya, platform, o regulator, ang orihinal na ulat at official materials pa rin ang pangunahing reference."
  }[language] || "If companies, platforms, or regulators issue follow-up statements, the original report and official materials should remain the reference point.";
  const byLanguage = {
    "zh-Hant": `${publisher} 的報導把事件放在 ${date} 的公開脈絡中，讀者可從來源連結回查原文、圖片出處與後續更新。${sourceNote}${fact}`,
    en: `The original headline is "${sourceTitle}." ${publisher} placed the story in its ${date} coverage, and the source link lets readers check the original report, image attribution, and follow-up updates. ${sourceNote} ${fact}`,
    ja: `${publisher} は ${date} の報道としてこの出来事を扱っており、出典リンクから原文、画像クレジット、続報を確認できます。${sourceNote}${fact}`,
    ko: `${publisher}는 이 사안을 ${date} 보도로 다뤘고, 출처 링크에서 원문, 이미지 출처, 후속 업데이트를 확인할 수 있습니다. ${sourceNote} ${fact}`,
    id: `${publisher} menempatkan kabar ini dalam liputan ${date}; tautan sumber dapat dipakai untuk memeriksa laporan asli, atribusi gambar, dan pembaruan lanjutan. ${sourceNote} ${fact}`,
    vi: `${publisher} đặt câu chuyện này trong bản tin ngày ${date}; liên kết nguồn giúp độc giả kiểm tra bài gốc, ghi nhận hình ảnh và cập nhật tiếp theo. ${sourceNote} ${fact}`,
    th: `${publisher} รายงานเรื่องนี้เมื่อ ${date} ลิงก์แหล่งข่าวช่วยให้ตรวจสอบต้นฉบับ เครดิตภาพ และอัปเดตต่อเนื่องได้ ${sourceNote} ${fact}`,
    ms: `${publisher} meletakkan berita ini dalam liputan ${date}; pautan sumber membolehkan pembaca menyemak laporan asal, atribusi imej dan kemas kini susulan. ${sourceNote} ${fact}`,
    fil: `Inilagay ito ng ${publisher} sa coverage noong ${date}; puwedeng balikan sa source link ang orihinal na ulat, image attribution, at follow-up updates. ${sourceNote} ${fact}`
  };
  return `${byLanguage[language] || byLanguage.en}${host ? ` (${host})` : ""}`;
}

function sentenceJoin(items = [], language = "") {
  const end = sentenceEnd(language);
  return items
    .map((item) => normalizeNewsText(item))
    .filter(Boolean)
    .map((item) => (/[.!?。！？]$/.test(item) ? item : `${item}${end}`))
    .join(" ");
}

function comparableNewsText(value = "") {
  return normalizeNewsText(value)
    .toLowerCase()
    .replace(/^(techcrunch|the verge|wired|venturebeat|mit technology review)\s*(報導|reported|reports|指出|稱)[,，:：]?\s*/i, "")
    .replace(/^(報導指出|據報導|據報道|報導稱)[,，]?\s*/i, "")
    .replace(/[，。,.!?！？；;:\s]/g, "");
}

function overlapRatio(a = "", b = "") {
  const left = comparableNewsText(a);
  const right = comparableNewsText(b);
  if (!left || !right) return 0;
  const n = left.length >= 18 || right.length >= 18 ? 3 : 2;
  const grams = (text) => {
    if (text.length <= n) return new Set([text]);
    const set = new Set();
    for (let index = 0; index <= text.length - n; index += 1) set.add(text.slice(index, index + n));
    return set;
  };
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  let shared = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) shared += 1;
  }
  return shared / Math.min(leftGrams.size, rightGrams.size);
}

function factDiffersFromLead(fact = "", lead = "") {
  const normalizedFact = comparableNewsText(fact);
  const normalizedLead = comparableNewsText(lead);
  if (!normalizedFact) return false;
  if (!normalizedLead) return true;
  if (normalizedLead.includes(normalizedFact) || normalizedFact.includes(normalizedLead)) return false;
  if (overlapRatio(fact, lead) >= 0.58) return false;
  const overlapLength = Math.min(normalizedFact.length, normalizedLead.length);
  if (overlapLength >= 48 && normalizedLead.slice(0, overlapLength).includes(normalizedFact.slice(0, Math.min(48, normalizedFact.length)))) return false;
  return true;
}

function sourceBodyParagraphCandidates(article = {}, language = "", lead = "") {
  const rawParagraphs = Array.isArray(article.bodyParagraphs) && article.bodyParagraphs.length
    ? article.bodyParagraphs
    : String(article.body || "").split(/\n{2,}/);
  const seen = new Set();
  return rawParagraphs
    .map((paragraph) => cleanMarketPublicText(paragraph, language))
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => {
      if (paragraph.length < 42) return false;
      if (/^(Image Credits|Tags?|Topics?|Read more|Sign up|Subscribe|Advertisement|Recommended|Related|Share this)/i.test(paragraph)) return false;
      if (/newsletter|sign up|subscribe|advertisement|cookie|privacy policy|terms of service/i.test(paragraph)) return false;
      if (lead && !factDiffersFromLead(paragraph, lead)) return false;
      const key = comparableNewsText(paragraph);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);
}

function sourceBodyParagraphs(language, publisher, lead = "", article = {}) {
  const candidates = sourceBodyParagraphCandidates(article, language, lead);
  if (candidates.length < 2) return [];
  const paragraphs = [];
  for (const paragraph of candidates) {
    if (paragraphs.some((existing) => !factDiffersFromLead(paragraph, existing))) continue;
    paragraphs.push(paragraph);
    if (paragraphs.length >= 7) break;
  }
  const totalLength = paragraphs.join("").length;
  const floor = ["en", "id", "vi", "ms", "fil"].includes(language) ? 520 : 260;
  return totalLength >= floor ? paragraphs : [];
}

function stripGenericNewsOpening(value = "", language = "") {
  return cleanMarketPublicText(value, language)
    .replace(/^(如今|現在|當前)[，,\s]*/i, "")
    .replace(/^(Today|Nowadays|Now)[,，\s]*/i, "")
    .replace(/^(現在|今日)[、，\s]*/i, "")
    .replace(/^(오늘|현재)[,，\s]*/i, "")
    .replace(/^(Hari ini|Sekarang)[,，\s]*/i, "")
    .replace(/^(Hôm nay|Hiện nay)[,，\s]*/i, "")
    .replace(/^(วันนี้|ขณะนี้)\s*/i, "")
    .replace(/^(Ngayon|Sa ngayon)[,，\s]*/i, "")
    .trim();
}

function sourceEventOpeningParagraph(language, publisher, date, paragraph = "", title = "") {
  const detail = stripGenericNewsOpening(paragraph, language);
  if (!detail) return "";
  const cleanPublisher = sourceArticlePublisher(publisher);
  const cleanTitle = cleanMarketPublicText(title, language);
  const titlePrefix =
    cleanTitle &&
    !detail.toLowerCase().includes(cleanTitle.toLowerCase()) &&
    /AI|OpenAI|Gemini|Claude|ChatGPT|agent|automation|search|model|Google|Microsoft|NVIDIA/i.test(cleanTitle)
      ? cleanTitle
      : "";
  const byLanguage = {
    "zh-Hant": titlePrefix ? `${cleanPublisher} 在${date}報導「${titlePrefix}」，${detail}` : `${cleanPublisher} 在${date}報導，${detail}`,
    en: titlePrefix ? `${cleanPublisher}'s ${date} report on ${titlePrefix} says: ${detail}` : `${cleanPublisher}'s ${date} report says: ${detail}`,
    ja: titlePrefix ? `${cleanPublisher} は${date}の記事で「${titlePrefix}」について、${detail}` : `${cleanPublisher} は${date}の記事で、${detail}`,
    ko: titlePrefix ? `${cleanPublisher}는 ${date} 보도에서 ${titlePrefix}에 대해 다음과 같이 설명했습니다. ${detail}` : `${cleanPublisher}는 ${date} 보도에서 다음과 같이 설명했습니다. ${detail}`,
    id: titlePrefix ? `Dalam laporan pada ${date} tentang ${titlePrefix}, ${cleanPublisher} menyebut: ${detail}` : `Dalam laporan pada ${date}, ${cleanPublisher} menyebut: ${detail}`,
    vi: titlePrefix ? `Trong bài viết ngày ${date} về ${titlePrefix}, ${cleanPublisher} cho biết: ${detail}` : `Trong bài viết ngày ${date}, ${cleanPublisher} cho biết: ${detail}`,
    th: titlePrefix ? `ในรายงานเมื่อ ${date} เกี่ยวกับ ${titlePrefix} ${cleanPublisher} ระบุว่า ${detail}` : `ในรายงานเมื่อ ${date} ${cleanPublisher} ระบุว่า ${detail}`,
    ms: titlePrefix ? `Dalam laporan pada ${date} tentang ${titlePrefix}, ${cleanPublisher} menyatakan: ${detail}` : `Dalam laporan pada ${date}, ${cleanPublisher} menyatakan: ${detail}`,
    fil: titlePrefix ? `Sa ulat noong ${date} tungkol sa ${titlePrefix}, sinabi ng ${cleanPublisher}: ${detail}` : `Sa ulat noong ${date}, sinabi ng ${cleanPublisher}: ${detail}`
  };
  return cleanMarketPublicText(byLanguage[language] || byLanguage.en, language);
}

function sourceOpeningParagraphIndex(paragraphs = []) {
  const index = paragraphs.findIndex((paragraph) => {
    const text = normalizeNewsText(paragraph);
    if (text.length < 170) return false;
    if (/^(Helping|Membantu|Hỗ trợ|Pagtulong|ช่วย|企業が|고객은|Pelanggan|Maaaring)/i.test(text)) return false;
    return true;
  });
  return index >= 0 ? index : 0;
}

function sourceSpecificBody(language, frame, source, article) {
  const text = `${frame?.key || ""} ${article.headline || ""} ${source.title || ""}`.toLowerCase();
  if (/openai.*lockdown[-\s]mode|lockdown[-\s]mode.*openai|prompt[-\s]injection.*sensitive data|提示注入.*敏感資料|プロンプトインジェクション.*機密データ/.test(text)) {
    return {
      "zh-Hant": "TechCrunch AI 報導，OpenAI 推出 Lockdown Mode，目標是降低 ChatGPT 在處理敏感資料時遭遇 prompt injection 後外洩資料的風險。Prompt injection 指的是惡意指令被藏在網頁、文件或其他內容來源中，讓模型在讀取資料時被帶往攻擊者想要的行為。\n\n這個模式會限制 ChatGPT 能接觸的外部內容。報導提到，Lockdown Mode 會關閉即時網頁瀏覽、網路圖片擷取與顯示、deep research，以及 agent mode；使用者仍可讀取快取內容，也仍可生成圖片。\n\nOpenAI 同時提醒，Lockdown Mode 不是完整防線。prompt injection 仍會出現在快取網頁內容或上傳檔案中，並影響回覆的行為或準確度；因此這項功能的重點不是消除所有攻擊，而是降低敏感資料被帶出系統的機率。\n\n報導指出，OpenAI 把 Lockdown Mode 定位給處理敏感資料的個人與組織，而不是一般使用者都必須開啟的模式。公司目前正把這項功能推向自助式 ChatGPT Business 帳戶與符合資格的個人帳戶。",
        en: "TechCrunch AI reports that OpenAI has introduced Lockdown Mode to reduce the risk that sensitive data is exposed when ChatGPT encounters prompt injection. Prompt injection is the attack pattern in which malicious instructions are hidden inside webpages, files, or other content sources that a model reads.\n\nThe mode narrows what ChatGPT can reach outside the conversation. According to the report, Lockdown Mode disables live web browsing, web image retrieval and display, deep research, and agent mode; users can still access cached content and generate images. In plain terms, it limits external browsing and tool-like actions before sensitive work leaves the chat.\n\nOpenAI also says the mode is not a complete defense. Prompt injection can still appear in cached web content or uploaded files and affect the behavior or accuracy of a response, so the feature is meant to reduce data-exfiltration risk rather than remove every attack path.\n\nThe report says OpenAI is positioning Lockdown Mode for people and organizations that handle sensitive data, not as a setting every user needs to turn on. The company is rolling it out to self-service ChatGPT Business accounts and eligible individual accounts.",
      ja: "TechCrunch AI は、OpenAI が ChatGPT の Lockdown Mode を発表したと報じました。狙いは、機密データを扱う場面で prompt injection によるデータ流出リスクを下げることです。Prompt injection は、モデルが読むウェブページ、ファイル、その他のコンテンツに悪意ある指示を隠す攻撃手法です。\n\nこのモードでは、ChatGPT が会話外でアクセスできる範囲が狭くなります。報道によると、Lockdown Mode はリアルタイムのウェブ閲覧、ウェブ画像の取得と表示、deep research、agent mode を無効にします。キャッシュされた内容の参照と画像生成は引き続き使えます。\n\nOpenAI は、このモードが完全な防御策ではないとも説明しています。Prompt injection はキャッシュされたウェブ内容やアップロード済みファイルにも残り、回答の挙動や正確性に影響します。そのため、目的は攻撃経路をすべて消すことではなく、データ流出リスクを下げることです。\n\n報道では、OpenAI が Lockdown Mode を機密データを扱う個人と組織向けの機能として位置づけているとされています。一般利用者全員が常時オンにする設定ではなく、現在はセルフサービス型の ChatGPT Business アカウントと対象となる個人アカウントへ展開されています。",
      ko: "TechCrunch AI는 OpenAI가 ChatGPT용 Lockdown Mode를 공개했다고 보도했습니다. 목적은 민감한 데이터를 다룰 때 prompt injection으로 데이터가 노출되는 위험을 낮추는 것입니다. Prompt injection은 모델이 읽는 웹페이지, 파일, 기타 콘텐츠 안에 악성 지시를 숨기는 공격 방식입니다.\n\n이 모드는 ChatGPT가 대화 밖에서 접근할 수 있는 범위를 줄입니다. 보도에 따르면 Lockdown Mode는 실시간 웹 브라우징, 웹 이미지 검색과 표시, deep research, agent mode를 비활성화합니다. 캐시된 콘텐츠 접근과 이미지 생성은 계속 가능합니다.\n\nOpenAI는 이 모드가 완전한 방어책은 아니라고 설명합니다. Prompt injection은 캐시된 웹 콘텐츠나 업로드된 파일에도 남아 응답의 동작과 정확도에 영향을 줄 수 있습니다. 따라서 핵심은 모든 공격 경로를 제거하는 것이 아니라 데이터 유출 위험을 낮추는 데 있습니다.\n\n보도에 따르면 OpenAI는 Lockdown Mode를 민감한 데이터를 다루는 개인과 조직을 위한 기능으로 보고 있습니다. 모든 사용자가 항상 켜야 하는 설정이 아니라, 현재 셀프서비스 ChatGPT Business 계정과 자격을 갖춘 개인 계정에 배포되고 있습니다.",
      id: "TechCrunch AI melaporkan OpenAI merilis Lockdown Mode untuk menurunkan risiko kebocoran data sensitif saat ChatGPT berhadapan dengan prompt injection. Prompt injection adalah pola serangan ketika instruksi berbahaya disembunyikan di halaman web, file, atau sumber konten lain yang dibaca model.\n\nMode ini mempersempit akses ChatGPT ke konten di luar percakapan. Menurut laporan tersebut, Lockdown Mode menonaktifkan live web browsing, pengambilan dan tampilan gambar dari web, deep research, serta agent mode; pengguna tetap bisa membuka konten cache dan membuat gambar.\n\nOpenAI juga menyatakan mode ini bukan pertahanan penuh. Prompt injection tetap bisa muncul di konten web yang tersimpan di cache atau file yang diunggah, lalu memengaruhi perilaku atau akurasi jawaban. Jadi, fokusnya adalah mengurangi risiko data exfiltration, bukan menghapus semua jalur serangan.\n\nLaporan itu menyebut OpenAI menempatkan Lockdown Mode untuk orang dan organisasi yang menangani data sensitif, bukan sebagai pengaturan yang wajib dinyalakan semua pengguna. Fitur ini sedang diluncurkan untuk akun ChatGPT Business self-service dan akun individual yang memenuhi syarat.",
      vi: "TechCrunch AI đưa tin OpenAI ra mắt Lockdown Mode nhằm giảm rủi ro lộ dữ liệu nhạy cảm khi ChatGPT gặp prompt injection. Prompt injection là kiểu tấn công trong đó hướng dẫn độc hại được giấu trong trang web, tệp hoặc nguồn nội dung khác mà mô hình đọc vào.\n\nChế độ này thu hẹp những gì ChatGPT có thể truy cập ngoài cuộc trò chuyện. Theo bài viết, Lockdown Mode tắt duyệt web trực tiếp, truy xuất và hiển thị hình ảnh từ web, deep research và agent mode; người dùng vẫn có thể mở nội dung đã lưu trong cache và tạo hình ảnh.\n\nOpenAI cũng nói rõ đây không phải lớp phòng thủ tuyệt đối. Prompt injection vẫn có thể nằm trong nội dung web được cache hoặc tệp đã tải lên, rồi ảnh hưởng đến hành vi hoặc độ chính xác của câu trả lời. Vì vậy, mục tiêu là giảm rủi ro dữ liệu bị đưa ra ngoài, không phải loại bỏ mọi đường tấn công.\n\nBài viết cho biết OpenAI định vị Lockdown Mode cho cá nhân và tổ chức xử lý dữ liệu nhạy cảm, không phải cài đặt mà mọi người dùng đều cần bật. Tính năng đang được triển khai cho tài khoản ChatGPT Business self-service và một số tài khoản cá nhân đủ điều kiện.",
      th: "TechCrunch AI รายงานว่า OpenAI เปิดตัว Lockdown Mode เพื่อลดความเสี่ยงที่ข้อมูลอ่อนไหวจะรั่วไหลเมื่อ ChatGPT เจอกับ prompt injection โดย prompt injection คือรูปแบบโจมตีที่ซ่อนคำสั่งไม่พึงประสงค์ไว้ในหน้าเว็บ ไฟล์ หรือแหล่งคอนเทนต์อื่นที่โมเดลอ่านเข้าไป\n\nโหมดนี้จำกัดสิ่งที่ ChatGPT เข้าถึงได้นอกบทสนทนา รายงานระบุว่า Lockdown Mode จะปิด live web browsing การดึงและแสดงภาพจากเว็บ deep research และ agent mode แต่ผู้ใช้ยังเปิดคอนเทนต์ที่ถูก cache ไว้และยังสร้างภาพได้\n\nOpenAI ระบุด้วยว่าโหมดนี้ไม่ใช่เกราะป้องกันทั้งหมด Prompt injection ยังอยู่ในคอนเทนต์เว็บที่ cache ไว้หรือไฟล์ที่อัปโหลด และยังส่งผลต่อพฤติกรรมหรือความแม่นยำของคำตอบได้ ดังนั้นเป้าหมายคือการลดความเสี่ยง data exfiltration ไม่ใช่ลบทุกเส้นทางโจมตี\n\nรายงานบอกว่า OpenAI วาง Lockdown Mode ไว้สำหรับบุคคลและองค์กรที่จัดการข้อมูลอ่อนไหว ไม่ใช่การตั้งค่าที่ผู้ใช้ทุกคนต้องเปิดตลอดเวลา ฟีเจอร์นี้กำลังทยอยไปยังบัญชี ChatGPT Business แบบ self-service และบัญชีบุคคลที่เข้าเกณฑ์",
      ms: "TechCrunch AI melaporkan OpenAI memperkenalkan Lockdown Mode untuk mengurangkan risiko data sensitif terdedah apabila ChatGPT berdepan prompt injection. Prompt injection ialah corak serangan yang menyembunyikan arahan berniat jahat dalam halaman web, fail atau sumber kandungan lain yang dibaca oleh model.\n\nMod ini mengecilkan akses ChatGPT kepada kandungan di luar perbualan. Menurut laporan itu, Lockdown Mode mematikan live web browsing, pengambilan dan paparan imej daripada web, deep research serta agent mode; pengguna masih boleh membuka kandungan cache dan menjana imej.\n\nOpenAI turut menjelaskan bahawa mod ini bukan pertahanan penuh. Prompt injection masih boleh wujud dalam kandungan web yang disimpan cache atau fail yang dimuat naik, lalu menjejaskan tingkah laku atau ketepatan jawapan. Jadi, matlamatnya ialah mengurangkan risiko data exfiltration, bukan menghapuskan semua laluan serangan.\n\nLaporan itu menyebut OpenAI meletakkan Lockdown Mode untuk individu dan organisasi yang mengendalikan data sensitif, bukan tetapan yang perlu dihidupkan oleh semua pengguna. Ciri ini sedang dilancarkan kepada akaun ChatGPT Business self-service dan akaun individu yang layak.",
      fil: "Iniulat ng TechCrunch AI na inilabas ng OpenAI ang Lockdown Mode para bawasan ang panganib na mailabas ang sensitibong data kapag may prompt injection na nabasa ang ChatGPT. Ang prompt injection ay pag-atake kung saan itinatago ang masamang instructions sa webpages, files, o iba pang content na binabasa ng model.\n\nNililimitahan ng mode na ito ang naaabot ng ChatGPT sa labas ng usapan. Ayon sa ulat, idi-disable ng Lockdown Mode ang live web browsing, pagkuha at pagpapakita ng web images, deep research, at agent mode; puwede pa ring buksan ang cached content at gumawa ng images.\n\nNilinaw din ng OpenAI na hindi ito kumpletong depensa. Maaari pa ring lumitaw ang prompt injection sa cached web content o uploaded files at makaapekto sa kilos o accuracy ng sagot. Kaya ang layunin ay bawasan ang data-exfiltration risk, hindi burahin ang lahat ng attack paths.\n\nSabi ng ulat, inilalagay ng OpenAI ang Lockdown Mode para sa mga tao at organisasyong humahawak ng sensitibong data, hindi bilang setting na kailangang buksan ng lahat ng user. Iro-roll out ito sa self-service ChatGPT Business accounts at eligible individual accounts."
    }[language];
  }
  if (/publishers.*opt.*out|opt.*out.*ai search|ai search.*publishers|ai-generated search results|google.*ai search.*publisher/.test(text)) {
    return {
      "zh-Hant": "TechCrunch 報導，英國監管機構要求 Google 提供新的選項，讓出版商可以選擇不讓內容被用在 AI 生成式搜尋結果中。這項安排先從英國開始，Google 也表示會把相關選項推向其他市場。\n\n這篇新聞的重點在於搜尋產品和內容授權之間的拉扯。出版商並不是單純反對搜尋曝光，而是希望在 AI 摘要、引用和流量分配變得更複雜時，能保留選擇權與可被辨識的內容邊界。",
      en: "TechCrunch reports that UK regulators are requiring Google to offer a new option for publishers to opt out of having their content used in AI-generated search results. Google said the option would start in the UK and later roll out to other markets.\n\nThe story is about the tension between search products and content rights. Publishers are not simply rejecting search visibility; they want a clearer choice as AI summaries, attribution, and traffic distribution become harder to separate.",
      ja: "TechCrunch によると、英国の規制当局は Google に対し、出版者が自社コンテンツを AI 生成検索結果に使わせない選択肢を提供するよう求めています。この選択肢は英国から始まり、Google は他市場にも展開するとしています。\n\nこのニュースの焦点は、検索プロダクトとコンテンツ権利の緊張関係です。出版者は検索露出そのものを拒んでいるのではなく、AI 要約、出典表示、流入配分が複雑になる中で、明確な選択権を求めています。",
      ko: "TechCrunch에 따르면 영국 규제 당국은 Google에 출판사가 자사 콘텐츠를 AI 생성 검색 결과에 쓰지 않도록 선택할 수 있는 옵션을 제공하라고 요구했습니다. Google은 이 옵션을 영국에서 먼저 시작한 뒤 다른 시장으로 확대하겠다고 밝혔습니다.\n\n이 보도의 핵심은 검색 제품과 콘텐츠 권리 사이의 긴장입니다. 출판사들이 검색 노출 자체를 거부한다기보다, AI 요약과 출처 표시, 트래픽 배분이 복잡해지는 상황에서 더 명확한 선택권을 요구하는 것입니다.",
      id: "TechCrunch melaporkan bahwa regulator Inggris meminta Google menyediakan opsi baru agar publisher bisa memilih untuk tidak memakai konten mereka dalam hasil pencarian yang dibuat AI. Google mengatakan opsi itu akan dimulai di Inggris dan kemudian dibawa ke pasar lain.\n\nInti beritanya ada pada tarik-menarik antara produk search dan hak konten. Publisher bukan sekadar menolak visibilitas di search; mereka ingin pilihan yang lebih jelas saat ringkasan AI, atribusi, dan distribusi traffic makin sulit dipisahkan.",
      vi: "TechCrunch đưa tin cơ quan quản lý tại Anh yêu cầu Google cung cấp tùy chọn mới để publisher có thể không cho nội dung của họ xuất hiện trong kết quả tìm kiếm do AI tạo. Google cho biết tùy chọn này sẽ bắt đầu tại Anh rồi mở rộng sang các thị trường khác.\n\nĐiểm chính của câu chuyện là sự căng thẳng giữa sản phẩm tìm kiếm và quyền nội dung. Publisher không chỉ phản đối việc được hiển thị trên search; họ muốn có lựa chọn rõ ràng hơn khi tóm tắt AI, ghi nguồn và phân phối traffic trở nên khó tách bạch.",
      th: "TechCrunch รายงานว่า regulator ในสหราชอาณาจักรขอให้ Google เปิดตัวเลือกใหม่เพื่อให้ publisher เลือกไม่ให้นำคอนเทนต์ของตนไปใช้ในผลการค้นหาที่สร้างโดย AI ได้ Google ระบุว่าตัวเลือกนี้จะเริ่มในสหราชอาณาจักร ก่อนขยายไปยังตลาดอื่น\n\nประเด็นของข่าวคือแรงตึงระหว่างผลิตภัณฑ์ search กับสิทธิ์ของคอนเทนต์ publisher ไม่ได้ปฏิเสธการมองเห็นบน search อย่างเดียว แต่ต้องการทางเลือกที่ชัดขึ้นเมื่อ AI summary, attribution และการกระจาย traffic แยกกันยากขึ้น",
      ms: "TechCrunch melaporkan bahawa regulator UK meminta Google menyediakan pilihan baharu supaya publisher boleh memilih untuk tidak membenarkan kandungan mereka digunakan dalam hasil carian janaan AI. Google berkata pilihan itu akan bermula di UK sebelum diperluas ke pasaran lain.\n\nCerita ini berkisar pada ketegangan antara produk search dan hak kandungan. Publisher bukan sekadar menolak visibility dalam search; mereka mahu pilihan yang lebih jelas apabila ringkasan AI, atribusi dan agihan traffic semakin sukar dipisahkan.",
      fil: "Iniulat ng TechCrunch na pinapagawa ng UK regulators sa Google ang bagong opsyon para makapili ang publishers na hindi gamitin ang kanilang content sa AI-generated search results. Sabi ng Google, magsisimula ito sa UK bago dalhin sa iba pang markets.\n\nTungkol ito sa tensiyon sa pagitan ng search products at content rights. Hindi lang basta tinatanggihan ng publishers ang search visibility; gusto nila ng mas malinaw na pagpili habang lumalabo ang hangganan ng AI summaries, attribution, at traffic distribution."
    }[language];
  }
  if (/enterprise-agent-logic|agent logic|scalable enterprise ai adoption|beyond llms/.test(text)) {
    return {
      "zh-Hant": "IBM Research 在 Hugging Face 的文章把問題放在企業工作流：不少 AI pilot 停在展示或局部自動化，原因不是模型不夠大，而是 AI 沒有真正接進動態、長期、跨 API、資料庫與服務的流程。\n\n文章提出的方向是 agent logic。也就是讓 AI 不只回答問題，而能在工作流程核心處理狀態、工具與決策脈絡；代價則是更長 context、更多 token 消耗，以及需要被控制的 hallucination 風險。",
      en: "IBM Research’s post on Hugging Face frames the issue around enterprise workflows: many AI pilots stall at demos or local automation not simply because models are too small, but because AI is not connected to dynamic, long-running workflows across APIs, databases, and services.\n\nThe post points to agent logic as the missing layer. The idea is to move AI from answering questions toward handling state, tools, and decision context inside workflows, while still accounting for longer context, higher token use, and hallucination risk.",
      ja: "Hugging Face に掲載された IBM Research の記事は、企業ワークフローを中心に問題を整理しています。多くの AI pilot がデモや局所的な自動化で止まるのは、モデルが小さいからだけではなく、AI が API、データベース、サービスをまたぐ動的で長時間の業務に接続されていないためです。\n\n記事が示す方向は agent logic です。AI を単なる回答役から、ワークフロー内の状態、ツール、意思決定の文脈を扱う層へ移す一方で、長い context、token 消費、hallucination リスクを管理する必要があるとしています。",
      ko: "Hugging Face에 실린 IBM Research 글은 문제를 기업 워크플로 관점에서 봅니다. 많은 AI 파일럿이 데모나 부분 자동화에 머무는 이유는 모델이 작아서만이 아니라, AI가 API, 데이터베이스, 서비스가 얽힌 동적이고 장기적인 업무 흐름에 연결되지 않았기 때문이라는 설명입니다.\n\n글이 제시하는 방향은 agent logic입니다. AI를 질문에 답하는 도구에서 워크플로 안의 상태, 도구, 의사결정 맥락을 다루는 층으로 옮기되, 긴 context, token 사용량, hallucination 위험도 함께 관리해야 한다는 뜻입니다.",
      id: "Tulisan IBM Research di Hugging Face menempatkan masalahnya pada workflow enterprise: banyak pilot AI berhenti di demo atau otomatisasi kecil bukan hanya karena model kurang besar, tetapi karena AI belum benar-benar tersambung ke workflow yang dinamis, panjang, dan melintasi API, database, serta layanan.\n\nArah yang dibahas adalah agent logic. AI dipindahkan dari sekadar menjawab pertanyaan menjadi lapisan yang menangani state, tool, dan konteks keputusan di dalam workflow, sambil tetap memperhitungkan context yang lebih panjang, penggunaan token yang lebih besar, dan risiko hallucination.",
      vi: "Bài viết của IBM Research trên Hugging Face đặt vấn đề ở workflow doanh nghiệp: nhiều AI pilot dừng ở demo hoặc tự động hóa cục bộ không chỉ vì mô hình chưa đủ lớn, mà vì AI chưa thật sự nối vào các workflow động, kéo dài, đi qua API, database và dịch vụ.\n\nHướng mà bài viết nhấn mạnh là agent logic. AI không chỉ trả lời câu hỏi, mà xử lý trạng thái, công cụ và bối cảnh quyết định bên trong workflow; đổi lại là context dài hơn, mức dùng token cao hơn và rủi ro hallucination cần được kiểm soát.",
      th: "บทความของ IBM Research บน Hugging Face วางปัญหาไว้ที่ workflow ขององค์กร: AI pilot จำนวนมากหยุดอยู่ที่เดโมหรือ automation เฉพาะจุด ไม่ใช่เพราะโมเดลเล็กเกินไปอย่างเดียว แต่เพราะ AI ยังไม่ได้เชื่อมกับ workflow ที่เป็น dynamic, long-running และพาดผ่าน API, database กับ service หลายส่วนจริง ๆ\n\nทิศทางที่บทความพูดถึงคือ agent logic การพา AI จากการตอบคำถาม ไปเป็นเลเยอร์ที่จัดการ state, tool และ decision context ภายใน workflow พร้อมยอมรับต้นทุนของ context ที่ยาวขึ้น token usage ที่สูงขึ้น และ hallucination risk ที่ต้องควบคุม",
      ms: "Artikel IBM Research di Hugging Face meletakkan masalah pada workflow perusahaan: banyak AI pilot berhenti pada demo atau automasi kecil bukan semata-mata kerana model kurang besar, tetapi kerana AI belum benar-benar disambungkan kepada workflow yang dinamik, panjang, dan merentas API, pangkalan data serta perkhidmatan.\n\nArah yang dibincangkan ialah agent logic. AI beralih daripada sekadar menjawab soalan kepada lapisan yang mengurus state, alat dan konteks keputusan dalam workflow, sambil mengambil kira context yang lebih panjang, penggunaan token yang lebih tinggi dan risiko hallucination.",
      fil: "Itinatapat ng IBM Research post sa Hugging Face ang problema sa enterprise workflows: maraming AI pilot ang naiipit sa demo o maliit na automation hindi lang dahil kulang ang laki ng model, kundi dahil hindi pa nakakabit ang AI sa dynamic at long-running workflows na dumadaan sa APIs, databases, at services.\n\nAng direksiyong itinuturo ng post ay agent logic. Ibig sabihin, inililipat ang AI mula sa simpleng pagsagot patungo sa paghawak ng state, tools, at decision context sa loob ng workflow, habang binabantayan pa rin ang mas mahabang context, mas mataas na token use, at hallucination risk."
    }[language];
  }
  return "";
}

function sourceMatterParagraph(language, article = {}, source = {}) {
  const entities = (article.entities || [])
    .map((entity) => normalizeNewsText(entity))
    .filter((entity) => entity && entity.length <= 48)
    .slice(0, 4);
  const numbers = (article.numbers || [])
    .map((number) => normalizeNewsText(number))
    .filter(Boolean)
    .slice(0, 4);
  if (!entities.length && !numbers.length) return "";
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const byLanguage = {
    "zh-Hant": [
      entities.length ? `這篇報導主要牽涉 ${entities.join("、")}。` : "",
      numbers.length ? `文中可核對的數字包括 ${numbers.join("、")}。` : ""
    ].join(""),
    en: [
      entities.length ? `The report centers on ${entities.join(", ")}. ` : "",
      numbers.length ? `Figures mentioned in the source include ${numbers.join(", ")}. ` : ""
    ].join(""),
    ja: [
      entities.length ? `この報道は主に ${entities.join("、")} に関わります。` : "",
      numbers.length ? `出典で確認できる数字には ${numbers.join("、")} が含まれます。` : ""
    ].join(""),
    ko: [
      entities.length ? `이 보도는 ${entities.join(", ")}를 중심으로 합니다. ` : "",
      numbers.length ? `출처에서 확인되는 수치는 ${numbers.join(", ")}입니다. ` : ""
    ].join(""),
    id: [
      entities.length ? `Laporan ini berpusat pada ${entities.join(", ")}. ` : "",
      numbers.length ? `Angka yang disebut sumber mencakup ${numbers.join(", ")}. ` : ""
    ].join(""),
    vi: [
      entities.length ? `Bài viết xoay quanh ${entities.join(", ")}. ` : "",
      numbers.length ? `Các con số trong nguồn gồm ${numbers.join(", ")}. ` : ""
    ].join(""),
    th: [
      entities.length ? `รายงานนี้เกี่ยวข้องกับ ${entities.join(", ")} ` : "",
      numbers.length ? `ตัวเลขที่แหล่งข่าวระบุมี ${numbers.join(", ")} ` : ""
    ].join(""),
    ms: [
      entities.length ? `Laporan ini tertumpu pada ${entities.join(", ")}. ` : "",
      numbers.length ? `Angka yang disebut sumber termasuk ${numbers.join(", ")}. ` : ""
    ].join(""),
    fil: [
      entities.length ? `Nakatuon ang ulat sa ${entities.join(", ")}. ` : "",
      numbers.length ? `Kasama sa mga numerong binanggit ng source ang ${numbers.join(", ")}. ` : ""
    ].join("")
  };
  return normalizeNewsText(byLanguage[language] || byLanguage.en || `${publisher} reported the details.`);
}

function sourceBackedBody(language, frame, source, article, profile) {
  const specific = sourceSpecificBody(language, frame, source, article);
  if (specific) return cleanMarketPublicText(specific, language);
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const title = articleTitle(language, frame, source, article, profile);
  const lead = compactNewsDeck(language, title, articleStandfirst(language, frame, source, article, profile));
  const bodyParagraphs = sourceBodyParagraphs(language, publisher, lead, article);
  if (bodyParagraphs.length) {
    const date = formatDate(article.publishedAt || source.publishedAt, language);
    const openingIndex = sourceOpeningParagraphIndex(bodyParagraphs);
    const opening = sourceEventOpeningParagraph(language, publisher, date, bodyParagraphs[openingIndex], title);
    const remaining = bodyParagraphs.filter((_, index) => index !== openingIndex);
    return cleanMarketPublicText([opening || bodyParagraphs[openingIndex], ...remaining].join("\n\n"), language);
  }
  const detailFacts = localizedFactsForArticle(language, frame, source, article, profile, lead)
    .filter((fact) => !/報導主要提到|文中提到的主要數字|The report centers on|Figures mentioned in the source|出典で確認できる数字|보도는 .*중심|Angka yang disebut sumber|Các con số trong nguồn|ตัวเลขที่แหล่งข่าวระบุ|Kasama sa mga numerong/i.test(fact))
    .map((fact) => compactFact(fact, language, 210))
    .slice(0, 6);
  const detailParagraphs = [];
  for (let index = 0; index < detailFacts.length; index += 2) {
    const paragraph = sentenceJoin(detailFacts.slice(index, index + 2), language);
    if (!paragraph) continue;
    detailParagraphs.push(index === 0 ? sourceLeadWithPublisher(language, publisher, paragraph) : paragraph);
  }
  const fallbackParagraph = lead && !detailParagraphs.length ? sourceLeadWithPublisher(language, publisher, lead) : "";

  return cleanMarketPublicText([
    ...detailParagraphs.slice(0, 3),
    fallbackParagraph
  ].filter(Boolean).join("\n\n"), language);
}

function marketBodyUnits(value = "", language = "") {
  const text = stripHtml(value);
  if (["en", "id", "vi", "ms", "fil"].includes(language)) return text.split(/\s+/).filter(Boolean).length;
  if (language === "th") return Math.round(text.length / 4.5);
  return (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
}

function marketBodyFloor(language = "") {
  return ["en", "id", "vi", "ms", "fil"].includes(language) ? 115 : 170;
}

function marketJargonNeedsCue(value = "") {
  return /\b(?:prompt injection|retrieval|orchestration|agentic workflow|workflow orchestration|observability|context window|tool calls?|RAG)\b/i.test(value);
}

function marketPlainLanguageCue(language = "", title = "") {
  const promptInjection = /prompt injection|提示注入|プロンプトインジェクション|프롬프트 인젝션/i.test(title);
  const byLanguage = promptInjection
    ? {
        "zh-Hant": "也就是說，這項功能會在處理敏感資料時，限制 ChatGPT 能讀取、顯示或執行的外部內容。",
        en: "Put simply, the feature limits what ChatGPT can fetch, display, or do when sensitive data is involved.",
        ja: "つまり、機密データを扱う場面で、ChatGPT が取得、表示、実行できる外部内容を制限する機能です。",
        ko: "쉽게 말해 민감한 데이터를 다룰 때 ChatGPT가 가져오거나 표시하거나 실행할 수 있는 외부 내용을 제한하는 기능입니다.",
        id: "Secara sederhana, fitur ini membatasi apa yang bisa diambil, ditampilkan, atau dijalankan ChatGPT saat data sensitif terlibat.",
        vi: "Nói đơn giản, tính năng này giới hạn những gì ChatGPT có thể lấy, hiển thị hoặc thực hiện khi xử lý dữ liệu nhạy cảm.",
        th: "พูดให้ง่ายคือ ฟีเจอร์นี้จำกัดสิ่งที่ ChatGPT ดึงมา แสดง หรือดำเนินการได้เมื่อมีข้อมูลอ่อนไหวเกี่ยวข้อง",
        ms: "Dalam bahasa mudah, ciri ini mengehadkan perkara yang boleh diambil, dipaparkan atau dijalankan oleh ChatGPT apabila data sensitif terlibat.",
        fil: "Sa simpleng salita, nililimitahan nito ang puwedeng kunin, ipakita, o gawin ng ChatGPT kapag may sensitibong data."
      }
    : {
        "zh-Hant": "也就是說，讀者可以把它理解成一個更可控的 AI 工作流程限制。",
        en: "Put simply, it is a more controlled way to limit what the AI workflow can use or do.",
        ja: "つまり、AI ワークフローが使える情報や実行できる動作をより制御する考え方です。",
        ko: "쉽게 말해 AI 워크플로가 사용할 정보와 할 수 있는 동작을 더 통제하는 방식입니다.",
        id: "Secara sederhana, ini adalah cara yang lebih terkendali untuk membatasi apa yang bisa dipakai atau dilakukan workflow AI.",
        vi: "Nói đơn giản, đây là cách kiểm soát rõ hơn những gì workflow AI có thể dùng hoặc thực hiện.",
        th: "พูดให้ง่ายคือ เป็นวิธีควบคุมให้ชัดขึ้นว่า workflow AI ใช้หรือทำอะไรได้บ้าง",
        ms: "Dalam bahasa mudah, ini cara yang lebih terkawal untuk mengehadkan perkara yang boleh digunakan atau dilakukan oleh workflow AI.",
        fil: "Sa simpleng salita, mas kontroladong paraan ito para limitahan kung ano ang puwedeng gamitin o gawin ng AI workflow."
      };
  return byLanguage[language] || byLanguage.en;
}

function reinforceJargonParagraph(paragraph = "", language = "", title = "") {
  const text = cleanMarketPublicText(paragraph, language);
  if (!marketJargonNeedsCue(text)) return text;
  if (/(意思是|也就是|白話|Put simply|In plain terms|つまり|쉽게 말해|Secara sederhana|Nói đơn giản|พูดให้ง่าย|Dalam bahasa mudah|Sa simpleng salita)/i.test(text)) {
    return text;
  }
  return cleanMarketPublicText(`${text} ${marketPlainLanguageCue(language, title)}`, language);
}

function strengthenMarketNewsBody(language, frame, source, article, profile, body = "", title = "") {
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const lead = compactNewsDeck(language, title, articleStandfirst(language, frame, source, article, profile));
  const rawParagraphs = cleanMarketPublicText(body, language)
    .split(/\n{2,}/)
    .filter(Boolean);
  let jargonCueCovered = /(指的是|attack pattern|攻擊手法|攻撃手法|공격 방식|pola serangan|kiểu tấn công|รูปแบบโจมตี|corak serangan|pag-atake|意思是|也就是|白話|Put simply|In plain terms|つまり|쉽게 말해|Secara sederhana|Nói đơn giản|พูดให้ง่าย|Dalam bahasa mudah|Sa simpleng salita)/i.test(
    rawParagraphs.join("\n\n")
  );
  const paragraphs = rawParagraphs.map((paragraph) => {
    if (jargonCueCovered) return cleanMarketPublicText(paragraph, language);
    const reinforced = reinforceJargonParagraph(paragraph, language, title);
    if (reinforced !== paragraph) jargonCueCovered = true;
    return reinforced;
  });
  if (!paragraphs.length && lead) paragraphs.push(sourceLeadWithPublisher(language, publisher, lead));

  const entityPattern = /(ALTOS LAB|GEO|SEO|AI|Agent|agent|automation|workflow|導入|產品|流程|自動化|実装|運用|도입|자동화)/i;
  if (paragraphs[0] && !entityPattern.test(paragraphs[0]) && entityPattern.test(title)) {
    paragraphs[0] = sourceLeadWithPublisher(language, publisher, `${title}${sentenceEnd(language)} ${paragraphs[0]}`);
  }

  const facts = localizedFactsForArticle(language, frame, source, article, profile, lead)
    .map((fact) => compactFact(fact, language, 240))
    .filter(Boolean);
  const matter = sourceMatterParagraph(language, article, source);
  for (const candidate of [...facts, matter]) {
    if (marketBodyUnits(paragraphs.join("\n\n"), language) >= marketBodyFloor(language)) break;
    const paragraph = cleanMarketPublicText(candidate, language);
    if (!paragraph) continue;
    if (paragraphs.some((existing) => !factDiffersFromLead(paragraph, existing))) continue;
    paragraphs.push(paragraph);
  }

  return cleanMarketPublicText(paragraphs.slice(0, 6).join("\n\n"), language);
}

function marketNewsContextParagraph(language, frame, source, article, firstParagraph = "", factParagraph = "") {
  if (normalizeNewsText(factParagraph).length >= 260) return "";
  if (frame?.key === "ai-app-platform-cloud" || /lovable|google cloud|anthropic claude|5x/i.test(`${article.headline || ""} ${source.title || ""} ${article.standfirst || ""}`)) {
    return {
      "zh-Hant": "TechCrunch 引述知情人士說，雙方未公開協議金額，但合作範圍包含 Google Cloud 上的 AI 用量，以及 Anthropic Claude 與 Google Gemini 的模型存取。對 Lovable 這類 AI 應用建置平台來說，雲端算力與模型額度正在變成擴張速度的一部分。",
      en: "TechCrunch says the companies did not disclose a dollar value, but the deal covers AI usage on Google Cloud and access to Anthropic Claude and Google Gemini. For AI app-building platforms like Lovable, cloud capacity and model access are becoming part of the growth story.",
      ja: "TechCrunch によると、両社は契約金額を明らかにしていませんが、Google Cloud 上の AI 利用と Anthropic Claude、Google Gemini へのアクセスが含まれます。Lovable のような AI アプリ構築プラットフォームでは、クラウド容量とモデルアクセスが成長の条件になりつつあります。",
      ko: "TechCrunch에 따르면 양사는 계약 금액을 공개하지 않았지만, Google Cloud의 AI 사용량과 Anthropic Claude 및 Google Gemini 접근이 포함됩니다. Lovable 같은 AI 앱 구축 플랫폼에서는 클라우드 용량과 모델 접근성이 성장 속도의 일부가 되고 있습니다.",
      id: "TechCrunch menyebut kedua perusahaan tidak membuka nilai kontrak, tetapi kerja sama ini mencakup penggunaan AI di Google Cloud serta akses ke Anthropic Claude dan Google Gemini. Bagi platform pembuat aplikasi AI seperti Lovable, kapasitas cloud dan akses model ikut menentukan laju ekspansi.",
      vi: "TechCrunch cho biết hai bên không công bố giá trị hợp đồng, nhưng thỏa thuận bao gồm mức dùng AI trên Google Cloud và quyền truy cập Anthropic Claude cùng Google Gemini. Với các nền tảng xây ứng dụng AI như Lovable, năng lực cloud và quyền truy cập mô hình đang trở thành một phần của tốc độ mở rộng.",
      th: "TechCrunch ระบุว่าทั้งสองบริษัทไม่เปิดเผยมูลค่าดีล แต่ข้อตกลงครอบคลุมการใช้ AI บน Google Cloud และการเข้าถึง Anthropic Claude กับ Google Gemini สำหรับแพลตฟอร์มสร้างแอป AI อย่าง Lovable ความจุ cloud และสิทธิ์เข้าถึงโมเดลกำลังเป็นส่วนหนึ่งของการเติบโต",
      ms: "TechCrunch menyebut kedua-dua syarikat tidak mendedahkan nilai kontrak, tetapi kerjasama ini merangkumi penggunaan AI di Google Cloud serta akses kepada Anthropic Claude dan Google Gemini. Untuk platform pembinaan aplikasi AI seperti Lovable, kapasiti cloud dan akses model kini menjadi sebahagian daripada rentak pengembangan.",
      fil: "Ayon sa TechCrunch, hindi inilabas ng dalawang kumpanya ang halaga ng kasunduan, pero saklaw nito ang AI usage sa Google Cloud at access sa Anthropic Claude at Google Gemini. Para sa AI app-building platforms tulad ng Lovable, nagiging bahagi ng paglago ang cloud capacity at model access."
    }[language];
  }
  if (frame?.key === "ai-agent-observability" || /coralogix|observability|monitoring|troubleshoot/i.test(`${article.headline || ""} ${source.title || ""} ${article.standfirst || ""}`)) {
    return {
      "zh-Hant": "這筆融資把 AI agent 帶進正式環境後的監控需求放到檯面上。當企業開始讓 agent 接觸真實資料、工具與客戶流程，能不能記錄行為、追蹤錯誤並回到原因，會直接影響這類基礎設施公司的價值。",
      en: "The financing puts a spotlight on monitoring needs that emerge once AI agents move into production. As companies connect agents to real data, tools, and customer workflows, behavior logs, troubleshooting, and root-cause visibility become part of the infrastructure value.",
      ja: "今回の資金調達は、AI agent が本番環境に入った後の監視需要を前面に出しています。企業が agent を実データ、ツール、顧客業務につなぐほど、行動ログ、障害対応、原因追跡がインフラ価値の一部になります。",
      ko: "이번 투자 유치는 AI agent가 운영 환경에 들어간 뒤 생기는 모니터링 수요를 부각합니다. 기업이 agent를 실제 데이터, 도구, 고객 업무와 연결할수록 행동 로그, 장애 대응, 원인 추적이 인프라 가치가 됩니다.",
      id: "Pendanaan ini menyoroti kebutuhan monitoring setelah AI agent masuk production. Saat perusahaan menghubungkan agent ke data, tool, dan workflow pelanggan yang nyata, log perilaku, troubleshooting, dan visibilitas akar masalah menjadi nilai utama infrastruktur.",
      vi: "Vòng gọi vốn này làm nổi bật nhu cầu giám sát khi AI agent đi vào production. Khi doanh nghiệp nối agent với dữ liệu, công cụ và workflow khách hàng thật, log hành vi, xử lý lỗi và khả năng lần về nguyên nhân trở thành giá trị của hạ tầng.",
      th: "เงินทุนรอบนี้ทำให้ความต้องการ monitoring หลัง AI agent เข้าสู่ production เด่นชัดขึ้น เมื่อองค์กรเชื่อม agent กับข้อมูล เครื่องมือ และ workflow ลูกค้าจริง behavior logs, troubleshooting และ root-cause visibility จะกลายเป็นคุณค่าของ infrastructure",
      ms: "Pembiayaan ini menonjolkan keperluan monitoring selepas AI agent masuk ke production. Apabila syarikat menghubungkan agent kepada data, alat dan workflow pelanggan sebenar, log tingkah laku, troubleshooting dan keterlihatan punca masalah menjadi nilai infrastruktur.",
      fil: "Itinatampok ng financing na ito ang monitoring needs kapag pumasok na sa production ang AI agents. Habang ikinokonekta ng mga kumpanya ang agents sa tunay na data, tools, at customer workflows, nagiging infrastructure value ang behavior logs, troubleshooting, at root-cause visibility."
    }[language];
  }
  if (frame?.key === "ai-shopping-search" || /amazon.*(product image|shopping search)|ai-generated product images/i.test(`${article.headline || ""} ${source.title || ""} ${article.standfirst || ""}`)) {
    return {
      "zh-Hant": "Amazon 表示，這項功能的目的，是把搜尋意圖轉成更容易理解的視覺提示。對使用者來說，它不是取代商品頁照片，而是在搜尋階段先縮小方向，讓接下來瀏覽商品時比較容易判斷。",
      en: "Amazon frames the feature as part of search rather than a replacement for product-page photos: the generated images are meant to turn a query into a more visual cue before a shopper narrows down products.",
      ja: "Amazon はこの機能を商品ページ写真の置き換えではなく、検索体験の一部として位置付けています。検索語を視覚的な手がかりに変え、ユーザーが候補を絞りやすくする狙いです。",
      ko: "Amazon은 이 기능을 상품 페이지 사진을 대체하는 것이 아니라 검색 경험의 일부로 설명합니다. 검색어를 더 시각적인 단서로 바꿔 사용자가 상품 후보를 좁히기 쉽게 하려는 목적입니다.",
      id: "Amazon menempatkan fitur ini sebagai bagian dari search, bukan pengganti foto di halaman produk. Gambar yang dihasilkan AI dipakai sebagai petunjuk visual sebelum pengguna mempersempit pilihan.",
      vi: "Amazon xem tính năng này là một phần của trải nghiệm tìm kiếm, không phải thay thế ảnh trên trang sản phẩm. Ảnh do AI tạo ra đóng vai trò gợi ý trực quan trước khi người mua thu hẹp lựa chọn.",
      th: "Amazon วางฟีเจอร์นี้เป็นส่วนหนึ่งของ search experience ไม่ใช่การแทนที่ภาพในหน้าสินค้า ภาพที่สร้างด้วย AI ทำหน้าที่เป็น visual cue ก่อนที่ผู้ใช้จะคัดตัวเลือกสินค้าให้แคบลง",
      ms: "Amazon meletakkan ciri ini sebagai sebahagian daripada pengalaman carian, bukan pengganti foto halaman produk. Imej janaan AI digunakan sebagai petunjuk visual sebelum pengguna mengecilkan pilihan.",
      fil: "Inilalagay ito ng Amazon bilang bahagi ng search experience, hindi kapalit ng product-page photos. Ginagamit ang AI-generated images bilang visual cue bago paliitin ng user ang pagpipilian."
    }[language];
  }
  if (frame?.key === "vercel-ai-gateway-models" || /grok imagine|ai gateway|vercel/i.test(`${article.headline || ""} ${source.title || ""} ${article.standfirst || ""}`)) {
    return {
      "zh-Hant": "Vercel 將這次更新放在 AI Gateway 產品線中，讓開發者透過同一個 gateway 呼叫 xAI 模型。原文提到，Grok Imagine Video 1.5 會改善音訊品質、提示遵循、寫實感與較長序列中的角色一致性；開發者在 Gateway 中指定 xai/grok-imagine-video-1.5 就能開始測試。",
      en: "Vercel frames the update as part of AI Gateway, where developers can call xAI models through the same gateway. The source says Grok Imagine Video 1.5 improves audio quality, prompt following, photorealism, and character consistency across longer sequences; developers can test it by setting the model to xai/grok-imagine-video-1.5.",
      ja: "Vercel はこの更新を AI Gateway の一部として位置付け、開発者が同じ gateway から xAI モデルを呼び出せるようにしています。原文では、Grok Imagine Video 1.5 が音質、プロンプト追従、写実性、長いシーケンスでのキャラクター一貫性を改善したと説明され、model を xai/grok-imagine-video-1.5 に指定して試せます。",
      ko: "Vercel은 이번 업데이트를 AI Gateway 제품군의 일부로 설명하며, 개발자가 같은 gateway에서 xAI 모델을 호출할 수 있게 했습니다. 원문은 Grok Imagine Video 1.5가 오디오 품질, 프롬프트 준수, 사실감, 긴 시퀀스의 캐릭터 일관성을 개선했으며 model을 xai/grok-imagine-video-1.5로 지정해 테스트할 수 있다고 설명합니다.",
      id: "Vercel menempatkan update ini sebagai bagian dari AI Gateway, sehingga developer bisa memanggil model xAI lewat gateway yang sama. Sumbernya menyebut Grok Imagine Video 1.5 memperbaiki kualitas audio, kepatuhan prompt, fotorealisme, dan konsistensi karakter pada sequence yang lebih panjang; developer bisa mengujinya dengan model xai/grok-imagine-video-1.5.",
      vi: "Vercel đặt cập nhật này trong dòng sản phẩm AI Gateway, nơi developer có thể gọi mô hình xAI qua cùng một gateway. Nguồn cho biết Grok Imagine Video 1.5 cải thiện chất lượng âm thanh, khả năng bám prompt, độ chân thực và tính nhất quán nhân vật ở các chuỗi dài hơn; developer có thể thử bằng model xai/grok-imagine-video-1.5.",
      th: "Vercel วางอัปเดตนี้ไว้ในสายผลิตภัณฑ์ AI Gateway เพื่อให้นักพัฒนาเรียกใช้โมเดล xAI ผ่าน gateway เดียวกันได้ แหล่งข่าวระบุว่า Grok Imagine Video 1.5 ปรับปรุงคุณภาพเสียง การทำตาม prompt ความสมจริง และความสม่ำเสมอของตัวละครใน sequence ที่ยาวขึ้น โดยนักพัฒนาทดสอบได้ด้วย model xai/grok-imagine-video-1.5",
      ms: "Vercel meletakkan kemas kini ini sebagai sebahagian daripada AI Gateway, supaya pembangun boleh memanggil model xAI melalui gateway yang sama. Sumber itu menyebut Grok Imagine Video 1.5 menambah baik kualiti audio, kepatuhan prompt, fotorealisme dan konsistensi watak dalam sequence yang lebih panjang; pembangun boleh mengujinya dengan model xai/grok-imagine-video-1.5.",
      fil: "Inilagay ng Vercel ang update na ito sa AI Gateway product line, para matawag ng developers ang xAI models sa parehong gateway. Ayon sa source, pinapahusay ng Grok Imagine Video 1.5 ang audio quality, prompt following, photorealism, at character consistency sa mas mahahabang sequence; puwede itong i-test gamit ang model xai/grok-imagine-video-1.5."
    }[language];
  }
  return "";
}

function sourceGeoSummary(language, frame, source, article, profile) {
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const title = articleTitle(language, frame, source, article, profile);
  const standfirst = compactNewsDeck(language, title, articleStandfirst(language, frame, source, article, profile));
  const facts = localizedFactsForArticle(language, frame, source, article, profile, standfirst)
    .filter((fact) => factDiffersFromLead(fact, standfirst))
    .map((fact) => compactFact(fact, language, 150))
    .slice(0, 3);
  const bodyCandidates = sourceBodyParagraphCandidates(article, language, standfirst)
    .map((paragraph) => compactFact(paragraph, language, 170))
    .filter((paragraph) => factDiffersFromLead(paragraph, standfirst))
    .slice(0, 2);
  const details = facts.length >= 2 ? facts : [...facts, ...bodyCandidates].slice(0, 3);
  const body = sentenceJoin(details, language);
  if (!body || overlapRatio(body, standfirst) >= 0.72) return "";
  const byLanguage = {
    "zh-Hant": `${publisher} 報導，${body}`,
    en: `${publisher} reports: ${body}`,
    ja: `${publisher} は次のように報じています。${body}`,
    ko: `${publisher} 보도에 따르면 ${body}`,
    id: `${publisher} melaporkan: ${body}`,
    vi: `${publisher} đưa tin: ${body}`,
    th: `${publisher} รายงานว่า ${body}`,
    ms: `${publisher} melaporkan: ${body}`,
    fil: `Ayon sa ${publisher}, ${body}`
  };
  const summary = byLanguage[language] || byLanguage.en;
  return truncate(cleanMarketPublicText(summary, language), 240);
}

function marketSeoDescription(language, excerpt = "", geoSummary = "", keyTakeaways = [], body = "", title = "") {
  const candidates = [
    geoSummary,
    ...(Array.isArray(keyTakeaways) ? keyTakeaways : []),
    ...String(body || "").split(/\n{2,}/)
  ]
    .map((candidate) => cleanMarketPublicText(candidate, language))
    .filter((candidate) => candidate && candidate.length >= 50)
    .filter((candidate) => overlapRatio(candidate, excerpt) < 0.82);
  const selected = candidates[0] || title || excerpt;
  return truncate(selected, 176);
}

function sourceKeyTakeaways(language, frame, source, article, profile) {
  const standfirst = compactNewsDeck(language, articleTitle(language, frame, source, article, profile), articleStandfirst(language, frame, source, article, profile));
  return localizedFactsForArticle(language, frame, source, article, profile, standfirst)
    .map((fact) => compactFact(fact, language, 180))
    .slice(0, 4);
}

function sourceFaqs(language, title, frame, source, article, profile) {
  return [];
}

function sourceContentImages(language, title, article = {}, post = {}, pack = {}) {
  const raw = Array.isArray(article.images) ? article.images : [];
  const canonical = `${article.canonicalUrl || ""} ${pack.sourceLinks?.[0]?.url || ""}`;
  if (/openai\.com\/index\//i.test(canonical)) return [];
  const cover = post.cover || pack.primarySourceImageUrl || article.image?.url || "";
  const imageIdentity = (url = "") => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`
        .replace(/(width|w)[-_]\d+/gi, "$1-*")
        .replace(/\.width-\d+\./gi, ".width-*.")
        .toLowerCase();
    } catch {
      return String(url || "")
        .split("?")[0]
        .replace(/(width|w)[-_]\d+/gi, "$1-*")
        .replace(/\.width-\d+\./gi, ".width-*.")
        .toLowerCase();
    }
  };
  const declaredWidth = (url = "") => {
    const text = String(url || "");
    const match =
      text.match(/[?&](?:w|width|resize)=(\d{2,4})(?:[,&]|$)/i) ||
      text.match(/(?:width|w)[-_](\d{2,4})/i) ||
      text.match(/\.width-(\d{2,4})\./i);
    return match ? Number(match[1]) : null;
  };
  const seen = new Set([cover, pack.primarySourceImageUrl, article.image?.url].filter(Boolean).map(imageIdentity));
  const credit = cleanSourceCredit(post.coverCredit || pack.coverCredit || article.image?.credit || article.publisher || "");
  const creditUrl = post.coverCreditUrl || pack.coverCreditUrl || article.image?.creditUrl || article.canonicalUrl || "";
  const placements = ["after-lead", "mid-article", "before-faq"];
  return raw
    .map((image, index) => {
      const url = image?.url || "";
      const identity = imageIdentity(url);
      if (!url || seen.has(identity)) return null;
      if (/google-analytics\.com\/g\/collect/i.test(url)) return null;
      const width = declaredWidth(url);
      if (width && width < 640) return null;
      if (/[?&](?:w|width|resize)=(?:48|64|80|96|128|150)(?:&|$|,)/i.test(url) || /(?:avatar|profile|author|headshot|disrupt)/i.test(url)) return null;
      if (/(?:w_|,w_|\/w_)(?:48|64|80|96|128)|(?:h_|,h_)(?:48|64|80|96|128)|[-_](?:48|64|80|96|128)\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i.test(url)) return null;
      seen.add(identity);
      return {
        url,
        alt: normalizeNewsText(image.alt || `${title} - ${credit || "source image"}`),
        caption: normalizeNewsText(image.caption || image.alt || title),
        source: "source",
        credit: image.credit || credit,
        creditUrl: image.creditUrl || creditUrl,
        license: image.license || "source image",
        licenseUrl: image.licenseUrl || image.creditUrl || creditUrl,
        aspectRatio: image.aspectRatio || "wide",
        placement: image.placement || placements[index] || "mid-article"
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function buildMarketNewsroomPost({ language, pack = {}, post = {}, frame, slug, author, readTimeMinutes } = {}) {
  if (!LANGUAGES.includes(language)) throw new Error(`unsupported language ${language}`);
  const source = (pack.sourceLinks || post.sourceLinks || [])[0] || {};
  const inferredFrame = frame || inferMarketFrame(pack.sourceLinks ? pack : post);
  const labels = labelsFor(language);
  const article = sourceArticleFromPackOrPost({ pack, post });
  const profile = knownProfile(article, inferredFrame);
  const generatedTitle = cleanMarketPublicText(articleTitle(language, inferredFrame, source, article, profile), language);
  const existingTitle = cleanExistingMarketTitle(post.title || "", source.publisher || article.publisher);
  const title = cleanMarketPublicText(
    !profile?.title && usableExistingMarketTitle(existingTitle) && titleCompatibleWithArticle(existingTitle, article, inferredFrame)
      ? existingTitle
      : generatedTitle,
    language
  );
  const rawBody = cleanMarketPublicText(sourceBackedBody(language, inferredFrame, source, article, profile), language);
  const body = strengthenMarketNewsBody(language, inferredFrame, source, article, profile, rawBody, title);
  const excerptPublisher = sourceArticlePublisher(article.publisher || source.publisher);
  const rawStandfirst = sourceLeadWithPublisher(language, excerptPublisher, articleStandfirst(language, inferredFrame, source, article, profile));
  const excerpt = cleanMarketPublicText(compactNewsDeck(language, title, rawStandfirst), language);
  const geoSummary = sourceGeoSummary(language, inferredFrame, source, article, profile);
  const keyTakeaways = sourceKeyTakeaways(language, inferredFrame, source, article, profile);
  const seoDescription = marketSeoDescription(language, excerpt, geoSummary, keyTakeaways, body, title);
  const coverCredit = cleanSourceCredit(post.coverCredit || pack.coverCredit || source.publisher || "");
  const coverCreditUrl = post.coverCreditUrl || pack.coverCreditUrl || source.url || "";

  return {
    language,
    slug: slug || post.slug,
    title,
    seoTitle: truncate(`${title} | ${labels.category} | ALTOS LAB`, 76),
    seoDescription,
    excerpt: truncate(excerpt, 240),
    contentType: "breaking",
    newsCategory: labels.category,
    topic: cleanSourceTitle(source.title || post.topic),
    audience: post.audience || "",
    geoSummary,
    body,
    keyTakeaways,
    faqs: sourceFaqs(language, title, inferredFrame, source, article, profile),
    sourceLinks: publicSourceLinks(pack.sourceLinks || post.sourceLinks || [], source, profile),
    tags: [labels.category, "AI", inferredFrame.entity, inferredFrame.key].filter(Boolean).slice(0, 5),
    author: author || post.author || "Ken",
    readTimeMinutes: readTimeMinutes || post.readTimeMinutes || 3,
    cover: post.cover || pack.primarySourceImageUrl || post.primarySourceImageUrl || "",
    coverSource: post.coverSource || "source",
    coverCredit,
    coverCreditUrl,
    coverLicense: cleanSourceLicense(post.coverLicense || pack.coverLicense || "source image"),
    coverLicenseUrl: post.coverLicenseUrl || pack.coverLicenseUrl || coverCreditUrl,
    coverAlt: cleanCoverAlt(post.coverAlt, title, coverCredit),
    contentImages: sourceContentImages(language, title, article, post, pack),
    generatedBy: post.generatedBy || "market-source-worker",
    aiDisclosure: ""
  };
}

export function hasMarketTemplateSlop(post = {}) {
  const text = [
    post.title,
    post.seoTitle,
    post.seoDescription,
    post.excerpt,
    post.geoSummary,
    post.body,
    ...(post.keyTakeaways || [])
  ]
    .filter(Boolean)
    .join("\n");

  return /這則消息可以拿來|企業檢查|卡在哪個流程|原因是企業決策問題|Source:\s|Event:\s|Evidence:\s|Decision cue|source brief|source index|primary source; the article should stay anchored|Next action: choose one workflow|ALTOS LAB reader note|讀者怎麼看|真正要追|不是同類工具會不會更多，而是|不只是海外消息，而是/i.test(text);
}
