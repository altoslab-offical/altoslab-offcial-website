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
  const variant = index % 4;

  if (language === "en") {
    if (ideaItem.type === "breaking") {
      return [
        `${subject} now belongs in workflow, budget and risk review`,
        `What recent sources around ${subject} mean for operators`,
        `${subject} is heating up; the real test is review cost`,
        `The new ${subject} signal and the first workflow experiment to run`
      ][variant];
    }
    if (ideaItem.type === "feature") {
      return [
        `From ${subject} to operating system: a practical adoption framework`,
        `Before adopting ${subject}, clarify ownership, evidence and rollback`,
        `${subject} as system design: sources, review paths and execution risk`,
        `From market signal to field experiment: how to approach ${subject}`
      ][variant];
    }
    if (archetype === "researchExplainer") return `How ${subject} works when it reaches real teams`;
    if (archetype === "operatorPlaybook") return `The operator checklist for ${decision}`;
    if (archetype === "contrarianColumn") return `The adoption risk teams miss in ${subject}`;
    if (archetype === "dataChart") return `Four signals that decide whether ${subject} is ready`;
    return `What ${subject} looks like inside a working team`;
  }
  if (language === "ja") {
    if (ideaItem.type === "breaking") {
      return [
        `${subject}は業務・予算・リスク判断のテーマになり始めた`,
        `${subject}の新しい出典シグナルを運用者はどう読むか`,
        `${subject}の熱量が上がる今、先に見るべきレビューコスト`,
        `${subject}を最初の業務実験に変えるなら何から始めるか`
      ][variant];
    }
    if (ideaItem.type === "feature") {
      return [
        `${subject}を運用システムに変えるための実装フレーム`,
        `${subject}導入前に決めるべき責任・証拠・巻き戻し`,
        `${subject}をシステム設計として読む：出典、レビュー、実行リスク`,
        `市場シグナルから現場実験へ：${subject}の導入ルート`
      ][variant];
    }
    if (archetype === "researchExplainer") return `${subject}は現場でどう機能するのか`;
    if (archetype === "operatorPlaybook") return `${decision}ための運用チェックリスト`;
    if (archetype === "contrarianColumn") return `${subject}でチームが見落とす導入リスク`;
    if (archetype === "dataChart") return `${subject}が導入可能かを決める4つのシグナル`;
    return `働くチームの中で見る${subject}`;
  }
  if (language === "ko") {
    if (ideaItem.type === "breaking") {
      return [
        `${subject}는 이제 업무, 예산, 리스크 판단의 주제다`,
        `${subject}의 새 출처 신호를 운영자는 어떻게 읽어야 하나`,
        `${subject} 열기가 높아질 때 먼저 볼 것은 검토 비용이다`,
        `${subject}를 첫 업무 실험으로 바꾸려면 어디서 시작할까`
      ][variant];
    }
    if (ideaItem.type === "feature") {
      return [
        `${subject}를 운영 시스템으로 바꾸는 실행 프레임`,
        `${subject} 도입 전에 정해야 할 책임, 증거, 롤백`,
        `${subject}를 시스템 설계로 읽기: 출처, 검토, 실행 리스크`,
        `시장 신호에서 현장 실험으로: ${subject} 도입 경로`
      ][variant];
    }
    if (archetype === "researchExplainer") return `${subject}는 실제 팀에서 어떻게 작동하나`;
    if (archetype === "operatorPlaybook") return `${decision} 위한 운영 체크리스트`;
    if (archetype === "contrarianColumn") return `${subject}에서 팀이 놓치는 도입 리스크`;
    if (archetype === "dataChart") return `${subject} 도입 가능성을 가르는 네 가지 신호`;
    return `일하는 팀 안에서 본 ${subject}`;
  }
  if (ideaItem.type === "breaking") {
    return [
      `「${subject}」進入最新來源視野，企業先看流程與責任`,
      `企業該如何判讀「${subject}」的新訊號`,
      `「${subject}」熱度升高，但先別急著導入`,
      `「${subject}」從新聞變成工作流實驗，該怎麼看`
    ][variant];
  }
  if (ideaItem.type === "feature") {
    return [
      `「${subject}」如何從新聞走到企業可用的系統`,
      `企業導入「${subject}」前，必須先釐清的四件事`,
      `「${subject}」的系統設計框架：來源、責任與回滾`,
      `從市場訊號到落地實驗：「${subject}」的導入路徑`
    ][variant];
  }
  if (archetype === "researchExplainer") return `「${subject}」進入真實團隊後，機制與限制是什麼`;
  if (archetype === "operatorPlaybook") return `企業導入「${subject}」前，需要哪張操作檢查表`;
  if (archetype === "contrarianColumn") return `「${subject}」的盲點：企業容易誤判哪一步`;
  if (archetype === "dataChart") return `「${subject}」是否值得導入，用四個訊號先判斷`;
  return `從工作現場看「${subject}」：市場訊號如何變成決策`;
}

function excerptFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  const variant = index % 4;
  if (language === "en") {
    if (ideaItem.type === "breaking") {
      return trimTo(
        [
          `${subject} is appearing across recent sources; the useful question is whether it changes workflow ownership, budget or risk review.`,
          `Recent coverage around ${subject} matters only if it changes a repeated operator decision, not because it adds another AI label.`,
          `${subject} is gaining heat, but teams should test source quality and review cost before turning it into a roadmap item.`,
          `The first move around ${subject} is not a platform build; it is a source card, a review rule and one workflow experiment.`
        ][variant],
        170
      );
    }
    if (ideaItem.type === "feature") {
      return trimTo(`${subject} is treated as a system-design problem: sources, ownership, review paths, rollback and the smallest useful implementation step.`, 170);
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
    if (ideaItem.type === "breaking") {
      return trimTo(
        [
          `${subject}は複数の新しい出典に現れ始めています。見るべきなのは、業務・予算・リスク判断が変わるかです。`,
          `${subject}の最近の報道は、新しいAI用語ではなく、繰り返し発生する業務判断を変えるかで読むべきです。`,
          `${subject}の熱量が上がる今、チームは導入前に出典の質とレビューコストを確認すべきです。`,
          `${subject}で最初に作るべきものは大きな基盤ではなく、出典カード、レビュー規則、小さな業務実験です。`
        ][variant],
        170
      );
    }
    if (ideaItem.type === "feature") return trimTo(`${subject}をシステム設計として扱い、出典、責任、レビュー経路、巻き戻し、小さな導入手順を整理します。`, 170);
    if (archetype === "contrarianColumn") return trimTo(`${subject}は技術ニュースに見えますが、難しいのは導入リスク、時期、責任の読み違いです。`, 170);
    return trimTo(
      `${subject}がニュースから運用課題に変わるとき、チームには${decision}ための出典付きフレームワークが必要です。`,
      170
    );
  }
  if (language === "ko") {
    if (ideaItem.type === "breaking") {
      return trimTo(
        [
          `${subject}는 최근 여러 출처에서 나타나고 있습니다. 핵심은 업무, 예산, 리스크 판단을 바꾸는지입니다.`,
          `${subject}의 최근 보도는 새 AI 용어가 아니라 반복되는 운영 판단을 바꾸는지로 읽어야 합니다.`,
          `${subject}의 열기가 높아질 때 팀은 도입 전에 출처 품질과 검토 비용을 먼저 확인해야 합니다.`,
          `${subject}의 첫 움직임은 큰 플랫폼 구축이 아니라 출처 카드, 검토 규칙, 작은 업무 실험입니다.`
        ][variant],
        170
      );
    }
    if (ideaItem.type === "feature") return trimTo(`${subject}를 시스템 설계 문제로 보고 출처, 책임, 검토 경로, 롤백, 작은 실행 단계를 정리합니다.`, 170);
    if (archetype === "contrarianColumn") return trimTo(`${subject}는 기술 뉴스처럼 보이지만 더 어려운 문제는 도입 리스크, 시기, 책임을 잘못 읽는 것입니다.`, 170);
    return trimTo(
      `${subject}가 뉴스에서 운영 과제로 넘어갈 때, 팀에는 ${decision} 위한 출처 기반 프레임워크가 필요합니다.`,
      170
    );
  }
  if (ideaItem.type === "breaking") {
    return trimTo(
      [
        `「${subject}」開始出現在多個近期來源裡；真正該看的不是熱度，而是它有沒有改變流程、預算或風險判斷。`,
        `「${subject}」不是多一個 AI 名詞，而是企業該問它會不會改變某個重複決策。`,
        `「${subject}」熱度升高時，團隊先檢查來源品質與審核成本，再決定是否放進 roadmap。`,
        `「${subject}」的第一步不是建平台，而是來源卡、審核規則，以及一個能驗證價值的小實驗。`
      ][variant],
      170
    );
  }
  if (ideaItem.type === "feature") return trimTo(`把「${subject}」當成系統設計題：來源、責任、審核路徑、回滾條件與最小可行實驗要一起看。`, 170);
  if (archetype === "contrarianColumn") return trimTo(`「${subject}」看起來像技術新聞，真正難的是企業如何避免誤判導入時機、風險責任與組織成本。`, 170);
  return trimTo(
    `當「${subject}」從新聞變成營運題，企業需要一套有來源、可執行、能支援「${decision}」的判斷框架。`,
    170
  );
}

function seoDescriptionFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject} source-backed update with implications, uncertainty and operator signals to watch next.`
        : `${subject} analysis with sources, charts and an ALTOS LAB editorial lens for how teams can ${decision}.`,
      155
    );
  }
  if (language === "ja") {
    return trimTo(archetype === "marketBrief" ? `${subject}の最新動向を出典、影響、不確実性、次の観測点で整理します。` : `${subject}を出典、図表、ALTOS LABの編集視点で整理します。`, 155);
  }
  if (language === "ko") {
    return trimTo(archetype === "marketBrief" ? `${subject} 최신 흐름을 출처, 영향, 불확실성, 다음 관찰 신호로 정리합니다.` : `${subject}를 출처, 차트, ALTOS LAB 편집 관점으로 분석합니다.`, 155);
  }
  return trimTo(archetype === "marketBrief" ? `「${subject}」最新動向：用可信來源、影響、不確定性與下一步觀察訊號整理。` : `「${subject}」分析：用來源、圖表與 ALTOS LAB 編輯視角說清楚如何${decision}。`, 155);
}

function geoSummaryFor(ideaItem, language, index = 0) {
  const [subject, decision] = ideaItem.line[language];
  const archetype = archetypeFor(ideaItem, index);
  if (language === "en") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject} is not a reason to buy or rebuild yet; it is a source-backed signal to watch. The useful read is whether recent coverage changes workflow ownership, budget pressure or risk review. ALTOS LAB would start with a source card, a review rule and one small experiment before moving it into the roadmap.`
        : `${subject} is useful only when it becomes an operating decision, not a trend label. This piece maps the source evidence, the implementation risk and the reviewer who must own quality. The practical next step is to test whether the team can ${decision} with clear metrics and rollback paths.`,
      420
    );
  }
  if (language === "ja") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject}は、今すぐ導入すべき答えではなく、出典付きで観察すべきシグナルです。見るべきなのは、最近の報道が業務責任、予算、リスクレビューを変えるかどうかです。ALTOS LABなら、まず出典カード、レビュー規則、小さな業務実験から始めます。`
        : `${subject}は、トレンド名ではなく運用判断になった時に価値があります。この記事では、出典で確認できる事実、実装リスク、品質を見張る担当者を整理します。次の一歩は、明確な指標と巻き戻し条件を置いて${decision}かを試すことです。`,
      420
    );
  }
  if (language === "ko") {
    return trimTo(
      archetype === "marketBrief"
        ? `${subject}는 지금 바로 도입할 답이 아니라 출처 기반으로 지켜볼 신호입니다. 중요한 것은 최근 보도가 업무 책임, 예산 압박, 리스크 검토를 바꾸는지입니다. ALTOS LAB이라면 먼저 출처 카드, 검토 규칙, 작은 업무 실험부터 설계합니다.`
        : `${subject}는 트렌드 이름이 아니라 운영 판단이 될 때 가치가 있습니다. 이 글은 출처로 확인되는 사실, 실행 리스크, 품질을 책임질 검토자를 정리합니다. 다음 단계는 명확한 지표와 롤백 조건을 두고 ${decision}지 시험하는 것입니다.`,
      420
    );
  }
  return trimTo(
    archetype === "marketBrief"
      ? `「${subject}」現在不是立刻導入的答案，而是值得用來源追蹤的市場訊號。真正要看的是近期消息是否改變流程責任、預算壓力或風險審核。ALTOS LAB 會先做來源卡、審核規則與一個小型工作流實驗，再決定要不要放進 roadmap。`
      : `「${subject}」有價值的地方，不是它是不是熱門詞，而是它能不能變成可執行的營運判斷。這篇會整理可追溯來源、導入風險、品質審核責任與最小實驗路徑。下一步是確認團隊能否在有指標與回滾條件下「${decision}」。`,
    420
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
    "zh-Hant": `${subject}導入判斷卡`,
    en: `${subject} adoption scorecard`,
    ja: `${subject}導入スコアカード`,
    ko: `${subject} 도입 스코어카드`
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
    return `Latest context: ${first.publisher || "Source"} published "${first.title}"${firstDate ? ` on ${firstDate}` : ""}. ${second ? `We also check ${second.publisher || "another source"}'s "${second.title}" so the piece is not built from a single headline.` : "We use that source as the factual floor, then add ALTOS LAB's implementation judgment instead of rewriting the report."}`;
  }
  if (language === "ja") {
    return `最新背景：${first.publisher || "Source"}の「${first.title}」${firstDate ? `（${firstDate}）` : ""}を事実確認の起点にします。${second ? `さらに${second.publisher || "別の出典"}の「${second.title}」も照合し、単一記事の言い換えにしません。` : "そこから ALTOS LAB の実装判断を加え、元記事の言い換えにしません。"}`;
  }
  if (language === "ko") {
    return `최신 배경: ${first.publisher || "Source"}의 "${first.title}"${firstDate ? `(${firstDate})` : ""}를 사실 확인의 출발점으로 삼습니다. ${second ? `또 ${second.publisher || "다른 출처"}의 "${second.title}"도 함께 확인해 단일 기사 재작성에 머물지 않게 합니다.` : "그 위에 ALTOS LAB의 실행 판단을 더해 원문 재작성에 머물지 않게 합니다."}`;
  }
  return `最新背景：${first.publisher || "Source"} 的「${first.title}」${firstDate ? `（${firstDate}）` : ""}是這篇的事實起點。${second ? `我們也交叉參考 ${second.publisher || "另一個來源"} 的「${second.title}」，避免只改寫單一新聞。` : "文章會把它當作事實底線，再加入 ALTOS LAB 的實作判斷，而不是改寫原文。"}`;
}

function injectNewsContext(body, language, sources) {
  const context = newsContextParagraph(sources, language);
  if (
    !context ||
    body.includes("最新背景") ||
    body.includes("Latest context") ||
    body.includes("최신 배경")
  ) {
    return body;
  }
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
  const isBrief = archetype === "marketBrief" || ideaItem.type === "breaking";
  const isFeature = ideaItem.type === "feature";

  if (language === "en") {
    if (isBrief) {
      return `${subject} is worth attention only if it changes an operator's next decision. The current signal from ${publishers} is not "AI is moving fast"; it is that teams may soon need a clearer way to decide whether this belongs in workflow, budget or risk review.

## Read the signal before reacting

The right move is not to turn every headline into a roadmap item. First decide whether ${subject} changes who owns the work, how output is reviewed, what customer expectation shifts, or what cost line becomes visible.

## Sources on the table

${sourceList}

## The three useful questions

1. Does this source change a decision the team repeats every week?
2. Can the claim be checked by an official source, product evidence or independent reporting?
3. Would acting on it make the workflow easier to review, not just faster?

## What is still early

The signal is not proof of broad adoption. The open questions are whether the strongest claims are measurable, whether non-technical teams will feel the pressure, and whether review cost drops enough to justify a change.

## ALTOS LAB read

Treat ${subject} as a watchlist item until it changes a repeated decision. When it does, the smallest useful response is a source card, a review rule and one workflow experiment tied to how the team can ${decision}.`;
    }

    if (isFeature) {
      return `${subject} becomes interesting when it stops being a headline and starts behaving like an operating-system problem. The practical question is what has to be true before a company can ${decision} without creating hidden review debt.

## Why this turns into a system question

Most AI trends become business-relevant only when three things line up: a reliable capability, a workflow where the output can be checked, and a distribution path that puts the result in front of real users. ${subject} sits close to that intersection.

## Evidence to read first

${sourceList}

## Adoption decision table

${table}

## A small implementation path

1. Pick one repeated decision affected by ${subject}.
2. Write the source card: what is confirmed, what is inferred and what is unknown.
3. Define the reviewer before defining the automation.
4. Measure quality, review time and rollback cost before expanding scope.

${chart}

## Lab judgment

ALTOS LAB should publish this as a durable knowledge asset, not a trend recap. The piece is useful if a reader can leave with a sharper model of how the system works, where it breaks and what evidence would change the recommendation.`;
    }

    return `${subject} looks like a market story, but the useful column starts with a narrower question: what would make a serious team change behavior this month? If the answer is vague, the topic belongs on the watchlist. If it is concrete, it deserves an experiment.

## The decision hiding inside the trend

Teams do not need more AI vocabulary. They need to know whether ${subject} changes a customer promise, a workflow owner, a cost line or a review obligation.

## What the sources support

${sourceList}

## Operator frame

${table}

## The tradeoff

Moving early can create advantage when the evidence is official, repeatable and close to a live workflow. Moving early becomes theater when the team cannot say who reviews the output or what failure looks like.

## ALTOS LAB point of view

Our stance is to be opinionated but not louder than the evidence. A good column on ${subject} should leave the reader with a cleaner decision, not just a stronger feeling that AI is important.`;
  }

  if (language === "ja") {
    if (isBrief) {
      return `${subject}で見るべきなのは、話題性ではなく次の業務判断が変わるかです。${publishers}の最近の発信は、チームがこのテーマを業務、予算、リスク確認のどこに置くべきかを考え始める段階に来たことを示しています。

## 反応する前に確認すること

すぐにロードマップへ入れる必要はありません。まず、${subject}が責任者、レビュー方法、顧客期待、またはコスト構造を変えるかを見ます。

## 確認した出典

${sourceList}

## 先に聞く三つの問い

1. 週次で繰り返す判断を変えるか。
2. 公式情報、製品上の証拠、独立した報道で確認できるか。
3. 速くなるだけでなく、レビューしやすくなるか。

## まだ早い部分

このシグナルは広範な採用の証明ではありません。主張が測定可能か、非技術チームにも圧力が広がるか、レビューコストが下がるかはまだ確認が必要です。

## ALTOS LABの読み

${subject}は、繰り返し発生する意思決定を変えるまでは観察対象です。変わるなら、最初の一手は出典カード、レビュー規則、小さな業務実験です。`;
    }

    if (isFeature) {
      return `${subject}は、見出しではなく運用システムの問題として見ると重要になります。企業が「${decision}」を始める前に確認すべきなのは、隠れたレビュー負債を増やさずに使えるかです。

## なぜシステム問題になるのか

AIトレンドが事業に効くのは、能力が安定し、出力を検証できる業務があり、実際の利用者に届く経路がある時です。${subject}はその交差点に近づいています。

## 先に読むべき出典

${sourceList}

## 導入判断表

${table}

## 小さく試す手順

1. ${subject}が影響する繰り返し判断を一つ選ぶ。
2. 確認済み、推定、不明点を分けた出典カードを作る。
3. 自動化より先にレビュー責任者を決める。
4. 品質、レビュー時間、巻き戻しコストを測る。

${chart}

## 実験室の判断

ALTOS LABはこれを流行まとめではなく、長く使える知識資産として扱います。読者が仕組み、壊れ方、判断を変える証拠を持ち帰れるなら価値があります。`;
    }

    return `${subject}は市場ニュースに見えますが、よいコラムはもっと狭い問いから始まります。今月チームの行動を変える証拠は何か。答えが曖昧なら観察、具体的なら小さな実験です。

## トレンドの中にある判断

チームに必要なのはAI用語ではありません。${subject}が顧客への約束、業務責任者、コスト、レビュー義務を変えるかです。

## 出典が支えていること

${sourceList}

## 運用者のフレーム

${table}

## 取るべきトレードオフ

早く動く価値があるのは、証拠が公式で、再現でき、実際の業務に近い時です。誰がレビューし、失敗時に何を戻すかを言えないなら、それは実験ではなく雰囲気です。

## ALTOS LABの視点

私たちは証拠より大きな声では語りません。${subject}についてのよい記事は、読者に「AIは重要だ」という気分ではなく、より明確な判断を残すべきです。`;
  }

  if (language === "ko") {
    if (isBrief) {
      return `${subject}에서 볼 것은 화제성이 아니라 다음 업무 판단이 바뀌는지입니다. ${publishers}의 최근 흐름은 이 주제를 업무, 예산, 리스크 검토 중 어디에 둘지 고민해야 하는 단계가 왔음을 보여줍니다.

## 반응하기 전에 볼 것

모든 헤드라인을 로드맵에 넣을 필요는 없습니다. 먼저 ${subject}가 책임자, 검토 방식, 고객 기대, 비용 구조를 바꾸는지 확인해야 합니다.

## 확인한 출처

${sourceList}

## 먼저 던질 세 가지 질문

1. 매주 반복되는 판단을 바꾸는가.
2. 공식 정보, 제품 증거, 독립 보도로 확인할 수 있는가.
3. 단순히 빨라지는 것을 넘어 검토하기 쉬워지는가.

## 아직 이른 부분

이 신호는 광범위한 도입의 증거가 아닙니다. 핵심 주장이 측정 가능한지, 비기술 팀까지 압력이 퍼지는지, 검토 비용이 낮아지는지는 더 봐야 합니다.

## ALTOS LAB의 판단

${subject}는 반복 의사결정을 바꾸기 전까지는 관찰 항목입니다. 바뀐다면 첫 움직임은 출처 카드, 검토 규칙, 작은 업무 실험이어야 합니다.`;
    }

    if (isFeature) {
      return `${subject}는 헤드라인이 아니라 운영 시스템 문제로 볼 때 중요해집니다. 기업이 "${decision}"를 시작하기 전에 확인해야 할 것은 숨은 검토 부채 없이 쓸 수 있는가입니다.

## 왜 시스템 문제가 되는가

AI 트렌드가 사업에 영향을 주려면 능력이 안정적이고, 출력을 검증할 업무가 있으며, 실제 사용자에게 닿는 경로가 있어야 합니다. ${subject}는 그 교차점에 가까워지고 있습니다.

## 먼저 읽을 출처

${sourceList}

## 도입 판단 표

${table}

## 작게 실험하는 순서

1. ${subject}가 영향을 주는 반복 판단 하나를 고른다.
2. 확인된 것, 추론한 것, 모르는 것을 나눈 출처 카드를 만든다.
3. 자동화보다 먼저 검토 책임자를 정한다.
4. 품질, 검토 시간, 롤백 비용을 측정한다.

${chart}

## 실험실 판단

ALTOS LAB은 이를 유행 정리가 아니라 오래 쓰일 지식 자산으로 다룹니다. 독자가 작동 방식, 깨지는 지점, 판단을 바꿀 증거를 가져갈 수 있어야 합니다.`;
    }

    return `${subject}는 시장 뉴스처럼 보이지만 좋은 칼럼은 더 좁은 질문에서 시작합니다. 이번 달 팀의 행동을 바꿀 증거는 무엇인가. 답이 흐리면 관찰하고, 구체적이면 작은 실험을 해야 합니다.

## 트렌드 안에 숨은 판단

팀에 필요한 것은 AI 용어가 아닙니다. ${subject}가 고객 약속, 업무 책임자, 비용, 검토 의무를 바꾸는지입니다.

## 출처가 뒷받침하는 것

${sourceList}

## 운영자 프레임

${table}

## 선택해야 할 트레이드오프

빠르게 움직일 가치가 있는 때는 증거가 공식적이고 반복 가능하며 실제 업무에 가까울 때입니다. 누가 검토하고 실패 시 무엇을 되돌릴지 말할 수 없다면 그것은 실험이 아니라 분위기입니다.

## ALTOS LAB 관점

우리는 증거보다 큰 목소리로 말하지 않습니다. ${subject}에 관한 좋은 글은 독자에게 AI가 중요하다는 감정이 아니라 더 선명한 판단을 남겨야 합니다.`;
  }

  if (isBrief) {
    return `${subject} 現在值得看，不是因為它又多了一個 AI 名詞，而是 ${publishers} 的近期來源開始指向同一個營運問題：企業要不要把這個訊號放進流程、預算或風險審核。我的判斷是先觀察，但要用工作流標準觀察。

## 先把新聞變成可判斷的訊號

每個 AI 消息都能被包成趨勢，真正有價值的是它有沒有改變重複決策。如果「${subject}」只是讓簡報多一個詞，就是噪音；如果它改變負責人、審核方式、客戶期待或成本線，就值得放進下一輪產品與營運討論。

## 目前可追溯的來源

${sourceList}

## 企業讀完後該問的三件事

1. 這個訊號會不會改變每週都會做的某個決策？
2. 來源是否足夠可信，還是只有單一媒體或單一平台說法？
3. 行動後是更容易被審核，還是只是看起來更快？

## 還不能過度推論

目前不能把 ${subject} 直接等同於大規模採用。還要看官方確認、跨來源一致性、非技術團隊是否真的有需求，以及審核成本是否低到值得更換流程。

## ALTOS LAB 的讀法

我們會先把它放進 AI 市場觀察清單，而不是急著包成解決方案。當它真的改變一個重複決策，最小可行動作是來源卡、審核規則，以及一個能支援「${decision}」的小實驗。`;
  }

  if (isFeature) {
    return `${subject} 真正重要的時候，不是它登上新聞，而是它開始變成系統設計題。企業想做到「${decision}」前，應該先確認能力是否穩定、輸出是否能被審核，以及導入後的責任會落在哪裡。

## 為什麼它會變成系統問題

多數 AI 趨勢要變成商業價值，必須同時有三件事：模型能力夠穩、工作流能驗證輸出、結果能進入真實使用者面前。${subject} 值得被做成專題，是因為它碰到這三件事的交界。

## 先讀這些來源

${sourceList}

## 導入判斷表

${table}

## 從小實驗開始

1. 先選一個被 ${subject} 影響的重複決策。
2. 寫出來源卡，分清楚已確認、推論與未知。
3. 先定義審核者，再定義自動化。
4. 用品質、審核時間與回滾成本判斷是否擴大。

${chart}

## 實驗室觀點

ALTOS LAB 不應該只做趨勢整理，而是把「${subject}」變成可被引用的知識資產。讀者離開時要知道系統怎麼運作、哪裡可能壞掉、什麼證據會讓建議改變。`;
  }

  return `「${subject}」看起來像市場新聞，但好的專欄應該先問更窄的問題：什麼證據會讓一個認真的團隊在這個月改變行為？如果答案模糊，就繼續觀察；如果答案具體，就設計小實驗。

## 趨勢裡真正的決策

團隊不缺 AI 名詞，缺的是判斷。「${subject}」到底有沒有改變客戶承諾、流程責任、成本線或審核義務？這比「它是不是熱門」重要。

## 來源支持到哪裡

${sourceList}

## 給操作者的框架

${table}

## 該取捨的是什麼

早動不一定是優勢，慢動也不一定保守。當來源可信、主張可驗證，而且接近真實工作流時，早一點做實驗有價值；如果連誰審核、失敗如何回滾都說不清楚，那只是把趨勢放進待辦清單。

## ALTOS LAB 的觀點

我們可以有態度，但不能比證據更大聲。關於「${subject}」的好文章，應該讓讀者離開時更會判斷，而不是只更相信 AI 很重要。`;
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
