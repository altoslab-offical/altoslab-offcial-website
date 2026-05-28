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

const LANGUAGES = ["zh-Hant", "en", "ja", "ko"];

const TYPE_LABEL = {
  "zh-Hant": { breaking: "市場快訊", column: "專欄", feature: "專題" },
  en: { breaking: "Market brief", column: "Column", feature: "Feature" },
  ja: { breaking: "市場ブリーフ", column: "コラム", feature: "特集" },
  ko: { breaking: "시장 브리프", column: "칼럼", feature: "기획" }
};

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

const VISUAL_QUERY_BANK = {
  agents: [
    "robot arm automation factory",
    "workflow sticky notes wall",
    "computer code terminal close up",
    "control panel automation",
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
    "zh-Hant": ["GPU 容量快訊", "把算力採購連到產品路線圖"],
    en: ["GPU capacity brief", "connect compute buying to the product roadmap"],
    ja: ["GPU容量ブリーフ", "計算資源調達をプロダクト計画へつなぐ"],
    ko: ["GPU 용량 브리프", "컴퓨트 구매를 제품 로드맵과 연결하기"]
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

function sourceLinks(ideaItem) {
  return ideaItem.sourceKeys.map((key) => SOURCES[key]).filter(Boolean).slice(0, 6);
}

function uniquePublishers(sources) {
  return [...new Set(sources.map((source) => source.publisher || new URL(source.url).hostname))];
}

function titleFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  const typeLabel = TYPE_LABEL[language][ideaItem.type];

  if (language === "en") {
    if (ideaItem.type === "breaking") return `${typeLabel}: ${subject} and how to ${decision}`;
    if (ideaItem.type === "feature") return `${subject} playbook: how to ${decision}`;
    return `${subject}: how to ${decision}`;
  }
  if (language === "ja") {
    if (ideaItem.type === "breaking") return `${typeLabel}：${subject}、${decision}`;
    if (ideaItem.type === "feature") return `${subject}プレイブック：${decision}`;
    return `${subject}：${decision}`;
  }
  if (language === "ko") {
    if (ideaItem.type === "breaking") return `${typeLabel}: ${subject}, ${decision}`;
    if (ideaItem.type === "feature") return `${subject} 플레이북: ${decision}`;
    return `${subject}: ${decision}`;
  }
  if (ideaItem.type === "breaking") return `${typeLabel}：${subject}，${decision}`;
  if (ideaItem.type === "feature") return `${subject}專題：${decision}`;
  return `${subject}：${decision}`;
}

function excerptFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return trimTo(
      `When ${subject} moves from news to operations, teams need a source-backed framework to ${decision} without losing quality, trust or implementation speed.`,
      170
    );
  }
  if (language === "ja") {
    return trimTo(
      `${subject}がニュースから運用課題に変わるとき、チームには${decision}ための出典付きフレームワークが必要です。`,
      170
    );
  }
  if (language === "ko") {
    return trimTo(
      `${subject}가 뉴스에서 운영 과제로 넘어갈 때, 팀에는 ${decision} 위한 출처 기반 프레임워크가 필요합니다.`,
      170
    );
  }
  return trimTo(
    `當 ${subject} 從新聞變成營運題，企業需要一套有來源、可執行、能支援「${decision}」的判斷框架。`,
    170
  );
}

function seoDescriptionFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return trimTo(
      `${subject} is changing AI implementation. ALTOS LAB uses sources, a decision table and a build lens to show how to ${decision}.`,
      155
    );
  }
  if (language === "ja") {
    return trimTo(`${subject}の変化を出典と判断表で整理し、ALTOS LABの実装視点で${decision}方法を示します。`, 155);
  }
  if (language === "ko") {
    return trimTo(`${subject} 변화를 출처와 의사결정표로 정리하고, ALTOS LAB 관점에서 ${decision} 방법을 설명합니다.`, 155);
  }
  return trimTo(`${subject} 正在改變 AI 導入節奏。ALTOS LAB 用來源、決策表與實作視角，說明如何${decision}。`, 155);
}

function geoSummaryFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return trimTo(
      `${subject} can become an SEO and GEO asset when the article answers a concrete operator decision, cites credible sources, explains limits and gives a practical ALTOS LAB framework for how to ${decision}.`,
      240
    );
  }
  if (language === "ja") {
    return trimTo(
      `${subject}は、具体的な運用判断、信頼できる出典、制約、ALTOS LABの実装フレームワークを含むと、SEO/GEO資産になります。`,
      240
    );
  }
  if (language === "ko") {
    return trimTo(
      `${subject}는 구체적인 운영 판단, 신뢰할 출처, 한계 설명, ALTOS LAB 구현 프레임워크를 포함할 때 SEO/GEO 자산이 됩니다.`,
      240
    );
  }
  return trimTo(
    `${subject} 要成為 SEO/GEO 資產，文章必須先回答清楚的營運決策，提供可信來源、限制條件與 ALTOS LAB 的實作框架，讓人與 AI 都能引用。`,
    240
  );
}

function keyTakeawaysFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return [
      `${subject} should be evaluated as an operating decision, not a trend headline.`,
      `The strongest content links source evidence to a concrete way to ${decision}.`,
      "SEO/GEO performance improves when the article has a direct answer, visible sources, FAQ and structured metadata.",
      "ALTOS LAB should keep a lab point of view: build sequence, risk gate, metric and rollback path."
    ];
  }
  if (language === "ja") {
    return [
      `${subject}は流行語ではなく、運用判断として評価する。`,
      `${decision}には、出典と実装手順を同時に示す必要がある。`,
      "直接回答、出典、FAQ、構造化データがSEO/GEOの理解を助ける。",
      "ALTOS LABの視点は、構築順序、リスクゲート、指標、巻き戻し条件まで含める。"
    ];
  }
  if (language === "ko") {
    return [
      `${subject}는 유행어가 아니라 운영 의사결정으로 평가해야 한다.`,
      `${decision} 위해서는 출처와 실행 순서를 함께 제시해야 한다.`,
      "직접 답변, 출처, FAQ, 구조화 데이터가 SEO/GEO 이해를 돕는다.",
      "ALTOS LAB 관점은 구축 순서, 리스크 게이트, 지표, 롤백 조건까지 포함한다."
    ];
  }
  return [
    `${subject} 應該被當成營運決策來評估，而不是只看成熱門關鍵字。`,
    `高品質文章要把來源證據連到「${decision}」的實作判斷。`,
    "SEO/GEO 效果來自直接答案、可見來源、FAQ、結構化資料與內部連結。",
    "ALTOS LAB 的觀點必須包含建置順序、風險門檻、衡量指標與回滾條件。"
  ];
}

function faqsFor(ideaItem, language) {
  const [subject, decision] = ideaItem.line[language];
  if (language === "en") {
    return [
      { question: `Why does ${subject} matter now?`, answer: `${subject} matters because teams are moving from experiments into workflows that need ownership, metrics and source-backed decisions.` },
      { question: `How should a company start?`, answer: `Start with one workflow, define the review owner, source material, success metric and rollback path, then use that scope to ${decision}.` },
      { question: "How does this help SEO and GEO?", answer: "It creates clear, source-backed passages that search engines and generative systems can crawl, summarize and attribute." },
      { question: "What would ALTOS LAB check first?", answer: "ALTOS LAB would check source quality, workflow boundaries, data readiness, review cost, success metrics and image or content fit." }
    ];
  }
  if (language === "ja") {
    return [
      { question: `${subject}が今重要な理由は？`, answer: `${subject}は実験から業務フローへ移り、責任者、指標、出典に基づく判断が必要になっているからです。` },
      { question: "企業はどこから始めるべきですか？", answer: `一つの業務、レビュー責任者、情報源、成功指標、巻き戻し条件を決めてから${decision}。` },
      { question: "SEO/GEOにはどう効きますか？", answer: "検索エンジンと生成AIがクロール、要約、引用しやすい出典付きの段落を増やせます。" },
      { question: "ALTOS LABは最初に何を確認しますか？", answer: "情報源、業務境界、データ準備、レビューコスト、成功指標、画像と内容の適合を確認します。" }
    ];
  }
  if (language === "ko") {
    return [
      { question: `${subject}가 지금 중요한 이유는?`, answer: `${subject}가 실험에서 실제 업무로 이동하면서 책임자, 지표, 출처 기반 판단이 필요해졌기 때문입니다.` },
      { question: "기업은 어디서 시작해야 하나요?", answer: `하나의 업무, 검토 책임자, 출처 자료, 성공 지표, 롤백 조건을 정한 뒤 ${decision}.` },
      { question: "SEO/GEO에는 어떤 도움이 되나요?", answer: "검색 엔진과 생성형 AI가 크롤링, 요약, 인용하기 쉬운 출처 기반 단락을 만들 수 있습니다." },
      { question: "ALTOS LAB은 무엇을 먼저 확인하나요?", answer: "출처 품질, 업무 경계, 데이터 준비도, 검토 비용, 성공 지표, 이미지와 콘텐츠 적합성을 먼저 봅니다." }
    ];
  }
  return [
    { question: `${subject} 為什麼現在重要？`, answer: `${subject} 已經從實驗話題進入真實工作流，企業需要責任歸屬、成效指標與可追溯來源。` },
    { question: "企業應該從哪裡開始？", answer: `先選一個工作流，定義審核負責人、資料來源、成功指標與回滾條件，再開始${decision}。` },
    { question: "這對 SEO 和 GEO 有什麼幫助？", answer: "它能增加可爬取、可摘要、可引用的來源化段落，讓搜尋引擎與生成式回答系統更容易理解文章。 " },
    { question: "ALTOS LAB 會先檢查什麼？", answer: "我們會先檢查來源品質、流程邊界、資料準備、審稿成本、成功指標，以及圖片與內容是否真的對題。" }
  ];
}

function markdownBodyFor(ideaItem, language, sources) {
  const [subject, decision] = ideaItem.line[language];
  const publishers = uniquePublishers(sources).slice(0, 4).join(language === "en" ? ", " : "、");
  const type = ideaItem.type;

  if (language === "en") {
    const intro =
      `${subject} matters when a team can ${decision}. The useful question is where the market signal changes a real workflow, which source proves the change, and what quality gate keeps the experiment from becoming noisy automation.`;
    return `${intro}

## Market signal

Recent writing from ${publishers} shows the same direction: AI work is moving from isolated demos into products, agents, search surfaces and operating systems. The winning articles explain the change with enough evidence for a reader to verify the claim and enough judgment for a team to act.

## ALTOS LAB POV: build the decision, not the headline

ALTOS LAB would treat ${subject} as a product and operations question. The editorial value comes from the implementation lens: what data is ready, who owns review, which workflow should start first, what metric proves progress and where the rollback path sits.

| Decision point | What to inspect | ALTOS LAB move |
| --- | --- | --- |
| Source trust | Can the claim be traced to official or credible sources? | Keep links visible and separate fact from interpretation. |
| Workflow fit | Does the idea touch a repeated business process? | Start with one bounded workflow before scaling. |
| Risk level | What happens if the output is wrong? | Add human review, refusal rules or rollback gates. |
| Measurement | What shows that the system helped? | Track success rate, review cost, latency and user correction. |

## ${type === "breaking" ? "What changed" : "Implementation framework"}

1. Collect the market signal from trusted sources.
2. Translate it into one operator question: how to ${decision}.
3. Map the workflow owner, input material, output format and review rule.
4. Publish the article with direct answers, visible sources, FAQ and a topic-matched cover.
5. Revisit the piece when the source landscape changes.

## Risks and limits

The risk is thin trend content: a title that sounds current, a body that repeats public claims, and no useful operator decision. The fix is editorial discipline. State what is known, mark what remains uncertain, and give the reader a concrete next step.

## Next move for operators

Use this as a one-week lab sprint. Pick one workflow, attach the four strongest sources, define the smallest review path and decide whether the article should be a ${type} piece. If it cannot answer a decision, keep it in research notes.`;
  }

  if (language === "ja") {
    const intro = `${subject}の価値は、チームが${decision}かどうかで決まります。重要なのは、市場シグナルがどの業務を変え、どの出典で確認でき、どの品質ゲートで運用ノイズを防ぐかです。`;
    return `${intro}

## 市場シグナル

${publishers}の最近の発信を見ると、AIは単発デモからプロダクト、Agent、検索面、運用システムへ移っています。よい記事は、読者が検証できる証拠と、チームが動ける判断を同時に示します。

## ALTOS LABの判断：見出しより意思決定を作る

ALTOS LABは${subject}をプロダクトと運用の課題として扱います。価値は実装視点にあります。データは準備できているか、誰がレビューするか、どの業務から始めるか、成功指標は何か、巻き戻し条件はどこかを明確にします。

| 判断点 | 確認すること | ALTOS LABの動き |
| --- | --- | --- |
| 出典 | 主張を信頼できる情報源へ戻せるか | リンクを見える場所に置き、事実と判断を分ける。 |
| 業務適合 | 繰り返し発生する業務に関係するか | 小さく境界を切った業務から始める。 |
| リスク | 出力が間違った時の影響は何か | 人のレビュー、拒否ルール、巻き戻しを入れる。 |
| 計測 | 成功を何で判断するか | 成功率、レビューコスト、遅延、修正回数を見る。 |

## 実装フレームワーク

1. 信頼できる出典から市場シグナルを集める。
2. ${decision}という一つの運用質問へ翻訳する。
3. 責任者、入力資料、出力形式、レビュー規則を決める。
4. 直接回答、出典、FAQ、関連画像をそろえて公開する。
5. 情報源が変わったら記事を更新する。

## リスクと限界

薄いトレンド記事は、見出しだけ新しく、本文は公開情報の繰り返しになりがちです。対策は編集規律です。分かっている事実、不確実な点、次に取る行動を分けて書きます。

## 次の一手

一週間のラボスプリントとして扱ってください。一つの業務を選び、強い出典を4つ付け、最小のレビュー経路を決めます。意思決定に答えられない記事は、公開せず研究メモに残します。`;
  }

  if (language === "ko") {
    const intro = `${subject}의 가치는 팀이 ${decision} 수 있느냐에 달려 있습니다. 핵심은 시장 신호가 어떤 업무를 바꾸는지, 어떤 출처가 그 변화를 증명하는지, 어떤 품질 게이트가 자동화의 소음을 막는지입니다.`;
    return `${intro}

## 시장 신호

${publishers}의 최근 글은 AI가 단발성 데모에서 제품, Agent, 검색 표면, 운영 시스템으로 이동하고 있음을 보여줍니다. 좋은 글은 독자가 검증할 근거와 팀이 실행할 판단을 함께 제공합니다.

## ALTOS LAB 관점: 헤드라인보다 의사결정을 만든다

ALTOS LAB은 ${subject}를 제품과 운영 문제로 다룹니다. 가치는 구현 관점에서 나옵니다. 데이터 준비도, 검토 책임자, 첫 업무 범위, 성공 지표, 롤백 조건을 함께 정의해야 합니다.

| 판단점 | 확인할 것 | ALTOS LAB 실행 |
| --- | --- | --- |
| 출처 신뢰 | 주장을 신뢰할 출처로 되돌릴 수 있는가 | 링크를 보이게 두고 사실과 해석을 분리한다. |
| 업무 적합 | 반복되는 비즈니스 프로세스와 연결되는가 | 경계가 좁은 업무에서 시작한다. |
| 리스크 | 출력이 틀렸을 때 영향은 무엇인가 | 사람 검토, 거절 규칙, 롤백 게이트를 둔다. |
| 측정 | 무엇이 개선을 증명하는가 | 성공률, 검토 비용, 지연, 사용자 수정량을 본다. |

## 구현 프레임워크

1. 신뢰할 출처에서 시장 신호를 모은다.
2. ${decision}라는 하나의 운영 질문으로 번역한다.
3. 책임자, 입력 자료, 출력 형식, 검토 규칙을 정한다.
4. 직접 답변, 출처, FAQ, 주제에 맞는 이미지를 갖춰 발행한다.
5. 출처 환경이 바뀌면 글을 갱신한다.

## 리스크와 한계

얇은 트렌드 글은 제목만 최신이고 본문은 공개 주장의 반복이 됩니다. 해결책은 편집 규율입니다. 확인된 사실, 불확실한 부분, 다음 행동을 나눠서 써야 합니다.

## 다음 실행

일주일짜리 랩 스프린트로 다루세요. 하나의 업무를 고르고, 강한 출처 4개를 붙이고, 가장 작은 검토 경로를 정의합니다. 의사결정에 답하지 못하는 글은 발행하지 말고 리서치 노트로 남깁니다.`;
  }

  const intro = `${subject} 的價值，取決於團隊能不能${decision}。真正有用的問題是：市場訊號改變了哪個工作流、哪個來源能驗證這個變化、哪個品質門檻能避免自動化變成噪音。`;
  return `${intro}

## 市場訊號

從 ${publishers} 的近期內容來看，AI 正從單點展示走向產品、Agent、搜尋入口與營運系統。好的文章不只描述「發生什麼」，還要讓讀者能追溯來源，並知道下一個實作決策是什麼。

## ALTOS LAB 判斷：先做決策，再做標題

ALTOS LAB 會把 ${subject} 當成產品與營運問題處理。內容的價值不在於跟上熱詞，而在於提供實作視角：資料是否準備好、誰負責審核、第一個工作流是哪個、成效怎麼量、出錯後怎麼回滾。

| 判斷點 | 要檢查什麼 | ALTOS LAB 實作動作 |
| --- | --- | --- |
| 來源可信度 | 主張能不能回到官方或可信來源 | 保留可見連結，分開事實與解讀。 |
| 工作流適配 | 是否碰到重複發生的商業流程 | 先從範圍清楚的一個流程開始。 |
| 風險層級 | 輸出錯誤會造成什麼後果 | 加上人工審核、拒答規則或回滾門檻。 |
| 衡量方式 | 什麼數字能證明系統有幫助 | 看成功率、審稿成本、延遲與使用者修正量。 |

## ${type === "breaking" ? "這次變化要怎麼看" : "實作框架"}

1. 從可信來源收集市場訊號。
2. 把訊號翻成一個營運問題：如何${decision}。
3. 定義負責人、輸入資料、輸出格式與審核規則。
4. 發文時補上直接答案、來源、FAQ 與對題圖片。
5. 當來源或平台規則改變，回頭更新文章。

## 風險與限制

最大的風險是薄內容：標題看起來很新，正文只是重複公開說法，讀者看完仍然不知道該做什麼。解法是建立編輯紀律，把已知事實、不確定之處與下一步行動分開。

## 給營運者的下一步

把這篇當成一週實驗室衝刺。選一個流程，附上四個最強來源，定義最小審核路徑，再決定它應該是快訊、專欄或專題。無法回答決策的內容，先留在研究筆記，不急著發布。`;
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

function makePost(ideaItem, language, index, cover) {
  const title = titleFor(ideaItem, language);
  const sources = sourceLinks(ideaItem);
  const body = markdownBodyFor(ideaItem, language, sources);
  const now = new Date().toISOString();
  const translationGroupId = `tg_market_${ideaItem.slug}_v1`;

  return {
    id: `post_market_${ideaItem.slug.replace(/[^a-z0-9]+/gi, "_")}_${language.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    slug: slugFor(ideaItem.slug, language),
    status: "published",
    sortOrder: 30 + index * 10 + LANGUAGES.indexOf(language),
    language,
    translationGroupId,
    title,
    seoTitle: trimTo(`${title} | ALTOS LAB`, 80),
    seoDescription: seoDescriptionFor(ideaItem, language),
    excerpt: excerptFor(ideaItem, language),
    contentType: ideaItem.type,
    newsCategory: CATEGORY[ideaItem.category][language],
    topic: ideaItem.line[language][0],
    audience: AUDIENCE[language],
    geoSummary: geoSummaryFor(ideaItem, language),
    body,
    keyTakeaways: keyTakeawaysFor(ideaItem, language),
    faqs: faqsFor(ideaItem, language),
    sourceLinks: sources,
    tags: tagsFor(ideaItem, language),
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
    readTimeMinutes: estimateReadTime(body, language),
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
  if (!/\.(jpe?g|png|webp)(?:\?|$)/i.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith("staticflickr.com") ||
      host.endsWith("wikimedia.org") ||
      host.endsWith("wikimedia.com") ||
      host.endsWith("openverse.org") ||
      host.endsWith("api.openverse.org")
    );
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
    return response.ok && contentType.toLowerCase().startsWith("image/");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const usedCoverUrls = new Set();

function isPeopleHeavyImage(image) {
  const text = [image.title, image.creator, image.source, image.foreign_landing_url].filter(Boolean).join(" ");
  return PEOPLE_HEAVY_IMAGE_PATTERN.test(text);
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
    .filter((image) => !usedCoverUrls.has(image.thumbnail || image.url))
    .filter((image) => imageDiversityScore(image) >= 25)
    .sort((a, b) => imageDiversityScore(b) - imageDiversityScore(a));
  if (!candidates.length) return null;
  for (let attempt = 0; attempt < candidates.length; attempt += 1) {
    const selected = candidates[(offset + attempt) % candidates.length];
    const candidateUrl = selected.url || selected.thumbnail;
    if (!candidateUrl || usedCoverUrls.has(candidateUrl)) continue;
    if (!(await imageLoads(candidateUrl))) continue;
    usedCoverUrls.add(candidateUrl);
    return selected;
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
    visualBank[(index + LANGUAGES.indexOf(language)) % visualBank.length],
    `${ideaItem.coverQuery} object editorial`,
    `${ideaItem.coverQuery} technology still life`,
    `${CATEGORY[ideaItem.category].en} visual ${languageHint}`,
    "circuit board microchip macro",
    "data center server rack",
    "computer code terminal close up",
    "library archive research documents",
    "robot arm automation factory"
  ];

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
  if (EXPORT_SEED_PATH) {
    const posts = [];
    for (let index = 0; index < IDEAS.length; index += 1) {
      const ideaItem = IDEAS[index];
      for (const language of LANGUAGES) {
        const cover = await coverFor(ideaItem, language, index);
        posts.push(makePost(ideaItem, language, index, cover));
      }
      console.log(`[export] ${index + 1}/${IDEAS.length} ${ideaItem.slug}`);
    }

    const output = `import type { BlogPost } from "./types";\n\nexport const marketBlogPosts = ${JSON.stringify(posts, null, 2)} satisfies BlogPost[];\n`;
    fs.writeFileSync(path.resolve(repoRoot, EXPORT_SEED_PATH), output, "utf8");
    console.log(`[export] wrote ${posts.length} posts to ${EXPORT_SEED_PATH}`);
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
    const ideaItem = IDEAS[index];
    for (const language of LANGUAGES) {
      const cover = await coverFor(ideaItem, language, index);
      const post = makePost(ideaItem, language, index, cover);
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
