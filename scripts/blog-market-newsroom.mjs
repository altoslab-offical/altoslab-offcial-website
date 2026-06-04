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
      return !/source index|category\/artificial-intelligence|article claims should remain anchored|current ai feed/.test(text);
    })
    .map((source) => ({
      ...source,
      title: cleanSourceTitle(source.title || ""),
      summary: normalizeNewsText(source.summary || "")
    }))
    .filter((source) => source.title && source.url);
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
    headings: ["發生什麼事", "來源裡的關鍵細節", "為什麼被注意", "後續觀察"],
    why: (frame) =>
      `以這則來源來看，重點是${localizedProduct("zh-Hant", frame)}已經開始碰到具體使用者與可觀察的使用量；後續才有辦法討論商業化與穩定部署。`,
    caution: "這則消息還需要看後續客戶採用、服務穩定性與實際營收表現。單一報導能說明市場有新動作，但還不能直接代表整個類別已成熟。",
    reader: "接下來要觀察的是，這類區域化語音 AI 能否在更多產業維持低延遲、處理方言與混合語言，並把試用轉成長期付費客戶。"
  },
  en: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("en", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} reported on ${date} that ${frame.focus.en}. ${summary}`,
    headings: ["What happened", "Key details from the source", "Why it drew attention", "What to watch next"],
    why: (frame) =>
      `The signal is that ${localizedProduct("en", frame)} is moving closer to a concrete use case, a visible user group, and measurable volume.`,
    caution: "The next question is whether customer adoption, reliability, and revenue keep pace with the reported usage. One story can show momentum, but not category maturity by itself.",
    reader: "Watch whether regional voice AI systems can keep latency low, handle dialects and code-switching, and turn trials into durable paid deployments."
  },
  ja: {
    category: "マーケット速報",
    title: (frame, source) => localizedNewsTitle("ja", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} は ${date}、${frame.focus.ja} と報じました。${summary}`,
    headings: ["何が起きたか", "出典の主なポイント", "なぜ注目されたか", "次に見る点"],
    why: (frame) =>
      `このニュースで見るべき点は、${localizedProduct("ja", frame)} が具体的な利用場面、利用者層、測定できる利用量に近づいていることです。`,
    caution: "今後は顧客導入、信頼性、売上が利用量に伴って伸びるかを見る必要があります。単一の記事だけで市場成熟を判断することはできません。",
    reader: "地域特化の音声 AI が低遅延、方言、コードスイッチングに対応しながら、有料利用を継続できるかが次の焦点です。"
  },
  ko: {
    category: "시장 브리프",
    title: (frame, source) => localizedNewsTitle("ko", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)}는 ${date} ${frame.focus.ko}고 보도했습니다. ${summary}`,
    headings: ["무슨 일이 있었나", "출처의 핵심 내용", "왜 주목받나", "다음에 볼 점"],
    why: (frame) =>
      `이 소식에서 볼 점은 ${localizedProduct("ko", frame)}가 구체적인 사용 장면, 사용자층, 측정 가능한 사용량에 가까워지고 있다는 것입니다.`,
    caution: "다음은 고객 도입, 안정성, 매출이 보도된 사용량을 따라가는지 확인해야 합니다. 기사 하나만으로 카테고리 성숙도를 단정할 수는 없습니다.",
    reader: "지역 특화 음성 AI가 낮은 지연 시간, 방언, 코드 스위칭을 처리하면서 유료 사용을 유지할 수 있는지가 관건입니다."
  },
  id: {
    category: "Kabar Pasar",
    title: (frame, source) => localizedNewsTitle("id", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahwa ${frame.focus.id}. ${summary}`,
    headings: ["Apa yang terjadi", "Detail penting dari sumber", "Kenapa ini menarik", "Yang perlu dipantau"],
    why: (frame) =>
      `Sinyal pentingnya: ${localizedProduct("id", frame)} makin dekat dengan use case nyata, kelompok pengguna yang jelas, dan volume yang bisa diamati.`,
    caution: "Berikutnya perlu dilihat apakah adopsi pelanggan, reliabilitas, dan pendapatan ikut tumbuh bersama volume penggunaan. Satu laporan menunjukkan momentum, bukan bukti kematangan kategori.",
    reader: "Pantau apakah voice AI regional bisa menjaga latensi rendah, menangani dialek dan campuran bahasa, lalu mengubah uji coba menjadi pelanggan berbayar jangka panjang."
  },
  vi: {
    category: "Tin nhanh thị trường",
    title: (frame, source) => localizedNewsTitle("vi", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} đưa tin vào ${date} rằng ${frame.focus.vi}. ${summary}`,
    headings: ["Chuyện gì đã xảy ra", "Chi tiết chính từ nguồn", "Vì sao đáng chú ý", "Điều cần theo dõi"],
    why: (frame) =>
      `Điểm đáng chú ý là ${localizedProduct("vi", frame)} đang tiến gần hơn tới một use case cụ thể, một nhóm người dùng rõ ràng và lượng sử dụng có thể quan sát.`,
    caution: "Bước tiếp theo là xem việc áp dụng của khách hàng, độ ổn định và doanh thu có đi cùng lượng sử dụng được công bố hay không. Một bài viết cho thấy đà chuyển động, chưa đủ để kết luận cả thị trường đã chín.",
    reader: "Theo dõi liệu voice AI bản địa hóa có giữ được độ trễ thấp, xử lý phương ngữ và chuyển đổi ngôn ngữ, rồi biến thử nghiệm thành khách hàng trả phí lâu dài hay không."
  },
  th: {
    category: "ข่าวตลาด",
    title: (frame, source) => localizedNewsTitle("th", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} รายงานเมื่อ ${date} ว่า ${frame.focus.th} ${summary}`,
    headings: ["เกิดอะไรขึ้น", "รายละเอียดสำคัญจากแหล่งข่าว", "ทำไมเรื่องนี้น่าจับตา", "สิ่งที่ต้องดูต่อ"],
    why: (frame) =>
      `ประเด็นสำคัญคือ ${localizedProduct("th", frame)} กำลังเข้าใกล้ use case จริง กลุ่มผู้ใช้ที่ชัดเจน และปริมาณการใช้งานที่สังเกตได้`,
    caution: "ต้องดูต่อว่าการใช้งานของลูกค้า ความเสถียร และรายได้จะเติบโตตามตัวเลขที่รายงานหรือไม่ ข่าวหนึ่งชิ้นบอก momentum ได้ แต่ยังไม่พอจะสรุปว่าตลาดสุกงอมแล้ว",
    reader: "ประเด็นต่อไปคือ voice AI เฉพาะภูมิภาคจะรักษา latency ต่ำ จัดการสำเนียงและการสลับภาษา และเปลี่ยนการทดลองเป็นลูกค้าจ่ายเงินระยะยาวได้หรือไม่"
  },
  ms: {
    category: "Berita Pasaran",
    title: (frame, source) => localizedNewsTitle("ms", frame, source),
    standfirst: (frame, source, date, summary) =>
      `${shortPublisher(source.publisher)} melaporkan pada ${date} bahawa ${frame.focus.ms}. ${summary}`,
    headings: ["Apa yang berlaku", "Butiran penting daripada sumber", "Mengapa ia wajar diperhatikan", "Perkara untuk dipantau"],
    why: (frame) =>
      `Isyarat pentingnya: ${localizedProduct("ms", frame)} semakin dekat dengan use case sebenar, kumpulan pengguna yang jelas, dan volume penggunaan yang boleh diperhatikan.`,
    caution: "Selepas ini perlu dilihat sama ada adopsi pelanggan, kebolehpercayaan dan pendapatan bergerak seiring dengan volume penggunaan. Satu laporan menunjukkan momentum, bukan bukti kematangan kategori.",
    reader: "Pantau sama ada voice AI serantau boleh mengekalkan latensi rendah, menangani dialek dan campuran bahasa, lalu menukar percubaan kepada pelanggan berbayar jangka panjang."
  },
  fil: {
    category: "Market Brief",
    title: (frame, source) => localizedNewsTitle("fil", frame, source),
    standfirst: (frame, source, date, summary) =>
      `Iniulat ng ${shortPublisher(source.publisher)} noong ${date} na ${frame.focus.fil}. ${summary}`,
    headings: ["Ano ang nangyari", "Mahahalagang detalye mula sa source", "Bakit ito kapansin-pansin", "Ano ang babantayan"],
    why: (frame) =>
      `Ang mahalagang signal: mas lumalapit ang ${localizedProduct("fil", frame)} sa totoong use case, malinaw na user group, at usage volume na puwedeng obserbahan.`,
    caution: "Sunod na titingnan kung sasabay ang customer adoption, reliability, at revenue sa reported usage. Isang report lang ang nagpapakita ng momentum, hindi pa patunay na mature na ang buong category.",
    reader: "Bantayan kung kaya ng regional voice AI na panatilihing mababa ang latency, humawak ng dialects at code-switching, at gawing long-term paid customers ang trials."
  }
};

const VOICE_AI_BODY = {
  "zh-Hant": {
    excerpt:
      "AethexAI 由 Goldman Sachs 與 Meta 背景的創辦人創立，鎖定非洲與中東的客服語音 AI 市場；它剛完成 300 萬美元 pre-seed 輪，並表示自建系統每天已處理超過 17,000 通電話。",
    geoSummary:
      "TechCrunch 報導的 AethexAI 故事，焦點放在它選擇避開歐美標準語音環境，直接為非洲與中東的方言、混合語言、電信基礎設施與價格條件做模型和部署。",
    keyTakeaways: [
      "AethexAI 完成 300 萬美元 pre-seed 輪，由 4DX Ventures 領投，投資人包含 Enza Capital、Dorm Room Fund、Mojo Ventures 與 Stanford GSB 26 Fund。",
      "公司自建小模型與協調層，目標是降低延遲、處理當地英語、法語與阿拉伯語口音，而非單純套用既有語音 AI orchestration 工具。",
      "AethexAI 表示，自己的 Kora 系列模型約 3 億到 17 億參數，並已在非洲與中東市場每天處理超過 17,000 通電話。",
      "目前常見場景包含債務催收、客戶啟用與 KYC；真正要追的是後續企業採用、通話品質與付費留存。"
    ],
    body:
      "## Goldman、Meta 背景創辦人轉向區域語音 AI\n\nTechCrunch 報導，AethexAI 由 Mariama Diallo 與 Ayooluwa Odemuyiwa 創立。Diallo 曾任職 Goldman Sachs，後來加入 YC 支持的新創 ModelML；Odemuyiwa 畢業於 Caltech，曾在 Meta 工作，並進入 Stanford Business School。兩人把題目放在非洲與中東市場的語音 AI，暫時不以歐美主流企業客服市場為第一目標。\n\nAethexAI 已完成 300 萬美元 pre-seed 輪，由 4DX Ventures 領投，Enza Capital、Dorm Room Fund、Mojo Ventures、Stanford GSB 26 Fund 參與，個人投資人則包括 Stanford 教職員、電信主管與來自 Anthropic 的 AI 研究人員。\n\n## 為什麼它自建語音 AI 工具\n\nTechCrunch 指出，客服與服務是語音 AI 最熱的領域之一，但在非洲與中東，延遲、口音、語言混用與既有電話系統會讓現成方案變得不夠順。AethexAI 因此自建小模型與 orchestration layer，用來處理當地英語、法語與阿拉伯語的實際用法。\n\n公司稱 Kora 系列模型規模約在 3 億到 17 億參數之間。它把模型做小，主要是為了壓低延遲，同時保留足夠準確度。\n\n## 資料與使用量已經開始出現\n\n為了訓練模型，AethexAI 使用來自 call center partner 的匿名錄音，也把硬碟寄到非洲多地的廣播電台蒐集音訊資料；另外，公司建立由大學生組成的貢獻者網路，協助標註資料與錄製當地姓名發音。\n\nAethexAI 表示，目前自家系統每天處理超過 17,000 通電話。常見使用場景包括債務催收、客戶啟用與 KYC 身分驗證。公司也推出企業試用平台、API 與 SDK，讓企業與開發者測試模型。\n\n## 這則新聞接下來看什麼\n\n這則消息值得看的地方，是語音 AI 市場未必只由最大模型和最大平台決定。若企業需求來自特定地區的語音、電話網路、價格與工作流程，區域化模型與在地部署能力可能會變成差異。\n\n但這仍是早期新創故事。接下來要看的是：AethexAI 能否把 17,000 通電話的日常使用量轉成穩定企業收入，並在更多產業維持低延遲、可理解度與服務品質。"
  },
  en: {
    excerpt:
      "AethexAI, founded by former Goldman Sachs and Meta talent, is building voice AI for Africa and the Middle East. It has raised a $3 million pre-seed round and says its own stack now handles more than 17,000 calls a day.",
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
      "AethexAI は Goldman Sachs と Meta 出身の創業者が立ち上げた音声 AI スタートアップです。アフリカと中東市場を対象に、300 万ドルの pre-seed 資金を調達し、自社スタックで 1 日 17,000 件超の通話を処理しているとしています。",
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
      "AethexAI는 Goldman Sachs와 Meta 출신 창업자가 만든 음성 AI 스타트업입니다. 아프리카와 중동 시장을 겨냥해 300만 달러 pre-seed 투자를 유치했고, 자체 스택으로 하루 17,000건이 넘는 통화를 처리하고 있다고 밝혔습니다.",
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
      "AethexAI didirikan oleh talenta berlatar Goldman Sachs dan Meta untuk membangun voice AI bagi Afrika dan Timur Tengah. Startup ini mengantongi pre-seed US$3 juta dan menyebut stack internalnya sudah menangani lebih dari 17.000 panggilan per hari.",
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
      "AethexAI do hai nhà sáng lập có nền tảng Goldman Sachs và Meta lập ra, tập trung vào voice AI cho châu Phi và Trung Đông. Startup này gọi được 3 triệu USD pre-seed và cho biết stack tự xây đã xử lý hơn 17.000 cuộc gọi mỗi ngày.",
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
      "AethexAI ก่อตั้งโดยผู้มีพื้นหลังจาก Goldman Sachs และ Meta เพื่อทำ voice AI สำหรับแอฟริกาและตะวันออกกลาง บริษัทระดมทุน pre-seed ได้ 3 ล้านดอลลาร์ และระบุว่า stack ที่สร้างเองรองรับสายมากกว่า 17,000 ครั้งต่อวันแล้ว",
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
      "AethexAI diasaskan oleh pengasas berlatar Goldman Sachs dan Meta untuk membina voice AI bagi Afrika dan Timur Tengah. Startup ini mengumpul pre-seed AS$3 juta dan berkata stack sendiri kini mengendalikan lebih 17,000 panggilan sehari.",
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
      "Ang AethexAI ay itinayo ng founders na may background sa Goldman Sachs at Meta para gumawa ng voice AI para sa Africa at Middle East. Nakalikom ito ng $3 milyon na pre-seed at sinasabing ang sarili nitong stack ay humahawak na ng mahigit 17,000 tawag bawat araw.",
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

function buildBody(language, frame, source) {
  if (frame.key === "voice-ai-markets") return localizeVoiceBody(language).body;
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
  if (frame.key === "voice-ai-markets") return localizeVoiceBody(language).geoSummary;
  const date = formatDate(source.publishedAt, language);
  const summary = truncate(localizedSourceSummary(language, source, frame), 150);
  const publisher = shortPublisher(source.publisher);
  const focus = frame.focus[language] || frame.focus.en;
  const byLanguage = {
    "zh-Hant": `${publisher} 於 ${date} 報導，${focus}；目前可確認的重點是：${summary}`,
    en: `${publisher} reported on ${date} that ${focus}. The confirmed source point: ${summary}`,
    ja: `${publisher} は ${date}、${focus} と報じました。確認できる要点は ${summary}`,
    ko: `${publisher}는 ${date} ${focus}고 보도했습니다. 확인 가능한 핵심은 ${summary}`,
    id: `${publisher} melaporkan pada ${date} bahwa ${focus}. Poin yang terkonfirmasi dari sumber: ${summary}`,
    vi: `${publisher} đưa tin vào ${date} rằng ${focus}. Điểm có thể xác nhận từ nguồn: ${summary}`,
    th: `${publisher} รายงานเมื่อ ${date} ว่า ${focus} ประเด็นที่ยืนยันได้จากแหล่งข่าวคือ ${summary}`,
    ms: `${publisher} melaporkan pada ${date} bahawa ${focus}. Poin yang disahkan daripada sumber: ${summary}`,
    fil: `Iniulat ng ${publisher} noong ${date} na ${focus}. Ang kumpirmadong punto mula sa source: ${summary}`
  };
  return byLanguage[language] || byLanguage.en;
}

function keyTakeaways(language, frame, source) {
  if (frame.key === "voice-ai-markets") return localizeVoiceBody(language).keyTakeaways;
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
  const excerpt = normalizeNewsText(
    inferredFrame.key === "voice-ai-markets"
      ? localizeVoiceBody(language).excerpt
      : labels.standfirst(inferredFrame, source, date, summary)
  );
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
    sourceLinks: cleanPublicSourceLinks(pack.sourceLinks || post.sourceLinks || []),
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

  return /這則消息可以拿來|企業檢查|卡在哪個流程|原因是企業決策問題|Source:\s|Event:\s|Evidence:\s|Decision cue|source brief|source index|primary source; the article should stay anchored|Next action: choose one workflow|ALTOS LAB reader note|讀者怎麼看|不是同類工具會不會更多，而是|不只是海外消息，而是/i.test(text);
}
