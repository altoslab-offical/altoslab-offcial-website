import Link from "next/link";
import { BlogEditorialVisual } from "@/components/BlogEditorialVisual";
import { renderBrandText } from "@/components/BrandText";
import { JsonLd } from "@/components/JsonLd";
import { SafeBlogImage } from "@/components/SafeBlogImage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { blogContentTypeLabel, blogIndexPath, blogPostPath } from "@/lib/blog-utils";
import { toBlogVisualPost } from "@/lib/blog-visual";
import { getPublishedBlogInventoryPostsByLanguage } from "@/lib/cms";
import { blogIndexItemListJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import type { BlogLanguage, BlogPost } from "@/lib/types";

type BlogIndexProps = {
  language: BlogLanguage;
  tag?: string;
  query?: string;
  page?: string | number;
};

const rawBlogIndexPageSize = Number(process.env.BLOG_INDEX_PAGE_SIZE || "24");
const BLOG_INDEX_PAGE_SIZE =
  Number.isFinite(rawBlogIndexPageSize) && rawBlogIndexPageSize > 0 ? Math.min(rawBlogIndexPageSize, 24) : 24;

function articleTimestamp(post: BlogPost) {
  return new Date(post.publishedAt || post.updatedAt || post.createdAt).getTime() || 0;
}

const copy = {
  "zh-Hant": {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI 實驗室筆記",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Thoughts on the future of work, from the people and teams creating it.",
    labTitle: "我們研究、建造，然後把經驗發布成可引用的知識。",
    labBody:
      "部落格服務的是整個實驗室定位：從 AI 系統設計、企業流程、內容與搜尋，到每天可落地的產品實驗。",
    lanes: [
      { label: "AI Products", body: "產品化、MVP、使用者流程與交付經驗" },
      { label: "Agents & Automation", body: "AI Agent、工作流、知識庫與營運自動化" },
      { label: "Search & GEO", body: "SEO 基礎、生成式搜尋、內容可引用性" },
      { label: "Build Notes", body: "案例拆解、架構取捨、工具與市場觀察" }
    ],
    featured: "主打文章",
    visualContext: "文章圖片",
    latest: "最新文章",
    categories: "文章分類",
    categoriesHint: "用主題快速找到你想看的方向。",
    startHere: "先從這篇開始",
    postsLabel: "篇文章",
    topicsLabel: "個主題",
    searchLabel: "搜尋文章",
    searchPlaceholder: "搜尋 AI、Agent、GEO...",
    searchSubmit: "搜尋",
    all: "全部",
    read: "閱讀文章",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分鐘閱讀`,
    empty: "目前沒有符合條件的文章。",
    ctaTitle: "想把 AI 實驗變成可以營運的系統？",
    ctaBody: "ALTOS LAB 可以協助你把 AI 產品、內部流程、內容系統、後台 CMS、追蹤事件與自動化發佈流程接成一套可維護的能力。",
    cta: "預約合作討論",
    otherLanguage: "English",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 實作、工具與產品筆記。",
    sidebarTopics: ["Latest", "市場快訊", "市場專欄", "專題", "AI 趨勢", "Agents", "Automation", "GEO", "Build Notes"]
  },
  en: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Thoughts on the future of work, from the people and teams creating it.",
    labTitle: "We research, build, and publish what becomes reusable intelligence.",
    labBody:
      "The journal serves the full lab: AI system design, enterprise workflows, content, search visibility and product experiments that can ship.",
    lanes: [
      { label: "AI Products", body: "Productization, MVPs, user flows and delivery lessons" },
      { label: "Agents & Automation", body: "AI agents, workflows, knowledge bases and operations" },
      { label: "Search & GEO", body: "SEO foundations, generative search and citation design" },
      { label: "Build Notes", body: "Case breakdowns, architecture tradeoffs, tools and markets" }
    ],
    featured: "Featured",
    visualContext: "Article image",
    latest: "Latest Articles",
    categories: "Categories",
    categoriesHint: "Find the right reading lane by topic.",
    startHere: "Start here",
    postsLabel: "posts",
    topicsLabel: "topics",
    searchLabel: "Search articles",
    searchPlaceholder: "Search AI, agents, GEO...",
    searchSubmit: "Search",
    all: "All",
    read: "Read article",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    empty: "No matching articles yet.",
    ctaTitle: "Want to turn AI experiments into operating systems?",
    ctaBody:
      "ALTOS LAB can wire AI products, internal workflows, content systems, CMS operations, tracking events and publishing automation into one maintainable capability.",
    cta: "Discuss a project",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "How we build AI systems, product by product.",
    sidebarTopics: ["Latest", "Market Briefs", "Market Columns", "Features", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  ja: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "AI を研究し、作り、運用へ落とし込むための実験室ノート。",
    labTitle: "私たちは研究し、作り、その学びを引用できる知識として公開します。",
    labBody:
      "このジャーナルは、AI システム設計、企業ワークフロー、コンテンツ、検索可視性、出荷できるプロダクト実験を扱います。",
    lanes: [
      { label: "AI Products", body: "プロダクト化、MVP、ユーザーフロー、納品の学び" },
      { label: "Agents & Automation", body: "AI Agent、ワークフロー、ナレッジベース、運用自動化" },
      { label: "Search & GEO", body: "SEO 基礎、生成 AI 検索、引用される構造" },
      { label: "Build Notes", body: "事例分解、設計判断、ツール、市場観測" }
    ],
    featured: "注目記事",
    visualContext: "記事画像",
    latest: "最新記事",
    categories: "カテゴリー",
    categoriesHint: "読みたいテーマをすばやく探せます。",
    startHere: "まずはこちら",
    postsLabel: "記事",
    topicsLabel: "テーマ",
    searchLabel: "記事を検索",
    searchPlaceholder: "AI、Agent、GEO を検索...",
    searchSubmit: "検索",
    all: "すべて",
    read: "読む",
    updated: "更新",
    readTime: (minutes: number) => `${minutes} 分で読めます`,
    empty: "該当する記事はまだありません。",
    ctaTitle: "AI 実験を運用できるシステムに変えたいですか？",
    ctaBody:
      "ALTOS LAB は AI プロダクト、社内ワークフロー、CMS、計測、自動公開フローを一つの運用能力として接続します。",
    cta: "相談する",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 実装、ツール、プロダクトのノート。",
    sidebarTopics: ["Latest", "市場ブリーフ", "市場コラム", "特集", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  ko: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "AI를 연구하고 만들고 운영으로 옮기는 실험실 노트.",
    labTitle: "우리는 연구하고 만들며, 그 경험을 인용 가능한 지식으로 공개합니다.",
    labBody:
      "이 저널은 AI 시스템 설계, 기업 워크플로, 콘텐츠, 검색 가시성, 출시 가능한 제품 실험을 다룹니다.",
    lanes: [
      { label: "AI Products", body: "제품화, MVP, 사용자 흐름, 실행 경험" },
      { label: "Agents & Automation", body: "AI Agent, 워크플로, 지식베이스, 운영 자동화" },
      { label: "Search & GEO", body: "SEO 기초, 생성형 검색, 인용 가능한 콘텐츠 구조" },
      { label: "Build Notes", body: "사례 분석, 아키텍처 판단, 도구와 시장 관찰" }
    ],
    featured: "추천 글",
    visualContext: "글 이미지",
    latest: "최신 글",
    categories: "카테고리",
    categoriesHint: "관심 있는 주제를 빠르게 찾을 수 있습니다.",
    startHere: "여기서 시작",
    postsLabel: "글",
    topicsLabel: "주제",
    searchLabel: "글 검색",
    searchPlaceholder: "AI, Agent, GEO 검색...",
    searchSubmit: "검색",
    all: "전체",
    read: "읽기",
    updated: "업데이트",
    readTime: (minutes: number) => `${minutes}분 읽기`,
    empty: "조건에 맞는 글이 아직 없습니다.",
    ctaTitle: "AI 실험을 운영 가능한 시스템으로 바꾸고 싶나요?",
    ctaBody:
      "ALTOS LAB은 AI 제품, 내부 워크플로, CMS, 추적 이벤트, 자동 발행 흐름을 유지 가능한 운영 능력으로 연결합니다.",
    cta: "상담하기",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI 구현, 도구, 제품 노트.",
    sidebarTopics: ["Latest", "시장 브리프", "시장 칼럼", "기획", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  id: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "Catatan Lab AI",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Catatan tentang masa depan kerja, ditulis dari sudut pandang tim yang membangunnya.",
    labTitle: "Kami meneliti, membangun, lalu menerbitkan temuan yang bisa dijadikan rujukan.",
    labBody:
      "Jurnal ini membahas desain sistem AI, alur kerja perusahaan, konten, visibilitas pencarian, dan eksperimen produk yang bisa benar-benar dikirim ke pasar.",
    lanes: [
      { label: "AI Products", body: "Produk AI, MVP, alur pengguna, dan pelajaran implementasi" },
      { label: "Agents & Automation", body: "AI Agent, workflow, knowledge base, dan otomasi operasional" },
      { label: "Search & GEO", body: "Fondasi SEO, pencarian generatif, dan struktur konten yang mudah dikutip" },
      { label: "Build Notes", body: "Bedah kasus, pilihan arsitektur, alat, dan sinyal pasar" }
    ],
    featured: "Pilihan Editor",
    visualContext: "Gambar artikel",
    latest: "Artikel Terbaru",
    categories: "Kategori",
    categoriesHint: "Cari tulisan berdasarkan jalur topik yang paling relevan.",
    startHere: "Mulai di sini",
    postsLabel: "artikel",
    topicsLabel: "topik",
    searchLabel: "Cari artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    searchSubmit: "Cari",
    all: "Semua",
    read: "Baca artikel",
    updated: "Diperbarui",
    readTime: (minutes: number) => `${minutes} menit baca`,
    empty: "Belum ada artikel yang cocok.",
    ctaTitle: "Ingin mengubah eksperimen AI menjadi sistem operasional?",
    ctaBody:
      "ALTOS LAB membantu merangkai produk AI, workflow internal, CMS, tracking, dan otomasi publikasi menjadi kemampuan yang bisa dipelihara.",
    cta: "Diskusikan proyek",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "Catatan implementasi AI, alat, dan produk.",
    sidebarTopics: ["Latest", "Kabar Pasar", "Kolom Pasar", "Laporan Khusus", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  vi: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "Ghi Chép Phòng Lab AI",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Những ghi chú về tương lai công việc, từ góc nhìn của đội ngũ đang xây dựng nó.",
    labTitle: "Chúng tôi nghiên cứu, xây dựng, rồi biến kinh nghiệm thành tri thức có thể trích dẫn.",
    labBody:
      "Journal này đi từ thiết kế hệ thống AI, workflow doanh nghiệp, nội dung, khả năng hiển thị trong tìm kiếm đến các thử nghiệm sản phẩm có thể triển khai thật.",
    lanes: [
      { label: "AI Products", body: "Sản phẩm AI, MVP, luồng người dùng và bài học triển khai" },
      { label: "Agents & Automation", body: "AI Agent, workflow, knowledge base và vận hành tự động" },
      { label: "Search & GEO", body: "Nền tảng SEO, tìm kiếm tạo sinh và cấu trúc nội dung dễ được trích dẫn" },
      { label: "Build Notes", body: "Phân tích case, lựa chọn kiến trúc, công cụ và tín hiệu thị trường" }
    ],
    featured: "Bài nổi bật",
    visualContext: "Hình bài viết",
    latest: "Bài mới nhất",
    categories: "Chuyên mục",
    categoriesHint: "Tìm nhanh chủ đề bạn muốn đọc.",
    startHere: "Bắt đầu ở đây",
    postsLabel: "bài viết",
    topicsLabel: "chủ đề",
    searchLabel: "Tìm bài viết",
    searchPlaceholder: "Tìm AI, Agent, GEO...",
    searchSubmit: "Tìm",
    all: "Tất cả",
    read: "Đọc bài",
    updated: "Cập nhật",
    readTime: (minutes: number) => `${minutes} phút đọc`,
    empty: "Chưa có bài viết phù hợp.",
    ctaTitle: "Muốn biến thử nghiệm AI thành hệ thống vận hành được?",
    ctaBody:
      "ALTOS LAB giúp kết nối sản phẩm AI, workflow nội bộ, CMS, tracking event và tự động hoá xuất bản thành một năng lực có thể duy trì.",
    cta: "Trao đổi dự án",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "Ghi chú về triển khai AI, công cụ và sản phẩm.",
    sidebarTopics: ["Latest", "Tin thị trường", "Chuyên mục thị trường", "Bài chuyên sâu", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  th: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "บันทึกจากแล็บ AI",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "บันทึกเรื่องอนาคตของงาน จากมุมมองของทีมที่ลงมือสร้างจริง",
    labTitle: "เราศึกษา สร้าง และเผยแพร่บทเรียนให้กลายเป็นความรู้ที่อ้างอิงได้",
    labBody:
      "Journal นี้ครอบคลุมการออกแบบระบบ AI, workflow ในองค์กร, คอนเทนต์, การมองเห็นในการค้นหา และการทดลองผลิตภัณฑ์ที่นำไปใช้งานจริงได้",
    lanes: [
      { label: "AI Products", body: "การทำผลิตภัณฑ์ AI, MVP, user flow และบทเรียนจากการส่งมอบ" },
      { label: "Agents & Automation", body: "AI Agent, workflow, knowledge base และ automation ในการทำงาน" },
      { label: "Search & GEO", body: "พื้นฐาน SEO, generative search และโครงสร้างเนื้อหาที่ถูกอ้างอิงได้" },
      { label: "Build Notes", body: "แกะกรณีศึกษา, การเลือกสถาปัตยกรรม, เครื่องมือ และสัญญาณตลาด" }
    ],
    featured: "บทความแนะนำ",
    visualContext: "ภาพบทความ",
    latest: "บทความล่าสุด",
    categories: "หมวดหมู่",
    categoriesHint: "เลือกอ่านตามหัวข้อที่คุณสนใจ",
    startHere: "เริ่มที่นี่",
    postsLabel: "บทความ",
    topicsLabel: "หัวข้อ",
    searchLabel: "ค้นหาบทความ",
    searchPlaceholder: "ค้นหา AI, Agent, GEO...",
    searchSubmit: "ค้นหา",
    all: "ทั้งหมด",
    read: "อ่านบทความ",
    updated: "อัปเดต",
    readTime: (minutes: number) => `อ่าน ${minutes} นาที`,
    empty: "ยังไม่มีบทความที่ตรงกับเงื่อนไข",
    ctaTitle: "อยากเปลี่ยนการทดลอง AI ให้เป็นระบบที่ใช้งานจริงได้ไหม?",
    ctaBody:
      "ALTOS LAB ช่วยเชื่อมผลิตภัณฑ์ AI, workflow ภายใน, CMS, event tracking และระบบเผยแพร่อัตโนมัติให้เป็นความสามารถที่ดูแลต่อได้",
    cta: "คุยเรื่องโปรเจกต์",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "บันทึกเรื่องการสร้าง AI, เครื่องมือ และผลิตภัณฑ์",
    sidebarTopics: ["Latest", "ข่าวตลาด", "คอลัมน์ตลาด", "บทความเจาะลึก", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  ms: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "Nota Makmal AI",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Catatan tentang masa depan kerja daripada pasukan yang membinanya sendiri.",
    labTitle: "Kami mengkaji, membina, kemudian menerbitkan pengalaman sebagai pengetahuan yang boleh dirujuk.",
    labBody:
      "Jurnal ini merangkumi reka bentuk sistem AI, workflow perusahaan, kandungan, keterlihatan carian dan eksperimen produk yang boleh dilancarkan.",
    lanes: [
      { label: "AI Products", body: "Produk AI, MVP, aliran pengguna dan pelajaran pelaksanaan" },
      { label: "Agents & Automation", body: "AI Agent, workflow, pangkalan pengetahuan dan automasi operasi" },
      { label: "Search & GEO", body: "Asas SEO, carian generatif dan struktur kandungan yang mudah dirujuk" },
      { label: "Build Notes", body: "Pecahan kes, pilihan seni bina, alat dan isyarat pasaran" }
    ],
    featured: "Pilihan",
    visualContext: "Imej artikel",
    latest: "Artikel Terkini",
    categories: "Kategori",
    categoriesHint: "Cari laluan bacaan mengikut topik.",
    startHere: "Mula di sini",
    postsLabel: "artikel",
    topicsLabel: "topik",
    searchLabel: "Cari artikel",
    searchPlaceholder: "Cari AI, Agent, GEO...",
    searchSubmit: "Cari",
    all: "Semua",
    read: "Baca artikel",
    updated: "Dikemas kini",
    readTime: (minutes: number) => `${minutes} minit bacaan`,
    empty: "Belum ada artikel yang sepadan.",
    ctaTitle: "Mahu jadikan eksperimen AI sebagai sistem operasi sebenar?",
    ctaBody:
      "ALTOS LAB membantu menghubungkan produk AI, workflow dalaman, CMS, event tracking dan automasi penerbitan menjadi keupayaan yang boleh diselenggara.",
    cta: "Bincang projek",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "Nota pelaksanaan AI, alat dan produk.",
    sidebarTopics: ["Latest", "Berita Pasaran", "Kolum Pasaran", "Rencana Khas", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  },
  fil: {
    eyebrow: "ALTOS LAB Journal · Research / Build / Growth",
    title: "AI Lab Notes",
    brandTitle: "AI",
    brandScript: "& Craft",
    description: "Mga tala tungkol sa future of work mula sa team na mismong gumagawa nito.",
    labTitle: "Nagre-research kami, bumubuo, at inilalabas ang natutunan bilang kaalamang puwedeng i-reference.",
    labBody:
      "Saklaw ng journal ang AI system design, enterprise workflows, content, search visibility, at product experiments na puwedeng i-ship.",
    lanes: [
      { label: "AI Products", body: "AI productization, MVP, user flows, at delivery lessons" },
      { label: "Agents & Automation", body: "AI agents, workflows, knowledge bases, at operations automation" },
      { label: "Search & GEO", body: "SEO foundations, generative search, at citation-ready content structure" },
      { label: "Build Notes", body: "Case breakdowns, architecture tradeoffs, tools, at market signals" }
    ],
    featured: "Featured",
    visualContext: "Article image",
    latest: "Latest Articles",
    categories: "Categories",
    categoriesHint: "Hanapin ang tamang reading lane ayon sa topic.",
    startHere: "Start here",
    postsLabel: "articles",
    topicsLabel: "topics",
    searchLabel: "Search articles",
    searchPlaceholder: "Search AI, agents, GEO...",
    searchSubmit: "Search",
    all: "All",
    read: "Read article",
    updated: "Updated",
    readTime: (minutes: number) => `${minutes} min read`,
    empty: "Wala pang matching articles.",
    ctaTitle: "Gusto mong gawing operating system ang AI experiments?",
    ctaBody:
      "ALTOS LAB can connect AI products, internal workflows, CMS, tracking events, and publishing automation into one maintainable capability.",
    cta: "Discuss a project",
    otherLanguage: "繁體中文",
    mobileTopicTitle: "Tech",
    mobileTopicDescription: "AI implementation, tools, and product notes.",
    sidebarTopics: ["Latest", "Market Briefs", "Market Columns", "Features", "AI Trends", "Agents", "Automation", "GEO", "Build Notes"]
  }
};

const topicAliases: Record<string, string[]> = {
  latest: [],
  breaking: ["breaking", "快訊", "速報", "속보"],
  "市場快訊": ["breaking", "快訊", "市場快訊", "market brief", "brief", "速報", "속보", "kabar pasar", "tin thị trường", "ข่าวตลาด", "berita pasaran"],
  "market briefs": ["breaking", "market brief", "brief", "市場快訊"],
  "市場ブリーフ": ["breaking", "市場ブリーフ", "速報", "market brief"],
  "시장 브리프": ["breaking", "시장 브리프", "속보", "market brief"],
  "kabar pasar": ["breaking", "kabar pasar", "market brief"],
  "tin thị trường": ["breaking", "tin thị trường", "market brief"],
  "ข่าวตลาด": ["breaking", "ข่าวตลาด", "market brief"],
  "berita pasaran": ["breaking", "berita pasaran", "market brief"],
  column: ["column", "專欄", "市場專欄", "market column", "market columns", "コラム", "市場コラム", "칼럼", "시장 칼럼"],
  "市場專欄": ["column", "專欄", "市場專欄", "market column", "market columns"],
  "market columns": ["column", "market column", "market columns", "專欄"],
  "市場コラム": ["column", "市場コラム", "コラム"],
  "시장 칼럼": ["column", "시장 칼럼", "칼럼"],
  "kolom pasar": ["column", "kolom pasar", "kolom"],
  "chuyên mục thị trường": ["column", "chuyên mục thị trường", "chuyên mục"],
  "คอลัมน์ตลาด": ["column", "คอลัมน์ตลาด"],
  "kolum pasaran": ["column", "kolum pasaran", "kolum"],
  feature: ["feature", "專題", "特集", "기획"],
  features: ["feature", "feature", "專題"],
  "laporan khusus": ["feature", "laporan khusus"],
  "bài chuyên sâu": ["feature", "bài chuyên sâu"],
  "บทความเจาะลึก": ["feature", "บทความเจาะลึก"],
  "rencana khas": ["feature", "rencana khas"],
  "ai trends": ["ai trends", "ai 趨勢", "aiトレンド", "ai 트렌드", "ai 平台趨勢"],
  agents: ["agent", "agents", "ai agent", "エージェント", "에이전트"],
  automation: ["automation", "自動化", "자동화", "otomasi", "automasi", "tự động", "อัตโนมัติ"],
  geo: ["geo", "seo", "搜尋", "検索", "검색", "pencarian", "tìm kiếm", "ค้นหา", "carian"],
  "build notes": ["build notes", "build", "case", "案例", "構築", "빌드", "catatan", "ghi chép", "nota"]
};

function matchesTopic(post: BlogPost, item: string) {
  const key = item.toLowerCase();
  if (key === "latest") return true;
  const aliases = topicAliases[key] || [key];
  const haystack = [post.contentType, post.newsCategory, post.topic, ...post.tags].join(" ").toLowerCase();
  return aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

function normalizedPage(value: BlogIndexProps["page"]) {
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function blogIndexHref(language: BlogLanguage, params: { tag?: string; query?: string; page?: number }) {
  const queryParams = new URLSearchParams();
  if (params.tag) queryParams.set("tag", params.tag);
  if (params.query) queryParams.set("query", params.query);
  if (params.page && params.page > 1) queryParams.set("page", String(params.page));
  const queryString = queryParams.toString();
  return `${blogIndexPath(language)}${queryString ? `?${queryString}` : ""}`;
}

export async function BlogIndex({ language, tag, query, page }: BlogIndexProps) {
  const dictionary = copy[language];
  const posts = await getPublishedBlogInventoryPostsByLanguage(language);
  const orderedPosts = [...posts].sort(
    (a, b) => articleTimestamp(b) - articleTimestamp(a) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );
  const normalizedTag = tag?.trim().toLowerCase();
  const normalizedQuery = query?.trim().toLowerCase();
  const filtered = orderedPosts.filter((post) => {
    const matchesTag = normalizedTag ? matchesTopic(post, tag || "") : true;
    const matchesQuery = normalizedQuery
      ? [post.title, post.excerpt, post.topic, post.geoSummary, post.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      : true;
    return matchesTag && matchesQuery;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / BLOG_INDEX_PAGE_SIZE));
  const currentPage = Math.min(normalizedPage(page), pageCount);
  const pageStart = (currentPage - 1) * BLOG_INDEX_PAGE_SIZE;
  const visiblePosts = filtered.slice(pageStart, pageStart + BLOG_INDEX_PAGE_SIZE);
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < pageCount ? currentPage + 1 : null;

  return (
    <div className="site-home blog-site-shell">
      <SiteHeader />
      <main className="blog-page blog-index-page blog-craft-index">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: blogIndexPath(language) }
          ])}
        />
        <JsonLd data={blogIndexItemListJsonLd(visiblePosts, blogIndexPath(language), dictionary.title)} />
        <div className="blog-craft-layout">
          <aside className="blog-craft-sidebar" aria-label="Blog navigation">
            <div className="blog-craft-brand">
              <h1>
                <span>{dictionary.brandTitle}</span>
                <em>{dictionary.brandScript}</em>
              </h1>
              <p>{dictionary.description}</p>
            </div>

            <nav className="blog-craft-nav" aria-label="Blog topics">
              {dictionary.sidebarTopics.map((item) => (
                <Link
                  className={normalizedTag === item.toLowerCase() || (!normalizedTag && item === "Latest") ? "active" : ""}
                  href={item === "Latest" ? blogIndexPath(language) : `${blogIndexPath(language)}?tag=${encodeURIComponent(item)}`}
                  key={item}
                >
                  {item}
                </Link>
              ))}
            </nav>

            <form className="blog-craft-search blog-craft-search-sidebar" action={blogIndexPath(language)} role="search">
              {normalizedTag ? <input type="hidden" name="tag" value={tag} /> : null}
              <label className="sr-only" htmlFor={`blog-search-sidebar-${language}`}>
                {dictionary.searchLabel}
              </label>
              <input
                id={`blog-search-sidebar-${language}`}
                name="query"
                type="search"
                defaultValue={query || ""}
                placeholder={dictionary.searchPlaceholder}
                autoComplete="off"
              />
              <button type="submit">{dictionary.searchSubmit}</button>
            </form>

            <div className="blog-craft-sidebar-footer">
              <span>
                <strong>{posts.length}</strong> {dictionary.postsLabel}
              </span>
            </div>
          </aside>

          <section className="blog-craft-feed" aria-label="Blog posts">
            <div className="blog-craft-feed-top">
              <div>
                <p className="eyebrow">{normalizedTag ? dictionary.categories : dictionary.latest}</p>
                <h2>
                  <span>{normalizedTag ? tag : dictionary.mobileTopicTitle}</span>
                  <em>— {dictionary.mobileTopicDescription}</em>
                </h2>
              </div>
              <form className="blog-craft-search" action={blogIndexPath(language)} role="search">
                {normalizedTag ? <input type="hidden" name="tag" value={tag} /> : null}
                <label className="sr-only" htmlFor={`blog-search-${language}`}>
                  {dictionary.searchLabel}
                </label>
                <input
                  id={`blog-search-${language}`}
                  name="query"
                  type="search"
                  defaultValue={query || ""}
                  placeholder={dictionary.searchPlaceholder}
                  autoComplete="off"
                />
                <button type="submit">{dictionary.searchSubmit}</button>
              </form>
            </div>

            <div className="blog-craft-grid">
              {visiblePosts.map((post) => {
                const visualPost = toBlogVisualPost(post);
                return (
                  <article className="blog-craft-card" key={post.id}>
                    <Link className="blog-craft-card-image" href={blogPostPath(post)}>
                      {post.cover ? (
                        <SafeBlogImage compact post={visualPost} />
                      ) : (
                        <BlogEditorialVisual compact post={visualPost} />
                      )}
                    </Link>
                    <div className="blog-craft-card-body">
                      <h3>
                        <Link href={blogPostPath(post)}>{renderBrandText(post.title)}</Link>
                      </h3>
                      <p>{renderBrandText(post.excerpt)}</p>
                      <div className="blog-craft-card-meta">
                        <span className={`blog-craft-type-badge is-${post.contentType}`}>
                          {blogContentTypeLabel(post.contentType, post.language)}
                        </span>
                        <span className="blog-craft-card-taxonomy">{post.newsCategory || post.tags[0]}</span>
                        <small>{dictionary.readTime(post.readTimeMinutes)}</small>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!filtered.length ? <p className="muted">{dictionary.empty}</p> : null}
            </div>
            {filtered.length > BLOG_INDEX_PAGE_SIZE ? (
              <nav className="blog-craft-pagination" aria-label="Blog pagination">
                {previousPage ? (
                  <Link className="blog-craft-page-link" href={blogIndexHref(language, { tag, query, page: previousPage })}>
                    <span aria-hidden="true">‹</span>
                  </Link>
                ) : (
                  <span className="blog-craft-page-link is-disabled" aria-hidden="true">
                    ‹
                  </span>
                )}
                <span className="blog-craft-page-status">
                  {currentPage} / {pageCount}
                </span>
                {nextPage ? (
                  <Link className="blog-craft-page-link" href={blogIndexHref(language, { tag, query, page: nextPage })}>
                    <span aria-hidden="true">›</span>
                  </Link>
                ) : (
                  <span className="blog-craft-page-link is-disabled" aria-hidden="true">
                    ›
                  </span>
                )}
              </nav>
            ) : null}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
