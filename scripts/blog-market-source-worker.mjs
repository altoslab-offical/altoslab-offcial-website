#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const DEFAULT_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function publicText(value = "") {
  return stripHtml(value).replace(/\bAI-generated\b/gi, "generated");
}

function repairPublicCopy(value = "") {
  return String(value || "")
    .replace(/\bAI-generated\b/gi, "generated")
    .replace(/這不是單純產品消息，而是/g, "這則消息可以拿來")
    .replace(/這則消息最值得注意的不是標題本身，而是/g, "這則消息的實務重點落在")
    .replace(/最值得注意的不是標題本身，而是/g, "實務重點落在")
    .replace(/不只在「能做什麼」，也在/g, "關鍵在")
    .replace(/不只是海外消息，而是一張/g, "可以整理成一張")
    .replace(/不是同類工具會不會更多，而是/g, "")
    .replace(/不是同類工具會不會更多/g, "同類工具仍會增加")
    .replace(/不只是/g, "除了")
    .replace(/不再只是/g, "已經超出")
    .replace(/不僅/g, "除了")
    .replace(/真正值得/g, "更值得")
    .replace(/真正的/g, "可驗證的")
    .replace(/共同指向/g, "都讓人看到")
    .replace(/同一件事/g, "相近的訊號")
    .replace(/核心是/g, "關鍵在於")
    .replace(/災難性/g, "高風險")
    .replace(/夢魘/g, "失控成本")
    .replace(/定時炸彈/g, "高風險流程")
    .replace(/徹底/g, "清楚")
    .replace(/顛覆/g, "改變")
    .replace(/革命/g, "轉變")
    .replace(/護城河/g, "長期優勢")
    .replace(/競爭力的延伸/g, "維運能力的一部分")
    .replace(/正式進入/g, "開始走進")
    .replace(/唯一答案/g, "可行做法之一")
    .replace(/Gemini 開啟多模態推理升級，原因資料治理會先成為瓶頸/g, "Gemini 多模態推理升級後，資料治理先變成瓶頸")
    .replace(/NVIDIA 把自駕 AI 開源到 32B：企業要看的重點從炫技，是驗證流程/g, "NVIDIA 開源 32B 自駕模型：企業先看驗證流程")
    .replace(/NVIDIA 把自駕 AI 開源到 32B：企業要看的不是炫技，是驗證流程/g, "NVIDIA 開源 32B 自駕模型：企業先看驗證流程")
    .replace(/資料工程代理化先行，AI 落地才不是每月新痛點/g, "資料工程代理化後，AI 落地少一個月月重來的痛點")
    .replace(/AI 不是加一個 Bot，先把作業制度打通才是真正加速/g, "AI 加速前，先把作業制度打通")
    .replace(/KubeCon 除了技術會議：GPU 排程開源化對 AI 團隊的實質助益/g, "KubeCon GPU 排程開源化：AI 團隊先看資源調度")
    .replace(/Maia 200 啟動後，AI 推理成本已經超出雲端帳單問題/g, "Maia 200 啟動後，AI 推理成本要從流程裡管")
    .replace(/主權雲 \+ Trust 框架：AI 系統該在什麼地方先設停機鈕/g, "主權雲與 Trust 框架：AI 系統先把停機鈕放清楚")
    .replace(/OpenAI tax-agent 案例案例：AI Agent 試點先看回滾能力/g, "OpenAI tax-agent 案例：AI Agent 試點先看回滾能力")
    .replace(/微軟 Build 2026 的案例：企業 Agent 要先變成可控系統/g, "微軟 Build 2026 留下的部署題：企業 Agent 要先變成可控系統")
    .replace(/安全收編與算力合資同時開啟：企業 AI 不只買模型，還要買治理能力/g, "Google/Wiz 與算力合資同週出現：企業 AI 也在買治理能力")
    .replace(/## 事件核心/g, "## 這則消息卡在哪個流程")
    .replace(/## 為什麼是企業決策問題/g, "## 企業先看三個落點")
    .replace(/## 本週可落地的 3 個檢查/g, "## 兩週內先跑一個小測試")
    .replace(/## 接下來看什麼/g, "## 下一步看部署是否變穩")
    .replace(/## What Happened/g, "## Where this update meets the workflow")
    .replace(/## Why It Becomes an Operating Decision/g, "## Three operating points to inspect")
    .replace(/## Three Checks for This Week/g, "## Run one small test in two weeks")
    .replace(/## What to Watch Next/g, "## Watch whether deployment gets steadier");
}

function slugify(value) {
  const ascii = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return ascii || `market-${Date.now().toString(36)}`;
}

function cleanTitle(value) {
  return stripHtml(value)
    .replace(/\s*\|\s*(Amazon Web Services|AWS|OpenAI|Google AI Blog)$/i, "")
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

function inferFrame(pack) {
  const text = `${pack.topic || ""} ${pack.sourceLinks?.[0]?.summary || ""}`.toLowerCase();
  if (/gpt-rosalind|rosalind/.test(text)) {
    return {
      key: "biosecurity-workflow",
      entity: "OpenAI",
      product: "GPT-Rosalind",
      zh: "把生物防禦研究推向可審核的 AI 工作流",
      en: "turning biosecurity research into a more reviewable AI workflow",
      ja: "バイオセキュリティ研究を検証しやすい AI ワークフローへ進める",
      ko: "바이오 보안 연구를 검토 가능한 AI 워크플로로 옮기는 신호",
      id: "mendorong riset biosecurity ke workflow AI yang lebih mudah ditinjau",
      vi: "đưa nghiên cứu an toàn sinh học vào workflow AI dễ kiểm tra hơn",
      th: "พางานวิจัยด้าน biosecurity เข้าสู่เวิร์กโฟลว์ AI ที่ตรวจทานได้มากขึ้น",
      ms: "membawa penyelidikan biosecurity ke dalam workflow AI yang lebih mudah disemak",
      fil: "inililipat ang biosecurity research sa mas reviewable na AI workflow"
    };
  }
  if (/cisco|enterprise engineering/.test(text)) {
    return {
      key: "enterprise-engineering",
      entity: "Cisco / OpenAI",
      product: "enterprise engineering agents",
      zh: "把 Codex 放進企業工程組織的交付節奏",
      en: "placing Codex inside enterprise engineering delivery rhythms",
      ja: "Codex を企業エンジニアリングの開発リズムへ組み込む",
      ko: "Codex를 기업 엔지니어링 납품 리듬에 넣는 사례",
      id: "menempatkan Codex ke ritme delivery engineering perusahaan",
      vi: "đưa Codex vào nhịp giao hàng của đội kỹ thuật doanh nghiệp",
      th: "นำ Codex เข้าไปอยู่ในจังหวะ delivery ของทีมวิศวกรรมองค์กร",
      ms: "meletakkan Codex dalam rentak delivery kejuruteraan perusahaan",
      fil: "inilalagay ang Codex sa delivery rhythm ng enterprise engineering"
    };
  }
  if (/codex.*(productivity|knowledge)|knowledge work|braintrust|endava|codex/.test(text)) {
    return {
      key: "codex-workflow",
      entity: "OpenAI Codex",
      product: "Codex workflows",
      zh: "把程式代理從工程任務推進日常知識工作",
      en: "pushing coding agents from engineering tasks into everyday knowledge work",
      ja: "コーディング Agent を日常的な知識労働へ広げる",
      ko: "코딩 에이전트를 엔지니어링 밖의 지식 업무로 확장하는 움직임",
      id: "membawa coding agent dari tugas engineering ke kerja pengetahuan sehari-hari",
      vi: "đưa coding agent từ công việc kỹ thuật sang tri thức hằng ngày",
      th: "ขยาย coding agent จากงานวิศวกรรมไปสู่งานความรู้ประจำวัน",
      ms: "membawa coding agent daripada tugasan kejuruteraan ke kerja pengetahuan harian",
      fil: "dinadala ang coding agents mula engineering papunta sa araw-araw na knowledge work"
    };
  }
  if (/political advocacy|ai policy|public policy/.test(text)) {
    return {
      key: "ai-policy",
      entity: "OpenAI",
      product: "AI policy",
      zh: "把 AI 政策與政治倡議推到更透明的治理檯面",
      en: "putting AI policy and political advocacy under a more transparent governance lens",
      ja: "AI 政策と政治的働きかけをより透明なガバナンス課題にする",
      ko: "AI 정책과 정치적 옹호를 더 투명한 거버넌스 문제로 올려놓는 흐름",
      id: "membawa kebijakan dan advokasi politik AI ke tata kelola yang lebih transparan",
      vi: "đưa chính sách và vận động AI vào lớp quản trị minh bạch hơn",
      th: "ทำให้นโยบายและการผลักดันทางการเมืองด้าน AI ถูกมองผ่าน governance ที่โปร่งใสมากขึ้น",
      ms: "meletakkan dasar dan advokasi politik AI dalam tadbir urus yang lebih telus",
      fil: "inilalagay sa mas malinaw na governance lens ang AI policy at political advocacy"
    };
  }
  if (/stargate|michigan|infrastructure for the intelligence age|data center/.test(text)) {
    return {
      key: "ai-infrastructure",
      entity: "OpenAI",
      product: "AI infrastructure",
      zh: "把資料中心投資變成 AI 供應鏈與地區政策題",
      en: "turning data-center investment into an AI supply-chain and regional policy question",
      ja: "データセンター投資を AI サプライチェーンと地域政策の論点にする",
      ko: "데이터센터 투자를 AI 공급망과 지역 정책 문제로 바꾸는 흐름",
      id: "membaca investasi data center sebagai isu rantai pasok dan kebijakan AI",
      vi: "biến đầu tư data center thành bài toán chuỗi cung ứng và chính sách AI",
      th: "เปลี่ยนการลงทุน data center ให้เป็นโจทย์ supply chain และนโยบายพื้นที่ของ AI",
      ms: "menjadikan pelaburan pusat data sebagai isu rantaian bekalan dan dasar AI",
      fil: "ginagawang usapin ng AI supply chain at regional policy ang data-center investment"
    };
  }
  if (/boston children|diagnos/.test(text)) {
    return {
      key: "healthcare-ai",
      entity: "OpenAI",
      product: "clinical AI support",
      zh: "讓臨床團隊用 AI 追查更罕見的診斷線索",
      en: "helping clinical teams use AI to trace harder diagnostic signals",
      ja: "臨床チームが AI で難しい診断の手がかりを追いやすくする",
      ko: "임상팀이 AI로 더 어려운 진단 단서를 추적하는 사례",
      id: "membantu tim klinis memakai AI untuk menelusuri sinyal diagnosis yang sulit",
      vi: "giúp đội ngũ lâm sàng dùng AI để lần theo tín hiệu chẩn đoán khó",
      th: "ช่วยทีมแพทย์ใช้ AI ไล่หาสัญญาณการวินิจฉัยที่ยากขึ้น",
      ms: "membantu pasukan klinikal menggunakan AI menjejaki petunjuk diagnosis yang lebih sukar",
      fil: "tinutulungan ang clinical teams na gamitin ang AI sa mas mahirap na diagnostic clues"
    };
  }
  if (/agent logic|scalable enterprise ai adoption/.test(text)) {
    return {
      key: "agent-logic",
      entity: "Hugging Face",
      product: "agent logic",
      zh: "提醒企業 AI 規模化不能只靠更大的模型",
      en: "reminding teams that enterprise AI scale needs more than larger models",
      ja: "企業 AI の拡張には大きなモデルだけでは足りないと示す",
      ko: "기업 AI 확장에는 더 큰 모델만으로 부족하다는 신호",
      id: "mengingatkan bahwa skala AI enterprise butuh lebih dari model besar",
      vi: "nhắc rằng mở rộng AI doanh nghiệp cần hơn cả mô hình lớn",
      th: "เตือนว่า AI enterprise scale ต้องมีมากกว่าโมเดลที่ใหญ่ขึ้น",
      ms: "mengingatkan bahawa skala AI perusahaan memerlukan lebih daripada model besar",
      fil: "paalala na higit pa sa mas malaking modelo ang kailangan para sa enterprise AI scale"
    };
  }
  if (/cosmos|physical ai/.test(text)) {
    return {
      key: "physical-ai",
      entity: "NVIDIA / Hugging Face",
      product: "physical AI",
      zh: "把開放模型推向機器人與實體世界推理",
      en: "moving open models toward robotics and physical-world reasoning",
      ja: "オープンモデルをロボティクスと物理世界推論へ広げる",
      ko: "오픈 모델을 로보틱스와 물리 세계 추론으로 확장하는 흐름",
      id: "mendorong model terbuka ke robotika dan penalaran dunia fisik",
      vi: "đưa mô hình mở tới robot và suy luận trong thế giới vật lý",
      th: "พาโมเดลเปิดไปสู่ robotics และการให้เหตุผลในโลกจริง",
      ms: "membawa model terbuka ke robotik dan penaakulan dunia fizikal",
      fil: "dinadala ang open models sa robotics at physical-world reasoning"
    };
  }
  if (/grok imagine|qwen|minimax|ai gateway/.test(text)) {
    return {
      key: "ai-gateway",
      entity: "Vercel AI Gateway",
      product: "AI Gateway",
      zh: "讓模型上架速度變成開發團隊的供應鏈問題",
      en: "turning model availability into a developer supply-chain question",
      ja: "モデル提供速度を開発チームの供給網課題にする",
      ko: "모델 가용성을 개발팀의 공급망 문제로 바꾸는 업데이트",
      id: "membuat ketersediaan model menjadi isu rantai pasok developer",
      vi: "biến độ sẵn có của mô hình thành bài toán chuỗi cung ứng cho developer",
      th: "ทำให้ความพร้อมของโมเดลกลายเป็นโจทย์ supply chain ของทีมพัฒนา",
      ms: "menjadikan ketersediaan model sebagai isu rantaian bekalan developer",
      fil: "ginagawang supply-chain issue ng developers ang model availability"
    };
  }
  if (/mufg|ai-native|ai native/.test(text)) {
    return {
      key: "financial-ai",
      entity: "MUFG / OpenAI",
      product: "enterprise AI adoption",
      zh: "讓大型金融機構把 AI 從工具採購推進日常營運",
      en: "moving AI inside daily operations at a major financial institution",
      ja: "大手金融機関が AI を日常業務へ組み込む動き",
      ko: "대형 금융사가 AI를 일상 운영에 넣는 움직임",
      id: "mendorong AI dari pengadaan alat menuju operasi harian di institusi keuangan besar",
      vi: "đưa AI từ mua công cụ vào vận hành hằng ngày tại tổ chức tài chính lớn",
      th: "พา AI จากการซื้อเครื่องมือเข้าสู่การปฏิบัติงานประจำวันของสถาบันการเงินขนาดใหญ่",
      ms: "membawa AI daripada pembelian alat ke operasi harian institusi kewangan besar",
      fil: "ginagalaw ang AI mula tool procurement papunta sa daily operations ng malaking financial institution"
    };
  }
  if (/cisco|enterprise engineering/.test(text)) {
    return {
      key: "enterprise-engineering",
      entity: "Cisco / OpenAI",
      product: "enterprise engineering agents",
      zh: "把 Codex 放進企業工程組織的交付節奏",
      en: "placing Codex inside enterprise engineering delivery rhythms",
      ja: "Codex を企業エンジニアリングの開発リズムへ組み込む",
      ko: "Codex를 기업 엔지니어링 납품 리듬에 넣는 사례",
      id: "menempatkan Codex ke ritme delivery engineering perusahaan",
      vi: "đưa Codex vào nhịp giao hàng của đội kỹ thuật doanh nghiệp",
      th: "นำ Codex เข้าไปอยู่ในจังหวะ delivery ของทีมวิศวกรรมองค์กร",
      ms: "meletakkan Codex dalam rentak delivery kejuruteraan perusahaan",
      fil: "inilalagay ang Codex sa delivery rhythm ng enterprise engineering"
    };
  }
  if (/lovable|google cloud/.test(text)) {
    return {
      key: "ai-app-platform",
      entity: "Lovable / Google Cloud",
      product: "AI app-building platforms",
      zh: "讓 AI 應用建置平台的雲端用量成為市場訊號",
      en: "making cloud demand from AI app builders a market signal",
      ja: "AI アプリ構築基盤のクラウド需要を市場シグナルとして見る",
      ko: "AI 앱 제작 플랫폼의 클라우드 수요를 시장 신호로 보는 흐름",
      id: "membaca lonjakan cloud dari platform pembuat aplikasi AI sebagai sinyal pasar",
      vi: "xem nhu cầu cloud từ nền tảng tạo ứng dụng AI như một tín hiệu thị trường",
      th: "อ่านความต้องการคลาวด์จากแพลตฟอร์มสร้างแอป AI เป็นสัญญาณตลาด",
      ms: "membaca permintaan cloud daripada platform pembinaan aplikasi AI sebagai isyarat pasaran",
      fil: "ginagawang market signal ang cloud demand mula sa AI app-building platforms"
    };
  }
  if (/alphabet|85b|google.*ai business/.test(text)) {
    return {
      key: "ai-capital",
      entity: "Alphabet / Google",
      product: "AI capital spending",
      zh: "把 AI 資本支出推到雲端與模型競賽的前線",
      en: "putting AI capital spending at the center of cloud and model competition",
      ja: "AI 投資をクラウドとモデル競争の中心に押し出す",
      ko: "AI 자본 지출을 클라우드와 모델 경쟁의 중심으로 끌어올리는 흐름",
      id: "menempatkan belanja modal AI di pusat persaingan cloud dan model",
      vi: "đưa chi tiêu vốn AI vào trung tâm cạnh tranh cloud và mô hình",
      th: "ดันเงินลงทุน AI ให้เป็นศูนย์กลางการแข่งขัน cloud และโมเดล",
      ms: "meletakkan perbelanjaan modal AI di tengah persaingan cloud dan model",
      fil: "inilalagay sa gitna ng cloud at model competition ang AI capital spending"
    };
  }
  if (/amazon.*ai product images|ai product images|shopping/.test(text)) {
    return {
      key: "ai-commerce-search",
      entity: "Amazon",
      product: "AI shopping search",
      zh: "把搜尋結果中的商品圖像也推進生成式 AI 介面",
      en: "bringing product imagery in search results into generative AI interfaces",
      ja: "検索結果の商品画像を生成 AI インターフェースへ広げる",
      ko: "검색 결과의 제품 이미지를 생성형 AI 인터페이스로 확장하는 움직임",
      id: "membawa gambar produk di hasil pencarian ke antarmuka AI generatif",
      vi: "đưa hình ảnh sản phẩm trong kết quả tìm kiếm vào giao diện AI tạo sinh",
      th: "พาภาพสินค้าในผลการค้นหาเข้าสู่อินเทอร์เฟซ generative AI",
      ms: "membawa imej produk dalam hasil carian ke antara muka AI generatif",
      fil: "dinadala ang product images sa search results papunta sa generative AI interfaces"
    };
  }
  if (/voice ai|markets everyone else overlooked|goldman|meta/.test(text)) {
    return {
      key: "voice-ai-markets",
      entity: "TechCrunch / Voice AI",
      product: "voice AI startups",
      zh: "讓語音 AI 從主流市場走向被忽略的使用場景",
      en: "moving voice AI into markets most platforms still overlook",
      ja: "音声 AI を大手が見落とす市場へ広げる",
      ko: "음성 AI를 플랫폼이 놓치던 시장으로 확장하는 움직임",
      id: "membawa voice AI ke pasar yang sering terlewat platform besar",
      vi: "đưa voice AI tới những thị trường thường bị nền tảng lớn bỏ qua",
      th: "พา voice AI ไปยังตลาดที่แพลตฟอร์มใหญ่ยังมองข้าม",
      ms: "membawa voice AI ke pasaran yang sering terlepas pandang oleh platform besar",
      fil: "dinadala ang voice AI sa markets na madalas hindi pinapansin ng malalaking platform"
    };
  }
  if (/wasmer|node\.js runtime|edge runtime/.test(text)) {
    return {
      key: "edge-runtime",
      entity: "Wasmer",
      product: "Codex + GPT-5.5",
      zh: "把 Node.js 邊緣 runtime 的開發週期壓到週級",
      en: "compressing edge Node.js runtime work into week-scale delivery",
      ja: "エッジ向け Node.js ランタイム開発を週単位へ縮める",
      ko: "엣지 Node.js 런타임 개발을 주 단위 납기로 줄이는 신호",
      id: "memangkas pembangunan runtime Node.js edge ke ritme mingguan",
      vi: "rút chu kỳ xây runtime Node.js cho edge xuống nhịp theo tuần",
      th: "ย่นงานสร้าง Node.js runtime สำหรับ edge ให้เหลือรอบระดับสัปดาห์",
      ms: "memendekkan pembinaan runtime Node.js edge kepada kitaran mingguan",
      fil: "pinaiikli ang paggawa ng Node.js runtime sa edge tungo sa lingguhang delivery"
    };
  }
  if (/frontier|governance|safety blueprint|public policy/.test(text)) {
    return {
      key: "ai-governance",
      entity: pack.sourceLinks?.[0]?.publisher?.includes("OpenAI") ? "OpenAI" : "AI industry",
      product: "frontier AI governance",
      zh: "把前沿模型安全納入企業治理與採購條件",
      en: "turning frontier AI safety into a governance and procurement question",
      ja: "フロンティア AI の安全性を調達とガバナンスの論点に変える",
      ko: "프런티어 AI 안전을 거버넌스와 구매 조건으로 바꾸는 흐름",
      id: "membawa keselamatan frontier AI ke tata kelola dan pengadaan",
      vi: "đưa an toàn AI tuyến đầu vào quản trị và mua sắm",
      th: "ทำให้ความปลอดภัยของ frontier AI กลายเป็นเงื่อนไขด้าน governance และการจัดซื้อ",
      ms: "menjadikan keselamatan frontier AI sebahagian daripada tadbir urus dan perolehan",
      fil: "ginagawang bahagi ng governance at procurement ang kaligtasan ng frontier AI"
    };
  }
  if (/travelers|claims|claim assistant/.test(text)) {
    return {
      key: "claims-agent",
      entity: "Travelers + OpenAI",
      product: "AI Claim Assistant",
      zh: "把理賠協助推向全國部署，企業要先看尖峰支援與責任邊界",
      en: "moving claims support into national AI-assisted operations",
      ja: "保険請求支援を全国規模の AI 運用へ広げる",
      ko: "보험 청구 지원을 전국 단위 AI 운영으로 확장하는 사례",
      id: "mendorong bantuan klaim berbasis AI ke operasi nasional",
      vi: "đưa hỗ trợ bồi thường bằng AI vào vận hành toàn quốc",
      th: "ขยายผู้ช่วยเคลมด้วย AI สู่การใช้งานระดับประเทศ",
      ms: "membawa bantuan tuntutan berasaskan AI ke operasi seluruh negara",
      fil: "pinalalawak ang AI claims support sa pambansang operasyon"
    };
  }
  if (/youth|young people|children|teen/.test(text)) {
    return {
      key: "youth-safety",
      entity: "OpenAI",
      product: "youth AI safety",
      zh: "把青少年安全變成 AI 產品的全球治理題",
      en: "making youth safety a global AI product governance issue",
      ja: "若年層の安全を AI プロダクト運用の中核課題にする",
      ko: "청소년 안전을 AI 제품 거버넌스의 핵심 이슈로 만드는 신호",
      id: "menjadikan keselamatan anak muda bagian dari tata kelola produk AI",
      vi: "đưa an toàn cho người trẻ vào quản trị sản phẩm AI",
      th: "ทำให้ความปลอดภัยของเยาวชนเป็นโจทย์ governance ของผลิตภัณฑ์ AI",
      ms: "menjadikan keselamatan belia sebahagian daripada tadbir urus produk AI",
      fil: "ginagawang pangunahing usapin sa AI governance ang youth safety"
    };
  }
  if (/google i\/o|gemini/.test(text)) {
    return {
      key: "gemini-production",
      entity: "Google",
      product: "Gemini",
      zh: "把大型活動製作拆成可重複使用的 AI 協作流程",
      en: "turning event production into reusable AI-assisted workflows",
      ja: "イベント制作を再利用できる AI 協働フローへ変える",
      ko: "행사 제작을 재사용 가능한 AI 협업 흐름으로 바꾸는 사례",
      id: "mengubah produksi acara menjadi alur kerja AI yang bisa diulang",
      vi: "biến sản xuất sự kiện thành quy trình cộng tác AI có thể lặp lại",
      th: "เปลี่ยนงานผลิตอีเวนต์ให้เป็นเวิร์กโฟลว์ AI ที่ทำซ้ำได้",
      ms: "menukar produksi acara kepada aliran kerja AI yang boleh diulang",
      fil: "ginagawang reusable AI workflow ang event production"
    };
  }
  if (/bedrock|ops alert|operations|monitoring|alarm/.test(text)) {
    return {
      key: "ai-ops",
      entity: "AWS",
      product: "Amazon Bedrock",
      zh: "把 AI 維運從被動告警推向主動監控與分級處理",
      en: "moving AI operations from passive alerts to active triage",
      ja: "AI 運用を受け身のアラートから能動的な監視へ移す",
      ko: "AI 운영을 수동 알림에서 능동 모니터링으로 전환하는 흐름",
      id: "menggeser operasi AI dari alarm pasif ke triase aktif",
      vi: "đưa vận hành AI từ cảnh báo thụ động sang phân loại chủ động",
      th: "ขยับ AI operations จากการแจ้งเตือนเชิงรับไปสู่การคัดกรองเชิงรุก",
      ms: "mengalihkan operasi AI daripada amaran pasif kepada triage aktif",
      fil: "inililipat ang AI operations mula passive alerts tungo sa aktibong triage"
    };
  }
  if (/nexus|tabular|sagemaker jumpstart/.test(text)) {
    return {
      key: "tabular-model",
      entity: "AWS",
      product: "NEXUS",
      zh: "讓表格資料模型更容易進入企業預測流程",
      en: "making tabular AI models easier to place inside enterprise prediction flows",
      ja: "表形式データ向けモデルを企業の予測業務へ導入しやすくする",
      ko: "표형 데이터 모델을 기업 예측 흐름에 넣기 쉽게 만드는 업데이트",
      id: "membuat model tabular lebih mudah dipakai dalam prediksi bisnis",
      vi: "đưa mô hình dữ liệu bảng vào luồng dự báo doanh nghiệp dễ hơn",
      th: "ทำให้โมเดลข้อมูลตารางเข้าไปอยู่ในงานพยากรณ์ขององค์กรได้ง่ายขึ้น",
      ms: "memudahkan model tabular masuk ke aliran ramalan perusahaan",
      fil: "pinapadali ang pagpasok ng tabular model sa enterprise prediction workflow"
    };
  }
  if (/sft|dpo|tool-calling|tool calling/.test(text)) {
    return {
      key: "tool-calling",
      entity: "AWS",
      product: "SageMaker AI",
      zh: "用 SFT 與 DPO 改善 Agent 呼叫工具的可靠性",
      en: "using SFT and DPO to improve agent tool-calling reliability",
      ja: "SFT と DPO で Agent のツール呼び出し精度を高める",
      ko: "SFT와 DPO로 Agent 도구 호출 신뢰도를 높이는 방식",
      id: "memakai SFT dan DPO untuk memperbaiki akurasi tool-calling agent",
      vi: "dùng SFT và DPO để cải thiện độ tin cậy khi agent gọi công cụ",
      th: "ใช้ SFT และ DPO เพื่อเพิ่มความแม่นยำในการเรียกเครื่องมือของ agent",
      ms: "menggunakan SFT dan DPO untuk meningkatkan ketepatan tool-calling agent",
      fil: "ginagamit ang SFT at DPO para mas tumama ang tool-calling ng agent"
    };
  }
  return {
    key: "generic-ai-update",
    entity: pack.sourceLinks?.[0]?.publisher || "AI market",
    product: "AI update",
    zh: "把最新 AI 消息轉成企業可以檢查的採用訊號",
    en: "turning a fresh AI update into an enterprise adoption signal",
    ja: "最新 AI ニュースを企業の導入判断へつなげる",
    ko: "최신 AI 뉴스를 기업 도입 판단으로 바꾸는 관점",
    id: "mengubah kabar AI terbaru menjadi sinyal adopsi bisnis",
    vi: "chuyển một cập nhật AI mới thành tín hiệu áp dụng cho doanh nghiệp",
    th: "เปลี่ยนข่าว AI ล่าสุดให้เป็นสัญญาณการใช้งานขององค์กร",
    ms: "menukar perkembangan AI terkini kepada isyarat adopsi perusahaan",
    fil: "ginagawang enterprise adoption signal ang bagong AI update"
  };
}

const LABELS = {
  "zh-Hant": {
    category: "市場快訊",
    title: (f) => `${f.entity} 更新：${f.zh}`,
    subtitle: (f) => `這則消息可以先拿來檢查 ${f.product} 是否適合進入日常流程。`,
    audience: "創辦人、產品主管、工程與營運決策者",
    headings: ["這則消息卡在哪個流程", "企業先看三個落點", "兩週內先跑一個小測試", "下一步看部署是否變穩"],
    faqQ1: "這則消息對企業有什麼直接影響？",
    faqA1: (f) => `它把 ${f.product} 從技術更新拉回到流程、風險與採購判斷，團隊可以先用小範圍驗證，而不是立刻全面導入。`,
    faqQ2: "現在應該先做什麼？",
    faqA2: "先列出一個可測試的工作流、資料來源、負責人與停止條件，再決定是否擴大使用。"
  },
  en: {
    category: "Market Brief",
    title: (f) => `${f.entity}: ${f.en}`,
    subtitle: (f) => `The update gives teams a practical way to test whether ${f.product} belongs in day-to-day operations.`,
    audience: "Founders, product leads, engineering and operations teams",
    headings: ["Where this update meets the workflow", "Three operating points to inspect", "Run one small test in two weeks", "Watch whether deployment gets steadier"],
    faqQ1: "What should teams take from this update?",
    faqA1: (f) => `Treat ${f.product} as an operating workflow to test with clear owners, evidence, and risk boundaries before scaling it.`,
    faqQ2: "What should happen before a rollout?",
    faqA2: "Pick one narrow workflow, define success and stop conditions, then compare the result against the old process."
  },
  ja: {
    category: "マーケット速報",
    title: (f) => `${f.entity}：${f.ja}`,
    subtitle: (f) => `${f.product} を日常運用に入れられるか、小さく確かめる材料になります。`,
    audience: "経営者、プロダクト責任者、技術・運用チーム",
    headings: ["この更新が当たる業務", "企業が先に見る三つの点", "二週間で小さく試す", "次は運用が安定するかを見る"],
    faqQ1: "このニュースをどう受け止めるべきですか？",
    faqA1: (f) => `${f.product} をすぐ全社導入するのではなく、証拠と責任者を残せる業務で小さく試すべきです。`,
    faqQ2: "導入前の最初の確認は何ですか？",
    faqA2: "対象業務、入力データ、承認者、止める条件を先に決め、従来手順と比べられる状態にします。"
  },
  ko: {
    category: "시장 브리프",
    title: (f) => `${f.entity}: ${f.ko}`,
    subtitle: (f) => `${f.product}를 일상 업무에 넣을 수 있는지 작게 확인할 재료가 생겼다.`,
    audience: "창업자, 제품 리더, 엔지니어링 및 운영팀",
    headings: ["이 업데이트가 닿는 업무", "기업이 먼저 볼 세 지점", "2주 안에 작은 테스트부터", "다음은 운영 안정성"],
    faqQ1: "기업은 이 소식을 어떻게 봐야 하나요?",
    faqA1: (f) => `${f.product}를 바로 확장하기보다, 책임자와 증거가 남는 작은 업무에서 먼저 검증해야 합니다.`,
    faqQ2: "첫 단계는 무엇인가요?",
    faqA2: "하나의 업무를 고르고 성공 기준, 중단 조건, 이전 프로세스와 비교할 지표를 정하는 일입니다."
  },
  id: {
    category: "Kabar Pasar",
    title: (f) => `${f.entity}: ${f.id}`,
    subtitle: (f) => `Kabar ini bisa dipakai untuk menguji apakah ${f.product} layak masuk operasi harian.`,
    audience: "Founder, pemimpin produk, engineering, dan tim operasi",
    headings: ["Bagian workflow yang tersentuh", "Tiga titik yang perlu dicek", "Mulai dari tes kecil dua minggu", "Pantau apakah operasinya makin stabil"],
    faqQ1: "Apa dampaknya bagi perusahaan?",
    faqA1: (f) => `Perusahaan sebaiknya membaca ${f.product} sebagai alur kerja yang harus punya pemilik, bukti, dan batas risiko sebelum diperluas.`,
    faqQ2: "Apa langkah pertama yang aman?",
    faqA2: "Mulai dari satu workflow kecil, tentukan data yang boleh dipakai, pemilik review, metrik sukses, dan kondisi untuk menghentikan eksperimen."
  },
  vi: {
    category: "Tin nhanh thị trường",
    title: (f) => `${f.entity}: ${f.vi}`,
    subtitle: (f) => `Tin này giúp đội ngũ kiểm tra liệu ${f.product} có nên bước vào vận hành hằng ngày hay chưa.`,
    audience: "Nhà sáng lập, trưởng sản phẩm, kỹ thuật và vận hành",
    headings: ["Phần workflow bị tác động", "Ba điểm doanh nghiệp nên soi trước", "Thử nhỏ trong hai tuần", "Theo dõi vận hành có ổn hơn không"],
    faqQ1: "Doanh nghiệp nên rút ra điều gì?",
    faqA1: (f) => `Hãy xem ${f.product} như một workflow cần chủ sở hữu, bằng chứng và ranh giới rủi ro trước khi mở rộng.`,
    faqQ2: "Bước đầu tiên nên là gì?",
    faqA2: "Chọn một quy trình nhỏ, xác định dữ liệu đầu vào, người duyệt, chỉ số thành công và điều kiện dừng thử nghiệm."
  },
  th: {
    category: "ข่าวตลาด",
    title: (f) => `${f.entity}: ${f.th}`,
    subtitle: (f) => `ข่าวนี้ช่วยให้ทีมตรวจได้ว่า ${f.product} ควรเข้าไปอยู่ในงานประจำวันหรือยัง`,
    audience: "ผู้ก่อตั้ง หัวหน้าผลิตภัณฑ์ ทีมวิศวกรรม และทีมปฏิบัติการ",
    headings: ["เวิร์กโฟลว์ส่วนไหนได้รับผล", "สามจุดที่องค์กรควรดูก่อน", "เริ่มจากการทดสอบเล็กในสองสัปดาห์", "ดูต่อว่าการปฏิบัติงานนิ่งขึ้นไหม"],
    faqQ1: "องค์กรควรมองข่าวนี้อย่างไร?",
    faqA1: (f) => `ควรมอง ${f.product} เป็นเวิร์กโฟลว์ที่ต้องมีเจ้าของงาน หลักฐาน และขอบเขตความเสี่ยงก่อนขยายใช้งาน`,
    faqQ2: "ควรเริ่มจากอะไร?",
    faqA2: "เลือกเวิร์กโฟลว์ขนาดเล็กหนึ่งรายการ กำหนดข้อมูลที่ใช้ ผู้ตรวจทาน ตัวชี้วัดความสำเร็จ และเงื่อนไขหยุดทดลองให้ชัดเจน"
  },
  ms: {
    category: "Berita Pasaran",
    title: (f) => `${f.entity}: ${f.ms}`,
    subtitle: (f) => `Berita ini membantu pasukan menguji sama ada ${f.product} sesuai masuk ke operasi harian.`,
    audience: "Pengasas, ketua produk, pasukan kejuruteraan dan operasi",
    headings: ["Bahagian workflow yang terkesan", "Tiga perkara yang perlu dilihat dulu", "Mulakan dengan ujian kecil dua minggu", "Pantau sama ada operasi lebih stabil"],
    faqQ1: "Apa maksudnya kepada syarikat?",
    faqA1: (f) => `Syarikat patut menguji ${f.product} dalam workflow kecil yang mempunyai pemilik, bukti, dan had risiko sebelum diperluaskan.`,
    faqQ2: "Apakah langkah pertama?",
    faqA2: "Pilih satu proses kecil, tetapkan data yang boleh digunakan, pemilik semakan, metrik kejayaan, dan syarat untuk menghentikan percubaan."
  },
  fil: {
    category: "Market Brief",
    title: (f) => `${f.entity}: ${f.fil}`,
    subtitle: (f) => `Magagamit ito para tingnan kung handa na ang ${f.product} pumasok sa araw-araw na operasyon.`,
    audience: "Founders, product leads, engineering, at operations teams",
    headings: ["Saan tatama sa workflow", "Tatlong puntong dapat tingnan", "Magsimula sa maliit na test sa loob ng dalawang linggo", "Bantayan kung mas tumatag ang operasyon"],
    faqQ1: "Ano ang dapat kunin ng kumpanya mula rito?",
    faqA1: (f) => `Dapat tingnan ang ${f.product} bilang workflow na may owner, ebidensya, at risk boundaries bago palawakin.`,
    faqQ2: "Ano ang unang ligtas na hakbang?",
    faqA2: "Pumili ng maliit na workflow, tukuyin ang data, reviewer, success metric, at stop condition bago ang rollout."
  }
};

function seoDescription(language, frame, source) {
  const date = formatDate(source.publishedAt, language);
  const summary = publicText(source.summary).replace(/\.$/, "");
  const text = {
    "zh-Hant": `${source.publisher} 在 ${date} 發布 ${source.title}。ALTOS LAB 整理 ${frame.product} 對企業工作流、採購與風險檢查的直接影響。`,
    en: `${source.publisher} published ${source.title} on ${date}. ALTOS LAB summarizes what ${frame.product} changes for enterprise workflows, procurement, and risk checks.`,
    ja: `${source.publisher} が ${date} に公開した ${source.title} を基に、${frame.product} が企業運用や調達判断に与える影響を整理します。`,
    ko: `${source.publisher}가 ${date} 공개한 ${source.title}를 바탕으로, ${frame.product}가 기업 업무와 구매 판단에 주는 영향을 정리합니다.`,
    id: `${source.publisher} merilis ${source.title} pada ${date}. ALTOS LAB merangkum dampak ${frame.product} bagi workflow, pengadaan, dan pengecekan risiko perusahaan.`,
    vi: `${source.publisher} công bố ${source.title} vào ${date}. ALTOS LAB tóm tắt tác động của ${frame.product} tới workflow, mua sắm và kiểm soát rủi ro doanh nghiệp.`,
    th: `${source.publisher} เผยแพร่ ${source.title} เมื่อ ${date}; ALTOS LAB สรุปผลของ ${frame.product} ต่อเวิร์กโฟลว์ การจัดซื้อ และการตรวจความเสี่ยงขององค์กร`,
    ms: `${source.publisher} menerbitkan ${source.title} pada ${date}. ALTOS LAB merumuskan kesan ${frame.product} terhadap workflow, perolehan, dan semakan risiko syarikat.`,
    fil: `${source.publisher} inilabas ang ${source.title} noong ${date}. ALTOS LAB binuod ang epekto ng ${frame.product} sa workflow, procurement, at risk checks ng kumpanya.`
  }[language] || summary;
  return text.length > 180 ? `${text.slice(0, 176).replace(/\s+\S*$/, "")}…` : text;
}

function buildBody(language, frame, pack) {
  const label = LABELS[language];
  const source = pack.sourceLinks[0];
  const date = formatDate(source.publishedAt, language);
  const sourceTitle = cleanTitle(source.title);
  const summary = publicText(source.summary);
  const h = label.headings;
  const byLang = {
    "zh-Hant": [
      `## ${h[0]}\n\n${source.publisher} 在 ${date} 發布「${sourceTitle}」。這則消息最值得注意的不是標題本身，而是 ${frame.zh}。來源摘要指出：${summary}。對企業來說，這代表 AI 工具正在從單點能力轉為可被納入工作流、採購與風險盤點的操作材料。\n\nALTOS LAB 會把這類消息先轉成一個簡單問題：它能不能讓一條具體流程更快、更穩、或更容易被檢查？如果答案只停在功能展示，就還不適合擴大；如果能對應到週期、責任與回復方式，就值得排入試點。`,
      `## ${h[1]}\n\n${frame.product} 的價值不只在「能做什麼」，也在團隊能不能衡量它改變了哪一步。以這則來源來看，企業可以先把它放到三個位置檢查：第一，是否縮短原本反覆等待的流程；第二，是否讓責任人更容易追蹤輸出；第三，是否降低尖峰或跨部門交接時的摩擦。\n\n這樣看，新聞就不只是海外消息，而是一張導入前的檢查表。採購、產品、工程與營運可以用同一套語言討論：要試哪一段、誰審核、哪些資料可讀、失敗時怎麼退回。`,
      `## ${h[2]}\n\n- 先選一個高頻但風險可控的流程，確認 ${frame.product} 是否真的能縮短交付或判斷時間。\n- 設定同一組前後比較指標，例如處理時間、人工修改率、錯誤攔截率與回復時間。\n- 把來源、負責人與停止條件寫進試點紀錄，避免只留下「感覺變快」的口頭結論。\n- 若涉及客戶、合約、財務或未成年人資料，先保留人工覆核，不把自動化權限一次放大。`,
      `## ${h[3]}\n\n接下來要看的不是同類工具會不會更多，而是企業能不能把「速度」轉成穩定流程。如果兩週後仍說不出節省了哪段時間、哪個風險被降低、哪個決策需要人工確認，這則消息就只能當趨勢參考；若能對應到具體流程，才值得進入下一輪預算與部署討論。`
    ],
    en: [
      `## ${h[0]}\n\n${source.publisher} published "${sourceTitle}" on ${date}. The practical signal is not the headline alone; it is ${frame.en}. The source summary says: ${summary}. For enterprise teams, that moves the update from a product note into a workflow, procurement, and risk-review conversation.\n\nALTOS LAB reads this type of news through one question: does it make a specific workflow faster, more stable, or easier to inspect? If the answer stays at demo level, it should not be scaled. If it maps to cycle time, ownership, and rollback, it deserves a controlled pilot.`,
      `## ${h[1]}\n\nThe value of ${frame.product} is not only what it can do. The real test is whether the team can measure which step changed. From this source, companies can inspect three areas: whether the workflow cycle gets shorter, whether output ownership becomes clearer, and whether handoffs during peak demand or cross-team work become less fragile.\n\nThat turns the news into a practical checklist. Product, engineering, operations, and procurement can discuss the same points: which workflow to test, who reviews it, what data it may read, and how the team returns to the old process if the pilot fails.`,
      `## ${h[2]}\n\n- Choose one high-frequency workflow with manageable risk and test whether ${frame.product} actually reduces cycle time or review time.\n- Use the same before-and-after metrics: processing time, human revision rate, error interception, and recovery time.\n- Write down source evidence, owner, approval step, and stop condition, so the result is not reduced to a vague feeling of speed.\n- Keep human review in place for customer, contract, finance, or youth-related data until the control path is proven.`,
      `## ${h[3]}\n\nThe next question is not whether more tools like this will arrive. The question is whether teams can convert speed into a reliable operating loop. If two weeks later nobody can name the saved step, reduced risk, or required human decision, the news remains only a trend signal. If it maps to a concrete workflow, it can enter the next budget and deployment conversation.`
    ],
    ja: [
      `## ${h[0]}\n\n${source.publisher} は ${date} に「${sourceTitle}」を公開しました。注目点は見出しそのものではなく、${frame.ja} という実務上の変化です。公開情報の要約では、${summary} と説明されています。企業にとってこれは、単なる製品ニュースではなく、業務フロー、調達、リスク確認に関わる材料です。\n\nALTOS LAB では、この種のニュースを「どの具体的な業務を速く、安定させ、検証しやすくするのか」という問いで見ます。デモで終わるなら拡大すべきではありません。サイクルタイム、責任者、戻し方まで語れるなら、小さな試験導入の候補になります。`,
      `## ${h[1]}\n\n${frame.product} の価値は、機能の多さではなく、どの手順を変えたかを測れる点にあります。今回の情報から企業が見るべき領域は三つです。作業サイクルが短くなるか、出力の責任者が明確になるか、ピーク時や部門間の引き継ぎが壊れにくくなるかです。\n\nこの視点を持つと、ニュースは導入前チェックリストになります。プロダクト、技術、運用、調達が同じ言葉で、どの業務を試すか、誰が確認するか、どのデータを読ませるか、失敗時にどう戻すかを話せます。`,
      `## ${h[2]}\n\n- 頻度が高く、リスクを限定できる業務を一つ選び、${frame.product} が本当に時間短縮につながるか確認します。\n- 処理時間、人的修正率、エラー検知率、復旧時間を同じ基準で比較します。\n- 参照元、責任者、承認手順、停止条件を記録し、「何となく速い」で終わらせないようにします。\n- 顧客、契約、財務、若年層に関わる情報では、人による確認を残したまま試験します。`,
      `## ${h[3]}\n\n次に見るべきなのは、同種のツールが増えるかどうかではありません。速度を安定した運用ループに変えられるかです。二週間後に短縮された手順、下がったリスク、必要な人間判断を説明できないなら、これはトレンド情報にとどまります。具体的な業務に接続できるなら、次の予算と導入判断に進めます。`
    ],
    ko: [
      `## ${h[0]}\n\n${source.publisher}는 ${date} "${sourceTitle}"를 공개했습니다. 중요한 점은 제목 자체가 아니라 ${frame.ko}입니다. 출처 요약은 다음처럼 설명합니다: ${summary}. 기업 입장에서는 이 업데이트를 제품 소식이 아니라 업무 흐름, 구매, 리스크 검토의 재료로 봐야 합니다.\n\nALTOS LAB은 이런 소식을 한 가지 질문으로 읽습니다. 특정 업무를 더 빠르게, 더 안정적으로, 더 검증 가능하게 만드는가? 데모 수준에 머문다면 확대할 이유가 없습니다. 주기, 책임자, 되돌리는 방법까지 연결된다면 제한된 파일럿 후보가 됩니다.`,
      `## ${h[1]}\n\n${frame.product}의 가치는 기능 자체보다 어떤 단계가 바뀌었는지를 측정할 수 있는지에 있습니다. 이번 소식에서 기업은 세 가지를 확인할 수 있습니다. 업무 주기가 짧아지는가, 출력 책임자가 명확해지는가, 피크 상황이나 부서 간 인수인계가 덜 흔들리는가입니다.\n\n이렇게 보면 뉴스는 도입 전 체크리스트가 됩니다. 제품, 엔지니어링, 운영, 구매팀이 같은 언어로 어떤 업무를 시험할지, 누가 검토할지, 어떤 데이터를 읽게 할지, 실패하면 어디로 돌아갈지 논의할 수 있습니다.`,
      `## ${h[2]}\n\n- 빈도가 높고 리스크를 통제할 수 있는 업무 하나를 골라 ${frame.product}가 실제로 시간을 줄이는지 확인합니다.\n- 처리 시간, 사람의 수정률, 오류 차단률, 복구 시간을 같은 기준으로 전후 비교합니다.\n- 출처, 책임자, 승인 단계, 중단 조건을 기록해 막연한 속도감으로 끝내지 않습니다.\n- 고객, 계약, 재무, 청소년 관련 데이터는 통제 경로가 입증되기 전까지 사람의 검토를 유지합니다.`,
      `## ${h[3]}\n\n다음에 볼 것은 비슷한 도구가 더 나오는지가 아닙니다. 속도를 안정적인 운영 루프로 바꿀 수 있는지입니다. 2주 뒤에도 어떤 단계가 줄었고, 어떤 위험이 낮아졌고, 어느 지점에서 사람이 판단해야 하는지 설명하지 못하면 이 소식은 트렌드 참고에 그칩니다. 구체적인 업무에 연결되면 다음 예산과 배포 논의로 넘어갈 수 있습니다.`
    ],
    id: [
      `## ${h[0]}\n\n${source.publisher} menerbitkan "${sourceTitle}" pada ${date}. Sinyal praktisnya bukan hanya judul berita, melainkan ${frame.id}. Ringkasan sumber menyebut: ${summary}. Bagi perusahaan, kabar ini perlu dibaca sebagai bahan untuk membahas workflow, pengadaan, dan kontrol risiko.\n\nALTOS LAB melihat kabar seperti ini dengan satu pertanyaan: apakah ia membuat satu proses konkret menjadi lebih cepat, lebih stabil, atau lebih mudah diaudit? Jika jawabannya hanya demo, jangan diperluas. Jika bisa dikaitkan dengan waktu siklus, pemilik proses, dan cara mundur, barulah layak masuk pilot.`,
      `## ${h[1]}\n\nNilai ${frame.product} bukan sekadar kemampuannya. Ujian sebenarnya adalah apakah tim dapat mengukur langkah mana yang berubah. Dari sumber ini, perusahaan bisa memeriksa tiga hal: apakah siklus kerja lebih pendek, apakah tanggung jawab output lebih jelas, dan apakah handoff saat beban tinggi menjadi lebih rapi.\n\nDengan cara baca ini, berita berubah menjadi checklist. Produk, engineering, operasi, dan procurement bisa membahas hal yang sama: workflow mana yang dites, siapa reviewer-nya, data apa yang boleh dibaca, dan bagaimana kembali ke proses lama bila pilot gagal.`,
      `## ${h[2]}\n\n- Pilih satu workflow berulang dengan risiko terkendali, lalu uji apakah ${frame.product} benar-benar memotong waktu kerja.\n- Pakai metrik sebelum-sesudah yang sama: waktu proses, tingkat revisi manusia, error yang tertahan, dan waktu pemulihan.\n- Catat sumber, pemilik proses, tahapan persetujuan, dan kondisi stop agar hasilnya tidak berhenti pada kesan bahwa proses terasa lebih cepat.\n- Untuk data pelanggan, kontrak, keuangan, atau anak muda, pertahankan review manusia sampai jalur kontrol terbukti aman.`,
      `## ${h[3]}\n\nYang perlu dipantau berikutnya bukan sekadar munculnya alat serupa. Pertanyaannya adalah apakah tim dapat mengubah kecepatan menjadi loop operasi yang stabil. Jika setelah dua minggu tidak ada yang bisa menyebut langkah yang dihemat, risiko yang turun, atau keputusan yang tetap perlu manusia, kabar ini hanya menjadi sinyal tren. Jika bisa dikaitkan ke workflow konkret, barulah layak masuk pembahasan anggaran dan deployment.`
    ],
    vi: [
      `## ${h[0]}\n\n${source.publisher} công bố "${sourceTitle}" vào ${date}. Tín hiệu thực tế không nằm ở tiêu đề, mà ở chỗ ${frame.vi}. Tóm tắt từ nguồn cho biết: ${summary}. Với doanh nghiệp, đây là thông tin cần được đưa vào thảo luận về workflow, mua sắm và kiểm soát rủi ro.\n\nALTOS LAB đọc các cập nhật kiểu này bằng một câu hỏi: nó có làm một quy trình cụ thể nhanh hơn, ổn định hơn hoặc dễ kiểm tra hơn không? Nếu chỉ dừng ở trình diễn, chưa nên mở rộng. Nếu gắn được với thời gian chu kỳ, người chịu trách nhiệm và cách quay lại quy trình cũ, nó xứng đáng được thử nghiệm có kiểm soát.`,
      `## ${h[1]}\n\nGiá trị của ${frame.product} không chỉ nằm ở khả năng kỹ thuật. Bài kiểm tra thật là đội ngũ có đo được bước nào đã thay đổi hay không. Từ nguồn này, doanh nghiệp có thể soi ba điểm: chu kỳ xử lý có ngắn hơn không, trách nhiệm đầu ra có rõ hơn không, và các điểm bàn giao khi cao tải có bớt mong manh không.\n\nKhi nhìn như vậy, tin tức trở thành một checklist trước khi triển khai. Product, engineering, vận hành và mua sắm có thể cùng nói về một thứ: quy trình nào sẽ thử, ai duyệt, dữ liệu nào được đọc, và nếu thất bại thì quay lại trạng thái cũ bằng cách nào.`,
      `## ${h[2]}\n\n- Chọn một workflow lặp lại thường xuyên nhưng rủi ro kiểm soát được, rồi kiểm tra xem ${frame.product} có thật sự giảm thời gian xử lý hay không.\n- Dùng cùng bộ chỉ số trước và sau: thời gian xử lý, tỷ lệ con người chỉnh sửa, lỗi được chặn lại, và thời gian khôi phục.\n- Ghi rõ nguồn, người phụ trách, bước phê duyệt và điều kiện dừng, để kết quả không chỉ là cảm giác “nhanh hơn”.\n- Với dữ liệu khách hàng, hợp đồng, tài chính hoặc người trẻ, giữ lớp duyệt của con người cho đến khi đường kiểm soát đã được chứng minh.`,
      `## ${h[3]}\n\nĐiều cần theo dõi tiếp không phải là có thêm bao nhiêu công cụ tương tự. Câu hỏi là đội ngũ có biến tốc độ thành một vòng vận hành ổn định được không. Nếu sau hai tuần vẫn không nói rõ tiết kiệm bước nào, giảm rủi ro nào, hoặc quyết định nào vẫn cần con người, đây chỉ là tín hiệu xu hướng. Nếu gắn được vào workflow cụ thể, nó mới nên đi tiếp vào ngân sách và triển khai.`
    ],
    th: [
      `## ${h[0]}\n\n${source.publisher} เผยแพร่ "${sourceTitle}" เมื่อ ${date} สัญญาณสำคัญไม่ใช่แค่หัวข้อข่าว แต่คือ ${frame.th} สรุปจากแหล่งข่าวระบุว่า: ${summary} สำหรับองค์กร ข่าวนี้ควรถูกนำไปใช้ในการคุยเรื่องเวิร์กโฟลว์ การจัดซื้อ และการควบคุมความเสี่ยง\n\nALTOS LAB อ่านข่าวประเภทนี้ด้วยคำถามเดียว: มันทำให้กระบวนการใดกระบวนการหนึ่งเร็วขึ้น เสถียรขึ้น หรือถูกตรวจสอบได้ง่ายขึ้นหรือไม่ ถ้ายังเป็นเพียงเดโม ไม่ควรขยายใช้งาน แต่ถ้าเชื่อมกับรอบเวลา เจ้าของงาน และวิธีกลับสู่กระบวนการเดิมได้ ก็ควรเข้าสู่ pilot แบบควบคุม`,
      `## ${h[1]}\n\nคุณค่าของ ${frame.product} ไม่ได้อยู่ที่ทำอะไรได้เท่านั้น แต่อยู่ที่ทีมวัดได้หรือไม่ว่าขั้นตอนไหนเปลี่ยนไป จากแหล่งข่าวนี้ องค์กรควรตรวจสามเรื่อง ได้แก่ รอบการทำงานสั้นลงหรือไม่ ความรับผิดชอบของผลลัพธ์ชัดขึ้นหรือไม่ และจุดส่งต่องานในช่วงโหลดสูงเปราะบางน้อยลงหรือไม่\n\nเมื่อมองแบบนี้ ข่าวจะกลายเป็น checklist ก่อนใช้งานจริง ทีม product, engineering, operations และ procurement สามารถคุยด้วยภาษาเดียวกันว่า จะทดลองเวิร์กโฟลว์ไหน ใครตรวจทาน ข้อมูลใดให้ระบบอ่านได้ และถ้าทดลองไม่สำเร็จจะกลับไปขั้นตอนเดิมอย่างไร`,
      `## ${h[2]}\n\n- เลือกเวิร์กโฟลว์ที่เกิดซ้ำบ่อยและมีความเสี่ยงจำกัด แล้วทดสอบว่า ${frame.product} ลดเวลาหรือเวลาตรวจทานได้จริงหรือไม่\n- ใช้ตัวชี้วัดก่อนและหลังแบบเดียวกัน เช่น เวลาในการดำเนินงาน อัตราการแก้ไขโดยคน อัตราการสกัดข้อผิดพลาด และเวลาฟื้นคืนระบบ\n- บันทึกแหล่งข้อมูล เจ้าของงาน ขั้นตอนอนุมัติ และเงื่อนไขหยุด เพื่อไม่ให้ผลลัพธ์เหลือแค่ความรู้สึกว่าเร็วขึ้น\n- หากเกี่ยวกับข้อมูลลูกค้า สัญญา การเงิน หรือเยาวชน ให้คงการตรวจทานของมนุษย์ไว้ก่อนจนกว่าทางควบคุมจะพิสูจน์แล้ว`,
      `## ${h[3]}\n\nสิ่งที่ต้องติดตามต่อไม่ใช่ว่าจะมีเครื่องมือแบบเดียวกันออกมาอีกกี่ตัว แต่คือองค์กรเปลี่ยนความเร็วให้เป็นวงจรปฏิบัติงานที่มั่นคงได้หรือไม่ หากผ่านไปสองสัปดาห์แล้วยังบอกไม่ได้ว่าประหยัดขั้นตอนไหน ลดความเสี่ยงใด หรือจุดไหนยังต้องใช้การตัดสินใจของคน ข่าวนี้ก็เป็นเพียงสัญญาณเทรนด์ แต่ถ้าเชื่อมกับเวิร์กโฟลว์จริงได้ ก็เข้าสู่การคุยเรื่องงบประมาณและ deployment ต่อได้`
    ],
    ms: [
      `## ${h[0]}\n\n${source.publisher} menerbitkan "${sourceTitle}" pada ${date}. Isyarat praktikalnya bukan tajuk berita semata-mata, tetapi ${frame.ms}. Ringkasan sumber menyebut: ${summary}. Untuk syarikat, berita ini wajar dibaca sebagai bahan untuk workflow, perolehan, dan kawalan risiko.\n\nALTOS LAB membaca berita sebegini melalui satu soalan: adakah ia menjadikan satu proses khusus lebih cepat, lebih stabil, atau lebih mudah diaudit? Jika hanya berhenti pada demo, ia belum patut diperluaskan. Jika boleh dikaitkan dengan masa kitaran, pemilik proses, dan laluan rollback, barulah ia sesuai untuk pilot terkawal.`,
      `## ${h[1]}\n\nNilai ${frame.product} bukan pada kebolehan teknikal semata-mata. Ujian sebenar ialah sama ada pasukan boleh mengukur langkah mana yang berubah. Berdasarkan sumber ini, syarikat boleh memeriksa tiga perkara: sama ada kitaran kerja menjadi pendek, tanggungjawab output lebih jelas, dan handoff ketika beban tinggi menjadi kurang rapuh.\n\nDengan cara ini, berita menjadi checklist sebelum pelaksanaan. Produk, kejuruteraan, operasi, dan perolehan boleh berbincang dalam bahasa yang sama: workflow mana diuji, siapa penyemak, data apa boleh dibaca, dan bagaimana kembali ke proses lama jika pilot gagal.`,
      `## ${h[2]}\n\n- Pilih satu workflow berulang yang risikonya terkawal, kemudian uji sama ada ${frame.product} benar-benar mengurangkan masa proses.\n- Gunakan metrik sebelum dan selepas yang sama: masa proses, kadar semakan manusia, ralat yang disekat, dan masa pemulihan.\n- Catat sumber, pemilik proses, langkah kelulusan, dan syarat henti supaya hasilnya tidak sekadar rasa lebih cepat.\n- Untuk data pelanggan, kontrak, kewangan atau belia, kekalkan semakan manusia sehingga laluan kawalan terbukti selamat.`,
      `## ${h[3]}\n\nPerkara seterusnya untuk dipantau bukan hanya sama ada lebih banyak alat serupa akan muncul. Soalannya ialah sama ada pasukan boleh menukar kelajuan menjadi loop operasi yang stabil. Jika selepas dua minggu tiada siapa boleh menyebut langkah yang dijimatkan, risiko yang dikurangkan, atau keputusan yang masih memerlukan manusia, berita ini hanya isyarat trend. Jika ia bersambung kepada workflow khusus, barulah ia layak masuk perbincangan bajet dan deployment.`
    ],
    fil: [
      `## ${h[0]}\n\nInilabas ng ${source.publisher} ang "${sourceTitle}" noong ${date}. Ang praktikal na signal ay hindi lang ang headline, kundi ${frame.fil}. Ayon sa source summary: ${summary}. Para sa kumpanya, dapat itong basahin bilang usapan tungkol sa workflow, procurement, at risk control.\n\nBinabasa ng ALTOS LAB ang ganitong balita gamit ang isang tanong: ginagawa ba nitong mas mabilis, mas matatag, o mas madaling i-check ang isang partikular na proseso? Kung demo lang ang sagot, hindi pa ito dapat palakihin. Kung nakakabit ito sa cycle time, owner, at paraan ng pagbalik sa lumang proseso, puwede itong pumasok sa controlled pilot.`,
      `## ${h[1]}\n\nAng halaga ng ${frame.product} ay hindi lang nasa kayang gawin ng tool. Ang totoong test ay kung nasusukat ng team kung aling hakbang ang nagbago. Mula sa source na ito, puwedeng tingnan ng kumpanya ang tatlong bagay: lumiit ba ang cycle time, mas malinaw ba ang may-ari ng output, at mas matatag ba ang handoff kapag mataas ang load.\n\nSa ganitong pagbasa, nagiging checklist ang balita. Product, engineering, operations, at procurement teams can discuss the same operating points: anong workflow ang susubukan, sino ang reviewer, anong data ang puwedeng basahin, at paano babalik sa dating proseso kung hindi pumasa ang pilot.`,
      `## ${h[2]}\n\n- Pumili ng isang high-frequency workflow na may kontroladong risk at subukan kung talagang nababawasan ng ${frame.product} ang cycle time o review time.\n- Gumamit ng parehong before-and-after metrics: processing time, human revision rate, error interception, at recovery time.\n- Isulat ang source evidence, owner, approval step, at stop condition para hindi mauwi sa malabong pakiramdam na “mas mabilis”.\n- Para sa customer, contract, finance, o youth-related data, panatilihin muna ang human review hanggang mapatunayan ang control path.`,
      `## ${h[3]}\n\nAng susunod na dapat bantayan ay hindi lang kung dadami pa ang ganitong tools. Ang tanong ay kung kaya bang gawing matatag na operating loop ang bilis. Kung makalipas ang dalawang linggo ay walang makapagsabi kung anong hakbang ang natipid, anong risk ang bumaba, o anong decision ang kailangan pa rin ng tao, trend signal lang ito. Kung nakakabit sa konkretong workflow, puwede na itong pumasok sa budget at deployment discussion.`
    ]
  };
  return byLang[language].join("\n\n");
}

function buildPost(language, pack, date) {
  const frame = inferFrame(pack);
  const label = LABELS[language];
  const source = pack.sourceLinks[0];
  const title = label.title(frame);
  const body = buildBody(language, frame, pack);
  const desc = seoDescription(language, frame, source);
  const excerpt = `${label.subtitle(frame)} ${desc}`.slice(0, 220).trim();
  const sourceCue = publicText(source.summary).slice(0, 220);
  return {
    language,
    slug: slugify(cleanTitle(source.title)),
    title: repairPublicCopy(title),
    seoTitle: repairPublicCopy(title.length > 76 ? `${title.slice(0, 73).replace(/\s+\S*$/, "")}…` : title),
    seoDescription: repairPublicCopy(desc.length < 70 ? `${desc} ${label.subtitle(frame)}`.slice(0, 170) : desc),
    excerpt: repairPublicCopy(excerpt),
    contentType: "breaking",
    newsCategory: label.category,
    topic: cleanTitle(source.title),
    audience: label.audience,
    geoSummary: repairPublicCopy(`Source: ${source.publisher}, ${formatDate(source.publishedAt, language)}. Event: ${cleanTitle(source.title)}. Evidence: ${sourceCue}. Decision cue: test one workflow, owner, metric, and stop condition before rollout.`),
    body: repairPublicCopy(body),
    keyTakeaways: [
      label.subtitle(frame),
      `${source.publisher} is the primary source; the article should stay anchored to the published facts.`,
      `Next action: choose one workflow, one owner, and one measurable stop condition before rollout.`
    ],
    faqs: [
      { question: label.faqQ1, answer: label.faqA1(frame) },
      { question: label.faqQ2, answer: label.faqA2 }
    ],
    tags: [label.category, "AI", frame.entity, frame.key].filter(Boolean).slice(0, 5),
    author: Number(pack.sequence) % 4 === 1 ? "Tommy" : "Ken",
    readTimeMinutes: 3,
    coverAlt: `${label.title(frame)} - ${pack.coverCredit || source.publisher}`,
    generatedBy: "market-source-worker",
    aiDisclosure: "",
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: node scripts/blog-market-source-worker.mjs --date 2026-06-04 [--seq 1,5] [--write] [--overwrite]");
    return;
  }

  const date = arg("date", DEFAULT_DATE);
  const backfillDir = path.resolve(arg("backfill-dir", path.join(process.cwd(), "data", "blog-backfill", date)));
  const sourcePacksPath = path.resolve(arg("source-packs", path.join(backfillDir, "market-source-packs.generated.json")));
  const packs = await readJson(sourcePacksPath);
  if (!Array.isArray(packs)) fail("source packs must be an array");
  const seqFilter = arg("seq", "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
  const selected = packs.filter((pack) => !seqFilter.length || seqFilter.includes(Number(pack.sequence)));
  if (!selected.length) fail("no matching source packs");

  const written = [];
  for (const pack of selected) {
    if (!pack.primarySourceImageUrl || !pack.coverCreditUrl || !Array.isArray(pack.sourceLinks) || !pack.sourceLinks.length) {
      fail(`seq ${pack.sequence} missing source image, credit URL, or source links`);
    }
    const outPath = path.join(backfillDir, `market-seq-${pack.sequence}-gemini-parsed-source-worker-zh-Hant-en-ja-ko-id-vi-th-ms-fil.json`);
    if (!hasFlag("overwrite")) {
      try {
        await fs.access(outPath);
        written.push({ sequence: pack.sequence, outPath: path.relative(process.cwd(), outPath), skipped: true });
        continue;
      } catch {
        // continue
      }
    }
    const posts = REQUIRED_LANGUAGES.map((language) => buildPost(language, pack, date));
    if (hasFlag("write")) {
      await writeJson(outPath, {
        sequence: pack.sequence,
        lane: "market",
        generatedAt: new Date().toISOString(),
        generator: "blog-market-source-worker",
        sourcePackPath: path.relative(process.cwd(), sourcePacksPath),
        posts
      });
    }
    written.push({ sequence: pack.sequence, outPath: path.relative(process.cwd(), outPath), skipped: false });
  }

  console.log(JSON.stringify({ ok: true, dryRun: !hasFlag("write"), written }, null, 2));
}

main().catch((error) => fail(error?.message || String(error)));
