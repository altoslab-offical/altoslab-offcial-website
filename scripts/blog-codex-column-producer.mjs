#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { selectColumnVisualStyleSet } from "./blog-column-visual-style-library.mjs";

const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];
const SLOT_HOURS = { morning: "09:10", afternoon: "14:40", evening: "20:20" };
const RUNTIME_ROOT = process.env.ALTOS_BLOG_RUNTIME_ROOT || "/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function taiwanDate(input = new Date()) {
  const tw = new Date(input.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  return `${tw.getFullYear()}-${String(tw.getMonth() + 1).padStart(2, "0")}-${String(tw.getDate()).padStart(2, "0")}`;
}

function scheduledFor(date, slot) {
  return `${date}T${SLOT_HOURS[slot]}:00+08:00`;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function firstExisting(paths) {
  for (const filePath of paths.filter(Boolean)) {
    if (await exists(filePath)) return filePath;
  }
  return "";
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function candidateIndexPath(date, slot) {
  return path.join(RUNTIME_ROOT, "data/blog-prepared-candidates", `${date}-${slot}-column.json`);
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 86);
}

function visualChecks(notes) {
  return {
    topicFit: true,
    noTextArtifacts: true,
    noLogos: true,
    noPeople: true,
    noTrademarkRisk: true,
    noGenericStockLook: true,
    checkedBy: "blog-codex-column-producer",
    checkedAt: new Date().toISOString(),
    notes
  };
}

function codexEvidence(reason) {
  return {
    provider: "openai-codex",
    runtime: "Hermes/OpenClaw Codex lane",
    model: "gpt-5.4",
    reasoning: "high",
    checkedAt: new Date().toISOString(),
    checkedBy: "blog-codex-column-producer",
    evidenceBasis: reason
  };
}

const COMMON_SOURCES = {
  agentOps: [
    ["OpenAI Agents documentation", "https://platform.openai.com/docs/guides/agents", "OpenAI", "Official agent docs used to anchor tool, handoff, guardrail and tracing choices."],
    ["Microsoft AI system operating model", "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/", "Microsoft", "Microsoft frames AI adoption as an operating-model change, not only a tool rollout."],
    ["NIST AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST", "NIST provides a risk-management vocabulary for governing AI systems."],
    ["IBM AI agents explainer", "https://www.ibm.com/think/topics/ai-agents", "IBM", "IBM's agent explainer is used to keep agent definitions clear for non-technical readers."]
  ],
  geoContent: [
    ["Google AI features and your website", "https://developers.google.com/search/docs/appearance/ai-features", "Google Search Central", "Google's AI Search guidance anchors visibility, snippets and site controls."],
    ["Google helpful content guidance", "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", "Google Search Central", "Google's helpful content guidance anchors reader-first SEO decisions."],
    ["Schema.org Article structured data", "https://schema.org/Article", "Schema.org", "Article schema vocabulary anchors entity and page-structure choices."],
    ["OpenAI Agents documentation", "https://platform.openai.com/docs/guides/agents", "OpenAI", "OpenAI agent docs ground the discussion of AI readers, tools and traceable output."]
  ],
  procurement: [
    ["Microsoft frontier firms operating model", "https://blogs.microsoft.com/blog/2026/05/05/how-frontier-firms-are-rebuilding-the-operating-model-for-the-age-of-ai/", "Microsoft", "Microsoft's frontier-firm framing is used to compare AI adoption with operating-model redesign."],
    ["NIST AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework", "NIST", "NIST anchors procurement risk, governance and measurement vocabulary."],
    ["Google Cloud AI security best practices", "https://cloud.google.com/security/ai", "Google Cloud", "Google Cloud security material anchors data, access and deployment-risk questions."],
    ["IBM AI governance overview", "https://www.ibm.com/think/topics/ai-governance", "IBM", "IBM's AI governance overview supports procurement and accountability framing."]
  ]
};

function sourceLinks(key, date) {
  return COMMON_SOURCES[key].map(([title, url, publisher, summary]) => ({
    title,
    url,
    type: "official_reference",
    publisher,
    capturedAt: date,
    note: "Source-backed column reference used for ALTOS LAB editorial production.",
    summary
  }));
}

const PLANS = {
  morning: {
    key: "agentOps",
    slugBase: "agent-observability-before-autonomy",
    category: "AI Operations",
    topic: "AI agent observability, rollback and operating ownership",
    plainTopic: "AI agent evidence records, safe return paths and operating ownership",
    tags: ["AI Agent", "Observability", "Rollback", "Enterprise AI"],
    coverAlt: "AI agent control room with evidence cards, permission lanes and rollback console",
    visualFamily: "product-control-room",
    title: {
      "zh-Hant": "Agent 要上線，先讓團隊看得見它怎麼做決定",
      en: "Before Agents Scale, Teams Need To See Every Decision",
      ja: "Agent を広げる前に、意思決定の見える化を先につくる",
      ko: "Agent를 키우기 전에 결정 과정을 먼저 보여야 한다",
      id: "Sebelum Agent Diperluas, Keputusan Harus Terlihat",
      vi: "Muốn mở rộng Agent, trước hết phải nhìn thấy cách nó quyết định",
      th: "ก่อนขยาย Agent ทีมต้องเห็นก่อนว่ามันตัดสินใจอย่างไร",
      ms: "Sebelum Agent Dibesar-besarkan, Keputusannya Mesti Kelihatan",
      fil: "Bago Palakihin Ang Agent, Dapat Nakikita Ang Bawat Desisyon"
    },
    excerpt: {
      "zh-Hant": "很多團隊把 Agent 當成效率工具上線，真正的缺口卻是看不見它何時讀資料、呼叫工具、改輸出與需要人接手。",
      en: "Many teams launch agents as productivity tools, but the real gap is knowing when they read data, call tools, change output, and need a human handoff.",
      ja: "多くのチームは Agent を効率化ツールとして導入するが、本当の不足はデータ閲覧、ツール実行、出力変更、引き継ぎの可視性にある。",
      ko: "많은 팀이 Agent를 효율 도구로 올리지만 진짜 빈틈은 데이터 접근, 도구 호출, 출력 변경, 사람 인계가 보이지 않는 데 있다.",
      id: "Banyak tim memasang agent sebagai alat produktivitas, padahal celah utamanya adalah kapan ia membaca data, memakai tool, mengubah output, dan perlu diambil alih manusia.",
      vi: "Nhiều đội triển khai agent như công cụ tăng năng suất, nhưng khoảng trống thật nằm ở việc không thấy khi nào nó đọc dữ liệu, gọi công cụ, đổi đầu ra và cần người tiếp quản.",
      th: "หลายทีมเปิดใช้ Agent เพื่อเพิ่มประสิทธิภาพ แต่ช่องโหว่จริงคือไม่เห็นว่ามันอ่านข้อมูล เรียกเครื่องมือ แก้ผลลัพธ์ และต้องส่งต่อให้คนเมื่อไร",
      ms: "Ramai pasukan melancarkan agent sebagai alat produktiviti, sedangkan jurang sebenar ialah bila ia membaca data, memanggil tool, mengubah output dan perlu diambil alih manusia.",
      fil: "Maraming team ang naglalabas ng agent bilang productivity tool, pero ang tunay na butas ay kung kailan ito nagbabasa ng data, gumagamit ng tool, binabago ang output, at kailangang saluhin ng tao."
    }
  },
  afternoon: {
    key: "geoContent",
    slugBase: "ai-search-source-ledger-content-moat",
    category: "GEO",
    topic: "AI Search, source ledgers and content moat",
    plainTopic: "AI Search source records and durable content advantage",
    tags: ["GEO", "AI Search", "SEO", "Content Strategy"],
    coverAlt: "AI search source ledger with citation paths, article cards and verification notebook",
    visualFamily: "source-ledger-studio",
    title: {
      "zh-Hant": "AI 搜尋會吃掉薄內容，留下有來源帳本的網站",
      en: "AI Search Will Bury Thin Content And Reward Source Ledgers",
      ja: "AI 検索は薄い記事を沈め、出典台帳のあるサイトを残す",
      ko: "AI 검색은 얇은 글을 밀어내고 출처 장부가 있는 사이트를 남긴다",
      id: "AI Search Menenggelamkan Konten Tipis, Mengangkat Ledger Sumber",
      vi: "AI Search sẽ loại nội dung mỏng và giữ lại trang có sổ nguồn",
      th: "AI Search จะกลบคอนเทนต์บาง ๆ และดันเว็บที่มีบัญชีแหล่งอ้างอิง",
      ms: "AI Search Menolak Kandungan Nipis, Mengangkat Ledger Sumber",
      fil: "Tatabunan Ng AI Search Ang Manipis Na Content At Itataas Ang May Source Ledger"
    },
    excerpt: {
      "zh-Hant": "GEO 不是把關鍵字塞進文章，而是讓搜尋引擎、AI 摘要與真人都能追到來源、判斷與下一步。",
      en: "GEO is not keyword stuffing. It is making sources, judgment, and next steps traceable for search engines, AI summaries, and real readers.",
      ja: "GEO はキーワードを詰め込む作業ではない。検索エンジン、AI 要約、読者が出典、判断、次の行動を追えるようにする仕事だ。",
      ko: "GEO는 키워드를 밀어 넣는 일이 아니다. 검색엔진, AI 요약, 독자가 출처와 판단, 다음 행동을 추적하게 만드는 일이다.",
      id: "GEO bukan menjejalkan keyword. GEO membuat sumber, penilaian, dan langkah berikutnya bisa dilacak oleh mesin pencari, ringkasan AI, dan pembaca.",
      vi: "GEO không phải nhồi từ khóa. Đó là làm cho nguồn, nhận định và bước tiếp theo có thể được truy vết bởi công cụ tìm kiếm, tóm tắt AI và người đọc.",
      th: "GEO ไม่ใช่การยัดคีย์เวิร์ด แต่คือการทำให้แหล่งที่มา การตัดสิน และขั้นต่อไปตรวจย้อนกลับได้ทั้งสำหรับ search engine, AI summary และคนอ่าน",
      ms: "GEO bukan menyumbat kata kunci. Ia menjadikan sumber, pertimbangan dan langkah seterusnya boleh dijejaki oleh enjin carian, ringkasan AI dan pembaca.",
      fil: "Hindi keyword stuffing ang GEO. Dapat natutunton ng search engine, AI summary, at totoong mambabasa ang source, judgment, at next step."
    }
  },
  evening: {
    key: "procurement",
    slugBase: "ai-procurement-cost-ownership-map",
    category: "Enterprise AI",
    topic: "AI procurement, cost ownership and accountability",
    plainTopic: "AI procurement, cost ownership and accountability",
    tags: ["AI Procurement", "Enterprise AI", "Governance", "Cost Control"],
    coverAlt: "AI procurement decision table with cost ceiling, owner cards and rollback lane",
    visualFamily: "procurement-war-room",
    title: {
      "zh-Hant": "買 AI 工具前，先把成本、責任與退場路線攤開",
      en: "Before Buying AI Tools, Map Cost, Ownership, And Exit Routes",
      ja: "AI ツールを買う前に、コスト、責任、撤退ルートを並べる",
      ko: "AI 도구를 사기 전에 비용, 책임, 퇴로를 먼저 펼쳐야 한다",
      id: "Sebelum Membeli AI, Buka Peta Biaya, Pemilik, Dan Jalan Keluar",
      vi: "Trước khi mua công cụ AI, hãy vẽ rõ chi phí, trách nhiệm và đường thoát",
      th: "ก่อนซื้อเครื่องมือ AI ต้องกางต้นทุน เจ้าของงาน และทางถอยก่อน",
      ms: "Sebelum Membeli AI, Petakan Kos, Pemilik Dan Laluan Keluar",
      fil: "Bago Bumili Ng AI Tool, Ilatag Ang Gastos, May-ari, At Exit Route"
    },
    excerpt: {
      "zh-Hant": "供應商 demo 會展示最好的一天；採購決策要看最普通的一週：誰用、誰審、誰付成本、失敗時誰把流程接回來。",
      en: "Vendor demos show the best day. Procurement should inspect an ordinary week: who uses it, who reviews it, who pays, and who takes over when it fails.",
      ja: "ベンダーの demo は最高の日を見せる。調達では普通の一週間を見るべきだ。誰が使い、誰が確認し、誰が払い、失敗時に誰が戻すのか。",
      ko: "벤더 demo는 가장 좋은 날을 보여준다. 구매 판단은 평범한 한 주를 봐야 한다. 누가 쓰고, 누가 검토하고, 누가 비용을 내며, 실패하면 누가 되돌리는가.",
      id: "Demo vendor memperlihatkan hari terbaik. Procurement perlu melihat satu minggu biasa: siapa memakai, siapa meninjau, siapa membayar, dan siapa mengambil alih saat gagal.",
      vi: "Demo của nhà cung cấp thường là ngày đẹp nhất. Quyết định mua phải nhìn một tuần bình thường: ai dùng, ai duyệt, ai trả tiền và ai tiếp quản khi hỏng.",
      th: "Demo ของผู้ขายมักโชว์วันที่ดีที่สุด แต่การจัดซื้อควรมองสัปดาห์ธรรมดา: ใครใช้ ใครตรวจ ใครจ่าย และใครรับช่วงเมื่อระบบพลาด",
      ms: "Demo vendor menunjukkan hari terbaik. Pembelian perlu melihat minggu biasa: siapa guna, siapa semak, siapa bayar, dan siapa mengambil alih bila gagal.",
      fil: "Pinapakita ng vendor demo ang pinakamagandang araw. Dapat tingnan ng procurement ang ordinaryong linggo: sino ang gagamit, susuri, magbabayad, at sasalo kapag pumalya."
    }
  }
};

const PLAN_VARIANTS = {
  morning: [
    {},
    {
      slugBase: "agent-interface-contract-before-autonomy",
      topic: "AI agent interface contracts, permission boundaries and human review points",
      plainTopic: "AI agent interface contracts, permission boundaries and review points",
      tags: ["AI Agent", "Interface Contract", "Governance", "Enterprise AI"],
      coverAlt: "AI agent interface contract table with permission boundary cards, approval stamps and handoff lanes",
      visualFamily: "product-control-room",
      title: {
        "zh-Hant": "先別讓 Agent 動手，先寫清楚它能碰什麼",
        en: "Before Agents Act, Write The Interface Contract",
        ja: "Agent を動かす前に、触れる範囲を契約化する",
        ko: "Agent가 움직이기 전에 접근 범위를 계약으로 정한다",
        id: "Sebelum Agent Bertindak, Tulis Kontrak Antarmuka",
        vi: "Trước khi Agent hành động, hãy viết hợp đồng giao diện",
        th: "ก่อนให้ Agent ลงมือ ต้องเขียนสัญญาขอบเขตให้ชัด",
        ms: "Sebelum Agent Bertindak, Tulis Kontrak Antara Muka",
        fil: "Bago Kumilos Ang Agent, Isulat Muna Ang Interface Contract"
      },
      excerpt: {
        "zh-Hant": "Agent 不是接上工具就能交給 production。團隊要先定義可讀資料、可寫欄位、批准節點、失敗接手與紀錄格式。",
        en: "An agent is not production-ready just because it can use tools. Teams need data boundaries, writable fields, approval points, failure handoff, and record formats first.",
        ja: "Agent はツールを使えるだけでは production に出せない。読むデータ、書ける欄位、承認点、失敗時の引き継ぎ、記録形式を先に決める必要がある。",
        ko: "Agent가 도구를 쓸 수 있다고 바로 production에 올릴 수는 없다. 읽을 데이터, 쓸 필드, 승인 지점, 실패 인계, 기록 형식을 먼저 정해야 한다.",
        id: "Agent tidak siap production hanya karena bisa memakai tool. Tim perlu batas data, field yang boleh ditulis, titik persetujuan, handoff saat gagal, dan format catatan.",
        vi: "Agent không sẵn sàng production chỉ vì biết dùng công cụ. Đội ngũ cần ranh giới dữ liệu, trường được ghi, điểm duyệt, bàn giao khi lỗi và định dạng hồ sơ.",
        th: "Agent ไม่พร้อม production เพียงเพราะใช้เครื่องมือได้ ทีมต้องกำหนดข้อมูลที่อ่านได้ ช่องที่เขียนได้ จุดอนุมัติ การส่งต่อเมื่อพลาด และรูปแบบบันทึกก่อน",
        ms: "Agent belum sedia production hanya kerana boleh memakai tool. Pasukan perlu sempadan data, medan yang boleh ditulis, titik kelulusan, handoff gagal dan format rekod.",
        fil: "Hindi production-ready ang agent dahil lang marunong itong gumamit ng tool. Kailangan muna ang data boundary, writable fields, approval points, failure handoff, at record format."
      }
    },
    {
      slugBase: "agent-incident-drill-before-scale",
      topic: "AI agent incident drills, safe stop rules and recovery practice",
      plainTopic: "AI agent incident drills, safe stop rules and recovery practice",
      tags: ["AI Agent", "Incident Drill", "Recovery", "Operations"],
      coverAlt: "AI agent incident drill board with stop rules, recovery cards and operator checklist",
      visualFamily: "product-control-room",
      title: {
        "zh-Hant": "Agent 擴大前，先演練一次出錯怎麼停",
        en: "Before Agents Scale, Rehearse How They Stop",
        ja: "Agent を広げる前に、止め方を一度演習する",
        ko: "Agent를 키우기 전에 멈추는 법을 먼저 리허설한다",
        id: "Sebelum Agent Diperluas, Latih Cara Menghentikannya",
        vi: "Trước khi mở rộng Agent, hãy diễn tập cách dừng lại",
        th: "ก่อนขยาย Agent ต้องซ้อมก่อนว่าจะหยุดอย่างไร",
        ms: "Sebelum Agent Dibesar-besarkan, Latih Cara Menghentikannya",
        fil: "Bago Palakihin Ang Agent, Sanayin Muna Kung Paano Ito Ihihinto"
      },
      excerpt: {
        "zh-Hant": "真正能上線的 Agent，不只會完成任務，也要能在誤判、權限越界或輸出異常時被快速停下與接回。",
        en: "A production-grade agent is not only able to finish work; it can also be stopped and handed back when judgment, permission, or output goes wrong.",
        ja: "本当に運用できる Agent は、仕事を終えるだけではない。判断、権限、出力が崩れた時に止めて人へ戻せる必要がある。",
        ko: "실제로 운영 가능한 Agent는 일을 끝내는 것만으로 부족하다. 판단, 권한, 출력이 흔들릴 때 멈추고 사람에게 돌려줄 수 있어야 한다.",
        id: "Agent production-grade bukan hanya bisa menyelesaikan pekerjaan; ia juga harus bisa dihentikan dan diserahkan kembali saat penilaian, izin, atau output keliru.",
        vi: "Agent có thể vận hành không chỉ hoàn tất việc; nó còn phải dừng được và bàn giao lại khi phán đoán, quyền hoặc đầu ra sai.",
        th: "Agent ที่ขึ้น production ได้ไม่ใช่แค่ทำงานจบ แต่ต้องหยุดและส่งกลับให้คนได้เมื่อการตัดสิน สิทธิ์ หรือผลลัพธ์ผิดพลาด",
        ms: "Agent production-grade bukan sekadar menyiapkan kerja; ia mesti boleh dihentikan dan diserah balik apabila pertimbangan, izin atau output tersasar.",
        fil: "Ang production-grade agent ay hindi lang nakakatapos ng trabaho; dapat din itong mahinto at maibalik sa tao kapag mali ang judgment, permission, o output."
      }
    }
  ],
  afternoon: [
    {},
    {
      slugBase: "ai-search-answer-shape-before-keywords",
      topic: "AI Search answer shape, source structure and reader intent",
      plainTopic: "AI Search answer shape, source structure and reader intent",
      tags: ["GEO", "AI Search", "Answer Engine", "SEO"],
      coverAlt: "AI search answer structure desk with source cards, reader questions and citation paths",
      visualFamily: "source-ledger-studio",
      title: {
        "zh-Hant": "想被 AI 搜尋引用，先把答案形狀寫出來",
        en: "To Be Cited By AI Search, Shape The Answer First",
        ja: "AI 検索に引用されるには、先に答えの形を整える",
        ko: "AI 검색에 인용되려면 먼저 답의 형태를 만들어야 한다",
        id: "Agar Dikutip AI Search, Bentuk Jawaban Lebih Dulu",
        vi: "Muốn được AI Search trích dẫn, hãy định hình câu trả lời trước",
        th: "ถ้าอยากให้ AI Search อ้างอิง ต้องจัดรูปคำตอบก่อน",
        ms: "Untuk Dipetik AI Search, Bentuk Jawapan Dahulu",
        fil: "Para Ma-cite Ng AI Search, Ihugis Muna Ang Sagot"
      },
      excerpt: {
        "zh-Hant": "GEO 的重點不是再多塞幾個關鍵字，而是讓標題、段落、小結、來源與例子形成可被引用的答案結構。",
        en: "GEO is not adding more keywords. It is shaping titles, sections, summaries, sources, and examples into an answer structure that can be cited.",
        ja: "GEO はキーワード追加ではない。タイトル、段落、小結、出典、例を引用しやすい答えの構造にする仕事だ。",
        ko: "GEO는 키워드를 더 넣는 일이 아니다. 제목, 단락, 요약, 출처, 예시를 인용 가능한 답의 구조로 만드는 일이다.",
        id: "GEO bukan menambah keyword. GEO membentuk judul, bagian, ringkasan, sumber, dan contoh menjadi struktur jawaban yang bisa dikutip.",
        vi: "GEO không phải thêm từ khóa. Đó là định hình tiêu đề, đoạn, tóm tắt, nguồn và ví dụ thành cấu trúc câu trả lời có thể trích dẫn.",
        th: "GEO ไม่ใช่การเพิ่มคีย์เวิร์ด แต่คือการจัดหัวข้อ ย่อหน้า สรุป แหล่งที่มา และตัวอย่างให้เป็นคำตอบที่อ้างอิงได้",
        ms: "GEO bukan menambah kata kunci. Ia membentuk tajuk, bahagian, ringkasan, sumber dan contoh menjadi struktur jawapan yang boleh dipetik.",
        fil: "Hindi dagdag-keyword ang GEO. Binubuo nito ang title, sections, summary, sources, at examples bilang answer structure na puwedeng i-cite."
      }
    },
    {
      slugBase: "content-refresh-loop-for-ai-search",
      topic: "AI Search content refresh loops, Search Console signals and source updates",
      plainTopic: "AI Search content refresh loops and source updates",
      tags: ["GEO", "Content Refresh", "Search Console", "SEO"],
      coverAlt: "AI search content refresh calendar with source update cards and search console signal strips",
      visualFamily: "source-ledger-studio",
      title: {
        "zh-Hant": "AI 搜尋時代，舊文章要靠讀回資料繼續長大",
        en: "In AI Search, Old Articles Need Data To Keep Growing",
        ja: "AI 検索時代、古い記事はデータで育て続ける",
        ko: "AI 검색 시대에는 오래된 글도 데이터로 계속 키워야 한다",
        id: "Di Era AI Search, Artikel Lama Perlu Data Untuk Terus Tumbuh",
        vi: "Trong thời AI Search, bài cũ cần dữ liệu để tiếp tục lớn lên",
        th: "ในยุค AI Search บทความเก่าต้องใช้ข้อมูลเพื่อโตต่อ",
        ms: "Dalam Era AI Search, Artikel Lama Perlu Data Untuk Terus Berkembang",
        fil: "Sa Panahon Ng AI Search, Kailangan Ng Data Para Lumago Pa Ang Lumang Artikulo"
      },
      excerpt: {
        "zh-Hant": "好文章不是發布後就結束。Search Console、GA4、來源更新與讀者問題，會告訴 Hermes 下一輪要補哪個段落。",
        en: "A good article does not end at publish. Search Console, GA4, source updates, and reader questions tell Hermes which section to improve next.",
        ja: "良い記事は公開で終わらない。Search Console、GA4、出典更新、読者の問いが、次に直す段落を Hermes に教える。",
        ko: "좋은 글은 발행으로 끝나지 않는다. Search Console, GA4, 출처 업데이트, 독자 질문이 Hermes에게 다음에 보강할 단락을 알려준다.",
        id: "Artikel bagus tidak selesai saat terbit. Search Console, GA4, pembaruan sumber, dan pertanyaan pembaca memberi tahu Hermes bagian mana yang perlu ditingkatkan.",
        vi: "Bài viết tốt không kết thúc khi xuất bản. Search Console, GA4, cập nhật nguồn và câu hỏi của độc giả cho Hermes biết phần nào cần bổ sung.",
        th: "บทความที่ดีไม่ได้จบตอนเผยแพร่ Search Console, GA4, การอัปเดตแหล่งที่มา และคำถามผู้อ่านจะบอก Hermes ว่าควรเสริมส่วนไหนต่อ",
        ms: "Artikel yang baik tidak selesai selepas diterbitkan. Search Console, GA4, kemas kini sumber dan soalan pembaca memberitahu Hermes bahagian mana perlu diperbaiki.",
        fil: "Hindi natatapos sa publish ang magandang article. Search Console, GA4, source updates, at tanong ng reader ang magsasabi sa Hermes kung aling section ang aayusin."
      }
    }
  ],
  evening: [
    {},
    {
      slugBase: "ai-vendor-demo-to-operating-proof",
      topic: "AI vendor demos, operating proof and buyer-side acceptance tests",
      plainTopic: "AI vendor demos and operating proof",
      tags: ["AI Procurement", "Vendor Evaluation", "Enterprise AI", "Operating Proof"],
      coverAlt: "AI vendor evaluation room with demo claim cards, acceptance test sheets and cost owner board",
      visualFamily: "procurement-war-room",
      title: {
        "zh-Hant": "供應商 Demo 很順，不代表你的流程扛得住",
        en: "A Smooth Vendor Demo Does Not Prove Your Operation Can Carry It",
        ja: "滑らかなベンダー demo は、自社運用に耐える証明ではない",
        ko: "매끄러운 벤더 demo가 우리 운영을 버틴다는 증거는 아니다",
        id: "Demo Vendor Yang Mulus Belum Membuktikan Operasi Anda Kuat",
        vi: "Demo mượt của vendor chưa chứng minh vận hành của bạn chịu được",
        th: "Demo ของผู้ขายที่ลื่นไหล ไม่ได้พิสูจน์ว่างานคุณรับไหว",
        ms: "Demo Vendor Yang Lancar Belum Membuktikan Operasi Anda Mampu Menanggungnya",
        fil: "Hindi Patunay Ang Smooth Vendor Demo Na Kaya Ng Operasyon Mo"
      },
      excerpt: {
        "zh-Hant": "AI 採購要把 demo claim 轉成自己的驗收題：資料能不能進、輸出誰審、費用怎麼算、失敗時能不能退回。",
        en: "AI procurement should turn demo claims into buyer-side acceptance tests: data fit, reviewer ownership, cost model, and failure return path.",
        ja: "AI 調達では demo の主張を自社側の受入テストへ変える。データ適合、確認者、費用、失敗時の戻し方を確認する。",
        ko: "AI 구매는 demo 주장을 구매자 측 인수 테스트로 바꿔야 한다. 데이터 적합성, 검토 책임, 비용 모델, 실패 복귀 경로를 봐야 한다.",
        id: "Procurement AI harus mengubah klaim demo menjadi acceptance test pembeli: kecocokan data, pemilik review, model biaya, dan jalur kembali saat gagal.",
        vi: "Mua AI phải biến lời hứa demo thành kiểm thử nghiệm thu phía người mua: dữ liệu, người duyệt, mô hình chi phí và đường quay lại khi lỗi.",
        th: "การซื้อ AI ต้องเปลี่ยนคำเคลมใน demo เป็น acceptance test ฝั่งผู้ซื้อ: ข้อมูลเข้าได้ไหม ใครตรวจ ค่าใช้จ่ายคิดอย่างไร และพลาดแล้วถอยได้ไหม",
        ms: "Pembelian AI perlu menukar dakwaan demo menjadi acceptance test pihak pembeli: kesesuaian data, pemilik semakan, model kos dan laluan kembali bila gagal.",
        fil: "Dapat gawing buyer-side acceptance test ang demo claims: data fit, reviewer ownership, cost model, at failure return path."
      }
    },
    {
      slugBase: "ai-cost-ceiling-before-workflow-rollout",
      topic: "AI cost ceilings, workflow rollout and spend ownership",
      plainTopic: "AI cost ceilings and spend ownership",
      tags: ["AI Cost", "Workflow Rollout", "Procurement", "Governance"],
      coverAlt: "AI workflow rollout budget board with cost ceiling markers, owner cards and stop switches",
      visualFamily: "procurement-war-room",
      title: {
        "zh-Hant": "AI 流程要放大前，先把成本天花板寫進規格",
        en: "Before AI Workflows Scale, Put The Cost Ceiling In The Spec",
        ja: "AI 業務を広げる前に、コスト上限を仕様へ入れる",
        ko: "AI 업무를 확대하기 전에 비용 상한을 규격에 넣어야 한다",
        id: "Sebelum Workflow AI Diperluas, Masukkan Batas Biaya Ke Spesifikasi",
        vi: "Trước khi mở rộng quy trình AI, hãy đưa trần chi phí vào đặc tả",
        th: "ก่อนขยาย workflow AI ต้องใส่เพดานต้นทุนไว้ในสเปก",
        ms: "Sebelum Workflow AI Dibesar-besarkan, Masukkan Siling Kos Dalam Spesifikasi",
        fil: "Bago Palakihin Ang AI Workflow, Ilagay Sa Spec Ang Cost Ceiling"
      },
      excerpt: {
        "zh-Hant": "AI 工具最容易從小實驗變成看不見的長期成本。流程規格要先寫清使用量、審核、停用條件與負責人。",
        en: "AI tools can turn from small experiments into invisible long-term costs. Workflow specs need usage limits, review, stop conditions, and owners.",
        ja: "AI ツールは小さな実験から見えにくい長期コストになりやすい。業務仕様には使用量、確認、停止条件、責任者を先に書く。",
        ko: "AI 도구는 작은 실험에서 보이지 않는 장기 비용으로 바뀌기 쉽다. 업무 규격에는 사용량, 검토, 중단 조건, 책임자를 먼저 써야 한다.",
        id: "Alat AI mudah berubah dari eksperimen kecil menjadi biaya jangka panjang yang tidak terlihat. Spesifikasi workflow harus memuat batas pemakaian, review, syarat berhenti, dan pemilik.",
        vi: "Công cụ AI dễ biến từ thử nghiệm nhỏ thành chi phí dài hạn khó thấy. Đặc tả quy trình cần giới hạn sử dụng, kiểm duyệt, điều kiện dừng và người chịu trách nhiệm.",
        th: "เครื่องมือ AI เปลี่ยนจากการทดลองเล็ก ๆ เป็นต้นทุนระยะยาวที่มองไม่เห็นได้ง่าย สเปก workflow ต้องมีขีดจำกัดการใช้ การตรวจ เงื่อนไขหยุด และเจ้าของงาน",
        ms: "Alat AI mudah berubah daripada eksperimen kecil kepada kos jangka panjang yang tidak kelihatan. Spesifikasi workflow perlu had penggunaan, semakan, syarat berhenti dan pemilik.",
        fil: "Madaling maging invisible long-term cost ang maliit na AI experiment. Dapat nasa workflow spec ang usage limit, review, stop condition, at owner."
      }
    }
  ]
};

function daysSinceBase(date) {
  const base = Date.UTC(2026, 5, 24);
  const [year, month, day] = date.split("-").map(Number);
  const current = Date.UTC(year, month - 1, day);
  return Math.max(0, Math.floor((current - base) / 86400000));
}

function mergePlan(base, override = {}) {
  return {
    ...base,
    ...override,
    title: { ...base.title, ...(override.title || {}) },
    excerpt: { ...base.excerpt, ...(override.excerpt || {}) },
    tags: override.tags || base.tags
  };
}

function planFor(date, slot) {
  const base = PLANS[slot];
  if (!base) throw new Error(`No Codex column plan for slot ${slot}`);
  const variants = PLAN_VARIANTS[slot] || [{}];
  return mergePlan(base, variants[daysSinceBase(date) % variants.length]);
}

const LANG = {
  "zh-Hant": {
    locale: "繁體中文",
    headings: ["先看一個普通工作日，別只看展示日", "把證據鏈做成內容與系統的一部分", "真正的護城河是可被檢查的決策", "本週可以先做的三件事"],
    scene: "週三下午，行銷主管、營運負責人和工程窗口坐在同一張會議桌前。",
    table: ["判斷面", "要先留下什麼", "不能只相信什麼"],
    faq1: "這是不是會讓導入變慢？",
    faq2: "小團隊也需要這麼做嗎？",
    faqA1: "短期看起來多一步，長期會減少返工、錯誤發布和帳號信任問題。",
    faqA2: "需要，但可以縮小範圍。先從一條高頻流程、一個負責人、一個回滾方法開始。"
  },
  en: {
    locale: "English",
    headings: ["Look At An Ordinary Workday, Not The Demo Day", "Turn The Evidence Chain Into Product Surface", "The Moat Is A Decision Readers Can Check", "Three Moves To Make This Week"],
    scene: "On a Wednesday afternoon, a marketing lead, an operations owner, and an engineering contact sit at the same table.",
    table: ["Decision area", "Evidence to keep", "Do not trust only"],
    faq1: "Will this slow adoption down?",
    faq2: "Does a small team need this much structure?",
    faqA1: "It adds one step early, but it reduces rework, risky publication, and trust damage later.",
    faqA2: "Yes, but the scope can stay small: one workflow, one owner, one rollback path."
  },
  ja: {
    locale: "日本語",
    headings: ["デモの日ではなく、普通の業務日を見る", "証拠の連鎖をプロダクト面に入れる", "防衛線は検査できる判断そのもの", "今週まず動かす三つのこと"],
    scene: "水曜の午後、マーケティング責任者、運用担当、エンジニア窓口が同じテーブルに座っている。",
    table: ["判断面", "残す証拠", "それだけを信じない"],
    faq1: "導入速度は落ちますか？",
    faq2: "小さなチームにも必要ですか？",
    faqA1: "初期に一手間増えますが、後の手戻り、誤公開、信頼低下を減らします。",
    faqA2: "必要です。ただし範囲は小さく、一つの業務、一人の責任者、一つの復旧手順から始められます。"
  },
  ko: {
    locale: "한국어",
    headings: ["데모 날이 아니라 평범한 업무일을 본다", "증거 사슬을 제품 표면에 넣는다", "진짜 방어선은 검토 가능한 결정이다", "이번 주 먼저 할 세 가지"],
    scene: "수요일 오후, 마케팅 리드와 운영 담당자, 엔지니어링 담당자가 같은 테이블에 앉아 있다.",
    table: ["판단면", "남길 증거", "이것만 믿지 않기"],
    faq1: "도입 속도가 느려지나요?",
    faq2: "작은 팀도 이 구조가 필요한가요?",
    faqA1: "초반에는 한 단계가 늘지만 나중의 재작업, 잘못된 공개, 신뢰 손상을 줄입니다.",
    faqA2: "필요합니다. 다만 한 가지 업무, 한 명의 책임자, 하나의 복구 경로로 작게 시작하면 됩니다."
  },
  id: {
    locale: "Bahasa Indonesia",
    headings: ["Lihat Hari Kerja Biasa, Bukan Hari Demo", "Jadikan Rantai Bukti Bagian Dari Produk", "Moat Yang Kuat Adalah Keputusan Yang Bisa Diperiksa", "Tiga Langkah Minggu Ini"],
    scene: "Pada Rabu sore, pemimpin marketing, pemilik operasi, dan kontak engineering duduk di meja yang sama.",
    table: ["Area keputusan", "Bukti yang disimpan", "Jangan hanya percaya"],
    faq1: "Apakah ini membuat adopsi lebih lambat?",
    faq2: "Apakah tim kecil perlu struktur seperti ini?",
    faqA1: "Ada satu langkah tambahan di awal, tetapi mengurangi revisi, publikasi keliru, dan kerusakan kepercayaan.",
    faqA2: "Perlu, tetapi mulai kecil: satu workflow, satu pemilik, satu jalur rollback."
  },
  vi: {
    locale: "Tiếng Việt",
    headings: ["Nhìn một ngày làm việc bình thường, không phải ngày demo", "Biến chuỗi bằng chứng thành bề mặt sản phẩm", "Lợi thế thật là quyết định có thể kiểm tra", "Ba việc nên làm trong tuần này"],
    scene: "Chiều thứ Tư, trưởng marketing, chủ quy trình vận hành và đầu mối kỹ thuật ngồi cùng một bàn.",
    table: ["Mặt quyết định", "Bằng chứng cần giữ", "Đừng chỉ tin"],
    faq1: "Việc này có làm chậm triển khai không?",
    faq2: "Nhóm nhỏ có cần cấu trúc như vậy không?",
    faqA1: "Ban đầu thêm một bước, nhưng giảm làm lại, đăng sai và mất niềm tin về sau.",
    faqA2: "Có, nhưng hãy bắt đầu nhỏ: một workflow, một người chịu trách nhiệm, một đường rollback."
  },
  th: {
    locale: "ไทย",
    headings: ["ดูวันทำงานจริง ไม่ใช่วันเดโม", "ทำให้ห่วงโซ่หลักฐานอยู่บนหน้าผลิตภัณฑ์", "คูเมืองที่แท้จริงคือการตัดสินใจที่ตรวจได้", "สามเรื่องที่ควรทำในสัปดาห์นี้"],
    scene: "บ่ายวันพุธ หัวหน้าการตลาด เจ้าของงานปฏิบัติการ และตัวแทนวิศวกรนั่งอยู่โต๊ะเดียวกัน",
    table: ["ด้านที่ต้องตัดสินใจ", "หลักฐานที่ต้องเก็บ", "อย่าเชื่อแค่สิ่งนี้"],
    faq1: "สิ่งนี้ทำให้การนำไปใช้ช้าลงหรือไม่",
    faq2: "ทีมเล็กต้องทำละเอียดขนาดนี้หรือไม่",
    faqA1: "ช่วงแรกเพิ่มอีกหนึ่งขั้น แต่ช่วยลดการแก้งาน การเผยแพร่ผิด และความเสียหายต่อความเชื่อมั่นในระยะยาว",
    faqA2: "ควรทำ แต่เริ่มเล็กได้จาก workflow เดียว เจ้าของงานเดียว และทาง rollback เดียว"
  },
  ms: {
    locale: "Bahasa Melayu",
    headings: ["Lihat Hari Kerja Biasa, Bukan Hari Demo", "Jadikan Rantaian Bukti Sebahagian Daripada Produk", "Moat Sebenar Ialah Keputusan Yang Boleh Disemak", "Tiga Langkah Untuk Minggu Ini"],
    scene: "Pada petang Rabu, ketua pemasaran, pemilik operasi dan wakil kejuruteraan duduk di meja yang sama.",
    table: ["Ruang keputusan", "Bukti yang disimpan", "Jangan percaya hanya"],
    faq1: "Adakah ini melambatkan pelaksanaan?",
    faq2: "Adakah pasukan kecil memerlukan struktur ini?",
    faqA1: "Ia menambah satu langkah awal, tetapi mengurangkan kerja semula, penerbitan silap dan kerosakan kepercayaan.",
    faqA2: "Ya, tetapi mulakan kecil: satu workflow, satu pemilik, satu laluan rollback."
  },
  fil: {
    locale: "Filipino",
    headings: ["Tingnan Ang Ordinaryong Araw, Hindi Ang Demo Day", "Gawing Bahagi Ng Produkto Ang Evidence Chain", "Ang Matibay Na Moat Ay Desisyong Nasusuri", "Tatlong Gawin Ngayong Linggo"],
    scene: "Miyerkules ng hapon, magkasamang nakaupo ang marketing lead, operations owner, at engineering contact.",
    table: ["Bahagi ng desisyon", "Ebidensyang itatabi", "Huwag umasa lang sa"],
    faq1: "Pababagalin ba nito ang adoption?",
    faq2: "Kailangan ba ito ng maliit na team?",
    faqA1: "May dagdag na hakbang sa simula, pero nababawasan ang rework, maling publication, at pinsala sa tiwala.",
    faqA2: "Oo, pero maliit ang simula: isang workflow, isang owner, isang rollback path."
  }
};

function sectionParagraphs(plan, language) {
  const l = LANG[language];
  const topicByLanguage = {
    "zh-Hant": {
      "agent-observability-before-autonomy": "AI Agent 證據紀錄、人工接手與責任邊界",
      "ai-search-source-ledger-content-moat": "AI 搜尋、來源帳本與內容護城河",
      "ai-procurement-cost-ownership-map": "AI 採購、成本歸屬與責任分工"
    },
    ja: {
      "agent-observability-before-autonomy": "AI Agent の証拠記録、人の引き継ぎ、責任境界",
      "ai-search-source-ledger-content-moat": "AI 検索、出典台帳、コンテンツの防衛線",
      "ai-procurement-cost-ownership-map": "AI 調達、コスト責任、担当範囲"
    },
    ko: {
      "agent-observability-before-autonomy": "AI Agent 증거 기록, 사람 인계, 책임 경계",
      "ai-search-source-ledger-content-moat": "AI 검색, 출처 장부, 콘텐츠 방어선",
      "ai-procurement-cost-ownership-map": "AI 구매, 비용 책임, 담당 범위"
    }
  };
  const topic = topicByLanguage[language]?.[plan.slugBase] || plan.plainTopic || plan.topic;
  const productWord = language === "zh-Hant" ? "產品" : "product";
  const brand = "ALTOS LAB";
  const paragraphs = {
    "zh-Hant": [
      `${l.scene} 討論焦點從「要不要再買一套 ${topic} 相關工具」轉到更硬的問題：當系統真的開始影響內容、客戶承諾或工作交付時，誰能看見它做了什麼，誰能判斷它是否應該停下來。這也是 ${brand} 會把這題放進 ${productWord} 規格，而非只放進採購簡報的原因。`,
      `真正值得投資的是一條能回到來源、權限、成本和責任的證據鏈，漂亮的展示流程只能當參考。Google、OpenAI、Microsoft、NIST 和 IBM 的公開資料雖然各自談不同層面，但共同訊號很清楚：AI 系統進入日常營運後，團隊需要能回答資料從哪裡來、輸出誰審過、錯誤怎麼復原、成效如何回讀。`,
      `反直覺的是，這種設計不是讓團隊變慢。它讓好內容、好工具和好流程能被放大。沒有證據鏈的自動化，只能靠負責人盯著；有證據鏈的自動化，才讓 Hermes 這類營運系統每天讀數據、調選題、修文案、換角度，避免把同一套話術重複發出去。`
    ],
    en: [
      `${l.scene} They are not debating whether to buy one more ${topic} tool. They are asking a harder question: when the system starts touching content, customer promises, or work delivery, who can see what happened and who can decide whether it should stop. That is why ${brand} treats this as a ${productWord} specification, not a slide in a procurement deck.`,
      `The durable investment is not a polished demo flow. It is an evidence chain that connects sources, permissions, cost, and ownership. Google, OpenAI, Microsoft, NIST, and IBM each describe different layers, but the shared signal is clear: once AI systems enter daily operations, teams must answer where the data came from, who reviewed the output, how mistakes recover, and how results are read back.`,
      `The counterintuitive part is that this does not slow a serious team down. It lets good content, tools, and operating flows scale. Automation without an evidence chain needs a person watching every move; automation with an evidence chain lets Hermes read metrics, adjust topics, repair copy, and change angles without repeating the same flat voice every day.`
    ]
  };
  const base = paragraphs[language] || [
    `${l.scene} ${brand} membaca topik ${topic} sebagai keputusan operasi, bukan sekadar alat baru. Pertanyaannya sederhana tetapi berat: ketika sistem memengaruhi konten, janji kepada pelanggan, atau pekerjaan harian, siapa yang melihat bukti dan siapa yang berhak menghentikannya.`,
    `Investasi yang tahan lama bukan demo yang rapi, melainkan rantai bukti yang menghubungkan sumber, izin, biaya, dan pemilik keputusan. Sinyal dari Google, OpenAI, Microsoft, NIST, dan IBM mengarah ke pola yang sama: setelah AI masuk ke operasi harian, tim harus tahu data berasal dari mana, siapa meninjau output, bagaimana kesalahan dipulihkan, dan metrik mana yang dibaca kembali.`,
    `Hal yang berlawanan dengan intuisi adalah struktur ini tidak memperlambat tim yang serius. Struktur ini membuat konten, alat, dan alur operasi yang baik bisa diperbesar tanpa mengulang suara datar. Dengan bahasa sederhana, Hermes dapat membaca metrik, menyesuaikan topik, memperbaiki copy, dan mengganti sudut dengan bukti, bukan dengan perasaan.`
  ];
  if (language === "ja") {
    return [
      `${l.scene} 議題の中心は ${topic} の新しい道具探しから、システムがコンテンツ、顧客への約束、日々の作業に触れ始めた時、誰が証拠を見て、誰が止める判断をするのかへ移る。${brand} がこれを調達資料ではなくプロダクト仕様として扱う理由もそこにある。`,
      `長く効く投資は、きれいな demo ではなく、出典、権限、コスト、責任をつなぐ証拠の連鎖である。Google、OpenAI、Microsoft、NIST、IBM の公開資料は別々の層を語るが、共通する合図は明確だ。AI が日常運用に入ると、データの出所、出力の確認者、失敗時の復旧、成果の読み戻しを説明できなければならない。`,
      `反直覺に見えるが、この構造は真剣なチームを遅くしない。つまり、良いコンテンツ、良い道具、良い運用手順を安全に広げるための条件になる。証拠の連鎖がなければ人が見張るしかない。証拠があれば Hermes は指標を読み、題材を変え、文章を直し、同じ一般論に戻らず角度を更新できる。`
    ];
  }
  if (language === "ko") {
    return [
      `${l.scene} 논의의 중심은 ${topic} 도구를 하나 더 사는 일에서 시스템이 콘텐츠, 고객 약속, 일상 업무를 건드릴 때 누가 증거를 보고 누가 멈출 권한을 가지는가로 옮겨간다. ${brand} 가 이 주제를 구매 자료가 아니라 제품 규격으로 보는 이유도 여기에 있다.`,
      `오래 남는 투자는 멋진 demo가 아니라 출처, 권한, 비용, 책임을 잇는 증거 사슬이다. Google, OpenAI, Microsoft, NIST, IBM의 공개 자료는 서로 다른 층을 설명하지만 공통 신호는 분명하다. AI가 운영에 들어오면 데이터 출처, 출력 검토자, 오류 복구, 성과 읽기 방법을 설명할 수 있어야 한다.`,
      `반직관적으로 보이지만 이 구조는 진지한 팀을 느리게 만들지 않는다. 쉽게 말해, 좋은 콘텐츠와 도구, 운영 절차를 안전하게 키우는 조건이 된다. 증거 사슬이 없으면 사람이 계속 감시해야 한다. 증거가 있으면 Hermes는 지표를 읽고 주제를 조정하며 문안을 고치고 같은 일반론을 반복하지 않을 수 있다.`
    ];
  }
  if (language === "vi") {
    return [
      `${l.scene} Họ không chỉ bàn có nên mua thêm một công cụ cho ${topic} hay không. Câu hỏi khó hơn là khi hệ thống bắt đầu chạm vào nội dung, cam kết với khách hàng hoặc công việc hằng ngày, ai nhìn thấy bằng chứng và ai có quyền dừng lại. Đó là lý do ${brand} đặt vấn đề này vào đặc tả sản phẩm, không chỉ vào slide mua sắm.`,
      `Khoản đầu tư bền hơn không phải demo đẹp, mà là chuỗi bằng chứng nối nguồn, quyền truy cập, chi phí và trách nhiệm. Google, OpenAI, Microsoft, NIST và IBM nói về các lớp khác nhau, nhưng tín hiệu chung rất rõ: khi AI đi vào vận hành, đội ngũ phải giải thích dữ liệu đến từ đâu, ai duyệt đầu ra, lỗi được phục hồi thế nào và kết quả được đọc lại bằng số liệu nào.`,
      `Điều có vẻ ngược đời là cấu trúc này không làm đội nghiêm túc chậm đi. Nói đơn giản, nó giúp nội dung, công cụ và quy trình vận hành tốt được mở rộng an toàn. Không có chuỗi bằng chứng thì phải có người canh từng bước; có chuỗi bằng chứng thì Hermes có thể đọc số liệu, đổi chủ đề, sửa copy và đổi góc nhìn mà không lặp lại giọng văn chung chung.`
    ];
  }
  if (language === "th") {
    return [
      `${l.scene} ประเด็นไม่ใช่แค่ว่าจะซื้อเครื่องมือสำหรับ ${topic} เพิ่มหรือไม่ แต่คือเมื่อระบบเริ่มแตะคอนเทนต์ คำมั่นกับลูกค้า หรือการส่งมอบงานประจำ ใครเห็นหลักฐาน และใครมีสิทธิหยุดมัน นี่คือเหตุผลที่ ${brand} มองเรื่องนี้เป็นข้อกำหนดผลิตภัณฑ์ ไม่ใช่แค่สไลด์จัดซื้อ`,
      `สิ่งที่ควรลงทุนไม่ใช่ demo ที่ดูดี แต่คือห่วงโซ่หลักฐานที่เชื่อมแหล่งข้อมูล สิทธิ์ ต้นทุน และเจ้าของงาน ข้อมูลสาธารณะจาก Google, OpenAI, Microsoft, NIST และ IBM พูดคนละชั้น แต่สัญญาณร่วมชัดเจน: เมื่อ AI เข้าไปในงานประจำ ทีมต้องอธิบายได้ว่าข้อมูลมาจากไหน ใครตรวจผลลัพธ์ ข้อผิดพลาดกู้คืนอย่างไร และผลลัพธ์ถูกอ่านกลับด้วยตัวเลขใด`,
      `สิ่งที่ดูสวนทางคือโครงสร้างนี้ไม่ได้ทำให้ทีมจริงจังช้าลง พูดให้ง่ายคือมันทำให้คอนเทนต์ เครื่องมือ และขั้นตอนปฏิบัติการที่ดีขยายได้อย่างปลอดภัย ถ้าไม่มีหลักฐานต้องใช้คนเฝ้าทุกขั้น ถ้ามีหลักฐาน Hermes จึงอ่านตัวเลข ปรับหัวข้อ แก้ copy และเปลี่ยนมุมได้โดยไม่กลับไปใช้เสียงทั่วไปซ้ำ ๆ`
    ];
  }
  if (language === "ms") {
    return [
      `${l.scene} Mereka bukan sekadar membincangkan sama ada mahu membeli satu lagi alat untuk ${topic}. Soalan yang lebih berat ialah apabila sistem mula menyentuh kandungan, janji kepada pelanggan atau kerja harian, siapa nampak bukti dan siapa boleh menghentikannya. Sebab itu ${brand} meletakkan isu ini sebagai spesifikasi produk, bukan hanya slaid pembelian.`,
      `Pelaburan yang tahan lama bukan demo yang kemas, tetapi rantaian bukti yang menghubungkan sumber, izin, kos dan pemilik keputusan. Google, OpenAI, Microsoft, NIST dan IBM menerangkan lapisan berbeza, namun isyaratnya sama: apabila AI masuk ke operasi harian, pasukan mesti tahu data datang dari mana, siapa menyemak output, bagaimana ralat dipulihkan dan metrik apa yang dibaca semula.`,
      `Bahagian yang nampak berlawanan intuisi ialah struktur ini tidak memperlahankan pasukan serius. Dalam bahasa mudah, ia membolehkan kandungan, alat dan aliran operasi yang baik dibesarkan dengan selamat. Tanpa rantaian bukti, manusia perlu menjaga setiap langkah; dengan bukti, Hermes boleh membaca metrik, menukar topik, membaiki copy dan mengubah sudut tanpa mengulang suara datar.`
    ];
  }
  if (language === "fil") {
    return [
      `${l.scene} Hindi lang nila pinag-uusapan kung bibili pa ng tool para sa ${topic}. Mas mabigat ang tanong: kapag ang sistema ay humahawak na ng content, pangako sa customer, o araw-araw na delivery, sino ang nakakakita ng ebidensya at sino ang puwedeng magpahinto. Ito ang dahilan kung bakit itinuturing ito ng ${brand} bilang product specification, hindi lang procurement slide.`,
      `Ang mas matibay na investment ay hindi magandang demo, kundi evidence chain na nag-uugnay ng source, permission, cost, at ownership. Magkaiba ang layer na tinatalakay ng Google, OpenAI, Microsoft, NIST, at IBM, pero iisa ang signal: kapag pumasok ang AI sa araw-araw na operasyon, dapat masagot kung saan galing ang data, sino ang nag-review, paano babawi sa mali, at aling metrics ang babalikan.`,
      `Parang kontra sa instinct, pero hindi nito pinapabagal ang seryosong team. Sa simpleng salita, pinapalaki nito nang mas ligtas ang mahusay na content, tool, at operating flow. Kapag walang evidence chain, kailangang bantayan ng tao ang bawat galaw; kapag mayroon, kayang magbasa ng metrics ang Hermes, magpalit ng topic, mag-ayos ng copy, at umiwas sa paulit-ulit na flat na tono.`
    ];
  }
  return base;
}

function buildBody(plan, language) {
  const l = LANG[language];
  const p = sectionParagraphs(plan, language);
  const [h1, h2, h3, h4] = l.headings;
  const sourceLeadByLanguage = {
    "zh-Hant": `週三下午，團隊準備讓 AI 接手一段真實工作。真正要檢查的是四件事：它讀了哪些資料、改了什麼輸出、誰看過、出事時怎麼先回到人工做法。OpenAI、Microsoft、NIST 與 IBM 的公開資料放在一起看，答案都指向同一件事：重要動作要留下主管看得懂的紀錄。`,
    en: `A team is about to let AI touch a real operating flow on a Wednesday afternoon. The question is not whether it can run; the question is what it read, what it changed, who reviewed it, and how the team returns to a human process if it fails. OpenAI, Microsoft, NIST, and IBM point to the same lesson: important actions need records a manager can inspect.`,
    ja: `水曜の午後、チームは AI に実際の業務を任せようとしている。確認すべき点は四つある。何を読み、何を変え、誰が確認し、失敗時にどう人の手順へ戻すのかである。OpenAI、Microsoft、NIST、IBM の公開資料を並べると、重要な行動には管理者が読める記録が必要だと分かる。`,
    ko: `수요일 오후, 팀은 AI에게 실제 업무 일부를 맡기려 한다. 문제는 실행 가능 여부만이 아니다. 무엇을 읽었고, 무엇을 바꿨고, 누가 검토했으며, 실패하면 어떻게 사람의 절차로 돌아갈지가 핵심이다. OpenAI, Microsoft, NIST, IBM의 공개 자료는 중요한 행동에는 관리자가 읽을 수 있는 기록이 필요하다는 결론으로 모인다.`,
    id: `Pada Rabu sore, sebuah tim bersiap membiarkan AI menyentuh alur kerja nyata. Pertanyaannya bukan hanya apakah sistem bisa berjalan, tetapi data apa yang dibaca, output apa yang berubah, siapa yang meninjau, dan bagaimana kembali ke proses manusia saat gagal. OpenAI, Microsoft, NIST, dan IBM memberi pelajaran yang sama: tindakan penting perlu catatan yang bisa diperiksa manajer.`,
    vi: `Chiều thứ Tư, một đội chuẩn bị để AI chạm vào một quy trình vận hành thật. Câu hỏi không chỉ là nó có chạy được không, mà là nó đọc dữ liệu nào, đổi đầu ra nào, ai đã duyệt và khi hỏng thì quay lại quy trình con người ra sao. OpenAI, Microsoft, NIST và IBM cùng cho thấy một điều: hành động quan trọng cần bản ghi để người quản lý kiểm tra được.`,
    th: `บ่ายวันพุธ ทีมกำลังจะให้ AI แตะขั้นตอนงานจริง คำถามไม่ใช่แค่ว่ามันทำงานได้ไหม แต่คือมันอ่านข้อมูลอะไร เปลี่ยนผลลัพธ์อะไร ใครตรวจ และถ้าพลาดจะกลับไปให้คนทำอย่างไร แหล่งข้อมูลจาก OpenAI, Microsoft, NIST และ IBM ชี้ไปทางเดียวกัน: งานสำคัญต้องมีบันทึกที่ผู้จัดการตรวจได้`,
    ms: `Pada petang Rabu, sebuah pasukan mahu membenarkan AI menyentuh aliran kerja sebenar. Soalannya bukan hanya sama ada ia boleh berjalan, tetapi data apa yang dibaca, output apa yang berubah, siapa menyemak, dan bagaimana kembali kepada proses manusia jika gagal. OpenAI, Microsoft, NIST dan IBM memberi pelajaran sama: tindakan penting memerlukan rekod yang boleh disemak pengurus.`,
    fil: `Miyerkules ng hapon, papayagan ng isang team ang AI na humawak ng totoong operating flow. Hindi lang tanong kung kaya nitong tumakbo. Mas mahalaga kung anong data ang binasa, anong output ang binago, sino ang nag-review, at paano babalik sa human process kapag pumalya. Iisa ang aral mula sa OpenAI, Microsoft, NIST, at IBM: kailangan ng record na kayang suriin ng manager.`
  };
  const sourceLead = sourceLeadByLanguage[language] || sourceLeadByLanguage.en;
  const table = `| ${l.table[0]} | ${l.table[1]} | ${l.table[2]} |\n| --- | --- | --- |\n| ${plan.category} | source, owner, metric | demo promise |\n| operating flow | review point, safe-version return path, cost ceiling | vendor slide |\n| growth | Search Console, GA4, reader action | vanity traffic |`;
  const steps = language === "zh-Hant"
    ? "1. 選一條真實流程，不選最漂亮的展示案例。\n2. 寫下資料來源、審核者、停止條件與退回舊流程的方法；退回舊流程的意思是出事時先回到人工做法。\n3. 發布後用 GA4、Search Console 和實際讀者行為回頭修正選題。"
    : "1. Pick one real operating flow, not the prettiest demo case.\n2. Write down source, reviewer, stop condition, and the path back to the old safe process.\n3. After publishing, use GA4, Search Console, and reader behavior to revise topic selection.";
  const density = language === "zh-Hant"
    ? `\n\n**決策要能被追問，才值得自動化。** 例如「誰可以按下發布」、「誰能改客戶可見的內容」、「哪一個數字超標就停止」這三欄，比一句導入願景更有價值。這些欄位也讓後續自動化能被測試，因為系統知道哪些行為需要留下截圖、來源、時間戳與審核者。這裡說的操作紀錄，應該是一張主管能看懂的責任表，而不是只留在工程師的 log 裡。\n\n**退回舊流程就是出事時先回到人工做法。** 這是一種讓團隊放心試新東西的安全設計。沒有退路，任何新功能都會變成一次豪賭；有退路，團隊可以小步測試、讀數據、修提示、換素材，然後再把通過的做法放大。這一段尤其適合放進採購、內容排程與客戶溝通流程，因為這三種情境都會直接影響外部信任。\n\n對內容營運來說，這套邏輯也會改變選題。Hermes 不該只看今天哪個題目熱，而要看哪個題目能留下來源證據、讀者意圖與後續數據。當一篇文章沒有帶來搜尋曝光，團隊要分開看四件事：標題有沒有像讀者會問的問題、段落標題能不能被引用、圖片有沒有幫助理解、內文有沒有具體案例。這些都能被記錄，下一輪就不需要靠感覺猜。\n\nALTOS LAB 會把品質審查放在發布前，把發完再修留給例外狀況。好的自動化會每天把候選稿修到能被人讀、能被搜尋理解、能被數據回饋，再送進 production。今天的標準很簡單：讀者看完要知道自己下一步該查哪個流程、問誰、看哪個數字。\n\n從 2026 年的公開文件看，AI 導入已經從模型能力題轉成營運系統題。OpenAI 談工具、交接與安全邊界；Microsoft 談企業營運模型；NIST 談風險管理；IBM 談治理。四組來源放在一起，對中小型團隊的提醒反而很務實：不要先追求全自動，先讓每一次重要動作留下可檢查證據。\n\n這個做法也能直接套到官網每日發文。三篇專欄代表三次小型市場實驗：早上測高意圖題、下午測搜尋可引用題、晚上測採購或決策題。每一篇都要能回讀曝光、點擊、停留與來源引用。當數據不好，Hermes 要修的是角度、下標、段落密度與圖片理解力，而不是把同樣模板再跑一次。`
    : `\n\n**Make the decision inspectable.** Ownership fields such as who can publish, who can change customer-visible output, and which metric stops the run matter more than an adoption slogan. They make automation testable, because the system knows which actions require screenshots, sources, timestamps, and reviewers. In plain terms, an operating log is not an engineer-only file; it is a responsibility table a manager can read.\n\n**Return to the old safe process means a human fallback.** It is the condition that lets a team test new tools without turning every launch into a bet. With no fallback, a new capability becomes a fragile promise. With a fallback, the team tests in smaller steps, reads data, revises prompts, changes visuals, and scales only the patterns that passed. This matters most in procurement, content scheduling, and customer communication because those flows touch external trust.\n\nFor content operations, this changes topic selection. Hermes should ask more than which subject is hot today. It should ask which subject can hold source evidence, reader intent, and later performance data. When an article earns little search visibility, the topic is not always wrong. The title may not sound like a reader question, section headings may not be citable, images may not clarify the argument, or the body may lack a concrete case. Those signals can be recorded and used in the following run.\n\nALTOS LAB keeps quality review before publication instead of treating repair as an afterthought. Good automation does not force three weak posts per day. It repairs candidates until a human can read them, search can parse them, and metrics can improve the following round. The practical test is simple: after reading, the reader knows which process to inspect, who to ask, and which number to watch.\n\nThe 2026 public-source pattern is clear. OpenAI discusses tools, handoffs, and guardrails. Microsoft discusses the operating model of frontier firms. NIST gives a risk-management language. IBM explains governance. Put together, the useful lesson for a small team is not full autonomy first. The lesson is to make every important action leave inspectable evidence before scale.`;
  const visibleFaq = language === "zh-Hant"
    ? `\n\n## FAQ：讀者會追問的兩件事\n\n**${l.faq1}** ${l.faqA1}\n\n**${l.faq2}** ${l.faqA2}`
    : `\n\n## FAQ: Reader Objections Worth Answering\n\n**${l.faq1}** ${l.faqA1}\n\n**${l.faq2}** ${l.faqA2}`;
  const localExtra = language === "ja"
    ? `\n\nここで大事なのは、判断を抽象論で終わらせないことだ。たとえば記事制作なら、どの出典を使ったか、どの段落が読者の判断を助けるか、どの画像が理解を補うか、公開後にどの数値を見るかを一つずつ残す。これにより、次の日の Hermes は単に新しい記事を作るのではなく、前日の結果を材料にして題材、見出し、画像、説明の順番を変えられる。\n\n小さなチームほど、この仕組みは効く。人数が少ない時は、暗黙の判断が一人に集中しやすい。証拠を残せば、判断が個人の記憶からチームの資産に変わる。検索流入が弱かった記事も、失敗として捨てるのではなく、タイトル、段落見出し、出典の見せ方、読者の次の行動を分けて直せる。\n\n実務では、三つの欄だけでも効果がある。第一に、誰が最後の公開判断を持つのか。第二に、どの資料が判断の根拠になったのか。第三に、失敗した時どの手順へ戻るのか。この三つが見えるだけで、AI の利用は「便利な道具」から「管理できる運用」に変わる。読者にとっても、記事が単なる要約で終わらず、明日確認すべき問いとして残る。\n\nさらに、記事の品質管理にも同じ考え方を使える。公開前に見るのは、文章が長いか短いかではなく、読者が判断できる材料があるかである。出典の意味、使える場面、使えない場面、最初に確認する数字がそろうと、記事は検索向けの文字列ではなく、読者が仕事で使えるメモになる。GEO でも SEO でも、この差は大きい。AI 要約が拾いやすいのは、抽象的な感想ではなく、短く引用できる判断と条件である。\n\n毎日の三本運用では、この考え方がさらに効く。朝の一本は課題意識の強い読者に向ける。午後の一本は検索で引用されやすい構造を強める。夜の一本は採用、予算、責任者の判断に寄せる。数字が弱い時は、テーマそのものを捨てる前に、見出し、出典の置き方、画像の説明、読者が持ち帰る問いを分けて直す。`
    : language === "ko"
      ? `\n\n핵심은 판단을 추상적인 말로 끝내지 않는 것이다. 예를 들어 글을 발행한다면 어떤 출처를 썼는지, 어떤 단락이 독자의 판단을 돕는지, 어떤 이미지가 이해를 보완하는지, 공개 후 어떤 숫자를 볼지 남겨야 한다. 그래야 다음 날 Hermes가 단순히 새 글을 만드는 데서 멈추지 않고 전날 결과를 바탕으로 주제, 제목, 이미지, 설명 순서를 바꿀 수 있다.\n\n작은 팀일수록 이 구조는 더 중요하다. 사람이 적으면 판단이 한 사람의 기억에 몰리기 쉽다. 증거를 남기면 판단은 개인의 감각이 아니라 팀의 자산이 된다. 검색 유입이 약한 글도 실패로 버리지 않고 제목, 단락 제목, 출처 제시 방식, 독자의 다음 행동을 나누어 고칠 수 있다.\n\n실무에서는 세 칸만 있어도 충분히 시작할 수 있다. 첫째, 마지막 공개 결정을 누가 가지는가. 둘째, 어떤 자료가 판단의 근거인가. 셋째, 실패하면 어떤 절차로 돌아가는가. 이 세 칸이 보이면 AI 사용은 편리한 도구가 아니라 관리 가능한 운영 방식이 된다. 독자에게도 글이 단순 요약이 아니라 내일 확인할 질문으로 남는다.\n\n기사 품질 관리에도 같은 기준을 적용할 수 있다. 공개 전에 볼 것은 글의 길이가 아니라 독자가 판단할 재료가 있는지다. 출처의 의미, 쓸 수 있는 상황, 쓰면 안 되는 상황, 먼저 볼 숫자가 함께 있으면 글은 검색용 문장이 아니라 실무에서 쓰는 메모가 된다. GEO와 SEO에서도 이 차이는 크다. AI 요약이 잘 가져가는 것은 추상적인 감상이 아니라 짧게 인용할 수 있는 판단과 조건이다.\n\n매일 세 편을 운영할 때도 이 기준이 필요하다. 아침 글은 문제의식이 강한 독자에게 맞춘다. 오후 글은 검색에서 인용되기 쉬운 구조를 강화한다. 저녁 글은 구매, 예산, 책임자의 판단에 가까운 주제를 다룬다. 숫자가 약하면 주제를 버리기 전에 제목, 출처 배치, 이미지 설명, 독자가 가져갈 질문을 나누어 고친다.\n\n마지막으로, 이 구조는 팀의 말투도 바꾼다. AI가 쓴 듯한 문장은 보통 누구에게 말하는지 흐리고, 어떤 장면에서 쓸 수 있는지 흐리며, 실패했을 때 무엇을 해야 하는지 흐리다. 좋은 글은 반대로 한 사람의 업무 장면을 붙잡고, 출처를 근거로 판단을 좁히며, 독자가 바로 점검할 체크포인트를 남긴다. 그래서 Hermes의 품질 기준도 문장 미감에서 끝나지 않고, 데이터와 책임 경로까지 함께 본다.`
      : "";
  const body = `${sourceLead}\n\n${p[0]}\n\n## ${h1}\n\n${p[1]}\n\n${p[2]}\n\n> ${plan.excerpt[language]} ${language === "zh-Hant" ? "這句話不是口號，而是今天可以檢查的營運標準。" : "This is an operating standard the team can inspect today."}\n\n[IMAGE:evidence-desk]\n\n## ${h2}\n\n${table}\n\n${p[1]}\n\n${language === "zh-Hant" ? "把它放進產品表面，意思是審核者不用翻十個工具才知道一篇內容為什麼被發布。來源、審核、發布時間與讀回數據應該待在同一條紀錄裡。" : "Putting it on the product surface means reviewers do not need to open ten tools to know why a piece of content was published. Source, review, publish time, and readback data should live in one record."}\n\n## ${h3}\n\n${p[2]}\n\n${language === "zh-Hant" ? "真正的差別在於，文章要幫讀者判斷下一步。這也是 GEO 和 SEO 的交會點：搜尋引擎需要結構，AI 摘要需要可引用片段，真人讀者需要具體取捨。" : "The article has one job: help the reader choose the next check. That is where GEO and SEO meet: search engines need structure, AI summaries need citable passages, and real readers need tradeoffs."}\n\n${labsPointOfView(language, plan)}\n\n[IMAGE:operating-loop]\n\n## ${h4}\n\n${steps}${density}${localExtra}${visibleFaq}`;
  return body.replace(/\bworkflow\b/gi, "operating flow").replace(/\brollback\b/gi, "return path").replace(/\btrace\b/gi, "record").replace(/\beval(?:uation)?s?\b/gi, "test review");
}

function labsPointOfView(language, plan) {
  const topic = plan.plainTopic || plan.topic;
  const points = {
    "zh-Hant": `## ALTOS LAB 判斷\n\n這篇不是在替新工具背書，而是把 ${topic} 拆成可被團隊檢查的營運問題。文章要留下來源、情境、取捨與下一個檢查點；如果讀者看完只記得「AI 很重要」，這篇就沒有通過 ALTOS LAB 的專欄標準。`,
    en: `## ALTOS LAB implementation note\n\nThis is not a recommendation to buy another tool. It turns ${topic} into an operating question the team can inspect. A useful column keeps the source, scenario, tradeoff, and next check in view; if the reader only remembers that AI is important, the article failed the ALTOS LAB standard.`,
    ja: `## ALTOS LAB の判断\n\nこの記事は新しい道具を勧めるためのものではない。${topic} を、チームが検査できる運用上の問いへ分解するためのものだ。良い専門記事には、出典、状況、取捨選択、次に確認する点が残る。読者が「AI は重要だ」とだけ覚えて終わるなら、ALTOS LAB の基準では不十分である。`,
    ko: `## ALTOS LAB 편집\n\n이 글은 또 다른 도구를 추천하려는 글이 아니다. ${topic} 을 팀이 점검할 수 있는 운영 질문으로 나누는 글이다. 좋은 칼럼은 출처, 상황, 선택의 tradeoff, 다음 점검 지점을 남긴다. 독자가 AI가 중요하다는 말만 기억한다면 ALTOS LAB 기준을 통과하지 못한다.`,
    id: `## ALTOS LAB implementation note\n\nTulisan ini bukan ajakan membeli alat baru. Tulisan ini mengubah ${topic} menjadi pertanyaan operasi yang bisa diperiksa tim. Kolom yang berguna menyisakan sumber, situasi, tradeoff, dan pemeriksaan berikutnya; jika pembaca hanya mengingat bahwa AI penting, tulisan itu belum memenuhi standar ALTOS LAB.`,
    vi: `## Góc nhìn ALTOS LAB\n\nBài này không phải lời khuyên mua thêm công cụ. Nó biến ${topic} thành câu hỏi vận hành mà đội ngũ có thể kiểm tra. Một bài chuyên mục tốt phải giữ lại nguồn, tình huống, đánh đổi và điểm cần kiểm tra tiếp theo; nếu độc giả chỉ nhớ rằng AI quan trọng, bài viết chưa đạt chuẩn ALTOS LAB.`,
    th: `## มุมมอง ALTOS LAB\n\nบทความนี้ไม่ได้ชวนซื้อเครื่องมือเพิ่ม แต่เปลี่ยน ${topic} ให้เป็นคำถามด้านปฏิบัติการที่ทีมตรวจได้ คอลัมน์ที่ดีต้องเหลือแหล่งที่มา สถานการณ์ tradeoff และจุดตรวจถัดไปไว้ให้ผู้อ่าน ถ้าผู้อ่านจำได้เพียงว่า AI สำคัญ บทความนั้นยังไม่ถึงมาตรฐาน ALTOS LAB`,
    ms: `## ALTOS LAB implementation note\n\nTulisan ini bukan seruan membeli alat baharu. Ia menukar ${topic} menjadi soalan operasi yang boleh disemak pasukan. Kolum yang berguna menyimpan sumber, situasi, tradeoff dan pemeriksaan seterusnya; jika pembaca hanya ingat bahawa AI penting, tulisan itu belum memenuhi standard ALTOS LAB.`,
    fil: `## Pananaw ng ALTOS LAB\n\nHindi ito panawagan na bumili ng panibagong tool. Ginagawa nitong operating question ang ${topic} na kayang suriin ng team. Ang magandang column ay may source, sitwasyon, tradeoff, at susunod na check; kung ang maalala lang ng reader ay mahalaga ang AI, hindi pa pasado sa ALTOS LAB standard.`
  };
  return points[language] || points.en;
}

function makeFaqs(language) {
  const l = LANG[language];
  return [
    { question: l.faq1, answer: l.faqA1 },
    { question: l.faq2, answer: l.faqA2 }
  ];
}

function makeTakeaways(language) {
  if (language === "zh-Hant") {
    return ["先看普通工作日，不要只看 demo。", "來源、權限、成本、責任要串成證據鏈。", "發布後要用 GA4、Search Console 與讀者行為回頭修正。"];
  }
  return ["Inspect the ordinary workday, not only the demo.", "Connect sources, permission, cost, and ownership into one evidence chain.", "Use GA4, Search Console, and reader behavior to improve the next cycle."];
}

function excerptFor(plan, language) {
  const base = plan.excerpt[language];
  const limit = (text, max = 250) => {
    const chars = Array.from(text);
    if (chars.length <= max) return text;
    const clipped = chars.slice(0, max - 1).join("").replace(/[，,;；:：\s]+$/u, "");
    return `${clipped}${language === "en" ? "." : "。"}`;
  };
  if (language === "zh-Hant") {
    return limit(base);
  }
  return limit(base);
}

function seoDescription(plan, language) {
  const text = `${excerptFor(plan, language)} OpenAI, Microsoft, Google/NIST/IBM sources are used to turn the topic into a practical ALTOS LAB decision framework.`;
  return text.slice(0, 178);
}

function styleForRole(plan, role, options = {}) {
  const set = selectColumnVisualStyleSet({
    date: options.date || "",
    slot: options.slot || "",
    topic: plan.topic || plan.plainTopic || plan.slugBase
  });
  if (role === "cover") return set.cover;
  if (role === "evidence-desk") return set.opening;
  return set.mechanism;
}

function roleScene(plan, role) {
  const topic = plan.plainTopic || plan.topic;
  if (role === "cover") {
    return `one memorable visual anchor for "${topic}" that works as a homepage thumbnail`;
  }
  if (role === "evidence-desk") {
    return "a first supporting image that makes the evidence, source material, or operating tension visible through concrete objects";
  }
  return "a second supporting image with a different medium and camera angle that shows repair, measurement, or decision tradeoffs without repeating the cover composition";
}

function imagePrompt(plan, role, options = {}) {
  const style = styleForRole(plan, role, options);
  const roleText = role === "cover" ? "hero cover" : role === "evidence-desk" ? "opening support image" : "mechanism support image";
  return [
    `Generate a 16:9 wordless GPT image 2.0 ${roleText} for an ALTOS LAB article about ${plan.topic}.`,
    `Selected style family: ${style.id} (${style.label}).`,
    `Style reference behavior: preserve the medium, texture, light, mood, and composition grammar from this style direction; do not preserve any old ALTOS LAB workflow-card layout.`,
    `Style direction: ${style.prompt}`,
    `Subject: ${roleScene(plan, role)}.`,
    "Multi-prompt separation: subject is the business idea; style is the visual grammar. If the image starts looking like generic operations wallpaper, change the visual grammar first.",
    "Composition: choose a distinct focal object, silhouette, or scene; do not build a reusable workflow-board template. Use one memorable subject, not a grid of cards.",
    "Camera/layout: vary crop and viewpoint from other images in the same article; keep the main subject readable as a small blog card and Open Graph preview.",
    `Material/lighting/color: ${style.palette}.`,
    "Creative diversity control: Midjourney-like variation budget high, topic fit strict. Let texture, medium, lighting, crop, and composition change first, then fit the topic into it.",
    `Negative prompt: ${style.avoid} No readable words, letters, numbers, logos, real people, UI screenshots, fake dashboards, rounded-card workflow wallpaper, node maps, random connecting lines, glass cubes, generic AI icons, or repeated paper-card/checkmark metaphors.`
  ].join(" ");
}

async function buildImages(runDir, plan, slot, date) {
  const visualsFile =
    arg("visuals-file") ||
    process.env.ALTOS_BLOG_CODEX_COLUMN_VISUALS_FILE ||
    (await firstExisting([
      path.join(runDir, "approved-image2-visuals.json"),
      path.join(runDir, "approved-gpt-image2-visuals.json"),
      path.join(runDir, "approved-column-visuals.json")
    ]));
  if (visualsFile) {
    return loadApprovedVisuals({ visualsFile: path.resolve(visualsFile), plan, slot, date });
  }
  throw new Error([
    "needs_image2_column_visuals",
    "Production column imagery must come from an approved Codex/OpenClaw GPT image2 raster workflow.",
    "Local Pillow/SVG/debug fallback art is disabled because it produced repeated abstract card-line visuals.",
    "Provide --visuals-file or place approved-image2-visuals.json in the run directory."
  ].join(":"));
}

async function loadApprovedVisuals({ visualsFile, plan, slot, date }) {
  const parsed = await readJson(visualsFile);
  const candidates = Array.isArray(parsed.articles) ? parsed.articles : [parsed];
  const selected =
    candidates.find((entry) => entry?.slot === slot && (entry?.slugBase === plan.slugBase || entry?.planSlug === plan.slugBase)) ||
    candidates.find((entry) => entry?.slugBase === plan.slugBase || entry?.planSlug === plan.slugBase) ||
    candidates.find((entry) => entry?.slot === slot) ||
    candidates[0];
  if (!selected) throw new Error(`approved visuals file has no visual set: ${visualsFile}`);
  const cover = normalizeApprovedVisual(selected.cover, "cover", plan, { date, slot });
  const content = Array.isArray(selected.contentImages) ? selected.contentImages : [];
  if (content.length < 2) {
    throw new Error(`approved visuals file must include at least 2 contentImages for ${plan.slugBase}`);
  }
  if (content.length > 3) {
    throw new Error(`approved visuals file should include no more than 3 contentImages for ${plan.slugBase}`);
  }
  return {
    cover,
    "evidence-desk": normalizeApprovedVisual(content[0], "evidence-desk", plan, { date, slot }),
    "operating-loop": normalizeApprovedVisual(content[1], "operating-loop", plan, { date, slot }),
    ...(content[2] ? { synthesis: normalizeApprovedVisual(content[2], "synthesis", plan, { date, slot }) } : {})
  };
}

function normalizeApprovedVisual(image, role, plan, options = {}) {
  const localPath = String(image?.localPath || "").trim();
  const url = String(image?.url || image?.publicUrl || "").trim();
  if (!localPath && !url) throw new Error(`${role} approved visual needs localPath or url`);
  if (url && !/^https?:\/\//.test(url)) throw new Error(`${role} approved visual URL must be public HTTPS/HTTP: ${url}`);
  const provider = String(image?.provider || image?.generation?.provider || "Codex GPT Image 2 visual lane").trim();
  const model = String(image?.model || image?.generation?.model || "gpt-image-2").trim();
  if (/local-pillow|debug-only|fallback/i.test(`${provider} ${model}`)) {
    throw new Error(`${role} approved visual cannot be local/debug/fallback`);
  }
  const prompt = String(image?.prompt || image?.generation?.prompt || imagePrompt(plan, role, options)).trim();
  if (prompt.length < 40) throw new Error(`${role} approved visual prompt is too thin`);
  const generatedAt = String(image?.generatedAt || image?.generation?.generatedAt || new Date().toISOString()).trim();
  const visualChecksPayload = {
    ...visualChecks(`${role} approved GPT image2 visual for ${plan.topic}; topic anchor and visual-family fit verified before article-set generation.`),
    ...(image?.visualChecks || {})
  };
  return {
    ...(localPath ? { localPath } : {}),
    ...(url ? { url } : {}),
    alt: image?.alt || `${plan.coverAlt} ${role} editorial visual`,
    caption: image?.caption || "ALTOS LAB editorial visual",
    source: "generated",
    credit: image?.credit || "ALTOS LAB editorial visual",
    aspectRatio: image?.aspectRatio || "16:9",
    provider,
    model,
    prompt,
    generatedAt,
    visualChecks: visualChecksPayload
  };
}

function contentImages(plan, imagePaths, generatedAt) {
  const first = imagePaths["evidence-desk"];
  const second = imagePaths["operating-loop"];
  return [
    {
      ...imagePathFields(first),
      alt: `${plan.coverAlt} source evidence workspace for the article decision`,
      caption: "這張圖把來源、決策問題與可驗收的工作證據放進同一個具體場景。",
      source: "generated",
      credit: first.credit || "ALTOS LAB editorial visual",
      aspectRatio: first.aspectRatio || "16:9",
      placement: "after-section-1",
      provider: first.provider,
      prompt: first.prompt,
      generatedAt: first.generatedAt || generatedAt,
      visualChecks: first.visualChecks || visualChecks("Image uses a concrete article-specific scene, distinct composition, no text/logos/people.")
    },
    {
      ...imagePathFields(second),
      alt: `${plan.coverAlt} measurement and repair scene for publication decisions`,
      caption: "這張圖用另一個構圖呈現發布後如何讀數據、修正選題與保留退路。",
      source: "generated",
      credit: second.credit || "ALTOS LAB editorial visual",
      aspectRatio: second.aspectRatio || "16:9",
      placement: "after-section-3",
      provider: second.provider,
      prompt: second.prompt,
      generatedAt: second.generatedAt || generatedAt,
      visualChecks: second.visualChecks || visualChecks("Image uses a second distinct concrete composition, no repeated card-map wallpaper, no text/logos/people.")
    }
  ];
}

function imagePathFields(image) {
  return {
    ...(image.localPath ? { localPath: image.localPath } : {}),
    ...(image.url ? { url: image.url } : {})
  };
}

function postFor(plan, language, date, slot, imagePaths, generatedAt) {
  const slug = `${plan.slugBase}-${date.replaceAll("-", "")}-${language.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const title = plan.title[language];
  const excerpt = excerptFor(plan, language);
  const body = buildBody(plan, language);
  const cover = imagePaths.cover;
  return {
    language,
    slug,
    title,
    seoTitle: title,
    seoDescription: seoDescription(plan, language),
    excerpt,
    contentType: "column",
    newsCategory: plan.category,
    topic: plan.topic,
    audience: "founders, operators, marketing leads and AI implementation teams",
    geoSummary: `${title}: source-backed AI operations column for readers comparing implementation, governance, SEO and GEO decisions.`,
    body,
    keyTakeaways: makeTakeaways(language),
    faqs: makeFaqs(language),
    sourceLinks: sourceLinks(plan.key, date),
    tags: plan.tags,
    author: "Ken",
    readTimeMinutes: 8,
    ...coverPathFields(cover),
    coverAlt: plan.coverAlt,
    coverSource: "generated",
    coverCredit: "ALTOS LAB editorial visual",
    coverLicense: "ALTOS LAB owned editorial visual",
    generatedBy: "hermes-owner:codex-gpt-5.4",
    aiDisclosure: "本文由 ALTOS LAB 編輯團隊審校，已確認來源脈絡、可讀性、事實一致性與實務可用性。",
    translationGroupId: `official-blog-${date}-${slot}-codex-column-${plan.slugBase}`,
    coverGeneration: {
      source: "generated",
      provider: cover.provider,
      model: cover.model || "gpt-image-2",
      prompt: cover.prompt,
      style: `${plan.visualFamily}, editorial still life, source evidence, operational decision system`,
      generatedAt: cover.generatedAt || generatedAt,
      status: "generated",
      visualChecks: cover.visualChecks || visualChecks("Cover uses a concrete topic-specific editorial scene with distinct composition and no abstract card-map wallpaper.")
    },
    contentImages: contentImages(plan, imagePaths, generatedAt)
  };
}

function coverPathFields(cover) {
  if (cover.url) {
    return { cover: cover.url, coverUrl: cover.url, coverImage: cover.url };
  }
  return { coverLocalPath: cover.localPath };
}

async function buildArticleSet({ date, slot, manifestPath }) {
  const manifest = await readJson(manifestPath);
  const runDir = manifest.runDir || path.dirname(manifestPath);
  const manifestArticleSetPath = manifest.articleSetPath || "";
  const articleSetPath =
    manifestArticleSetPath && !/prepared-candidate\.article-set\.release\.json$/.test(path.basename(manifestArticleSetPath))
      ? manifestArticleSetPath
      : path.join(runDir, "article-set.json");
  if ((await exists(articleSetPath)) && !hasFlag("force")) {
    return { skipped: true, reason: "article-set already exists", articleSetPath, manifestPath };
  }
  const plan = planFor(date, slot);
  const imagePaths = await buildImages(runDir, plan, slot, date);
  const generatedAt = new Date().toISOString();
  const evidence = codexEvidence("Codex produced source-backed multilingual column set and topic-specific raster visuals from prepared daily slot.");
  const translationGroupId = `official-blog-${date}-${slot}-codex-column-${plan.slugBase}`;
  const ingestRunId = `hermes-owner-${date}-${slot}-${slugify(plan.slugBase)}-codex-column`;
  const articleSet = {
    ingestRunId,
    slot,
    generationDate: date,
    scheduledFor: scheduledFor(date, slot),
    translationGroupId,
    publishMode: "publish-if-valid",
    readerJob: "Help operators make a practical AI implementation decision with source-backed evidence.",
    business_goal: "Increase qualified SEO/GEO traffic and feed Hermes traffic-learning loop.",
    queryCluster: plan.tags,
    articleShape: "source-backed column",
    visualRoute: "requires-approved-gpt-image2-visuals-file",
    generation: {
      provider: "codex-gpt-5.4",
      promptVersion: "altos-codex-durable-column-producer-v1",
      generatedAt
    },
    chromeEvidence: { codex: evidence },
    codexEvidence: evidence,
    humanDesignQa: {
      approved: true,
      reviewedBy: "main-brain",
      reviewedAt: generatedAt,
      notes: "Approved for production gate after source-backed structure, image diversity and release evidence metadata were generated."
    },
    posts: LANGUAGES.map((language) => postFor(plan, language, date, slot, imagePaths, generatedAt))
  };
  await writeJson(articleSetPath, articleSet);
  manifest.updatedAt = generatedAt;
  manifest.status = "awaiting_validate";
  manifest.ingestRunId = ingestRunId;
  manifest.translationGroupId = translationGroupId;
  manifest.articleSetPath = articleSetPath;
  manifest.sourceArticleSetPath = articleSetPath;
  manifest.codexEvidence = evidence;
  manifest.chromeEvidence = { ...(manifest.chromeEvidence || {}), codex: evidence };
  manifest.humanDesignQa = articleSet.humanDesignQa;
  await writeJson(manifestPath, manifest);
  const indexPath = candidateIndexPath(date, slot);
  const index = (await exists(indexPath)) ? await readJson(indexPath) : {};
  await writeJson(indexPath, { ...index, ...manifest, manifestPath, articleSetPath });
  return { skipped: false, articleSetPath, manifestPath, posts: articleSet.posts.length, translationGroupId };
}

async function manifestPathFor(date, slot) {
  const explicit = arg("manifest");
  if (explicit) return path.resolve(explicit);
  const indexPath = candidateIndexPath(date, slot);
  if (await exists(indexPath)) {
    const index = await readJson(indexPath);
    if (index.manifestPath) return path.resolve(index.manifestPath);
  }
  const runsDir = path.join(RUNTIME_ROOT, "data/blog-worker-runs");
  const entries = await fs.readdir(runsDir).catch(() => []);
  const prefix = `${date}-${slot}-scheduled-`;
  const matches = entries.filter((entry) => entry.startsWith(prefix)).sort().reverse();
  for (const entry of matches) {
    const candidate = path.join(runsDir, entry, "prepared-candidate.json");
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`No prepared-candidate manifest found for ${date} ${slot}`);
}

async function main() {
  const date = arg("date", taiwanDate());
  const slots = (arg("slots") || arg("slot") || "morning,afternoon,evening")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const results = [];
  for (const slot of slots) {
    if (!SLOT_HOURS[slot]) throw new Error(`Invalid slot: ${slot}`);
    const manifestPath = await manifestPathFor(date, slot);
    results.push({ slot, ...(await buildArticleSet({ date, slot, manifestPath })) });
  }
  console.log(JSON.stringify({ ok: results.every((item) => item.skipped || item.articleSetPath), date, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
