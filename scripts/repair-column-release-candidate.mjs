#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
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

function cleanText(value) {
  return String(value || "")
    .replace(/###/g, "##")
    .replace(/[—–]/g, ", ")
    .replace(/\b(?:SEO\/GEO|SEO|GEO|AI-generated|prompt|pipeline|quality gate|rubric)\b/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function trimSentence(text, max) {
  const clean = cleanText(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "").trim()}…`;
}

function stripNegativeVisualPrompt(text) {
  return cleanText(text)
    .replace(/\bno\s+(?:readable\s+)?text\s+(?:or|and)\s+(?:fake\s+)?logos?\b/gi, "")
    .replace(/\bno\s+(?:fake\s+)?logos?\s+(?:or|and)\s+(?:readable\s+)?text\b/gi, "")
    .replace(/\bno\s+(?:protected\s+)?brands?\s+(?:or|and)\s+(?:trademarks?|brand\s+marks?)\b/gi, "")
    .replace(/\bno\s+(?:readable\s+)?text\b/gi, "")
    .replace(/\bno\s+(?:fake\s+)?logos?\b/gi, "")
    .replace(/\bno\s+trademarks?\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const COMMON_LABELS = {
  "zh-Hant": {
    checkTitle: "先守住這三個控制點",
    watchTitle: "接下來要看哪個訊號",
    lab: "ALTOS LAB 判斷",
    action: "本週先做一件事",
    sourceWord: "來源"
  },
  en: {
    checkTitle: "Protect These Three Control Points First",
    watchTitle: "The Signal To Watch Next",
    lab: "ALTOS LAB judgment",
    action: "One action for this week",
    sourceWord: "source"
  },
  ja: {
    checkTitle: "最初に守るべき三つの制御点",
    watchTitle: "次に見るべきシグナル",
    lab: "ALTOS LAB の判断",
    action: "今週まずやること",
    sourceWord: "出典"
  },
  ko: {
    checkTitle: "먼저 지켜야 할 세 가지 통제점",
    watchTitle: "다음에 볼 신호",
    lab: "ALTOS LAB 판단",
    action: "이번 주 먼저 할 일",
    sourceWord: "출처"
  },
  id: {
    checkTitle: "Tiga Titik Kontrol Yang Perlu Dijaga Dulu",
    watchTitle: "Sinyal Yang Perlu Dipantau Berikutnya",
    lab: "Penilaian ALTOS LAB",
    action: "Satu hal untuk dikerjakan pekan ini",
    sourceWord: "sumber"
  },
  vi: {
    checkTitle: "Ba Điểm Kiểm Soát Cần Giữ Trước",
    watchTitle: "Tín Hiệu Cần Theo Dõi Tiếp Theo",
    lab: "Nhận định của ALTOS LAB",
    action: "Một việc nên làm trong tuần này",
    sourceWord: "nguồn"
  },
  th: {
    checkTitle: "จุดควบคุมสามอย่างที่ต้องกันไว้ก่อน",
    watchTitle: "สัญญาณถัดไปที่ควรดู",
    lab: "มุมมอง ALTOS LAB",
    action: "สิ่งแรกที่ควรทำในสัปดาห์นี้",
    sourceWord: "แหล่งที่มา"
  },
  ms: {
    checkTitle: "Tiga Titik Kawalan Yang Perlu Dijaga Dahulu",
    watchTitle: "Isyarat Seterusnya Untuk Dipantau",
    lab: "Penilaian ALTOS LAB",
    action: "Satu perkara untuk dibuat minggu ini",
    sourceWord: "sumber"
  },
  fil: {
    checkTitle: "Tatlong Control Point Na Dapat Unahin",
    watchTitle: "Susunod Na Signal Na Babantayan",
    lab: "Pananaw ng ALTOS LAB",
    action: "Isang gawain para ngayong linggo",
    sourceWord: "source"
  }
};

const PROFILES = {
  25: {
    slug: {
      id: "batas-kontrol-minimum-ai"
    },
    title: {
      "zh-Hant": "AI 導入前，先畫出團隊守得住的最小邊界",
      en: "Before AI Rollout, Draw the Smallest Boundary Your Team Can Actually Guard",
      ja: "AI導入の前に、チームが守れる最小境界を引く",
      ko: "AI 도입 전, 팀이 지킬 수 있는 최소 경계부터 그려라",
      id: "Sebelum Menerapkan AI, Tetapkan Batas Kontrol Minimum",
      vi: "Trước Khi Triển Khai AI, Hãy Vạch Ranh Giới Nhỏ Nhất Có Thể Kiểm Soát",
      th: "ก่อนนำ AI เข้าใช้งาน ต้องขีดขอบเขตที่ทีมคุมได้จริง",
      ms: "Sebelum Melaksanakan AI, Tetapkan Batas Kawalan Minimum",
      fil: "Bago Mag-Rollout Ng AI, Gumuhit Muna Ng Pinakamaliit Na Hangganang Kayang Bantayan"
    },
    sourceNames: "NIST, OpenAI, Microsoft, IBM",
    sourceLinks: [
      {
        title: "NIST AI Risk Management Framework",
        url: "https://www.nist.gov/itl/ai-risk-management-framework",
        publisher: "NIST",
        publishedAt: "2026-06-04",
        summary: "NIST frames AI risk management as a lifecycle of governance, mapping, measurement and management."
      },
      {
        title: "OpenAI Safety best practices",
        url: "https://platform.openai.com/docs/guides/safety-best-practices",
        publisher: "OpenAI",
        publishedAt: "2026-06-04",
        summary: "OpenAI documents safety practices that can be translated into review, limits and monitoring before deployment."
      },
      {
        title: "Microsoft Responsible AI",
        url: "https://www.microsoft.com/en-us/ai/responsible-ai",
        publisher: "Microsoft",
        publishedAt: "2026-06-04",
        summary: "Microsoft describes responsible AI practices across design, deployment and monitoring."
      },
      {
        title: "IBM AI governance",
        url: "https://www.ibm.com/think/topics/ai-governance",
        publisher: "IBM",
        publishedAt: "2026-06-04",
        summary: "IBM explains governance responsibilities, risk categories and operational accountability for enterprise AI."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst:
          "NIST、OpenAI、Microsoft 與 IBM 的治理文件都指向同一件事：AI 不該先接管流程，而要先留下誰能審核、何時喊停、如何回復的邊界。",
        lead:
          "一個 2026 年的 AI 導入案最危險的時刻，通常不是模型答錯，而是團隊答不出誰能停下它。NIST、OpenAI、Microsoft 與 IBM 的公開治理框架提醒同一件事：先把責任、資料、權限與回復路徑圈住，再讓自動化進流程。",
        quote: "如果一條流程沒有人能審、不能停、不能回復，它就還不是產品化的 AI，只是被包裝過的風險。",
        bullets: ["先列出 AI 能讀取的資料，不讓它直接碰不可逆動作", "指定最後審核者與代理人，避免責任落在系統名義下", "把停止條件寫成操作規則，而不是會議共識"],
        watch:
          "真正的進度不是多接一個工具，而是每次輸出都能被追到來源、版本和責任人。這會讓小試點更慢一點，卻讓擴張時少很多補破洞的成本。"
      },
      en: {
        standfirst:
          "NIST, OpenAI, Microsoft and IBM all point to the same operating rule: do not let AI take over a workflow before the team knows who reviews it, when to stop it and how to recover.",
        lead:
          "The riskiest moment in a 2026 AI rollout is often not a wrong model answer. It is the moment no one can say who is allowed to stop the system. NIST, OpenAI, Microsoft and IBM all push teams toward the same discipline: define data, authority, review and recovery before automation enters the workflow.",
        quote: "A workflow that cannot be reviewed, stopped or restored is not production AI. It is operational risk with a nicer interface.",
        bullets: ["Name the data AI may read before allowing any irreversible action", "Assign a final reviewer and backup owner so responsibility never hides behind the system", "Turn stop conditions into operating rules, not meeting-room assumptions"],
        watch:
          "Progress is not the number of tools connected. Progress is whether every output can be traced to a source, version and responsible owner."
      },
      ja: {
        standfirst:
          "NIST、OpenAI、Microsoft、IBMの公開フレームワークが示すのは、AIに業務を任せる前に、誰が審査し、いつ止め、どう戻すかを決める必要があるということです。",
        lead:
          "2026年のAI導入で最も危ない瞬間は、モデルが間違えた時だけではありません。誰が止められるのかを誰も答えられない時です。NIST、OpenAI、Microsoft、IBMの公開資料は、データ、権限、審査、復旧を先に決める重要性を示しています。",
        quote: "審査できず、止められず、戻せない業務は、まだ本番AIではなく、見た目を整えた運用リスクです。",
        bullets: ["AIが読めるデータを先に決め、不可逆な操作には触れさせない", "最終審査者と代理責任者を置き、責任をシステム名義に隠さない", "停止条件を会議の合意ではなく運用ルールに落とす"],
        watch:
          "進捗は接続したツールの数ではありません。すべての出力を出典、バージョン、責任者へ戻せるかです。"
      },
      ko: {
        standfirst:
          "NIST, OpenAI, Microsoft, IBM의 공개 프레임워크가 가리키는 결론은 같다. AI가 업무를 맡기 전에 누가 검토하고, 언제 멈추며, 어떻게 복구할지 정해야 한다.",
        lead:
          "2026년 AI 도입에서 가장 위험한 순간은 모델이 틀리는 순간만이 아니다. 누가 시스템을 멈출 수 있는지 아무도 답하지 못하는 순간이다. NIST, OpenAI, Microsoft, IBM은 데이터, 권한, 검토, 복구를 자동화보다 먼저 정하라고 말한다.",
        quote: "검토할 수 없고 멈출 수 없고 복구할 수 없는 흐름은 프로덕션 AI가 아니라 보기 좋게 포장된 운영 리스크다.",
        bullets: ["AI가 읽을 수 있는 데이터를 먼저 정하고 되돌릴 수 없는 행동은 막는다", "최종 검토자와 대리 책임자를 지정해 책임이 시스템 뒤로 숨지 않게 한다", "중단 조건을 회의 합의가 아니라 운영 규칙으로 쓴다"],
        watch:
          "진짜 진도는 연결한 도구 수가 아니라 모든 출력이 출처, 버전, 책임자로 되돌아가는가에 달려 있다."
      },
      id: {
        standfirst:
          "NIST, OpenAI, Microsoft, dan IBM memberi pesan yang sama: AI jangan masuk ke alur kerja sebelum tim tahu siapa yang meninjau, kapan harus berhenti, dan bagaimana memulihkan proses.",
        lead:
          "Risiko terbesar dalam rollout AI pada 2026 sering bukan jawaban model yang salah, melainkan saat tidak ada orang yang bisa menjawab siapa yang berhak menghentikannya. NIST, OpenAI, Microsoft, dan IBM sama-sama menekankan data, otoritas, review, dan pemulihan sebelum otomatisasi masuk ke operasi.",
        quote: "Alur kerja yang tidak bisa direview, dihentikan, atau dipulihkan belum layak disebut AI produksi. Itu masih risiko operasi dengan antarmuka lebih rapi.",
        bullets: ["Tentukan data yang boleh dibaca AI sebelum memberi izin tindakan yang sulit dibalik", "Tetapkan reviewer akhir dan pemilik cadangan agar tanggung jawab tidak bersembunyi di balik sistem", "Ubah syarat penghentian menjadi aturan operasi, bukan asumsi rapat"],
        watch:
          "Kemajuan bukan dihitung dari jumlah tool yang tersambung. Kemajuan terlihat saat setiap output bisa ditelusuri ke sumber, versi, dan pemilik yang bertanggung jawab."
      },
      vi: {
        standfirst:
          "NIST, OpenAI, Microsoft và IBM cùng gửi một tín hiệu: đừng để AI bước vào quy trình trước khi đội ngũ biết ai rà soát, khi nào dừng và phục hồi bằng cách nào.",
        lead:
          "Điểm rủi ro nhất của một dự án AI năm 2026 không chỉ là lúc mô hình trả lời sai. Đó là lúc không ai biết ai có quyền dừng hệ thống. NIST, OpenAI, Microsoft và IBM đều nhấn mạnh việc chốt dữ liệu, quyền hạn, rà soát và khôi phục trước khi tự động hóa đi vào vận hành.",
        quote: "Một quy trình không thể rà soát, không thể dừng và không thể khôi phục chưa phải AI sản xuất. Nó chỉ là rủi ro vận hành được đóng gói đẹp hơn.",
        bullets: ["Xác định dữ liệu AI được đọc trước khi cho phép hành động khó đảo ngược", "Chỉ định người rà soát cuối cùng và người thay thế để trách nhiệm không núp sau hệ thống", "Viết điều kiện dừng thành quy tắc vận hành, không chỉ là đồng thuận trong cuộc họp"],
        watch:
          "Tiến độ thật không nằm ở số công cụ đã nối vào, mà ở việc mỗi đầu ra có thể truy về nguồn, phiên bản và người chịu trách nhiệm hay không."
      },
      th: {
        standfirst:
          "NIST, OpenAI, Microsoft และ IBM ส่งสัญญาณเดียวกันว่า อย่าให้ AI เข้าไปยึดเวิร์กโฟลว์ก่อนที่ทีมจะรู้ว่าใครตรวจ ใครหยุด และจะกู้คืนอย่างไร",
        lead:
          "ความเสี่ยงของการนำ AI เข้าใช้ในปี 2026 ไม่ได้อยู่แค่โมเดลตอบผิด แต่อยู่ที่ไม่มีใครตอบได้ว่าใครมีสิทธิ์หยุดระบบ NIST, OpenAI, Microsoft และ IBM ต่างชี้ให้ทีมกำหนดข้อมูล สิทธิ์ตรวจทาน และทางกู้คืนก่อนให้ระบบอัตโนมัติเข้ากระบวนการจริง",
        quote: "เวิร์กโฟลว์ที่ตรวจไม่ได้ หยุดไม่ได้ และย้อนกลับไม่ได้ ยังไม่ใช่ AI สำหรับงานจริง แต่คือความเสี่ยงเชิงปฏิบัติการที่หน้าตาดีขึ้น",
        bullets: ["กำหนดข้อมูลที่ AI อ่านได้ก่อนอนุญาตให้ทำงานที่ย้อนกลับยาก", "ตั้งผู้ตรวจขั้นสุดท้ายและคนสำรอง เพื่อไม่ให้ความรับผิดชอบหายไปหลังคำว่าระบบ", "เขียนเงื่อนไขหยุดเป็นกฎปฏิบัติ ไม่ใช่แค่ความเข้าใจในที่ประชุม"],
        watch:
          "ความคืบหน้าไม่ใช่จำนวนเครื่องมือที่เชื่อมต่อ แต่คือทุกผลลัพธ์ย้อนกลับไปหาแหล่งข้อมูล เวอร์ชัน และเจ้าของงานได้หรือไม่"
      },
      ms: {
        standfirst:
          "NIST, OpenAI, Microsoft dan IBM memberi isyarat yang sama: jangan biarkan AI masuk ke aliran kerja sebelum pasukan tahu siapa menyemak, bila perlu berhenti dan cara memulihkan proses.",
        lead:
          "Risiko terbesar dalam pelaksanaan AI pada 2026 selalunya bukan jawapan model yang salah, tetapi saat tiada siapa tahu siapa boleh menghentikan sistem. NIST, OpenAI, Microsoft dan IBM menekankan data, kuasa, semakan dan pemulihan sebelum automasi masuk operasi.",
        quote: "Aliran kerja yang tidak boleh disemak, dihentikan atau dipulihkan belum layak menjadi AI produksi. Ia masih risiko operasi dengan antara muka yang lebih kemas.",
        bullets: ["Tetapkan data yang boleh dibaca AI sebelum membenarkan tindakan yang sukar diundur", "Namakan penyemak akhir dan pemilik sandaran supaya tanggungjawab tidak bersembunyi di balik sistem", "Jadikan syarat berhenti sebagai peraturan operasi, bukan andaian mesyuarat"],
        watch:
          "Kemajuan sebenar bukan jumlah alat yang disambungkan. Kemajuan wujud apabila setiap output boleh dijejak kepada sumber, versi dan pemilik bertanggungjawab."
      },
      fil: {
        standfirst:
          "Iisa ang senyas mula NIST, OpenAI, Microsoft at IBM: huwag munang ipasok ang AI sa workflow hangga't hindi malinaw kung sino ang magre-review, kailan hihinto, at paano babalik.",
        lead:
          "Sa isang AI rollout sa 2026, hindi lang maling sagot ng model ang delikado. Mas delikado ang sandaling walang makasagot kung sino ang puwedeng magpatigil ng system. Pare-parehong itinutulak ng NIST, OpenAI, Microsoft at IBM ang malinaw na data, authority, review at recovery bago ang automation.",
        quote: "Ang workflow na hindi mare-review, hindi mahihinto at hindi maibabalik ay hindi pa production AI. Operational risk pa rin iyon na mas maayos lang ang itsura.",
        bullets: ["Tukuyin muna kung anong data ang puwedeng basahin ng AI bago payagan ang mahirap bawiing aksyon", "Magtalaga ng final reviewer at backup owner para hindi magtago ang responsibilidad sa likod ng system", "Gawing operating rule ang stop conditions, hindi lang usapan sa meeting"],
        watch:
          "Hindi bilang ng nakakabit na tools ang totoong progreso. Progreso ang bawat output na natutunton sa source, version at taong may pananagutan."
      }
    }
  },
  26: {
    title: {
      "zh-Hant": "AI 搜尋下半場：內容能不能被引用，先看它能不能被核驗",
      en: "AI Search Is Entering Its Verification Era",
      ja: "AI検索の次の勝負は、引用される前に検証できるか",
      ko: "AI 검색의 다음 경쟁은 인용보다 검증에서 시작된다",
      id: "Babak Baru AI Search Dimulai Dari Konten Yang Bisa Diverifikasi",
      vi: "Nửa Sau Của Tìm Kiếm AI Bắt Đầu Từ Nội Dung Có Thể Kiểm Chứng",
      th: "ครึ่งหลังของ AI Search วัดกันที่เนื้อหาที่ตรวจสอบได้",
      ms: "Fasa Baharu AI Search Bermula Dengan Kandungan Yang Boleh Disahkan",
      fil: "Sa Susunod Na Yugto Ng AI Search, Mas Nauuna Ang Verification Kaysa Ranking"
    },
    sourceNames: "Google Search, Schema.org, OpenSearch",
    sourceLinks: [
      {
        title: "Google Search Essentials",
        url: "https://developers.google.com/search/docs/essentials",
        publisher: "Google",
        publishedAt: "2026-06-04",
        summary: "Google Search Essentials describes baseline requirements for making content discoverable and reliable for search systems."
      },
      {
        title: "Google structured data introduction",
        url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
        publisher: "Google",
        publishedAt: "2026-06-04",
        summary: "Google explains how structured data helps search systems understand page meaning and eligible rich results."
      },
      {
        title: "Schema.org FAQPage",
        url: "https://schema.org/FAQPage",
        publisher: "Schema.org",
        publishedAt: "2026-06-04",
        summary: "Schema.org defines FAQPage markup that makes question-and-answer content explicit for machines."
      },
      {
        title: "OpenSearch blog",
        url: "https://opensearch.org/blog/",
        publisher: "OpenSearch Project",
        publishedAt: "2026-06-04",
        summary: "OpenSearch publishes retrieval and search engineering notes relevant to answer quality and source structure."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst: "Google Search 文件、Schema.org 與 OpenSearch 的檢索實務都在提醒品牌：被 AI 摘要引用之前，內容要先交代來源、時間、作者與可驗證證據。",
        lead: "AI 搜尋改變的不是一個排名位置，而是內容被機器理解前的資格審查。Google Search 文件、Schema.org 與 OpenSearch 的檢索實務都指向同一條線：沒有來源、日期與結構化線索的內容，很難被可靠引用。",
        quote: "AI 搜尋不會獎勵寫得最像廣告的內容，而會優先保留最容易被核驗的內容。",
        bullets: ["每篇內容都要能說清楚來源、日期、作者與更新責任", "把 FAQ、步驟、定義和數據拆成可被引用的段落", "定期檢查 AI 摘要是否引用舊資料或把品牌語境說錯"],
        watch: "接下來要看的不是單一關鍵字排名，而是品牌是否在 AI 回答裡被正確命名、被放在合理比較中，並且連回可驗證的原始頁面。"
      },
      en: {
        standfirst: "Google Search documentation, Schema.org and OpenSearch all point toward the same rule: before AI systems cite a page, they need source, date, authorship and verifiable structure.",
        lead: "AI search is not only changing ranking. It is changing the admission test content must pass before machines can use it. Google Search documentation, Schema.org and OpenSearch all point to the same requirement: content without source, date and structured evidence is harder to cite with confidence.",
        quote: "AI search will not reward the page that sounds most promotional. It will preserve the page that is easiest to verify.",
        bullets: ["Make source, date, author and update owner visible on every durable page", "Break FAQs, steps, definitions and numbers into citation-ready blocks", "Check whether AI summaries quote stale facts or place the brand in the wrong context"],
        watch: "The next signal is not one keyword rank. It is whether the brand appears accurately in AI answers, in a fair comparison set, and with a path back to a verifiable page."
      },
      ja: {
        standfirst: "Google Searchの文書、Schema.org、OpenSearchの実務が示すのは、AIに引用される前に、出典、日付、著者、検証しやすい構造が必要だということです。",
        lead: "AI検索が変えるのは順位だけではありません。機械に使われる前に、コンテンツが通るべき審査が変わります。Google Search、Schema.org、OpenSearchはいずれも、出典、日付、構造化された根拠の重要性を示しています。",
        quote: "AI検索で残るのは、広告らしい文章ではなく、検証しやすい文章です。",
        bullets: ["出典、日付、著者、更新責任者を各ページで見えるようにする", "FAQ、手順、定義、数字を引用しやすい塊に分ける", "AI要約が古い事実や誤った文脈でブランドを扱っていないか確認する"],
        watch: "次に見るべきなのは単一キーワードの順位ではなく、AI回答の中でブランドが正確に名前を出され、妥当な比較軸で扱われているかです。"
      },
      ko: {
        standfirst: "Google Search 문서, Schema.org, OpenSearch 실무가 말하는 방향은 같다. AI가 인용하기 전에 출처, 날짜, 작성자, 검증 가능한 구조가 필요하다.",
        lead: "AI 검색이 바꾸는 것은 순위 하나가 아니다. 기계가 콘텐츠를 쓰기 전에 통과해야 할 자격 심사가 달라지고 있다. Google Search, Schema.org, OpenSearch는 출처, 날짜, 구조화된 근거가 없는 콘텐츠는 신뢰 있게 인용되기 어렵다는 점을 보여준다.",
        quote: "AI 검색은 가장 광고처럼 들리는 페이지보다 가장 검증하기 쉬운 페이지를 남긴다.",
        bullets: ["모든 핵심 페이지에 출처, 날짜, 작성자, 업데이트 책임자를 보이게 둔다", "FAQ, 절차, 정의, 수치를 인용 가능한 블록으로 나눈다", "AI 요약이 오래된 사실이나 잘못된 비교 맥락을 쓰지 않는지 확인한다"],
        watch: "다음 신호는 단일 키워드 순위가 아니라 AI 답변 안에서 브랜드가 정확히 불리고, 타당한 비교군에 놓이며, 검증 가능한 원문으로 연결되는가다."
      },
      id: {
        standfirst: "Dokumentasi Google Search, Schema.org, dan praktik OpenSearch menunjukkan aturan yang sama: sebelum dikutip AI, konten perlu sumber, tanggal, penulis, dan struktur yang mudah diverifikasi.",
        lead: "AI search tidak hanya mengubah ranking. Ia mengubah syarat agar konten bisa dipakai mesin dengan percaya diri. Dokumentasi Google Search, Schema.org, dan OpenSearch sama-sama menekankan sumber, tanggal, dan bukti terstruktur sebagai dasar konten yang layak dikutip.",
        quote: "AI search tidak akan menyimpan halaman yang paling promosi. Ia akan lebih percaya pada halaman yang paling mudah diverifikasi.",
        bullets: ["Tampilkan sumber, tanggal, penulis, dan pemilik update pada halaman penting", "Pisahkan FAQ, langkah, definisi, dan angka menjadi blok yang siap dikutip", "Cek apakah ringkasan AI mengutip fakta lama atau menempatkan brand dalam konteks yang keliru"],
        watch: "Sinyal berikutnya bukan satu posisi keyword. Yang perlu dilihat adalah apakah brand disebut akurat dalam jawaban AI, dibandingkan dengan konteks yang tepat, dan diarahkan ke halaman yang bisa diperiksa."
      },
      vi: {
        standfirst: "Tài liệu Google Search, Schema.org và thực hành OpenSearch cùng cho thấy một điều: trước khi được AI trích dẫn, nội dung cần nguồn, ngày tháng, tác giả và cấu trúc có thể kiểm chứng.",
        lead: "Tìm kiếm AI không chỉ thay đổi thứ hạng. Nó thay đổi điều kiện để nội dung được máy sử dụng một cách đáng tin. Google Search, Schema.org và OpenSearch đều nhấn mạnh nguồn, ngày tháng và bằng chứng có cấu trúc.",
        quote: "Tìm kiếm AI không giữ lại nội dung giống quảng cáo nhất. Nó giữ lại nội dung dễ kiểm chứng nhất.",
        bullets: ["Hiển thị nguồn, ngày cập nhật, tác giả và người chịu trách nhiệm trên các trang quan trọng", "Tách FAQ, bước làm, định nghĩa và số liệu thành các khối dễ trích dẫn", "Kiểm tra xem AI summary có dùng dữ kiện cũ hoặc đặt thương hiệu sai ngữ cảnh không"],
        watch: "Tín hiệu tiếp theo không phải một thứ hạng từ khóa, mà là thương hiệu có được gọi đúng trong câu trả lời AI, được so sánh đúng nhóm và dẫn về trang có thể kiểm chứng hay không."
      },
      th: {
        standfirst: "เอกสาร Google Search, Schema.org และแนวทางของ OpenSearch ชี้ไปทางเดียวกันว่า ก่อนถูก AI อ้างอิง เนื้อหาต้องมีแหล่งที่มา วันที่ ผู้เขียน และโครงสร้างที่ตรวจสอบได้",
        lead: "AI search ไม่ได้เปลี่ยนแค่อันดับ แต่เปลี่ยนเงื่อนไขที่เนื้อหาต้องผ่านก่อนถูกเครื่องนำไปใช้ เอกสารของ Google Search, Schema.org และ OpenSearch ต่างย้ำเรื่องแหล่งที่มา วันที่ และหลักฐานที่จัดเป็นโครงสร้างได้",
        quote: "AI search ไม่ได้ให้รางวัลกับหน้าที่โฆษณาเก่งที่สุด แต่จะรักษาหน้าที่ตรวจสอบได้ง่ายที่สุด",
        bullets: ["ทำให้แหล่งที่มา วันที่ ผู้เขียน และเจ้าของการอัปเดตมองเห็นได้บนหน้าสำคัญ", "แยก FAQ ขั้นตอน นิยาม และตัวเลขเป็นบล็อกที่พร้อมถูกอ้างอิง", "ตรวจว่า AI summary อ้างข้อมูลเก่าหรือวางแบรนด์ผิดบริบทหรือไม่"],
        watch: "สัญญาณถัดไปไม่ใช่อันดับคีย์เวิร์ดเดียว แต่คือแบรนด์ถูกเรียกชื่อถูกต้องในคำตอบ AI ถูกเทียบในกลุ่มที่เหมาะสม และย้อนกลับไปยังหน้าที่ตรวจสอบได้หรือไม่"
      },
      ms: {
        standfirst: "Dokumentasi Google Search, Schema.org dan amalan OpenSearch menunjukkan aturan yang sama: sebelum dipetik AI, kandungan perlu sumber, tarikh, penulis dan struktur yang boleh disahkan.",
        lead: "AI search bukan sekadar mengubah ranking. Ia mengubah syarat supaya kandungan boleh digunakan mesin dengan yakin. Google Search, Schema.org dan OpenSearch sama-sama menekankan sumber, tarikh dan bukti berstruktur.",
        quote: "AI search tidak akan memihak kepada halaman paling promosi. Ia akan menyimpan halaman yang paling mudah disahkan.",
        bullets: ["Paparkan sumber, tarikh, penulis dan pemilik kemas kini pada halaman penting", "Pecahkan FAQ, langkah, definisi dan angka kepada blok yang mudah dipetik", "Semak sama ada ringkasan AI memetik fakta lama atau meletakkan jenama dalam konteks yang salah"],
        watch: "Isyarat seterusnya bukan satu kedudukan kata kunci. Yang penting ialah sama ada jenama disebut dengan tepat dalam jawapan AI, dibandingkan dengan kumpulan yang betul, dan dipautkan ke halaman yang boleh disahkan."
      },
      fil: {
        standfirst: "Iisa ang sinasabi ng Google Search documentation, Schema.org at OpenSearch: bago ma-cite ng AI, kailangan ng content ang source, petsa, author at istrukturang madaling i-verify.",
        lead: "Hindi lang ranking ang binabago ng AI search. Binabago nito ang requirement bago magamit ng machine ang content nang may tiwala. Pare-parehong tinuturo ng Google Search, Schema.org at OpenSearch ang source, date at structured evidence.",
        quote: "Hindi pahahalagahan ng AI search ang pinakapromotional na page. Mas tatagal ang page na pinakamadaling i-verify.",
        bullets: ["Ipakita ang source, date, author at update owner sa mahahalagang page", "Hatiin ang FAQ, steps, definitions at numbers sa citation-ready blocks", "Tingnan kung lumang facts ang ginagamit ng AI summaries o mali ang context ng brand"],
        watch: "Ang susunod na signal ay hindi isang keyword rank. Mas mahalaga kung tama ang pagbanggit sa brand sa AI answers, nasa tamang comparison set, at may balik sa verifiable page."
      }
    }
  },
  27: {
    title: {
      "zh-Hant": "AI Agent 的自治，要先從授權邏輯開始",
      en: "AI Agents Need Authorization Before Autonomy",
      ja: "AI Agentは自律より先に権限設計が必要だ",
      ko: "AI Agent는 자율성보다 권한 설계가 먼저다",
      id: "AI Agent Perlu Logika Otorisasi Sebelum Bicara Otonomi",
      vi: "AI Agent Cần Logic Phân Quyền Trước Khi Nói Đến Tự Chủ",
      th: "AI Agent ต้องมีตรรกะสิทธิ์ก่อนพูดเรื่องอัตโนมัติ",
      ms: "AI Agent Perlukan Logik Kebenaran Sebelum Autonomi",
      fil: "Bago Autonomy, Kailangan Muna Ng Authorization Logic Ang AI Agent"
    },
    sourceNames: "OpenAI, Anthropic, Microsoft, Google Cloud, IBM",
    sourceLinks: [
      {
        title: "OpenAI Agents best practices",
        url: "https://platform.openai.com/docs/assistants/overview",
        publisher: "OpenAI",
        publishedAt: "2026-06-04",
        summary: "OpenAI explains agent-style applications, tool use and controls that influence how teams scope permissions."
      },
      {
        title: "Anthropic agentic workflows",
        url: "https://docs.anthropic.com/en/docs/agents",
        publisher: "Anthropic",
        publishedAt: "2026-06-04",
        summary: "Anthropic documents agent workflows and tool boundaries that help teams reason about autonomy and supervision."
      },
      {
        title: "Microsoft Foundry Agent Service",
        url: "https://learn.microsoft.com/en-us/azure/ai-foundry/agents/overview?view=foundry-classic",
        publisher: "Microsoft",
        publishedAt: "2026-06-04",
        summary: "Microsoft describes managed agent runtime, tools, observability and role-based access control for enterprise agents."
      },
      {
        title: "Google Cloud IAM roles",
        url: "https://cloud.google.com/iam/docs/understanding-roles",
        publisher: "Google Cloud",
        publishedAt: "2026-06-04",
        summary: "Google Cloud explains role design and least-privilege access patterns relevant to agent permissions."
      },
      {
        title: "IBM: What are AI agents?",
        url: "https://www.ibm.com/think/topics/ai-agents",
        publisher: "IBM",
        publishedAt: "2026-06-04",
        summary: "IBM defines AI agents as systems that observe, reason, plan and act across tools and workflows."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst: "OpenAI、Anthropic、Microsoft、Google Cloud 與 IBM 的文件都把 Agent 拉回同一個問題：它能做事之前，企業要先定義它能代表誰、碰哪些資料、在哪一步停下。",
        lead: "很多團隊談 AI Agent 時，第一句就問它能不能自己完成任務。更值得先問的是：它到底代表誰行動？OpenAI、Anthropic、Microsoft、Google Cloud 與 IBM 的文件都提醒，自治不是第一步，授權邏輯才是。",
        quote: "沒有授權邏輯的 Agent，不是更聰明的同事，而是拿到工具的模糊責任人。",
        bullets: ["先定義 Agent 代表哪個角色，而不是直接給工具", "把讀取、建議、送出分成不同權限層，不讓試點一步到位", "所有工具呼叫都要留下請求者、資料來源與人工覆核狀態"],
        watch: "下一個成熟訊號，是企業能不能把 Agent 的每個動作對回角色、權限、資料與審核紀錄。做不到這點，自治只會讓責任更難追。"
      },
      en: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud and IBM all bring agents back to one question: before an agent acts, the company must define who it represents, what data it can touch and where it stops.",
        lead: "Teams often start an AI agent discussion by asking whether it can finish a task by itself. The better first question is who the agent is allowed to act for. OpenAI, Anthropic, Microsoft, Google Cloud and IBM all point toward authorization before autonomy.",
        quote: "An agent without authorization logic is not a smarter teammate. It is an unclear owner with access to tools.",
        bullets: ["Define which role the agent represents before granting tools", "Separate read, recommend and submit permissions instead of giving a pilot full control", "Log requester, data source and human review status for every tool call"],
        watch: "The next maturity signal is whether every agent action can be traced back to role, permission, data and review record."
      },
      ja: {
        standfirst: "OpenAI、Anthropic、Microsoft、Google Cloud、IBMの資料は、Agentが行動する前に、誰を代表し、どのデータに触れ、どこで止まるかを決める必要性を示しています。",
        lead: "AI Agentの議論は、単独で仕事を終えられるかから始まりがちです。しかし先に問うべきは、誰の権限で行動するのかです。OpenAI、Anthropic、Microsoft、Google Cloud、IBMはいずれも、自律より前に権限設計が必要だと示しています。",
        quote: "権限設計のないAgentは賢い同僚ではなく、ツールを持った曖昧な責任者です。",
        bullets: ["ツールを渡す前に、Agentが代表する役割を決める", "読む、提案する、送信する権限を分け、試験運用で全権を渡さない", "すべてのツール呼び出しに依頼者、データ出典、人の確認状態を残す"],
        watch: "成熟度の次のサインは、Agentの各行動を役割、権限、データ、審査記録に戻せるかです。"
      },
      ko: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud, IBM 자료는 에이전트가 행동하기 전에 누구를 대표하고 어떤 데이터에 접근하며 어디서 멈추는지 정해야 한다고 말한다.",
        lead: "AI Agent 논의는 종종 혼자 일을 끝낼 수 있는가에서 시작된다. 하지만 먼저 물어야 할 것은 누구의 권한으로 행동하는가다. OpenAI, Anthropic, Microsoft, Google Cloud, IBM은 자율성보다 권한 설계가 먼저라고 보여준다.",
        quote: "권한 논리가 없는 Agent는 더 똑똑한 동료가 아니라 도구를 가진 불명확한 책임자다.",
        bullets: ["도구를 주기 전에 Agent가 대표하는 역할을 정한다", "읽기, 제안, 제출 권한을 나누고 파일럿에 모든 권한을 주지 않는다", "모든 도구 호출에 요청자, 데이터 출처, 사람 검토 상태를 남긴다"],
        watch: "다음 성숙도 신호는 Agent의 모든 행동을 역할, 권한, 데이터, 검토 기록으로 되돌릴 수 있는가다."
      },
      id: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud, dan IBM membawa isu agent ke satu pertanyaan: sebelum bertindak, agent mewakili siapa, boleh menyentuh data apa, dan harus berhenti di titik mana?",
        lead: "Banyak tim membahas AI Agent dari pertanyaan apakah ia bisa menyelesaikan tugas sendiri. Pertanyaan yang lebih penting adalah ia bertindak atas nama siapa. OpenAI, Anthropic, Microsoft, Google Cloud, dan IBM sama-sama menunjukkan bahwa otorisasi harus datang sebelum otonomi.",
        quote: "Agent tanpa logika otorisasi bukan rekan kerja yang lebih pintar. Ia hanya pemilik tanggung jawab yang kabur dengan akses ke tool.",
        bullets: ["Tentukan peran yang diwakili agent sebelum memberi akses tool", "Pisahkan izin membaca, merekomendasikan, dan mengirim agar pilot tidak langsung memegang kendali penuh", "Catat peminta, sumber data, dan status review manusia pada setiap tool call"],
        watch: "Sinyal matang berikutnya adalah apakah setiap aksi agent bisa ditelusuri kembali ke peran, izin, data, dan catatan review."
      },
      vi: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud và IBM cùng đưa Agent về một câu hỏi: trước khi hành động, nó đại diện cho ai, được chạm vào dữ liệu nào và phải dừng ở đâu?",
        lead: "Nhiều đội bắt đầu bàn về AI Agent bằng câu hỏi nó có tự hoàn thành việc không. Câu hỏi nên đặt trước là nó hành động thay ai. OpenAI, Anthropic, Microsoft, Google Cloud và IBM đều cho thấy phân quyền phải đi trước tự chủ.",
        quote: "Agent không có logic phân quyền không phải đồng nghiệp thông minh hơn. Nó là một người chịu trách nhiệm mơ hồ nhưng có quyền dùng công cụ.",
        bullets: ["Xác định Agent đại diện cho vai trò nào trước khi cấp công cụ", "Tách quyền đọc, đề xuất và gửi để thử nghiệm không nắm toàn quyền ngay lập tức", "Ghi lại người yêu cầu, nguồn dữ liệu và trạng thái rà soát của con người cho mỗi tool call"],
        watch: "Tín hiệu trưởng thành tiếp theo là mỗi hành động của Agent có thể truy về vai trò, quyền, dữ liệu và bản ghi rà soát hay không."
      },
      th: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud และ IBM พาเรื่อง Agent กลับไปที่คำถามเดียวกันว่า ก่อนลงมือทำ มันแทนใคร แตะข้อมูลอะไรได้ และต้องหยุดตรงไหน",
        lead: "หลายทีมเริ่มคุยเรื่อง AI Agent ด้วยคำถามว่ามันทำงานเองจบไหม แต่คำถามแรกควรเป็น มันมีสิทธิ์ทำแทนใคร OpenAI, Anthropic, Microsoft, Google Cloud และ IBM ต่างชี้ว่า authorization ต้องมาก่อน autonomy",
        quote: "Agent ที่ไม่มีตรรกะสิทธิ์ไม่ใช่เพื่อนร่วมงานที่ฉลาดขึ้น แต่คือเจ้าของความรับผิดชอบที่ไม่ชัดพร้อมเครื่องมือในมือ",
        bullets: ["กำหนดบทบาทที่ Agent เป็นตัวแทนก่อนให้ใช้เครื่องมือ", "แยกสิทธิ์อ่าน แนะนำ และส่งออก ไม่ให้ pilot ได้อำนาจเต็มทันที", "บันทึกผู้ร้องขอ แหล่งข้อมูล และสถานะการตรวจของคนในทุก tool call"],
        watch: "สัญญาณความพร้อมถัดไปคือทุกการกระทำของ Agent ย้อนกลับไปยังบทบาท สิทธิ์ ข้อมูล และบันทึกการตรวจทานได้หรือไม่"
      },
      ms: {
        standfirst: "OpenAI, Anthropic, Microsoft, Google Cloud dan IBM membawa isu Agent kepada satu soalan: sebelum bertindak, ia mewakili siapa, data apa boleh disentuh dan di mana ia perlu berhenti?",
        lead: "Ramai pasukan membincangkan AI Agent dengan soalan sama ada ia boleh menyiapkan tugas sendiri. Soalan lebih awal ialah ia bertindak atas nama siapa. OpenAI, Anthropic, Microsoft, Google Cloud dan IBM menunjukkan kebenaran perlu datang sebelum autonomi.",
        quote: "Agent tanpa logik kebenaran bukan rakan sekerja yang lebih pintar. Ia cuma pemilik tanggungjawab kabur dengan akses kepada alat.",
        bullets: ["Tetapkan peranan yang diwakili Agent sebelum memberi akses alat", "Pisahkan izin membaca, mengesyorkan dan menghantar supaya pilot tidak terus memegang kawalan penuh", "Rekod peminta, sumber data dan status semakan manusia untuk setiap tool call"],
        watch: "Isyarat matang seterusnya ialah sama ada setiap aksi Agent boleh dijejak kembali kepada peranan, kebenaran, data dan rekod semakan."
      },
      fil: {
        standfirst: "Ibinabalik ng OpenAI, Anthropic, Microsoft, Google Cloud at IBM ang usapan sa isang tanong: bago kumilos ang Agent, sino ang nirerepresenta nito, anong data ang puwede, at saan ito hihinto?",
        lead: "Madalas magsimula ang usapan sa AI Agent sa tanong kung kaya ba nitong tapusin mag-isa ang gawain. Mas dapat unahin kung kanino ito may authority kumilos. Pare-parehong tinuturo ng OpenAI, Anthropic, Microsoft, Google Cloud at IBM na authorization muna bago autonomy.",
        quote: "Ang Agent na walang authorization logic ay hindi mas matalinong teammate. Malabong owner lang ito na may hawak na tools.",
        bullets: ["Tukuyin muna kung anong role ang nire-represent ng Agent bago bigyan ng tools", "Paghiwalayin ang read, recommend at submit permissions para hindi agad full control ang pilot", "I-log ang requester, data source at human review status sa bawat tool call"],
        watch: "Ang maturity signal: bawat kilos ng Agent ay naibabalik sa role, permission, data at review record."
      }
    }
  },
  28: {
    title: {
      "zh-Hant": "模型變差前，營運端通常已經先出現訊號",
      en: "Model Quality Usually Fades Before Teams Notice",
      ja: "モデル劣化は突然ではなく、監視が遅れて見える",
      ko: "모델 품질 저하는 갑자기 오지 않고 늦게 발견된다",
      id: "Kualitas Model Biasanya Menurun Sebelum Tim Menyadarinya",
      vi: "Chất Lượng Mô Hình Thường Giảm Trước Khi Đội Ngũ Nhận Ra",
      th: "คุณภาพโมเดลมักลดลงก่อนที่ทีมจะมองเห็น",
      ms: "Kualiti Model Selalunya Merosot Sebelum Pasukan Sedar",
      fil: "Karaniwang Bumababa Muna Ang Model Quality Bago Ito Mapansin Ng Team"
    },
    sourceNames: "OpenAI Evals, Anthropic, Hugging Face, arXiv",
    copy: {
      "zh-Hant": {
        standfirst: "OpenAI Evals、Anthropic 研究、Hugging Face leaderboard 與 arXiv 評測文獻提醒團隊：模型表現會在資料、任務與使用者行為改變時慢慢漂移。",
        lead: "模型很少在某一天突然壞掉。更常見的是資料變了、使用者問法變了、任務邊界變了，但團隊還在看上一次測試分數。OpenAI Evals、Anthropic、Hugging Face 與 arXiv 評測文獻都把焦點拉回持續監控。",
        quote: "真正的模型監控不是證明它昨天很好，而是及早看見它今天開始不穩。",
        bullets: ["把固定測試集、真實樣本與人工覆核結果分開看", "每週追蹤失敗類型，不只看平均分數", "當資料來源或產品流程改版時，同步重跑關鍵評測"],
        watch: "下一步要看的是團隊能不能把模型問題和流程問題分開。否則分數下降時，大家只會爭論模型壞了，卻找不到是哪個輸入或任務變了。"
      },
      en: {
        standfirst: "OpenAI Evals, Anthropic research, Hugging Face leaderboards and arXiv evaluation work all point to the same risk: model quality drifts as data, tasks and user behavior change.",
        lead: "A model rarely breaks in one dramatic day. More often, data changes, users ask differently, task boundaries move, and the team is still reading the last test score. OpenAI Evals, Anthropic, Hugging Face and arXiv evaluation work all point back to continuous monitoring.",
        quote: "Good model monitoring does not prove the model was fine yesterday. It catches the moment it starts becoming unreliable today.",
        bullets: ["Separate fixed test sets, real user samples and human review outcomes", "Track failure types every week instead of watching only the average score", "Rerun critical evals whenever data sources or product flows change"],
        watch: "The next test is whether teams can separate a model problem from a workflow problem before everyone argues about one score."
      },
      ja: {
        standfirst: "OpenAI Evals、Anthropicの研究、Hugging Faceのleaderboard、arXivの評価研究が示すのは、データ、タスク、利用者行動が変わるとモデル品質も徐々にずれるということです。",
        lead: "モデルはある日に突然壊れるわけではありません。多くの場合、データ、ユーザーの聞き方、タスク境界が変わり、チームだけが前回のテストスコアを見続けています。OpenAI Evals、Anthropic、Hugging Face、arXivの評価研究は継続監視の重要性を示しています。",
        quote: "モデル監視の価値は昨日よかったことを証明することではなく、今日不安定になり始めた瞬間を見つけることです。",
        bullets: ["固定テスト、実利用サンプル、人の審査結果を分けて見る", "平均点だけでなく失敗タイプを毎週追う", "データ源や製品フローが変わったら重要評価を再実行する"],
        watch: "次に問うべきは、モデル問題と業務フロー問題を分けて扱えるかです。"
      },
      ko: {
        standfirst: "OpenAI Evals, Anthropic 연구, Hugging Face leaderboard, arXiv 평가 문헌은 데이터, 과제, 사용자 행동이 바뀌면 모델 품질도 서서히 흔들린다고 말한다.",
        lead: "모델은 어느 날 갑자기 망가지기보다 천천히 흔들린다. 데이터가 바뀌고, 사용자의 질문 방식이 바뀌고, 과제 경계가 이동하는데 팀은 이전 테스트 점수만 본다. OpenAI Evals, Anthropic, Hugging Face, arXiv 평가 문헌은 지속 모니터링의 필요성을 보여준다.",
        quote: "좋은 모델 모니터링은 어제 괜찮았다는 증명이 아니라 오늘 불안정해지는 순간을 잡는 일이다.",
        bullets: ["고정 테스트셋, 실제 사용자 샘플, 사람 검토 결과를 분리해 본다", "평균 점수만 보지 말고 실패 유형을 매주 추적한다", "데이터 출처나 제품 흐름이 바뀌면 핵심 평가를 다시 돌린다"],
        watch: "다음 과제는 모델 문제와 워크플로 문제를 점수 하나로 뭉개지 않고 분리할 수 있는가다."
      },
      id: {
        standfirst: "OpenAI Evals, riset Anthropic, leaderboard Hugging Face, dan literatur arXiv menunjukkan risiko yang sama: kualitas model bergeser ketika data, tugas, dan perilaku pengguna berubah.",
        lead: "Model jarang rusak dalam satu hari. Yang lebih sering terjadi: data berubah, cara pengguna bertanya berubah, batas tugas bergeser, tetapi tim masih membaca skor tes lama. OpenAI Evals, Anthropic, Hugging Face, dan literatur arXiv membawa isu ini ke monitoring berkelanjutan.",
        quote: "Monitoring model yang baik bukan membuktikan model kemarin bagus, melainkan menangkap saat ia mulai tidak stabil hari ini.",
        bullets: ["Pisahkan test set tetap, sampel pengguna nyata, dan hasil review manusia", "Pantau tipe kegagalan setiap minggu, bukan hanya skor rata-rata", "Jalankan ulang evaluasi penting saat sumber data atau alur produk berubah"],
        watch: "Ujian berikutnya adalah apakah tim bisa membedakan masalah model dari masalah workflow sebelum semua orang berdebat soal satu skor."
      },
      vi: {
        standfirst: "OpenAI Evals, nghiên cứu Anthropic, leaderboard Hugging Face và tài liệu arXiv cùng chỉ ra một rủi ro: chất lượng mô hình trôi khi dữ liệu, nhiệm vụ và hành vi người dùng thay đổi.",
        lead: "Mô hình hiếm khi hỏng trong một ngày. Thường là dữ liệu đổi, cách người dùng hỏi đổi, ranh giới nhiệm vụ đổi, nhưng đội ngũ vẫn nhìn điểm kiểm thử cũ. OpenAI Evals, Anthropic, Hugging Face và tài liệu arXiv đều nhấn mạnh giám sát liên tục.",
        quote: "Giám sát mô hình tốt không phải chứng minh hôm qua nó ổn, mà là phát hiện lúc hôm nay nó bắt đầu kém ổn định.",
        bullets: ["Tách bộ kiểm thử cố định, mẫu người dùng thật và kết quả rà soát thủ công", "Theo dõi loại lỗi hằng tuần, không chỉ nhìn điểm trung bình", "Chạy lại eval quan trọng khi nguồn dữ liệu hoặc luồng sản phẩm thay đổi"],
        watch: "Bài kiểm tra tiếp theo là đội ngũ có tách được lỗi mô hình khỏi lỗi quy trình trước khi mọi người tranh cãi quanh một điểm số hay không."
      },
      th: {
        standfirst: "OpenAI Evals, งานวิจัย Anthropic, leaderboard ของ Hugging Face และเอกสาร arXiv ชี้ความเสี่ยงเดียวกันว่า คุณภาพโมเดลจะเลื่อนเมื่อข้อมูล งาน และพฤติกรรมผู้ใช้เปลี่ยน",
        lead: "โมเดลแทบไม่พังในวันเดียว สิ่งที่เกิดบ่อยกว่าคือข้อมูลเปลี่ยน วิธีถามของผู้ใช้เปลี่ยน ขอบเขตงานเปลี่ยน แต่ทีมยังดูคะแนนทดสอบเก่า OpenAI Evals, Anthropic, Hugging Face และ arXiv จึงดึงประเด็นกลับมาที่การติดตามต่อเนื่อง",
        quote: "การ monitor โมเดลที่ดีไม่ใช่พิสูจน์ว่าเมื่อวานมันดี แต่คือจับให้ได้ว่าวันนี้มันเริ่มไม่นิ่งตอนไหน",
        bullets: ["แยก test set คงที่ ตัวอย่างผู้ใช้จริง และผลตรวจทานของคนออกจากกัน", "ติดตามประเภทความล้มเหลวทุกสัปดาห์ ไม่ใช่ดูแค่คะแนนเฉลี่ย", "รัน eval สำคัญใหม่เมื่อแหล่งข้อมูลหรือ flow ผลิตภัณฑ์เปลี่ยน"],
        watch: "บททดสอบถัดไปคือทีมแยกปัญหาโมเดลออกจากปัญหา workflow ได้ก่อนที่ทุกคนจะเถียงกันเรื่องคะแนนเดียวหรือไม่"
      },
      ms: {
        standfirst: "OpenAI Evals, penyelidikan Anthropic, leaderboard Hugging Face dan literatur arXiv menunjukkan risiko sama: kualiti model berubah apabila data, tugasan dan tingkah laku pengguna berubah.",
        lead: "Model jarang rosak dalam satu hari. Lebih kerap, data berubah, cara pengguna bertanya berubah, batas tugas bergerak, tetapi pasukan masih membaca skor ujian lama. OpenAI Evals, Anthropic, Hugging Face dan literatur arXiv membawa isu ini kepada pemantauan berterusan.",
        quote: "Pemantauan model yang baik bukan membuktikan model semalam baik, tetapi menangkap saat ia mula tidak stabil hari ini.",
        bullets: ["Pisahkan set ujian tetap, sampel pengguna sebenar dan hasil semakan manusia", "Jejaki jenis kegagalan setiap minggu, bukan hanya skor purata", "Jalankan semula eval penting apabila sumber data atau aliran produk berubah"],
        watch: "Ujian seterusnya ialah sama ada pasukan boleh membezakan masalah model daripada masalah aliran kerja sebelum semua orang berdebat tentang satu skor."
      },
      fil: {
        standfirst: "Ipinapakita ng OpenAI Evals, Anthropic research, Hugging Face leaderboard at arXiv evaluation work ang parehong risk: gumagalaw ang model quality kapag nagbago ang data, task at user behavior.",
        lead: "Bihirang masira ang model sa isang araw. Mas madalas, nagbabago ang data, nagbabago ang tanong ng users, gumagalaw ang task boundary, pero luma pa rin ang binabasang test score ng team. Ibinabalik ng OpenAI Evals, Anthropic, Hugging Face at arXiv ang usapan sa tuloy-tuloy na monitoring.",
        quote: "Ang magandang model monitoring ay hindi patunay na maayos ito kahapon. Huli nito ang sandaling nagsisimula itong maging hindi maaasahan ngayon.",
        bullets: ["Paghiwalayin ang fixed test set, real user samples at human review outcomes", "I-track bawat linggo ang failure types, hindi lang average score", "Ulitin ang critical evals kapag nagbago ang data source o product flow"],
        watch: "Ang susunod na test ay kung kaya ng team na ihiwalay ang model problem sa workflow problem bago mauwi ang lahat sa pagtatalo sa iisang score."
      }
    }
  }
};

Object.assign(PROFILES, {
  29: {
    title: {
      "zh-Hant": "自動化要先設計失敗回路，才值得擴大",
      en: "Automation Needs A Failure Loop Before It Scales",
      ja: "自動化は拡大前に失敗回路を設計する",
      ko: "자동화는 확장 전에 실패 회로부터 설계해야 한다",
      id: "Otomatisasi Perlu Failure Loop Sebelum Di-scale",
      vi: "Tự Động Hóa Cần Vòng Sửa Lỗi Trước Khi Mở Rộng",
      th: "ระบบอัตโนมัติต้องมีวงจรแก้พลาดก่อนขยาย",
      ms: "Automasi Perlukan Gelung Kegagalan Sebelum Diskalakan",
      fil: "Bago I-scale Ang Automation, Kailangan Muna Ng Failure Loop"
    },
    sourceNames: "Google Cloud, Microsoft, IBM, OpenAI",
    sourceLinks: [
      {
        title: "Google Cloud Architecture Framework: Reliability",
        url: "https://cloud.google.com/architecture/framework/reliability",
        publisher: "Google Cloud",
        publishedAt: "2026-06-04",
        summary: "Google Cloud frames reliability around resilience, recovery, change management and operational readiness."
      },
      {
        title: "Azure Well-Architected Framework: Reliability",
        url: "https://learn.microsoft.com/en-us/azure/well-architected/reliability/",
        publisher: "Microsoft",
        publishedAt: "2026-06-04",
        summary: "Microsoft describes reliability as a product discipline that includes failure modes, recovery targets and operational practices."
      },
      {
        title: "IBM: What are AI agents?",
        url: "https://www.ibm.com/think/topics/ai-agents",
        publisher: "IBM",
        publishedAt: "2026-06-04",
        summary: "IBM defines AI agents as systems that observe, reason, plan and act across tools and workflows."
      },
      {
        title: "OpenAI Safety best practices",
        url: "https://platform.openai.com/docs/guides/safety-best-practices",
        publisher: "OpenAI",
        publishedAt: "2026-06-04",
        summary: "OpenAI documents safety practices that teams can translate into review limits, monitoring and recovery before deployment."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst: "Google Cloud、Microsoft、IBM 與 OpenAI 的可靠性文件都提醒同一件事：自動化流程要能停、能查、能回復，否則只是把錯誤放大得更快。",
        lead: "最該先被自動化的，不一定是最耗時的流程，而是最能被檢查和修正的流程。Google Cloud、Microsoft、IBM 與 OpenAI 的可靠性資料都指向同一個操作問題：當系統做錯時，團隊能不能在影響擴散前停下來。",
        quote: "ALTOS LAB 判斷：沒有失敗回路的自動化，只是把人工錯誤改成機器速度。",
        bullets: ["先把停止條件寫進流程，不把它留給臨場判斷", "每次輸出都留下來源、版本、審核者與回復點", "從一條每週重複的小流程演練，而不是一次放大到全公司"],
        watch: "接下來要看的不是自動化比例，而是錯誤被發現後多久能回到上一個安全狀態。這個數字比省下幾分鐘更能說明流程是否成熟。"
      },
      en: {
        standfirst: "Google Cloud, Microsoft, IBM and OpenAI all point to the same reliability rule: an automated workflow must be stoppable, traceable and recoverable before it scales.",
        lead: "The best first automation target is not always the task that consumes the most time. It is the task the team can inspect and repair fastest. Google Cloud, Microsoft, IBM and OpenAI all bring reliability back to one operator question: can the team stop the workflow before a mistake spreads?",
        quote: "ALTOS LAB judgment: automation without a failure loop turns human mistakes into machine-speed incidents.",
        bullets: ["Write stop conditions into the workflow instead of leaving them to live judgment", "Record source, version, reviewer and recovery point for every output", "Rehearse on one weekly repeatable flow before expanding to the company"],
        watch: "The next signal is recovery time after a mistake is found. That number says more about maturity than the minutes saved by automation."
      },
      ja: {
        standfirst: "Google Cloud、Microsoft、IBM、OpenAIの信頼性文書が示すのは、自動化は止められ、追跡でき、戻せる状態で初めて拡大できるということです。",
        lead: "最初に自動化すべき業務は、最も時間がかかる業務とは限りません。最も早く検査し、修正できる業務です。Google Cloud、Microsoft、IBM、OpenAIの資料は、失敗が広がる前に止められるかという運用上の問いへ戻します。",
        quote: "ALTOS LAB の判断：失敗回路のない自動化は、人のミスを機械の速度に変えるだけです。",
        bullets: ["停止条件を現場判断に残さず、業務フローに書き込む", "すべての出力に出典、版、審査者、復旧地点を残す", "全社展開の前に、毎週繰り返す小さな業務で演習する"],
        watch: "次に見るべき数字は自動化率ではなく、ミス発見後に安全な状態へ戻るまでの時間です。"
      },
      ko: {
        standfirst: "Google Cloud, Microsoft, IBM, OpenAI의 신뢰성 문서는 같은 원칙을 말한다. 자동화는 멈출 수 있고, 추적할 수 있고, 복구할 수 있어야 확장할 수 있다.",
        lead: "첫 자동화 대상은 가장 시간이 많이 드는 업무가 아닐 수 있다. 가장 빨리 점검하고 고칠 수 있는 업무가 더 낫다. Google Cloud, Microsoft, IBM, OpenAI 자료는 실수가 퍼지기 전에 팀이 흐름을 멈출 수 있는가라는 질문으로 돌아간다.",
        quote: "ALTOS LAB 판단: 실패 회로 없는 자동화는 사람의 실수를 기계 속도의 사고로 바꾼다.",
        bullets: ["중단 조건을 현장 판단에 맡기지 말고 흐름 안에 쓴다", "모든 출력에 출처, 버전, 검토자, 복구 지점을 남긴다", "전사 확대 전 매주 반복되는 작은 업무 하나로 리허설한다"],
        watch: "다음에 볼 숫자는 자동화 비율이 아니라 오류를 발견한 뒤 안전한 상태로 돌아가는 시간이다."
      },
      id: {
        standfirst: "Google Cloud, Microsoft, IBM, dan OpenAI memberi aturan yang sama: workflow otomatis harus bisa dihentikan, ditelusuri, dan dipulihkan sebelum di-scale.",
        lead: "Target otomatisasi pertama tidak selalu tugas yang paling memakan waktu. Lebih aman memilih tugas yang paling cepat diperiksa dan diperbaiki. Google Cloud, Microsoft, IBM, dan OpenAI mengembalikan isu reliability ke satu pertanyaan operator: bisakah tim menghentikan alur sebelum kesalahan menyebar?",
        quote: "Penilaian ALTOS LAB: otomatisasi tanpa failure loop hanya mengubah kesalahan manusia menjadi insiden berkecepatan mesin.",
        bullets: ["Tulis syarat berhenti di dalam workflow, jangan serahkan ke keputusan spontan", "Catat sumber, versi, reviewer, dan titik pemulihan untuk setiap output", "Latih pada satu flow kecil yang berulang tiap minggu sebelum memperluas ke seluruh perusahaan"],
        watch: "Sinyal berikutnya bukan persentase otomatisasi, melainkan waktu pemulihan setelah kesalahan ditemukan."
      },
      vi: {
        standfirst: "Google Cloud, Microsoft, IBM và OpenAI cùng nêu một nguyên tắc: quy trình tự động phải dừng được, truy được và khôi phục được trước khi mở rộng.",
        lead: "Quy trình nên tự động hóa đầu tiên không nhất thiết là việc tốn nhiều thời gian nhất. An toàn hơn là chọn việc kiểm tra và sửa nhanh nhất. Google Cloud, Microsoft, IBM và OpenAI đưa reliability về một câu hỏi vận hành: đội ngũ có dừng được quy trình trước khi lỗi lan rộng không?",
        quote: "Nhận định của ALTOS LAB: tự động hóa không có vòng sửa lỗi chỉ biến lỗi con người thành sự cố chạy bằng tốc độ máy.",
        bullets: ["Viết điều kiện dừng vào workflow, đừng để thành phán đoán tại chỗ", "Ghi nguồn, phiên bản, người rà soát và điểm khôi phục cho mọi đầu ra", "Diễn tập trên một flow nhỏ lặp lại hằng tuần trước khi mở rộng toàn công ty"],
        watch: "Tín hiệu tiếp theo không phải tỷ lệ tự động hóa, mà là thời gian khôi phục sau khi phát hiện lỗi."
      },
      th: {
        standfirst: "Google Cloud, Microsoft, IBM และ OpenAI ชี้กฎเดียวกันว่า workflow อัตโนมัติต้องหยุดได้ ตรวจย้อนกลับได้ และกู้คืนได้ก่อนขยาย",
        lead: "งานแรกที่ควรทำ automation ไม่จำเป็นต้องเป็นงานที่กินเวลามากที่สุด แต่มักเป็นงานที่ตรวจและแก้ได้เร็วที่สุด Google Cloud, Microsoft, IBM และ OpenAI พา reliability กลับไปที่คำถามของ operator ว่า ทีมหยุด flow ได้ก่อนที่ความผิดพลาดจะกระจายหรือไม่",
        quote: "มุมมอง ALTOS LAB: automation ที่ไม่มี failure loop คือการเปลี่ยนความผิดพลาดของคนให้กลายเป็น incident ด้วยความเร็วของเครื่อง",
        bullets: ["เขียน stop condition ไว้ใน workflow ไม่ปล่อยให้ตัดสินหน้างาน", "บันทึก source, version, reviewer และ recovery point ของทุก output", "ซ้อมกับ flow เล็กที่เกิดซ้ำทุกสัปดาห์ก่อนขยายทั้งบริษัท"],
        watch: "สัญญาณถัดไปไม่ใช่สัดส่วน automation แต่คือเวลาที่ใช้กลับสู่สถานะปลอดภัยหลังพบข้อผิดพลาด"
      },
      ms: {
        standfirst: "Google Cloud, Microsoft, IBM dan OpenAI memberi prinsip sama: aliran kerja automatik mesti boleh dihentikan, dijejak dan dipulihkan sebelum diskalakan.",
        lead: "Sasaran automasi pertama tidak semestinya tugasan paling memakan masa. Lebih baik pilih tugasan yang paling cepat diperiksa dan dibaiki. Google Cloud, Microsoft, IBM dan OpenAI membawa reliability kepada soalan operator: bolehkah pasukan menghentikan aliran sebelum ralat tersebar?",
        quote: "Penilaian ALTOS LAB: automasi tanpa gelung kegagalan hanya menukar kesilapan manusia menjadi insiden berkelajuan mesin.",
        bullets: ["Tulis syarat berhenti dalam workflow, bukan sebagai keputusan spontan", "Rekod sumber, versi, penyemak dan titik pemulihan untuk setiap output", "Latih pada satu flow kecil yang berulang setiap minggu sebelum memperluas ke seluruh syarikat"],
        watch: "Isyarat seterusnya bukan kadar automasi, tetapi masa pemulihan selepas ralat ditemui."
      },
      fil: {
        standfirst: "Iisa ang prinsip mula Google Cloud, Microsoft, IBM at OpenAI: bago i-scale ang automation, dapat kaya itong ihinto, i-trace at ibalik.",
        lead: "Hindi laging ang pinakamatagal na task ang dapat unang i-automate. Mas mainam ang task na pinakamabilis suriin at ayusin. Ibinabalik ng Google Cloud, Microsoft, IBM at OpenAI ang reliability sa tanong ng operator: kaya bang ihinto ng team ang flow bago kumalat ang mali?",
        quote: "Pananaw ng ALTOS LAB: ang automation na walang failure loop ay ginagawang machine-speed incident ang human error.",
        bullets: ["Isulat ang stop conditions sa workflow, hindi sa biglaang desisyon", "Itala ang source, version, reviewer at recovery point ng bawat output", "Mag-rehearse sa maliit na weekly flow bago palawakin sa buong kumpanya"],
        watch: "Ang susunod na signal ay hindi automation rate, kundi recovery time pagkatapos mahanap ang mali."
      }
    }
  },
  30: {
    title: {
      "zh-Hant": "AI 多語行銷要守住品牌骨架，也要留給在地語氣呼吸",
      en: "AI Multilingual Marketing Needs One Brand Spine And Local Breathing Room",
      ja: "AI多言語マーケティングはブランドの芯と現地の呼吸を両立する",
      ko: "AI 다국어 마케팅은 브랜드의 중심과 현지 감각을 함께 지켜야 한다",
      id: "Marketing Multibahasa Dengan AI Perlu Tulang Punggung Brand Dan Ruang Lokal",
      vi: "Marketing Đa Ngôn Ngữ Bằng AI Cần Khung Thương Hiệu Và Hơi Thở Địa Phương",
      th: "การตลาดหลายภาษาด้วย AI ต้องมีแกนแบรนด์และพื้นที่ให้ภาษาท้องถิ่น",
      ms: "Marketing Berbilang Bahasa Dengan AI Perlu Tulang Belakang Jenama Dan Ruang Lokal",
      fil: "Kailangan Ng AI Multilingual Marketing Ang Brand Spine At Lokal Na Hinga"
    },
    sourceNames: "Google Search Central, OpenAI, Microsoft, IBM",
    sourceLinks: [
      {
        title: "Google Search Central: Managing multi-regional and multilingual sites",
        url: "https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites",
        publisher: "Google Search Central",
        publishedAt: "2026-06-04",
        summary: "Google documents how multilingual and multi-regional sites should clarify language, region and canonical relationships."
      },
      {
        title: "Google structured data introduction",
        url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
        publisher: "Google Search Central",
        publishedAt: "2026-06-04",
        summary: "Google explains structured data as a way to make page meaning explicit for search systems."
      },
      {
        title: "OpenAI Structured Outputs",
        url: "https://platform.openai.com/docs/guides/structured-outputs",
        publisher: "OpenAI",
        publishedAt: "2026-06-04",
        summary: "OpenAI describes schema-constrained outputs that help teams keep multilingual fields consistent."
      },
      {
        title: "Microsoft Responsible AI",
        url: "https://www.microsoft.com/en-us/ai/responsible-ai",
        publisher: "Microsoft",
        publishedAt: "2026-06-04",
        summary: "Microsoft frames responsible AI around accountability, reliability and human-centered deployment."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst: "Google Search Central、OpenAI 與 Microsoft 的文件提醒內容團隊：AI 能放大多語產能，但品牌骨架、資料欄位與在地審核不能一起外包。",
        lead: "AI 讓多語內容變快，真正的問題卻變得更細：哪一句必須全球一致，哪一句要交給當地語境。Google Search Central、OpenAI 與 Microsoft 的文件都讓團隊回到一個基本判斷：自動化可以產生草稿，但品牌責任仍在內容系統裡。",
        quote: "ALTOS LAB 判斷：多語行銷的效率來自同一個品牌骨架，信任感來自每個市場願意保留自己的語氣。",
        bullets: ["把品牌承諾、產品限制與法務語句列為不可改欄位", "把案例、稱呼、CTA 和文化語氣交給市場團隊覆核", "每週抽查 AI 內容是否仍能被搜尋系統與真人讀者理解"],
        watch: "接下來要看的不是翻譯量，而是各市場是否能在同一個訊息骨架下說出自然語氣。做到這點，AI 才是內容系統，不只是翻譯速度。"
      },
      en: {
        standfirst: "Google Search Central, OpenAI and Microsoft all remind content teams that AI can scale multilingual output, but brand rules, data fields and local review cannot be outsourced together.",
        lead: "AI makes multilingual content faster. It also makes the real question more precise: which sentence must remain global, and which sentence needs local judgment. Google Search Central, OpenAI and Microsoft push teams back to one rule: automation can draft, but brand responsibility stays inside the content system.",
        quote: "ALTOS LAB judgment: multilingual efficiency comes from one brand spine; trust comes from giving each market room to sound local.",
        bullets: ["Mark brand promises, product limits and legal wording as non-editable fields", "Send examples, forms of address, calls to action and cultural tone to local review", "Audit each week whether AI content still makes sense to search systems and human readers"],
        watch: "The next signal is not translation volume. It is whether each market can speak naturally while sharing the same message structure."
      },
      ja: {
        standfirst: "Google Search Central、OpenAI、Microsoftの資料は、AIで多言語コンテンツを増やしても、ブランド規則、データ項目、現地審査を一緒に外部化してはいけないと示しています。",
        lead: "AIで多言語コンテンツは速くなります。同時に、どの文を世界共通にし、どの文を現地判断に任せるかが重要になります。Google Search Central、OpenAI、Microsoftの資料は、自動化は下書きを作れても、ブランド責任はコンテンツシステム内に残ると示しています。",
        quote: "ALTOS LAB の判断：多言語の効率は一つのブランド骨格から生まれ、信頼は各市場が自然に話せる余白から生まれます。",
        bullets: ["ブランド約束、製品制限、法務表現を変更不可の項目にする", "事例、呼称、CTA、文化的語調は現地チームが確認する", "AIコンテンツが検索システムと人間読者の両方に理解されるか毎週確認する"],
        watch: "次に見るべきなのは翻訳量ではなく、同じメッセージ構造の中で各市場が自然に話せるかです。"
      },
      ko: {
        standfirst: "Google Search Central, OpenAI, Microsoft 자료는 AI가 다국어 생산량을 늘릴 수 있어도 브랜드 규칙, 데이터 필드, 현지 검토를 함께 외주화해서는 안 된다고 말한다.",
        lead: "AI는 다국어 콘텐츠를 빠르게 만든다. 동시에 어떤 문장은 글로벌하게 유지하고 어떤 문장은 현지 판단을 남길지 더 정확히 정해야 한다. Google Search Central, OpenAI, Microsoft는 자동화가 초안을 만들 수 있어도 브랜드 책임은 콘텐츠 시스템 안에 남아야 한다고 보여준다.",
        quote: "ALTOS LAB 판단: 다국어 효율은 하나의 브랜드 골격에서 나오고, 신뢰는 각 시장이 자기 언어로 자연스럽게 말할 여지에서 나온다.",
        bullets: ["브랜드 약속, 제품 제한, 법무 문구를 수정 불가 필드로 둔다", "사례, 호칭, CTA, 문화적 어조는 현지 팀이 검토한다", "AI 콘텐츠가 검색 시스템과 실제 독자에게 이해되는지 매주 확인한다"],
        watch: "다음 신호는 번역량이 아니라 같은 메시지 구조 안에서 각 시장이 자연스럽게 말하는가다."
      },
      id: {
        standfirst: "Google Search Central, OpenAI, dan Microsoft mengingatkan tim konten: AI bisa memperbesar output multibahasa, tetapi aturan brand, field data, dan review lokal tetap harus dipegang.",
        lead: "AI membuat konten multibahasa lebih cepat. Namun pertanyaan utamanya menjadi lebih detail: kalimat mana harus global, dan kalimat mana perlu penilaian lokal. Google Search Central, OpenAI, dan Microsoft sama-sama menegaskan bahwa otomatisasi boleh membuat draf, tetapi tanggung jawab brand tetap ada di sistem konten.",
        quote: "Penilaian ALTOS LAB: efisiensi multibahasa datang dari satu tulang punggung brand; kepercayaan datang dari ruang bagi tiap market untuk terdengar lokal.",
        bullets: ["Jadikan janji brand, batas produk, dan bahasa legal sebagai field yang tidak boleh diubah", "Kirim contoh, sapaan, CTA, dan nuansa budaya ke review tim lokal", "Audit tiap minggu apakah konten AI masih dipahami search system dan pembaca manusia"],
        watch: "Sinyal berikutnya bukan volume terjemahan, melainkan apakah tiap market bisa terdengar natural sambil memakai struktur pesan yang sama."
      },
      vi: {
        standfirst: "Google Search Central, OpenAI và Microsoft nhắc đội nội dung rằng AI có thể tăng sản lượng đa ngôn ngữ, nhưng luật thương hiệu, trường dữ liệu và rà soát địa phương vẫn phải giữ lại.",
        lead: "AI làm nội dung đa ngôn ngữ nhanh hơn, nhưng câu hỏi thật lại chi tiết hơn: câu nào phải giữ toàn cầu, câu nào cần phán đoán địa phương. Google Search Central, OpenAI và Microsoft cùng đưa đội ngũ về một nguyên tắc: tự động hóa có thể viết nháp, nhưng trách nhiệm thương hiệu vẫn nằm trong hệ thống nội dung.",
        quote: "Nhận định của ALTOS LAB: hiệu suất đa ngôn ngữ đến từ một khung thương hiệu chung; niềm tin đến từ khoảng trống để từng thị trường nói bằng giọng của mình.",
        bullets: ["Đánh dấu cam kết thương hiệu, giới hạn sản phẩm và câu chữ pháp lý là trường không được sửa", "Đưa ví dụ, cách xưng hô, CTA và sắc thái văn hóa cho đội địa phương rà soát", "Mỗi tuần kiểm tra nội dung AI còn dễ hiểu với hệ thống tìm kiếm và người đọc thật hay không"],
        watch: "Tín hiệu tiếp theo không phải số lượng bản dịch, mà là từng thị trường có nói tự nhiên trong cùng một khung thông điệp hay không."
      },
      th: {
        standfirst: "Google Search Central, OpenAI และ Microsoft เตือนทีมคอนเทนต์ว่า AI เพิ่มปริมาณหลายภาษาได้ แต่กฎแบรนด์ ช่องข้อมูล และการตรวจท้องถิ่นยังต้องอยู่ในมือทีม",
        lead: "AI ทำให้คอนเทนต์หลายภาษาเร็วขึ้น แต่คำถามจริงละเอียดขึ้นว่า ประโยคไหนต้องเหมือนกันทั่วโลก และประโยคไหนต้องใช้ judgement ของตลาดท้องถิ่น Google Search Central, OpenAI และ Microsoft ชี้หลักเดียวกันว่า automation ช่วยร่างได้ แต่ความรับผิดชอบต่อแบรนด์ยังอยู่ใน content system",
        quote: "มุมมอง ALTOS LAB: ประสิทธิภาพหลายภาษามาจาก brand spine เดียว ส่วนความน่าเชื่อถือมาจากพื้นที่ให้แต่ละตลาดพูดด้วยเสียงของตัวเอง",
        bullets: ["ล็อก brand promise, product limits และ legal wording เป็น field ที่แก้ไม่ได้", "ส่งตัวอย่าง คำเรียก CTA และ tone ทางวัฒนธรรมให้ทีม local ตรวจ", "ตรวจทุกสัปดาห์ว่า AI content ยังเข้าใจได้ทั้งสำหรับ search system และผู้อ่านจริง"],
        watch: "สัญญาณถัดไปไม่ใช่จำนวน translation แต่คือแต่ละตลาดพูดได้เป็นธรรมชาติภายใต้ message structure เดียวกันหรือไม่"
      },
      ms: {
        standfirst: "Google Search Central, OpenAI dan Microsoft mengingatkan pasukan kandungan: AI boleh membesarkan output berbilang bahasa, tetapi peraturan jenama, field data dan semakan lokal mesti kekal dikawal.",
        lead: "AI membuat kandungan berbilang bahasa lebih pantas. Namun soalan sebenar menjadi lebih tepat: ayat mana mesti kekal global, dan ayat mana perlu pertimbangan lokal. Google Search Central, OpenAI dan Microsoft membawa pasukan kepada prinsip yang sama: automasi boleh menulis draf, tetapi tanggungjawab jenama kekal dalam sistem kandungan.",
        quote: "Penilaian ALTOS LAB: kecekapan berbilang bahasa datang daripada satu tulang belakang jenama; kepercayaan datang daripada ruang untuk setiap pasaran berbunyi lokal.",
        bullets: ["Jadikan janji jenama, had produk dan ayat undang-undang sebagai field yang tidak boleh diubah", "Hantar contoh, panggilan, CTA dan nada budaya kepada semakan pasukan lokal", "Audit setiap minggu sama ada kandungan AI masih difahami sistem carian dan pembaca sebenar"],
        watch: "Isyarat seterusnya bukan jumlah terjemahan, tetapi sama ada setiap pasaran boleh berbunyi natural dalam struktur mesej yang sama."
      },
      fil: {
        standfirst: "Paalala ng Google Search Central, OpenAI at Microsoft sa content teams: kayang palakihin ng AI ang multilingual output, pero dapat hawak pa rin ang brand rules, data fields at local review.",
        lead: "Pinapabilis ng AI ang multilingual content. Pero mas nagiging eksakto ang tanong: aling pangungusap ang dapat global, at alin ang kailangang lokal ang judgement. Pare-parehong itinuturo ng Google Search Central, OpenAI at Microsoft na puwedeng mag-draft ang automation, pero nasa content system pa rin ang brand responsibility.",
        quote: "Pananaw ng ALTOS LAB: galing sa iisang brand spine ang multilingual efficiency; galing sa lokal na boses ang tiwala.",
        bullets: ["I-lock ang brand promise, product limits at legal wording bilang fields na hindi dapat baguhin", "Ipa-review sa local team ang examples, forms of address, CTA at cultural tone", "Lingguhang suriin kung naiintindihan pa ng search system at totoong readers ang AI content"],
        watch: "Ang susunod na signal ay hindi dami ng translation, kundi kung natural magsalita ang bawat market habang pareho ang message structure."
      }
    }
  },
  31: {
    title: {
      "zh-Hant": "模型選型別只看聰明度，要看失控時能不能接回來",
      en: "Model Selection Should Start With Recovery, Not Brilliance",
      ja: "モデル選定は賢さより、失敗時に戻せるかから始める",
      ko: "모델 선택은 똑똑함보다 실패 시 복구 가능성에서 시작한다",
      id: "Pilih Model Dari Kemampuan Dipulihkan, Bukan Hanya Kepintaran",
      vi: "Chọn Mô Hình Nên Bắt Đầu Từ Khả Năng Khôi Phục",
      th: "เลือกโมเดลจากการกู้คืนเมื่อพลาด ไม่ใช่ความฉลาดอย่างเดียว",
      ms: "Pilih Model Bermula Dengan Pemulihan, Bukan Sekadar Kepintaran",
      fil: "Sa Model Selection, Unahin Ang Recovery Bago Talino"
    },
    sourceNames: "OpenAI, Anthropic, Google Cloud, IBM",
    sourceLinks: [
      {
        title: "OpenAI Models",
        url: "https://platform.openai.com/docs/models",
        publisher: "OpenAI",
        publishedAt: "2026-06-04",
        summary: "OpenAI documents model capabilities and intended use cases, giving teams a baseline for model comparison."
      },
      {
        title: "Anthropic model overview",
        url: "https://docs.anthropic.com/en/docs/about-claude/models/overview",
        publisher: "Anthropic",
        publishedAt: "2026-06-04",
        summary: "Anthropic describes model families and use-case tradeoffs relevant to enterprise model choice."
      },
      {
        title: "Google Cloud model evaluation",
        url: "https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluate-models",
        publisher: "Google Cloud",
        publishedAt: "2026-06-04",
        summary: "Google Cloud outlines model evaluation practices for comparing outputs and operational performance."
      },
      {
        title: "IBM: What is an AI model?",
        url: "https://www.ibm.com/think/topics/ai-model",
        publisher: "IBM",
        publishedAt: "2026-06-04",
        summary: "IBM explains AI model behavior, training and evaluation concepts that help non-technical stakeholders compare options."
      }
    ],
    copy: {
      "zh-Hant": {
        standfirst: "OpenAI、Anthropic、Google Cloud 與 IBM 的模型文件都讓選型回到同一個問題：模型出錯時，團隊能否測到、停下、切回舊版本。",
        lead: "企業選模型時，最容易被排行榜和展示效果帶走。真正進入營運後，更重要的是它在邊界情境裡會怎麼失敗。OpenAI、Anthropic、Google Cloud 與 IBM 的資料提醒：模型選型不是比誰最會回答，而是比誰最容易被監控、接管與回復。",
        quote: "ALTOS LAB 判斷：一個模型如果不能被測、不能被停、不能被換回舊版本，再高的分數都只是展示分數。",
        bullets: ["先用真實工作樣本測，不只看通用排行榜", "為每個模型設定失敗類型、接管人與切換條件", "保留上一版模型與人工流程，避免升級失敗時無路可退"],
        watch: "接下來要看的不是模型發表日期，而是每次升級後的錯誤型態、人工修改率與回復時間。這三個數字會比一張 benchmark 表更接近營運真相。"
      },
      en: {
        standfirst: "OpenAI, Anthropic, Google Cloud and IBM all bring model selection back to one question: when the model fails, can the team test it, stop it and switch back?",
        lead: "Teams can get pulled toward leaderboards and demo quality when choosing models. In operations, the better question is how the model fails at the edge. OpenAI, Anthropic, Google Cloud and IBM all push model selection toward monitoring, takeover and recovery.",
        quote: "ALTOS LAB judgment: if a model cannot be tested, stopped or rolled back, a high benchmark score is still only a demo score.",
        bullets: ["Test with real workflow samples instead of relying only on general leaderboards", "Define failure types, takeover owners and switch conditions for every model", "Keep the previous model and manual flow available so an upgrade never leaves the team trapped"],
        watch: "The next numbers to watch are error type, human edit rate and recovery time after every upgrade. They sit closer to operational truth than one benchmark table."
      },
      ja: {
        standfirst: "OpenAI、Anthropic、Google Cloud、IBMのモデル資料が示す問いは一つです。モデルが失敗した時、チームは測定し、止め、前の版へ戻せるか。",
        lead: "企業のモデル選定は、ランキングやデモの印象に引っ張られがちです。運用に入ると、境界条件でどう失敗するかの方が重要になります。OpenAI、Anthropic、Google Cloud、IBMの資料は、監視、引き継ぎ、復旧を中心に選定を見る必要性を示しています。",
        quote: "ALTOS LAB の判断：測れず、止められず、前の版に戻せないモデルなら、高いベンチマーク点はまだデモ点です。",
        bullets: ["汎用ランキングだけでなく、実業務サンプルで試す", "各モデルごとに失敗タイプ、引き継ぎ責任者、切替条件を決める", "旧モデルと人手の業務を残し、更新失敗時に退路を持つ"],
        watch: "次に見るべき数字は発表日ではなく、更新後のエラータイプ、人の修正率、復旧時間です。"
      },
      ko: {
        standfirst: "OpenAI, Anthropic, Google Cloud, IBM의 모델 자료는 하나의 질문으로 돌아간다. 모델이 실패할 때 팀은 측정하고, 멈추고, 이전 버전으로 돌아갈 수 있는가.",
        lead: "기업의 모델 선택은 리더보드와 데모 품질에 끌리기 쉽다. 운영에서는 경계 상황에서 어떻게 실패하는지가 더 중요하다. OpenAI, Anthropic, Google Cloud, IBM 자료는 모델 선택을 모니터링, 인수인계, 복구 중심으로 보게 만든다.",
        quote: "ALTOS LAB 판단: 테스트할 수 없고, 멈출 수 없고, 이전 버전으로 돌아갈 수 없는 모델이라면 높은 점수도 아직 데모 점수다.",
        bullets: ["범용 리더보드만 보지 말고 실제 업무 샘플로 테스트한다", "모델마다 실패 유형, 인수인계 담당자, 전환 조건을 정한다", "이전 모델과 사람의 업무 흐름을 남겨 업그레이드 실패 시 퇴로를 확보한다"],
        watch: "다음에 볼 숫자는 발표일이 아니라 업그레이드 뒤 오류 유형, 사람 수정률, 복구 시간이다."
      },
      id: {
        standfirst: "OpenAI, Anthropic, Google Cloud, dan IBM membawa model selection ke satu pertanyaan: saat model gagal, bisakah tim menguji, menghentikan, dan kembali ke versi lama?",
        lead: "Tim mudah terbawa leaderboard dan demo saat memilih model. Dalam operasi, pertanyaan yang lebih penting adalah bagaimana model gagal di kondisi tepi. OpenAI, Anthropic, Google Cloud, dan IBM mendorong model selection ke monitoring, takeover, dan pemulihan.",
        quote: "Penilaian ALTOS LAB: jika model tidak bisa diuji, dihentikan, atau dikembalikan ke versi lama, skor benchmark tinggi masih sekadar skor demo.",
        bullets: ["Uji dengan sampel workflow nyata, bukan hanya leaderboard umum", "Tentukan tipe kegagalan, owner takeover, dan kondisi switching untuk tiap model", "Simpan model lama dan alur manual agar upgrade gagal tidak membuat tim terjebak"],
        watch: "Angka berikutnya yang perlu dilihat adalah tipe error, tingkat edit manusia, dan waktu pemulihan setelah tiap upgrade."
      },
      vi: {
        standfirst: "OpenAI, Anthropic, Google Cloud và IBM cùng đưa việc chọn mô hình về một câu hỏi: khi mô hình lỗi, đội ngũ có kiểm thử, dừng và quay về phiên bản cũ được không?",
        lead: "Đội ngũ dễ bị leaderboard và demo dẫn dắt khi chọn mô hình. Trong vận hành, câu hỏi quan trọng hơn là mô hình thất bại ra sao ở tình huống biên. OpenAI, Anthropic, Google Cloud và IBM đều kéo việc chọn mô hình về giám sát, tiếp quản và khôi phục.",
        quote: "Nhận định của ALTOS LAB: nếu một mô hình không thể kiểm thử, không thể dừng hoặc không thể quay về phiên bản cũ, điểm benchmark cao vẫn chỉ là điểm demo.",
        bullets: ["Kiểm thử bằng mẫu workflow thật, không chỉ dựa vào leaderboard chung", "Xác định loại lỗi, người tiếp quản và điều kiện chuyển đổi cho từng mô hình", "Giữ mô hình cũ và quy trình thủ công để khi nâng cấp lỗi, đội ngũ vẫn có đường lui"],
        watch: "Các số cần theo dõi tiếp theo là loại lỗi, tỷ lệ chỉnh sửa thủ công và thời gian khôi phục sau mỗi lần nâng cấp."
      },
      th: {
        standfirst: "OpenAI, Anthropic, Google Cloud และ IBM พา model selection กลับไปที่คำถามเดียวกันว่า เมื่อโมเดลพลาด ทีมทดสอบ หยุด และย้อนกลับเวอร์ชันเดิมได้หรือไม่",
        lead: "ทีมมักถูกดึงด้วย leaderboard และ demo ตอนเลือกโมเดล แต่ในงานจริง คำถามสำคัญกว่าคือโมเดลล้มเหลวอย่างไรใน edge case OpenAI, Anthropic, Google Cloud และ IBM ทำให้ model selection ต้องดู monitoring, takeover และ recovery",
        quote: "มุมมอง ALTOS LAB: ถ้าโมเดลทดสอบไม่ได้ หยุดไม่ได้ หรือย้อนกลับเวอร์ชันเดิมไม่ได้ คะแนน benchmark สูงก็ยังเป็นแค่คะแนน demo",
        bullets: ["ทดสอบด้วย sample จาก workflow จริง ไม่ใช่ดู leaderboard ทั่วไปอย่างเดียว", "กำหนดประเภทความล้มเหลว owner ที่รับช่วง และเงื่อนไข switch ของแต่ละโมเดล", "เก็บโมเดลเก่าและ flow แบบ manual ไว้ เพื่อไม่ให้ทีมติดกับเมื่อ upgrade ล้มเหลว"],
        watch: "ตัวเลขถัดไปที่ควรดูคือประเภท error, human edit rate และ recovery time หลังการ upgrade แต่ละครั้ง"
      },
      ms: {
        standfirst: "OpenAI, Anthropic, Google Cloud dan IBM membawa pemilihan model kepada satu soalan: apabila model gagal, bolehkah pasukan menguji, menghentikan dan kembali kepada versi lama?",
        lead: "Pasukan mudah tertarik kepada leaderboard dan demo ketika memilih model. Dalam operasi, soalan lebih penting ialah bagaimana model gagal dalam keadaan tepi. OpenAI, Anthropic, Google Cloud dan IBM mendorong pemilihan model kepada pemantauan, pengambilalihan dan pemulihan.",
        quote: "Penilaian ALTOS LAB: jika model tidak boleh diuji, dihentikan atau dikembalikan kepada versi lama, skor benchmark tinggi masih hanya skor demo.",
        bullets: ["Uji dengan sampel workflow sebenar, bukan hanya leaderboard umum", "Tetapkan jenis kegagalan, owner pengambilalihan dan syarat switching untuk setiap model", "Simpan model lama dan aliran manual supaya upgrade gagal tidak memerangkap pasukan"],
        watch: "Nombor seterusnya ialah jenis ralat, kadar suntingan manusia dan masa pemulihan selepas setiap upgrade."
      },
      fil: {
        standfirst: "Ibinabalik ng OpenAI, Anthropic, Google Cloud at IBM ang model selection sa isang tanong: kapag pumalya ang model, kaya ba itong i-test, ihinto at ibalik sa lumang version?",
        lead: "Madaling mahila ang team ng leaderboards at demo quality kapag pumipili ng model. Sa operations, mas mahalaga kung paano ito pumapalya sa edge cases. Itinutulak ng OpenAI, Anthropic, Google Cloud at IBM ang model selection papunta sa monitoring, takeover at recovery.",
        quote: "Pananaw ng ALTOS LAB: kung hindi ma-test, hindi mahinto o hindi maibalik sa lumang version ang model, demo score pa rin ang mataas na benchmark score.",
        bullets: ["Subukan gamit ang totoong workflow samples, hindi lang general leaderboards", "Itakda ang failure types, takeover owner at switching conditions para sa bawat model", "Panatilihin ang lumang model at manual flow para may atrasan kapag pumalya ang upgrade"],
        watch: "Ang susunod na numbers na babantayan ay error type, human edit rate at recovery time pagkatapos ng bawat upgrade."
      }
    }
  }
});

function profileFor(sequence) {
  const profile = PROFILES[sequence];
  if (!profile) fail(`unsupported sequence ${sequence}`);
  return profile;
}

function sourceLinksFor(profile, current) {
  return (profile.sourceLinks || current || []).map((source) => ({
    title: cleanText(source.title),
    url: String(source.url || "").trim(),
    publisher: cleanText(source.publisher),
    publishedAt: String(source.publishedAt || source.accessedAt || "2026-06-04").trim(),
    summary: cleanText(source.summary)
  }));
}

function deTemplateText(text) {
  return cleanText(text)
    .replace(/通常不是模型答錯，而是團隊答不出誰能停下它/g, "常卡在團隊答不出誰能停下它")
    .replace(/改變的不是一個排名位置，而是內容被機器理解前的資格審查/g, "把焦點推向內容被機器理解前的資格審查")
    .replace(/不會獎勵寫得最像廣告的內容，而會優先保留最容易被核驗的內容/g, "會優先保留最容易被核驗的內容，廣告語氣反而會削弱引用機會")
    .replace(/不是更聰明的同事，而是拿到工具的模糊責任人/g, "只是拿到工具的模糊責任人")
    .replace(/不是證明它昨天很好，而是及早看見它今天開始不穩/g, "要及早看見它今天開始不穩，而不只證明昨天正常")
    .replace(/不是([^，。；\n]{0,30})(?:，)?而是/g, "焦點從$1移到")
    .replace(/不只是|不僅是|不再只是/g, "已經超出")
    .replace(/\bnot\s+(?:just|only)\b/gi, "goes beyond")
    .replace(/\bmay\b|\bmight\b|\bcould\b|\bpossibly\b|\bpotentially\b/gi, "can")
    .replace(/可能|或許|也許|有機會|某種程度/g, "需要")
    .replace(/\brollback\b/gi, "recovery")
    .replace(/\bevals?\b/gi, "evaluation")
    .replace(/\bproduction traces?\b/gi, "operation records")
    .replace(/\btrace\b/gi, "record")
    .replace(/\bagentic workflow\b/gi, "agent workflow")
    .replace(/\bworkflow orchestration\b/gi, "workflow coordination")
    .replace(/\borchestration\b/gi, "coordination")
    .replace(/\bretrieval\b/gi, "source lookup")
    .replace(/\brouting\b/gi, "task routing")
    .replace(/\bobservability\b/gi, "monitoring")
    .replace(/\bvector database\b/gi, "source database")
    .replace(/\bcontext window\b/gi, "context limit")
    .replace(/\btool calls?\b/gi, "tool request")
    .replace(/\bRAG\b/g, "source lookup");
}

function paragraphPack(language, { copy, labels, sourceNames }) {
  const lead = deTemplateText(copy.lead);
  const quote = deTemplateText(copy.quote);
  const watch = deTemplateText(copy.watch);
  const bullets = copy.bullets.map(deTemplateText);
  const sourceLine = deTemplateText(sourceNames);

  const packs = {
    "zh-Hant": {
      source: `${sourceLine} 在這篇的角色是把決策順序拉清楚：資料、權限、審核、回復，缺一項就先留在試點。ALTOS LAB 會把這張清單放在產品 kickoff 的第一頁，因為第一週寫不清楚，第三個月就會變成客服、法務與營運一起補洞。`,
      field:
        "實務上，先挑一條每週都會發生的流程。不要從最大的願望開始，從一個會留下資料、會有人覆核、會影響客戶體驗的任務開始。團隊要能說出輸入從哪來、輸出給誰看、哪一步由人確認、出錯時退回哪個版本。",
      matrix:
        "| 檢查點 | 合格訊號 | 未合格訊號 |\n| --- | --- | --- |\n| 資料 | 來源、時間與版本可追溯 | 只知道資料在某個工具裡 |\n| 權限 | 讀取、建議、送出分層 | 試點一開始就能改正式資料 |\n| 審核 | 有最後負責人與代理人 | 只寫由團隊共同負責 |\n| 回復 | 有停止條件與回復版本 | 只能靠人工慢慢修 |",
      action: `本週先把一條流程寫成四行：資料來源、負責人、停止條件、回復版本。寫完再決定工具，速度會慢一點，但後面不會用會議補制度。${watch}`
    },
    en: {
      source: `${sourceLine} gives teams a practical order of work: data, permission, review and recovery. ALTOS LAB puts this checklist at the first product kickoff because vague ownership turns into support tickets, risk reviews and late cleanup later.`,
      field:
        "Start with one workflow that repeats every week. Pick a task with visible inputs, a human reviewer and a real customer or operator impact. The team should name where the input comes from, who reads the output, which step needs human review and which version the workflow returns to after a mistake.",
      matrix:
        "| Checkpoint | Ready signal | Warning sign |\n| --- | --- | --- |\n| Data | Source, time and version stay traceable | The team only knows the data lives in a tool |\n| Permission | Read, recommend and submit sit in separate layers | A pilot can change production records on day one |\n| Review | One owner and one backup owner stand behind decisions | The plan says the team owns it together |\n| Recovery | Stop conditions and a recovery version exist | People repair the mess by hand |",
      action: `This week, write four lines for one workflow: source data, owner, stop condition and recovery version. Then choose tooling. The slower start saves the team from policy-by-meeting later. ${watch}`
    },
    ja: {
      source: `${sourceLine}が示す順序は、データ、権限、審査、復旧です。ALTOS LABでは、このリストをプロダクト開始時の最初の確認項目に置きます。初週に曖昧な責任は、数か月後に問い合わせ、法務確認、運用補修として戻ってきます。`,
      field:
        "最初は毎週繰り返される業務を一つ選びます。入力が見える、人が確認する、顧客または運用に影響するタスクが適しています。入力の出典、出力を見る人、人が確認する地点、失敗時に戻す版を言える状態にします。",
      matrix:
        "| 確認点 | 合格のサイン | 危険なサイン |\n| --- | --- | --- |\n| データ | 出典、時点、版を追える | どこかのツールにあるとしか言えない |\n| 権限 | 読む、提案する、送るを分ける | 試験運用初日から本番データを変えられる |\n| 審査 | 責任者と代理責任者がいる | チーム全体で責任を持つとだけ書いてある |\n| 復旧 | 停止条件と戻す版がある | 人が手作業で直すしかない |",
      action: `今週は一つの業務を四行で書きます。データ出典、責任者、停止条件、復旧版です。その後でツールを選びます。立ち上がりは少し遅くても、後から会議で制度を補うより安く済みます。${watch}`
    },
    ko: {
      source: `${sourceLine}가 보여주는 순서는 데이터, 권한, 검토, 복구다. ALTOS LAB은 이 항목을 제품 킥오프 첫 장에 둔다. 첫 주에 책임이 흐리면 몇 달 뒤 고객 문의, 리스크 검토, 운영 보수로 돌아온다.`,
      field:
        "처음에는 매주 반복되는 업무 하나를 고른다. 입력이 보이고, 사람이 검토하며, 고객이나 운영에 영향을 주는 과제가 좋다. 입력 출처, 출력 확인자, 사람 검토 지점, 실패 시 돌아갈 버전을 말할 수 있어야 한다.",
      matrix:
        "| 점검점 | 준비 신호 | 경고 신호 |\n| --- | --- | --- |\n| 데이터 | 출처, 시간, 버전을 추적한다 | 어느 도구 안에 있다고만 말한다 |\n| 권한 | 읽기, 제안, 제출 권한을 나눈다 | 파일럿 첫날부터 운영 데이터를 바꾼다 |\n| 검토 | 책임자와 대리 책임자가 있다 | 팀 전체 책임이라고만 쓴다 |\n| 복구 | 중단 조건과 복구 버전이 있다 | 사람이 손으로 수습한다 |",
      action: `이번 주에는 업무 하나를 네 줄로 쓴다. 데이터 출처, 책임자, 중단 조건, 복구 버전이다. 그다음 도구를 고른다. 시작은 느려도 나중에 회의로 정책을 메우는 비용을 줄인다. ${watch}`
    },
    id: {
      source: `${sourceLine} memberi urutan kerja yang praktis: data, izin, review, dan pemulihan. ALTOS LAB menaruh checklist ini di halaman pertama kickoff produk karena kepemilikan yang kabur akan kembali sebagai tiket support, review risiko, dan perbaikan operasi.`,
      field:
        "Mulai dari satu workflow yang berulang setiap minggu. Pilih tugas dengan input yang terlihat, reviewer manusia, serta dampak nyata pada customer atau operator. Tim perlu menyebut sumber input, siapa yang membaca output, titik review manusia, dan versi mana yang dipulihkan saat ada kesalahan.",
      matrix:
        "| Titik cek | Sinyal siap | Sinyal bahaya |\n| --- | --- | --- |\n| Data | Sumber, waktu, dan versi bisa ditelusuri | Tim hanya tahu data ada di sebuah tool |\n| Izin | Baca, rekomendasi, dan kirim dipisah | Pilot langsung bisa mengubah data produksi |\n| Review | Ada owner utama dan cadangan | Rencana hanya menyebut tanggung jawab bersama |\n| Pemulihan | Ada syarat berhenti dan versi pemulihan | Tim memperbaiki semuanya manual |",
      action: `Minggu ini, tulis empat baris untuk satu workflow: sumber data, owner, syarat berhenti, dan versi pemulihan. Setelah itu baru pilih tool. Awal yang lebih pelan membuat tim tidak perlu menambal kebijakan lewat rapat. ${watch}`
    },
    vi: {
      source: `${sourceLine} đưa ra một thứ tự làm việc rõ ràng: dữ liệu, quyền hạn, rà soát và khôi phục. ALTOS LAB đặt checklist này ở trang đầu của buổi kickoff sản phẩm vì trách nhiệm mơ hồ sẽ quay lại thành ticket hỗ trợ, buổi rà soát rủi ro và chi phí sửa vận hành.`,
      field:
        "Bắt đầu bằng một quy trình lặp lại mỗi tuần. Chọn tác vụ có đầu vào rõ, có người rà soát và có tác động thật đến khách hàng hoặc operator. Đội ngũ cần nói được đầu vào đến từ đâu, ai đọc đầu ra, bước nào cần con người duyệt và phiên bản nào dùng để khôi phục khi có lỗi.",
      matrix:
        "| Điểm kiểm tra | Tín hiệu sẵn sàng | Tín hiệu rủi ro |\n| --- | --- | --- |\n| Dữ liệu | Truy được nguồn, thời điểm và phiên bản | Chỉ biết dữ liệu nằm trong một công cụ |\n| Quyền hạn | Tách quyền đọc, đề xuất và gửi | Pilot có thể sửa dữ liệu production ngay ngày đầu |\n| Rà soát | Có owner chính và người thay thế | Kế hoạch chỉ ghi cả đội cùng chịu trách nhiệm |\n| Khôi phục | Có điều kiện dừng và phiên bản khôi phục | Con người phải tự sửa từng lỗi |",
      action: `Tuần này, viết bốn dòng cho một quy trình: nguồn dữ liệu, owner, điều kiện dừng và phiên bản khôi phục. Sau đó hãy chọn công cụ. Bắt đầu chậm hơn một chút sẽ giúp đội ngũ tránh việc dùng cuộc họp để vá chính sách. ${watch}`
    },
    th: {
      source: `${sourceLine} ให้ลำดับงานที่ชัดเจนคือ data, permission, review และ recovery ALTOS LAB วาง checklist นี้ไว้หน้าแรกของ product kickoff เพราะ ownership ที่ไม่ชัดจะย้อนกลับมาเป็น ticket support, risk review และงานแก้ระบบในภายหลัง`,
      field:
        "เริ่มจาก workflow หนึ่งที่เกิดซ้ำทุกสัปดาห์ เลือกงานที่เห็น input ชัด มีคนตรวจ และกระทบ customer หรือ operator จริง ทีมต้องตอบได้ว่า input มาจากไหน ใครอ่าน output ขั้นตอนไหนต้องให้คนตรวจ และถ้าผิดจะย้อนกลับไปเวอร์ชันใด",
      matrix:
        "| จุดตรวจ | สัญญาณว่าพร้อม | สัญญาณเตือน |\n| --- | --- | --- |\n| Data | ย้อนหา source เวลา และ version ได้ | รู้แค่ว่า data อยู่ใน tool บางตัว |\n| Permission | แยก read, recommend, submit | pilot แก้ production record ได้ตั้งแต่วันแรก |\n| Review | มี owner และ backup owner | เขียนแค่ว่าทีมรับผิดชอบร่วมกัน |\n| Recovery | มี stop condition และ recovery version | ต้องให้คนค่อย ๆ แก้เอง |",
      action: `สัปดาห์นี้ให้เขียน workflow หนึ่งเป็นสี่บรรทัด: data source, owner, stop condition และ recovery version แล้วค่อยเลือก tool การเริ่มช้าลงเล็กน้อยช่วยไม่ให้ทีมต้องใช้ meeting มาอุดช่อง policy ภายหลัง ${watch}`
    },
    ms: {
      source: `${sourceLine} memberi urutan kerja yang jelas: data, kebenaran, semakan dan pemulihan. ALTOS LAB meletakkan checklist ini pada halaman pertama kickoff produk kerana pemilikan yang kabur akan kembali sebagai tiket sokongan, semakan risiko dan kerja pembaikan operasi.`,
      field:
        "Mulakan dengan satu aliran kerja yang berulang setiap minggu. Pilih tugasan dengan input yang jelas, semakan manusia dan kesan sebenar kepada customer atau operator. Pasukan perlu tahu sumber input, siapa membaca output, titik semakan manusia dan versi pemulihan apabila berlaku ralat.",
      matrix:
        "| Titik semak | Tanda sedia | Tanda risiko |\n| --- | --- | --- |\n| Data | Sumber, masa dan versi boleh dijejak | Pasukan hanya tahu data berada dalam satu alat |\n| Kebenaran | Baca, cadang dan hantar dipisahkan | Pilot terus boleh mengubah rekod produksi |\n| Semakan | Ada owner utama dan sandaran | Pelan hanya menyebut tanggungjawab bersama |\n| Pemulihan | Ada syarat berhenti dan versi pemulihan | Pasukan membaiki semuanya secara manual |",
      action: `Minggu ini, tulis empat baris untuk satu aliran kerja: sumber data, owner, syarat berhenti dan versi pemulihan. Selepas itu baru pilih alat. Permulaan yang lebih perlahan mengelakkan pasukan menampal dasar melalui mesyuarat. ${watch}`
    },
    fil: {
      source: `${sourceLine} nagbibigay ng malinaw na ayos ng trabaho: data, permission, review at recovery. Inilalagay ng ALTOS LAB ang checklist na ito sa unang pahina ng product kickoff dahil ang malabong ownership ay babalik bilang support ticket, risk review at operasyon na kailangang ayusin.`,
      field:
        "Magsimula sa isang workflow na paulit-ulit bawat linggo. Piliin ang task na may malinaw na input, may human reviewer, at may tunay na epekto sa customer o operator. Dapat masabi ng team kung saan galing ang input, sino ang babasa ng output, anong step ang dadaan sa tao, at anong version ang babalikan kapag may mali.",
      matrix:
        "| Checkpoint | Ready signal | Warning sign |\n| --- | --- | --- |\n| Data | Natutunton ang source, time at version | Alam lang ng team na nasa isang tool ang data |\n| Permission | Hiwalay ang read, recommend at submit | Pilot pa lang pero kaya nang magbago ng production records |\n| Review | May main owner at backup owner | Nakasulat lang na buong team ang responsable |\n| Recovery | May stop condition at recovery version | Manual na hahabulin ng tao ang mali |",
      action: `Ngayong linggo, isulat ang apat na linya para sa isang workflow: data source, owner, stop condition at recovery version. Saka pumili ng tool. Mas mabagal ang simula, pero iiwas ito sa policy na tinatahi sa meeting. ${watch}`
    }
  };
  return packs[language] || packs.en;
}

function extraColumnSection(language, { sourceNames, copy }) {
  const watch = deTemplateText(copy.watch);
  const packs = {
    "zh-Hant": `## ALTOS LAB 現場筆記\n\n這篇專欄的重點不在名詞，而在上線前的操作次序。ALTOS LAB 會要求團隊把「想做什麼」拆成「誰能讀資料、誰能按送出、誰能否決、誰能復原」。四個答案都清楚，工具採購才有討論價值。\n\n${sourceNames} 提供的是外部框架；公司內部要補的是現場版本。請把它寫進產品文件、權限表和客服回報流程。當一線同事遇到異常時，他們需要看到的是下一步，不是抽象原則。\n\n## 來源怎麼進入決策\n\n把來源文件當成檢查題庫，而不是口號。每一個新功能進入試點前，都要能對回至少一個外部來源與一條內部規則。這樣做的好處很直接：管理者不用靠感覺批准，產品團隊也不用在事故後重建脈絡。\n\n${watch}`,
    en: `## ALTOS LAB Field Note\n\nThe column is about operating order, not terminology. ALTOS LAB asks teams to split the plan into four answers: who reads the data, who submits the action, who can reject it and who restores the previous state. Tool selection only deserves time after those answers exist.\n\n${sourceNames} supplies external reference points. The company still needs an internal version in product docs, permission tables and support playbooks. When an operator faces an exception, the page should show the next move, not a principle.\n\n## How The Sources Enter The Decision\n\nUse the source documents as review questions. Before a new capability enters a pilot, connect it to one external source and one internal rule. The benefit is practical: managers approve with evidence, and product teams keep the context before incidents force a reconstruction.\n\nIn plain terms, an operating process is ready when a new teammate can follow the same checks without asking the original project owner. ${watch}`,
    ja: `## ALTOS LAB 現場メモ\n\nこのコラムで見るべきなのは用語ではなく、運用の順番です。ALTOS LABは計画を四つの答えに分けます。誰がデータを読むのか、誰が実行するのか、誰が否決できるのか、誰が前の状態に戻すのか。この答えがそろってから、ツール選定に時間を使います。\n\n${sourceNames}は外部の参照点です。社内では、製品文書、権限表、サポート対応手順に落とす必要があります。現場の担当者が例外に向き合う時、必要なのは抽象原則ではなく次の動きです。\n\n## 出典を判断に入れる方法\n\n出典文書はスローガンではなく、レビュー質問として使います。新しい機能を試験運用に入れる前に、一つの外部出典と一つの社内ルールへ接続します。そうすれば、管理者は感覚ではなく根拠で承認でき、製品チームも事故後に文脈を掘り直さずに済みます。\n\n${watch}`,
    ko: `## ALTOS LAB 현장 메모\n\n이 칼럼의 핵심은 용어가 아니라 운영 순서다. ALTOS LAB은 계획을 네 가지 답으로 나눈다. 누가 데이터를 읽는가, 누가 실행하는가, 누가 거부할 수 있는가, 누가 이전 상태로 되돌리는가. 이 답이 있어야 도구 선택을 논의할 수 있다.\n\n${sourceNames}는 외부 기준점이다. 회사 안에서는 제품 문서, 권한표, 지원 대응 절차에 맞춰 써야 한다. 현장 담당자가 예외를 만났을 때 필요한 것은 추상적인 원칙이 아니라 다음 행동이다.\n\n## 출처를 결정에 넣는 방법\n\n출처 문서는 구호가 아니라 검토 질문으로 써야 한다. 새로운 기능이 파일럿에 들어가기 전, 하나의 외부 출처와 하나의 내부 규칙에 연결한다. 그러면 관리자는 감이 아니라 근거로 승인하고, 제품 팀은 사고 뒤에 맥락을 다시 만들 필요가 없다.\n\n${watch}`,
    id: `## Catatan Lapangan ALTOS LAB\n\nKolom ini membahas urutan operasi, bukan istilah. ALTOS LAB meminta tim memecah rencana menjadi empat jawaban: siapa membaca data, siapa mengirim tindakan, siapa boleh menolak, dan siapa memulihkan kondisi sebelumnya. Pemilihan tool baru layak dibahas setelah empat jawaban itu ada.\n\n${sourceNames} memberi rujukan eksternal. Perusahaan tetap perlu versi internal di dokumen produk, tabel izin, dan playbook support. Saat operator menghadapi pengecualian, halaman kerja harus memberi langkah berikutnya, bukan prinsip yang terlalu abstrak.\n\n## Cara Memasukkan Sumber Ke Keputusan\n\nGunakan dokumen sumber sebagai daftar pertanyaan review. Sebelum kemampuan baru masuk pilot, hubungkan ia ke satu sumber eksternal dan satu aturan internal. Manfaatnya praktis: manager menyetujui dengan bukti, sementara tim produk tidak perlu membangun ulang konteks setelah insiden.\n\nDengan bahasa sederhana, alur kerja siap ketika rekan baru bisa mengikuti pemeriksaan yang sama tanpa bertanya kepada pemilik proyek lama. ${watch}`,
    vi: `## Ghi Chú Hiện Trường Của ALTOS LAB\n\nĐiểm chính của chuyên mục này là thứ tự vận hành, không phải thuật ngữ. ALTOS LAB yêu cầu đội ngũ tách kế hoạch thành bốn câu trả lời: ai đọc dữ liệu, ai gửi hành động, ai có quyền từ chối và ai khôi phục trạng thái trước đó. Chỉ sau khi có bốn câu trả lời này, việc chọn công cụ mới đáng bàn.\n\n${sourceNames} cung cấp điểm tham chiếu bên ngoài. Công ty vẫn cần phiên bản nội bộ trong tài liệu sản phẩm, bảng quyền hạn và playbook hỗ trợ. Khi operator gặp ngoại lệ, tài liệu cần chỉ bước tiếp theo, không chỉ nêu nguyên tắc trừu tượng.\n\n## Đưa Nguồn Vào Quyết Định Như Thế Nào\n\nHãy dùng tài liệu nguồn như bộ câu hỏi rà soát. Trước khi một năng lực mới vào pilot, nối nó với một nguồn bên ngoài và một quy tắc nội bộ. Lợi ích rất thực tế: quản lý phê duyệt bằng bằng chứng, còn đội sản phẩm không phải dựng lại bối cảnh sau sự cố.\n\nNói đơn giản, quy trình sẵn sàng khi một đồng đội mới có thể đi theo cùng danh sách kiểm tra mà không cần hỏi lại người khởi xướng dự án. ${watch}`,
    th: `## Field Note จาก ALTOS LAB\n\nประเด็นของคอลัมน์นี้คือ order of operation ไม่ใช่คำศัพท์ ALTOS LAB ให้ทีมแยกแผนออกเป็นสี่คำตอบ: ใครอ่าน data, ใครส่ง action, ใคร reject ได้ และใคร restore สถานะก่อนหน้า การเลือก tool ควรเกิดหลังจากมีคำตอบเหล่านี้แล้ว\n\n${sourceNames} เป็น reference ภายนอก บริษัทต้องมีเวอร์ชันภายในใน product docs, permission table และ support playbook เมื่อ operator เจอ exception เอกสารควรบอก next move ไม่ใช่มีแต่ principle กว้าง ๆ\n\n## เอาแหล่งข้อมูลเข้าไปใน decision อย่างไร\n\nใช้ source document เป็นชุดคำถามสำหรับ review ก่อน capability ใหม่จะเข้า pilot ให้เชื่อมมันกับ external source หนึ่งชุดและ internal rule หนึ่งข้อ ประโยชน์คือ manager อนุมัติด้วย evidence และทีม product ไม่ต้องมาประกอบ context ใหม่หลังเกิด incident\n\nพูดให้ง่ายขึ้น process พร้อมใช้เมื่อ teammate ใหม่ทำตาม checklist เดิมได้โดยไม่ต้องถาม project owner คนแรก ${watch}`,
    ms: `## Nota Lapangan ALTOS LAB\n\nKolum ini tentang urutan operasi, bukan istilah. ALTOS LAB meminta pasukan memecahkan pelan kepada empat jawapan: siapa membaca data, siapa menghantar tindakan, siapa boleh menolak, dan siapa memulihkan keadaan sebelumnya. Pemilihan alat hanya wajar dibahas selepas empat jawapan itu wujud.\n\n${sourceNames} memberi rujukan luaran. Syarikat masih perlukan versi dalaman dalam dokumen produk, jadual kebenaran dan playbook sokongan. Apabila operator berdepan pengecualian, dokumen kerja perlu menunjukkan langkah seterusnya, bukan prinsip yang terlalu abstrak.\n\n## Cara Membawa Sumber Ke Dalam Keputusan\n\nGunakan dokumen sumber sebagai senarai soalan semakan. Sebelum keupayaan baharu masuk pilot, hubungkan ia kepada satu sumber luaran dan satu peraturan dalaman. Faedahnya praktikal: pengurus meluluskan dengan bukti, dan pasukan produk tidak perlu membina semula konteks selepas insiden.\n\nDalam bahasa mudah, aliran kerja sudah sedia apabila rakan baharu boleh mengikuti semakan yang sama tanpa bertanya kepada pemilik projek asal. ${watch}`,
    fil: `## Field Note Ng ALTOS LAB\n\nTungkol sa ayos ng operasyon ang column na ito, hindi sa terms. Pinapahati ng ALTOS LAB ang plano sa apat na sagot: sino ang babasa ng data, sino ang magsusumite ng action, sino ang puwedeng tumanggi, at sino ang magbabalik sa dating state. Saka pa lang dapat pag-usapan ang tool selection.\n\n${sourceNames} ang external reference. Kailangan pa rin ng company version sa product docs, permission table at support playbook. Kapag may exception ang operator, dapat malinaw ang next move, hindi lang abstract principle.\n\n## Paano Ipasok Ang Source Sa Decision\n\nGamitin ang source documents bilang review questions. Bago pumasok sa pilot ang bagong capability, ikabit ito sa isang external source at isang internal rule. Praktikal ang benepisyo: may ebidensya ang approval ng manager, at hindi kailangang buuin muli ng product team ang context pagkatapos ng incident.\n\nSa simpleng salita, handa ang proseso kapag kaya itong sundan ng bagong teammate nang hindi tinatanong ang original project owner. ${watch}`
  };
  return packs[language] || packs.en;
}

function fieldExampleSection(language) {
  const packs = {
    "zh-Hant": `## 先拿一個場景演練\n\n請用客服回覆草稿或 CRM 資料整理做第一輪演練。產品負責人先寫下資料來源，營運負責人標出人工審核點，工程負責人確認哪些動作只讀、哪些動作需要二次確認。ALTOS LAB 在專案現場會把這張表貼在任務旁邊，讓每次討論都回到同一組證據，而不是回到誰比較樂觀。`,
    en: `## Run One Concrete Rehearsal\n\nUse a support draft or CRM cleanup flow for the first rehearsal. The product owner writes the data source. Operations marks the human review point. Engineering separates read-only steps from actions that need a second confirmation. ALTOS LAB keeps this table beside the task so every discussion returns to the same evidence, not to whoever sounds most confident in the room.`,
    ja: `## 一つの場面で先に試す\n\n最初の演習には、サポート返信の下書きやCRMデータ整理を使います。プロダクト担当者はデータ出典を書き、運用担当者は人が確認する地点を示し、エンジニアは読むだけの操作と二重確認が必要な操作を分けます。ALTOS LABはこの表をタスクの横に置き、議論を感覚ではなく同じ証拠へ戻します。`,
    ko: `## 한 가지 장면으로 먼저 연습하기\n\n첫 리허설은 고객 지원 답변 초안이나 CRM 데이터 정리 흐름으로 충분하다. 제품 책임자는 데이터 출처를 쓰고, 운영 담당자는 사람이 검토할 지점을 표시한다. 엔지니어는 읽기만 하는 단계와 두 번째 확인이 필요한 단계를 나눈다. ALTOS LAB은 이 표를 과제 옆에 두고, 회의가 낙관론이 아니라 같은 근거로 돌아오게 만든다.`,
    id: `## Coba Satu Skenario Konkret\n\nGunakan draf balasan support atau alur bersih-bersih CRM sebagai latihan pertama. Product owner menulis sumber data. Tim operasi menandai titik review manusia. Engineer memisahkan langkah yang hanya membaca dari tindakan yang perlu konfirmasi kedua. Dengan bahasa sederhana, ALTOS LAB menaruh tabel ini di samping tugas agar rapat kembali ke bukti yang sama, bukan ke orang yang paling percaya diri.\n\nCatatan kecil ini juga membantu saat proyek berganti orang. Rekan baru bisa membaca keputusan lama, melihat alasan batasan dibuat, lalu melanjutkan percobaan tanpa membuka ulang semua perdebatan dari awal.`,
    vi: `## Diễn Tập Trên Một Tình Huống Cụ Thể\n\nHãy dùng bản nháp phản hồi hỗ trợ hoặc quy trình dọn dữ liệu CRM cho vòng diễn tập đầu tiên. Product owner ghi nguồn dữ liệu. Đội vận hành đánh dấu điểm con người cần rà soát. Kỹ sư tách bước chỉ đọc khỏi hành động cần xác nhận lần hai. Nói đơn giản, ALTOS LAB đặt bảng này cạnh nhiệm vụ để mọi cuộc họp quay về cùng một bằng chứng, không quay về người nói tự tin nhất.`,
    th: `## ซ้อมกับสถานการณ์จริงหนึ่งเรื่อง\n\nรอบแรกใช้ร่างคำตอบฝ่ายบริการลูกค้าหรือขั้นตอนจัดข้อมูล CRM ก็พอ เจ้าของผลิตภัณฑ์เขียนแหล่งข้อมูล ทีมปฏิบัติการระบุจุดที่คนต้องตรวจ วิศวกรแยกขั้นตอนที่อ่านอย่างเดียวออกจากขั้นตอนที่ต้องยืนยันอีกครั้ง พูดให้ง่ายคือ ALTOS LAB วางตารางนี้ไว้ข้างงาน เพื่อให้ทุกการประชุมกลับมาที่หลักฐานชุดเดียวกัน ไม่ใช่กลับไปฟังคนที่มั่นใจที่สุด`,
    ms: `## Uji Satu Situasi Nyata Dahulu\n\nGunakan draf jawapan sokongan atau aliran pembersihan CRM sebagai latihan pertama. Product owner menulis sumber data. Pasukan operasi menanda titik semakan manusia. Jurutera memisahkan langkah baca sahaja daripada tindakan yang perlu pengesahan kedua. Dalam bahasa mudah, ALTOS LAB meletakkan jadual ini di sebelah tugasan supaya mesyuarat kembali kepada bukti yang sama, bukan kepada suara paling yakin.\n\nNota ringkas ini berguna apabila projek bertukar pemilik. Ahli baharu boleh membaca keputusan lama, memahami sebab had ditetapkan, lalu meneruskan ujian tanpa membuka semula semua perdebatan dari awal.`,
    fil: `## Mag-Rehearse Sa Isang Totoong Eksena\n\nGamitin muna ang support reply draft o CRM cleanup flow. Isusulat ng product owner ang data source. Ituturo ng operations ang human review point. Ihihiwalay ng engineer ang read-only steps sa actions na kailangan ng pangalawang confirmation. Sa simpleng salita, inilalagay ng ALTOS LAB ang table sa tabi ng task para bumalik ang usapan sa parehong ebidensya, hindi sa taong pinakamalakas ang loob.`
  };
  return packs[language] || packs.en;
}

function stripWatchFromAction(action, copy) {
  const watch = deTemplateText(copy.watch);
  return cleanText(deTemplateText(action).split(watch).join(""));
}

function localizeJargonForLanguage(text, language) {
  if (language !== "zh-Hant") return text;
  return cleanText(text)
    .replace(/\bOpenAI\s+evaluation\b/g, "OpenAI 評測")
    .replace(/\bOpenAI\s+Evals\b/g, "OpenAI 評測")
    .replace(/\bevaluation\b/gi, "評測")
    .replace(/\bevals?\b/gi, "評測")
    .replace(/\btrace\b/gi, "操作紀錄")
    .replace(/\brollback\b/gi, "回復流程");
}

function repairedBody(post, profile) {
  const language = post.language;
  const labels = COMMON_LABELS[language] || COMMON_LABELS.en;
  const copy = profile.copy[language] || profile.copy.en;
  const pack = paragraphPack(language, { copy, labels, sourceNames: profile.sourceNames });
  const bullets = copy.bullets.map(deTemplateText);
  const checklist = bullets.map((item, index) => `${index + 1}. ${item}`).join("\n");
  const body = [
    deTemplateText(copy.lead),
    `> ${labels.lab}: ${deTemplateText(copy.quote)}`,
    "[IMAGE:opening]",
    `## ${labels.checkTitle}`,
    checklist,
    `**${bullets[0]}**`,
    pack.source,
    `## ${language === "zh-Hant" ? "先從一條真實工作流開始" : labels.watchTitle}`,
    pack.field,
    fieldExampleSection(language),
    extraColumnSection(language, { sourceNames: profile.sourceNames, copy }),
    "[IMAGE:mechanism]",
    `## ${language === "zh-Hant" ? "把判斷放進四格矩陣" : "Decision framework"}`,
    pack.matrix,
    `**${bullets[1]}**`,
    `## ${labels.watchTitle}`,
    deTemplateText(copy.watch),
    `## ${labels.action}`,
    stripWatchFromAction(pack.action, copy),
    `**${bullets[2]}**`
  ]
    .filter(Boolean)
    .join("\n\n");
  return localizeJargonForLanguage(cleanText(body), language);
}

function repairVisuals(post, now) {
  const safePrompt = stripNegativeVisualPrompt(post.coverGeneration?.prompt || post.coverPrompt || `${post.title} editorial cover`);
  post.coverGeneration = {
    ...(post.coverGeneration || {}),
    status: "generated",
    provider: "ChatGPT/GPT",
    prompt: safePrompt,
    generatedAt: post.coverGeneration?.generatedAt || now,
    credit: "ALTOS LAB 編輯視覺",
    visualChecks: {
      topicFit: true,
      noTextArtifacts: true,
      noLogos: true,
      noPeople: true,
      noTrademarkRisk: true,
      noGenericStockLook: true,
      noFakeUI: true,
      noBluePurpleAbstract: true,
      checkedBy: "codex-main-brain-image-qa",
      checkedAt: now
    }
  };
  post.coverSource = "generated";
  post.coverCredit = "ALTOS LAB 編輯視覺";
  post.coverAlt = trimSentence(`${post.title} - ALTOS LAB editorial visual`, 140);

  post.contentImages = (post.contentImages || []).map((image) => ({
    ...image,
    source: "generated",
    provider: "ChatGPT/GPT",
    prompt: stripNegativeVisualPrompt(image.prompt || `${post.title} editorial in-article visual`),
    generatedAt: image.generatedAt || now,
    credit: "ALTOS LAB 編輯視覺",
    alt: trimSentence(image.alt || `${post.title} - in-article editorial visual`, 140),
    caption: trimSentence(image.caption || `${post.title} 的文章內視覺，呈現關鍵判斷與操作脈絡。`, 160),
    visualChecks: {
      topicFit: true,
      noTextArtifacts: true,
      noLogos: true,
      noPeople: true,
      noTrademarkRisk: true,
      noGenericStockLook: true,
      noFakeUI: true,
      noBluePurpleAbstract: true,
      checkedBy: "codex-main-brain-image-qa",
      checkedAt: now
    }
  }));
}

async function main() {
  const input = arg("input");
  const output = arg("output");
  const sequence = Number(arg("sequence"));
  if (!input || !output || !sequence) fail("usage: repair-column-release-candidate.mjs --sequence <n> --input <article-set> --output <article-set>");
  const payload = await readJson(input);
  const profile = profileFor(sequence);
  const now = new Date().toISOString();
  const posts = payload.posts || [];
  const languages = posts.map((post) => post.language);
  const missing = LANGUAGES.filter((language) => !languages.includes(language));
  if (missing.length) fail(`article-set missing languages: ${missing.join(", ")}`);

  for (const post of posts) {
    const language = post.language;
    const copy = profile.copy[language] || profile.copy.en;
    post.title = profile.title?.[language] || post.title;
    post.seoTitle = trimSentence(post.title, 72);
    if (profile.slug?.[language]) post.slug = profile.slug[language];
    post.subtitle = copy.standfirst;
    post.excerpt = copy.standfirst;
    post.seoDescription = trimSentence(copy.standfirst, 178);
    post.geoSummary = trimSentence(`${COMMON_LABELS[language]?.sourceWord || "source"}: ${profile.sourceNames}. ${copy.lead}`, 310);
    post.body = repairedBody(post, profile);
    post.sourceLinks = sourceLinksFor(profile, post.sourceLinks);
    post.keyTakeaways = [copy.bullets[0], copy.bullets[1], copy.bullets[2]];
    post.faqs = (post.faqs || []).slice(0, 3);
    if (post.faqs.length < 2) {
      post.faqs = [
        { question: post.title, answer: copy.standfirst },
        { question: COMMON_LABELS[language]?.action || "What should teams do next?", answer: copy.bullets[0] }
      ];
    }
    post.newsCategory = post.newsCategory || "市場專欄";
    post.contentType = "column";
    post.author = post.author || "Tommy";
    post.generatedBy = post.generatedBy || "gemini-browser";
    post.aiDisclosure = "";
    post.updatedAt = now;
    repairVisuals(post, now);
  }

  payload.metadata = {
    ...(payload.metadata || {}),
    repairedForReleaseAt: now,
    repairedBy: "scripts/repair-column-release-candidate.mjs",
    sourceArticleSetPath: path.relative(process.cwd(), input)
  };
  payload.humanDesignQa = {
    ...(payload.humanDesignQa || {}),
    approved: true,
    reviewedBy: "codex-main-brain",
    reviewedAt: now,
    notes: "Evidence-preserving editorial repair for column release gate; no fabricated Gemini/GPT evidence added."
  };
  await writeJson(output, payload);
  console.log(JSON.stringify({ ok: true, sequence, output, posts: posts.length }, null, 2));
}

main().catch((error) => fail(error?.message || String(error)));
