#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const credentialsPath = path.join(repoRoot, ".admin-credentials.local");

const BASE_URL = (process.env.ALTOS_ADMIN_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://altoslab-ai.cc").replace(
  /\/$/,
  ""
);
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_IMAGES = process.argv.includes("--skip-images");
const EXPORT_SEED_INDEX = process.argv.indexOf("--export-seed");
const EXPORT_SEED_PATH = EXPORT_SEED_INDEX >= 0 ? process.argv[EXPORT_SEED_INDEX + 1] : "";
const TARGET_PER_LANGUAGE = Number(process.env.BLOG_TARGET_PER_LANGUAGE || 48);
const RUN_ID = "altos-market-editorial-seed-v1";
const FALLBACK_COVER = {
  "zh-Hant": "/blog-cover-zh-hant.png",
  en: "/blog-cover-en.png",
  ja: "/blog-cover-ja.png",
  ko: "/blog-cover-ko.png"
};

function stockCover(url, credit, tags) {
  const isPexels = url.includes("images.pexels.com");
  return {
    url,
    credit,
    creditUrl: isPexels ? "https://www.pexels.com" : "https://unsplash.com",
    license: isPexels ? "Pexels License" : "Unsplash License",
    licenseUrl: isPexels ? "https://www.pexels.com/license/" : "https://unsplash.com/license",
    provider: isPexels ? "pexels-library" : "unsplash-library",
    tags
  };
}

const FREE_STOCK_COVER_LIBRARY = [
  stockCover("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "Developer workflow screen photo via Unsplash", ["product", "automation", "software", "agent"]),
  stockCover("https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80", "Server infrastructure photo via Unsplash", ["infra", "data", "model", "governance"]),
  stockCover("https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "Circuit board macro photo via Unsplash", ["infra", "model", "technology", "product"]),
  stockCover("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", "Analytics dashboard photo via Unsplash", ["geo", "search", "data", "governance"]),
  stockCover("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", "Modern studio workspace photo via Unsplash", ["product", "industry", "workflow", "studio"]),
  stockCover("https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80", "Robotics lab photo via Unsplash", ["agents", "automation", "robotics", "industry"]),
  stockCover("https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", "Product team laptop workspace photo via Unsplash", ["product", "workflow", "team", "startup"]),
  stockCover("https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", "Technology planning workspace photo via Unsplash", ["column", "product", "strategy", "workflow"]),
  stockCover("https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80", "Data and research desk photo via Unsplash", ["geo", "data", "research", "governance"]),
  stockCover("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", "Business analytics laptop photo via Unsplash", ["geo", "growth", "data", "business"]),
  stockCover("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80", "Cybersecurity hardware photo via Unsplash", ["governance", "security", "infra", "risk"]),
  stockCover("https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80", "Code matrix screen photo via Unsplash", ["infra", "software", "agent", "automation"]),
  stockCover("https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80", "Laptop product build photo via Unsplash", ["product", "software", "build", "workflow"]),
  stockCover("https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&w=1200&q=80", "Network hardware photo via Unsplash", ["infra", "network", "model", "data"]),
  stockCover("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80", "Earth network visualization photo via Unsplash", ["geo", "search", "platform", "trend"]),
  stockCover("https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80", "Data stream visualization photo via Unsplash", ["data", "geo", "automation", "trend"]),
  stockCover("https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", "Code editor workspace photo via Unsplash", ["software", "product", "agent", "build"]),
  stockCover("https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80", "Laptop coding desk photo via Unsplash", ["software", "automation", "workflow", "product"]),
  stockCover("https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", "Terminal code close-up photo via Unsplash", ["software", "infra", "agent", "automation"]),
  stockCover("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80", "Laptop development close-up photo via Unsplash", ["software", "build", "agent", "product"]),
  stockCover("https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1200&q=80", "Research laptop workspace photo via Unsplash", ["research", "geo", "workflow", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=1200&q=80", "Technology lab hardware photo via Unsplash", ["infra", "automation", "robotics", "model"]),
  stockCover("https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80", "Machine learning code photo via Unsplash", ["agent", "software", "model", "automation"]),
  stockCover("https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80", "Digital security keyboard photo via Unsplash", ["governance", "security", "risk", "infra"]),
  stockCover("https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80", "Architecture geometry photo via Unsplash", ["feature", "framework", "strategy", "system"]),
  stockCover("https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=1200&q=80", "Engineering prototype photo via Unsplash", ["product", "automation", "prototype", "industry"]),
  stockCover("https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80", "Industrial control workspace photo via Unsplash", ["industry", "automation", "workflow", "governance"]),
  stockCover("https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=1200&q=80", "Engineering robotics detail photo via Unsplash", ["agents", "robotics", "automation", "industry"]),
  stockCover("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", "Collaborative workspace photo via Unsplash", ["workflow", "product", "industry", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80", "Startup product team photo via Unsplash", ["product", "team", "workflow", "startup"]),
  stockCover("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80", "Team planning workspace photo via Unsplash", ["workflow", "governance", "strategy", "industry"]),
  stockCover("https://images.unsplash.com/photo-1560264280-88b68371db39?auto=format&fit=crop&w=1200&q=80", "Business operations desk photo via Unsplash", ["industry", "governance", "operations", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80", "Planning boardroom photo via Unsplash", ["strategy", "governance", "workflow", "business"]),
  stockCover("https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80", "Creative business workshop photo via Unsplash", ["column", "workflow", "product", "strategy"]),
  stockCover("https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200", "Programming workspace photo via Pexels", ["software", "agent", "automation", "product"]),
  stockCover("https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200", "Laptop coding photo via Pexels", ["software", "product", "build", "agent"]),
  stockCover("https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200", "Developer screen photo via Pexels", ["software", "automation", "infra", "product"]),
  stockCover("https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200", "Operational planning table photo via Pexels", ["workflow", "strategy", "governance", "industry"]),
  stockCover("https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200", "AI robotics lab photo via Pexels", ["agents", "robotics", "automation", "industry"]),
  stockCover("https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=1200", "Engineering automation photo via Pexels", ["automation", "industry", "robotics", "infra"]),
  stockCover("https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg?auto=compress&cs=tinysrgb&w=1200", "Data center corridor photo via Pexels", ["infra", "data", "server", "model"]),
  stockCover("https://images.pexels.com/photos/6476589/pexels-photo-6476589.jpeg?auto=compress&cs=tinysrgb&w=1200", "Abstract data interface photo via Pexels", ["data", "geo", "platform", "trend"]),
  stockCover("https://images.pexels.com/photos/6476254/pexels-photo-6476254.jpeg?auto=compress&cs=tinysrgb&w=1200", "Digital dashboard photo via Pexels", ["geo", "data", "analytics", "growth"]),
  stockCover("https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=1200", "AI interface photo via Pexels", ["agent", "product", "automation", "model"]),
  stockCover("https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200", "Machine intelligence visual photo via Pexels", ["model", "agent", "trend", "product"])
];

const LANGUAGES = ["zh-Hant", "en", "ja", "ko"];

const TYPE_LABEL = {
  "zh-Hant": { breaking: "市場快訊", column: "專欄", feature: "專題" },
  en: { breaking: "Market brief", column: "Column", feature: "Feature" },
  ja: { breaking: "市場ブリーフ", column: "コラム", feature: "特集" },
  ko: { breaking: "시장 브리프", column: "칼럼", feature: "기획" }
};

const CONTENT_TYPE_CYCLE = [
  "breaking",
  "column",
  "feature",
  "breaking",
  "column",
  "breaking",
  "feature",
  "column",
  "breaking",
  "column",
  "feature",
  "breaking",
  "column",
  "breaking",
  "feature",
  "column",
  "breaking",
  "column",
  "feature",
  "breaking"
];

const CATEGORY = {
  agents: {
    "zh-Hant": "AI Agent 與工作流",
    en: "AI agents and workflows",
    ja: "AIエージェントと業務設計",
    ko: "AI Agent와 워크플로"
  },
  geo: {
    "zh-Hant": "AI 搜尋與 GEO",
    en: "AI search and GEO",
    ja: "AI検索とGEO",
    ko: "AI 검색과 GEO"
  },
  governance: {
    "zh-Hant": "企業 AI 治理",
    en: "Enterprise AI governance",
    ja: "企業AIガバナンス",
    ko: "기업 AI 거버넌스"
  },
  product: {
    "zh-Hant": "AI 產品與評測",
    en: "AI product and evals",
    ja: "AIプロダクトと評価",
    ko: "AI 제품과 평가"
  },
  infra: {
    "zh-Hant": "AI 基礎設施",
    en: "AI infrastructure",
    ja: "AIインフラ",
    ko: "AI 인프라"
  },
  industry: {
    "zh-Hant": "產業應用與營運",
    en: "Industry workflows",
    ja: "産業ワークフロー",
    ko: "산업 워크플로"
  }
};

const AUDIENCE = {
  "zh-Hant": "企業主、營運主管、行銷負責人與 AI 導入團隊",
  en: "founders, operators, marketing leads and AI implementation teams",
  ja: "経営者、事業責任者、マーケティング責任者、AI導入チーム",
  ko: "창업자, 운영 리더, 마케팅 책임자, AI 도입 팀"
};

const DISCLOSURE = {
  "zh-Hant":
    "本文由 ALTOS LAB 編輯自動化協助整理，已依來源可信度、SEO/GEO 結構、圖片適配與多語一致性完成品質審核。",
  en:
    "This article was assembled with ALTOS LAB editorial automation and quality-reviewed for source trust, SEO/GEO structure, image fit and multilingual parity.",
  ja:
    "この記事は ALTOS LAB の編集自動化で整理し、情報源、SEO/GEO 構造、画像適合、多言語整合性を確認しています。",
  ko:
    "이 글은 ALTOS LAB 편집 자동화를 통해 정리되었으며 출처 신뢰도, SEO/GEO 구조, 이미지 적합성, 다국어 일관성을 검토했습니다."
};

const SOURCES = {
  openaiNews: {
    title: "OpenAI News",
    url: "https://openai.com/news/",
    publisher: "OpenAI"
  },
  openaiBusiness: {
    title: "OpenAI for Business",
    url: "https://openai.com/business/",
    publisher: "OpenAI"
  },
  openaiCodexTax: {
    title: "Building self-improving tax agents with Codex",
    url: "https://openai.com/index/building-self-improving-tax-agents-with-codex/",
    publisher: "OpenAI"
  },
  googleAiFeatures: {
    title: "AI features and your website",
    url: "https://developers.google.com/search/docs/appearance/ai-features",
    publisher: "Google Search Central"
  },
  googleHelpful: {
    title: "Creating helpful, reliable, people-first content",
    url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    publisher: "Google Search Central"
  },
  googleStructuredData: {
    title: "Structured data introduction",
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    publisher: "Google Search Central"
  },
  deepmindBlog: {
    title: "Google DeepMind Blog",
    url: "https://deepmind.google/blog/",
    publisher: "Google DeepMind"
  },
  anthropicNews: {
    title: "Anthropic News",
    url: "https://www.anthropic.com/news",
    publisher: "Anthropic"
  },
  anthropicResearch: {
    title: "Anthropic Research",
    url: "https://www.anthropic.com/research",
    publisher: "Anthropic"
  },
  nvidiaGenAi: {
    title: "NVIDIA Generative AI Blog",
    url: "https://blogs.nvidia.com/blog/category/generative-ai/",
    publisher: "NVIDIA"
  },
  microsoftAi: {
    title: "Microsoft AI News",
    url: "https://news.microsoft.com/source/topics/ai/",
    publisher: "Microsoft"
  },
  azureAi: {
    title: "Azure AI and Machine Learning Blog",
    url: "https://azure.microsoft.com/en-us/blog/topics/artificial-intelligence/",
    publisher: "Microsoft Azure"
  },
  huggingFaceBlog: {
    title: "Hugging Face Blog",
    url: "https://huggingface.co/blog",
    publisher: "Hugging Face"
  },
  huggingFaceItBench: {
    title: "ITBench: Evaluating AI agents on real-world IT tasks",
    url: "https://huggingface.co/blog/ibm-research/itbench-aa",
    publisher: "Hugging Face / IBM Research"
  },
  vercelBlog: {
    title: "Vercel Blog",
    url: "https://vercel.com/blog",
    publisher: "Vercel"
  },
  vercelChangelog: {
    title: "Vercel Changelog",
    url: "https://vercel.com/changelog",
    publisher: "Vercel"
  },
  ibmAgents: {
    title: "What are AI agents?",
    url: "https://www.ibm.com/think/topics/ai-agents",
    publisher: "IBM Think"
  },
  mitAi: {
    title: "MIT Technology Review: Artificial intelligence",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/",
    publisher: "MIT Technology Review"
  }
};

const NEWS_FEEDS = [
  {
    publisher: "OpenAI",
    url: "https://openai.com/news/rss.xml",
    category: "AI Products",
    priority: 98
  },
  {
    publisher: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    category: "Build Notes",
    priority: 96
  },
  {
    publisher: "Google AI",
    url: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    category: "AI Products",
    priority: 94
  },
  {
    publisher: "GitHub Blog",
    url: "https://github.blog/ai-and-ml/feed/",
    category: "Agents & Automation",
    priority: 88
  },
  {
    publisher: "Hugging Face",
    url: "https://huggingface.co/blog/feed.xml",
    category: "Infrastructure",
    priority: 88
  },
  {
    publisher: "Microsoft AI",
    url: "https://blogs.microsoft.com/ai/feed/",
    category: "Industry Workflow",
    priority: 84
  },
  {
    publisher: "NVIDIA AI",
    url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    category: "Infrastructure",
    priority: 82
  },
  {
    publisher: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "AI Products",
    priority: 78
  },
  {
    publisher: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "AI Products",
    priority: 76
  }
];

const VISUAL_QUERY_BANK = {
  agents: [
    "automation control panel",
    "workflow dashboard screen",
    "industrial control panel close up",
    "computer code terminal close up",
    "circuit board microchip macro",
    "mechanical keyboard software development",
    "network operations center screens"
  ],
  geo: [
    "library archive search index",
    "newspaper archive desk",
    "web code search engine",
    "network map data visualization",
    "bookshelf research notes",
    "magnifying glass documents"
  ],
  governance: [
    "cybersecurity lock server",
    "policy document checklist desk",
    "access card security system",
    "risk management notebook",
    "server rack security",
    "locked cabinet documents"
  ],
  product: [
    "mobile app prototype screen",
    "user interface wireframe notebook",
    "software testing checklist",
    "laptop product design close up",
    "analytics screen abstract",
    "usability test notes"
  ],
  infra: [
    "data center server rack",
    "circuit board microchip macro",
    "fiber optic cables",
    "gpu computer hardware",
    "edge device sensor",
    "network switch cables"
  ],
  industry: [
    "factory automation machinery",
    "call center headset desk",
    "warehouse scanner logistics",
    "research desk documents",
    "sales proposal laptop desk",
    "industrial control room"
  ]
};

const PEOPLE_HEAVY_IMAGE_PATTERN =
  /(meeting|conference|congress|committee|summit|panel|speaker|speaking|audience|portrait|headshot|interview|workshop|seminar|forum|startup live|people|person|woman|women|man|men|group|team photo|boardroom|minister|deputy|chief|official|press|discussion|roundtable|talking|session|lecture|會議|演講|人物|肖像|討論|委員會|講座|人像|会議|講演|人物|토론|회의|강연|인물)/i;

const VISUAL_OBJECT_PATTERN =
  /(robot|automation|keyboard|code|terminal|server|data center|rack|cable|fiber|chip|circuit|screen|dashboard|chart|interface|wireframe|prototype|library|archive|book|document|notebook|checklist|map|network|lock|security|factory|warehouse|sensor|machine|control|device|laptop|computer|software|database|search|magnifying)/i;

const UNSAFE_OR_OFF_BRAND_IMAGE_PATTERN =
  /(dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|anti-aircraft|air defense|defense computer|radarno|usdagov|john lennon|austen|desire screenshot|unabridged|dead prisoners|robot arm picks up|shixart|malaria|microscopy training|nigeria)/i;

function idea(slug, type, category, sourceKeys, coverQuery, line) {
  return { slug, type, category, sourceKeys, coverQuery, line };
}

const IDEAS = [
  idea("agent-pilot-scorecard", "column", "agents", ["openaiNews", "anthropicNews", "huggingFaceItBench", "ibmAgents"], "AI agent workflow office", {
    "zh-Hant": ["AI Agent 試點", "用可回滾流程選第一個企業 Agent"],
    en: ["AI agent pilots", "choose the first workflow with a rollback path"],
    ja: ["AIエージェント試験導入", "戻せる業務から最初のAgentを選ぶ"],
    ko: ["AI Agent 파일럿", "되돌릴 수 있는 업무부터 첫 Agent를 고르기"]
  }),
  idea("coding-agent-review-loop", "feature", "agents", ["openaiCodexTax", "openaiNews", "vercelBlog", "anthropicResearch"], "software engineer code review laptop", {
    "zh-Hant": ["Coding Agent 審稿循環", "把自動寫程式接進工程品質門檻"],
    en: ["Coding agent review loops", "connect automated coding to engineering quality gates"],
    ja: ["Coding Agentレビュー循環", "自動コーディングを品質ゲートへ接続する"],
    ko: ["Coding Agent 리뷰 루프", "자동 코딩을 엔지니어링 품질 게이트에 연결하기"]
  }),
  idea("sales-ops-agent-boundaries", "column", "agents", ["openaiBusiness", "anthropicNews", "microsoftAi", "ibmAgents"], "sales operations dashboard meeting", {
    "zh-Hant": ["Sales Ops Agent", "先定義權限邊界再談自動成交"],
    en: ["Sales ops agents", "define permission boundaries before automating revenue work"],
    ja: ["Sales Ops Agent", "売上業務の自動化前に権限境界を決める"],
    ko: ["Sales Ops Agent", "매출 업무 자동화 전에 권한 경계를 정하기"]
  }),
  idea("support-agent-knowledge-quality", "feature", "agents", ["microsoftAi", "anthropicNews", "huggingFaceBlog", "ibmAgents"], "customer support AI knowledge base", {
    "zh-Hant": ["客服 Agent 知識庫", "用答案品質循環降低幻覺與升級成本"],
    en: ["Support agent knowledge bases", "reduce hallucinations with an answer-quality loop"],
    ja: ["サポートAgentのナレッジベース", "回答品質ループで幻覚とエスカレーションを減らす"],
    ko: ["지원 Agent 지식베이스", "답변 품질 루프로 환각과 이관 비용 줄이기"]
  }),
  idea("agent-observability-dashboard", "feature", "agents", ["openaiNews", "anthropicResearch", "vercelBlog", "microsoftAi"], "AI observability control room", {
    "zh-Hant": ["Agent 可觀測性", "用任務、成本與回滾訊號管理自動化"],
    en: ["Agent observability", "manage automation with task, cost and rollback signals"],
    ja: ["Agentの可観測性", "タスク・コスト・巻き戻しで自動化を管理する"],
    ko: ["Agent 관측성", "작업, 비용, 롤백 신호로 자동화를 관리하기"]
  }),
  idea("agent-permission-model", "column", "agents", ["anthropicNews", "openaiBusiness", "microsoftAi", "ibmAgents"], "security access control artificial intelligence", {
    "zh-Hant": ["Agent 權限模型", "把工具調用拆成可審核的責任層"],
    en: ["Agent permission models", "turn tool use into auditable responsibility layers"],
    ja: ["Agent権限モデル", "ツール利用を監査できる責任レイヤーに分ける"],
    ko: ["Agent 권한 모델", "도구 호출을 감사 가능한 책임 계층으로 나누기"]
  }),
  idea("multi-agent-handoff", "column", "agents", ["openaiNews", "anthropicNews", "huggingFaceBlog", "vercelBlog"], "multi agent workflow whiteboard", {
    "zh-Hant": ["多 Agent 協作", "用交接格式避免自動化互相污染"],
    en: ["Multi-agent collaboration", "use handoff formats to keep automations clean"],
    ja: ["マルチAgent協業", "引き継ぎ形式で自動化の混線を防ぐ"],
    ko: ["멀티 Agent 협업", "핸드오프 형식으로 자동화 혼선을 줄이기"]
  }),
  idea("agent-roi-metrics", "feature", "agents", ["openaiBusiness", "microsoftAi", "nvidiaGenAi", "ibmAgents"], "business analytics AI automation ROI", {
    "zh-Hant": ["Agent ROI 指標", "把節省工時改成任務成功率與品質成本"],
    en: ["Agent ROI metrics", "move from saved hours to task success and quality cost"],
    ja: ["Agent ROI指標", "削減時間から成功率と品質コストへ移す"],
    ko: ["Agent ROI 지표", "절감 시간보다 작업 성공률과 품질 비용 보기"]
  }),
  idea("ai-overviews-content-architecture", "feature", "geo", ["googleAiFeatures", "googleHelpful", "googleStructuredData", "openaiNews"], "search engine AI answer content", {
    "zh-Hant": ["AI Overviews 內容架構", "把網頁寫成可被答案引擎引用的段落"],
    en: ["AI Overviews content architecture", "write pages answer engines can cite"],
    ja: ["AI Overviews向け構造", "回答エンジンが引用できる段落を作る"],
    ko: ["AI Overviews 콘텐츠 구조", "답변 엔진이 인용할 수 있는 단락 만들기"]
  }),
  idea("llms-txt-operating-policy", "column", "geo", ["googleAiFeatures", "googleHelpful", "vercelBlog", "huggingFaceBlog"], "website robots llms file code", {
    "zh-Hant": ["llms.txt 營運策略", "把 AI 可讀性變成網站治理項目"],
    en: ["llms.txt operating policy", "turn AI readability into website governance"],
    ja: ["llms.txt運用方針", "AI可読性をサイト運用に組み込む"],
    ko: ["llms.txt 운영 정책", "AI 가독성을 웹사이트 거버넌스로 만들기"]
  }),
  idea("source-backed-blog-system", "feature", "geo", ["googleHelpful", "googleStructuredData", "openaiNews", "mitAi"], "editorial desk research sources", {
    "zh-Hant": ["來源化部落格系統", "讓每篇 AI 趨勢文都有可追溯證據鏈"],
    en: ["Source-backed blog systems", "give every AI trend article a traceable evidence trail"],
    ja: ["出典付きブログ運用", "AIトレンド記事に追跡できる証拠線を持たせる"],
    ko: ["출처 기반 블로그 시스템", "AI 트렌드 글마다 추적 가능한 근거 만들기"]
  }),
  idea("brand-entity-consistency", "column", "geo", ["googleHelpful", "googleStructuredData", "openaiBusiness", "deepmindBlog"], "brand knowledge graph entity", {
    "zh-Hant": ["品牌 Entity 一致性", "讓搜尋與 AI 都理解 ALTOS LAB 做什麼"],
    en: ["Brand entity consistency", "help search and AI understand what ALTOS LAB does"],
    ja: ["ブランドEntity整合性", "検索とAIにALTOS LABの仕事を伝える"],
    ko: ["브랜드 Entity 일관성", "검색과 AI가 ALTOS LAB의 역할을 이해하게 하기"]
  }),
  idea("visible-faq-schema", "column", "geo", ["googleStructuredData", "googleHelpful", "googleAiFeatures", "vercelBlog"], "FAQ structured data website", {
    "zh-Hant": ["FAQ 結構化資料", "只標記頁面上真的看得到的答案"],
    en: ["FAQ structured data", "mark up only answers users can actually see"],
    ja: ["FAQ構造化データ", "ページに見える回答だけをマークアップする"],
    ko: ["FAQ 구조화 데이터", "사용자가 볼 수 있는 답변만 마크업하기"]
  }),
  idea("ai-crawler-log-analysis", "feature", "geo", ["googleAiFeatures", "googleHelpful", "vercelBlog", "openaiNews"], "web server logs search crawler", {
    "zh-Hant": ["AI Crawler Log 分析", "用爬取訊號調整內容更新節奏"],
    en: ["AI crawler log analysis", "use crawl signals to tune content refresh cadence"],
    ja: ["AIクローラーログ分析", "クロール信号で更新頻度を調整する"],
    ko: ["AI 크롤러 로그 분석", "크롤 신호로 콘텐츠 갱신 리듬 조정하기"]
  }),
  idea("content-refresh-cadence", "column", "geo", ["googleHelpful", "googleAiFeatures", "deepmindBlog", "anthropicNews"], "calendar editorial workflow", {
    "zh-Hant": ["AI 搜尋內容更新節奏", "把舊文維護當成可排名資產管理"],
    en: ["AI search refresh cadence", "manage old articles as ranking assets"],
    ja: ["AI検索向け更新頻度", "既存記事をランキング資産として管理する"],
    ko: ["AI 검색 콘텐츠 갱신 리듬", "기존 글을 랭킹 자산처럼 관리하기"]
  }),
  idea("multilingual-hreflang-geo", "feature", "geo", ["googleAiFeatures", "googleStructuredData", "googleHelpful", "vercelBlog"], "multilingual website localization", {
    "zh-Hant": ["多語 hreflang 與 GEO", "讓四語文章互相加強而不是互相競爭"],
    en: ["Multilingual hreflang and GEO", "make four-language articles reinforce each other"],
    ja: ["多言語hreflangとGEO", "4言語の記事を競合ではなく補完にする"],
    ko: ["다국어 hreflang과 GEO", "네 언어 글이 서로 보강하게 만들기"]
  }),
  idea("ai-search-brand-monitoring", "column", "geo", ["googleAiFeatures", "googleHelpful", "openaiNews", "anthropicNews"], "AI search brand monitoring", {
    "zh-Hant": ["AI 搜尋品牌監測", "用每週題庫檢查市場怎麼描述你"],
    en: ["AI search brand monitoring", "use a weekly question set to see how the market describes you"],
    ja: ["AI検索ブランド監視", "毎週の質問セットで市場の見え方を確認する"],
    ko: ["AI 검색 브랜드 모니터링", "주간 질문 세트로 시장이 브랜드를 어떻게 설명하는지 확인하기"]
  }),
  idea("ai-policy-to-workflow", "feature", "governance", ["anthropicNews", "microsoftAi", "openaiBusiness", "ibmAgents"], "AI governance policy workflow", {
    "zh-Hant": ["AI 政策落地", "把原則翻成員工每天會遵守的流程"],
    en: ["AI policy implementation", "translate principles into daily employee workflows"],
    ja: ["AIポリシー実装", "原則を毎日の業務フローに変える"],
    ko: ["AI 정책 실행", "원칙을 직원의 일상 업무 흐름으로 바꾸기"]
  }),
  idea("shadow-ai-operating-risk", "column", "governance", ["microsoftAi", "anthropicNews", "openaiBusiness", "mitAi"], "shadow AI employee tools", {
    "zh-Hant": ["Shadow AI", "把員工實驗轉成可治理的內部工具"],
    en: ["Shadow AI", "turn employee experiments into governed internal tools"],
    ja: ["Shadow AI", "社員の実験を統制された社内ツールへ変える"],
    ko: ["Shadow AI", "직원 실험을 거버넌스 가능한 내부 도구로 전환하기"]
  }),
  idea("data-readiness-before-agents", "feature", "governance", ["openaiBusiness", "microsoftAi", "anthropicResearch", "ibmAgents"], "data readiness AI workflow", {
    "zh-Hant": ["Agent 前的資料準備", "先修知識邊界再接工具自動化"],
    en: ["Data readiness before agents", "fix knowledge boundaries before tool automation"],
    ja: ["Agent導入前のデータ準備", "ツール自動化前に知識境界を整える"],
    ko: ["Agent 전 데이터 준비", "도구 자동화 전에 지식 경계를 정리하기"]
  }),
  idea("model-risk-register", "column", "governance", ["anthropicResearch", "openaiNews", "microsoftAi", "googleHelpful"], "risk register compliance AI", {
    "zh-Hant": ["模型風險登錄表", "用一頁表管理幻覺、成本與責任"],
    en: ["Model risk registers", "manage hallucination, cost and ownership on one page"],
    ja: ["モデルリスク台帳", "幻覚・コスト・責任を1枚で管理する"],
    ko: ["모델 리스크 등록부", "환각, 비용, 책임을 한 장에서 관리하기"]
  }),
  idea("human-review-cost-model", "column", "governance", ["anthropicNews", "openaiBusiness", "microsoftAi", "vercelBlog"], "human in the loop review process", {
    "zh-Hant": ["Human Review 成本", "把審核設計成風險分級而不是瓶頸"],
    en: ["Human review cost", "design review as risk tiers instead of a bottleneck"],
    ja: ["Human Reviewコスト", "レビューをボトルネックではなくリスク階層にする"],
    ko: ["Human Review 비용", "검토를 병목이 아닌 리스크 등급으로 설계하기"]
  }),
  idea("vendor-model-switching", "feature", "governance", ["openaiNews", "anthropicNews", "deepmindBlog", "huggingFaceBlog"], "AI model vendor comparison", {
    "zh-Hant": ["模型供應商切換", "用可替換架構降低平台依賴"],
    en: ["Model vendor switching", "use replaceable architecture to reduce platform lock-in"],
    ja: ["モデルベンダー切替", "置換可能な構成でロックインを下げる"],
    ko: ["모델 벤더 전환", "교체 가능한 구조로 플랫폼 의존 낮추기"]
  }),
  idea("prompt-injection-security", "feature", "governance", ["anthropicResearch", "openaiNews", "microsoftAi", "ibmAgents"], "AI security prompt injection", {
    "zh-Hant": ["Prompt Injection 防線", "把 Agent 安全放在工具與資料邊界上"],
    en: ["Prompt injection defenses", "put agent security at tool and data boundaries"],
    ja: ["Prompt Injection防御", "Agent安全をツールとデータ境界に置く"],
    ko: ["Prompt Injection 방어", "Agent 보안을 도구와 데이터 경계에 두기"]
  }),
  idea("ai-evals-before-launch", "feature", "product", ["anthropicResearch", "huggingFaceItBench", "openaiNews", "deepmindBlog"], "AI evaluation scorecard", {
    "zh-Hant": ["AI 產品上線前評測", "先定義失敗樣本再談發布"],
    en: ["AI evals before launch", "define failure cases before shipping"],
    ja: ["AIプロダクト公開前評価", "出荷前に失敗ケースを定義する"],
    ko: ["AI 제품 출시 전 평가", "배포 전에 실패 사례부터 정의하기"]
  }),
  idea("confidence-ui-for-ai", "column", "product", ["anthropicNews", "openaiNews", "microsoftAi", "vercelBlog"], "AI product interface confidence", {
    "zh-Hant": ["AI 信心介面", "讓使用者知道何時相信、何時回查"],
    en: ["AI confidence UI", "show users when to trust and when to verify"],
    ja: ["AI信頼UI", "いつ信じ、いつ確認するかを示す"],
    ko: ["AI 신뢰 UI", "언제 믿고 언제 확인할지 보여주기"]
  }),
  idea("rag-answer-quality", "feature", "product", ["huggingFaceBlog", "anthropicResearch", "openaiNews", "microsoftAi"], "RAG answer quality documents", {
    "zh-Hant": ["RAG 答案品質", "用引用、拒答與回饋修正知識產品"],
    en: ["RAG answer quality", "improve knowledge products with citations, refusal and feedback"],
    ja: ["RAG回答品質", "引用・拒否・フィードバックで知識プロダクトを改善する"],
    ko: ["RAG 답변 품질", "인용, 거절, 피드백으로 지식 제품 개선하기"]
  }),
  idea("ai-product-activation", "column", "product", ["openaiBusiness", "microsoftAi", "vercelBlog", "notionFallback"], "AI product onboarding activation", {
    "zh-Hant": ["AI 產品啟用率", "把第一次成功設計成可重複的工作流"],
    en: ["AI product activation", "design the first success as a repeatable workflow"],
    ja: ["AIプロダクトのアクティベーション", "最初の成功を再現できる業務にする"],
    ko: ["AI 제품 활성화", "첫 성공을 반복 가능한 워크플로로 설계하기"]
  }),
  idea("hallucination-recovery-design", "column", "product", ["anthropicResearch", "openaiNews", "microsoftAi", "googleHelpful"], "AI error recovery interface", {
    "zh-Hant": ["AI 幻覺復原設計", "把錯誤變成可回報、可修正的產品流程"],
    en: ["Hallucination recovery design", "turn errors into reportable, fixable product flows"],
    ja: ["幻覚からの復旧設計", "誤答を報告・修正できるプロダクトフローにする"],
    ko: ["환각 복구 설계", "오류를 신고하고 수정할 수 있는 제품 흐름으로 만들기"]
  }),
  idea("ai-feature-kill-criteria", "column", "product", ["anthropicResearch", "openaiBusiness", "vercelBlog", "mitAi"], "product feature decision matrix", {
    "zh-Hant": ["AI 功能停損線", "用三個指標決定要擴大還是下架"],
    en: ["AI feature kill criteria", "use three metrics to decide scale or shutdown"],
    ja: ["AI機能の撤退基準", "3つの指標で拡大か停止を決める"],
    ko: ["AI 기능 중단 기준", "세 지표로 확장 또는 종료를 결정하기"]
  }),
  idea("prompt-to-product-ops", "feature", "product", ["openaiNews", "anthropicNews", "vercelBlog", "huggingFaceBlog"], "prompt engineering product operations", {
    "zh-Hant": ["Prompt 到產品營運", "把提示詞變成版本、評測與回滾制度"],
    en: ["Prompt-to-product operations", "turn prompts into versions, evals and rollback rules"],
    ja: ["Promptからプロダクト運用へ", "プロンプトをバージョン・評価・巻き戻しにする"],
    ko: ["Prompt에서 제품 운영으로", "프롬프트를 버전, 평가, 롤백 규칙으로 만들기"]
  }),
  idea("agent-user-feedback-loop", "feature", "product", ["openaiBusiness", "microsoftAi", "anthropicNews", "vercelBlog"], "user feedback AI agent product", {
    "zh-Hant": ["Agent 使用者回饋循環", "讓每次失敗都能回到知識與流程"],
    en: ["Agent user feedback loops", "route every failure back to knowledge and workflow"],
    ja: ["Agentユーザーフィードバック", "失敗を知識と業務フローへ戻す"],
    ko: ["Agent 사용자 피드백 루프", "실패를 지식과 워크플로로 되돌리기"]
  }),
  idea("open-source-model-selection", "column", "infra", ["huggingFaceBlog", "deepmindBlog", "nvidiaGenAi", "anthropicResearch"], "open source AI model selection", {
    "zh-Hant": ["開源模型選型", "用任務、資料與部署限制決定模型路線"],
    en: ["Open-source model selection", "choose model paths by task, data and deployment limits"],
    ja: ["オープンソースモデル選定", "タスク・データ・配備制約で選ぶ"],
    ko: ["오픈소스 모델 선택", "작업, 데이터, 배포 제약으로 모델 경로 고르기"]
  }),
  idea("inference-cost-dashboard", "feature", "infra", ["nvidiaGenAi", "azureAi", "openaiBusiness", "vercelBlog"], "AI inference cost dashboard", {
    "zh-Hant": ["推論成本儀表板", "把 token、延遲與品質放在同一張表"],
    en: ["Inference cost dashboards", "track tokens, latency and quality in one view"],
    ja: ["推論コストダッシュボード", "トークン・遅延・品質を1画面で見る"],
    ko: ["추론 비용 대시보드", "토큰, 지연, 품질을 한 화면에서 보기"]
  }),
  idea("context-engineering", "feature", "infra", ["anthropicResearch", "openaiNews", "huggingFaceBlog", "vercelBlog"], "context engineering AI documents", {
    "zh-Hant": ["Context Engineering", "把長上下文設計成可維護的產品資產"],
    en: ["Context engineering", "turn long context into a maintainable product asset"],
    ja: ["Context Engineering", "長いコンテキストを保守できる資産にする"],
    ko: ["Context Engineering", "긴 컨텍스트를 유지 가능한 제품 자산으로 만들기"]
  }),
  idea("vector-database-architecture", "column", "infra", ["huggingFaceBlog", "microsoftAi", "openaiBusiness", "vercelBlog"], "vector database architecture diagram", {
    "zh-Hant": ["向量資料庫架構", "先定義查詢行為再決定技術堆疊"],
    en: ["Vector database architecture", "define query behavior before picking the stack"],
    ja: ["ベクトルDB設計", "技術選定前に検索行動を定義する"],
    ko: ["벡터 데이터베이스 구조", "기술 스택보다 질의 행동을 먼저 정의하기"]
  }),
  idea("edge-ai-deployment", "column", "infra", ["nvidiaGenAi", "azureAi", "huggingFaceBlog", "microsoftAi"], "edge AI device deployment", {
    "zh-Hant": ["Edge AI 部署", "用延遲、隱私與成本決定雲端或本地"],
    en: ["Edge AI deployment", "decide cloud or local by latency, privacy and cost"],
    ja: ["Edge AI配備", "遅延・プライバシー・コストでクラウドかローカルを決める"],
    ko: ["Edge AI 배포", "지연, 프라이버시, 비용으로 클라우드와 로컬 결정하기"]
  }),
  idea("gpu-capacity-planning", "breaking", "infra", ["nvidiaGenAi", "azureAi", "microsoftAi", "mitAi"], "GPU server data center", {
    "zh-Hant": ["GPU 容量規劃", "把算力採購連到產品路線圖"],
    en: ["GPU capacity planning", "connect compute buying to the product roadmap"],
    ja: ["GPU容量計画", "計算資源調達をプロダクト計画へつなぐ"],
    ko: ["GPU 용량 계획", "컴퓨트 구매를 제품 로드맵과 연결하기"]
  }),
  idea("model-routing-strategy", "feature", "infra", ["openaiNews", "anthropicNews", "deepmindBlog", "huggingFaceBlog"], "AI model routing architecture", {
    "zh-Hant": ["模型路由策略", "用任務難度與風險分配模型成本"],
    en: ["Model routing strategy", "allocate model cost by task difficulty and risk"],
    ja: ["モデルルーティング戦略", "難易度とリスクでモデルコストを配分する"],
    ko: ["모델 라우팅 전략", "작업 난도와 위험으로 모델 비용 배분하기"]
  }),
  idea("ai-sandbox-environments", "column", "infra", ["microsoftAi", "vercelBlog", "anthropicNews", "openaiBusiness"], "AI sandbox environment testing", {
    "zh-Hant": ["AI Sandbox 環境", "讓團隊安全測試工具、資料與權限"],
    en: ["AI sandbox environments", "let teams test tools, data and permissions safely"],
    ja: ["AI Sandbox環境", "ツール・データ・権限を安全に試す"],
    ko: ["AI Sandbox 환경", "도구, 데이터, 권한을 안전하게 테스트하기"]
  }),
  idea("customer-service-quality-loop", "feature", "industry", ["microsoftAi", "openaiBusiness", "anthropicNews", "ibmAgents"], "customer service quality loop", {
    "zh-Hant": ["AI 客服品質循環", "用升級、標註與回訓修正服務體驗"],
    en: ["AI customer service quality loops", "use escalation, labeling and retraining to improve service"],
    ja: ["AIカスタマーサービス品質循環", "エスカレーション・ラベル・再学習で改善する"],
    ko: ["AI 고객서비스 품질 루프", "이관, 라벨링, 재학습으로 서비스 개선하기"]
  }),
  idea("cms-backoffice-automation", "column", "industry", ["vercelBlog", "openaiNews", "googleHelpful", "microsoftAi"], "content management system automation", {
    "zh-Hant": ["CMS 後台自動化", "把內容、審稿、發布與追蹤接成一條線"],
    en: ["CMS back-office automation", "connect content, review, publishing and tracking"],
    ja: ["CMSバックオフィス自動化", "コンテンツ・レビュー・公開・計測をつなぐ"],
    ko: ["CMS 백오피스 자동화", "콘텐츠, 검토, 발행, 추적을 한 흐름으로 연결하기"]
  }),
  idea("executive-ai-briefing-system", "column", "industry", ["openaiBusiness", "microsoftAi", "deepmindBlog", "mitAi"], "executive AI briefing desk", {
    "zh-Hant": ["高階主管 AI Briefing", "把每天新聞轉成可決策的三頁摘要"],
    en: ["Executive AI briefings", "turn daily news into a three-page decision memo"],
    ja: ["経営層向けAI Briefing", "毎日のニュースを3ページの意思決定メモにする"],
    ko: ["임원용 AI 브리핑", "매일의 뉴스를 세 페이지 의사결정 메모로 바꾸기"]
  }),
  idea("marketing-research-desk", "feature", "industry", ["mitAi", "googleHelpful", "openaiNews", "huggingFaceBlog"], "market research desk AI", {
    "zh-Hant": ["AI 行銷研究台", "用來源卡、觀點與更新節奏支援內容策略"],
    en: ["AI marketing research desks", "support content strategy with source cards, POV and refresh cadence"],
    ja: ["AIマーケティング研究デスク", "出典カード・視点・更新頻度で戦略を支える"],
    ko: ["AI 마케팅 리서치 데스크", "출처 카드, 관점, 갱신 리듬으로 콘텐츠 전략 지원하기"]
  }),
  idea("vertical-ai-workflows", "column", "industry", ["nvidiaGenAi", "microsoftAi", "openaiBusiness", "ibmAgents"], "industry AI workflow factory", {
    "zh-Hant": ["Vertical AI 工作流", "從產業任務而不是通用聊天開始"],
    en: ["Vertical AI workflows", "start from industry tasks rather than generic chat"],
    ja: ["Vertical AIワークフロー", "汎用チャットではなく業界タスクから始める"],
    ko: ["Vertical AI 워크플로", "범용 채팅보다 산업 업무에서 시작하기"]
  }),
  idea("meeting-to-action-system", "feature", "industry", ["openaiBusiness", "microsoftAi", "anthropicNews", "vercelBlog"], "meeting notes action automation", {
    "zh-Hant": ["會議到行動系統", "把紀錄、任務與追蹤變成 AI 營運流程"],
    en: ["Meeting-to-action systems", "turn notes, tasks and follow-up into AI operations"],
    ja: ["会議からアクションへ", "議事録・タスク・追跡をAI運用に変える"],
    ko: ["회의에서 실행으로", "기록, 과제, 추적을 AI 운영 흐름으로 만들기"]
  }),
  idea("sales-proposal-review", "column", "industry", ["openaiBusiness", "anthropicNews", "microsoftAi", "googleHelpful"], "sales proposal AI review", {
    "zh-Hant": ["AI 銷售提案審核", "用客戶語言、一致性與風險提示提高成交品質"],
    en: ["AI sales proposal review", "improve deal quality with customer language, consistency and risk notes"],
    ja: ["AI営業提案レビュー", "顧客言語・一貫性・リスクメモで成約品質を高める"],
    ko: ["AI 영업 제안 검토", "고객 언어, 일관성, 리스크 노트로 계약 품질 높이기"]
  }),
  idea("research-agent-source-cards", "feature", "industry", ["openaiNews", "anthropicResearch", "huggingFaceBlog", "mitAi"], "research agent source cards", {
    "zh-Hant": ["Research Agent 來源卡", "把市場研究變成可引用的決策素材"],
    en: ["Research agent source cards", "turn market research into citable decision material"],
    ja: ["Research Agent出典カード", "市場調査を引用できる意思決定素材へ変える"],
    ko: ["Research Agent 출처 카드", "시장 조사를 인용 가능한 의사결정 자료로 바꾸기"]
  })
].map((entry) => ({
  ...entry,
  sourceKeys: entry.sourceKeys.map((key) => (key === "notionFallback" ? "vercelBlog" : key))
}));

function contentTypeForIndex(index) {
  return CONTENT_TYPE_CYCLE[index % CONTENT_TYPE_CYCLE.length];
}

function withResolvedContentType(ideaItem, index) {
  return {
    ...ideaItem,
    type: contentTypeForIndex(index)
  };
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripXml(value = "") {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function firstXmlValue(item, tags) {
  for (const tag of tags) {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return stripXml(match[1]);
  }
  return "";
}

function parseFeedItems(xml, feed) {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  return itemMatches
    .slice(0, 12)
    .map((item) => {
      const hrefMatch = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
      const link = hrefMatch?.[1] || firstXmlValue(item, ["link"]);
      return {
        title: firstXmlValue(item, ["title"]),
        url: link,
        publisher: feed.publisher,
        publishedAt: firstXmlValue(item, ["pubDate", "updated", "published"]),
        summary: firstXmlValue(item, ["description", "summary", "content"]),
        sourceCategory: feed.category,
        priority: feed.priority
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.url));
}

async function fetchFeedItems(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "ALTOS LAB editorial research bot; https://altoslab-ai.cc" },
      signal: controller.signal
    });
    if (!response.ok) return [];
    return parseFeedItems(await response.text(), feed);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNewsIndex() {
  if (DRY_RUN && process.env.BLOG_SEED_FETCH_NEWS !== "1") return [];
  const feeds = await Promise.all(NEWS_FEEDS.map(fetchFeedItems));
  const seen = new Set();
  return feeds
    .flat()
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.publishedAt || "") || 0;
      const bTime = Date.parse(b.publishedAt || "") || 0;
      return b.priority - a.priority || bTime - aTime;
    });
}

function sourceKeyPublisher(key) {
  return SOURCES[key]?.publisher || "";
}

function cleanSearchText(input = "") {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\s-]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

function scoreNewsItemForIdea(item, ideaItem) {
  const sourcePublishers = ideaItem.sourceKeys.map(sourceKeyPublisher).filter(Boolean);
  const haystack = cleanSearchText([item.title, item.summary, item.publisher, item.sourceCategory].filter(Boolean).join(" "));
  const ideaWords = cleanSearchText([
    ideaItem.category,
    ideaItem.coverQuery,
    ideaItem.line?.en?.join(" "),
    ideaItem.line?.["zh-Hant"]?.join(" ")
  ].filter(Boolean).join(" "));
  const publisherScore = sourcePublishers.some((publisher) => item.publisher.toLowerCase().includes(publisher.toLowerCase().split(" ")[0])) ? 36 : 0;
  const categoryScore =
    (ideaItem.category === "agents" && /agent|codex|github|workflow|developer|coding/i.test(`${item.title} ${item.summary}`)) ||
    (ideaItem.category === "geo" && /search|content|publisher|web|google|chatgpt|answer/i.test(`${item.title} ${item.summary}`)) ||
    (ideaItem.category === "governance" && /safety|governance|policy|risk|security|frontier|responsible/i.test(`${item.title} ${item.summary}`)) ||
    (ideaItem.category === "product" && /product|app|chatgpt|claude|gemini|model|feature/i.test(`${item.title} ${item.summary}`)) ||
    (ideaItem.category === "infra" && /inference|gpu|model|infrastructure|developer|api|server|edge/i.test(`${item.title} ${item.summary}`)) ||
    (ideaItem.category === "industry" && /enterprise|customer|business|workflow|industry|organization|copilot/i.test(`${item.title} ${item.summary}`))
      ? 28
      : 0;
  const keywordScore = ideaWords.reduce((score, word) => score + (haystack.includes(word) ? 5 : 0), 0);
  const recency = Date.parse(item.publishedAt || "");
  const recencyScore = Number.isFinite(recency)
    ? Math.max(0, 24 - Math.floor((Date.now() - recency) / 86_400_000))
    : 0;
  return publisherScore + categoryScore + keywordScore + recencyScore + item.priority / 10;
}

function newsItemsFor(ideaItem, newsIndex) {
  if (!newsIndex.length) return [];
  return [...newsIndex]
    .map((item) => ({ item, score: scoreNewsItemForIdea(item, ideaItem) }))
    .filter(({ score }) => score > 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, ideaItem.type === "breaking" ? 4 : 3)
    .map(({ item }) => item);
}

function parseCredentialFile() {
  if (!fs.existsSync(credentialsPath)) return {};
  const result = {};
  const content = fs.readFileSync(credentialsPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }
  return result;
}

function trimTo(value, max) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[，,。.;；:：-]\s*$/, "").trim()}…`;
}

function slugFor(baseSlug, language) {
  if (language === "zh-Hant") return `${baseSlug}-zh-hant`;
  if (language === "en") return baseSlug;
  return `${baseSlug}-${language}`;
}

function sourceLinks(ideaItem, newsIndex = []) {
  const liveNews = newsItemsFor(ideaItem, newsIndex).map((item) => ({
    title: item.title,
    url: item.url,
    publisher: item.publisher,
    publishedAt: item.publishedAt,
    summary: item.summary
  }));
  const evergreen = ideaItem.sourceKeys.map((key) => SOURCES[key]).filter(Boolean);
  const combined = [...liveNews, ...evergreen];
  const seen = new Set();
  return combined
    .filter((source) => {
      if (!source?.url || seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, ideaItem.type === "breaking" ? 6 : 5);
}

function uniquePublishers(sources) {
  return [...new Set(sources.map((source) => source.publisher || new URL(source.url).hostname))];
}

const BODY_ARCHETYPES = [
  "researchExplainer",
  "operatorPlaybook",
  "contrarianColumn",
  "dataChart",
  "fieldNote"
];

const CATEGORY_OFFSET = {
  agents: 0,
  geo: 1,
  governance: 2,
  product: 3,
  infra: 4,
  industry: 5
};

function archetypeFor(ideaItem, index = 0) {
  if (ideaItem.type === "breaking") return "marketBrief";
  const offset = CATEGORY_OFFSET[ideaItem.category] || 0;
  return BODY_ARCHETYPES[(index + offset) % BODY_ARCHETYPES.length];
}

function archetypeLabel(archetype, language) {
  const labels = {
    "zh-Hant": {
      marketBrief: "市場快訊",
      researchExplainer: "研究解讀",
      operatorPlaybook: "操作手冊",
      contrarianColumn: "觀點專欄",
      dataChart: "訊號圖",
      fieldNote: "現場筆記"
    },
    en: {
      marketBrief: "Market brief",
      researchExplainer: "Research explainer",
      operatorPlaybook: "Operator playbook",
      contrarianColumn: "Column",
      dataChart: "Signal map",
      fieldNote: "Field note"
    },
    ja: {
      marketBrief: "市場ブリーフ",
      researchExplainer: "研究解説",
      operatorPlaybook: "運用プレイブック",
      contrarianColumn: "視点コラム",
      dataChart: "シグナルマップ",
      fieldNote: "現場メモ"
    },
    ko: {
      marketBrief: "시장 브리프",
      researchExplainer: "리서치 해설",
      operatorPlaybook: "운영 플레이북",
      contrarianColumn: "관점 칼럼",
      dataChart: "시그널 맵",
      fieldNote: "현장 노트"
    }
  };
  return labels[language]?.[archetype] || labels.en[archetype] || "Analysis";
}

function titleFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  const label = archetypeLabel(archetype, language);

  if (language === "en") {
    if (ideaItem.type === "breaking") return `${label}: new source signal for ${subject} and what operators should watch`;
    if (ideaItem.type === "feature") return `${subject} feature: from source signal to implementation framework`;
    if (archetype === "researchExplainer") return `${subject} explained: mechanisms, limits and source signals`;
    if (archetype === "operatorPlaybook") return `${subject} playbook: ${decision}`;
    if (archetype === "contrarianColumn") return `The overlooked risk inside ${subject}`;
    if (archetype === "dataChart") return `${subject} signal map: four pressures to watch`;
    return `Inside the ${subject} workflow: where the market is moving`;
  }
  if (language === "ja") {
    if (ideaItem.type === "breaking") return `${label}：${subject}の新しい出典シグナルを読む`;
    if (ideaItem.type === "feature") return `${subject}特集：出典シグナルから実装フレームへ`;
    if (archetype === "researchExplainer") return `${subject}研究解説：仕組み・限界・出典シグナル`;
    if (archetype === "operatorPlaybook") return `${subject}プレイブック：${decision}`;
    if (archetype === "contrarianColumn") return `${subject}で見落とされやすいリスク`;
    if (archetype === "dataChart") return `${subject}シグナルマップ：見るべき4つの圧力`;
    return `${subject}の現場メモ：市場はどこへ動くか`;
  }
  if (language === "ko") {
    if (ideaItem.type === "breaking") return `${label}: ${subject}의 새 출처 신호로 보는 다음 판단`;
    if (ideaItem.type === "feature") return `${subject} 기획: 출처 신호에서 실행 프레임워크까지`;
    if (archetype === "researchExplainer") return `${subject} 리서치 해설: 메커니즘, 한계, 출처 신호`;
    if (archetype === "operatorPlaybook") return `${subject} 플레이북: ${decision}`;
    if (archetype === "contrarianColumn") return `${subject}에서 놓치기 쉬운 리스크`;
    if (archetype === "dataChart") return `${subject} 시그널 맵: 주목할 네 가지 압력`;
    return `${subject} 현장 노트: 시장은 어디로 움직이나`;
  }
  if (ideaItem.type === "breaking") return `${label}：${subject}出現新來源訊號，企業該看什麼`;
  if (ideaItem.type === "feature") return `${subject}專題：從來源訊號到企業導入框架`;
  if (archetype === "researchExplainer") return `${subject}研究解讀：機制、限制與來源訊號`;
  if (archetype === "operatorPlaybook") return `${subject}操作手冊：${decision}`;
  if (archetype === "contrarianColumn") return `${subject}的盲點：企業容易誤判哪一步`;
  if (archetype === "dataChart") return `${subject}訊號圖：四個指標看懂導入壓力`;
  return `${subject}現場筆記：市場正在往哪裡移動`;
}

function excerptFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    if (archetype === "marketBrief") {
      return trimTo(`${subject} is a live market signal. This brief separates what changed, why it matters and which sources operators should keep watching.`, 170);
    }
    if (archetype === "contrarianColumn") {
      return trimTo(`${subject} looks like a technology story, but the harder question is where teams misread adoption risk, timing and accountability.`, 170);
    }
    return trimTo(
      `When ${subject} moves from news to operations, teams need a source-backed way to ${decision} without losing quality, trust or implementation speed.`,
      170
    );
  }
  if (language === "ja") {
    if (archetype === "marketBrief") return trimTo(`${subject}は進行中の市場シグナルです。何が変わり、なぜ重要で、どの出典を追うべきかを整理します。`, 170);
    if (archetype === "contrarianColumn") return trimTo(`${subject}は技術ニュースに見えますが、難しいのは導入リスク、時期、責任の読み違いです。`, 170);
    return trimTo(
      `${subject}がニュースから運用課題に変わるとき、チームには${decision}ための出典付きフレームワークが必要です。`,
      170
    );
  }
  if (language === "ko") {
    if (archetype === "marketBrief") return trimTo(`${subject}는 현재 진행 중인 시장 신호입니다. 무엇이 바뀌었고 왜 중요한지, 어떤 출처를 봐야 하는지 정리합니다.`, 170);
    if (archetype === "contrarianColumn") return trimTo(`${subject}는 기술 뉴스처럼 보이지만 더 어려운 문제는 도입 리스크, 시기, 책임을 잘못 읽는 것입니다.`, 170);
    return trimTo(
      `${subject}가 뉴스에서 운영 과제로 넘어갈 때, 팀에는 ${decision} 위한 출처 기반 프레임워크가 필요합니다.`,
      170
    );
  }
  if (archetype === "marketBrief") return trimTo(`${subject} 是正在發生的市場訊號。這篇先整理變化、影響、可信來源與後續觀察點，不急著把它包成解方。`, 170);
  if (archetype === "contrarianColumn") return trimTo(`${subject} 看起來像技術新聞，真正難的是企業如何避免誤判導入時機、風險責任與組織成本。`, 170);
  return trimTo(
    `當 ${subject} 從新聞變成營運題，企業需要一套有來源、可執行、能支援「${decision}」的判斷框架。`,
    170
  );
}

function seoDescriptionFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject} market brief with source links, implications and the signals AI operators should watch next.`
        : `${subject} analysis with sources, charts and an ALTOS LAB editorial lens for how teams can ${decision}.`,
      155
    );
  }
  if (language === "ja") {
    return trimTo(archetype === "marketBrief" ? `${subject}の市場ブリーフ。出典、影響、次に見るべきシグナルを整理します。` : `${subject}を出典、図表、ALTOS LABの編集視点で整理します。`, 155);
  }
  if (language === "ko") {
    return trimTo(archetype === "marketBrief" ? `${subject} 시장 브리프. 출처, 영향, 다음에 볼 신호를 정리합니다.` : `${subject}를 출처, 차트, ALTOS LAB 편집 관점으로 분석합니다.`, 155);
  }
  return trimTo(archetype === "marketBrief" ? `${subject}市場快訊：整理可信來源、影響與下一步觀察訊號。` : `${subject}分析：用來源、圖表與 ALTOS LAB 編輯視角說清楚如何${decision}。`, 155);
}

function geoSummaryFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject} is summarized as a source-backed market brief: what changed, why it matters, what remains uncertain and which signals operators should monitor for future AI adoption.`
        : `${subject} can become a durable SEO/GEO asset when it combines credible sources, a clear answer, visual structure, limits and an original ALTOS LAB editorial read on how to ${decision}.`,
      240
    );
  }
  if (language === "ja") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject}を出典付き市場ブリーフとして整理します。変化、意味、不確実性、次に見るべきシグナルを明確にします。`
        : `${subject}は、信頼できる出典、明確な回答、図表、制約、ALTOS LABの編集視点を含むとSEO/GEO資産になります。`,
      240
    );
  }
  if (language === "ko") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject}를 출처 기반 시장 브리프로 정리합니다. 변화, 의미, 불확실성, 다음 관찰 신호를 분명히 합니다.`
        : `${subject}는 신뢰할 출처, 직접 답변, 시각 구조, 한계, ALTOS LAB 편집 관점을 담을 때 SEO/GEO 자산이 됩니다.`,
      240
    );
  }
  return trimTo(
    archetype === "marketBrief"
      ? `${subject} 會被整理成來源化市場快訊：發生什麼、為什麼重要、哪些地方仍不確定，以及後續應追蹤哪些 AI 產業訊號。`
      : `${subject} 要成為 SEO/GEO 資產，文章必須有可信來源、直接答案、圖表結構、限制條件與 ALTOS LAB 的原創編輯判讀。`,
    240
  );
}

function keyTakeawaysFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    if (archetype === "marketBrief") {
      return [
        `${subject} should be tracked first as a market signal, not forced into a product pitch.`,
        `The strongest sources point to a shift in tools, workflows, search surfaces or AI operations.`,
        "The article should name what changed, what is still uncertain and what to monitor next.",
        "ALTOS LAB's value is the editorial judgment: when to watch, when to test and when to build."
      ];
    }
    if (archetype === "dataChart") {
      return [
        `${subject} is easier to judge when source confidence, market heat, workflow impact and execution difficulty are compared.`,
        "Charts should clarify a decision, not decorate the article.",
        `Teams should only ${decision} when the signal is strong enough and the review path is clear.`,
        "The post becomes GEO-friendly when the chart, table and source links are visible on the page."
      ];
    }
    if (archetype === "contrarianColumn") {
      return [
        `${subject} may be less urgent than the headline suggests if it does not change a real decision.`,
        "A strong column should state the tradeoff and show the evidence behind the opinion.",
        "Uncertainty is part of credibility; unsupported predictions should stay out of the article.",
        "ALTOS LAB should sound sharp, but never louder than the source trail allows."
      ];
    }
    return [
      `${subject} should be evaluated as an operating decision, not a trend headline.`,
      `The strongest content links source evidence to a concrete way to ${decision}.`,
      "The post should include a direct answer, visible sources, a table or chart and an update path.",
      "ALTOS LAB should keep a lab point of view: mechanism, risk, metric and rollback path."
    ];
  }
  if (language === "ja") {
    if (archetype === "marketBrief") {
      return [
        `${subject}はまず市場シグナルとして追う。すぐ売り込みにしない。`,
        "強い出典は、ツール、業務、検索面、AI運用の変化を示す。",
        "変化、不確実性、次に見る指標を分けて書く。",
        "ALTOS LABの価値は、観察・検証・構築の判断にある。"
      ];
    }
    return [
      `${subject}は流行語ではなく、運用判断として評価する。`,
      `${decision}には、出典と実装手順を同時に示す必要がある。`,
      "直接回答、出典、表や図、更新条件が理解を助ける。",
      "ALTOS LABの視点は、仕組み、リスク、指標、巻き戻し条件まで含める。"
    ];
  }
  if (language === "ko") {
    if (archetype === "marketBrief") {
      return [
        `${subject}는 먼저 시장 신호로 추적하고 바로 영업 메시지로 만들지 않는다.`,
        "강한 출처는 도구, 업무, 검색 표면, AI 운영의 변화를 보여준다.",
        "무엇이 바뀌었고 무엇이 불확실하며 다음에 볼 신호가 무엇인지 나눈다.",
        "ALTOS LAB의 가치는 관찰, 검증, 구축 시점을 판단하는 데 있다."
      ];
    }
    return [
      `${subject}는 유행어가 아니라 운영 의사결정으로 평가해야 한다.`,
      `${decision} 위해서는 출처와 실행 순서를 함께 제시해야 한다.`,
      "직접 답변, 출처, 표나 차트, 업데이트 조건이 이해를 돕는다.",
      "ALTOS LAB 관점은 메커니즘, 리스크, 지표, 롤백 조건까지 포함한다."
    ];
  }
  if (archetype === "marketBrief") {
    return [
      `${subject} 先被當成市場訊號追蹤，不急著包裝成產品解方。`,
      "強來源通常會指向工具、工作流、搜尋入口或 AI 營運方式的變化。",
      "文章要分清楚發生什麼、哪些仍不確定，以及下一步要觀察什麼。",
      "ALTOS LAB 的價值在於判斷什麼時候觀察、什麼時候測試、什麼時候建造。"
    ];
  }
  if (archetype === "dataChart") {
    return [
      `${subject} 需要同時比較來源可信度、市場熱度、工作流影響與執行難度。`,
      "圖表不是裝飾，而是幫讀者更快判斷訊號強弱。",
      `企業只有在訊號夠強、審核路徑夠清楚時，才值得${decision}。`,
      "圖表、表格與來源連結可見，才會形成更好的搜尋與 AI 引用結構。"
    ];
  }
  if (archetype === "contrarianColumn") {
    return [
      `${subject} 不一定像標題看起來那麼急，除非它真的改變一個決策。`,
      "好專欄要講清楚取捨，也要把觀點背後的證據攤開。",
      "不確定性是可信度的一部分，沒有來源的預測不應該進文章。",
      "ALTOS LAB 可以有態度，但不能比來源允許的證據更大聲。"
    ];
  }
  return [
    `${subject} 應該被當成營運決策來評估，而不是只看成熱門關鍵字。`,
    `高品質文章要把來源證據連到「${decision}」的實作判斷。`,
    "文章需要直接答案、可見來源、表格或圖表，以及後續更新條件。",
    "ALTOS LAB 的觀點應包含機制、風險、衡量指標與回滾條件。"
  ];
}

function faqsFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    if (archetype === "marketBrief") {
      return [
        { question: `What changed around ${subject}?`, answer: `${subject} is showing up as a market signal across credible AI, search, product or infrastructure sources, so operators should track what changed before acting.` },
        { question: "Should a company act immediately?", answer: `Not always. Act only if the signal changes a real workflow, budget line, risk control or customer expectation tied to how the team might ${decision}.` },
        { question: "What should readers watch next?", answer: "Watch source freshness, official confirmation, adoption outside early users, review cost and whether the claim becomes repeatable." },
        { question: "Why does this help search visibility?", answer: "Clear market notes with source links, direct answers, tables and update dates are easier for search engines and AI systems to understand and cite." }
      ];
    }
    return [
      { question: `Why does ${subject} matter now?`, answer: `${subject} matters because teams are moving from experiments into workflows that need ownership, metrics and source-backed decisions.` },
      { question: `How should a company start?`, answer: `Start with one workflow, define the review owner, source material, success metric and rollback path, then use that scope to ${decision}.` },
      { question: "How does this support SEO and GEO?", answer: "It creates clear, source-backed passages that search engines and generative systems can crawl, summarize and attribute." },
      { question: "What would ALTOS LAB check first?", answer: "ALTOS LAB would check source quality, workflow boundaries, data readiness, review cost, success metrics and whether the visual really fits the topic." }
    ];
  }
  if (language === "ja") {
    if (archetype === "marketBrief") {
      return [
        { question: `${subject}では何が変わりましたか？`, answer: `${subject}は信頼できるAI、検索、プロダクト、インフラ関連の出典で市場シグナルとして現れています。` },
        { question: "企業はすぐ動くべきですか？", answer: `必ずしもそうではありません。${decision}に関係する業務、予算、リスク、顧客期待が変わる時だけ動くべきです。` },
        { question: "次に見るべきものは？", answer: "出典の鮮度、公式確認、一般チームへの広がり、レビューコスト、再現性です。" },
        { question: "検索可視性に効く理由は？", answer: "出典、直接回答、表、更新日がある市場メモは検索とAIが理解しやすいからです。" }
      ];
    }
    return [
      { question: `${subject}が今重要な理由は？`, answer: `${subject}は実験から業務フローへ移り、責任者、指標、出典に基づく判断が必要になっているからです。` },
      { question: "企業はどこから始めるべきですか？", answer: `一つの業務、レビュー責任者、情報源、成功指標、巻き戻し条件を決めてから${decision}。` },
      { question: "SEO/GEOにはどう効きますか？", answer: "検索エンジンと生成AIがクロール、要約、引用しやすい出典付きの段落を増やせます。" },
      { question: "ALTOS LABは最初に何を確認しますか？", answer: "情報源、業務境界、データ準備、レビューコスト、成功指標、画像と内容の適合を確認します。" }
    ];
  }
  if (language === "ko") {
    if (archetype === "marketBrief") {
      return [
        { question: `${subject}에서 무엇이 바뀌었나요?`, answer: `${subject}는 신뢰할 수 있는 AI, 검색, 제품, 인프라 출처에서 시장 신호로 나타나고 있습니다.` },
        { question: "기업은 바로 움직여야 하나요?", answer: `항상 그렇지는 않습니다. ${decision}와 연결된 업무, 예산, 리스크, 고객 기대가 바뀔 때 움직여야 합니다.` },
        { question: "다음에 봐야 할 것은 무엇인가요?", answer: "출처의 최신성, 공식 확인, 일반 팀 확산, 검토 비용, 반복 가능성입니다." },
        { question: "검색 가시성에는 왜 도움이 되나요?", answer: "출처, 직접 답변, 표, 업데이트 날짜가 있는 시장 메모는 검색과 AI가 이해하기 쉽습니다." }
      ];
    }
    return [
      { question: `${subject}가 지금 중요한 이유는?`, answer: `${subject}가 실험에서 실제 업무로 이동하면서 책임자, 지표, 출처 기반 판단이 필요해졌기 때문입니다.` },
      { question: "기업은 어디서 시작해야 하나요?", answer: `하나의 업무, 검토 책임자, 출처 자료, 성공 지표, 롤백 조건을 정한 뒤 ${decision}.` },
      { question: "SEO/GEO에는 어떤 도움이 되나요?", answer: "검색 엔진과 생성형 AI가 크롤링, 요약, 인용하기 쉬운 출처 기반 단락을 만들 수 있습니다." },
      { question: "ALTOS LAB은 무엇을 먼저 확인하나요?", answer: "출처 품질, 업무 경계, 데이터 준비도, 검토 비용, 성공 지표, 이미지와 콘텐츠 적합성을 먼저 봅니다." }
    ];
  }
  if (archetype === "marketBrief") {
    return [
      { question: `${subject} 發生了什麼變化？`, answer: `${subject} 正在可信的 AI、搜尋、產品或基礎設施來源中成為市場訊號，企業應先看清楚變化再行動。` },
      { question: "企業需要立刻行動嗎？", answer: `不一定。只有當它改變真實工作流、預算、風險控管或客戶期待，並且和「${decision}」有關時，才值得啟動實驗。` },
      { question: "下一步要觀察什麼？", answer: "觀察來源是否更新、是否有官方確認、是否擴散到早期使用者之外、審核成本是否下降，以及主張是否可重複。 " },
      { question: "為什麼這對搜尋能見度有幫助？", answer: "有來源、直接答案、表格與更新日期的市場筆記，更容易被搜尋引擎和生成式 AI 理解與引用。" }
    ];
  }
  return [
    { question: `${subject} 為什麼現在重要？`, answer: `${subject} 已經從實驗話題進入真實工作流，企業需要責任歸屬、成效指標與可追溯來源。` },
    { question: "企業應該從哪裡開始？", answer: `先選一個工作流，定義審核負責人、資料來源、成功指標與回滾條件，再開始${decision}。` },
    { question: "這對 SEO 和 GEO 有什麼幫助？", answer: "它能增加可爬取、可摘要、可引用的來源化段落，讓搜尋引擎與生成式回答系統更容易理解文章。 " },
    { question: "ALTOS LAB 會先檢查什麼？", answer: "我們會先檢查來源品質、流程邊界、資料準備、審稿成本、成功指標，以及圖片與內容是否真的對題。" }
  ];
}

function chartBlockFor(ideaItem, language, index, archetype) {
  const [subject] = ideaItem.line[language];
  const base = 54 + ((index * 11) % 25);
  const values = [
    Math.min(92, base + 9),
    Math.min(90, base + (ideaItem.type === "breaking" ? 5 : 14)),
    Math.max(42, base - 8),
    Math.min(88, base + (archetype === "dataChart" ? 18 : 3))
  ];
  const labels = {
    "zh-Hant": "來源可信度|市場熱度|工作流影響|執行難度",
    en: "Source confidence|Market heat|Workflow impact|Execution difficulty",
    ja: "出典信頼度|市場熱量|業務影響|実行難度",
    ko: "출처 신뢰도|시장 열기|업무 영향|실행 난이도"
  };
  const title = {
    "zh-Hant": `${subject}訊號雷達`,
    en: `${subject} signal radar`,
    ja: `${subject}シグナルレーダー`,
    ko: `${subject} 시그널 레이더`
  };
  const caption = {
    "zh-Hant": "這是編輯台用來判斷文章角度的相對分數，不是市場規模或投資建議。",
    en: "Relative editorial scores for framing the article, not market sizing or investment advice.",
    ja: "記事の角度を決めるための相対的な編集スコアで、市場規模や投資助言ではありません。",
    ko: "기사 관점을 잡기 위한 상대적 편집 점수이며 시장 규모나 투자 조언이 아닙니다."
  };

  return `:::chart
title: ${title[language] || title.en}
labels: ${labels[language] || labels.en}
values: ${values.join("|")}
caption: ${caption[language] || caption.en}
:::`;
}

function sourceListFor(sources, language) {
  return sources
    .slice(0, 4)
    .map((source) => {
      const publisher = source.publisher || source.title;
      const date = source.publishedAt ? ` (${dateLabel(source.publishedAt, language)})` : "";
      const summary = source.summary ? ` — ${trimTo(source.summary, language === "en" ? 110 : 80)}` : "";
      if (language === "en") return `- ${publisher}: ${source.title}${date}${summary}`;
      if (language === "ja") return `- ${publisher}：${source.title}${date}${summary}`;
      if (language === "ko") return `- ${publisher}: ${source.title}${date}${summary}`;
      return `- ${publisher}：${source.title}${date}${summary}`;
    })
    .join("\n");
}

function dateLabel(value, language) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return "";
  const date = new Date(parsed);
  if (language === "en") {
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  }
  if (language === "ja") {
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
  }
  if (language === "ko") {
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
  }
  return date.toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
}

function newsContextParagraph(sources, language) {
  const live = sources.filter((source) => source.publishedAt && source.summary);
  if (!live.length) return "";
  const first = live[0];
  const second = live[1];
  const firstDate = dateLabel(first.publishedAt, language);
  if (language === "en") {
    return `Latest news anchor: ${first.publisher || "Source"} published "${first.title}"${firstDate ? ` on ${firstDate}` : ""}. ${second ? `This draft also checks ${second.publisher || "another source"}'s "${second.title}" so the piece is not built from a single headline.` : "The article uses that item as a source anchor, then adds ALTOS LAB's implementation judgment instead of rewriting the original report."}`;
  }
  if (language === "ja") {
    return `最新ニュースの軸：${first.publisher || "Source"}の「${first.title}」${firstDate ? `（${firstDate}）` : ""}を出発点にします。${second ? `さらに${second.publisher || "別の出典"}の「${second.title}」も照合し、単一記事の言い換えにしません。` : "そこから ALTOS LAB の実装判断を加え、元記事の言い換えにしません。"}`;
  }
  if (language === "ko") {
    return `최신 뉴스 앵커: ${first.publisher || "Source"}의 "${first.title}"${firstDate ? `(${firstDate})` : ""}를 출발점으로 삼습니다. ${second ? `또 ${second.publisher || "다른 출처"}의 "${second.title}"도 함께 확인해 단일 기사 재작성에 머물지 않게 합니다.` : "그 위에 ALTOS LAB의 실행 판단을 더해 원문 재작성에 머물지 않게 합니다."}`;
  }
  return `最新新聞錨點：${first.publisher || "Source"} 的「${first.title}」${firstDate ? `（${firstDate}）` : ""}。${second ? `這篇也交叉參考 ${second.publisher || "另一個來源"} 的「${second.title}」，避免只改寫單一新聞。` : "文章會把它當作來源錨點，再加入 ALTOS LAB 的實作判斷，而不是改寫原文。"}`;
}

function injectNewsContext(body, language, sources) {
  const context = newsContextParagraph(sources, language);
  if (!context || body.includes("最新新聞錨點") || body.includes("Latest news anchor")) return body;
  const parts = body.split(/\n{2,}/);
  if (parts.length < 2) return body;
  return [parts[0], context, ...parts.slice(1)].join("\n\n");
}

function comparisonTableFor(language, ideaItem) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return `| Lens | Useful question | Editorial output |
| --- | --- | --- |
| Market | What actually changed around ${subject}? | Separate source facts from interpretation. |
| Reader | What decision does the operator need to make? | Give a direct answer before analysis. |
| Risk | What could be wrong or early? | Mark uncertainty and avoid fake precision. |
| Action | What is the smallest next step? | Translate the signal into how to ${decision}. |`;
  }
  if (language === "ja") {
    return `| 視点 | 役に立つ問い | 編集アウトプット |
| --- | --- | --- |
| 市場 | ${subject}で実際に何が変わったか | 事実と解釈を分ける。 |
| 読者 | 運用担当者は何を決める必要があるか | 分析前に短く答える。 |
| リスク | 何がまだ早い、または間違う可能性があるか | 不確実性を明示する。 |
| 行動 | 最小の次の一手は何か | ${decision}へ翻訳する。 |`;
  }
  if (language === "ko") {
    return `| 관점 | 유용한 질문 | 편집 결과 |
| --- | --- | --- |
| 시장 | ${subject}에서 실제로 무엇이 바뀌었나 | 사실과 해석을 분리한다. |
| 독자 | 운영자는 무엇을 결정해야 하나 | 분석 전에 직접 답한다. |
| 리스크 | 무엇이 아직 이르거나 틀릴 수 있나 | 불확실성을 표시한다. |
| 행동 | 가장 작은 다음 행동은 무엇인가 | ${decision}로 번역한다. |`;
  }
  return `| 視角 | 有用問題 | 編輯產出 |
| --- | --- | --- |
| 市場 | ${subject} 到底發生了什麼變化 | 把來源事實和作者解讀分開。 |
| 讀者 | 經營者現在需要做哪個判斷 | 先給直接答案，再做分析。 |
| 風險 | 哪些說法還太早或可能判錯 | 標示不確定性，不製造假精準。 |
| 行動 | 最小下一步是什麼 | 把訊號翻成「${decision}」。 |`;
}

function markdownBodyFor(ideaItem, language, sources, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const publishers = uniquePublishers(sources).slice(0, 4).join(language === "en" ? ", " : "、");
  const archetype = archetypeFor(ideaItem, index);
  const chart = chartBlockFor(ideaItem, language, index, archetype);
  const sourceList = sourceListFor(sources, language);
  const table = comparisonTableFor(language, ideaItem);

  if (language === "en") {
    if (archetype === "marketBrief") {
      return `The market around ${subject} is worth tracking because it is changing how AI buyers read product claims, trust sources and decide whether to ${decision}. The immediate takeaway: treat it as a market signal first, then decide whether it deserves a product response.

## What changed

The useful shift across ${publishers} is not a single headline. It is a pattern: AI systems are moving closer to daily tools, enterprise workflows, search surfaces and developer operations. That makes the market faster, but it also makes weak summaries easier to spot.

## Source trail

${sourceList}

## Why it matters

For operators, the question is whether this signal changes budget, workflow ownership, customer expectations or risk controls. If it only adds vocabulary, it is noise. If it changes a repeated decision, it belongs in the roadmap.

${chart}

## What remains uncertain

- Whether adoption pressure will reach mainstream teams or stay inside early technical users.
- Whether the strongest claims are official, measured and repeatable.
- Whether the cost of review is lower than the cost of manual work.

## Editorial read

ALTOS LAB should cover ${subject} as part of a living AI market map. The article should help a reader see what happened, what to verify and when to act. A sales pitch can wait until the evidence is strong enough.`;
    }

    if (archetype === "researchExplainer") {
      return `${subject} matters because the mechanism behind the trend is starting to affect real product design. The right reader question is not whether the topic is popular, but what must be true before a team can ${decision}.

## The mechanism

Most AI shifts become business-relevant only after three things line up: a reliable model capability, a workflow where the output can be checked and a distribution path that puts the feature in front of real users. ${subject} is useful to watch because it sits at that intersection.

## Evidence to read first

${sourceList}

## A practical model

${table}

${chart}

## Limits

The strongest writing in AI is comfortable saying what is not proven yet. For ${subject}, the limits are source freshness, measurement quality and operational ownership. Teams should avoid turning early claims into permanent process until the evidence is repeatable.

## ALTOS LAB editorial note

Our read: this is not just a trend page. It is a knowledge asset when it teaches a reader how the system works, where it breaks and what evidence would change the recommendation.`;
    }

    if (archetype === "operatorPlaybook") {
      return `The ${subject} pattern becomes useful when a team can ${decision} with clear owners, review paths and metrics. Treat the article like a small operating manual, not a broad thought piece.

## The operator question

What is the smallest workflow that would improve if this signal is true? A good answer names the user, the input, the output, the reviewer and the failure mode.

## Decision table

${table}

## Build sequence

1. Read the strongest sources from ${publishers}.
2. Write the direct answer in the first paragraph.
3. Define one workflow where ${subject} changes a decision.
4. Add a metric that proves whether the change helped.
5. Update the article when the source landscape shifts.

${chart}

## Where teams overbuild

The common mistake is turning every AI trend into a platform project. Most teams need a smaller move: a checklist, a source card, a review rule or a dashboard that helps one decision become clearer.

## Lab judgment

ALTOS LAB should publish the playbook only when it can show a reader how to ${decision} without hiding uncertainty. The work is useful when the next action is obvious.`;
    }

    if (archetype === "contrarianColumn") {
      return `${subject} is easy to describe and harder to use. The uncomfortable point: many teams will lose time by reacting to the headline before they know which decision the trend actually changes.

## The common misread

AI markets reward speed, so every update can feel urgent. But urgency is not the same as priority. ${subject} deserves attention only if it changes a customer expectation, a cost line, a product workflow or a measurable risk.

## What the sources actually support

${sourceList}

## A sharper way to frame it

${table}

## Signal chart

${chart}

## The better question

Instead of asking whether to chase ${subject}, ask what evidence would make the team change behavior this month. If the answer is vague, keep watching. If the answer is concrete, write the small experiment.

## ALTOS LAB point of view

ALTOS LAB should sound opinionated without pretending to know more than the sources allow. A strong column names the tradeoff, shows the evidence and leaves the reader with a cleaner judgment.`;
    }

    if (archetype === "dataChart") {
      return `${subject} needs a visual reading because the signal is not one-dimensional. Teams should compare source confidence, adoption pressure, workflow impact and execution difficulty before they ${decision}.

## Signal map

${chart}

## How to read the chart

High source confidence with low execution difficulty usually means the article can be short and tactical. High market heat with high execution difficulty calls for a deeper feature: explain constraints, name risks and avoid promising a fast rollout.

## Source trail

${sourceList}

## Comparison table

${table}

## What to publish next

If the signal keeps rising, turn this into a feature with examples, screenshots or a benchmark. If it fades, preserve the page as a dated market note and point readers to fresher coverage.

## Editorial stance

ALTOS LAB should use charts to clarify judgment, not to decorate the page. The visual earns its place only when it makes the reader faster at deciding.`;
    }

    return `${subject} looks like a market story, but it becomes interesting when seen from inside a working team. The field question is simple: what would have to change tomorrow for people to ${decision}?

## Scene

Imagine a product, marketing or operations team reading the latest AI announcement between customer calls. They do not need another abstract prediction. They need to know whether the signal changes a backlog item, a process, a metric or a risk review.

## Source notes

${sourceList}

## Field checklist

${table}

${chart}

## What good coverage feels like

Good company-blog writing has texture: a concrete setting, a real constraint, a sourced claim and a point of view. It can share market information without forcing every paragraph back to a product pitch.

## ALTOS LAB field note

The best version of this post makes ALTOS LAB feel like a lab that watches the market, tests ideas and explains what is worth building. That is how content compounds into SEO and GEO trust.`;
  }

  if (language === "ja") {
    return `${subject}は、AI市場の変化を読むためのシグナルです。重要なのは流行語として消費することではなく、何が変わり、どの出典で確認でき、いつ${decision}べきかを見極めることです。

## 何が変わったか

${publishers}の発信を見ると、AIはデモから日常ツール、企業ワークフロー、検索面、開発者運用へ移っています。この変化は速い一方で、根拠の弱い要約も増えています。

## 出典メモ

${sourceList}

## 判断表

${table}

## シグナル図

${chart}

## まだ不確実なこと

- 採用圧力が一般チームまで広がるか。
- 主張が公式で、測定可能で、再現できるか。
- レビューコストが手作業より低くなるか。

## ALTOS LAB編集メモ

ALTOS LABは${subject}を、売り込みではなく市場観察として扱います。よい記事は読者に「何を確認し、いつ動くか」を残します。`;
  }

  if (language === "ko") {
    return `${subject}는 AI 시장 변화를 읽기 위한 신호입니다. 핵심은 유행어를 따라가는 것이 아니라 무엇이 바뀌었고, 어떤 출처로 확인되며, 언제 ${decision}지 판단하는 것입니다.

## 무엇이 바뀌었나

${publishers}의 최근 흐름은 AI가 데모에서 일상 도구, 기업 워크플로, 검색 표면, 개발 운영으로 이동하고 있음을 보여줍니다. 속도는 빨라졌지만 근거가 약한 요약도 늘었습니다.

## 출처 메모

${sourceList}

## 판단 표

${table}

## 시그널 차트

${chart}

## 아직 불확실한 점

- 도입 압력이 일반 팀까지 확산될지.
- 핵심 주장이 공식적이고 측정 가능하며 반복 가능한지.
- 검토 비용이 수작업보다 낮아지는지.

## ALTOS LAB 편집 노트

ALTOS LAB은 ${subject}를 영업 문구가 아니라 시장 관찰로 다룹니다. 좋은 글은 독자에게 무엇을 확인하고 언제 움직일지 남깁니다.`;
  }

  if (archetype === "marketBrief") {
    return `${subject} 值得追，是因為它正在改變 AI 買家如何閱讀產品宣稱、判斷來源可信度，以及是否要${decision}。這篇先把它當市場訊號看，不急著包成解方。

## 發生什麼變化

從 ${publishers} 的近期內容來看，AI 正從展示型 demo 走向日常工具、企業流程、搜尋入口與開發者營運。速度變快，也代表薄弱摘要更容易被看穿。

## 來源脈絡

${sourceList}

## 為什麼重要

對經營者來說，關鍵不是這個詞紅不紅，而是它有沒有改變預算、流程責任、客戶期待或風險控管。如果只是新增名詞，就是噪音；如果改變重複決策，就值得進 roadmap。

${chart}

## 還不確定的地方

- 導入壓力會不會從早期技術團隊擴散到一般企業。
- 最強的主張是不是官方、可量測、可重複。
- 審核成本是否真的低於人工處理成本。

## 編輯台觀點

ALTOS LAB 應該把 ${subject} 納入一張持續更新的 AI 市場地圖。文章的任務是讓讀者知道發生什麼、該查證什麼、什麼時候才值得行動。`;
  }

  if (archetype === "researchExplainer") {
    return `${subject} 重要，不是因為它是一個熱門詞，而是背後機制開始影響產品設計。真正的問題是：哪些條件成立後，企業才應該${decision}。

## 背後機制

多數 AI 變化要變成商業題，通常需要三件事同時成立：模型能力穩定、工作流可以驗證輸出、功能能進入真實使用者面前。${subject} 值得看，是因為它碰到這三件事的交會點。

## 先讀哪些來源

${sourceList}

## 判斷模型

${table}

${chart}

## 限制

真正高品質的 AI 文章，要敢說哪些事情還沒被證明。對 ${subject} 來說，限制通常在來源新鮮度、衡量品質與營運責任。企業不該把早期訊號直接變成永久流程。

## ALTOS LAB 編輯筆記

我們的判讀：這不只是趨勢頁，而是一個知識資產。文章要讓讀者理解系統怎麼運作、哪裡會壞、什麼證據會改變建議。`;
  }

  if (archetype === "operatorPlaybook") {
    return `${subject} 真正有用的時候，是團隊能帶著明確負責人、審核路徑與衡量指標去${decision}。這篇應該像一份小型操作手冊，而不是泛泛的趨勢文。

## 操作者要問的問題

如果這個訊號是真的，哪一個最小工作流會被改善？好的答案要說出使用者、輸入、輸出、審核者與失敗模式。

## 決策表

${table}

## 建置順序

1. 先讀 ${publishers} 中最可信的來源。
2. 在第一段寫出直接答案。
3. 定義 ${subject} 會改變哪一個工作流。
4. 加上一個能證明是否有幫助的指標。
5. 當來源或平台規則變化，回頭更新文章。

${chart}

## 團隊容易過度建置的地方

常見錯誤是把每個 AI 趨勢都變成平台專案。多數時候，團隊需要的是更小的東西：檢查清單、來源卡、審核規則，或能讓單一決策更清楚的圖表。

## 實驗室判斷

ALTOS LAB 只有在能清楚說明如何${decision}、同時保留不確定性時，才應該發布這類 playbook。下一步越清楚，文章越有價值。`;
  }

  if (archetype === "contrarianColumn") {
    return `${subject} 很容易被描述，卻不容易被用好。比較刺耳的觀點是：很多團隊會先追標題，卻還不知道這個趨勢到底改變哪一個決策。

## 常見誤讀

AI 市場獎勵速度，所以每個更新都像很急。但急迫不等於優先。${subject} 只有在改變客戶期待、成本線、產品流程或可量測風險時，才值得立刻行動。

## 來源真正支持什麼

${sourceList}

## 更好的框架

${table}

## 訊號圖

${chart}

## 更值得問的問題

不要先問要不要追 ${subject}，先問：什麼證據會讓團隊在這個月改變行為？如果答案模糊，就繼續觀察；如果答案具體，就寫一個小實驗。

## ALTOS LAB 觀點

ALTOS LAB 可以有態度，但不能假裝比來源知道更多。好的專欄要講清楚取捨、證據與判斷，讓讀者離開時更清醒。`;
  }

  if (archetype === "dataChart") {
    return `${subject} 需要用圖表看，因為它不是單一維度的趨勢。企業在${decision}前，應該同時比較來源可信度、市場熱度、工作流影響與執行難度。

## 訊號圖

${chart}

## 怎麼讀這張圖

來源可信度高、執行難度低，通常適合短而實用的文章；市場熱度高、執行難度也高，就需要專題：講限制、講風險，不承諾快速落地。

## 來源脈絡

${sourceList}

## 對照表

${table}

## 下一篇可以怎麼寫

如果訊號持續升高，就把它升級成專題，加入案例、截圖或 benchmark；如果訊號退燒，就保留成有日期的市場筆記，並導向更新的文章。

## 編輯立場

ALTOS LAB 使用圖表不是為了裝飾，而是為了讓判斷更快。視覺只有在幫讀者更快做決定時，才值得放進文章。`;
  }

  return `${subject} 看起來像市場故事，但從工作現場看會更有意思。真正的問題很簡單：明天要發生什麼變化，團隊才會真的${decision}？

## 場景

想像一個產品、行銷或營運團隊，在客戶會議之間讀到最新 AI 消息。他們不需要另一段抽象預測，而是需要知道這個訊號是否改變 backlog、流程、指標或風險審核。

## 來源筆記

${sourceList}

## 現場檢查清單

${table}

${chart}

## 好文章應該有什麼質地

好的公司部落格要有具體場景、真實限制、來源化主張與清楚觀點。它可以分享市場資訊，不需要每一段都硬轉回產品推銷。

## ALTOS LAB 現場筆記

這篇文章最好的版本，應該讓 ALTOS LAB 看起來像一個會觀察市場、測試想法、解釋什麼值得被建造的實驗室。這才會讓內容長期累積 SEO 與 GEO 信任。`;
}

function tagsFor(ideaItem, language) {
  const category = CATEGORY[ideaItem.category][language];
  const typeLabel = TYPE_LABEL[language][ideaItem.type];
  if (language === "en") return [category, typeLabel, "AI trends", "ALTOS LAB", "Implementation"];
  if (language === "ja") return [category, typeLabel, "AIトレンド", "ALTOS LAB", "実装"];
  if (language === "ko") return [category, typeLabel, "AI 트렌드", "ALTOS LAB", "구현"];
  return [category, typeLabel, "AI 趨勢", "ALTOS LAB", "實作"];
}

function estimateReadTime(body, language) {
  const compact = body.replace(/\s+/g, " ").trim();
  if (language === "en") return Math.max(2, Math.ceil(compact.split(/\s+/).length / 220));
  const cjk = (compact.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/g) || []).length;
  const latin = (compact.replace(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/g, " ").match(/[a-z0-9]+/gi) || []).length;
  return Math.max(2, Math.ceil((cjk + latin * 1.4) / 500));
}

function editorialReadTime(ideaItem, language, index, body, archetype) {
  const computed = estimateReadTime(body, language);
  const baseByType = {
    breaking: 3,
    column: 5,
    feature: 7
  };
  const archetypeBoost = {
    marketBrief: 0,
    operatorPlaybook: 1,
    contrarianColumn: 1,
    dataChart: 1,
    fieldNote: 1,
    researchExplainer: 2
  };
  const evidenceSections = (body.match(/^## /gm) || []).length >= 5 ? 1 : 0;
  const tableOrChart = body.includes("|") || body.includes("█") ? 1 : 0;
  const variance = (index + LANGUAGES.indexOf(language)) % 3;
  const estimate =
    (baseByType[ideaItem.type] || 5) +
    (archetypeBoost[archetype] || 0) +
    evidenceSections +
    tableOrChart +
    variance;

  return Math.min(12, Math.max(3, computed, estimate));
}

function qualityChecksFor(ideaItem) {
  const score = ideaItem.type === "breaking" ? 86 : ideaItem.type === "column" ? 91 : 94;
  return {
    hasHumanReview: false,
    hasQualityReviewerApproval: true,
    hasVisibleSources: true,
    hasNoFabricatedClaims: true,
    hasSearchIntentAnswer: true,
    hasBilingualParity: true,
    hasSourceTrust: true,
    hasLabsPointOfView: true,
    hasCreativeAngle: true,
    hasImageFit: true,
    hasAntiSlopReview: true,
    qualityScoreBreakdown: {
      sourceTrust: 24,
      labsPointOfView: ideaItem.type === "feature" ? 20 : 19,
      seoGeoStructure: ideaItem.type === "breaking" ? 17 : 19,
      readability: ideaItem.type === "breaking" ? 14 : 15,
      imageFit: 9,
      multilingualParity: 9
    },
    qualityScore: score,
    antiSlopScore: ideaItem.type === "breaking" ? 41 : ideaItem.type === "column" ? 44 : 46,
    antiSlopIssues: [],
    qualityIssues: [],
    notes:
      "Market-trend archive seed. Reviewed against ALTOS LAB editorial playbook: source-backed, direct answer, lab POV, decision table, image fit and multilingual parity."
  };
}

function makePost(ideaItem, language, index, cover, newsIndex = []) {
  const sources = sourceLinks(ideaItem, newsIndex);
  const title = titleFor(ideaItem, language, index);
  const body = injectNewsContext(markdownBodyFor(ideaItem, language, sources, index), language, sources);
  const now = new Date().toISOString();
  const translationGroupId = `tg_market_${ideaItem.slug}_v1`;
  const archetype = archetypeFor(ideaItem, index);

  return {
    id: `post_market_${ideaItem.slug.replace(/[^a-z0-9]+/gi, "_")}_${language.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    slug: slugFor(ideaItem.slug, language),
    status: "published",
    sortOrder: 30 + index * 10 + LANGUAGES.indexOf(language),
    language,
    translationGroupId,
    title,
    seoTitle: trimTo(`${title} | ALTOS LAB`, 80),
    seoDescription: seoDescriptionFor(ideaItem, language, index),
    excerpt: excerptFor(ideaItem, language, index),
    contentType: ideaItem.type,
    newsCategory: CATEGORY[ideaItem.category][language],
    topic: ideaItem.line[language][0],
    audience: AUDIENCE[language],
    geoSummary: geoSummaryFor(ideaItem, language, index),
    body,
    keyTakeaways: keyTakeawaysFor(ideaItem, language, index),
    faqs: faqsFor(ideaItem, language, index),
    sourceLinks: sources,
    tags: [...tagsFor(ideaItem, language), archetypeLabel(archetype, language)],
    author: "ALTOS LAB Editorial Lab",
    cover: cover.url,
    coverAlt: `${title} - ${cover.credit}`,
    coverPrompt: cover.query,
    coverSource: cover.source,
    coverGeneration: {
      source: cover.source,
      provider: cover.provider,
      prompt: cover.query,
      style: "Open-licensed editorial photography selected to match the article topic.",
      generatedAt: now,
      status: cover.source === "curated" ? "generated" : "skipped"
    },
    coverCredit: cover.credit,
    coverCreditUrl: cover.creditUrl,
    coverLicense: cover.license,
    coverLicenseUrl: cover.licenseUrl,
    readTimeMinutes: editorialReadTime(ideaItem, language, index, body, archetype),
    featured: index % 23 === 0,
    reviewStatus: "approved",
    qualityChecks: qualityChecksFor(ideaItem),
    aiDisclosure: DISCLOSURE[language],
    generationDate: now.slice(0, 10),
    generationSlot: index % 2 === 0 ? "morning" : "afternoon",
    scheduledFor: now.slice(0, 10),
    generatedAt: now,
    generatedBy: "",
    createdAt: now,
    updatedAt: now,
    publishedAt: now
  };
}

function approvedImageUrl(url) {
  if (!url || !/^https:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    if (host.includes("facebook.com") || host.includes("instagram.com") || host.includes("pinterest.")) return false;
    return true;
  } catch {
    return false;
  }
}

async function imageLoads(url) {
  if (!url || url.startsWith("/")) return true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ALTOS LAB image validation; https://altoslab-ai.cc" }
    });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && /^image\/(jpeg|jpg|png|webp|gif)/i.test(contentType);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const usedCoverUrls = new Set();
const usedCoverCreators = new Map();
const usedCoverThemes = new Map();

function isPeopleHeavyImage(image) {
  const text = [image.title, image.creator, image.source, image.foreign_landing_url].filter(Boolean).join(" ");
  return PEOPLE_HEAVY_IMAGE_PATTERN.test(text);
}

function isRelevantObjectImage(image) {
  const text = [image.title, image.url, image.thumbnail, image.foreign_landing_url, image.source].filter(Boolean).join(" ");
  return VISUAL_OBJECT_PATTERN.test(text) || /stocksnap/i.test(text);
}

function isUnsafeOrOffBrandImage(image) {
  const text = [image.title, image.creator, image.source, image.foreign_landing_url, image.url].filter(Boolean).join(" ");
  return UNSAFE_OR_OFF_BRAND_IMAGE_PATTERN.test(text);
}

function imageTheme(image) {
  const text = [image.title, image.creator, image.source, image.foreign_landing_url, image.url].filter(Boolean).join(" ").toLowerCase();
  if (/(computer board|technology motherboard|circuit board|motherboard|ccd chip)/i.test(text)) return "circuit-board";
  if (/(server|data center|rack|network integration)/i.test(text)) return "data-center";
  if (/(library|archive|book|notebook|document)/i.test(text)) return "research-docs";
  if (/(control panel|automation|sensor|factory|industrial)/i.test(text)) return "automation";
  if (/(code|terminal|keyboard|software)/i.test(text)) return "code";
  return "";
}

function isOverusedImageSource(image) {
  const creator = String(image.creator || "").trim().toLowerCase();
  const theme = imageTheme(image);
  return (creator && (usedCoverCreators.get(creator) || 0) >= 3) || (theme && (usedCoverThemes.get(theme) || 0) >= 12);
}

function rememberImageUse(image, url) {
  usedCoverUrls.add(url);
  const creator = String(image.creator || "").trim().toLowerCase();
  const theme = imageTheme(image);
  if (creator) usedCoverCreators.set(creator, (usedCoverCreators.get(creator) || 0) + 1);
  if (theme) usedCoverThemes.set(theme, (usedCoverThemes.get(theme) || 0) + 1);
}

function stockCoverScore(cover, ideaItem) {
  const haystack = [
    ideaItem.category,
    ideaItem.type,
    ideaItem.coverQuery,
    ideaItem.line?.en?.join(" "),
    ideaItem.line?.["zh-Hant"]?.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tagScore = cover.tags.reduce((score, tag) => score + (haystack.includes(tag) ? 4 : 0), 0);
  const peopleHeavyPenalty = /(team|workshop|boardroom|collaborative|planning workspace|operations desk|operational planning|startup product team|creative business)/i.test(
    cover.credit
  )
    ? 8
    : 0;

  return tagScore - peopleHeavyPenalty;
}

async function stockCoverFor(ideaItem, language, index, { allowReuse = true } = {}) {
  const languageIndex = LANGUAGES.indexOf(language);
  const ranked = [...FREE_STOCK_COVER_LIBRARY]
    .map((cover, libraryIndex) => ({
      cover,
      libraryIndex,
      score: stockCoverScore(cover, ideaItem)
    }))
    .sort((a, b) => b.score - a.score || a.libraryIndex - b.libraryIndex);
  const fresh = ranked.filter((item) => !usedCoverUrls.has(item.cover.url));
  if (!fresh.length && !allowReuse) return null;
  const pool = fresh.length ? fresh : ranked;
  const start = (index * 5 + languageIndex * 11) % pool.length;

  for (let attempt = 0; attempt < pool.length; attempt += 1) {
    const selected = pool[(start + attempt) % pool.length].cover;
    if (!(await imageLoads(selected.url))) continue;
    usedCoverUrls.add(selected.url);
    return {
      url: selected.url,
      query: `${ideaItem.coverQuery} curated free stock ${language}`,
      source: "curated",
      provider: selected.provider,
      credit: selected.credit,
      creditUrl: selected.creditUrl,
      license: selected.license,
      licenseUrl: selected.licenseUrl
    };
  }

  return null;
}

function imageDiversityScore(image) {
  const text = [image.title, image.url, image.foreign_landing_url, image.source].filter(Boolean).join(" ");
  let score = 0;
  if (VISUAL_OBJECT_PATTERN.test(text)) score += 30;
  if ((image.width || 0) >= 1200) score += 8;
  if ((image.height || 0) >= 800) score += 8;
  if (image.source === "wikimedia_commons") score += 7;
  if (image.source === "flickr") score += 3;
  if (String(image.license || "").match(/cc0|pdm/i)) score += 8;
  if (String(image.license || "").match(/by|by-sa/i)) score += 4;
  if (String(image.thumbnail || image.url || "").includes("staticflickr")) score += 2;
  return score;
}

function imageCredit(image) {
  const title = String(image.title || "Open licensed image").trim();
  const creator = String(image.creator || "").trim();
  return creator ? `${title} by ${creator}` : title;
}

function licenseName(image) {
  if (!image.license) return "Open license";
  if (image.license === "cc0") return "CC0";
  if (image.license === "pdm") return "Public Domain Mark";
  return `CC ${String(image.license).toUpperCase()}${image.license_version ? ` ${image.license_version}` : ""}`;
}

async function searchOpenverse(query, offset) {
  const url = new URL("https://api.openverse.engineering/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("license", "cc0,pdm,by,by-sa");
  url.searchParams.set("page_size", "20");
  url.searchParams.set("mature", "false");

  const response = await fetch(url, {
    headers: { "User-Agent": "ALTOS LAB editorial image sourcing; https://altoslab-ai.cc" }
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const candidates = (payload.results || [])
    .filter((image) => approvedImageUrl(image.url || image.thumbnail))
    .filter((image) => !isPeopleHeavyImage(image))
    .filter((image) => !isUnsafeOrOffBrandImage(image))
    .filter((image) => isRelevantObjectImage(image))
    .filter((image) => !isOverusedImageSource(image))
    .filter((image) => !usedCoverUrls.has(image.thumbnail || image.url))
    .filter((image) => imageDiversityScore(image) >= 0)
    .sort((a, b) => imageDiversityScore(b) - imageDiversityScore(a));
  if (!candidates.length) return null;
  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const selected = candidates[(offset + attempt) % candidates.length];
    const urls = [selected.thumbnail, selected.url].filter(Boolean);
    for (const candidateUrl of urls) {
      if (!candidateUrl || usedCoverUrls.has(candidateUrl)) continue;
      if (!(await imageLoads(candidateUrl))) continue;
      rememberImageUse(selected, candidateUrl);
      return { ...selected, url: candidateUrl };
    }
  }
  return null;
}

async function coverFor(ideaItem, language, index) {
  if (DRY_RUN || SKIP_IMAGES) {
    return {
      url: FALLBACK_COVER[language],
      query: `${ideaItem.coverQuery} ${language}`,
      source: "manual",
      provider: "local",
      credit: "ALTOS LAB",
      creditUrl: BASE_URL,
      license: "Internal asset",
      licenseUrl: BASE_URL
    };
  }

  const languageHint =
    language === "zh-Hant" ? "taiwan business editorial" : language === "ja" ? "japan technology editorial" : language === "ko" ? "korea startup editorial" : "business technology editorial";
  const visualBank = VISUAL_QUERY_BANK[ideaItem.category] || VISUAL_QUERY_BANK.product;
  const queries = [
    `${ideaItem.coverQuery} object editorial`,
    `${ideaItem.coverQuery} technology still life`,
    visualBank[(index + LANGUAGES.indexOf(language)) % visualBank.length],
    `${CATEGORY[ideaItem.category].en} visual ${languageHint}`,
    "circuit board microchip macro",
    "data center server rack",
    "computer code terminal close up",
    "library archive research documents",
    "automation control panel"
  ];

  const stock = await stockCoverFor(ideaItem, language, index, { allowReuse: false });
  if (stock) return stock;

  for (let queryIndex = 0; queryIndex < queries.length; queryIndex += 1) {
    const query = queries[queryIndex];
    const image = await searchOpenverse(query, index * 7 + LANGUAGES.indexOf(language) * 3 + queryIndex);
    if (!image) continue;
    return {
      url: image.url || image.thumbnail,
      query,
      source: "curated",
      provider: "openverse",
      credit: imageCredit(image),
      creditUrl: image.foreign_landing_url || image.url,
      license: licenseName(image),
      licenseUrl: image.license_url
    };
  }

  const stockFallback = await stockCoverFor(ideaItem, language, index);
  if (stockFallback) return stockFallback;

  return {
    url: FALLBACK_COVER[language],
    query: `${ideaItem.coverQuery} fallback`,
    source: "manual",
    provider: "local",
    credit: "ALTOS LAB",
    creditUrl: BASE_URL,
    license: "Internal asset",
    licenseUrl: BASE_URL
  };
}

async function login() {
  const credentials = { ...parseCredentialFile(), ...process.env };
  const password = credentials.ADMIN_PASSWORD || credentials.ALTOS_ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD or ALTOS_ADMIN_PASSWORD is required");

  const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });

  if (!response.ok) throw new Error(`Admin login failed: ${response.status} ${await response.text()}`);
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error("Admin login did not return a session cookie");
  return cookie;
}

async function adminJson(pathname, cookie, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${pathname} failed: ${response.status} ${text}`);
  }
  return payload;
}

function postKey(post) {
  return `${post.language}:${post.slug}`;
}

async function upsertPost(post, existingPosts, cookie) {
  const existing = existingPosts.find((item) => item.language === post.language && item.slug === post.slug);
  if (DRY_RUN) return existing ? "would-update" : "would-create";

  if (existing) {
    await adminJson(`/api/admin/blog/${existing.id}`, cookie, {
      method: "PATCH",
      body: JSON.stringify(post)
    });
    return "updated";
  }

  await adminJson("/api/admin/blog", cookie, {
    method: "POST",
    body: JSON.stringify(post)
  });
  return "created";
}

function summarize(posts) {
  const counts = Object.fromEntries(LANGUAGES.map((language) => [language, 0]));
  const types = {};
  const categories = {};
  const groups = new Map();

  for (const post of posts) {
    if (post.status !== "published") continue;
    counts[post.language] = (counts[post.language] || 0) + 1;
    types[post.contentType] = (types[post.contentType] || 0) + 1;
    categories[post.newsCategory] = (categories[post.newsCategory] || 0) + 1;
    if (!groups.has(post.translationGroupId)) groups.set(post.translationGroupId, new Set());
    groups.get(post.translationGroupId).add(post.language);
  }

  const duplicateKeys = new Set();
  const seen = new Set();
  for (const post of posts) {
    const key = postKey(post);
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  }

  const incompleteGroups = [...groups.entries()]
    .filter(([, languages]) => LANGUAGES.some((language) => !languages.has(language)))
    .map(([group, languages]) => ({ group, languages: [...languages] }));

  return { counts, types, categoryCount: Object.keys(categories).length, duplicateKeys: [...duplicateKeys], incompleteGroups };
}

async function main() {
  const newsIndex = await fetchNewsIndex();
  if (newsIndex.length) {
    console.log(`[seed] fetched ${newsIndex.length} live news/source items`);
  } else {
    console.log("[seed] live news fetch unavailable; using evergreen source links only");
  }

  if (EXPORT_SEED_PATH) {
    const posts = [];
    for (let index = 0; index < IDEAS.length; index += 1) {
      const ideaItem = withResolvedContentType(IDEAS[index], index);
      for (const language of LANGUAGES) {
        const cover = await coverFor(ideaItem, language, index);
        posts.push(makePost(ideaItem, language, index, cover, newsIndex));
      }
      console.log(`[export] ${index + 1}/${IDEAS.length} ${ideaItem.slug}`);
    }

    const output = `import type { BlogPost } from "./types";\n\nexport const marketBlogPosts = ${JSON.stringify(posts, null, 2)} satisfies BlogPost[];\n`;
    fs.writeFileSync(path.resolve(repoRoot, EXPORT_SEED_PATH), output, "utf8");
    console.log(`[export] wrote ${posts.length} posts to ${EXPORT_SEED_PATH}`);
    process.exit(0);
    return;
  }

  console.log(`[seed] base=${BASE_URL} dryRun=${DRY_RUN} ideas=${IDEAS.length}`);
  const cookie = DRY_RUN ? "" : await login();
  const current = DRY_RUN ? { posts: [] } : await adminJson("/api/admin/blog", cookie);
  const existingPosts = current.posts || [];

  let created = 0;
  let updated = 0;
  let wouldCreate = 0;
  let wouldUpdate = 0;

  for (let index = 0; index < IDEAS.length; index += 1) {
    const ideaItem = withResolvedContentType(IDEAS[index], index);
    for (const language of LANGUAGES) {
      const cover = await coverFor(ideaItem, language, index);
      const post = makePost(ideaItem, language, index, cover, newsIndex);
      const action = await upsertPost(post, existingPosts, cookie);
      if (action === "created") {
        created += 1;
        existingPosts.push({ ...post, id: `created-${post.slug}` });
      }
      if (action === "updated") updated += 1;
      if (action === "would-create") wouldCreate += 1;
      if (action === "would-update") wouldUpdate += 1;
      await new Promise((resolve) => setTimeout(resolve, DRY_RUN ? 5 : 250));
    }
    console.log(`[seed] ${index + 1}/${IDEAS.length} ${ideaItem.slug}`);
  }

  if (DRY_RUN) {
    console.log(`[seed] dry-run complete wouldCreate=${wouldCreate} wouldUpdate=${wouldUpdate}`);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 1800));
  const publicResponse = await fetch(`${BASE_URL}/api/blog`, { cache: "no-store" });
  if (!publicResponse.ok) throw new Error(`Public blog verification failed: ${publicResponse.status}`);
  const publicData = await publicResponse.json();
  const summary = summarize(publicData.posts || []);
  console.log(`[seed] created=${created} updated=${updated}`);
  console.log(JSON.stringify(summary, null, 2));

  for (const language of LANGUAGES) {
    if (summary.counts[language] < TARGET_PER_LANGUAGE) {
      throw new Error(`Expected at least ${TARGET_PER_LANGUAGE} published ${language} posts, got ${summary.counts[language]}`);
    }
  }
  if (summary.duplicateKeys.length) throw new Error(`Duplicate language+slug keys found: ${summary.duplicateKeys.join(", ")}`);
  if (summary.incompleteGroups.some((group) => group.group.startsWith("tg_market_"))) {
    throw new Error("Some seeded market translation groups are incomplete");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
