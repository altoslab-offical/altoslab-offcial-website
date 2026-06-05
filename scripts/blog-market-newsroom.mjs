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
      .replace(/押注需要有人監督 AI agent/g, "押注 AI agent 監控需求升溫")
      .replace(/您的/g, "使用者的")
      .replace(/向您展示/g, "向使用者展示")
      .replace(/向使用者的展示/g, "向使用者展示")
      .replace(/向使用者展示與使用者的搜尋查詢/g, "向使用者展示與搜尋查詢")
      .replace(/與使用者的搜尋查詢相符/g, "與搜尋查詢相符")
      .replace(/用戶/g, "使用者")
      .replace(/出於某種原因，?/g, "")
      .replace(/\.\s+(?=[A-Z\u4e00-\u9fff])/g, "。")
      .replace(/\s+([，。；：！？])/g, "$1")
      .replace(/([（「])\s+/g, "$1")
      .replace(/\s+([）」])/g, "$1");
  }
  if (language === "ja") {
    text = text
      .replace(/Coralogix社は/g, "Coralogix は")
      .replace(/AIエージェントを監視する人が必要だという賭けで2億ドルを調達した/g, "AI agent の監視需要を見込み 2 億ドルを調達した")
      .replace(/\.\s+(?=[A-Z\u3040-\u30ff\u4e00-\u9fff])/g, "。");
  }
  if (language === "ko") {
    text = text
      .replace(/AI 에이전트를 감시할 사람이 필요하다는 데 투자하여 2억 달러를 모금했습니다/g, "AI agent 모니터링 수요에 베팅하며 2억 달러를 조달했습니다")
      .replace(/\.\s+(?=[A-Z\uac00-\ud7af])/g, ". ");
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
      "zh-Hant": "該新創自建的語音 AI 系統，已在非洲與中東市場每天處理超過 17,000 通電話。",
      en: "The startup says its own stack for Africa and the Middle East now handles more than 17,000 calls a day.",
      ja: "同社は、アフリカと中東向けに構築した自社スタックが、現在 1 日 17,000 件超の通話を処理していると説明しています。",
      ko: "이 스타트업은 아프리카와 중동을 겨냥해 만든 자체 스택이 하루 17,000건이 넘는 전화를 처리하고 있다고 설명합니다.",
      id: "Startup ini menyebut stack internalnya untuk Afrika dan Timur Tengah kini menangani lebih dari 17.000 panggilan per hari.",
      vi: "Startup này cho biết stack tự xây cho châu Phi và Trung Đông hiện xử lý hơn 17.000 cuộc gọi mỗi ngày.",
      th: "สตาร์ทอัพระบุว่า stack ที่สร้างเองสำหรับตลาดแอฟริกาและตะวันออกกลาง รองรับสายโทรศัพท์มากกว่า 17,000 ครั้งต่อวันแล้ว",
      ms: "Startup itu berkata stack sendiri untuk Afrika dan Timur Tengah kini mengendalikan lebih 17,000 panggilan sehari.",
      fil: "Ayon sa startup, ang sarili nitong stack para sa Africa at Middle East ay humahawak na ng mahigit 17,000 tawag bawat araw."
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
      "zh-Hant": "兩位創辦人離開 Goldman 與 Meta，為被忽略的市場打造語音 AI",
      en: fallback,
      ja: "Goldman と Meta を離れた創業者が、見落とされてきた市場向けに音声 AI を作る",
      ko: "Goldman과 Meta를 떠난 두 창업자가 소외된 시장을 위한 음성 AI를 만든다",
      id: "Dua pendiri meninggalkan Goldman dan Meta untuk membangun voice AI bagi pasar yang terlewatkan",
      vi: "Hai nhà sáng lập rời Goldman và Meta để xây voice AI cho các thị trường bị bỏ qua",
      th: "ผู้ก่อตั้งสองคนออกจาก Goldman และ Meta เพื่อสร้าง voice AI ให้ตลาดที่ถูกมองข้าม",
      ms: "Dua pengasas meninggalkan Goldman dan Meta untuk membina voice AI bagi pasaran yang terlepas pandang",
      fil: "Dalawang founder ang umalis sa Goldman at Meta para bumuo ng voice AI para sa markets na nalalampasan"
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
  if (links.length >= 2) return links;
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
        "zh-Hant": "Vercel AI Gateway 加入更多模型，讓模型可用性變成開發者供應鏈問題",
        en: "Vercel AI Gateway adds more models, turning model availability into a developer supply-chain issue",
        ja: "Vercel AI Gateway がモデルを追加し、モデル可用性を開発者の供給網課題にする",
        ko: "Vercel AI Gateway가 모델을 추가하며 모델 가용성이 개발자 공급망 이슈가 된다",
        id: "Vercel AI Gateway menambah model baru dan membuat ketersediaan model jadi isu supply chain developer",
        vi: "Vercel AI Gateway thêm nhiều mô hình, biến khả năng dùng mô hình thành vấn đề chuỗi cung ứng của developer",
        th: "Vercel AI Gateway เพิ่มโมเดลใหม่ ทำให้ model availability กลายเป็นประเด็น supply chain ของนักพัฒนา",
        ms: "Vercel AI Gateway menambah model baharu dan menjadikan ketersediaan model isu supply chain pembangun",
        fil: "nagdaragdag ang Vercel AI Gateway ng models at ginagawang developer supply-chain issue ang model availability"
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

function knownProfile() {
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
  const focus = frame.focus?.[language] || frame.focus?.en;
  if (focus && !/generic|ai-market-update/i.test(frame.key || "") && !/source index|current ai feed|article claims should remain anchored/i.test(focus)) return focus;
  if (language === "en") return cleanArticleSourceTitle(article.headline || source.title || "AI market update");
  return cleanArticleSourceTitle(article.headline || source.title || "AI market update");
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
  return true;
}

function includesPublisher(text = "", publisher = "") {
  const normalizedPublisher = sourceArticlePublisher(publisher);
  if (!normalizedPublisher) return true;
  return normalizeNewsText(text).toLowerCase().includes(normalizedPublisher.toLowerCase());
}

function sourceLeadWithPublisher(language, publisher, text = "") {
  const cleanText = cleanMarketPublicText(text, language);
  if (!cleanText || includesPublisher(cleanText, publisher)) return cleanText;
  const cleanPublisher = sourceArticlePublisher(publisher);
  const byLanguage = {
    "zh-Hant": `${cleanPublisher} 報導，${cleanText}`,
    en: `${cleanPublisher} reported: ${cleanText}`,
    ja: `${cleanPublisher} は、${cleanText}`,
    ko: `${cleanPublisher}는 ${cleanText}`,
    id: `${cleanPublisher} melaporkan, ${cleanText}`,
    vi: `${cleanPublisher} đưa tin, ${cleanText}`,
    th: `${cleanPublisher} รายงานว่า ${cleanText}`,
    ms: `${cleanPublisher} melaporkan, ${cleanText}`,
    fil: `Iniulat ng ${cleanPublisher}: ${cleanText}`
  };
  return cleanMarketPublicText(byLanguage[language] || byLanguage.en, language);
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
  const title = articleTitle(language, frame, source, article, profile);
  const sourceSummaryLooksEnglish = /[a-z]{4,}\s+[a-z]{4,}/i.test(sourceSummary) && !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(sourceSummary);
  let standfirst = "";
  if (language === "en" && sourceSummary) standfirst = sourceSummary;
  else if (language === "zh-Hant") {
    if (sourceSummary && !sourceSummaryLooksEnglish) standfirst = sourceSummary;
    else standfirst = localizedSourceSummary(language, { ...source, summary: sourceSummary || source.summary || title }, frame) || title;
  } else if (sourceSummary && !sourceSummaryLooksEnglish) {
    standfirst = sourceSummary;
  } else {
    standfirst = localizedSourceSummary(language, { ...source, summary: sourceSummary || source.summary || title }, frame) || title;
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
      entityText && numberText ? `報導提到 ${entityText}；其中 ${numberText} 是文中可核對的主要數字。` : "",
      !numberText && entityText ? `報導主要提到 ${entityText}。` : "",
      numberText && !entityText ? `文中提到的主要數字包括 ${numberText}。` : ""
    ],
    en: [
      localizedSummary,
      entityText && numberText ? `The report mentions ${entityText}; key figures include ${numberText}.` : "",
      !numberText && entityText ? `The report centers on ${entityText}.` : "",
      numberText && !entityText ? `The main figures mentioned are ${numberText}.` : ""
    ],
    ja: [
      localizedSummary,
      entityText && numberText ? `報道では ${entityText} が取り上げられ、主な数字として ${numberText} が確認できます。` : "",
      !numberText && entityText ? `報道の中心は ${entityText} です。` : "",
      numberText && !entityText ? `文中の主な数字は ${numberText} です。` : ""
    ],
    ko: [
      localizedSummary,
      entityText && numberText ? `보도에는 ${entityText}가 언급됐고, 주요 수치는 ${numberText}입니다.` : "",
      !numberText && entityText ? `보도의 중심에는 ${entityText}가 있습니다.` : "",
      numberText && !entityText ? `본문의 주요 수치는 ${numberText}입니다.` : ""
    ],
    id: [
      localizedSummary,
      entityText && numberText ? `Laporan ini menyebut ${entityText}; angka utamanya termasuk ${numberText}.` : "",
      !numberText && entityText ? `Laporan ini berpusat pada ${entityText}.` : "",
      numberText && !entityText ? `Angka utama yang disebut ialah ${numberText}.` : ""
    ],
    vi: [
      localizedSummary,
      entityText && numberText ? `Bài viết nhắc tới ${entityText}; các con số chính gồm ${numberText}.` : "",
      !numberText && entityText ? `Bài viết xoay quanh ${entityText}.` : "",
      numberText && !entityText ? `Các con số chính được nhắc tới là ${numberText}.` : ""
    ],
    th: [
      localizedSummary,
      entityText && numberText ? `รายงานกล่าวถึง ${entityText} โดยมีตัวเลขสำคัญคือ ${numberText}` : "",
      !numberText && entityText ? `รายงานนี้เกี่ยวข้องกับ ${entityText}` : "",
      numberText && !entityText ? `ตัวเลขหลักที่ถูกกล่าวถึงคือ ${numberText}` : ""
    ],
    ms: [
      localizedSummary,
      entityText && numberText ? `Laporan ini menyebut ${entityText}; angka utamanya termasuk ${numberText}.` : "",
      !numberText && entityText ? `Laporan ini tertumpu pada ${entityText}.` : "",
      numberText && !entityText ? `Angka utama yang disebut ialah ${numberText}.` : ""
    ],
    fil: [
      localizedSummary,
      entityText && numberText ? `Binanggit sa ulat ang ${entityText}; kabilang sa pangunahing numero ang ${numberText}.` : "",
      !numberText && entityText ? `Nakatuon ang ulat sa ${entityText}.` : "",
      numberText && !entityText ? `Kabilang sa pangunahing numero ang ${numberText}.` : ""
    ]
  };
  return (byLanguage[language] || byLanguage.en).filter(Boolean).slice(0, 4);
}

function factsForArticle(language, frame, source, article, profile) {
  const profiled = profileFacts(profile, language);
  if (profiled.length) return profiled;
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const title = articleTitle(language, frame, source, article, profile);
  const numbers = (article.numbers || []).filter((number) => !/^\d$/.test(String(number).trim()));
  const entities = (article.entities || []).filter((entity) => !/\n/.test(String(entity))).filter((entity) => !/\b(You|The|This|Source)\b/.test(String(entity)));
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
    .slice(0, 4);
  if (article.localizedLanguage === language && sourceFacts.length >= 2) return sourceFacts;
  if (language === "zh-Hant") {
    if (sourceFacts.length >= 2 && !sourceFacts.some((fact) => /[a-z]{4,}\s+[a-z]{4,}/i.test(fact))) {
      return sourceFacts;
    }
    return localizedFallbackFacts(language, frame, source, article, publisher, title, numbers, entities);
  }
  if (language === "en" && sourceFacts.length >= 2) return sourceFacts;
  return localizedFallbackFacts(language, frame, source, article, publisher, title, numbers, entities);
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

function sentenceJoin(items = []) {
  return items
    .map((item) => normalizeNewsText(item))
    .filter(Boolean)
    .map((item) => (/[.!?。！？]$/.test(item) ? item : `${item}。`))
    .join(" ");
}

function comparableNewsText(value = "") {
  return normalizeNewsText(value)
    .toLowerCase()
    .replace(/^(techcrunch|the verge|wired|venturebeat|mit technology review)\s*(報導|reported|reports|指出|稱)[,，:：]?\s*/i, "")
    .replace(/^(報導指出|據報導|據報道|報導稱)[,，]?\s*/i, "")
    .replace(/[，。,.!?！？；;:\s]/g, "");
}

function factDiffersFromLead(fact = "", lead = "") {
  const normalizedFact = comparableNewsText(fact);
  const normalizedLead = comparableNewsText(lead);
  if (!normalizedFact) return false;
  if (!normalizedLead) return true;
  if (normalizedLead.includes(normalizedFact) || normalizedFact.includes(normalizedLead)) return false;
  const overlapLength = Math.min(normalizedFact.length, normalizedLead.length);
  if (overlapLength >= 48 && normalizedLead.slice(0, overlapLength).includes(normalizedFact.slice(0, Math.min(48, normalizedFact.length)))) return false;
  return true;
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
  const labels = labelsFor(language);
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const date = formatDate(article.publishedAt || source.publishedAt, language);
  const title = articleTitle(language, frame, source, article, profile);
  const lead = articleStandfirst(language, frame, source, article, profile);
  const facts = factsForArticle(language, frame, source, article, profile);
  const sourceIntro = labels.sourceIntro(publisher, date, title);
  const firstParagraph = lead && lead.toLowerCase().includes(publisher.toLowerCase())
    ? lead
    : `${sourceIntro}${lead ? ` ${lead}` : ""}`;
  const normalizedLead = normalizeNewsText(firstParagraph).toLowerCase();
  const factParagraph = sentenceJoin(
    facts
      .filter((fact) => normalizeNewsText(fact).toLowerCase() !== normalizedLead)
      .filter((fact) => factDiffersFromLead(fact, firstParagraph))
      .slice(0, 4)
  );
  const sourceContext = profileText(profile, "context", language, "") || marketNewsContextParagraph(language, frame, source, article, firstParagraph, factParagraph);
  const sourceWatch = profileText(profile, "watch", language, "");

  return cleanMarketPublicText([
    firstParagraph,
    factParagraph,
    sourceContext,
    sourceWatch
  ].filter(Boolean).join("\n\n"), language);
}

function marketNewsContextParagraph(language, frame, source, article, firstParagraph = "", factParagraph = "") {
  if (normalizeNewsText(firstParagraph).length + normalizeNewsText(factParagraph).length >= 220) return "";
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
  return "";
}

function sourceGeoSummary(language, frame, source, article, profile) {
  const standfirst = articleStandfirst(language, frame, source, article, profile);
  const context = profileText(profile, "context", language, "");
  return truncate(cleanMarketPublicText(`${standfirst} ${context}`.trim(), language), 220);
}

function sourceKeyTakeaways(language, frame, source, article, profile) {
  return factsForArticle(language, frame, source, article, profile)
    .map((fact) => cleanMarketPublicText(fact, language))
    .filter(Boolean)
    .slice(0, 4);
}

function sourceFaqs(language, title, frame, source, article, profile) {
  return [];
}

function sourceContentImages(language, title, article = {}, post = {}, pack = {}) {
  const existing = Array.isArray(post.contentImages) ? post.contentImages : [];
  const raw = existing.length ? existing : Array.isArray(article.images) ? article.images : [];
  const cover = post.cover || pack.primarySourceImageUrl || article.image?.url || "";
  const seen = new Set([cover].filter(Boolean));
  const credit = cleanSourceCredit(post.coverCredit || pack.coverCredit || article.image?.credit || article.publisher || "");
  const creditUrl = post.coverCreditUrl || pack.coverCreditUrl || article.image?.creditUrl || article.canonicalUrl || "";
  const placements = ["after-lead", "mid-article", "before-faq"];
  return raw
    .map((image, index) => {
      const url = image?.url || "";
      if (!url || seen.has(url)) return null;
      seen.add(url);
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
  const body = cleanMarketPublicText(sourceBackedBody(language, inferredFrame, source, article, profile), language);
  const excerptPublisher = sourceArticlePublisher(article.publisher || source.publisher);
  const excerpt = cleanMarketPublicText(
    sourceLeadWithPublisher(
      language,
      excerptPublisher,
      includeTitleWhenItCarriesNumbers(
        title,
        includeTitleWhenItCarriesNumbers(post.title || "", articleStandfirst(language, inferredFrame, source, article, profile), language),
        language
      )
    ),
    language
  );
  const seoDescription = truncate(excerpt, 176);
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
    geoSummary: sourceGeoSummary(language, inferredFrame, source, article, profile),
    body,
    keyTakeaways: sourceKeyTakeaways(language, inferredFrame, source, article, profile),
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
