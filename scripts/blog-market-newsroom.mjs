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
      "zh-Hant": "Goldman 與 Meta 前員工做語音 AI，押注大平台沒顧到的市場",
      en: fallback,
      ja: "Goldman と Meta 出身の創業者が、音声 AI で見落とされた市場に挑む",
      ko: "Goldman과 Meta 출신 창업자가 대형 플랫폼이 놓친 시장에 음성 AI로 뛰어들다",
      id: "Dua pendiri eks Goldman dan Meta membangun voice AI untuk pasar yang terlewatkan",
      vi: "Hai nhà sáng lập rời Goldman và Meta để làm voice AI cho thị trường bị bỏ quên",
      th: "ผู้ก่อตั้งจาก Goldman และ Meta สร้าง voice AI ให้ตลาดที่ถูกมองข้าม",
      ms: "Dua pengasas bekas Goldman dan Meta membina voice AI untuk pasaran yang terlepas pandang",
      fil: "Dalawang founder mula Goldman at Meta ang gumawa ng voice AI para sa markets na nalalampasan"
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

function localizedNewsTitle(language, frame, source) {
  if (frame.key === "voice-ai-markets") {
    return {
      "zh-Hant": "Goldman、Meta 前員工押注語音 AI：大平台漏掉的市場，反而先跑出用量",
      en: localizedSourceTitle("en", frame, source),
      ja: "Goldman・Meta 出身者が音声 AI に賭ける：大手が見落とした市場で利用量が伸びる",
      ko: "Goldman·Meta 출신이 음성 AI에 베팅하다: 대형 플랫폼이 놓친 시장에서 사용량이 나온다",
      id: "Eks Goldman dan Meta bertaruh pada voice AI: pasar yang terlewat justru mulai menunjukkan volume",
      vi: "Cựu nhân sự Goldman và Meta đặt cược vào voice AI: thị trường bị bỏ quên lại có lưu lượng thật",
      th: "อดีต Goldman และ Meta เดิมพัน voice AI: ตลาดที่แพลตฟอร์มใหญ่พลาดเริ่มมี volume จริง",
      ms: "Bekas Goldman dan Meta bertaruh pada voice AI: pasaran yang terlepas pandang mula menunjukkan volume",
      fil: "Dating Goldman at Meta talent tumaya sa voice AI: lumalabas ang volume sa markets na nalampasan"
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

  if (/voice ai|goldman|meta|africa|middle east|17,000|17000/.test(text)) {
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

  if (/alphabet|google.*85b|capital spend|capex|raise/.test(text)) {
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

  if (/osmos|autonomous data engineering|fabric/.test(text)) {
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
    headings: ["新聞重點", "背景與脈絡", "還要追什麼", "讀者怎麼看"],
    why: (frame) =>
      `以這則來源來看，重點是${localizedProduct("zh-Hant", frame)}已經開始碰到具體使用者與可觀察的使用量；後續才有辦法討論商業化與穩定部署。`,
    caution: "目前仍要把來源報導、公司說法與實際成效分開看。若只有單一來源或單一數字，最好先把它當成市場訊號，而不是完整結論。",
    reader: "如果你正在評估同類工具，先看三件事：使用者是不是原本就有明確痛點、服務是否能處理足夠大的日常量、以及失敗時是否仍能回到人工處理。"
  },
  en: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("en", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} reported on ${date} that ${frame.focus.en}. ${summary}`,
    headings: ["What happened", "Why it matters", "What remains unclear", "ALTOS LAB reader note"],
    why: (frame) =>
      `The signal is that ${localizedProduct("en", frame)} is moving closer to a concrete use case, a visible user group, and measurable volume.`,
    caution: "Keep the reported facts, company claims, and real-world outcomes separate. A single source or a single metric is a signal, not a complete conclusion.",
    reader: "If you are evaluating a similar tool, start with the user pain, daily usage volume, and the fallback path when automation fails."
  },
  ja: {
    category: "マーケット速報",
    title: (frame, source) => localizedNewsTitle("ja", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} は ${date}、${frame.focus.ja} と報じました。${summary}`,
    headings: ["何が起きたか", "なぜ注目されるか", "まだ確認が必要な点", "ALTOS LAB 読者メモ"],
    why: (frame) =>
      `このニュースで見るべき点は、${localizedProduct("ja", frame)} が具体的な利用場面、利用者層、測定できる利用量に近づいていることです。`,
    caution: "報道された事実、企業側の説明、実際の成果は分けて読む必要があります。単一ソースや単一指標は、市場シグナルであり結論ではありません。",
    reader: "類似ツールを評価するなら、利用者の痛み、日常的な利用量、失敗時に人へ戻せる経路から確認してください。"
  },
  ko: {
    category: "시장 브리프",
    title: (frame, source) => localizedNewsTitle("ko", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)}는 ${date} ${frame.focus.ko}고 보도했습니다. ${summary}`,
    headings: ["무슨 일이 있었나", "왜 볼 만한가", "아직 확인할 점", "ALTOS LAB 독자 메모"],
    why: (frame) =>
      `이 소식에서 볼 점은 ${localizedProduct("ko", frame)}가 구체적인 사용 장면, 사용자층, 측정 가능한 사용량에 가까워지고 있다는 것입니다.`,
    caution: "보도된 사실, 회사의 설명, 실제 성과를 분리해 읽어야 합니다. 단일 출처나 단일 지표는 결론이 아니라 시장 신호입니다.",
    reader: "비슷한 도구를 검토한다면 사용자 고통, 일상 사용량, 자동화가 실패했을 때 사람이 이어받는 경로부터 확인하세요."
  },
  id: {
    category: "Kabar Pasar",
    title: (frame, source) => localizedNewsTitle("id", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahwa ${frame.focus.id}. ${summary}`,
    headings: ["Apa yang terjadi", "Kenapa ini menarik", "Apa yang masih perlu dicek", "Catatan pembaca ALTOS LAB"],
    why: (frame) =>
      `Sinyal pentingnya: ${localizedProduct("id", frame)} makin dekat dengan use case nyata, kelompok pengguna yang jelas, dan volume yang bisa diamati.`,
    caution: "Pisahkan fakta dari laporan, klaim perusahaan, dan hasil di lapangan. Satu sumber atau satu angka adalah sinyal pasar, bukan kesimpulan penuh.",
    reader: "Kalau sedang menilai tool serupa, mulai dari rasa sakit pengguna, volume penggunaan harian, dan jalur fallback ketika otomatisasi gagal."
  },
  vi: {
    category: "Tin nhanh thị trường",
    title: (frame, source) => localizedNewsTitle("vi", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} đưa tin vào ${date} rằng ${frame.focus.vi}. ${summary}`,
    headings: ["Chuyện gì đã xảy ra", "Vì sao đáng chú ý", "Điều vẫn cần kiểm chứng", "Ghi chú cho độc giả ALTOS LAB"],
    why: (frame) =>
      `Điểm đáng chú ý là ${localizedProduct("vi", frame)} đang tiến gần hơn tới một use case cụ thể, một nhóm người dùng rõ ràng và lượng sử dụng có thể quan sát.`,
    caution: "Cần tách riêng sự kiện được nguồn đưa tin, tuyên bố từ công ty và kết quả thực tế. Một nguồn hoặc một con số chỉ là tín hiệu thị trường, chưa phải kết luận đầy đủ.",
    reader: "Nếu đang đánh giá công cụ tương tự, hãy bắt đầu từ nỗi đau của người dùng, lượng sử dụng hằng ngày và cách quay lại xử lý thủ công khi tự động hóa thất bại."
  },
  th: {
    category: "ข่าวตลาด",
    title: (frame, source) => localizedNewsTitle("th", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} รายงานเมื่อ ${date} ว่า ${frame.focus.th} ${summary}`,
    headings: ["เกิดอะไรขึ้น", "ทำไมเรื่องนี้น่าจับตา", "อะไรที่ยังต้องตรวจสอบ", "บันทึกสำหรับผู้อ่าน ALTOS LAB"],
    why: (frame) =>
      `ประเด็นสำคัญคือ ${localizedProduct("th", frame)} กำลังเข้าใกล้ use case จริง กลุ่มผู้ใช้ที่ชัดเจน และปริมาณการใช้งานที่สังเกตได้`,
    caution: "ควรแยกข้อเท็จจริงจากรายงาน คำกล่าวของบริษัท และผลลัพธ์จริงออกจากกัน แหล่งข่าวเดียวหรือตัวเลขเดียวเป็นเพียงสัญญาณตลาด ไม่ใช่ข้อสรุปทั้งหมด",
    reader: "ถ้ากำลังประเมินเครื่องมือแบบเดียวกัน ให้เริ่มจาก pain point ของผู้ใช้ ปริมาณการใช้งานประจำวัน และทางกลับไปให้มนุษย์จัดการเมื่อ automation ล้มเหลว"
  },
  ms: {
    category: "Berita Pasaran",
    title: (frame, source) => localizedNewsTitle("ms", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahawa ${frame.focus.ms}. ${summary}`,
    headings: ["Apa yang berlaku", "Mengapa ia wajar diperhatikan", "Apa yang masih perlu disahkan", "Nota pembaca ALTOS LAB"],
    why: (frame) =>
      `Isyarat pentingnya: ${localizedProduct("ms", frame)} semakin dekat dengan use case sebenar, kumpulan pengguna yang jelas, dan volume penggunaan yang boleh diperhatikan.`,
    caution: "Pisahkan fakta yang dilaporkan, dakwaan syarikat, dan hasil sebenar. Satu sumber atau satu angka ialah isyarat pasaran, bukan kesimpulan penuh.",
    reader: "Jika menilai alat serupa, mulakan dengan kesakitan pengguna, volume penggunaan harian, dan laluan fallback apabila automasi gagal."
  },
  fil: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("fil", frame, source),
    standfirst: (frame, source, date, summary) =>
      `Iniulat ng ${shortPublisher(source.publisher)} noong ${date} na ${frame.focus.fil}. ${summary}`,
    headings: ["Ano ang nangyari", "Bakit ito kapansin-pansin", "Ano pa ang kailangang i-check", "Tala para sa ALTOS LAB readers"],
    why: (frame) =>
      `Ang mahalagang signal: mas lumalapit ang ${localizedProduct("fil", frame)} sa totoong use case, malinaw na user group, at usage volume na puwedeng obserbahan.`,
    caution: "Paghiwalayin ang reported facts, company claims, at real-world outcomes. Ang isang source o isang metric ay market signal, hindi kumpletong konklusyon.",
    reader: "Kung sinusuri ang kaparehong tool, magsimula sa sakit ng user, araw-araw na usage volume, at fallback path kapag pumalya ang automation."
  }
};

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

function buildBody(language, frame, source) {
  const labels = LABELS[language] || LABELS.en;
  const date = formatDate(source.publishedAt, language);
  const summary = localizedSourceSummary(language, source, frame);
  const h = labels.headings;

  return [
    `## ${h[0]}\n\n${labels.standfirst(frame, source, date, summary)}`,
    `## ${h[1]}\n\n${labels.why(frame)}`,
    `## ${h[2]}\n\n${labels.caution}\n\n${sourceFact(language, source, date, summary)}`,
    `## ${h[3]}\n\n${labels.reader}`
  ].join("\n\n");
}

function geoSummary(language, frame, source) {
  const date = formatDate(source.publishedAt, language);
  const summary = truncate(localizedSourceSummary(language, source, frame), 150);
  const publisher = shortPublisher(source.publisher);
  const focus = frame.focus[language] || frame.focus.en;
  const byLanguage = {
    "zh-Hant": `來源摘要：${publisher} 於 ${date} 報導，${focus}。可引用事實：${summary}`,
    en: `Source brief: ${publisher} reported on ${date} that ${focus}. Citable fact: ${summary}`,
    ja: `出典要約：${publisher} は ${date}、${focus} と報じました。引用できる事実：${summary}`,
    ko: `출처 요약: ${publisher}는 ${date} ${focus}고 보도했습니다. 인용 가능한 사실: ${summary}`,
    id: `Ringkasan sumber: ${publisher} melaporkan pada ${date} bahwa ${focus}. Fakta yang bisa dikutip: ${summary}`,
    vi: `Tóm tắt nguồn: ${publisher} đưa tin vào ${date} rằng ${focus}. Dữ kiện có thể trích dẫn: ${summary}`,
    th: `สรุปแหล่งข่าว: ${publisher} รายงานเมื่อ ${date} ว่า ${focus} ข้อเท็จจริงที่อ้างอิงได้: ${summary}`,
    ms: `Ringkasan sumber: ${publisher} melaporkan pada ${date} bahawa ${focus}. Fakta boleh dirujuk: ${summary}`,
    fil: `Source brief: iniulat ng ${publisher} noong ${date} na ${focus}. Citable fact: ${summary}`
  };
  return byLanguage[language] || byLanguage.en;
}

function keyTakeaways(language, frame, source) {
  const publisher = shortPublisher(source.publisher);
  const summary = truncate(localizedSourceSummary(language, source, frame), 135);
  const focus = frame.focus[language] || frame.focus.en;
  const items = {
    "zh-Hant": [`${publisher} 報導：${focus}。`, `來源可驗證的重點是：${summary}`, "後續要看實際使用量、付費採用與服務穩定性，而不是只看產品敘事。"],
    en: [`${publisher} reported that ${focus}.`, `The citable source point: ${summary}`, "Watch real usage, paid adoption, and service stability rather than the product story alone."],
    ja: [`${publisher} は ${focus} と報じました。`, `引用できる要点：${summary}`, "今後は製品説明だけでなく、実利用、課金導入、サービス安定性を見る必要があります。"],
    ko: [`${publisher}는 ${focus}고 보도했습니다.`, `인용 가능한 핵심: ${summary}`, "제품 설명보다 실제 사용량, 유료 도입, 서비스 안정성을 봐야 합니다."],
    id: [`${publisher} melaporkan bahwa ${focus}.`, `Poin sumber yang bisa dikutip: ${summary}`, "Pantau penggunaan nyata, adopsi berbayar, dan stabilitas layanan, bukan cerita produk saja."],
    vi: [`${publisher} đưa tin rằng ${focus}.`, `Điểm có thể trích dẫn từ nguồn: ${summary}`, "Theo dõi mức dùng thực tế, khách hàng trả phí và độ ổn định dịch vụ, không chỉ câu chuyện sản phẩm."],
    th: [`${publisher} รายงานว่า ${focus}`, `ประเด็นจากแหล่งข่าวที่อ้างอิงได้: ${summary}`, "ควรดูการใช้งานจริง การใช้งานแบบจ่ายเงิน และความเสถียรของบริการ ไม่ใช่แค่เรื่องเล่าของสินค้า"],
    ms: [`${publisher} melaporkan bahawa ${focus}.`, `Poin sumber yang boleh dirujuk: ${summary}`, "Pantau penggunaan sebenar, adopsi berbayar, dan kestabilan perkhidmatan, bukan cerita produk semata-mata."],
    fil: [`Iniulat ng ${publisher} na ${focus}.`, `Puwedeng sipiin mula sa ulat: ${summary}`, "Bantayan ang totoong usage, paid adoption, at service stability, hindi lang product story."]
  };
  return items[language] || items.en;
}

function faqs(language, frame) {
  const focus = frame.focus[language] || frame.focus.en;
  const questions = {
    "zh-Hant": [
      { question: "這則快訊可以怎麼讀？", answer: `先把它當成市場訊號：${focus}。真正要追的是後續使用量、客戶類型與服務穩定性。` },
      { question: "這代表同類工具已經成熟了嗎？", answer: "還不能直接下結論。單篇報導能證明市場有動作，但成熟度仍要看更多客戶、營收、故障率與長期留存。" }
    ],
    en: [
      { question: "How should readers interpret this brief?", answer: `Read it as a market signal: ${focus}. The follow-up questions are usage, customer mix, and service stability.` },
      { question: "Does this mean the category is mature?", answer: "Not yet. A report can show momentum, but maturity still depends on customers, revenue, reliability, and retention." }
    ]
  };
  return questions[language] || questions.en;
}

export function buildMarketNewsroomPost({ language, pack = {}, post = {}, frame, slug, author, readTimeMinutes } = {}) {
  if (!LANGUAGES.includes(language)) throw new Error(`unsupported language ${language}`);
  const source = (pack.sourceLinks || post.sourceLinks || [])[0] || {};
  const inferredFrame = frame || inferMarketFrame(pack.sourceLinks ? pack : post);
  const labels = LABELS[language] || LABELS.en;
  const date = formatDate(source.publishedAt, language);
  const summary = localizedSourceSummary(language, source, inferredFrame);
  const generatedTitle = normalizeNewsText(labels.title(inferredFrame, source));
  const title =
    inferredFrame.key === "ai-market-update" && post.title && !hasMarketTemplateSlop({ title: post.title })
      ? normalizeNewsText(post.title)
      : generatedTitle;
  const body = normalizeNewsText(buildBody(language, inferredFrame, source));
  const excerpt = normalizeNewsText(labels.standfirst(inferredFrame, source, date, summary));
  const seoDescription = truncate(excerpt, 176);

  return {
    language,
    slug: slug || post.slug,
    title,
    seoTitle: truncate(title, 76),
    seoDescription,
    excerpt: truncate(excerpt, 240),
    contentType: "breaking",
    newsCategory: labels.category,
    topic: cleanSourceTitle(source.title || post.topic),
    audience: post.audience || "",
    geoSummary: geoSummary(language, inferredFrame, source),
    body,
    keyTakeaways: keyTakeaways(language, inferredFrame, source),
    faqs: faqs(language, inferredFrame),
    tags: [labels.category, "AI", inferredFrame.entity, inferredFrame.key].filter(Boolean).slice(0, 5),
    author: author || post.author || "Ken",
    readTimeMinutes: readTimeMinutes || post.readTimeMinutes || 3,
    coverAlt: post.coverAlt || `${title} - ${post.coverCredit || source.publisher || "source image"}`,
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

  return /這則消息可以拿來|企業檢查|卡在哪個流程|原因是企業決策問題|Source:\s|Event:\s|Evidence:\s|Decision cue|primary source; the article should stay anchored|Next action: choose one workflow|不是同類工具會不會更多，而是|不只是海外消息，而是/i.test(text);
}
