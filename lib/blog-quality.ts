import { BLOG_LANGUAGES, defaultQualityChecks } from "./blog-utils";
import { PUBLIC_BLOG_AUTHORS, publicEditorialReviewNote } from "./blog-authors";
import { registryTrustedHostFragments } from "./blog-source-registry";
import type { BlogContentType, BlogLanguage, BlogLlmQualityEvaluation, BlogPost } from "./types";

type ReviewArea =
  | "sourceTrust"
  | "labsPointOfView"
  | "seoGeoStructure"
  | "readerEngagement"
  | "readability"
  | "imageFit"
  | "multilingualParity";

type AntiSlopDimension = "directness" | "rhythm" | "trust" | "authenticity" | "density";

type ReviewResult = {
  score: number;
  issues: string[];
  warnings: string[];
};

type PostReview = {
  language: BlogLanguage;
  slug: string;
  score: number;
  issues: string[];
  warnings: string[];
  breakdown: Record<ReviewArea, number>;
  antiSlopScore: number;
  antiSlopIssues: string[];
  antiSlopDimensions: Record<AntiSlopDimension, number>;
};

export type BlogPairQualityReview = {
  approved: boolean;
  score: number;
  threshold: number;
  contentType: BlogContentType;
  issues: string[];
  warnings: string[];
  postReviews: PostReview[];
  llmEvaluation?: BlogLlmQualityEvaluation;
  notes: string;
};

const CONTENT_TYPE_THRESHOLDS: Record<BlogContentType, number> = {
  breaking: 82,
  column: 88,
  feature: 92
};

const ANTI_SLOP_THRESHOLDS: Record<BlogContentType, number> = {
  breaking: 35,
  column: 38,
  feature: 40
};

const CONTENT_TYPE_MINIMUMS: Record<
  BlogContentType,
  { sources: number; hosts: number; faqs: number; takeaways: number; h2: number; minReadTime: number }
> = {
  breaking: { sources: 2, hosts: 1, faqs: 1, takeaways: 2, h2: 2, minReadTime: 1 },
  column: { sources: 4, hosts: 2, faqs: 2, takeaways: 3, h2: 3, minReadTime: 2 },
  feature: { sources: 4, hosts: 2, faqs: 3, takeaways: 4, h2: 4, minReadTime: 4 }
};

const EMPHASIS_MINIMUMS: Record<BlogContentType, number> = {
  breaking: 1,
  column: 2,
  feature: 3
};

const MAX_SEO_DESCRIPTION = 180;
const MIN_SEO_DESCRIPTION = 70;
const MIN_EXCERPT_LENGTH = 70;
const MAX_EXCERPT_LENGTH = 260;
const SOURCE_LINK_TIMEOUT_MS = 4500;

const allowedCoverPaths = new Set([
  "/blog-cover-zh-hant.png",
  "/blog-cover-en.png",
  "/blog-cover-ja.png",
  "/blog-cover-ko.png",
  "/geo-cover.png",
  "/project-newsletter-cover.png",
  "/orclaw-cover.png",
  "/proj4-cover.png",
  "/wonda-cover.png",
  "/project-fortune-cover.png"
]);

const defaultTrustedHostFragments = [
  "openai.com",
  "deepmind.google",
  "blog.google",
  "developers.google.com",
  "ai.google.dev",
  "anthropic.com",
  "mistral.ai",
  "deepseek.com",
  "api-docs.deepseek.com",
  "huggingface.co",
  "vercel.com",
  "linear.app",
  "notion.com",
  "stripe.com",
  "microsoft.com",
  "ibm.com",
  "newsroom.ibm.com",
  "artificialanalysis.ai",
  "cisco.com",
  "github.blog",
  "nvidia.com",
  "technologyreview.com",
  "semianalysis.com",
  "aimagazine.com",
  "theverge.com",
  "techcrunch.com"
];

const weakSubtitlePatterns = [
  /^(本文|這篇文章|本篇|這篇|本文整理|本文探討|本文介紹|本文將|本稿|この記事|この記事では|本記事|本稿では|이 글|이번 글|이 글에서는|이번 글에서는)/i,
  /^(this article|in this article|this post|learn how|we explore|we look at|we explain|discover how|a guide to)/i,
  /(值得關注|不可忽視|關鍵趨勢|重要趨勢|完整解析|深入解析|懶人包|必須知道|what you need to know|ultimate guide|deep dive|comprehensive guide)/i,
  /(is important for|matters for|helps companies|can help businesses|對企業很重要|對企業來說很重要|企業需要關注)/i
];

const subtitleEvidencePattern =
  /(OpenAI|Anthropic|Google|DeepMind|Hugging Face|IBM|Microsoft|NVIDIA|Vercel|TechCrunch|AI Magazine|Search Console|ChatGPT|Claude|Gemini|Perplexity|Codex|AI Mode|Gartner|官方|報導|來源|案例|發布|launch|released|published|case|report|source|workflow|rollback|trace|eval|審核|回滾|來源|試點|採購|導入|ワークフロー|出典|検証|롤백|출처|검토)/i;

const rawZhEnglishJargonPattern = /\b(?:production traces?|eval(?:uation)? loops?|eval-driven|trace|evals?|rollback)\b/i;

const technicalJargonPattern =
  /\b(?:production traces?|eval(?:uation)? loops?|eval-driven|agentic workflow|workflow orchestration|orchestration|retrieval|routing|observability|vector database|context window|tool calls?|RAG)\b/i;

const plainLanguageCuePattern =
  /(意思是|也就是|換成(?:企業)?語言|白話|可以理解成|翻成|先問|要回答|操作紀錄|固定測試題|測試題|人工審核|退回舊流程|回滾|what this means|in plain terms|put simply|for an operator|operation logs|test questions|human review|rollback path|つまり|言い換えると|쉽게 말해|운영 언어로)/i;

const readerTensionPattern =
  /(使用者|讀者|行銷主管|創辦人|老闆|團隊|企業|品牌|客戶|買家|operator|founder|team|buyer|customer|reader|marketing lead|executive|manager|読者|チーム|企業|고객|팀|독자|실무자).{0,120}(判斷|決策|取捨|風險|預算|排名|引用|轉換|導入|workflow|decision|tradeoff|risk|budget|rank|citation|conversion|implementation|判断|意思決定|引用|전환|판단|결정|위험|예산|인용)/i;

const readerActionPattern =
  /(本週|今天|下一步|行動清單|檢查|盤點|優先級|先做|不要做|判斷標準|scorecard|checklist|next step|priority|what to check|what to do|this week|audit|今週|次に|チェック|優先順位|이번 주|다음 단계|체크|우선순위)/i;

const quotableJudgmentPattern =
  /(可引用段落|ALTOS LAB (判斷|觀點|編輯)|實驗室判斷|編輯台觀點|thought leadership|quotable|pull quote|blockquote|引用したい判断|인용할 판단|^>\s+)/im;

const genericLeadPatterns = [
  /^(AI|人工智慧|生成式 AI|搜尋引擎|企業|品牌|現代企業|數位行銷).{0,30}(正在|已經|逐漸|快速|持續|成為|面臨)/i,
  /^(隨著|在.+時代|近年來|如今|現在|當前|近年|Today|Nowadays|As AI|In the age of)/i,
  /(不再只是|不只是|不是.*而是|not just|not only)/i
];

function configuredSiteHosts() {
  const hosts = [
    process.env.NEXT_PUBLIC_SITE_URL,
    ...(process.env.CANONICAL_REDIRECT_HOSTS || "").split(",").map((host) => `https://${host.trim()}`)
  ];

  return hosts
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value || "").hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function isApprovedGeneratedMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith("/api/blog/generated-media/")) return false;
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "http:" && process.env.BLOG_IMAGE_ALLOW_LOCAL_HTTP === "1") {
      return ["localhost", "127.0.0.1", "::1"].includes(host);
    }
    if (parsed.protocol !== "https:") return false;
    return configuredSiteHosts().includes(host) || host.endsWith(".workers.dev") || host.endsWith(".pages.dev");
  } catch {
    return false;
  }
}

function isApprovedCoverUrl(url: string) {
  if (allowedCoverPaths.has(url)) return true;
  if (isApprovedGeneratedMediaUrl(url)) return true;
  if (process.env.BLOG_IMAGE_ALLOW_LOCAL_HTTP === "1") {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return true;
    } catch {
      return false;
    }
  }
  if (!/^https:\/\//.test(url)) return false;

  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith("api.openverse.org") ||
      host.endsWith("api.openverse.engineering") ||
      host.endsWith("openverse.org") ||
      host.endsWith("openverse.engineering") ||
      host.endsWith("unsplash.com") ||
      host.endsWith("images.unsplash.com") ||
      host.endsWith("pexels.com") ||
      host.endsWith("images.pexels.com") ||
      host.endsWith("pixabay.com") ||
      host.endsWith("cdn.pixabay.com") ||
      host.endsWith("images.nasa.gov") ||
      host.endsWith("metmuseum.org") ||
      host.endsWith("staticflickr.com") ||
      host.endsWith("wikimedia.org") ||
      host.endsWith("wikimedia.com")
    );
  } catch {
    return false;
  }
}

const blockedPhrases = [
  "lorem ipsum",
  "todo",
  "undefined",
  "as an ai language model",
  "i cannot browse",
  "quickly understand the latest",
  "cuts through the hype",
  "what business leaders need to know",
  "business leaders can no longer ignore",
  "in today's fast-paced",
  "in the rapidly evolving",
  "我無法瀏覽",
  "作為一個 ai",
  "作為一個 AI",
  "人工智慧語言模型",
  "本文將",
  "本文會",
  "本文整理",
  "這篇文章將",
  "這篇文章會",
  "高階主管必須關注",
  "企業不可忽視"
];

const genericTitlePatterns = [
  /AI 平台趨勢.*搜尋能見度.*高階主管/i,
  /AI Platform Trends.*Search Visibility.*Executive Implementation Decisions/i,
  /What Business Leaders Need to Know Now/i,
  /不可忽視|必須關注|關鍵轉變|latest AI trends|business leaders need to know/i
];

const publicAiAutomationDisclosurePattern =
  /(AI[-\s]?generated|AI-assisted|AI disclosure|AI 內容揭露|AI 協助|AI 生成|AI 開示|AI 公開|AI 공개|AI の支援|AI의 도움|自動品質|automated quality|editorial automation|編輯自動化|編集自動化|편집 자동화)/i;

const unsupportedMarkdownHeadingPattern = /^#{3,6}\s+/m;

const labsSignals = [
  "ALTOS LAB",
  "implementation",
  "product studio",
  "lab",
  "實驗室",
  "導入",
  "產品化",
  "工作流",
  "Agent",
  "automation",
  "自動化",
  "決策",
  "運營",
  "運用",
  "実装",
  "運用",
  "도입",
  "운영"
];

const creativeSignals = [
  "反直覺",
  "框架",
  "取捨",
  "風險",
  "矩陣",
  "案例",
  "清單",
  "評估",
  "試點",
  "市場訊號",
  "新聞摘要",
  "發生什麼",
  "關鍵細節",
  "為什麼重要",
  "這代表什麼",
  "台灣團隊",
  "讀者該看",
  "來源卡",
  "時間線",
  "下一步",
  "待觀察",
  "現場",
  "反面提醒",
  "來源脈絡",
  "訊號圖",
  "圖表",
  "編輯台觀點",
  "編輯筆記",
  "現場筆記",
  "實驗室判斷",
  "ALTOS LAB 觀點",
  "ALTOS LAB 編輯",
  "method",
  "framework",
  "playbook",
  "scorecard",
  "checklist",
  "pilot",
  "tradeoff",
  "risk",
  "matrix",
  "case",
  "market signal",
  "timeline",
  "source card",
  "what changed",
  "why it matters",
  "what to watch",
  "operator note",
  "editorial note",
  "field note",
  "next step",
  "counterintuitive",
  "turning point",
  "source trail",
  "signal map",
  "editorial read",
  "field note",
  "Lab note",
  "Lab POV",
  "counterintuitive",
  "フレームワーク",
  "リスク",
  "判断",
  "市場シグナル",
  "編集メモ",
  "シグナルマップ",
  "チェックリスト",
  "試験導入",
  "프레임워크",
  "리스크",
  "판단",
  "시장 신호",
  "편집 노트",
  "시그널 맵",
  "체크리스트",
  "파일럿"
];

const labsPointOfViewPattern =
  /(ALTOS LAB (判斷|觀點|編輯|現場筆記|實驗室筆記|implementation note|lab note|Lab note|Lab POV|editorial|field note)|實驗室判斷|編輯台觀點|編輯筆記|現場筆記|Lab POV|Lab note|editorial read|field note|ALTOS LAB編集|ALTOS LAB の判断|ALTOS LAB 편집|ALTOS LAB 관점)/i;

const genericCoverWords =
  /(dashboard|analytics dashboard|team meeting|server room|workspace|generic|seo analytics|儀表板|會議|伺服器機房|ワークスペース|회의|서버룸)/i;

const rejectedCoverWords =
  /(dead|corpse|prisoner|concentration camp|nazi|war crime|weapon|gun|blood|accident|disaster|protest|politician|minister|government|military|army|anti-aircraft|air defense|defense computer|radarno|usdagov|john lennon|austen|desire screenshot|unabridged|dead prisoners|robot arm picks up|shixart|malaria|microscopy training|nigeria)/i;

const antiSlopRules: Array<{
  dimension: AntiSlopDimension;
  label: string;
  pattern: RegExp;
  penalty: number;
}> = [
  {
    dimension: "directness",
    label: "throat-clearing or meta opener",
    pattern:
      /\b(in this article|this article (explores|examines|will)|we will explore|let'?s dive|here'?s what|it is important to note|it'?s worth noting)\b|(?:本文(?:將|会|會)|這篇文章(?:將|會)|接下來(?:我們)?(?:將|會)|以下(?:是|將)|值得注意的是|要知道的是|この記事では|本稿では|これから|이 글에서는|이번 글에서는)/gi,
    penalty: 2
  },
  {
    dimension: "authenticity",
    label: "formulaic not-X-but-Y contrast",
    pattern:
      /\bnot (just|only)\b[\s\S]{0,90}\bbut\b|(?:不只是|不僅是|不只是單純|不是單純)[\s\S]{0,60}(?:而是|更是)|(?:単なる|ただの)[\s\S]{0,60}(?:ではなく|ではない)|(?:단순히|그저)[\s\S]{0,60}(?:아니라|넘어)/gi,
    penalty: 3
  },
  {
    dimension: "authenticity",
    label: "generic hype or business jargon",
    pattern:
      /\b(game-changing|cutting-edge|revolutionary|seamless|robust|leverage|unlock|transformative|ever-evolving|landscape|delve|showcase)\b|(?:賦能|顛覆|革新|不可忽視|至關重要|重大意義|深遠影響|快速變化|全面解析|深入探討|關鍵轉折|生态位|生態系)|(?:革新的|変革的|見逃せない|重要な意味|深掘り|包括的に解説)|(?:혁신적|변혁적|중요한 의미|간과할 수 없는|심층 분석)/gi,
    penalty: 2
  },
  {
    dimension: "directness",
    label: "passive or actorless construction",
    pattern:
      /\b(?:is|are|was|were|be|been|being)\s+\w{3,}(?:ed|en)\b|(?:被認為|被視為|被稱為|被用來|被設計|被建立|被引用)|(?:とされる|と考えられる)|(?:간주된다|여겨진다)/gi,
    penalty: 1
  },
  {
    dimension: "trust",
    label: "soft hedging",
    pattern:
      /\b(may|might|could|possibly|potentially|perhaps|arguably|seems to|appears to)\b|(?:可能|或許|也許|有機會|某種程度|初步看來)|(?:かもしれない|可能性がある|一部では)|(?:가능성이 있다|어쩌면|일부에서는)/gi,
    penalty: 1
  },
  {
    dimension: "density",
    label: "cuttable vague declarative",
    pattern:
      /\b(significant implications|important consideration|rapidly changing|increasingly important|key takeaway|important to understand)\b|(?:意義重大|值得關注|值得留意|越來越重要|帶來新的可能|產生重大影響)|(?:重要な示唆|注目すべき|大きな影響)|(?:중요한 시사점|주목할 필요|큰 영향을 미친다)/gi,
    penalty: 2
  },
  {
    dimension: "density",
    label: "meta transition filler",
    pattern:
      /\b(the rest of this essay|the rest of this article|before we begin|to understand this)\b|(?:換句話說|總而言之|簡單來說|從這個角度來看|回到問題本身)|(?:言い換えると|要するに)|(?:다시 말해|요약하면)/gi,
    penalty: 1
  }
];

function trustedHostFragments() {
  const configured = (process.env.BLOG_SOURCE_WHITELIST || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...defaultTrustedHostFragments, ...registryTrustedHostFragments(), ...configured])];
}

function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordishLength(markdown: string, language: BlogLanguage) {
  const text = plainText(markdown);
  if (language === "en") return text.split(/\s+/).filter(Boolean).length;
  if (language === "zh-Hant") return (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (language === "ja") return (text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
  return (text.match(/[\uac00-\ud7af]/g) || []).length;
}

function minimumBodyLength(contentType: BlogContentType, language: BlogLanguage) {
  if (contentType === "breaking") {
    return language === "en" ? 260 : 360;
  }
  if (contentType === "feature") {
    return language === "en" ? 900 : 1300;
  }
  return language === "en" ? 620 : 900;
}

function markdownHeadingCount(body: string) {
  return (body.match(/^##\s+/gm) || []).length;
}

function boldEmphasisItems(body: string) {
  return [...body.matchAll(/\*\*([^*\n]{1,140})\*\*/g)].map((match) => match[1]?.trim() || "").filter(Boolean);
}

const weakEmphasisPattern =
  /^(AI|Agent|AI Agent|GEO|SEO|OpenAI|Google|Google DeepMind|DeepMind|Microsoft|ChatGPT|Claude|Gemini|Codex|workflow|automation|LLM|model|模型|來源|新聞|趨勢|市場|企業|導入)$/i;

const editorialEmphasisPattern =
  /(判斷|決策|取捨|風險|提醒|下一步|先|不要|應該|必須|關鍵|問題不是|真正|反直覺|檢查|回滾|治理|邊界|watch|risk|decision|next|should|must|counterintuitive|governance|rollback|boundary|判断|リスク|次|거버넌스|위험|결정)/i;

function firstAnswerBlock(body: string) {
  return plainText(body).slice(0, 360);
}

function postHostnames(post: BlogPost) {
  return post.sourceLinks
    .map((source) => {
      try {
        return new URL(source.url).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function uniqueSourceHosts(post: BlogPost) {
  return new Set(postHostnames(post)).size;
}

function isTrustedSourceHost(host: string) {
  return trustedHostFragments().some((fragment) => host === fragment || host.endsWith(`.${fragment}`) || host.includes(fragment));
}

function clampScore(score: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(score)));
}

function reviewWeighted(max: number, issues: string[], warnings: string[], base = max): ReviewResult {
  return {
    score: clampScore(base - issues.length * 6 - warnings.length * 2, max),
    issues,
    warnings
  };
}

function countMatches(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return text.match(new RegExp(pattern.source, flags))?.length || 0;
}

function sentenceLengths(text: string) {
  return text
    .split(/[.!?。！？]\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20)
    .map((sentence) => plainText(sentence).length);
}

function repeatedRhythmWindows(lengths: number[]) {
  let repeated = 0;
  for (let index = 0; index <= lengths.length - 3; index += 1) {
    const group = lengths.slice(index, index + 3);
    if (Math.max(...group) - Math.min(...group) <= 12) repeated += 1;
  }
  return repeated;
}

function englishLyAdverbs(text: string, language: BlogLanguage) {
  if (language !== "en") return 0;
  return countMatches(text, /\b[a-z]{4,}ly\b/gi);
}

export function reviewAntiSlop(post: BlogPost): ReviewResult & {
  threshold: number;
  dimensions: Record<AntiSlopDimension, number>;
} {
  const contentType = post.contentType || "column";
  const threshold = ANTI_SLOP_THRESHOLDS[contentType];
  const text = `${post.title}\n${post.excerpt}\n${post.geoSummary}\n${post.body}`;
  const dimensions: Record<AntiSlopDimension, number> = {
    directness: 10,
    rhythm: 10,
    trust: 10,
    authenticity: 10,
    density: 10
  };
  const issues: string[] = [];
  const warnings: string[] = [];

  for (const rule of antiSlopRules) {
    const hits = countMatches(text, rule.pattern);
    if (!hits) continue;
    dimensions[rule.dimension] = Math.max(0, dimensions[rule.dimension] - Math.min(6, hits * rule.penalty));
    warnings.push(`anti-slop pattern: ${rule.label} (${hits})`);
  }

  const emDashCount = countMatches(text, /[—–]/g);
  if (emDashCount) {
    dimensions.rhythm = Math.max(0, dimensions.rhythm - Math.min(5, emDashCount * 2));
    warnings.push(`anti-slop pattern: em dash rhythm (${emDashCount})`);
  }

  const adverbs = englishLyAdverbs(text, post.language);
  if (adverbs > 5) {
    dimensions.density = Math.max(0, dimensions.density - Math.min(4, adverbs - 5));
    warnings.push(`anti-slop pattern: too many -ly adverbs (${adverbs})`);
  }

  const rhythms = repeatedRhythmWindows(sentenceLengths(post.body));
  if (rhythms > 1) {
    dimensions.rhythm = Math.max(0, dimensions.rhythm - Math.min(5, rhythms * 2));
    warnings.push("anti-slop pattern: repeated sentence rhythm");
  }

  const firstBlock = firstAnswerBlock(post.body);
  if (countMatches(firstBlock, antiSlopRules[0].pattern)) {
    dimensions.directness = Math.max(0, dimensions.directness - 2);
    issues.push("anti-slop opening must answer directly instead of announcing the article");
  }

  for (const [dimension, value] of Object.entries(dimensions) as Array<[AntiSlopDimension, number]>) {
    if (value < 6) issues.push(`anti-slop ${dimension} score ${value}/10 is below 6`);
  }

  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  if (score < threshold) {
    issues.push(`anti-slop score ${score}/50 is below ${threshold}; revise filler, formulaic structure and vague claims`);
  }

  return {
    score,
    threshold,
    dimensions,
    issues,
    warnings: warnings.slice(0, 8)
  };
}

function contentTypeFor(posts: BlogPost[]): BlogContentType {
  const contentType = posts.find((post) => post.contentType)?.contentType;
  if (contentType === "breaking" || contentType === "feature") return contentType;
  return "column";
}

export function reviewContentTypeFit(post: BlogPost): ReviewResult {
  const contentType = post.contentType || "column";
  const minimums = CONTENT_TYPE_MINIMUMS[contentType];
  const issues: string[] = [];
  const warnings: string[] = [];
  const body = plainText(post.body);
  const length = wordishLength(post.body, post.language);
  const minBody = minimumBodyLength(contentType, post.language);
  const h2Count = markdownHeadingCount(post.body);

  if (!post.contentType) issues.push("contentType is required");
  if (!post.newsCategory?.trim()) issues.push("newsCategory is required");
  if (post.readTimeMinutes < minimums.minReadTime) issues.push(`${contentType} read time is too short`);
  if (length < minBody) issues.push(`${contentType} body is too short for ${post.language}`);
  if (h2Count < minimums.h2) issues.push(`${contentType} needs at least ${minimums.h2} H2 sections`);
  if (post.keyTakeaways.length < minimums.takeaways) issues.push(`${contentType} needs at least ${minimums.takeaways} takeaways`);
  if (post.faqs.length < minimums.faqs) issues.push(`${contentType} needs at least ${minimums.faqs} visible FAQs`);

  if (contentType === "breaking") {
    if (body.length > 3600) warnings.push("breaking article may be too long for a fast news format");
  } else if (contentType === "column") {
    const hasTable = /\|.+\|/.test(post.body);
    const hasNumberedFramework = /(^|\n)\d+\.\s+\S+/.test(post.body);
    const hasCallout = /^>\s+\S+/m.test(post.body);
    const hasTimeline = /(時間線|timeline|next watchpoint|待觀察|下一步)/i.test(post.body);
    const assetCount = [hasTable, hasNumberedFramework, hasCallout, hasTimeline].filter(Boolean).length;
    if (!creativeSignals.some((signal) => body.includes(signal))) {
      issues.push("column needs a clear angle, framework, tradeoff or decision lens");
    }
    if (assetCount < 1) {
      issues.push("column needs at least one non-paragraph editorial asset: framework, checklist, callout, timeline or compact comparison");
    }
    if ((post.body.match(/^\|.+\|$/gm) || []).length > 12) {
      warnings.push("column uses too much table formatting; vary the rhythm with prose, callouts, lists or timeline sections");
    }
  } else if (contentType === "feature") {
    const hasTable = /\|.+\|/.test(post.body);
    const hasSteps = /(^|\n)(\d+\.|- )/.test(post.body);
    const hasCallout = /^>\s+\S+/m.test(post.body);
    const hasTimeline = /(時間線|timeline|next watchpoint|待觀察|下一步)/i.test(post.body);
    const hasSourceCard = /(來源卡|source card|來源摘要|source dossier|資料來源)/i.test(post.body) || post.sourceLinks.some((source) => source.summary);
    const assetCount = [hasTable, hasSteps, hasCallout, hasTimeline, hasSourceCard].filter(Boolean).length;
    if (assetCount < 3) {
      issues.push("feature needs at least three varied editorial assets: source card, timeline, callout, checklist, compact table or decision memo");
    }
    if (!hasSteps) issues.push("feature needs a step-by-step framework, reader checklist or action list");
    if ((post.body.match(/^\|.+\|$/gm) || []).length > 14) {
      warnings.push("feature uses too much table formatting; deep dives need scene, evidence, interpretation and decision rhythm");
    }
  }

  return reviewWeighted(15, issues, warnings);
}

export function reviewSourceTrust(post: BlogPost): ReviewResult {
  const contentType = post.contentType || "column";
  const minimums = CONTENT_TYPE_MINIMUMS[contentType];
  const issues: string[] = [];
  const warnings: string[] = [];
  const hosts = postHostnames(post);
  const trustedHosts = hosts.filter(isTrustedSourceHost);

  if (post.sourceLinks.length < minimums.sources) {
    issues.push(`${contentType} needs at least ${minimums.sources} source links`);
  }
  if (uniqueSourceHosts(post) < minimums.hosts) {
    issues.push(`${contentType} needs at least ${minimums.hosts} unique source domains`);
  }
  if (trustedHosts.length < Math.min(post.sourceLinks.length, minimums.sources)) {
    issues.push("sources must come from the trusted RSS/source whitelist");
  }
  if (post.sourceLinks.some((source) => !source.title?.trim())) issues.push("all source links need visible titles");
  if (post.sourceLinks.some((source) => !source.publisher?.trim())) warnings.push("some source links are missing publisher labels");
  if (contentType === "breaking") {
    const missingDossier = post.sourceLinks.filter((source) => !source.publishedAt?.trim() || !source.summary?.trim());
    if (missingDossier.length) {
      issues.push("breaking/news posts need a source dossier: every source requires publishedAt and a concise original summary");
    }
  }
  const longSourceSummaries = post.sourceLinks.filter((source) => (source.summary || "").length > 320);
  if (longSourceSummaries.length) {
    warnings.push("source summaries should be concise source notes, not copied article paragraphs");
  }

  const invalidSources = post.sourceLinks.filter((source) => {
    try {
      const url = new URL(source.url);
      return url.protocol !== "https:";
    } catch {
      return true;
    }
  });
  if (invalidSources.length) issues.push("all source links must be valid https URLs");

  return reviewWeighted(25, issues, warnings);
}

export function reviewLabsPointOfView(post: BlogPost): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const text = `${post.title}\n${post.excerpt}\n${post.geoSummary}\n${post.body}`;
  const hitCount = labsSignals.filter((signal) => text.includes(signal)).length;
  const lower = text.toLowerCase();

  if (hitCount < 4) issues.push("article does not carry enough ALTOS LAB lab/product studio perspective");
  if (!/ALTOS LAB/i.test(text)) issues.push("article should name ALTOS LAB as the publishing lab");
  if (!labsPointOfViewPattern.test(text)) warnings.push("article should make the publishing lab's editorial read visible without repeating a fixed heading");
  if (lower.includes("seo") && lower.includes("geo") && hitCount < 6) {
    warnings.push("article risks sounding like an SEO/GEO tool page instead of a broader AI lab note");
  }
  if (!/(agent|automation|workflow|product|implementation|導入|產品|流程|自動化|実装|運用|도입|자동화)/i.test(text)) {
    issues.push("article needs implementation, product, agent or workflow implications");
  }

  return reviewWeighted(20, issues, warnings);
}

export function reviewCreativity(post: BlogPost): ReviewResult {
  const text = `${post.title}\n${post.excerpt}\n${post.body}`;
  const hits = creativeSignals.filter((signal) => text.includes(signal));
  const issues: string[] = [];
  const warnings: string[] = [];

  if (hits.length < 2) issues.push("article needs a fresher angle: framework, risk lens, case breakdown or decision matrix");
  if (/最新|latest|trend|趨勢|トレンド|트렌드/i.test(post.title) && hits.length < 3) {
    issues.push("trend headline should be anchored by a specific framework, source-backed claim or creative POV");
  }
  if (genericTitlePatterns.some((pattern) => pattern.test(post.title))) {
    issues.push("title is too generic; anchor it to a specific question, framework or source-backed claim");
  }

  return reviewWeighted(10, issues, warnings);
}

export function reviewReaderEngagement(post: BlogPost): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const text = `${post.title}\n${post.excerpt}\n${post.geoSummary}\n${post.body}`;
  const lead = firstAnswerBlock(post.body);
  const paragraphs = post.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const h2Titles = [...post.body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]?.trim() || "");
  const contentType = post.contentType || "column";

  if (genericLeadPatterns.some((pattern) => pattern.test(lead))) {
    issues.push("opening hook is generic; start from a concrete reader tension, source event or operator decision");
  }
  if (!readerTensionPattern.test(`${post.excerpt}\n${lead}`) && !subtitleEvidencePattern.test(`${post.excerpt}\n${lead}`)) {
    issues.push("opening and subtitle need a reader tension, named source/event or specific decision hook");
  }
  if (!readerActionPattern.test(text)) {
    issues.push("article needs a visible reader action promise: checklist, next step, priority, audit or decision rule");
  }
  if (contentType !== "breaking" && !quotableJudgmentPattern.test(text)) {
    issues.push("column/feature needs a quotable ALTOS LAB judgment or pull-quote style paragraph");
  }
  if (!/(FAQ|常見問題|Q&A|よくある質問|자주 묻는 질문)/i.test(post.body) && post.faqs.length < 3) {
    warnings.push("reader journey is missing a visible FAQ or objection-handling section");
  }

  const genericHeadings = h2Titles.filter((title) =>
    /^(背景|Overview|Introduction|結論|Summary|趨勢|Trend|問題|Solution|解決方案|まとめ|개요|요약)$/i.test(title)
  );
  if (h2Titles.length >= 3 && genericHeadings.length >= 2) {
    warnings.push("section headings are too generic; write headings that carry tension, mechanism or decision value");
  }

  const longFlatParagraphs = paragraphs.filter((paragraph) => paragraph.length > 520 && !/[:：]|\n[-\d]/.test(paragraph));
  if (longFlatParagraphs.length > 1) {
    warnings.push("long flat paragraphs reduce completion rate; break them with subheads, bullets, tables or callouts");
  }

  const usefulStructures = [
    /\|.+\|/,
    /(^|\n)(\d+\.|- )\s+\S+/,
    /^>\s+\S+/m,
    /(清單|檢查項|框架|矩陣|scorecard|checklist|framework|matrix|優先級|priority|時間線|timeline|來源卡|source card|callout|編輯筆記|現場筆記|待觀察|next step)/i
  ].filter((pattern) => pattern.test(post.body)).length;
  if (contentType !== "breaking" && usefulStructures === 0) {
    issues.push("article needs a scannable structure that helps the reader judge faster");
  }

  return reviewWeighted(20, issues, warnings);
}

function reviewSeoGeoStructure(post: BlogPost): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const seoDescriptionLength = post.seoDescription?.trim().length || 0;
  const excerpt = post.excerpt?.trim() || "";

  if (!post.title || post.title.length < 12) issues.push("title is too short");
  if (!post.slug) issues.push("slug is missing");
  if (seoDescriptionLength < MIN_SEO_DESCRIPTION || seoDescriptionLength > MAX_SEO_DESCRIPTION) {
    issues.push("seoDescription must be 70-180 characters");
  }
  if (!excerpt || excerpt.length < MIN_EXCERPT_LENGTH) issues.push("subtitle/excerpt is too thin");
  if (excerpt.length > MAX_EXCERPT_LENGTH) warnings.push("subtitle/excerpt is too long for card and hero reading");
  if (weakSubtitlePatterns.some((pattern) => pattern.test(excerpt))) {
    issues.push("subtitle/excerpt is too generic; write a newsroom-style standfirst with tension, source/event and reader decision");
  }
  if (excerpt && !subtitleEvidencePattern.test(excerpt)) {
    issues.push("subtitle/excerpt needs a concrete source, event, operator situation or decision hook");
  }
  const normalizedTitle = post.title.toLowerCase().replace(/\s+/g, "");
  const normalizedExcerpt = excerpt.toLowerCase().replace(/\s+/g, "");
  if (normalizedTitle && normalizedExcerpt.includes(normalizedTitle.slice(0, Math.min(normalizedTitle.length, 18)))) {
    warnings.push("subtitle/excerpt appears to repeat the title instead of adding a second angle");
  }
  if (!post.geoSummary || post.geoSummary.length < 80) issues.push("geoSummary is too thin");
  if (!post.tags.length) issues.push("tags are required");
  const firstBlock = firstAnswerBlock(post.body);
  if (!firstBlock) issues.push("body needs a direct answer opening");
  if (/(本文|這篇文章|in this article|this article|we will|we'll|cuts through|この記事では|本稿では|이 글에서는|이번 글에서는)/i.test(firstBlock)) {
    issues.push("opening must answer the query directly instead of introducing the article");
  }
  if (!/(ALTOS LAB|GEO|SEO|AI|Agent|agent|automation|workflow|導入|產品|流程|自動化|実装|運用|도입|자동화)/i.test(firstBlock)) {
    issues.push("opening answer needs concrete entities, not a generic setup paragraph");
  }
  if (post.geoSummary.includes("...")) issues.push("geoSummary should not contain truncation ellipsis");
  if (post.faqs.some((faq) => !faq.question || !faq.answer)) issues.push("FAQ entries must include question and answer");
  if (!post.author?.trim()) issues.push("author is required");
  if (!PUBLIC_BLOG_AUTHORS.includes(post.author?.trim() as (typeof PUBLIC_BLOG_AUTHORS)[number])) {
    issues.push("public blog author must be Tommy or Ken");
  }
  if (publicAiAutomationDisclosurePattern.test(`${post.aiDisclosure || ""}\n${post.coverCredit || ""}`)) {
    issues.push("public metadata must use ALTOS LAB editorial responsibility wording, not AI-generation disclosure");
  }

  const lower = `${post.title}\n${post.excerpt}\n${post.geoSummary}\n${post.body}`.toLowerCase();
  const blocked = blockedPhrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
  if (blocked.length) issues.push(`blocked placeholder or AI disclaimer phrase found: ${blocked.join(", ")}`);

  return reviewWeighted(20, issues, warnings);
}

function reviewReadability(post: BlogPost): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const body = plainText(post.body);
  const paragraphs = post.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const h2Titles = [...post.body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]?.trim() || "");
  const jargonParagraphs = paragraphs.filter(
    (paragraph) => technicalJargonPattern.test(paragraph) && !plainLanguageCuePattern.test(paragraph)
  );

  if (paragraphs.length < 4) issues.push("body needs more scannable paragraphs");
  if (paragraphs.some((paragraph) => paragraph.length > 700)) warnings.push("some paragraphs are too long for mobile reading");
  if (body.length && post.excerpt && body.includes(post.excerpt) && post.excerpt.length > 180) {
    warnings.push("excerpt may be copied too directly into the article body");
  }
  if (post.language === "zh-Hant" && rawZhEnglishJargonPattern.test(post.body)) {
    issues.push("zh-Hant article must translate AI-ops jargon like trace/eval/rollback into plain Chinese on first use");
  }
  if (jargonParagraphs.length) {
    issues.push("technical jargon needs plain-language translation in the same paragraph");
  }
  if (post.body.includes("**") && !/\*\*[^*\n]{4,80}\*\*/.test(post.body)) {
    warnings.push("bold emphasis should highlight a short judgment or checklist phrase, not decorative formatting");
  }
  if (unsupportedMarkdownHeadingPattern.test(post.body)) {
    issues.push("body must not use ### or deeper Markdown headings; use site H2 sections and the FAQ fields instead");
  }
  const emphasisItems = boldEmphasisItems(post.body);
  const emphasisMinimum = EMPHASIS_MINIMUMS[post.contentType || "column"];
  if (emphasisItems.length < emphasisMinimum) {
    issues.push(`article needs at least ${emphasisMinimum} concise bold emphasis marks for scanability`);
  }
  if (emphasisItems.some((item) => item.length > 80)) {
    warnings.push("bold emphasis should mark short judgments or checklist phrases, not full sentences or paragraphs");
  }
  if (emphasisItems.some((item) => weakEmphasisPattern.test(item))) {
    warnings.push("bold/purple emphasis should not mark ordinary nouns, source names or SEO keywords");
  }
  const publisherNames = post.sourceLinks.map((source) => source.publisher?.trim()).filter(Boolean);
  if (
    emphasisItems.some((item) =>
      publisherNames.some((publisher) => publisher && item.toLowerCase() === publisher.toLowerCase())
    )
  ) {
    warnings.push("bold/purple emphasis should not be used only to highlight source or publisher names");
  }
  if (emphasisItems.length && !emphasisItems.some((item) => editorialEmphasisPattern.test(item))) {
    warnings.push("bold/purple emphasis should carry editorial judgment: decision, risk, counterintuitive insight or next action");
  }
  if (emphasisItems.length > 14) {
    warnings.push("too many bold marks makes the article feel formatted instead of edited");
  }
  if (h2Titles.length >= 3 && h2Titles.filter((title) => /^(趨勢|Trend|トレンド|트렌드)\s*[一二三四五\d]/i.test(title)).length >= 2) {
    warnings.push("headings read like a generic trend list; use question, framework or decision headings");
  }

  return reviewWeighted(15, issues, warnings);
}

export function reviewImageFit(post: BlogPost): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!post.cover || !post.coverAlt) {
    issues.push("cover image and alt text are required");
  } else {
    if (!isApprovedCoverUrl(post.cover)) issues.push("cover image must use an approved ALTOS LAB asset, managed generated media URL or open-licensed image URL");
    if (post.coverAlt.trim().length < 18) issues.push("cover alt text is too thin");
    const hasApprovedCoverSource =
      post.coverSource === "curated" || post.coverSource === "generated" || post.coverSource === "manual";
    if (post.generatedBy && !hasApprovedCoverSource) {
      issues.push("AI generated articles require a topic-matched curated, generated or human-approved manual cover before auto-publish");
    }
    if ((post.coverSource === "curated" || post.coverSource === "manual") && !post.coverCredit) {
      issues.push("curated or manually approved cover images require visible attribution metadata");
    }
    if (post.coverSource === "generated") {
      if (!post.coverCredit) issues.push("generated cover images require ALTOS LAB attribution metadata");
      if (publicAiAutomationDisclosurePattern.test(post.coverCredit || "")) {
        issues.push("generated cover public credit should say ALTOS LAB editorial visual, not AI-generated");
      }
      if (!post.coverGeneration?.prompt) issues.push("generated cover images require the stored prompt");
      if (!post.coverGeneration?.provider) issues.push("generated cover images require the generation provider");
      if (post.coverGeneration?.status && post.coverGeneration.status !== "generated") {
        issues.push("generated cover image status must be generated before auto-publish");
      }
    }
    const topicWords = `${post.topic} ${post.newsCategory} ${post.tags.join(" ")}`.toLowerCase();
    const imageContext = `${post.coverAlt} ${post.coverPrompt || ""}`.toLowerCase();
    if (rejectedCoverWords.test(imageContext)) {
      issues.push("cover image is unsafe, off-brand or visually mismatched for ALTOS LAB editorial quality");
    }
    if (!topicWords.split(/\s+|、|\/|,|，/).some((word) => word.length > 2 && imageContext.includes(word))) {
      warnings.push("cover prompt or alt text should describe the article topic more clearly");
    }
    if (genericCoverWords.test(imageContext) && !/(agent|ai|geo|search|network|引用|搜尋|知識網路|エージェント|検索|에이전트|검색)/i.test(imageContext)) {
      issues.push("cover image context is too generic for a quality SEO/GEO article");
    }
    if (post.contentType === "breaking" && post.coverSource !== "generated" && (!post.coverCreditUrl || !post.coverLicense)) {
      issues.push("news posts must not copy source article images unless license and credit URL are explicit; generated ALTOS LAB visuals are preferred");
    }
  }

  return reviewWeighted(10, issues, warnings);
}

export function reviewMultilingualParity(posts: BlogPost[]): ReviewResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const languages = new Set(posts.map((post) => post.language));
  const translationGroups = new Set(posts.map((post) => post.translationGroupId).filter(Boolean));
  const sourceSets = posts.map((post) => new Set(post.sourceLinks.map((source) => source.url)));
  const contentTypes = new Set(posts.map((post) => post.contentType || "column"));
  const categories = new Set(posts.map((post) => post.newsCategory || ""));

  if (posts.length !== BLOG_LANGUAGES.length) issues.push("auto-publish requires zh-Hant, en, ja and ko posts");
  for (const language of BLOG_LANGUAGES) {
    if (!languages.has(language)) issues.push(`missing ${language} article in multilingual group`);
  }
  if (translationGroups.size !== 1) issues.push("translationGroupId must match across the multilingual group");
  if (contentTypes.size !== 1) issues.push("contentType must match across languages");
  if (categories.size > 1) warnings.push("newsCategory differs across languages; keep taxonomy aligned");

  const titles = posts.map((post) => post.title.trim()).filter(Boolean);
  if (new Set(titles).size !== titles.length) warnings.push("some multilingual titles are identical");

  const referenceSources = sourceSets[0] || new Set<string>();
  for (const sourceSet of sourceSets.slice(1)) {
    if (sourceSet.size !== referenceSources.size || [...referenceSources].some((url) => !sourceSet.has(url))) {
      issues.push("sourceLinks must match across multilingual versions");
      break;
    }
  }

  const lengths = posts.map((post) => wordishLength(post.body, post.language)).filter(Boolean);
  const max = Math.max(...lengths, 0);
  const min = Math.min(...lengths, Number.POSITIVE_INFINITY);
  if (Number.isFinite(min) && max > 0 && min / max < 0.35) {
    warnings.push("one language version appears much thinner than the others");
  }

  return reviewWeighted(10, issues, warnings);
}

function reviewPost(post: BlogPost, multilingual: ReviewResult): PostReview {
  const contentType = reviewContentTypeFit(post);
  const sourceTrust = reviewSourceTrust(post);
  const labsPointOfView = reviewLabsPointOfView(post);
  const creativity = reviewCreativity(post);
  const seoGeoStructure = reviewSeoGeoStructure(post);
  const readerEngagement = reviewReaderEngagement(post);
  const readability = reviewReadability(post);
  const imageFit = reviewImageFit(post);
  const antiSlop = reviewAntiSlop(post);
  const breakdown: Record<ReviewArea, number> = {
    sourceTrust: Math.min(20, sourceTrust.score),
    labsPointOfView: Math.max(0, Math.min(15, labsPointOfView.score - Math.max(0, 10 - creativity.score))),
    seoGeoStructure: Math.min(15, seoGeoStructure.score),
    readerEngagement: readerEngagement.score,
    readability: Math.max(0, Math.min(15, readability.score - Math.max(0, 12 - contentType.score))),
    imageFit: imageFit.score,
    multilingualParity: Math.min(5, multilingual.score)
  };
  const issues = [
    ...contentType.issues,
    ...sourceTrust.issues,
    ...labsPointOfView.issues,
    ...creativity.issues,
    ...seoGeoStructure.issues,
    ...readerEngagement.issues,
    ...readability.issues,
    ...imageFit.issues,
    ...antiSlop.issues
  ];
  const warnings = [
    ...contentType.warnings,
    ...sourceTrust.warnings,
    ...labsPointOfView.warnings,
    ...creativity.warnings,
    ...seoGeoStructure.warnings,
    ...readerEngagement.warnings,
    ...readability.warnings,
    ...imageFit.warnings,
    ...antiSlop.warnings
  ];

  if (post.generatedBy?.includes("local-bilingual-geo-template") || post.generatedBy?.includes("local-bilingual-lab-template")) {
    issues.push("local fallback template cannot auto-publish");
  }
  if (post.generatedBy && !/gemini/i.test(post.generatedBy)) {
    issues.push("production articles must be written or revised through Gemini before release");
  }
  if (post.coverSource === "generated" && !/(chatgpt|gpt|openai)/i.test(post.coverGeneration?.provider || "")) {
    issues.push("generated production covers must be created through ChatGPT/GPT before release");
  }

  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return {
    language: post.language,
    slug: post.slug,
    score,
    issues,
    warnings,
    breakdown,
    antiSlopScore: antiSlop.score,
    antiSlopIssues: [...antiSlop.issues, ...antiSlop.warnings],
    antiSlopDimensions: antiSlop.dimensions
  };
}

async function sourceUrlStatus(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_LINK_TIMEOUT_MS);
  const headers = {
    "User-Agent": "ALTOS LAB quality reviewer; https://altoslab.com"
  };

  try {
    const head = await fetch(url, { method: "HEAD", headers, redirect: "follow", signal: controller.signal });
    if (head.status < 400) return null;
    if (head.status !== 405 && head.status !== 403) {
      return head.status === 404 || head.status === 410
        ? { issue: `${url} returned HTTP ${head.status}` }
        : { warning: `${url} returned HTTP ${head.status} during automated validation` };
    }

    const get = await fetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-1024" },
      redirect: "follow",
      signal: controller.signal
    });
    if (get.status < 400) return null;
    return get.status === 404 || get.status === 410
      ? { issue: `${url} returned HTTP ${get.status}` }
      : { warning: `${url} returned HTTP ${get.status} during automated validation` };
  } catch (error) {
    return { warning: `${url} could not be verified: ${error instanceof Error ? error.message : "request failed"}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function validateSourceReachability(posts: BlogPost[]) {
  const urls = Array.from(new Set(posts.flatMap((post) => post.sourceLinks.map((source) => source.url))));
  const results = await Promise.all(urls.map((url) => sourceUrlStatus(url)));
  return {
    issues: results.flatMap((result) => (result?.issue ? [`source link validation failed: ${result.issue}`] : [])),
    warnings: results.flatMap((result) => (result?.warning ? [`source link validation warning: ${result.warning}`] : []))
  };
}

export async function reviewBlogPairForAutoPublish(posts: BlogPost[]): Promise<BlogPairQualityReview> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const contentType = contentTypeFor(posts);
  const threshold = CONTENT_TYPE_THRESHOLDS[contentType];
  const multilingual = reviewMultilingualParity(posts);
  const postReviews = posts.map((post) => reviewPost(post, multilingual));

  issues.push(...multilingual.issues);
  warnings.push(...multilingual.warnings);

  for (const review of postReviews) {
    issues.push(...review.issues.map((issue) => `${review.language}/${review.slug}: ${issue}`));
    warnings.push(...review.warnings.map((warning) => `${review.language}/${review.slug}: ${warning}`));
  }

  const sourceValidation = await validateSourceReachability(posts);
  issues.push(...sourceValidation.issues);
  warnings.push(...sourceValidation.warnings);

  const baseScore = Math.min(...postReviews.map((review) => review.score), 100);
  const antiSlopScore = Math.min(...postReviews.map((review) => review.antiSlopScore), 50);
  const score = Math.max(0, Math.min(100, baseScore - sourceValidation.issues.length * 10 - sourceValidation.warnings.length * 1));
  const approved = issues.length === 0 && score >= threshold;
  const notes = approved
    ? `ALTOS LAB quality reviewer approved ${contentType} auto-publish. Score ${score}/${threshold}. Anti-slop ${antiSlopScore}/50.`
    : `ALTOS LAB quality reviewer held publish. Score ${score}/${threshold}. Anti-slop ${antiSlopScore}/50. Issues: ${issues.join("; ")}`;

  return { approved, score, threshold, contentType, issues, warnings, postReviews, notes };
}

export function withLlmQualityEvaluation(
  review: BlogPairQualityReview,
  llmEvaluation: BlogLlmQualityEvaluation
): BlogPairQualityReview {
  const issues = [...review.issues, ...llmEvaluation.issues.map((issue) => `LLM judge: ${issue}`)];
  const warnings = [...review.warnings, ...llmEvaluation.warnings.map((warning) => `LLM judge: ${warning}`)];
  const score = Math.min(review.score, llmEvaluation.score);
  const approved = review.approved && llmEvaluation.approved && score >= review.threshold;
  const notes = approved
    ? `${review.notes} LLM judge approved with ${llmEvaluation.score}/${llmEvaluation.threshold}.`
    : `${review.notes} LLM judge held or lowered publish with ${llmEvaluation.score}/${llmEvaluation.threshold}.`;

  return {
    ...review,
    approved,
    score,
    issues,
    warnings,
    llmEvaluation,
    notes
  };
}

export function applyQualityReview(post: BlogPost, review: BlogPairQualityReview, publish: boolean): BlogPost {
  const now = new Date().toISOString();
  const qualityIssues = [...review.issues, ...review.warnings];
  const postReview = review.postReviews.find((item) => item.slug === post.slug && item.language === post.language);

  return {
    ...post,
    status: publish ? "published" : "draft",
    reviewStatus: publish ? "approved" : "needs-revision",
    qualityStatus: review.approved ? "passed" : "held",
    releaseDecision: publish ? "published" : "held_for_review",
    qualityIssues,
    qualityChecks: defaultQualityChecks({
      ...post.qualityChecks,
      hasHumanReview: Boolean(post.qualityChecks.hasHumanReview),
      hasQualityReviewerApproval: publish,
      hasVisibleSources: post.sourceLinks.length >= CONTENT_TYPE_MINIMUMS[review.contentType].sources,
      hasNoFabricatedClaims: publish,
      hasSearchIntentAnswer: Boolean(post.geoSummary),
      hasBilingualParity: review.issues.every(
        (issue) => !issue.includes("multilingual") && !issue.includes("translationGroupId") && !issue.includes("sourceLinks must match")
      ),
      hasSourceTrust: postReview ? postReview.breakdown.sourceTrust >= 20 : publish,
      hasLabsPointOfView: postReview ? postReview.breakdown.labsPointOfView >= 15 : publish,
      hasCreativeAngle: postReview ? reviewCreativity(post).score >= 7 : publish,
      hasReaderEngagement: postReview ? postReview.breakdown.readerEngagement >= 14 : publish,
      hasImageFit: postReview ? postReview.breakdown.imageFit >= 8 : publish,
      hasAntiSlopReview: postReview ? postReview.antiSlopScore >= ANTI_SLOP_THRESHOLDS[review.contentType] : publish,
      qualityScoreBreakdown: postReview?.breakdown,
      qualityScore: review.score,
      qualityIssues,
      antiSlopScore: postReview?.antiSlopScore,
      antiSlopIssues: postReview?.antiSlopIssues,
      llmEvaluation: review.llmEvaluation,
      notes: review.notes
    }),
    aiDisclosure: publish ? publicEditorialReviewNote(post.language) : post.aiDisclosure,
    publishedAt: publish ? post.publishedAt || now : post.publishedAt,
    updatedAt: now
  };
}
