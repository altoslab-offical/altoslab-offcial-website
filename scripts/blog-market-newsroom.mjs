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
    "zh-Hant": `來源重點圍繞「${focus}」；細節仍以原始報導與後續公開資料為準。`,
    ja: `出典の焦点は「${focus}」です。詳細は原文と今後の公開情報で確認する必要があります。`,
    ko: `출처의 핵심은 "${focus}"입니다. 세부 내용은 원문과 이후 공개 자료로 확인해야 합니다.`,
    id: `Fokus sumbernya adalah "${focus}". Detail tetap perlu dicek dari laporan asli dan pembaruan publik berikutnya.`,
    vi: `Trọng tâm của nguồn là "${focus}". Chi tiết vẫn cần đối chiếu với bài gốc và các cập nhật công khai sau đó.`,
    th: `ประเด็นหลักของแหล่งข่าวคือ "${focus}" รายละเอียดยังควรตรวจจากต้นฉบับและข้อมูลสาธารณะถัดไป`,
    ms: `Fokus sumber ialah "${focus}". Butiran masih perlu disemak melalui laporan asal dan kemas kini awam seterusnya.`,
    fil: `Ang pokus ng source ay "${focus}". Kailangang i-check pa rin ang detalye sa orihinal na ulat at susunod na public updates.`
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

const LABELS = {
  "zh-Hant": {
    category: "市場快訊",
    title: (frame, source) => localizedNewsTitle("zh-Hant", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} 於 ${date} 報導，${frame.focus["zh-Hant"]}。${summary}`,
    headings: ["消息落在哪個產品環節", "來源裡的具體細節", "先看採用而不是聲量", "下一步先看三個指標"],
    why: (frame) =>
      `以這則來源來看，重點是${localizedProduct("zh-Hant", frame)}已經開始碰到具體使用者與可觀察的使用量；後續才有辦法討論商業化與穩定部署。`,
    caution: "這則消息還需要看後續客戶採用、服務穩定性與實際營收表現。單一報導能說明市場有新動作，但還不能直接代表整個類別已成熟。",
    reader: "下一步先看三個指標：實際使用量是否增加、付費或正式採用是否出現、服務穩定性是否能撐過日常高峰。"
  },
  en: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("en", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} reported on ${date} that ${frame.focus.en}. ${summary}`,
    headings: ["Where the product changed", "Concrete details from the source", "Adoption matters more than buzz", "Next step: watch three signals"],
    why: (frame) =>
      `The signal is that ${localizedProduct("en", frame)} is moving closer to a concrete use case, a visible user group, and measurable volume.`,
    caution: "The next question is whether customer adoption, reliability, and revenue keep pace with the reported usage. One story can show momentum, but not category maturity by itself.",
    reader: "Next, watch three signals: real usage, paid or formal adoption, and whether reliability holds up under everyday load."
  },
  ja: {
    category: "マーケット速報",
    title: (frame, source) => localizedNewsTitle("ja", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} は ${date}、${frame.focus.ja} と報じました。${summary}`,
    headings: ["どの製品面が変わったか", "出典にある具体的な材料", "話題性より導入を見る", "次に見る三つの指標"],
    why: (frame) =>
      `このニュースで見るべき点は、${localizedProduct("ja", frame)} が具体的な利用場面、利用者層、測定できる利用量に近づいていることです。`,
    caution: "今後は顧客導入、信頼性、売上が利用量に伴って伸びるかを見る必要があります。単一の記事だけで市場成熟を判断することはできません。",
    reader: "次に見るのは三つです。実利用が増えるか、有料または正式導入が出るか、日常負荷でも安定するかです。"
  },
  ko: {
    category: "시장 브리프",
    title: (frame, source) => localizedNewsTitle("ko", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)}는 ${date} ${frame.focus.ko}고 보도했습니다. ${summary}`,
    headings: ["어떤 제품 지점이 바뀌었나", "출처의 구체적 내용", "화제성보다 도입을 본다", "다음에 볼 세 가지 지표"],
    why: (frame) =>
      `이 소식에서 볼 점은 ${localizedProduct("ko", frame)}가 구체적인 사용 장면, 사용자층, 측정 가능한 사용량에 가까워지고 있다는 것입니다.`,
    caution: "다음은 고객 도입, 안정성, 매출이 보도된 사용량을 따라가는지 확인해야 합니다. 기사 하나만으로 카테고리 성숙도를 단정할 수는 없습니다.",
    reader: "다음에 볼 것은 세 가지입니다. 실제 사용량이 늘어나는지, 유료 또는 공식 도입이 나오는지, 일상 부하에서도 안정적인지입니다."
  },
  id: {
    category: "Kabar Pasar",
    title: (frame, source) => localizedNewsTitle("id", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahwa ${frame.focus.id}. ${summary}`,
    headings: ["Bagian produk yang berubah", "Detail konkret dari sumber", "Adopsi lebih penting dari buzz", "Langkah berikut: pantau tiga sinyal"],
    why: (frame) =>
      `Sinyal pentingnya: ${localizedProduct("id", frame)} makin dekat dengan use case nyata, kelompok pengguna yang jelas, dan volume yang bisa diamati.`,
    caution: "Berikutnya perlu dilihat apakah adopsi pelanggan, reliabilitas, dan pendapatan ikut tumbuh bersama volume penggunaan. Satu laporan menunjukkan momentum, bukan bukti kematangan kategori.",
    reader: "Langkah berikutnya: pantau penggunaan nyata, adopsi berbayar atau resmi, dan apakah reliabilitas tetap kuat saat dipakai harian."
  },
  vi: {
    category: "Tin nhanh thị trường",
    title: (frame, source) => localizedNewsTitle("vi", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} đưa tin vào ${date} rằng ${frame.focus.vi}. ${summary}`,
    headings: ["Phần sản phẩm nào thay đổi", "Chi tiết cụ thể từ nguồn", "Nhìn adoption hơn là độ ồn", "Bước tiếp theo: theo dõi ba tín hiệu"],
    why: (frame) =>
      `Điểm đáng chú ý là ${localizedProduct("vi", frame)} đang tiến gần hơn tới một use case cụ thể, một nhóm người dùng rõ ràng và lượng sử dụng có thể quan sát.`,
    caution: "Bước tiếp theo là xem việc áp dụng của khách hàng, độ ổn định và doanh thu có đi cùng lượng sử dụng được công bố hay không. Một bài viết cho thấy đà chuyển động, chưa đủ để kết luận cả thị trường đã chín.",
    reader: "Bước tiếp theo là theo dõi ba tín hiệu: mức dùng thật, adoption trả phí hoặc chính thức, và độ ổn định khi đi vào vận hành hằng ngày."
  },
  th: {
    category: "ข่าวตลาด",
    title: (frame, source) => localizedNewsTitle("th", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} รายงานเมื่อ ${date} ว่า ${frame.focus.th} ${summary}`,
    headings: ["ส่วนใดของผลิตภัณฑ์ที่เปลี่ยน", "รายละเอียดชัดเจนจากแหล่งข่าว", "ดู adoption มากกว่าเสียงฮือฮา", "ขั้นต่อไป: ดูสามสัญญาณ"],
    why: (frame) =>
      `ประเด็นสำคัญคือ ${localizedProduct("th", frame)} กำลังเข้าใกล้ use case จริง กลุ่มผู้ใช้ที่ชัดเจน และปริมาณการใช้งานที่สังเกตได้`,
    caution: "ต้องดูต่อว่าการใช้งานของลูกค้า ความเสถียร และรายได้จะเติบโตตามตัวเลขที่รายงานหรือไม่ ข่าวหนึ่งชิ้นบอก momentum ได้ แต่ยังไม่พอจะสรุปว่าตลาดสุกงอมแล้ว",
    reader: "ขั้นต่อไปคือดูสามสัญญาณ: การใช้งานจริง การนำไปใช้แบบจ่ายเงินหรือแบบทางการ และความเสถียรเมื่ออยู่ในงานประจำวัน"
  },
  ms: {
    category: "Berita Pasaran",
    title: (frame, source) => localizedNewsTitle("ms", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahawa ${frame.focus.ms}. ${summary}`,
    headings: ["Bahagian produk yang berubah", "Butiran konkrit daripada sumber", "Adopsi lebih penting daripada buzz", "Langkah seterusnya: pantau tiga isyarat"],
    why: (frame) =>
      `Isyarat pentingnya: ${localizedProduct("ms", frame)} semakin dekat dengan use case sebenar, kumpulan pengguna yang jelas, dan volume penggunaan yang boleh diperhatikan.`,
    caution: "Selepas ini perlu dilihat sama ada adopsi pelanggan, kebolehpercayaan dan pendapatan bergerak seiring dengan volume penggunaan. Satu laporan menunjukkan momentum, bukan bukti kematangan kategori.",
    reader: "Langkah seterusnya: pantau penggunaan sebenar, adopsi berbayar atau rasmi, dan sama ada reliabiliti kekal kuat dalam operasi harian."
  },
  fil: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("fil", frame, source),
    standfirst: (frame, source, date, summary) =>
      `Iniulat ng ${shortPublisher(source.publisher)} noong ${date} na ${frame.focus.fil}. ${summary}`,
    headings: ["Aling bahagi ng produkto ang gumalaw", "Konkretong detalye mula sa source", "Mas mahalaga ang adoption kaysa ingay", "Susunod: bantayan ang tatlong signal"],
    why: (frame) =>
      `Ang mahalagang signal: mas lumalapit ang ${localizedProduct("fil", frame)} sa totoong use case, malinaw na user group, at usage volume na puwedeng obserbahan.`,
    caution: "Sunod na titingnan kung sasabay ang customer adoption, reliability, at revenue sa reported usage. Isang report lang ang nagpapakita ng momentum, hindi pa patunay na mature na ang buong category.",
    reader: "Susunod, bantayan ang tatlong signal: totoong usage, paid o formal adoption, at reliability kapag ginagamit na araw-araw."
  }
};

const VOICE_AI_BODY = {
  "zh-Hant": {
    excerpt:
      "TechCrunch 報導，AethexAI 完成 300 萬美元 pre-seed 融資，正把自建語音 AI 系統推向非洲與中東；公司稱目前每天處理超過 17,000 通電話。",
    geoSummary:
      "TechCrunch 報導的 AethexAI 故事，焦點放在它選擇避開歐美標準語音環境，直接為非洲與中東的方言、混合語言、電信基礎設施與價格條件做模型和部署。",
    keyTakeaways: [
      "AethexAI 完成 300 萬美元 pre-seed 輪，由 4DX Ventures 領投，投資人包含 Enza Capital、Dorm Room Fund、Mojo Ventures 與 Stanford GSB 26 Fund。",
      "公司自建小模型與協調層，目標是降低延遲、處理當地英語、法語與阿拉伯語口音，而非單純套用既有語音 AI orchestration 工具。",
      "AethexAI 表示，自己的 Kora 系列模型約 3 億到 17 億參數，並已在非洲與中東市場每天處理超過 17,000 通電話。",
      "目前常見場景包含債務催收、客戶啟用與 KYC；後續觀察包括企業採用、通話品質與付費留存。"
    ],
    body:
      "## Goldman、Meta 背景創辦人轉向區域語音 AI\n\nTechCrunch 報導，AethexAI 由 Mariama Diallo 與 Ayooluwa Odemuyiwa 創立。Diallo 曾任職 Goldman Sachs，後來加入 YC 支持的新創 ModelML；Odemuyiwa 畢業於 Caltech，曾在 Meta 工作，並進入 Stanford Business School。兩人把題目放在非洲與中東市場的語音 AI，暫時不以歐美主流企業客服市場為第一目標。\n\nAethexAI 已完成 300 萬美元 pre-seed 輪，由 4DX Ventures 領投，Enza Capital、Dorm Room Fund、Mojo Ventures、Stanford GSB 26 Fund 參與，個人投資人則包括 Stanford 教職員、電信主管與來自 Anthropic 的 AI 研究人員。\n\n## 為什麼它自建語音 AI 工具\n\nTechCrunch 指出，客服與服務是語音 AI 最熱的領域之一，但在非洲與中東，延遲、口音、語言混用與既有電話系統會讓現成方案變得不夠順。AethexAI 因此自建小模型與 orchestration layer，用來處理當地英語、法語與阿拉伯語的實際用法。\n\n公司稱 Kora 系列模型規模約在 3 億到 17 億參數之間。它把模型做小，主要是為了壓低延遲，同時保留足夠準確度。\n\n## 資料與使用量已經開始出現\n\n為了訓練模型，AethexAI 使用來自 call center partner 的匿名錄音，也把硬碟寄到非洲多地的廣播電台蒐集音訊資料；另外，公司建立由大學生組成的貢獻者網路，協助標註資料與錄製當地姓名發音。\n\nAethexAI 表示，目前自家系統每天處理超過 17,000 通電話。常見使用場景包括債務催收、客戶啟用與 KYC 身分驗證。公司也推出企業試用平台、API 與 SDK，讓企業與開發者測試模型。\n\n## 後續看點\n\n這則消息顯示，語音 AI 市場未必只由最大模型和最大平台決定。若企業需求來自特定地區的語音、電話網路、價格與工作流程，區域化模型與在地部署能力可能會變成差異。\n\n但這仍是早期新創故事。接下來要看的是：AethexAI 能否把 17,000 通電話的日常使用量轉成穩定企業收入，並在更多產業維持低延遲、可理解度與服務品質。"
  },
  en: {
    excerpt:
      "TechCrunch reports that AethexAI raised a $3 million pre-seed round and is taking its own voice AI stack into Africa and the Middle East, where it says it now handles more than 17,000 calls a day.",
    geoSummary:
      "TechCrunch's AethexAI story focuses on a regional voice AI bet: Africa and the Middle East need systems built for local dialects, code-switching, telephony infrastructure, and price points that mainstream products often miss.",
    keyTakeaways: [
      "AethexAI raised a $3 million pre-seed round led by 4DX Ventures, with participation from Enza Capital, Dorm Room Fund, Mojo Ventures, and Stanford GSB 26 Fund.",
      "The company built its own small models and orchestration layer to reduce latency, rather than simply wrapping existing voice AI tools.",
      "The company says its Kora models range from about 300 million to 1.7 billion parameters and now handle more than 17,000 calls a day.",
      "Early use cases include debt collection, customer activation, and KYC; the next questions are adoption, call quality, and retention."
    ],
    body:
      "## Former Goldman and Meta talent turns to regional voice AI\n\nTechCrunch reported that AethexAI was founded by Mariama Diallo and Ayooluwa Odemuyiwa. Diallo previously worked at Goldman Sachs and later joined YC-backed ModelML. Odemuyiwa graduated from Caltech, worked at Meta, and enrolled at Stanford Business School before co-founding the company. Their first target is voice AI for Africa and the Middle East rather than the default U.S. enterprise support market.\n\nAethexAI has raised $3 million in pre-seed funding led by 4DX Ventures. Enza Capital, Dorm Room Fund, Mojo Ventures, and Stanford GSB 26 Fund also participated, alongside individual investors including Stanford faculty, telecom executives, and AI researchers from Anthropic.\n\n## Why it built its own voice AI stack\n\nCustomer support and service are hot areas for voice AI, but TechCrunch notes that Africa and the Middle East bring different constraints: latency, dialects, code-switching, informal speech, telephony infrastructure, and cost. AethexAI therefore built its own small models and orchestration layer to handle live regional calls.\n\nThe company calls its model family Kora. The models range from about 300 million to 1.7 billion parameters. Smaller models help keep latency low while staying accurate enough for live calls.\n\n## Usage is already visible\n\nTo train the models, AethexAI used anonymized recordings from a call center partner. It also collected audio from radio stations across Africa and built a contributor network of university students to annotate data and pronounce local names.\n\nThe company says its system now handles more than 17,000 calls per day. Current use cases include debt collection, customer activation, and KYC. It is also launching an enterprise platform, APIs, and SDKs for companies and developers to test the technology.\n\n## What to watch next\n\nThe useful signal in this story is that voice AI may depend on regional data and infrastructure as much as model size. If the hard part is regional speech, telephony, pricing, and deployment, local systems can matter alongside global platforms.\n\nIt is still an early-stage startup story. The next proof points are whether AethexAI can turn call volume into durable enterprise revenue, maintain low latency, and keep quality high across more industries."
  },
  ja: {
    excerpt:
      "TechCrunch は、AethexAI が 300 万ドルの pre-seed 資金を調達し、自社開発の音声 AI スタックをアフリカと中東へ展開していると報じました。同社は 1 日 17,000 件超の通話を処理しているとしています。",
    geoSummary:
      "TechCrunch の AethexAI 報道で重要なのは、同社が欧米の標準的な音声環境ではなく、アフリカと中東の方言、コードスイッチング、電話網、価格条件に合わせて音声 AI を作ろうとしている点です。",
    keyTakeaways: [
      "AethexAI は 4DX Ventures 主導で 300 万ドルの pre-seed ラウンドを調達し、Enza Capital、Dorm Room Fund、Mojo Ventures、Stanford GSB 26 Fund も参加しました。",
      "同社は既存の音声 AI orchestration ツールを包むだけでなく、低遅延を狙って小型モデルと orchestration layer を自社開発しています。",
      "Kora シリーズは約 3 億から 17 億パラメータで、同社は 1 日 17,000 件超の通話を処理していると説明しています。",
      "用途は債権回収、顧客アクティベーション、KYC など。次に見るべき点は導入企業、通話品質、有料継続です。"
    ],
    body:
      "## Goldman と Meta 出身の創業者が地域特化の音声 AI へ\n\nTechCrunch によると、AethexAI は Mariama Diallo と Ayooluwa Odemuyiwa が創業しました。Diallo は Goldman Sachs で働いた後、YC 支援の ModelML に参加。Odemuyiwa は Caltech 卒業後に Meta で働き、Stanford Business School に進んだ人物です。二人が選んだのは、米国企業向けの一般的な客服市場ではなく、アフリカと中東向けの音声 AI でした。\n\nAethexAI は 4DX Ventures 主導で 300 万ドルの pre-seed 資金を調達しました。Enza Capital、Dorm Room Fund、Mojo Ventures、Stanford GSB 26 Fund に加え、Stanford 関係者、通信業界の幹部、Anthropic の AI 研究者も個人投資家として参加しています。\n\n## なぜ自社スタックを作ったのか\n\nTechCrunch は、音声 AI で客服やサービス領域が熱くなる一方、アフリカと中東では遅延、方言、言語の混在、既存の電話網、価格条件が大きな制約になると説明しています。AethexAI は既存ツールの上に乗るだけでなく、小型モデルと orchestration layer を自社で作る選択をしました。\n\n同社のモデル群は Kora と呼ばれ、規模は約 3 億から 17 億パラメータ。最大モデルを競うのではなく、ライブ通話で必要な低遅延と精度の両立を狙っています。\n\n## 利用量も出始めている\n\nAethexAI は call center partner からの匿名録音を使ってモデルを訓練し、アフリカ各地のラジオ局から音声データも集めました。さらに大学生の contributor network を作り、データ注釈や現地名の発音収録を進めています。\n\n同社は、自社システムが現在 1 日 17,000 件超の通話を処理していると説明しています。用途は債権回収、顧客アクティベーション、KYC が中心で、企業向けプラットフォーム、API、SDK も公開しています。\n\n## 次に見るべきこと\n\nこのニュースが示すのは、音声 AI が最大モデルや大手プラットフォームだけで決まるわけではないということです。地域ごとの話し方、電話網、価格、導入現場が難所なら、ローカルデータと現地向けのインフラも競争力になります。\n\nただし、これはまだ初期スタートアップの話です。今後は、AethexAI が通話量を安定した企業収益へ変えられるか、低遅延を維持できるか、より多くの業種で品質を保てるかを見る必要があります。"
  },
  ko: {
    excerpt:
      "TechCrunch는 AethexAI가 300만 달러 pre-seed 투자를 유치하고 자체 음성 AI 스택을 아프리카와 중동 시장에 내놓고 있다고 보도했습니다. 회사는 하루 17,000건이 넘는 통화를 처리한다고 밝혔습니다.",
    geoSummary:
      "TechCrunch가 전한 AethexAI 이야기의 핵심은 또 하나의 음성 AI 스타트업이 아니라, 아프리카와 중동의 방언, 코드 스위칭, 전화 인프라, 가격 조건에 맞춘 시스템을 만들고 있다는 점입니다.",
    keyTakeaways: [
      "AethexAI는 4DX Ventures가 주도한 300만 달러 pre-seed 라운드를 유치했고 Enza Capital, Dorm Room Fund, Mojo Ventures, Stanford GSB 26 Fund가 참여했습니다.",
      "기존 음성 AI orchestration 도구를 감싸는 대신, 지연 시간을 줄이기 위해 작은 모델과 orchestration layer를 직접 만들었습니다.",
      "Kora 모델은 약 3억에서 17억 파라미터 규모이며, 회사는 하루 17,000건 이상의 통화를 처리한다고 설명합니다.",
      "초기 사용 사례는 채권 회수, 고객 활성화, KYC입니다. 다음은 실제 도입, 통화 품질, 유료 유지율입니다."
    ],
    body:
      "## Goldman과 Meta 출신 창업자가 지역 음성 AI로 간다\n\nTechCrunch에 따르면 AethexAI는 Mariama Diallo와 Ayooluwa Odemuyiwa가 창업했습니다. Diallo는 Goldman Sachs에서 일한 뒤 YC 지원 스타트업 ModelML에 합류했고, Odemuyiwa는 Caltech를 졸업한 뒤 Meta에서 일하고 Stanford Business School에 진학했습니다. 두 사람이 잡은 시장은 미국식 기업 고객센터가 아니라 아프리카와 중동의 음성 AI입니다.\n\nAethexAI는 4DX Ventures가 주도한 300만 달러 pre-seed 투자를 유치했습니다. Enza Capital, Dorm Room Fund, Mojo Ventures, Stanford GSB 26 Fund가 참여했고 Stanford 교수진, 통신업계 임원, Anthropic AI 연구자도 개인 투자자로 이름을 올렸습니다.\n\n## 왜 자체 음성 AI 스택을 만들었나\n\nTechCrunch는 고객 지원과 서비스가 음성 AI의 뜨거운 영역이지만, 아프리카와 중동에서는 지연 시간, 방언, 코드 스위칭, 비공식 말투, 전화망, 비용 조건이 다르다고 짚었습니다. AethexAI는 기존 도구 위에 얹히는 대신 작은 모델과 orchestration layer를 직접 구축했습니다.\n\n회사의 모델군은 Kora입니다. 규모는 약 3억에서 17억 파라미터입니다. 가장 큰 모델을 만들겠다는 뜻이 아니라, 실제 통화에서 필요한 낮은 지연 시간과 충분한 정확도를 맞추려는 선택입니다.\n\n## 사용량도 이미 보인다\n\nAethexAI는 call center partner의 익명화된 녹음을 훈련에 사용했고, 아프리카 여러 지역 라디오 방송국에서 오디오 데이터도 모았습니다. 또 대학생 기여자 네트워크를 만들어 데이터 주석과 현지 이름 발음을 수집했습니다.\n\n회사는 자체 시스템이 현재 하루 17,000건이 넘는 전화를 처리한다고 밝혔습니다. 사용 사례는 채권 회수, 고객 활성화, KYC가 중심이며 기업용 플랫폼, API, SDK도 공개하고 있습니다.\n\n## 다음에 볼 점\n\n이 소식이 보여주는 건 음성 AI 경쟁이 가장 큰 모델이나 글로벌 플랫폼만으로 결정되지 않을 수 있다는 점입니다. 지역 언어, 전화 인프라, 가격, 현장 배포가 어려운 부분이라면 현지 데이터와 인프라도 중요한 차이가 됩니다.\n\n다만 아직 초기 스타트업의 이야기입니다. 앞으로는 AethexAI가 통화량을 지속 가능한 기업 매출로 바꿀 수 있는지, 낮은 지연 시간을 유지하는지, 더 많은 산업에서 품질을 지키는지가 관건입니다."
  },
  id: {
    excerpt:
      "TechCrunch melaporkan AethexAI meraih pre-seed US$3 juta dan membawa stack voice AI buatannya ke Afrika serta Timur Tengah; perusahaan menyebut sistemnya kini menangani lebih dari 17.000 panggilan per hari.",
    geoSummary:
      "Laporan TechCrunch tentang AethexAI bukan sekadar cerita startup voice AI baru. Taruhannya adalah sistem yang dibangun untuk dialek lokal, code-switching, infrastruktur telepon, dan titik harga di Afrika serta Timur Tengah.",
    keyTakeaways: [
      "AethexAI meraih pre-seed US$3 juta yang dipimpin 4DX Ventures, dengan Enza Capital, Dorm Room Fund, Mojo Ventures, dan Stanford GSB 26 Fund ikut berpartisipasi.",
      "Perusahaan tidak hanya membungkus tool voice AI yang sudah ada, tetapi membangun model kecil dan orchestration layer sendiri untuk menekan latensi.",
      "Model Kora disebut berukuran sekitar 300 juta sampai 1,7 miliar parameter dan kini menangani lebih dari 17.000 panggilan per hari.",
      "Use case awal mencakup debt collection, customer activation, dan KYC; yang perlu dipantau adalah adopsi, kualitas panggilan, dan retensi berbayar."
    ],
    body:
      "## Pendiri berlatar Goldman dan Meta masuk ke voice AI regional\n\nTechCrunch melaporkan AethexAI didirikan oleh Mariama Diallo dan Ayooluwa Odemuyiwa. Diallo pernah bekerja di Goldman Sachs lalu bergabung dengan ModelML yang didukung YC. Odemuyiwa lulus dari Caltech, bekerja di Meta, dan masuk Stanford Business School sebelum ikut mendirikan perusahaan. Target mereka bukan pasar customer support enterprise AS, tetapi voice AI untuk Afrika dan Timur Tengah.\n\nAethexAI telah mengumpulkan pendanaan pre-seed US$3 juta yang dipimpin 4DX Ventures. Enza Capital, Dorm Room Fund, Mojo Ventures, dan Stanford GSB 26 Fund ikut masuk, bersama investor individu dari Stanford, eksekutif telekomunikasi, dan peneliti AI dari Anthropic.\n\n## Kenapa membangun stack sendiri\n\nCustomer support dan service memang sedang panas di voice AI. Namun TechCrunch mencatat Afrika dan Timur Tengah punya kendala berbeda: latensi, dialek, code-switching, bahasa informal, infrastruktur telepon, dan biaya. AethexAI memilih membangun model kecil dan orchestration layer sendiri, bukan sekadar berdiri di atas tool yang sudah ada.\n\nKeluarga modelnya disebut Kora, dengan ukuran sekitar 300 juta sampai 1,7 miliar parameter. Tujuannya bukan menjadi model terbesar, melainkan menjaga latensi rendah sambil cukup akurat untuk panggilan langsung.\n\n## Volume penggunaan mulai terlihat\n\nUntuk melatih model, AethexAI memakai rekaman anonim dari partner call center. Perusahaan juga mengumpulkan audio dari stasiun radio di Afrika dan membangun jaringan kontributor mahasiswa untuk anotasi data serta pelafalan nama lokal.\n\nAethexAI mengatakan sistemnya kini menangani lebih dari 17.000 panggilan per hari. Use case saat ini mencakup debt collection, customer activation, dan KYC. Perusahaan juga meluncurkan platform enterprise, API, dan SDK untuk diuji perusahaan serta developer.\n\n## Yang perlu dipantau\n\nSinyalnya: voice AI mungkin tidak hanya dimenangkan oleh model terbesar atau platform global terbesar. Jika tantangannya ada pada ucapan regional, telepon, harga, dan deployment, data lokal serta infrastruktur lapangan bisa sama pentingnya dengan ukuran model.\n\nNamun ini masih cerita startup tahap awal. Bukti berikutnya adalah apakah AethexAI bisa mengubah volume panggilan menjadi pendapatan enterprise yang tahan lama, menjaga latensi rendah, dan mempertahankan kualitas di lebih banyak industri."
  },
  vi: {
    excerpt:
      "TechCrunch đưa tin AethexAI gọi được 3 triệu USD pre-seed và đang đưa voice AI stack tự xây vào châu Phi cùng Trung Đông; công ty nói hệ thống hiện xử lý hơn 17.000 cuộc gọi mỗi ngày.",
    geoSummary:
      "Bài TechCrunch về AethexAI không chỉ là một startup voice AI mới. Điểm đáng chú ý là cách họ xây hệ thống cho phương ngữ địa phương, code-switching, hạ tầng điện thoại và mức giá ở châu Phi, Trung Đông.",
    keyTakeaways: [
      "AethexAI gọi được 3 triệu USD pre-seed do 4DX Ventures dẫn dắt, cùng Enza Capital, Dorm Room Fund, Mojo Ventures và Stanford GSB 26 Fund.",
      "Công ty không chỉ dùng lại các tool voice AI orchestration có sẵn, mà tự xây mô hình nhỏ và orchestration layer để giảm độ trễ.",
      "Dòng model Kora được mô tả có khoảng 300 triệu đến 1,7 tỷ tham số và hiện xử lý hơn 17.000 cuộc gọi mỗi ngày.",
      "Use case ban đầu gồm thu hồi nợ, kích hoạt khách hàng và KYC; cần theo dõi adoption, chất lượng cuộc gọi và tỷ lệ giữ chân trả phí."
    ],
    body:
      "## Nhà sáng lập từ Goldman và Meta chuyển sang voice AI khu vực\n\nTheo TechCrunch, AethexAI được sáng lập bởi Mariama Diallo và Ayooluwa Odemuyiwa. Diallo từng làm ở Goldman Sachs rồi tham gia ModelML, một startup được YC hậu thuẫn. Odemuyiwa tốt nghiệp Caltech, từng làm ở Meta và vào Stanford Business School trước khi đồng sáng lập công ty. Họ không nhắm vào thị trường enterprise support kiểu Mỹ trước, mà chọn voice AI cho châu Phi và Trung Đông.\n\nAethexAI đã gọi được 3 triệu USD pre-seed do 4DX Ventures dẫn dắt. Enza Capital, Dorm Room Fund, Mojo Ventures và Stanford GSB 26 Fund tham gia vòng này, cùng các nhà đầu tư cá nhân là giảng viên Stanford, lãnh đạo viễn thông và nhà nghiên cứu AI từ Anthropic.\n\n## Vì sao họ tự xây voice AI stack\n\nCustomer support và service đang là mảng nóng của voice AI, nhưng TechCrunch chỉ ra rằng châu Phi và Trung Đông có những ràng buộc khác: độ trễ, phương ngữ, code-switching, cách nói đời thường, hạ tầng điện thoại và chi phí. AethexAI vì vậy tự xây mô hình nhỏ và orchestration layer, thay vì chỉ đứng trên các tool có sẵn.\n\nDòng model của công ty tên là Kora, có quy mô khoảng 300 triệu đến 1,7 tỷ tham số. Mục tiêu không phải chạy theo mô hình lớn nhất, mà là giữ độ trễ thấp trong cuộc gọi trực tiếp nhưng vẫn đủ chính xác.\n\n## Lượng sử dụng đã bắt đầu hiện rõ\n\nĐể huấn luyện model, AethexAI dùng bản ghi âm đã ẩn danh từ một đối tác call center. Công ty cũng thu thập âm thanh từ các đài radio ở châu Phi và xây mạng lưới sinh viên để gán nhãn dữ liệu, ghi cách phát âm tên địa phương.\n\nAethexAI cho biết hệ thống hiện xử lý hơn 17.000 cuộc gọi mỗi ngày. Các use case phổ biến gồm thu hồi nợ, kích hoạt khách hàng và KYC. Công ty cũng mở nền tảng enterprise, API và SDK để doanh nghiệp và developer thử nghiệm.\n\n## Điều cần theo dõi\n\nTín hiệu hữu ích ở đây là voice AI có thể không chỉ thuộc về mô hình lớn nhất hay platform toàn cầu lớn nhất. Nếu phần khó nằm ở giọng địa phương, điện thoại, giá và triển khai thực tế, dữ liệu bản địa và hạ tầng tại chỗ sẽ rất quan trọng.\n\nDù vậy, đây vẫn là câu chuyện startup giai đoạn sớm. Bằng chứng tiếp theo là AethexAI có biến volume cuộc gọi thành doanh thu enterprise bền vững hay không, có giữ được độ trễ thấp và chất lượng khi mở rộng sang nhiều ngành hơn hay không."
  },
  th: {
    excerpt:
      "TechCrunch รายงานว่า AethexAI ระดมทุน pre-seed ได้ 3 ล้านดอลลาร์ และกำลังนำ voice AI stack ที่สร้างเองเข้าสู่ตลาดแอฟริกาและตะวันออกกลาง โดยบริษัทระบุว่าระบบรองรับสายมากกว่า 17,000 ครั้งต่อวัน",
    geoSummary:
      "รายงานของ TechCrunch เรื่อง AethexAI ไม่ใช่แค่ข่าวสตาร์ทอัพ voice AI อีกราย แต่เป็นการเดิมพันว่าตลาดแอฟริกาและตะวันออกกลางต้องการระบบที่เข้าใจ dialect, code-switching, โครงข่ายโทรศัพท์ และต้นทุนจริง",
    keyTakeaways: [
      "AethexAI ระดมทุน pre-seed 3 ล้านดอลลาร์ นำโดย 4DX Ventures พร้อม Enza Capital, Dorm Room Fund, Mojo Ventures และ Stanford GSB 26 Fund",
      "บริษัทไม่ได้แค่ใช้เครื่องมือ voice AI orchestration ที่มีอยู่ แต่สร้างโมเดลขนาดเล็กและ orchestration layer เองเพื่อลด latency",
      "โมเดล Kora มีขนาดประมาณ 300 ล้านถึง 1.7 พันล้านพารามิเตอร์ และบริษัทระบุว่ารองรับสายมากกว่า 17,000 ครั้งต่อวัน",
      "use case แรก ๆ ได้แก่ debt collection, customer activation และ KYC สิ่งที่ต้องดูต่อคือ adoption, คุณภาพสาย และลูกค้าจ่ายเงินระยะยาว"
    ],
    body:
      "## ผู้ก่อตั้งจาก Goldman และ Meta หันมาทำ voice AI เฉพาะภูมิภาค\n\nTechCrunch รายงานว่า AethexAI ก่อตั้งโดย Mariama Diallo และ Ayooluwa Odemuyiwa โดย Diallo เคยทำงานที่ Goldman Sachs ก่อนเข้าร่วม ModelML ที่ได้รับการสนับสนุนจาก YC ส่วน Odemuyiwa จบจาก Caltech เคยทำงานที่ Meta และเข้า Stanford Business School ก่อนร่วมก่อตั้งบริษัท ตลาดที่ทั้งคู่เลือกไม่ใช่ customer support enterprise แบบสหรัฐฯ แต่เป็น voice AI สำหรับแอฟริกาและตะวันออกกลาง\n\nAethexAI ระดมทุน pre-seed ได้ 3 ล้านดอลลาร์ นำโดย 4DX Ventures และมี Enza Capital, Dorm Room Fund, Mojo Ventures, Stanford GSB 26 Fund เข้าร่วม รวมถึงนักลงทุนรายบุคคลจาก Stanford ผู้บริหารโทรคมนาคม และนักวิจัย AI จาก Anthropic\n\n## ทำไมต้องสร้าง stack เอง\n\nCustomer support และ service เป็นพื้นที่ร้อนของ voice AI แต่ TechCrunch ชี้ว่าแอฟริกาและตะวันออกกลางมีข้อจำกัดต่างออกไป ทั้ง latency, dialect, code-switching, ภาษาพูดไม่เป็นทางการ, โครงข่ายโทรศัพท์ และต้นทุน AethexAI จึงเลือกสร้างโมเดลขนาดเล็กกับ orchestration layer เอง แทนที่จะวางตัวอยู่บน tool ที่มีอยู่แล้ว\n\nตระกูลโมเดลของบริษัทชื่อ Kora มีขนาดประมาณ 300 ล้านถึง 1.7 พันล้านพารามิเตอร์ เป้าหมายไม่ใช่ทำโมเดลใหญ่ที่สุด แต่คือให้ latency ต่ำพอสำหรับสายจริงและยังแม่นพอใช้งานได้\n\n## เริ่มเห็น usage แล้ว\n\nในการฝึกโมเดล AethexAI ใช้เสียงบันทึกที่ anonymized จาก call center partner และเก็บข้อมูลเสียงจากสถานีวิทยุในแอฟริกา นอกจากนี้ยังสร้างเครือข่ายนักศึกษาช่วย annotate ข้อมูลและออกเสียงชื่อท้องถิ่น\n\nบริษัทระบุว่าระบบรองรับสายมากกว่า 17,000 ครั้งต่อวันแล้ว use case ปัจจุบันมี debt collection, customer activation และ KYC พร้อมเปิดแพลตฟอร์ม enterprise, API และ SDK ให้บริษัทกับนักพัฒนาทดลอง\n\n## สิ่งที่ต้องดูต่อ\n\nสัญญาณจากข่าวนี้คือ voice AI อาจไม่ได้ชนะด้วยโมเดลใหญ่ที่สุดหรือแพลตฟอร์มระดับโลกเท่านั้น ถ้าความยากอยู่ที่ภาษาท้องถิ่น ระบบโทรศัพท์ ต้นทุน และ deployment ในพื้นที่จริง ข้อมูลท้องถิ่นกับ infrastructure ภาคสนามก็สำคัญมาก\n\nอย่างไรก็ตาม นี่ยังเป็นเรื่องของสตาร์ทอัพระยะต้น หลักฐานถัดไปคือ AethexAI จะเปลี่ยน volume การโทรให้เป็นรายได้ enterprise ที่ยั่งยืนได้หรือไม่ รักษา latency ต่ำได้หรือไม่ และคุมคุณภาพเมื่อขยายไปหลายอุตสาหกรรมได้หรือไม่"
  },
  ms: {
    excerpt:
      "TechCrunch melaporkan AethexAI mengumpul pre-seed AS$3 juta dan membawa stack voice AI sendiri ke Afrika serta Timur Tengah; syarikat berkata sistemnya kini mengendalikan lebih 17,000 panggilan sehari.",
    geoSummary:
      "Laporan TechCrunch tentang AethexAI bukan sekadar kisah startup voice AI baharu. Taruhannya ialah sistem untuk dialek tempatan, code-switching, infrastruktur telefon dan harga sebenar di Afrika serta Timur Tengah.",
    keyTakeaways: [
      "AethexAI meraih pre-seed AS$3 juta yang diterajui 4DX Ventures, dengan penyertaan Enza Capital, Dorm Room Fund, Mojo Ventures dan Stanford GSB 26 Fund.",
      "Syarikat itu tidak hanya membungkus tool voice AI orchestration sedia ada; ia membina model kecil dan orchestration layer sendiri untuk menurunkan latensi.",
      "Model Kora disebut sekitar 300 juta hingga 1.7 bilion parameter, dan syarikat berkata ia mengendalikan lebih 17,000 panggilan sehari.",
      "Use case awal termasuk debt collection, customer activation dan KYC; perkara seterusnya ialah adopsi, kualiti panggilan dan retensi berbayar."
    ],
    body:
      "## Pengasas dari Goldman dan Meta beralih ke voice AI serantau\n\nTechCrunch melaporkan AethexAI diasaskan oleh Mariama Diallo dan Ayooluwa Odemuyiwa. Diallo pernah bekerja di Goldman Sachs sebelum menyertai ModelML yang disokong YC. Odemuyiwa pula lulusan Caltech, pernah bekerja di Meta dan memasuki Stanford Business School sebelum bersama-sama menubuhkan syarikat itu. Sasaran mereka bukan pasaran enterprise support gaya AS, tetapi voice AI untuk Afrika dan Timur Tengah.\n\nAethexAI telah mengumpul pendanaan pre-seed AS$3 juta diterajui 4DX Ventures. Enza Capital, Dorm Room Fund, Mojo Ventures dan Stanford GSB 26 Fund turut menyertai, bersama pelabur individu termasuk fakulti Stanford, eksekutif telekomunikasi dan penyelidik AI dari Anthropic.\n\n## Mengapa ia membina stack sendiri\n\nCustomer support dan service ialah antara bidang paling panas dalam voice AI, tetapi TechCrunch menyatakan Afrika dan Timur Tengah membawa kekangan berbeza: latensi, dialek, code-switching, pertuturan tidak formal, infrastruktur telefon dan kos. AethexAI memilih membina model kecil dan orchestration layer sendiri, bukan sekadar berada di atas tool sedia ada.\n\nKeluarga model syarikat itu dinamakan Kora, dengan saiz sekitar 300 juta hingga 1.7 bilion parameter. Matlamatnya bukan menjadi model terbesar, tetapi mengekalkan latensi rendah sambil cukup tepat untuk panggilan langsung.\n\n## Penggunaan sudah mula kelihatan\n\nUntuk melatih model, AethexAI menggunakan rakaman tanpa identiti daripada rakan call center. Ia juga mengumpul audio daripada stesen radio di Afrika dan membina rangkaian penyumbang pelajar universiti untuk anotasi data serta sebutan nama tempatan.\n\nSyarikat berkata sistemnya kini mengendalikan lebih 17,000 panggilan sehari. Use case semasa termasuk debt collection, customer activation dan KYC. Ia juga melancarkan platform enterprise, API dan SDK untuk diuji syarikat serta pembangun.\n\n## Perkara untuk dipantau\n\nIsyarat berguna di sini ialah voice AI mungkin tidak hanya dimenangi oleh model terbesar atau platform global terbesar. Jika cabarannya ialah pertuturan serantau, telefon, harga dan deployment, data tempatan serta infrastruktur lapangan boleh jadi sama penting dengan saiz model.\n\nNamun ini masih kisah startup peringkat awal. Bukti seterusnya ialah sama ada AethexAI boleh menukar volume panggilan kepada pendapatan enterprise yang tahan lama, mengekalkan latensi rendah dan menjaga kualiti merentas lebih banyak industri."
  },
  fil: {
    excerpt:
      "Iniulat ng TechCrunch na nakalikom ang AethexAI ng $3 milyon na pre-seed at dinadala ang sarili nitong voice AI stack sa Africa at Middle East; sinasabi ng kumpanya na humahawak na ito ng mahigit 17,000 tawag bawat araw.",
    geoSummary:
      "Ang TechCrunch story tungkol sa AethexAI ay hindi lang tungkol sa isa pang voice AI startup. Ang taya nito: kailangan ng Africa at Middle East ng systems para sa local dialects, code-switching, telephony infrastructure at presyo na madalas hindi sakop ng mainstream products.",
    keyTakeaways: [
      "Nakalikom ang AethexAI ng $3 milyon na pre-seed round na pinangunahan ng 4DX Ventures, kasama ang Enza Capital, Dorm Room Fund, Mojo Ventures at Stanford GSB 26 Fund.",
      "Hindi lang ginamit ng kumpanya ang existing voice AI orchestration tools; gumawa ito ng sariling small models at orchestration layer para bawasan ang latency.",
      "Ang Kora models ay nasa humigit-kumulang 300 milyon hanggang 1.7 bilyong parameters, at sinasabi ng kumpanya na humahawak ito ng mahigit 17,000 tawag bawat araw.",
      "Unang use cases ang debt collection, customer activation at KYC; ang susunod na dapat bantayan ay adoption, call quality at paid retention."
    ],
    body:
      "## Founders mula Goldman at Meta, pumasok sa regional voice AI\n\nAyon sa TechCrunch, ang AethexAI ay itinatag nina Mariama Diallo at Ayooluwa Odemuyiwa. Nagtrabaho si Diallo sa Goldman Sachs at sumali kalaunan sa YC-backed ModelML. Si Odemuyiwa ay graduate ng Caltech, nagtrabaho sa Meta, at pumasok sa Stanford Business School bago mag-cofound. Ang target nila ay hindi muna ang karaniwang U.S. enterprise support market, kundi voice AI para sa Africa at Middle East.\n\nNakalikom ang AethexAI ng $3 milyon sa pre-seed funding na pinangunahan ng 4DX Ventures. Kasama rin ang Enza Capital, Dorm Room Fund, Mojo Ventures at Stanford GSB 26 Fund, pati individual investors mula sa Stanford, telecom executives at AI researchers mula Anthropic.\n\n## Bakit sariling stack ang ginawa\n\nMainit ngayon ang customer support at service sa voice AI, pero ayon sa TechCrunch, iba ang constraints sa Africa at Middle East: latency, dialects, code-switching, informal speech, telephony infrastructure at presyo. Kaya pinili ng AethexAI na gumawa ng sariling small models at orchestration layer, imbes na umasa lang sa existing tools.\n\nKora ang tawag sa model family nito, na nasa humigit-kumulang 300 milyon hanggang 1.7 bilyong parameters. Hindi ang pinakamalaking model ang goal; ang mahalaga ay mababang latency at sapat na accuracy para sa live calls.\n\n## May nakikita nang usage\n\nPara sanayin ang models, gumamit ang AethexAI ng anonymized recordings mula sa call center partner. Nangolekta rin ito ng audio mula sa radio stations sa Africa at gumawa ng contributor network ng university students para sa data annotation at local name pronunciation.\n\nSinasabi ng kumpanya na ang sistema nito ay humahawak na ng mahigit 17,000 tawag bawat araw. Kasama sa current use cases ang debt collection, customer activation at KYC. Naglulunsad din ito ng enterprise platform, APIs at SDKs para masubukan ng companies at developers.\n\n## Ano ang babantayan\n\nAng signal dito: maaaring hindi lang pinakamalaking model o pinakamalaking global platform ang manalo sa voice AI. Kung ang mahirap ay regional speech, telephony, presyo at deployment, puwedeng maging kasinghalaga ng model size ang local data at infrastructure.\n\nMaaga pa rin ang startup story na ito. Ang susunod na proof points: kaya ba ng AethexAI na gawing matagalang enterprise revenue ang call volume, panatilihing mababa ang latency, at alagaan ang quality habang lumalawak sa mas maraming industriya."
  }
};

function localizeVoiceBody(language) {
  if (VOICE_AI_BODY[language]) return VOICE_AI_BODY[language];
  return VOICE_AI_BODY.en;
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
    sections: ["事件重點", "關鍵事實", "背景", "後續觀察"],
    sourceIntro: (publisher, date, title) => `${publisher} 在 ${date} 發布「${title}」。`,
    fallbackContext: "這則消息的重點在於具體產品、交易或部署開始出現可核對的公開資訊，後續仍要回到來源資料與公司公開更新確認。",
    fallbackWatch: "後續可觀察來源是否補上更多客戶、正式推出時間、價格、可用地區或監管回應；在這些訊號出現前，先把它視為一則仍在發展中的市場新聞。",
    faq: (title) => [
      { question: "這則快訊的重點是什麼？", answer: `重點是「${title}」這個來源可核對事件，而不是延伸成一般性的導入建議。` },
      { question: "這篇文章是否代表市場已經成熟？", answer: "不能只靠單篇報導下結論；仍要看後續正式採用、財務數字、產品可用性與更多公開來源。" }
    ]
  },
  en: {
    category: "Market Brief",
    sections: ["What happened", "Key facts", "Background", "What to watch"],
    sourceIntro: (publisher, date, title) => `${publisher} reported on ${date}: "${title}."`,
    fallbackContext: "The useful signal is that a concrete product, deal, or deployment now has public details that readers can verify against the source.",
    fallbackWatch: "Next, watch for additional customers, launch timing, pricing, market availability, or regulatory response before treating this as a mature category signal.",
    faq: (title) => [
      { question: "What is the main point of this brief?", answer: `The main point is the reported development: "${title}."` },
      { question: "Does this prove the category is mature?", answer: "No. One article is a useful signal, but maturity still depends on adoption, revenue, reliability, and follow-up sources." }
    ]
  }
};

const LOCALIZED_NEWS_LABELS = {
  ja: {
    category: "マーケット速報",
    sections: ["要点", "確認できる事実", "背景", "今後の注目点"],
    sourceIntro: (publisher, date, title) => `${publisher} は ${date}、「${title}」と報じました。`,
    fallbackContext: "このニュースで重要なのは、製品、契約、導入に関する公開情報が確認できる形で出てきたことです。",
    fallbackWatch: "今後は追加顧客、正式提供時期、価格、提供地域、規制面の反応を確認する必要があります。",
    faq: (title) => [
      { question: "この速報の要点は何ですか？", answer: `要点は、出典で確認できる「${title}」という出来事です。` },
      { question: "これで市場が成熟したと言えますか？", answer: "まだ断定できません。導入、売上、信頼性、追加情報を見る必要があります。" }
    ]
  },
  ko: {
    category: "시장 브리프",
    sections: ["핵심 내용", "확인된 사실", "배경", "다음 관찰점"],
    sourceIntro: (publisher, date, title) => `${publisher}는 ${date} "${title}"라고 보도했습니다.`,
    fallbackContext: "이 소식의 의미는 제품, 계약, 배포와 관련한 공개 정보가 확인 가능한 형태로 나왔다는 점입니다.",
    fallbackWatch: "다음에는 추가 고객, 공식 출시 시점, 가격, 제공 지역, 규제 반응을 확인해야 합니다.",
    faq: (title) => [
      { question: "이 브리프의 핵심은 무엇인가요?", answer: `핵심은 출처로 확인되는 사건인 "${title}"입니다.` },
      { question: "이것만으로 시장이 성숙했다고 볼 수 있나요?", answer: "아직은 아닙니다. 도입, 매출, 신뢰성, 후속 출처를 더 봐야 합니다." }
    ]
  },
  id: {
    category: "Kabar Pasar",
    sections: ["Inti berita", "Fakta kunci", "Latar belakang", "Yang perlu dipantau"],
    sourceIntro: (publisher, date, title) => `${publisher} melaporkan pada ${date}: "${title}."`,
    fallbackContext: "Sinyal utamanya adalah adanya detail publik yang bisa dicek tentang produk, kontrak, atau deployment.",
    fallbackWatch: "Berikutnya, pantau pelanggan tambahan, jadwal rilis, harga, ketersediaan pasar, atau respons regulator.",
    faq: (title) => [
      { question: "Apa inti kabar ini?", answer: `Intinya adalah peristiwa yang bisa dicek dari sumber: "${title}."` },
      { question: "Apakah ini berarti kategorinya sudah matang?", answer: "Belum. Satu laporan perlu dibaca bersama adopsi, pendapatan, reliabilitas, dan sumber lanjutan." }
    ]
  },
  vi: {
    category: "Tin nhanh thị trường",
    sections: ["Điểm chính", "Dữ kiện quan trọng", "Bối cảnh", "Điều cần theo dõi"],
    sourceIntro: (publisher, date, title) => `${publisher} đưa tin vào ${date}: "${title}."`,
    fallbackContext: "Tín hiệu chính là đã có thông tin công khai có thể kiểm chứng về sản phẩm, thỏa thuận hoặc triển khai.",
    fallbackWatch: "Tiếp theo cần theo dõi khách hàng mới, thời điểm ra mắt, giá, khu vực khả dụng hoặc phản ứng quản lý.",
    faq: (title) => [
      { question: "Điểm chính của bản tin là gì?", answer: `Điểm chính là sự kiện có nguồn kiểm chứng: "${title}."` },
      { question: "Điều này có nghĩa thị trường đã trưởng thành chưa?", answer: "Chưa. Một bài viết cần được kiểm chứng thêm bằng mức dùng, doanh thu, độ ổn định và nguồn tiếp theo." }
    ]
  },
  th: {
    category: "ข่าวตลาด",
    sections: ["ประเด็นหลัก", "ข้อเท็จจริงสำคัญ", "บริบท", "สิ่งที่ต้องติดตาม"],
    sourceIntro: (publisher, date, title) => `${publisher} รายงานเมื่อ ${date}: "${title}"`,
    fallbackContext: "สัญญาณสำคัญคือเริ่มมีข้อมูลสาธารณะที่ตรวจสอบได้เกี่ยวกับผลิตภัณฑ์ ดีล หรือการใช้งานจริง",
    fallbackWatch: "ต่อไปให้ดูว่ามีลูกค้าเพิ่ม กำหนดเปิดใช้ ราคา พื้นที่ให้บริการ หรือท่าทีจากหน่วยงานกำกับหรือไม่",
    faq: (title) => [
      { question: "ข่าวนี้สำคัญตรงไหน?", answer: `ประเด็นหลักคือเหตุการณ์ที่ตรวจสอบจากแหล่งข่าวได้: "${title}"` },
      { question: "แปลว่าตลาดนี้ mature แล้วหรือยัง?", answer: "ยังสรุปไม่ได้ ต้องดู adoption, revenue, reliability และแหล่งข่าวเพิ่มเติม" }
    ]
  },
  ms: {
    category: "Berita Pasaran",
    sections: ["Inti berita", "Fakta utama", "Latar belakang", "Perkara untuk dipantau"],
    sourceIntro: (publisher, date, title) => `${publisher} melaporkan pada ${date}: "${title}."`,
    fallbackContext: "Isyarat utamanya ialah wujudnya maklumat awam yang boleh disemak tentang produk, perjanjian atau pelaksanaan.",
    fallbackWatch: "Selepas ini, pantau pelanggan tambahan, masa pelancaran, harga, ketersediaan pasaran atau respons kawal selia.",
    faq: (title) => [
      { question: "Apakah inti berita ini?", answer: `Intinya ialah peristiwa yang boleh disemak melalui sumber: "${title}."` },
      { question: "Adakah ini bermaksud kategori sudah matang?", answer: "Belum. Satu laporan perlu disahkan bersama adopsi, hasil, reliabiliti dan sumber susulan." }
    ]
  },
  fil: {
    category: "Market Brief",
    sections: ["Pangunahing balita", "Mahahalagang fact", "Konteksto", "Susunod na babantayan"],
    sourceIntro: (publisher, date, title) => `Iniulat ng ${publisher} noong ${date}: "${title}."`,
    fallbackContext: "Ang mahalagang signal ay may public details na puwedeng i-check tungkol sa produkto, deal, o deployment.",
    fallbackWatch: "Susunod, bantayan ang dagdag na customers, launch timing, pricing, market availability, o regulatory response.",
    faq: (title) => [
      { question: "Ano ang pangunahing punto ng brief na ito?", answer: `Ang punto ay ang development na iniulat: "${title}."` },
      { question: "Ibig bang sabihin mature na ang category?", answer: "Hindi pa. Kailangan pang makita ang adoption, revenue, reliability, at follow-up sources." }
    ]
  }
};

function labelsFor(language) {
  return NEWS_LABELS[language] || LOCALIZED_NEWS_LABELS[language] || NEWS_LABELS.en;
}

function sourceTextForArticle(article = {}) {
  return `${article.headline || ""}\n${article.standfirst || ""}\n${(article.factBullets || []).join("\n")}`.toLowerCase();
}

function knownProfile(article = {}, frame = {}) {
  const text = sourceTextForArticle(article);
  if (/aethex|voice ai/.test(text) || (/goldman/.test(text) && /meta/.test(text) && /(africa|middle east|17,000|17000)/.test(text))) {
    return { key: "voice-ai-markets" };
  }
  if (/coralogix|watch the ai agents|ai systems move into production|monitor.*ai agents|observability|troubleshoot failures|operational data/.test(text)) {
    return {
      key: "ai-agent-observability",
      title: {
        "zh-Hant": "Coralogix 融資 2 億美元，押注 AI agent 監控需求升溫",
        en: "Coralogix raises $200M on a bet that AI agents will need watching",
        ja: "Coralogix、AI agent 監視需要を見込み 2 億ドル調達",
        ko: "Coralogix, AI agent 모니터링 수요에 베팅하며 2억 달러 조달",
        id: "Coralogix raih US$200 juta untuk memantau AI agent di production",
        vi: "Coralogix huy động 200 triệu USD cho nhu cầu giám sát AI agent",
        th: "Coralogix ระดมทุน 200 ล้านดอลลาร์ รับกระแส monitoring สำหรับ AI agent",
        ms: "Coralogix kumpul AS$200 juta untuk memantau AI agent dalam production",
        fil: "Coralogix nakalikom ng $200M para bantayan ang AI agents sa production"
      },
      standfirst: {
        "zh-Hant": "TechCrunch 報導，Coralogix 完成 2 億美元融資，認為 AI 系統進入正式環境後，企業會更需要監控行為、排查故障並取得營運資料。",
        en: "TechCrunch reported that Coralogix raised $200 million, arguing that as AI systems move into production, companies will need more tools to monitor behavior and troubleshoot failures.",
        ja: "TechCrunch によると、Coralogix は 2 億ドルを調達しました。本番環境に入る AI システムの挙動監視と障害対応が必要になるとの見立てです。",
        ko: "TechCrunch는 Coralogix가 2억 달러를 조달했다고 보도했습니다. AI 시스템이 운영 환경으로 들어가면 행동 모니터링과 장애 분석 도구가 더 필요하다는 판단입니다.",
        id: "TechCrunch melaporkan Coralogix menggalang US$200 juta karena perusahaan dinilai akan membutuhkan alat untuk memantau perilaku AI dan menelusuri kegagalan saat AI masuk production.",
        vi: "TechCrunch đưa tin Coralogix huy động 200 triệu USD, với lập luận rằng khi AI đi vào production, doanh nghiệp sẽ cần công cụ theo dõi hành vi và xử lý lỗi nhiều hơn.",
        th: "TechCrunch รายงานว่า Coralogix ระดมทุน 200 ล้านดอลลาร์ โดยมองว่าเมื่อระบบ AI เข้าสู่ production บริษัทต่าง ๆ จะต้องการเครื่องมือ monitoring และ troubleshooting มากขึ้น",
        ms: "TechCrunch melaporkan Coralogix mengumpul AS$200 juta kerana syarikat dijangka memerlukan alat untuk memantau tingkah laku AI dan menyiasat kegagalan apabila AI masuk production.",
        fil: "Iniulat ng TechCrunch na nakalikom ang Coralogix ng $200 milyon dahil habang pumapasok sa production ang AI systems, mas kailangan ng monitoring at troubleshooting tools."
      },
      facts: {
        "zh-Hant": [
          "TechCrunch 報導，Coralogix 完成 2 億美元融資。",
          "報導指出，Coralogix 把機會放在 AI 系統進入正式環境後的監控、除錯與營運資料需求。",
          "這類基礎設施工具的價值，取決於企業是否真的把 AI agent 放進日常產品與營運流程。"
        ],
        en: [
          "TechCrunch reported that Coralogix raised $200 million.",
          "The company is betting on demand for monitoring, troubleshooting, and operational data as AI systems move into production.",
          "The infrastructure opportunity depends on how quickly companies put AI agents into everyday products and operations."
        ],
        ja: [
          "TechCrunch は Coralogix が 2 億ドルを調達したと報じました。",
          "同社は、本番環境に入る AI システムの監視、障害対応、運用データ需要に賭けています。",
          "この基盤ツールの機会は、企業が AI agent を日常の製品や運用へどれだけ入れるかに左右されます。"
        ],
        ko: [
          "TechCrunch는 Coralogix가 2억 달러를 조달했다고 전했습니다.",
          "Coralogix는 AI 시스템이 운영 환경으로 들어가며 모니터링, 장애 대응, 운영 데이터 수요가 커질 것으로 보고 있습니다.",
          "이 인프라 시장의 기회는 기업이 AI agent를 실제 제품과 운영에 얼마나 빨리 넣는지에 달려 있습니다."
        ],
        id: [
          "TechCrunch melaporkan Coralogix menggalang US$200 juta.",
          "Coralogix bertaruh pada kebutuhan monitoring, troubleshooting, dan data operasional saat AI masuk production.",
          "Peluang infrastrukturnya bergantung pada seberapa cepat perusahaan menaruh AI agent di produk dan operasi harian."
        ],
        vi: [
          "TechCrunch đưa tin Coralogix huy động 200 triệu USD.",
          "Coralogix đặt cược vào nhu cầu giám sát, khắc phục lỗi và dữ liệu vận hành khi AI đi vào production.",
          "Cơ hội hạ tầng này phụ thuộc vào tốc độ doanh nghiệp đưa AI agent vào sản phẩm và vận hành hằng ngày."
        ],
        th: [
          "TechCrunch รายงานว่า Coralogix ระดมทุน 200 ล้านดอลลาร์",
          "Coralogix เดิมพันกับความต้องการ monitoring, troubleshooting และข้อมูลปฏิบัติการเมื่อ AI เข้าสู่ production",
          "โอกาสของเครื่องมือโครงสร้างพื้นฐานนี้ขึ้นอยู่กับว่าบริษัทนำ AI agent เข้าไปในผลิตภัณฑ์และงานประจำเร็วแค่ไหน"
        ],
        ms: [
          "TechCrunch melaporkan Coralogix mengumpul AS$200 juta.",
          "Coralogix bertaruh pada keperluan monitoring, troubleshooting dan data operasi apabila AI masuk production.",
          "Peluang infrastrukturnya bergantung pada kelajuan syarikat memasukkan AI agent ke dalam produk dan operasi harian."
        ],
        fil: [
          "Iniulat ng TechCrunch na nakalikom ang Coralogix ng $200 milyon.",
          "Tumataya ang Coralogix sa demand para sa monitoring, troubleshooting, at operational data habang pumapasok sa production ang AI.",
          "Nakasalalay ang infrastructure opportunity sa bilis ng pagpasok ng AI agents sa araw-araw na produkto at operasyon."
        ]
      },
      context: {
        "zh-Hant": "這則新聞把 AI agent 的焦點從模型能力拉到營運基礎設施：系統真的上線後，企業需要知道它看見什麼、做了什麼、哪裡失敗。",
        en: "The story moves the AI-agent conversation from model capability to operations infrastructure: once systems run in production, companies need to see what they observed, did, and failed to do.",
        ja: "このニュースは、AI agent の論点をモデル性能から運用基盤へ移します。本番運用では、何を見て、何を実行し、どこで失敗したかを追える必要があります。",
        ko: "이 뉴스는 AI agent 논의를 모델 성능에서 운영 인프라로 옮깁니다. 실제 운영에 들어가면 무엇을 보고 무엇을 했고 어디서 실패했는지를 볼 수 있어야 합니다.",
        id: "Berita ini menggeser pembahasan AI agent dari kemampuan model ke infrastruktur operasi: saat sistem berjalan di production, perusahaan perlu melihat apa yang diamati, dilakukan, dan gagal dilakukan.",
        vi: "Tin này kéo câu chuyện AI agent từ năng lực mô hình sang hạ tầng vận hành: khi hệ thống chạy production, doanh nghiệp cần biết nó thấy gì, làm gì và lỗi ở đâu.",
        th: "ข่าวนี้ย้ายประเด็น AI agent จากความสามารถของโมเดลไปสู่โครงสร้างพื้นฐานด้านปฏิบัติการ เมื่อระบบทำงานใน production บริษัทต้องเห็นว่ามันดูอะไร ทำอะไร และพลาดตรงไหน",
        ms: "Berita ini mengalihkan perbincangan AI agent daripada keupayaan model kepada infrastruktur operasi: apabila sistem berjalan dalam production, syarikat perlu melihat apa yang diperhati, dilakukan dan gagal dilakukan.",
        fil: "Inililipat ng balitang ito ang usapan sa AI agent mula model capability papunta sa operations infrastructure: kapag nasa production na, kailangang makita ng kumpanya kung ano ang nakita, ginawa, at nabigo nitong gawin."
      },
      watch: {
        "zh-Hant": "接下來要看 Coralogix 能否把融資故事轉成實際企業部署，尤其是 AI agent 的追蹤資料、故障分析與成本控制是否會變成採購需求。",
        en: "Next, watch whether Coralogix turns the funding story into enterprise deployments, especially around AI-agent traces, failure analysis, and cost controls.",
        ja: "次は、Coralogix が資金調達を実際の企業導入につなげられるか、特に AI agent のトレース、障害分析、コスト管理が購買需要になるかが焦点です。",
        ko: "다음에는 Coralogix가 투자 유치를 실제 기업 배포로 연결하는지, 특히 AI agent 추적, 장애 분석, 비용 관리가 구매 수요가 되는지 봐야 합니다.",
        id: "Berikutnya, lihat apakah Coralogix bisa mengubah cerita pendanaan menjadi deployment enterprise, terutama untuk trace AI agent, analisis kegagalan, dan kontrol biaya.",
        vi: "Tiếp theo cần xem Coralogix có biến câu chuyện gọi vốn thành triển khai doanh nghiệp không, nhất là trace AI agent, phân tích lỗi và kiểm soát chi phí.",
        th: "ต่อไปต้องดูว่า Coralogix จะเปลี่ยนเรื่องระดมทุนเป็นการ deploy ในองค์กรได้หรือไม่ โดยเฉพาะ trace ของ AI agent, การวิเคราะห์ความผิดพลาด และการคุมต้นทุน",
        ms: "Seterusnya, lihat sama ada Coralogix boleh menukar cerita pendanaan kepada deployment enterprise, khususnya trace AI agent, analisis kegagalan dan kawalan kos.",
        fil: "Susunod, bantayan kung maiaakyat ng Coralogix ang funding story sa enterprise deployments, lalo na sa AI-agent traces, failure analysis, at cost controls."
      }
    };
  }
  if (/bioweapon|biological weapon|biosecurity|ai-aided bioweapons/.test(text)) {
    return {
      key: "ai-bioweapons-letter",
      title: {
        "zh-Hant": "AI 業界領袖呼籲美國強化 AI 生物武器防護",
        en: "AI leaders call for tougher protections against AI-aided bioweapons",
        ja: "AI 業界リーダー、AI 悪用の生物兵器対策強化を米国に要請",
        ko: "AI 업계 리더들, AI 악용 생물무기 대응 강화를 미국에 촉구",
        id: "Para pemimpin AI mendesak perlindungan lebih kuat dari bioweapon berbantuan AI",
        vi: "Các lãnh đạo AI kêu gọi Mỹ siết bảo vệ trước nguy cơ vũ khí sinh học do AI hỗ trợ",
        th: "ผู้นำวงการ AI เรียกร้องให้สหรัฐฯ เพิ่มมาตรการป้องกันอาวุธชีวภาพที่ใช้ AI",
        ms: "Pemimpin AI gesa perlindungan lebih kuat terhadap senjata biologi berbantukan AI",
        fil: "AI leaders nanawagan ng mas mahigpit na proteksyon laban sa AI-aided bioweapons"
      },
      standfirst: {
        "zh-Hant": "The Verge 報導，多位 AI 產業領袖致函美國國會，要求堵住 AI 協助開發生物武器的安全缺口；公開信把焦點放在模型存取、篩查與通報責任。",
        en: "The Verge reported that AI industry leaders sent an open letter to Congress calling for rules to close gaps that can let AI systems help develop biological weapons.",
        ja: "The Verge によると、AI 業界のリーダーらは米議会に公開書簡を送り、AI が生物兵器開発に悪用される隙を塞ぐ規則を求めました。米議会への要請です。",
        ko: "The Verge는 AI 업계 리더들이 미 의회에 공개 서한을 보내 AI가 생물무기 개발에 악용될 수 있는 허점을 막아야 한다고 촉구했다고 보도했습니다.",
        id: "The Verge melaporkan para pemimpin industri AI mengirim surat terbuka ke Kongres AS agar celah yang memungkinkan AI membantu pengembangan senjata biologis segera ditutup.",
        vi: "The Verge đưa tin nhiều lãnh đạo ngành AI gửi thư ngỏ tới Quốc hội Mỹ, kêu gọi bịt lỗ hổng có thể khiến AI hỗ trợ phát triển vũ khí sinh học.",
        th: "The Verge รายงานว่าผู้นำในอุตสาหกรรม AI ส่งจดหมายเปิดผนึกถึงสภาคองเกรสสหรัฐฯ ขอให้ปิดช่องโหว่ที่อาจทำให้ AI ถูกใช้ช่วยพัฒนาอาวุธชีวภาพ",
        ms: "The Verge melaporkan pemimpin industri AI menghantar surat terbuka kepada Kongres AS bagi menutup jurang yang boleh membolehkan AI membantu pembangunan senjata biologi.",
        fil: "Iniulat ng The Verge na nagpadala ang mga lider ng AI industry ng open letter sa US Congress para isara ang puwang para gamitin ang AI sa paggawa ng biological weapons."
      },
      facts: {
        "zh-Hant": [
          "公開信要求美國國會處理有人利用 AI 開發生物武器的風險。",
          "The Verge 指出，這次連平常競爭激烈的 AI 公司也在生物安全議題上罕見站到同一邊。",
          "報導重點放在模型存取、危險查詢篩查與風險通報責任。"
        ],
        en: [
          "The open letter asks Congress to address the risk of AI systems being used to develop biological weapons.",
          "The Verge noted that rival AI companies are unusually aligned on this biosecurity issue.",
          "The story focuses on model access, screening dangerous requests, and reporting responsibilities."
        ],
        ja: [
          "公開書簡は、AI が生物兵器開発に使われるリスクへの対応を米議会に求めています。",
          "The Verge は、競合する AI 企業がバイオセキュリティで珍しく足並みをそろえた点を伝えています。",
          "焦点はモデルアクセス、危険な依頼のスクリーニング、リスク報告の責任です。"
        ],
        ko: [
          "공개 서한은 AI가 생물무기 개발에 사용될 위험을 의회가 다뤄야 한다고 요구합니다.",
          "The Verge는 경쟁 AI 기업들이 바이오보안 문제에서 이례적으로 같은 목소리를 냈다고 전했습니다.",
          "핵심은 모델 접근, 위험 요청 선별, 위험 보고 책임입니다."
        ],
        id: [
          "Surat terbuka itu meminta Kongres menangani risiko AI dipakai untuk mengembangkan senjata biologis.",
          "The Verge mencatat perusahaan AI yang biasanya bersaing kini sejalan dalam isu biosecurity.",
          "Fokusnya ada pada akses model, penyaringan permintaan berbahaya, dan tanggung jawab pelaporan risiko."
        ],
        vi: [
          "Thư ngỏ yêu cầu Quốc hội xử lý nguy cơ AI bị dùng để phát triển vũ khí sinh học.",
          "The Verge nhấn mạnh các công ty AI vốn cạnh tranh lại cùng đứng về một phía trong vấn đề an toàn sinh học.",
          "Trọng tâm là quyền truy cập mô hình, sàng lọc yêu cầu nguy hiểm và trách nhiệm báo cáo rủi ro."
        ],
        th: [
          "จดหมายเปิดผนึกขอให้สภาคองเกรสจัดการความเสี่ยงที่ AI อาจถูกใช้พัฒนาอาวุธชีวภาพ",
          "The Verge ระบุว่าบริษัท AI ที่มักแข่งขันกันกลับมีจุดยืนร่วมกันในประเด็น biosecurity",
          "ประเด็นหลักคือการเข้าถึงโมเดล การคัดกรองคำขออันตราย และหน้าที่ในการรายงานความเสี่ยง"
        ],
        ms: [
          "Surat terbuka itu meminta Kongres menangani risiko AI digunakan untuk membangunkan senjata biologi.",
          "The Verge menyatakan syarikat AI yang biasanya bersaing kini sependapat dalam isu biosecurity.",
          "Fokusnya ialah akses model, saringan permintaan berbahaya dan tanggungjawab pelaporan risiko."
        ],
        fil: [
          "Hinihiling ng open letter na tugunan ng Kongreso ang risk ng paggamit ng AI sa biological weapons.",
          "Ayon sa The Verge, bihirang magkaisa ang magkakalabang AI companies sa ganitong biosecurity issue.",
          "Nasa model access, screening ng dangerous requests, at risk reporting responsibilities ang sentro ng balita."
        ]
      },
      context: {
        "zh-Hant": "這則新聞是 AI 安全政策題，不是產品發布。它顯示 frontier model 的風險討論正在從研究圈走進立法與平台責任。",
        en: "This is an AI safety policy story rather than a product launch. It shows frontier-model risk moving from research debate into legislation and platform responsibility.",
        ja: "これは製品発表ではなく、AI 安全政策に関するニュースです。frontier model のリスク論点が、研究者の議論から立法と平台責任へ移っています。",
        ko: "이 사안은 제품 발표가 아니라 AI 안전 정책 뉴스입니다. frontier model 위험 논의가 연구 영역을 넘어 입법과 플랫폼 책임으로 이동하고 있습니다.",
        id: "Ini bukan peluncuran produk, melainkan berita kebijakan keamanan AI. Risiko frontier model mulai bergerak dari debat riset ke legislasi dan tanggung jawab platform.",
        vi: "Đây là tin về chính sách an toàn AI, không phải ra mắt sản phẩm. Rủi ro frontier model đang đi từ tranh luận nghiên cứu sang lập pháp và trách nhiệm nền tảng.",
        th: "ข่าวนี้เป็นประเด็นนโยบายความปลอดภัย AI ไม่ใช่การเปิดตัวสินค้า ความเสี่ยงของ frontier model กำลังขยับจากวงวิจัยไปสู่กฎหมายและความรับผิดชอบของแพลตฟอร์ม",
        ms: "Ini berita dasar keselamatan AI, bukan pelancaran produk. Risiko frontier model sedang bergerak daripada perbahasan penyelidikan kepada undang-undang dan tanggungjawab platform.",
        fil: "Policy story ito tungkol sa AI safety, hindi product launch. Lumilipat ang frontier-model risk mula sa research debate papunta sa batas at platform responsibility."
      },
      watch: {
        "zh-Hant": "後續要看美國國會是否提出具體法案，以及模型供應商會不會把生物安全篩查寫進正式政策。",
        en: "Next, watch whether Congress turns the letter into concrete legislation and whether model providers formalize biosecurity screening policies.",
        ja: "次は、米議会が具体的な法案を出すか、モデル提供企業がバイオセキュリティ審査を正式な方針に入れるかが焦点です。",
        ko: "다음 관찰점은 의회가 구체적인 법안을 내놓는지, 모델 제공사가 바이오보안 심사를 공식 정책으로 넣는지입니다.",
        id: "Berikutnya, lihat apakah Kongres membuat aturan konkret dan apakah penyedia model meresmikan kebijakan penyaringan biosecurity.",
        vi: "Tiếp theo cần xem Quốc hội có đưa ra dự luật cụ thể không, và nhà cung cấp mô hình có chính thức hóa quy trình sàng lọc an toàn sinh học không.",
        th: "ต่อไปต้องดูว่าสภาคองเกรสจะออกกฎหมายจริงหรือไม่ และผู้ให้บริการโมเดลจะทำ biosecurity screening เป็นนโยบายทางการหรือเปล่า",
        ms: "Seterusnya, lihat sama ada Kongres membawa undang-undang konkrit dan sama ada penyedia model merasmikan dasar saringan biosecurity.",
        fil: "Susunod, bantayan kung gagawing konkretong batas ng Kongreso ang liham at kung pormal na isasama ng model providers ang biosecurity screening."
      }
    };
  }
  if (/warehouse robot|proteus/.test(text)) {
    return {
      key: "amazon-warehouse-robot",
      title: {
        "zh-Hant": "Amazon 開發可用語音互動的新一代倉儲機器人",
        en: "Amazon develops a warehouse robot that workers can speak to",
        ja: "Amazon、作業員が話しかけられる新型倉庫ロボットを開発",
        ko: "Amazon, 작업자가 말로 지시할 수 있는 창고 로봇 개발",
        id: "Amazon mengembangkan robot gudang yang bisa diajak bicara pekerja",
        vi: "Amazon phát triển robot kho hàng có thể trao đổi bằng giọng nói với nhân viên",
        th: "Amazon พัฒนา robot คลังสินค้าที่พนักงานพูดสั่งงานได้",
        ms: "Amazon membangunkan robot gudang yang boleh bercakap dengan pekerja",
        fil: "Amazon gumagawa ng warehouse robot na puwedeng kausapin ng workers"
      },
      standfirst: {
        "zh-Hant": "The Verge 報導，Amazon 展示新一代 Proteus AI 倉儲機器人，員工可用語言與它互動；公司強調這項機器人投資用來支援現場工作。",
        en: "The Verge reported that Amazon showed a new AI version of its Proteus warehouse robot, with language interaction for workers and a company message that the robots are meant to support warehouse teams.",
        ja: "The Verge によると、Amazon は Proteus 倉庫ロボットの AI 新型を示しました。作業員は言葉でやり取りでき、同社は従業員を支援する投資だと説明しています。",
        ko: "The Verge는 Amazon이 언어 상호작용을 갖춘 Proteus AI 창고 로봇 새 버전을 공개했으며, 회사는 이 투자가 작업자를 지원하기 위한 것이라고 설명했다고 보도했습니다.",
        id: "The Verge melaporkan Amazon memperlihatkan versi AI baru robot gudang Proteus, dengan interaksi bahasa untuk pekerja dan pesan bahwa robot ini mendukung tim gudang.",
        vi: "The Verge đưa tin Amazon giới thiệu phiên bản AI mới của robot kho Proteus, cho phép nhân viên tương tác bằng ngôn ngữ và nhấn mạnh mục tiêu hỗ trợ đội ngũ kho hàng.",
        th: "The Verge รายงานว่า Amazon เปิดตัว Proteus รุ่น AI ใหม่สำหรับคลังสินค้า ให้พนักงานสื่อสารด้วยภาษาได้ และย้ำว่าหุ่นยนต์มีไว้สนับสนุนทีมงานคลัง",
        ms: "The Verge melaporkan Amazon menunjukkan versi AI baharu robot gudang Proteus, dengan interaksi bahasa untuk pekerja dan mesej bahawa robot itu menyokong pasukan gudang.",
        fil: "Iniulat ng The Verge na ipinakita ng Amazon ang bagong AI version ng Proteus warehouse robot, na nagdadala ng language interaction para sa workers at suporta sa warehouse teams."
      },
      facts: {
        "zh-Hant": [
          "Amazon 展示新一代 Proteus 倉儲機器人。",
          "新版本重點是讓員工可用語言與機器人互動。",
          "The Verge 報導指出，Amazon 持續把自動化推進倉儲工作現場。"
        ],
        en: [
          "Amazon showed a new version of its Proteus warehouse robot.",
          "The update lets workers interact with the robot through language.",
          "The Verge framed it as part of Amazon's continuing warehouse automation push."
        ],
        ja: ["Amazon は Proteus 倉庫ロボットの新型を示しました。", "新型では作業員が言葉でロボットとやり取りできます。", "The Verge は、Amazon の倉庫自動化の流れの一部として報じています。"],
        ko: [
          "Amazon은 Proteus 창고 로봇의 새 버전을 공개하며 작업자가 말로 지시하고 상호작용할 수 있는 방향을 제시했습니다.",
          "이번 업데이트의 핵심은 창고 현장에서 코드 명령보다 자연어 기반 소통을 더 앞세운다는 점입니다.",
          "The Verge는 이를 Amazon이 자동화를 창고 운영 깊숙이 밀어 넣는 흐름의 일부로 설명했습니다."
        ],
        id: ["Amazon memperlihatkan versi baru robot gudang Proteus.", "Pembaruan utamanya adalah pekerja bisa berinteraksi lewat bahasa.", "The Verge menempatkannya dalam dorongan otomatisasi gudang Amazon."],
        vi: ["Amazon giới thiệu phiên bản mới của robot kho Proteus.", "Điểm mới là nhân viên có thể tương tác với robot bằng ngôn ngữ.", "The Verge đặt tin này trong làn sóng tự động hóa kho hàng của Amazon."],
        th: ["Amazon เปิดตัว Proteus รุ่นใหม่สำหรับคลังสินค้า", "จุดใหม่คือพนักงานสื่อสารกับ robot ด้วยภาษาได้", "The Verge มองว่านี่เป็นส่วนหนึ่งของการผลักดัน automation ในคลังสินค้าของ Amazon"],
        ms: ["Amazon menunjukkan versi baharu robot gudang Proteus.", "Kemas kini utamanya ialah pekerja boleh berinteraksi melalui bahasa.", "The Verge meletakkannya dalam dorongan automasi gudang Amazon."],
        fil: ["Ipinakita ng Amazon ang bagong bersyon ng Proteus warehouse robot.", "Ang bagong punto: puwedeng makipag-usap ang workers sa robot gamit ang language.", "Inilagay ito ng The Verge sa mas malaking warehouse automation push ng Amazon."]
      },
      context: {
        "zh-Hant": "這則新聞的重點在於倉儲機器人開始把語言互動納入現場操作。The Verge 的報導把 Proteus 放在 Amazon 長期推進倉儲自動化的脈絡中，也補上公司對員工工作的說法。",
        en: "The useful point is that warehouse robotics is adding language interaction to floor operations, not only movement and material handling.",
        ja: "このニュースの焦点は、倉庫ロボットが棚の移動や搬送だけでなく、現場での言語インタラクションを取り込み始めたことです。",
        ko: "핵심은 창고 로봇이 선반 이동과 물류 처리의 틀을 넘어 현장 언어 상호작용을 추가하고 있다는 점입니다.",
        id: "Poin pentingnya adalah robotika gudang mulai menambahkan interaksi bahasa ke operasi lapangan, bukan hanya pergerakan dan pemindahan barang.",
        vi: "Điểm chính là robot kho hàng bắt đầu đưa tương tác bằng ngôn ngữ vào vận hành tại hiện trường, không chỉ di chuyển hay xử lý vật liệu.",
        th: "ประเด็นสำคัญคือ robotics ในคลังสินค้าเริ่มเพิ่มการโต้ตอบด้วยภาษาเข้ากับงานหน้างาน ไม่ใช่แค่การเคลื่อนที่หรือย้ายสินค้า",
        ms: "Poin pentingnya ialah robotik gudang mula menambah interaksi bahasa dalam operasi lantai, bukan hanya pergerakan dan pengendalian barang.",
        fil: "Ang mahalagang punto: dinadagdagan ng language interaction ang warehouse robotics sa floor operations, lampas sa galaw at material handling."
      },
      watch: {
        "zh-Hant": "後續要看 Proteus 的語音互動會先落在哪些倉儲場景，以及 Amazon 如何回應自動化與員工工作的關係。",
        en: "Next, watch which warehouse tasks get language interaction first and how Amazon addresses the relationship between automation and warehouse labor.",
        ja: "次は、どの倉庫作業に言語インタラクションが先に入るか、Amazon が自動化と労働の関係をどう説明するかが焦点です。",
        ko: "다음에는 어떤 창고 업무에 언어 상호작용이 먼저 들어가는지, Amazon이 자동화와 창고 노동의 관계를 어떻게 설명하는지 봐야 합니다.",
        id: "Berikutnya, lihat tugas gudang mana yang lebih dulu memakai interaksi bahasa dan bagaimana Amazon menjelaskan hubungan otomatisasi dengan pekerja gudang.",
        vi: "Tiếp theo cần xem tác vụ kho nào được thêm tương tác ngôn ngữ trước và Amazon giải thích quan hệ giữa tự động hóa với lao động kho ra sao.",
        th: "ต่อไปต้องดูว่างานคลังประเภทใดจะได้ใช้การโต้ตอบด้วยภาษาก่อน และ Amazon จะอธิบายความสัมพันธ์ระหว่าง automation กับแรงงานคลังอย่างไร",
        ms: "Seterusnya, lihat tugasan gudang mana yang mendapat interaksi bahasa dahulu dan bagaimana Amazon menjelaskan hubungan automasi dengan pekerja gudang.",
        fil: "Susunod, bantayan kung aling warehouse tasks ang unang gagamit ng language interaction at paano ipapaliwanag ng Amazon ang automation at warehouse labor."
      }
    };
  }
  if (/ai search|publishers.*opt out|opt out.*ai search|google.*ai search/.test(text)) {
    return {
      key: "ai-search-publisher-optout",
      title: {
        "zh-Hant": "新規將讓出版商可選擇退出 AI Search",
        en: "New regulation will let publishers opt out of AI Search",
        ja: "新規制で出版社が AI Search からの除外を選べるように",
        ko: "새 규제로 퍼블리셔가 AI Search 제외를 선택할 수 있게 된다",
        id: "Regulasi baru akan memungkinkan publisher keluar dari AI Search",
        vi: "Quy định mới sẽ cho phép nhà xuất bản chọn không tham gia AI Search",
        th: "กฎใหม่จะเปิดทางให้ publisher เลือกไม่เข้าร่วม AI Search",
        ms: "Peraturan baharu akan membolehkan penerbit memilih keluar daripada AI Search",
        fil: "Bagong regulasyon magbibigay sa publishers ng opt-out sa AI Search"
      },
      standfirst: {
        "zh-Hant": "TechCrunch 報導，英國新規將讓出版商可選擇退出 AI Search；這會影響 Google 等平台如何使用新聞內容訓練或呈現 AI 搜尋結果。",
        en: "TechCrunch reported that a new U.K. regulation will let publishers opt out of AI Search, changing how platforms such as Google use news content in AI search results.",
        ja: "TechCrunch によると、英国の新規制で出版社は AI Search からの除外を選べるようになります。Google などの平台がニュースコンテンツを AI 検索で扱う方法に影響します。",
        ko: "TechCrunch는 영국의 새 규제가 퍼블리셔에게 AI Search 제외 선택권을 줄 것이라고 보도했습니다. Google 같은 플랫폼의 뉴스 콘텐츠 활용 방식에 영향을 줄 수 있습니다.",
        id: "TechCrunch melaporkan regulasi baru di Inggris akan memberi publisher opsi keluar dari AI Search, yang bisa mengubah cara platform seperti Google memakai konten berita dalam hasil pencarian AI.",
        vi: "TechCrunch đưa tin quy định mới tại Anh sẽ cho phép nhà xuất bản chọn không tham gia AI Search, có thể thay đổi cách các nền tảng như Google dùng nội dung tin tức trong kết quả tìm kiếm AI.",
        th: "TechCrunch รายงานว่ากฎใหม่ในสหราชอาณาจักรจะให้ publisher เลือก opt out จาก AI Search ได้ ซึ่งอาจกระทบวิธีที่แพลตฟอร์มอย่าง Google ใช้คอนเทนต์ข่าวในผลค้นหา AI",
        ms: "TechCrunch melaporkan peraturan baharu di U.K. akan memberi penerbit pilihan keluar daripada AI Search, yang boleh mengubah cara platform seperti Google menggunakan kandungan berita dalam hasil carian AI.",
        fil: "Ayon sa TechCrunch, papayagan ng bagong regulasyon sa U.K. ang publishers na mag-opt out sa AI Search, na maaaring makaapekto sa paggamit ng platforms tulad ng Google sa news content."
      },
      facts: {
        "zh-Hant": ["TechCrunch 報導，英國新規將提供出版商退出 AI Search 的選項。", "這項規則會影響新聞內容在 AI 搜尋結果中的使用方式。", "報導點名 Google 等平台是後續觀察焦點。"],
        en: ["TechCrunch reported that a new U.K. rule will give publishers an AI Search opt-out.", "The rule affects how news content appears or is used in AI search results.", "The report points to platforms such as Google as key actors to watch."],
        ja: ["TechCrunch は、英国の新規制が出版社に AI Search からの除外選択肢を与えると報じました。", "ニュースコンテンツが AI 検索結果でどう使われるかに影響します。", "Google などのプラットフォームが今後の焦点です。"],
        ko: ["TechCrunch는 영국 새 규제가 퍼블리셔에게 AI Search opt-out을 제공한다고 보도했습니다.", "뉴스 콘텐츠가 AI 검색 결과에서 사용되는 방식에 영향을 줄 수 있습니다.", "Google 같은 플랫폼이 주요 관찰 대상입니다."],
        id: ["TechCrunch melaporkan aturan baru di Inggris memberi publisher opsi keluar dari AI Search.", "Aturan ini bisa memengaruhi cara konten berita dipakai atau muncul dalam hasil pencarian AI.", "Platform seperti Google menjadi aktor utama yang perlu dipantau."],
        vi: ["TechCrunch đưa tin quy định mới tại Anh cho nhà xuất bản quyền chọn không tham gia AI Search.", "Quy định này có thể ảnh hưởng cách nội dung tin tức xuất hiện hoặc được dùng trong kết quả tìm kiếm AI.", "Các nền tảng như Google là bên cần theo dõi."],
        th: ["TechCrunch รายงานว่ากฎใหม่ในอังกฤษจะให้ publisher เลือกออกจาก AI Search ได้", "กฎนี้อาจกระทบวิธีที่คอนเทนต์ข่าวถูกใช้หรือแสดงในผลค้นหา AI", "แพลตฟอร์มอย่าง Google คือผู้เล่นที่ต้องจับตา"],
        ms: ["TechCrunch melaporkan peraturan baharu di England memberi penerbit pilihan keluar daripada AI Search.", "Peraturan ini boleh mempengaruhi cara kandungan berita digunakan atau muncul dalam hasil carian AI.", "Platform seperti Google menjadi pihak utama untuk dipantau."],
        fil: ["Iniulat ng TechCrunch na bibigyan ng bagong U.K. rule ang publishers ng AI Search opt-out.", "Maaaring baguhin nito kung paano lumalabas o ginagamit ang news content sa AI search results.", "Platforms gaya ng Google ang pangunahing babantayan."]
      },
      context: {
        "zh-Hant": "這則新聞屬於 AI 搜尋與內容授權的交界。出版商若能選擇退出，搜尋平台與媒體之間的流量、授權與資料使用談判會更具體。",
        en: "This sits at the intersection of AI search and content licensing. If publishers can opt out, traffic, licensing, and data-use negotiations become more concrete.",
        ja: "これは AI 検索とコンテンツライセンスの接点にあるニュースです。出版社が除外を選べるなら、流量、ライセンス、データ利用の交渉がより具体化します。",
        ko: "이 뉴스는 AI 검색과 콘텐츠 라이선스의 접점에 있습니다. 퍼블리셔가 제외를 선택할 수 있다면 트래픽, 라이선스, 데이터 사용 협상이 더 구체화됩니다.",
        id: "Berita ini berada di persimpangan AI search dan lisensi konten. Jika publisher bisa opt out, negosiasi trafik, lisensi, dan penggunaan data menjadi lebih konkret.",
        vi: "Tin này nằm ở giao điểm giữa AI search và cấp phép nội dung. Khi nhà xuất bản có quyền chọn không tham gia, đàm phán về lưu lượng, giấy phép và dữ liệu sẽ cụ thể hơn.",
        th: "ข่าวนี้อยู่ตรงจุดตัดระหว่าง AI search กับ content licensing หาก publisher เลือกออกได้ การเจรจาเรื่องทราฟฟิก ไลเซนส์ และการใช้ข้อมูลจะชัดขึ้น",
        ms: "Berita ini berada di persilangan AI search dan pelesenan kandungan. Jika penerbit boleh memilih keluar, rundingan trafik, lesen dan penggunaan data menjadi lebih konkrit.",
        fil: "Nasa gitna ito ng AI search at content licensing. Kapag puwedeng mag-opt out ang publishers, mas magiging konkretong usapan ang traffic, licensing, at data use."
      },
      watch: {
        "zh-Hant": "後續要看規則實施細節、平台是否提供清楚控制介面，以及出版商是否把 opt-out 當成談判工具。",
        en: "Next, watch implementation details, whether platforms provide clear controls, and whether publishers use opt-out rights as bargaining power in licensing talks.",
        ja: "次は、実施細則、プラットフォームが明確な管理画面を出すか、出版社が opt-out を交渉材料に使うかが焦点です。",
        ko: "다음 관찰점은 시행 세부 사항, 플랫폼의 명확한 제어 기능 제공 여부, 퍼블리셔가 opt-out 권리를 협상 카드로 쓰는지입니다.",
        id: "Berikutnya, lihat detail implementasi, apakah platform memberi kontrol yang jelas, dan apakah publisher memakai hak opt-out sebagai daya tawar lisensi.",
        vi: "Tiếp theo cần xem chi tiết thực thi, nền tảng có cung cấp quyền kiểm soát rõ ràng không, và nhà xuất bản có dùng opt-out làm đòn bẩy cấp phép không.",
        th: "ต่อไปต้องดูรายละเอียดการบังคับใช้ แพลตฟอร์มจะมีตัวควบคุมที่ชัดเจนหรือไม่ และ publisher จะใช้สิทธิ opt-out เป็นอำนาจต่อรองด้านไลเซนส์หรือเปล่า",
        ms: "Seterusnya, lihat butiran pelaksanaan, sama ada platform menyediakan kawalan jelas dan sama ada penerbit menggunakan hak opt-out sebagai kuasa tawar-menawar pelesenan.",
        fil: "Susunod, bantayan ang implementation details, kung malinaw ang controls ng platforms, at kung gagamitin ng publishers ang opt-out bilang bargaining position sa licensing."
      }
    };
  }
  if (/amazon.*product images|ai-generated product images|visual search|shopping search|search for some reason/.test(text)) {
    return {
      key: "amazon-ai-shopping",
      title: {
        "zh-Hant": "Amazon 將在部分搜尋結果顯示 AI 商品圖像",
        en: "Amazon will show AI product images in some search results",
        ja: "Amazon、一部検索結果で AI 商品画像を表示へ",
        ko: "Amazon, 일부 검색 결과에 AI 상품 이미지를 표시",
        id: "Amazon akan menampilkan gambar produk AI di sebagian hasil pencarian",
        vi: "Amazon sẽ hiển thị hình ảnh sản phẩm AI trong một số kết quả tìm kiếm",
        th: "Amazon จะแสดงภาพสินค้า AI ในผลการค้นหาบางส่วน",
        ms: "Amazon akan memaparkan imej produk AI dalam sebahagian hasil carian",
        fil: "Magpapakita ang Amazon ng AI product images sa ilang search results"
      },
      standfirst: {
        "zh-Hant": "TechCrunch 報導，Amazon 將把 visual search 與 AI 用在部分搜尋結果，顯示符合查詢的 AI 商品圖像；公司稱這能協助使用者找到商品。",
        en: "TechCrunch reported that Amazon will use visual search and AI to show generated product images that match some search queries, saying the feature can guide shoppers to products.",
        ja: "TechCrunch によると、Amazon は visual search と AI を使い、一部検索クエリに合う生成商品画像を表示します。同社は買い物客の商品発見を助けると説明しています。",
        ko: "TechCrunch는 Amazon이 visual search와 AI를 활용해 일부 검색어와 맞는 생성 상품 이미지를 보여주며, 쇼핑객이 제품을 찾는 데 도움이 된다고 전했습니다.",
        id: "TechCrunch melaporkan Amazon memakai visual search dan AI untuk menampilkan gambar produk yang cocok dengan sebagian query pencarian, dengan klaim dapat membantu pengguna menemukan produk.",
        vi: "TechCrunch đưa tin Amazon dùng visual search và AI để hiển thị hình ảnh sản phẩm phù hợp với một số truy vấn, cho rằng tính năng này giúp người dùng tìm sản phẩm.",
        th: "TechCrunch รายงานว่า Amazon จะใช้ visual search และ AI เพื่อแสดงภาพสินค้าที่ตรงกับบางคำค้น โดยระบุว่าจะช่วยนำผู้ใช้ไปหาสินค้าได้ง่ายขึ้น",
        ms: "TechCrunch melaporkan Amazon menggunakan visual search dan AI untuk memaparkan imej produk yang sepadan dengan sebahagian carian, dengan tujuan membantu pengguna menemui produk.",
        fil: "Ayon sa TechCrunch, gagamit ang Amazon ng visual search at AI para magpakita ng generated product images na tugma sa ilang search query, bilang tulong sa product discovery."
      },
      facts: {
        "zh-Hant": [
          "TechCrunch 報導，Amazon 會在部分搜尋結果加入 AI 生成的商品圖像。",
          "這項功能會結合 visual search 與 AI，依照使用者查詢產生相符的商品圖像。",
          "Amazon 對外說法是，這能引導使用者更快找到可能想買的商品。"
        ],
        en: [
          "TechCrunch reported that Amazon is adding generated product images to some search results.",
          "The feature combines visual search and AI to match images to user queries.",
          "Amazon says the goal is to guide users toward products."
        ]
      },
      context: {
        "zh-Hant": "這則新聞比較像是購物搜尋介面的實驗，而不是完整新產品發布。它把搜尋結果從文字與商品卡片，推向更圖像化、由 AI 生成輔助的展示方式。",
        en: "The story reads less like a standalone product launch and more like a shopping-search interface test, moving search results toward generated visual suggestions."
      },
      watch: {
        "zh-Hant": "後續要看 Amazon 會把這項功能開放到哪些品類、是否標示 AI 生成內容，以及使用者是否真的因此更容易找到商品。",
        en: "Next, watch which categories get the feature, whether Amazon labels generated images clearly, and whether shoppers actually use it to find products."
      }
    };
  }
  if (/lovable|google cloud|5x|anthropic claude|multiyear/.test(text)) {
    return {
      key: "lovable-google-cloud",
      title: {
        "zh-Hant": "Lovable 與 Google Cloud 簽下多年協議，雲端用量將擴大 5 倍",
        en: "Lovable signs multiyear Google Cloud deal to expand usage fivefold",
        ja: "Lovable、Google Cloud と複数年契約　利用量を 5 倍へ",
        ko: "Lovable, Google Cloud와 다년 계약 체결해 사용량 5배 확대",
        id: "Lovable meneken kontrak multiyear dengan Google Cloud untuk memperluas usage 5x",
        vi: "Lovable ký thỏa thuận nhiều năm với Google Cloud, mở rộng mức dùng gấp 5 lần",
        th: "Lovable เซ็นดีลหลายปีกับ Google Cloud เพื่อขยาย usage 5 เท่า",
        ms: "Lovable menandatangani perjanjian bertahun dengan Google Cloud untuk meluaskan penggunaan 5x",
        fil: "Lovable signs multiyear Google Cloud deal para palawakin ang usage nang 5x"
      },
      standfirst: {
        "zh-Hant": "TechCrunch 報導，Lovable 與 Google 擴大多年合作，內容包括把 Lovable 在 Google Cloud 上的用量提高 5 倍，並取得更多 Anthropic Claude 使用權。",
        en: "TechCrunch reported that Lovable and Google expanded a multiyear deal involving a 5x increase in Lovable's Google Cloud footprint and broader access to Anthropic Claude.",
        ja: "TechCrunch によると、Lovable と Google は複数年契約を拡大し、Lovable の Google Cloud 利用を 5 倍に広げ、Anthropic Claude へのアクセスも拡大します。",
        ko: "TechCrunch는 Lovable과 Google이 다년 계약을 확대해 Lovable의 Google Cloud 사용량을 5배 늘리고 Anthropic Claude 접근을 확대한다고 보도했습니다.",
        id: "TechCrunch melaporkan Lovable dan Google memperluas kontrak multiyear yang mencakup peningkatan footprint Lovable di Google Cloud sebesar 5x dan akses Anthropic Claude yang lebih luas.",
        vi: "TechCrunch đưa tin Lovable và Google mở rộng thỏa thuận nhiều năm, gồm tăng footprint của Lovable trên Google Cloud gấp 5 lần và mở rộng quyền truy cập Anthropic Claude.",
        th: "TechCrunch รายงานว่า Lovable และ Google ขยายดีลหลายปี โดยเพิ่ม footprint ของ Lovable บน Google Cloud 5 เท่า และเพิ่มการเข้าถึง Anthropic Claude",
        ms: "TechCrunch melaporkan Lovable dan Google memperluas perjanjian bertahun yang melibatkan peningkatan footprint Lovable di Google Cloud sebanyak 5x serta akses Anthropic Claude yang lebih luas.",
        fil: "Ayon sa TechCrunch, pinalawak ng Lovable at Google ang multiyear deal na may kasamang 5x expansion ng Lovable footprint sa Google Cloud at mas malawak na access sa Anthropic Claude."
      },
      facts: {
        "zh-Hant": [
          "TechCrunch 引述消息來源報導，Lovable 與 Google 簽下擴大的多年合作協議。",
          "協議內容包括把 Lovable 在 Google Cloud 上的用量提高 5 倍。",
          "報導也提到，Lovable 會取得更多 Anthropic Claude 使用權。"
        ],
        en: [
          "TechCrunch cited a source saying Lovable and Google signed an expanded multiyear agreement.",
          "The deal involves a fivefold expansion of Lovable's footprint on Google Cloud.",
          "The report also says Lovable gains expanded access to Anthropic Claude."
        ]
      },
      context: {
        "zh-Hant": "這則新聞的重點不是抽象評論，而是 AI app-building 平台的雲端需求正在被大型雲端商鎖進多年合約裡。",
        en: "The point is not abstract commentary; it is that cloud demand from AI app-building platforms is being locked into multiyear infrastructure deals."
      },
      watch: {
        "zh-Hant": "後續要看 Lovable 的使用量擴張是否轉成穩定收入，以及 Google Cloud 是否會繼續用模型存取與雲端額度綁住 AI 應用平台。",
        en: "Next, watch whether Lovable's higher usage converts into durable revenue and whether Google Cloud keeps bundling model access with cloud capacity for AI app platforms."
      }
    };
  }
  if (/vercel|ai gateway|minimax|qwen|grok imagine/.test(text)) {
    return {
      key: "vercel-ai-gateway",
      title: {
        "zh-Hant": "Vercel AI Gateway 新增模型，開發者可不用另開供應商帳號",
        en: "Vercel AI Gateway adds models without separate provider accounts",
        ja: "Vercel AI Gateway、新モデルを追加　別のプロバイダーアカウント不要に",
        ko: "Vercel AI Gateway, 별도 제공자 계정 없이 모델 추가",
        id: "Vercel AI Gateway menambah model tanpa akun provider terpisah",
        vi: "Vercel AI Gateway thêm mô hình mà không cần tài khoản nhà cung cấp riêng",
        th: "Vercel AI Gateway เพิ่มโมเดลโดยไม่ต้องเปิดบัญชีผู้ให้บริการแยก",
        ms: "Vercel AI Gateway menambah model tanpa akaun penyedia berasingan",
        fil: "Vercel AI Gateway nagdagdag ng models nang hindi kailangan ng hiwalay na provider account"
      },
      standfirst: {
        "zh-Hant": "Vercel 公告，AI Gateway 已加入新模型；開發者可透過同一個 gateway 使用模型，並且不需要另外建立供應商帳號或支付額外 markup。",
        en: "Vercel announced new model availability on AI Gateway, letting developers access models through one gateway without separate provider accounts or extra markup.",
        ja: "Vercel は AI Gateway で新モデルを利用可能にしたと発表しました。開発者は別のプロバイダーアカウントや追加 markup なしで、同じ gateway からモデルを使えます。",
        ko: "Vercel은 AI Gateway에 새 모델을 추가했다고 발표했습니다. 개발자는 별도 제공자 계정이나 추가 markup 없이 같은 gateway에서 모델을 사용할 수 있습니다.",
        id: "Vercel mengumumkan model baru di AI Gateway, sehingga developer bisa mengakses model lewat satu gateway tanpa akun provider terpisah atau markup tambahan.",
        vi: "Vercel công bố thêm mô hình mới trên AI Gateway, cho phép lập trình viên truy cập qua một gateway mà không cần tài khoản nhà cung cấp riêng hay markup bổ sung.",
        th: "Vercel ประกาศเพิ่มโมเดลใหม่บน AI Gateway ให้นักพัฒนาเข้าถึงผ่าน gateway เดียว โดยไม่ต้องมีบัญชีผู้ให้บริการแยกหรือ markup เพิ่ม",
        ms: "Vercel mengumumkan model baharu di AI Gateway, membolehkan pembangun mengakses model melalui satu gateway tanpa akaun penyedia berasingan atau markup tambahan.",
        fil: "Inanunsyo ng Vercel ang bagong model availability sa AI Gateway, kaya maa-access ng developers ang models sa isang gateway nang walang hiwalay na provider account o extra markup."
      },
      facts: {
        "zh-Hant": [
          "Vercel 公告 AI Gateway 新增模型可用性。",
          "開發者可透過 Vercel AI Gateway 使用模型，不需要另外開供應商帳號。",
          "Vercel 表示這項 access 沒有額外 markup。"
        ],
        en: [
          "Vercel announced new model availability on AI Gateway.",
          "Developers can access models through Vercel AI Gateway without separate provider accounts.",
          "Vercel says access comes with no extra markup."
        ],
        ja: [
          "Vercel は AI Gateway で新モデルを利用できるようにしたと発表しました。",
          "開発者は Vercel AI Gateway 経由でモデルを使え、別のプロバイダーアカウントを用意する必要がありません。",
          "Vercel は、このアクセスに追加 markup はないと説明しています。"
        ],
        ko: [
          "Vercel은 AI Gateway에서 새 모델을 사용할 수 있다고 발표했습니다.",
          "개발자는 별도 제공자 계정 없이 Vercel AI Gateway를 통해 모델을 사용할 수 있습니다.",
          "Vercel은 이 접근에 추가 markup이 없다고 설명했습니다."
        ],
        id: [
          "Vercel mengumumkan model baru tersedia di AI Gateway.",
          "Developer bisa memakai model melalui Vercel AI Gateway tanpa membuat akun provider terpisah.",
          "Vercel menyebut akses ini tidak memakai markup tambahan."
        ],
        vi: [
          "Vercel công bố mô hình mới đã có trên AI Gateway.",
          "Lập trình viên có thể dùng mô hình qua Vercel AI Gateway mà không cần tài khoản nhà cung cấp riêng.",
          "Vercel cho biết quyền truy cập này không có markup bổ sung."
        ],
        th: [
          "Vercel ประกาศว่า AI Gateway รองรับโมเดลใหม่แล้ว",
          "นักพัฒนาสามารถใช้โมเดลผ่าน Vercel AI Gateway โดยไม่ต้องเปิดบัญชีผู้ให้บริการแยก",
          "Vercel ระบุว่าการเข้าถึงนี้ไม่มี markup เพิ่ม"
        ],
        ms: [
          "Vercel mengumumkan model baharu tersedia di AI Gateway.",
          "Pembangun boleh menggunakan model melalui Vercel AI Gateway tanpa membuka akaun penyedia berasingan.",
          "Vercel berkata akses ini tidak mengenakan markup tambahan."
        ],
        fil: [
          "Inanunsyo ng Vercel na available na ang bagong model sa AI Gateway.",
          "Puwedeng gamitin ng developers ang model sa Vercel AI Gateway nang hindi gumagawa ng hiwalay na provider account.",
          "Ayon sa Vercel, walang dagdag na markup ang access na ito."
        ]
      },
      context: {
        "zh-Hant": "這類更新的重點在於模型供應正在被整合進開發平台。對讀者來說，它比一般模型發布更接近開發工具鏈新聞；真正影響的是團隊能否少處理一層供應商帳號、金鑰、計費與權限管理。",
        en: "The useful point is that model supply is being folded into developer platforms, making this closer to tooling infrastructure news than a standalone model announcement. The practical change is less about the model name and more about account setup, keys, billing, and permission management.",
        ja: "この更新の要点は、モデル供給が開発プラットフォーム側に組み込まれつつあることです。単独のモデル発表というより、アカウント、キー、課金、権限管理をどこでまとめるかという開発基盤のニュースです。",
        ko: "이 업데이트의 핵심은 모델 공급이 개발 플랫폼 안으로 들어오고 있다는 점입니다. 단순한 모델 발표라기보다 계정, 키, 과금, 권한 관리를 어디서 묶을지에 가까운 개발 인프라 뉴스입니다.",
        id: "Poin utamanya: pasokan model makin masuk ke platform developer. Ini bukan sekadar pengumuman model, melainkan kabar tentang bagaimana akun, key, billing, dan permission dikelola dalam toolchain.",
        vi: "Điểm chính là nguồn cung mô hình đang được đưa vào nền tảng dành cho lập trình viên. Đây không chỉ là tin về một mô hình mới, mà còn là cách quản lý tài khoản, key, billing và quyền truy cập trong toolchain.",
        th: "ประเด็นสำคัญคือการนำ model supply เข้าไปอยู่ในแพลตฟอร์มสำหรับนักพัฒนา ข่าวนี้จึงไม่ใช่แค่การเปิดตัวโมเดล แต่เกี่ยวกับการจัดการบัญชี key billing และ permission ใน toolchain",
        ms: "Intinya, bekalan model semakin masuk ke dalam platform pembangun. Ini bukan sekadar pengumuman model, tetapi berita tentang cara akaun, key, billing dan permission diurus dalam toolchain.",
        fil: "Ang punto: pumapasok na ang model supply sa developer platforms. Hindi lang ito model announcement; tungkol din ito sa account setup, keys, billing, at permission management sa toolchain."
      },
      watch: {
        "zh-Hant": "後續要看 AI Gateway 支援模型的穩定性、地區可用性、價格透明度，以及開發團隊是否會因此減少多供應商管理成本。如果更多模型走同一路徑上架，AI Gateway 會更像開發平台的基礎服務，而不是單次 changelog。",
        en: "Next, watch model reliability, regional availability, price transparency, and whether teams use the gateway to reduce multi-provider management overhead. If more models keep arriving through the same surface, AI Gateway starts to look like platform infrastructure rather than a one-off changelog.",
        ja: "今後はモデルの安定性、提供地域、価格の透明性、複数プロバイダー管理の手間が減るかを見ます。同じ入口でモデル追加が続けば、AI Gateway は単発の更新ではなく開発基盤に近づきます。",
        ko: "다음에는 모델 안정성, 지역별 사용 가능성, 가격 투명성, 여러 제공자 관리 비용이 줄어드는지를 봐야 합니다. 같은 표면에서 모델 추가가 이어지면 AI Gateway는 단발성 변경 로그보다 플랫폼 인프라에 가까워집니다.",
        id: "Berikutnya, pantau reliabilitas model, ketersediaan regional, transparansi harga, dan apakah tim benar-benar mengurangi overhead multi-provider. Jika model terus masuk lewat permukaan yang sama, AI Gateway akan terlihat seperti infrastruktur platform.",
        vi: "Tiếp theo cần theo dõi độ ổn định của mô hình, khu vực khả dụng, minh bạch giá và việc các nhóm có giảm được chi phí quản lý nhiều nhà cung cấp hay không. Nếu nhiều mô hình tiếp tục đi qua cùng một gateway, đây sẽ giống hạ tầng nền tảng hơn là một changelog đơn lẻ.",
        th: "ต่อจากนี้ต้องดูเสถียรภาพของโมเดล พื้นที่ให้บริการ ความโปร่งใสด้านราคา และทีมพัฒนาลดภาระจัดการหลายผู้ให้บริการได้จริงไหม หากมีโมเดลเพิ่มผ่านทางเดียวกันต่อเนื่อง AI Gateway จะดูเหมือน infrastructure ของแพลตฟอร์มมากกว่า changelog เดี่ยว",
        ms: "Selepas ini, pantau reliabiliti model, ketersediaan wilayah, ketelusan harga dan sama ada pasukan benar-benar mengurangkan overhead multi-provider. Jika lebih banyak model masuk melalui permukaan yang sama, AI Gateway semakin kelihatan seperti infrastruktur platform.",
        fil: "Susunod, bantayan ang reliability ng models, regional availability, price transparency, at kung nababawasan ba talaga ang multi-provider overhead. Kapag tuloy-tuloy ang dating ng models sa parehong surface, mas mukha itong platform infrastructure kaysa isang changelog lang."
      }
    };
  }
  if (/endava|braintrust|codex|customer requests into code|agentic organization/.test(text)) {
    return {
      key: "openai-codex-customer",
      title: {
        "zh-Hant": "OpenAI Codex 客戶案例顯示，程式代理正在進入日常工程流程",
        en: "OpenAI Codex customer stories show coding agents moving into everyday engineering workflows",
        ja: "OpenAI Codex の顧客事例、コーディングエージェントが日常の開発工程へ",
        ko: "OpenAI Codex 고객 사례, 코딩 에이전트가 일상 개발 흐름으로 이동",
        id: "Kisah pelanggan OpenAI Codex menunjukkan coding agent masuk ke workflow engineering harian",
        vi: "Các câu chuyện khách hàng OpenAI Codex cho thấy coding agent đi vào workflow kỹ thuật hằng ngày",
        th: "กรณีลูกค้า OpenAI Codex ชี้ว่า coding agent กำลังเข้าไปอยู่ใน workflow วิศวกรรมประจำวัน",
        ms: "Kisah pelanggan OpenAI Codex menunjukkan coding agent masuk ke workflow kejuruteraan harian",
        fil: "OpenAI Codex customer stories nagpapakitang pumapasok na ang coding agents sa araw-araw na engineering workflow"
      },
      standfirst: {
        "zh-Hant": "OpenAI 發布 Codex 客戶案例，描述企業如何把程式代理放進工程協作、需求整理與程式碼修改流程；重點從單次 demo 轉向日常使用。",
        en: "OpenAI published Codex customer stories describing how companies use coding agents in engineering collaboration, request triage, and code changes, shifting the story from demos to daily use.",
        ja: "OpenAI は Codex の顧客事例を公開し、企業がコーディングエージェントを開発協業、要望整理、コード変更に使う様子を説明しました。",
        ko: "OpenAI는 기업이 Codex를 개발 협업, 요청 정리, 코드 변경에 활용하는 고객 사례를 공개했습니다.",
        id: "OpenAI menerbitkan kisah pelanggan Codex tentang penggunaan coding agent dalam kolaborasi engineering, triage permintaan, dan perubahan kode.",
        vi: "OpenAI công bố các câu chuyện khách hàng Codex, mô tả cách doanh nghiệp dùng coding agent trong cộng tác kỹ thuật, phân loại yêu cầu và thay đổi mã.",
        th: "OpenAI เผยแพร่กรณีลูกค้า Codex ที่อธิบายการใช้ coding agent ในงาน collaboration ของวิศวกร การคัดแยกคำขอ และการแก้โค้ด",
        ms: "OpenAI menerbitkan kisah pelanggan Codex tentang penggunaan coding agent dalam kolaborasi kejuruteraan, triage permintaan dan perubahan kod.",
        fil: "Naglabas ang OpenAI ng Codex customer stories tungkol sa paggamit ng coding agents sa engineering collaboration, request triage, at code changes."
      },
      facts: {
        "zh-Hant": [
          "OpenAI 發布 Codex 相關客戶案例。",
          "案例主軸是把 coding agent 接進工程協作、需求整理與程式碼修改。",
          "這些案例把 Codex 從展示型工具帶到更日常的軟體交付情境。"
        ],
        en: [
          "OpenAI published customer stories related to Codex.",
          "The stories focus on coding agents inside engineering collaboration, request triage, and code changes.",
          "They move Codex from demo tooling toward everyday software delivery contexts."
        ]
      },
      context: {
        "zh-Hant": "這則快訊適合看成工程工具市場的採用案例：AI coding agent 正從個人助理，變成團隊流程裡的一個工作角色。",
        en: "This is best read as adoption evidence in engineering tooling: AI coding agents are moving from personal assistants toward a role inside team workflows."
      },
      watch: {
        "zh-Hant": "後續要看企業是否公開更多使用量、審核方式、失敗案例與工程效率數字，而不只是成功故事。",
        en: "Next, watch whether companies disclose usage volume, review patterns, failure cases, and engineering productivity data beyond success stories."
      }
    };
  }
  if (/third-party evaluations|trustworthy.*evaluations|frontier model|model evaluations|safety evaluations/.test(text)) {
    return {
      key: "openai-third-party-evals",
      title: {
        "zh-Hant": "OpenAI 發布第三方模型評測共同手冊，聚焦前沿模型安全",
        en: "OpenAI publishes shared playbook for trustworthy third-party model evaluations",
        ja: "OpenAI、信頼できる第三者モデル評価の共通プレイブックを公開",
        ko: "OpenAI, 신뢰할 수 있는 제3자 모델 평가 공동 플레이북 공개",
        id: "OpenAI menerbitkan playbook bersama untuk evaluasi model pihak ketiga yang tepercaya",
        vi: "OpenAI công bố playbook chung cho đánh giá mô hình bên thứ ba đáng tin cậy",
        th: "OpenAI เผยแพร่ playbook ร่วมสำหรับการประเมินโมเดลโดยบุคคลที่สามอย่างน่าเชื่อถือ",
        ms: "OpenAI menerbitkan playbook bersama untuk penilaian model pihak ketiga yang dipercayai",
        fil: "OpenAI naglabas ng shared playbook para sa trustworthy third-party model evaluations"
      },
      standfirst: {
        "zh-Hant": "OpenAI 發布第三方評測共同手冊，說明前沿模型安全評估需要更清楚的範圍、方法、存取條件與回報機制。",
        en: "OpenAI published a shared playbook for third-party evaluations, outlining clearer scope, methods, access conditions, and reporting practices for frontier model safety work.",
        ja: "OpenAI は第三者評価の共通プレイブックを公開し、前沿モデルの安全評価に必要な範囲、方法、アクセス条件、報告手順を整理しました。",
        ko: "OpenAI는 제3자 평가를 위한 공동 플레이북을 공개하며 프런티어 모델 안전 평가의 범위, 방법, 접근 조건, 보고 방식을 정리했습니다.",
        id: "OpenAI menerbitkan playbook evaluasi pihak ketiga yang menjelaskan cakupan, metode, kondisi akses, dan praktik pelaporan untuk keselamatan model frontier.",
        vi: "OpenAI công bố playbook đánh giá bên thứ ba, nêu rõ phạm vi, phương pháp, điều kiện truy cập và cách báo cáo trong đánh giá an toàn mô hình frontier.",
        th: "OpenAI เผยแพร่ playbook สำหรับการประเมินโดยบุคคลที่สาม ระบุ scope, วิธีการ, เงื่อนไขการเข้าถึง และแนวทางรายงานสำหรับความปลอดภัยของ frontier model",
        ms: "OpenAI menerbitkan playbook penilaian pihak ketiga yang menerangkan skop, kaedah, syarat akses dan amalan pelaporan untuk keselamatan model frontier.",
        fil: "Naglabas ang OpenAI ng shared playbook para sa third-party evaluations, na naglilinaw ng scope, methods, access conditions, at reporting practices para sa frontier model safety."
      },
      facts: {
        "zh-Hant": [
          "OpenAI 發布第三方模型評測共同手冊。",
          "內容聚焦前沿模型安全評估的範圍、方法、存取與回報方式。",
          "這類手冊讓外部評測從臨時合作更接近可重複的公開流程。"
        ],
        en: [
          "OpenAI published a shared playbook for third-party model evaluations.",
          "The playbook focuses on scope, methods, access, and reporting for frontier model safety evaluations.",
          "It makes external evaluation work more repeatable and explicit."
        ]
      },
      context: {
        "zh-Hant": "這則新聞不是產品更新，而是 AI 安全評測制度化的一步。它把外部評測者、模型提供者與公開報告之間的協作方式寫得更清楚。",
        en: "This is not a product update; it is a step toward institutionalizing AI safety evaluation across external evaluators, model providers, and public reporting."
      },
      watch: {
        "zh-Hant": "後續要看這份手冊是否被更多實驗室、評測機構與政策討論採用，以及實際評測報告是否變得更可比較。",
        en: "Next, watch whether more labs, evaluators, and policy discussions adopt the playbook, and whether evaluation reports become easier to compare."
      }
    };
  }
  return {
    key: frame.key || "generic-source-news"
  };
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
  if (profile?.key === "voice-ai-markets") return localizedSourceTitle(language, frame, source);
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

function articleStandfirst(language, frame, source, article, profile) {
  if (profile?.key === "voice-ai-markets") return localizeVoiceBody(language).excerpt;
  const profiled = profileText(profile, "standfirst", language);
  if (profiled) return profiled;
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const date = formatDate(article.publishedAt || source.publishedAt, language);
  const sourceSummary = publicArticleStandfirst(article, source);
  const title = articleTitle(language, frame, source, article, profile);
  const sourceSummaryLooksEnglish = /[a-z]{4,}\s+[a-z]{4,}/i.test(sourceSummary) && !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(sourceSummary);
  if (language === "en" && sourceSummary) return sourceSummary;
  if (language === "zh-Hant") {
    if (sourceSummary && !sourceSummaryLooksEnglish) return `${publisher} 報導，${sourceSummary}`;
    return localizedSourceSummary(language, { ...source, summary: sourceSummary || source.summary || title }, frame) || `${publisher} 報導，${title}。`;
  }
  if (sourceSummary && !sourceSummaryLooksEnglish) return sourceSummary;
  return localizedSourceSummary(language, { ...source, summary: sourceSummary || source.summary || title }, frame) || `${publisher} reported: ${title}.`;
}

function localizedFallbackFacts(language, frame, source, article, publisher, title, numbers = [], entities = []) {
  const localizedSummary = localizedSourceSummary(language, source, frame);
  const numberText = numbers.slice(0, 4).join(", ");
  const entityText = entities.slice(0, 5).join(", ");
  const byLanguage = {
    "zh-Hant": [
      `${publisher} 報導，${title}。`,
      localizedSummary,
      numberText ? `來源中的關鍵數字包括 ${numberText}。` : "",
      entityText ? `這則新聞涉及 ${entityText}。` : ""
    ],
    en: [
      `${publisher} reported: ${title}.`,
      localizedSummary,
      numberText ? `Key figures in the source include ${numberText}.` : "",
      entityText ? `The report involves ${entityText}.` : ""
    ],
    ja: [
      `${publisher} は「${title}」と報じました。`,
      localizedSummary,
      numberText ? `出典で確認できる主な数字には ${numberText} が含まれます。` : "",
      entityText ? `この報道には ${entityText} が関係しています。` : ""
    ],
    ko: [
      `${publisher}는 "${title}"라고 보도했습니다.`,
      localizedSummary,
      numberText ? `출처에서 확인되는 주요 수치는 ${numberText}입니다.` : "",
      entityText ? `이 보도에는 ${entityText}가 관련돼 있습니다.` : ""
    ],
    id: [
      `${publisher} melaporkan: "${title}."`,
      localizedSummary,
      numberText ? `Angka penting dalam sumber mencakup ${numberText}.` : "",
      entityText ? `Laporan ini melibatkan ${entityText}.` : ""
    ],
    vi: [
      `${publisher} đưa tin: "${title}."`,
      localizedSummary,
      numberText ? `Các con số đáng chú ý trong nguồn gồm ${numberText}.` : "",
      entityText ? `Bài viết liên quan tới ${entityText}.` : ""
    ],
    th: [
      `${publisher} รายงานว่า "${title}"`,
      localizedSummary,
      numberText ? `ตัวเลขสำคัญในแหล่งข่าวมี ${numberText}` : "",
      entityText ? `รายงานนี้เกี่ยวข้องกับ ${entityText}` : ""
    ],
    ms: [
      `${publisher} melaporkan: "${title}."`,
      localizedSummary,
      numberText ? `Angka penting dalam sumber termasuk ${numberText}.` : "",
      entityText ? `Laporan ini melibatkan ${entityText}.` : ""
    ],
    fil: [
      `Iniulat ng ${publisher}: "${title}."`,
      localizedSummary,
      numberText ? `Kasama sa mahahalagang numero sa source ang ${numberText}.` : "",
      entityText ? `Kaugnay ng ulat na ito ang ${entityText}.` : ""
    ]
  };
  return (byLanguage[language] || byLanguage.en).filter(Boolean).slice(0, 4);
}

function factsForArticle(language, frame, source, article, profile) {
  if (profile?.key === "voice-ai-markets") return localizeVoiceBody(language).keyTakeaways;
  const profiled = profileFacts(profile, language);
  if (profiled.length) return profiled;
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const title = articleTitle(language, frame, source, article, profile);
  const numbers = (article.numbers || []).filter((number) => !/^\d$/.test(String(number).trim()));
  const entities = (article.entities || []).filter((entity) => !/\n/.test(String(entity))).filter((entity) => !/\b(You|The|This|Source)\b/.test(String(entity)));
  if (language === "zh-Hant") {
    const sourceFacts = (article.factBullets || []).map(publicArticleFact).filter(Boolean).slice(0, 4);
    if (sourceFacts.length >= 2 && !sourceFacts.some((fact) => /[a-z]{4,}\s+[a-z]{4,}/i.test(fact))) {
      return sourceFacts;
    }
    return localizedFallbackFacts(language, frame, source, article, publisher, title, numbers, entities);
  }
  const sourceFacts = (article.factBullets || []).map(publicArticleFact).filter(Boolean).slice(0, 4);
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

function sourceBackedBody(language, frame, source, article, profile) {
  if (profile?.key === "voice-ai-markets") return localizeVoiceBody(language).body;
  const labels = labelsFor(language);
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const date = formatDate(article.publishedAt || source.publishedAt, language);
  const title = articleTitle(language, frame, source, article, profile);
  const lead = articleStandfirst(language, frame, source, article, profile);
  const facts = factsForArticle(language, frame, source, article, profile);
  const context = profileText(profile, "context", language, labels.fallbackContext);
  const watch = profileText(profile, "watch", language, labels.fallbackWatch);
  const sourceDetail = sourceDetailParagraph(language, publisher, date, title, article, source, facts[0]);
  const sourceIntro = labels.sourceIntro(publisher, date, title);
  const firstParagraph = lead && lead.toLowerCase().includes(publisher.toLowerCase())
    ? lead
    : `${sourceIntro}${lead ? ` ${lead}` : ""}`;
  const factParagraph =
    language === "zh-Hant"
      ? facts.map((fact) => `- ${fact}`).join("\n")
      : facts.map((fact) => `- ${fact}`).join("\n");

  return [
    `## ${labels.sections[0]}\n\n${firstParagraph}`,
    `## ${labels.sections[1]}\n\n${factParagraph}`,
    `## ${labels.sections[2]}\n\n${context}\n\n${sourceDetail}`,
    `## ${labels.sections[3]}\n\n${watch}`
  ].join("\n\n");
}

function sourceGeoSummary(language, frame, source, article, profile) {
  if (profile?.key === "voice-ai-markets") return localizeVoiceBody(language).geoSummary;
  const publisher = sourceArticlePublisher(article.publisher || source.publisher);
  const standfirst = articleStandfirst(language, frame, source, article, profile);
  const context = profileText(profile, "context", language, "");
  const prefix = {
    "zh-Hant": `${publisher} 來源重點：`,
    en: `${publisher} source note: `,
    ja: `${publisher} 出典メモ：`,
    ko: `${publisher} 출처 요약: `,
    id: `Catatan sumber ${publisher}: `,
    vi: `Ghi chú nguồn ${publisher}: `,
    th: `บันทึกแหล่งที่มา ${publisher}: `,
    ms: `Nota sumber ${publisher}: `,
    fil: `Source note ng ${publisher}: `
  }[language] || `${publisher} source note: `;
  return truncate(`${prefix}${standfirst} ${context}`.trim(), 220);
}

function sourceKeyTakeaways(language, frame, source, article, profile) {
  return factsForArticle(language, frame, source, article, profile).slice(0, 4);
}

function sourceFaqs(language, title, frame, source, article, profile) {
  const labels = labelsFor(language);
  const facts = factsForArticle(language, frame, source, article, profile).slice(0, 2);
  const watch = profileText(profile, "watch", language, labels.fallbackWatch);
  const factAnswer = facts.length ? facts.join(" ") : articleStandfirst(language, frame, source, article, profile);
  const byLanguage = {
    "zh-Hant": [
      { question: "這篇報導確認了哪些事？", answer: factAnswer },
      { question: "後續要看什麼？", answer: watch }
    ],
    en: [
      { question: "What did the report confirm?", answer: factAnswer },
      { question: "What should readers watch next?", answer: watch }
    ],
    ja: [
      { question: "この報道で確認できることは何ですか？", answer: factAnswer },
      { question: "次に見るべき点は何ですか？", answer: watch }
    ],
    ko: [
      { question: "이 보도로 확인된 내용은 무엇인가요?", answer: factAnswer },
      { question: "다음에는 무엇을 봐야 하나요?", answer: watch }
    ],
    id: [
      { question: "Apa yang dikonfirmasi laporan ini?", answer: factAnswer },
      { question: "Apa yang perlu dipantau berikutnya?", answer: watch }
    ],
    vi: [
      { question: "Bài viết này xác nhận điều gì?", answer: factAnswer },
      { question: "Tiếp theo nên theo dõi gì?", answer: watch }
    ],
    th: [
      { question: "รายงานนี้ยืนยันอะไรบ้าง?", answer: factAnswer },
      { question: "ควรติดตามอะไรต่อ?", answer: watch }
    ],
    ms: [
      { question: "Apakah yang disahkan oleh laporan ini?", answer: factAnswer },
      { question: "Apa yang perlu dipantau selepas ini?", answer: watch }
    ],
    fil: [
      { question: "Ano ang kinumpirma ng ulat na ito?", answer: factAnswer },
      { question: "Ano ang susunod na dapat bantayan?", answer: watch }
    ]
  };
  return byLanguage[language] || byLanguage.en;
}

export function buildMarketNewsroomPost({ language, pack = {}, post = {}, frame, slug, author, readTimeMinutes } = {}) {
  if (!LANGUAGES.includes(language)) throw new Error(`unsupported language ${language}`);
  const source = (pack.sourceLinks || post.sourceLinks || [])[0] || {};
  const inferredFrame = frame || inferMarketFrame(pack.sourceLinks ? pack : post);
  const labels = labelsFor(language);
  const article = sourceArticleFromPackOrPost({ pack, post });
  const profile = knownProfile(article, inferredFrame);
  const generatedTitle = normalizeNewsText(articleTitle(language, inferredFrame, source, article, profile));
  const existingTitle = cleanExistingMarketTitle(post.title || "", source.publisher || article.publisher);
  const title =
    !profile?.title && usableExistingMarketTitle(existingTitle) && titleCompatibleWithArticle(existingTitle, article, inferredFrame)
      ? existingTitle
      : generatedTitle;
  const body = normalizeNewsText(sourceBackedBody(language, inferredFrame, source, article, profile));
  const excerpt = normalizeNewsText(
    articleStandfirst(language, inferredFrame, source, article, profile)
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
