import { BLOG_LANGUAGES, blogCoverForLanguage, estimateReadTimeMinutes, normalizeSourceLinks, taiwanDate } from "./blog-utils";
import { normalizeBlogPostInput, nowIso, slugify } from "./cms";
import { generateBlogCovers } from "./blog-cover-generation";
import {
  enrichSourceLink,
  pickEditorialBrief,
  registryFeedsFromEnv,
  sourceAuthorityScore,
  sourceFreshnessScore,
  sourceRegistryEntryForUrl
} from "./blog-source-registry";
import {
  BLOG_PROMPT_VERSION,
  createDeepSeekTrace,
  deepSeekBaseUrl,
  deepSeekMaxTokens,
  deepSeekModelForTask,
  deepSeekTimeoutMs,
  stableDeepSeekSystemPrompt
} from "./deepseek-orchestration";
import type { BlogPairQualityReview } from "./blog-quality";
import type { BlogContentType, BlogGenerationSlot, BlogGenerationTrace, BlogLanguage, BlogPost, BlogSourceLink } from "./types";

export type BlogGenerateInput = {
  topic?: string;
  audience?: string;
  keyword?: string;
  intent?: string;
  sourceLinks?: BlogSourceLink[];
  slot?: BlogGenerationSlot;
  contentType?: BlogContentType;
  newsCategory?: string;
  generationDate?: string;
};

type TrendCandidate = {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  summary?: string;
  authority?: number;
  freshness?: number;
  category?: string;
};

type DeepSeekPost = Partial<BlogPost> & {
  sourceLinks?: BlogSourceLink[];
};

type DeepSeekPair = Partial<Record<BlogLanguage, DeepSeekPost>>;

type DeepSeekLanguage = BlogLanguage;

type DeepSeekChatChoice = {
  finish_reason?: "stop" | "length" | "content_filter" | "tool_calls" | "insufficient_system_resource" | string;
  message?: {
    content?: string;
    reasoning_content?: string;
  };
};

type DeepSeekChatResponse = {
  choices?: DeepSeekChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    reasoning_tokens?: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
};

const FALLBACK_SOURCES: TrendCandidate[] = [
  {
    title: "Google Search Central guidance on helpful, people-first content",
    url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    publisher: "Google Search Central"
  },
  {
    title: "Google Search Central structured data introduction",
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    publisher: "Google Search Central"
  },
  {
    title: "DeepSeek API models and pricing",
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    publisher: "DeepSeek"
  },
  {
    title: "Vercel Cron Jobs documentation",
    url: "https://vercel.com/docs/cron-jobs",
    publisher: "Vercel"
  }
];

const BLOG_COVER_POOL = [
  {
    src: "/geo-cover.png",
    keywords: ["geo", "seo", "search", "搜尋", "能見度", "內容", "google"]
  },
  {
    src: "/project-newsletter-cover.png",
    keywords: ["content", "newsletter", "行銷", "營運", "automation", "自動化"]
  },
  {
    src: "/orclaw-cover.png",
    keywords: ["agent", "agents", "ai agent", "workflow", "coding", "代理", "流程"]
  },
  {
    src: "/proj4-cover.png",
    keywords: ["data", "dashboard", "analytics", "數據", "儀表板", "平台"]
  },
  {
    src: "/wonda-cover.png",
    keywords: ["customer", "support", "conversation", "crm", "客服", "對話"]
  },
  {
    src: "/project-fortune-cover.png",
    keywords: ["strategy", "trend", "market", "趨勢", "策略", "企業"]
  }
];

function sourceListFromEnv() {
  return registryFeedsFromEnv();
}

function stripTags(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstXmlValue(item: string, tags: string[]) {
  for (const tag of tags) {
    const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function parseFeed(xml: string, sourceUrl: string): TrendCandidate[] {
  const registry = sourceRegistryEntryForUrl(sourceUrl);
  const publisher = (() => {
    try {
      return registry?.name || new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return undefined;
    }
  })();
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];

  return itemMatches.slice(0, 8).map((item) => {
    const title = firstXmlValue(item, ["title"]);
    const summary = firstXmlValue(item, ["description", "summary", "content"]);
    const publishedAt = firstXmlValue(item, ["pubDate", "updated", "published"]);
    const hrefMatch = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
    const linkText = firstXmlValue(item, ["link"]);
    return {
      title,
      summary,
      publisher,
      publishedAt,
      url: hrefMatch?.[1] || linkText,
      authority: registry?.authority,
      freshness: registry?.freshness,
      category: registry?.category
    };
  }).filter((candidate) => candidate.title && /^https?:\/\//.test(candidate.url));
}

async function fetchTextWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ALTOS LAB content research bot; https://altoslab.com" },
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) return "";
    return response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTrendCandidates(input: BlogGenerateInput = {}): Promise<TrendCandidate[]> {
  const manualSources = normalizeSourceLinks(input.sourceLinks);
  if (manualSources.length) return manualSources;

  const feeds = await Promise.all(
    sourceListFromEnv().map(async (url) => {
      const xml = await fetchTextWithTimeout(url);
      return xml ? parseFeed(xml, url) : [];
    })
  );

  const candidates: TrendCandidate[] = [];
  const maxFeedLength = Math.max(0, ...feeds.map((feed) => feed.length));
  for (let index = 0; index < maxFeedLength; index += 1) {
    for (const feed of feeds) {
      const candidate = feed[index];
      if (candidate && !candidates.some((item) => item.url === candidate.url)) {
        candidates.push(candidate);
      }
      if (candidates.length >= 12) break;
    }
    if (candidates.length >= 12) break;
  }

  const contentType = contentTypeFromInput(input);
  const ranked = rankTrendCandidates(candidates, contentType);
  return ranked.length ? ranked.slice(0, 12) : FALLBACK_SOURCES;
}

function recencyScore(publishedAt?: string) {
  if (!publishedAt) return 35;
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return 35;
  const ageHours = Math.max(0, (Date.now() - published) / 3_600_000);
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 85;
  if (ageHours <= 168) return 65;
  if (ageHours <= 720) return 45;
  return 25;
}

function rankTrendCandidates(candidates: TrendCandidate[], contentType: BlogContentType) {
  return [...candidates].sort((a, b) => {
    const aRegistry = sourceRegistryEntryForUrl(a.url);
    const bRegistry = sourceRegistryEntryForUrl(b.url);
    const aFreshness = a.freshness ?? aRegistry?.freshness ?? sourceFreshnessScore(a.url);
    const bFreshness = b.freshness ?? bRegistry?.freshness ?? sourceFreshnessScore(b.url);
    const aAuthority = a.authority ?? aRegistry?.authority ?? sourceAuthorityScore(a.url);
    const bAuthority = b.authority ?? bRegistry?.authority ?? sourceAuthorityScore(b.url);
    const aScore =
      aAuthority * 0.45 +
      aFreshness * (contentType === "breaking" ? 0.25 : 0.15) +
      recencyScore(a.publishedAt) * (contentType === "breaking" ? 0.3 : 0.15) +
      (aRegistry?.tier === "official-rss" || aRegistry?.tier === "official-docs" ? 12 : 0);
    const bScore =
      bAuthority * 0.45 +
      bFreshness * (contentType === "breaking" ? 0.25 : 0.15) +
      recencyScore(b.publishedAt) * (contentType === "breaking" ? 0.3 : 0.15) +
      (bRegistry?.tier === "official-rss" || bRegistry?.tier === "official-docs" ? 12 : 0);
    return bScore - aScore;
  });
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return extractJson(fenced[1]);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model output");
  return JSON.parse(match[0]);
}

function assertDeepSeekPair(value: DeepSeekPair) {
  for (const language of BLOG_LANGUAGES) {
    if (!value[language]?.title || !value[language]?.body) {
      throw new Error(`DeepSeek JSON did not include complete ${language} article draft`);
    }
  }
  return value;
}

function assertDeepSeekPost(value: DeepSeekPost, language: DeepSeekLanguage) {
  if (!value.title || !value.body) {
    throw new Error(`DeepSeek JSON did not include a complete ${language} article draft`);
  }
  if (!value.geoSummary) {
    const excerpt = value.excerpt?.trim();
    const firstBodyParagraph = String(value.body)
      .replace(/^#+\s+/gm, "")
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .find(Boolean);
    value.geoSummary =
      excerpt ||
      firstBodyParagraph ||
      (language === "en"
        ? "This source-backed ALTOS LAB draft summarizes an AI trend and translates it into practical SEO, GEO and implementation decisions."
        : language === "ja"
          ? "この ALTOS LAB の下書きは、AI トレンドを実務、SEO、GEO、導入判断に翻訳するためのソース付きブリーフです。"
          : language === "ko"
            ? "이 ALTOS LAB 초안은 AI 트렌드를 실무, SEO, GEO, 도입 판단으로 바꾸기 위한 출처 기반 브리프입니다."
            : "這篇 ALTOS LAB 來源化草稿整理 AI 趨勢，並轉成 SEO、GEO 與企業導入決策。");
  }
  return value;
}

function canonicalSources(candidates: TrendCandidate[]) {
  return normalizeSourceLinks(candidates.map(({ title, url, publisher, publishedAt }) => ({ title, url, publisher, publishedAt }))).map(enrichSourceLink);
}

function chooseBlogCover(input: BlogGenerateInput, language: BlogLanguage) {
  if (BLOG_LANGUAGES.includes(language)) return blogCoverForLanguage(language);

  const haystack = `${input.topic || ""} ${input.keyword || ""} ${input.intent || ""}`.toLowerCase();
  const matched = BLOG_COVER_POOL.find((cover) => cover.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())));
  if (matched) return matched.src;

  const seed = `${haystack}:${language}:${input.slot || "manual"}`;
  const index = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % BLOG_COVER_POOL.length;
  return BLOG_COVER_POOL[index].src;
}

function chooseBlogCoverAlt(input: BlogGenerateInput, language: BlogLanguage) {
  const topic = input.topic?.trim() || (language === "en" ? "AI trend analysis" : "AI 趨勢分析");
  if (language === "en") return `ALTOS LAB visual for ${topic}`;
  if (language === "ja") return `ALTOS LAB ${topic} 記事のメインビジュアル`;
  if (language === "ko") return `ALTOS LAB ${topic} 글의 대표 이미지`;
  return `ALTOS LAB ${topic} 文章主視覺`;
}

function singleLine(input = "") {
  return input.replace(/\s+/g, " ").trim();
}

function contentTypeFromInput(input: BlogGenerateInput): BlogContentType {
  const editorialBrief = input.slot && !input.contentType ? pickEditorialBrief(input.slot).contentType : undefined;
  if (editorialBrief) return editorialBrief;
  if (input.contentType === "breaking" || input.contentType === "feature") return input.contentType;
  if (input.slot === "afternoon") return "feature";
  return "column";
}

function localizedDefaultTag(language: BlogLanguage) {
  if (language === "en") return ["AI products", "AI agents", "Automation", "AI trends"];
  if (language === "ja") return ["AIプロダクト", "AIエージェント", "自動化", "AIトレンド"];
  if (language === "ko") return ["AI 제품", "AI 에이전트", "자동화", "AI 트렌드"];
  return ["AI 產品", "AI Agent", "自動化", "AI 趨勢"];
}

function localizedAudience(input: BlogGenerateInput, language: BlogLanguage) {
  if (input.audience?.trim()) return input.audience.trim();
  if (language === "en") return "founders, operators and marketing teams";
  if (language === "ja") return "AI 導入を検討する経営者、事業責任者、マーケティングチーム";
  if (language === "ko") return "AI 도입을 검토하는 경영진, 운영 리더, 마케팅 팀";
  return "企業主、營運主管與行銷負責人";
}

function localizedDisclosure(language: BlogLanguage) {
  if (language === "en") return "AI-assisted draft. ALTOS LAB quality review is required before publication.";
  if (language === "ja") return "AI の支援で作成された下書きです。公開前に ALTOS LAB の品質審査が必要です。";
  if (language === "ko") return "AI의 도움으로 작성된 초안입니다. 공개 전 ALTOS LAB 품질 검토가 필요합니다.";
  return "AI 協助產生的草稿，發布前必須經 ALTOS LAB 品質審核。";
}

function localizedNewsCategory(input: BlogGenerateInput, language: BlogLanguage) {
  if (input.newsCategory?.trim()) return input.newsCategory.trim();
  if (input.slot) return pickEditorialBrief(input.slot).newsCategory;
  if (language === "en") return "AI trends";
  if (language === "ja") return "AIトレンド";
  if (language === "ko") return "AI 트렌드";
  return "AI 趨勢";
}

function fitSeoDescription(value = "", fallback = "") {
  const text = singleLine(value);
  const backup = singleLine(fallback);
  const source = text.length >= 70 ? text : singleLine([text, backup].filter(Boolean).join(" ")) || text;
  if (source.length <= 180) return source;

  const clipped = source.slice(0, 157).replace(/\s+\S*$/, "").trim();
  return `${clipped || source.slice(0, 157).trim()}...`;
}

function fitSummaryField(value = "", fallback = "", minLength: number, maxLength: number) {
  const text = singleLine(value);
  const backup = singleLine(fallback);
  const source = text.length >= minLength ? text : singleLine([text, backup].filter(Boolean).join(" ")) || text;
  if (source.length <= maxLength) return source;

  const clipped = source
    .slice(0, maxLength)
    .replace(/[，,。.;；:：]\s*[^，,。.;；:：]*$/, "")
    .replace(/\s+\S*$/, "")
    .trim();
  return clipped || source.slice(0, maxLength).trim();
}

function buildFallbackPost({
  input,
  language,
  translationGroupId,
  sources,
  generationDate
}: {
  input: BlogGenerateInput;
  language: BlogLanguage;
  translationGroupId: string;
  sources: BlogSourceLink[];
  generationDate: string;
}) {
  const topic = input.topic?.trim() || "AI 產品、Agent 與企業自動化趨勢";
  const keyword = input.keyword?.trim() || (language === "en" ? "AI implementation lab" : "AI 實驗室與企業導入");
  const audience = localizedAudience(input, language);
  const contentType = contentTypeFromInput(input);
  const newsCategory = localizedNewsCategory(input, language);
  const title =
    language === "en"
      ? `${keyword}: turning AI trends into shippable systems`
      : `${keyword}觀察：企業如何把 AI 趨勢變成可落地系統`;
  const body =
    language === "en"
      ? `## The short answer
ALTOS LAB should publish like an AI implementation lab, not like a single SEO tool. Strong articles should translate market signals into product, workflow, agent, automation and visibility decisions that a business can act on.

## What strong AI company blogs have in common
The best AI blogs usually do three things well. First, they explain a timely shift in plain language instead of repeating a press release. Second, they connect the shift to a concrete operating decision: budget, workflow design, data readiness, customer experience, compliance or measurement. Third, they show an evidence trail through visible sources, examples and clear update dates.

That pattern also matters for SEO and GEO. Traditional search still needs crawlable text, clean metadata, internal links and structured data. Generative answer systems also look for passages that can be summarized, attributed and compared with other sources. A company article should therefore be written like a useful lab briefing, not like a keyword container.

## Start from one decision your buyer needs to make
Choose a question that matters before a prospect contacts ALTOS LAB: what product should be built first, what process should be automated, what data is needed, how risk is controlled, how a team should evaluate an AI agent, or how SEO and GEO support the go-to-market loop. A useful article should help the reader make that decision with less uncertainty.

For a practical article, the opening should answer the search intent quickly. The middle should explain context, tradeoffs and implementation sequence. The end should give the reader a next step: audit a workflow, prepare source material, define review ownership, or talk to a specialist.

## Use sources without outsourcing judgment
Source links give the article an evidence trail. The draft should still add ALTOS LAB's point of view: implementation sequence, constraints, review gates, and measurable outcomes.

Sources are not decoration. They should be used to separate stable facts from interpretation. When a model, search feature or platform policy changes, the article should say what changed, what remains uncertain and what a business should do now. This is the difference between generic AI content and content that can become a durable trust asset.

## Recommended publishing workflow
The safe workflow is: collect trend sources, generate a bilingual draft, attach an internal cover image, add a GEO answer summary, add FAQ only when the answers are visible on the page, then keep the article in review. A human reviewer should check accuracy, remove unsupported claims, add ALTOS LAB examples, confirm the Chinese and English versions carry the same meaning, and only then publish.

This cadence supports momentum without sacrificing quality. It gives the team a daily queue of usable ideas while protecting the site from thin, repetitive or unsupported AI content.

## Keep AI drafts in review
Daily AI-assisted drafts are useful for momentum, but they should stay unpublished until a human adds brand context, removes unsupported claims, confirms source links, and checks bilingual parity. The operating goal is not simply to publish more. It is to build a searchable, citable knowledge base that makes ALTOS LAB easier to understand as an AI lab, compare as an implementation partner and trust as a builder.`
      : `## 直接回答
ALTOS LAB 的內容不應該像單一 SEO 工具頁，而要像 AI 實驗室的研究出版。好的文章要把市場訊號翻成企業能採取的產品、流程、Agent、自動化與搜尋能見度決策。

## 好的 AI 公司部落格通常怎麼寫
市場上做得好的 AI 部落格，通常不是只轉貼新聞或堆熱門關鍵字，而是把一個趨勢翻成可執行的商業判斷。第一步是用白話說明發生了什麼變化。第二步是連到企業會在意的決策：預算、流程設計、資料準備、客戶體驗、風險控管或成效衡量。第三步是把來源、案例、更新日期與觀點放清楚，讓讀者和 AI 系統都能追溯這篇文章的可信度。

這也會反過來支援 SEO 和 GEO。傳統搜尋需要可爬取的文字、清楚 metadata、內部連結與結構化資料。生成式搜尋則更需要能被摘要、引用、比較的段落。企業文章不應該只是關鍵字容器，而要像一份有證據的實驗室決策簡報。

## 從客戶真正要做的決策開始
先選一個潛在客戶會問的問題：第一個該做的 AI 產品是什麼、第一個該自動化的流程是什麼、需要哪些資料、如何控管風險、該怎麼評估 AI Agent、SEO 和 GEO 如何支援商業成長。好文章要幫讀者降低不確定性，而不是只把資訊堆滿。

實務上，開頭要快速回答搜尋意圖；中段說明背景、取捨和導入順序；結尾給讀者下一步，例如盤點流程、準備知識來源、定義審稿負責人，或和專業團隊討論。

## 來源不是代替觀點
Source links 提供證據鏈，但文章仍然要加入 ALTOS LAB 的實作觀點：導入順序、限制條件、審稿門檻與可量化結果。

來源不是裝飾。它要幫助文章區分穩定事實與作者判斷。當模型、搜尋功能或平台政策改變，文章要說清楚改變了什麼、還有哪些不確定，以及企業現在應該怎麼做。這會讓內容從一般 AI 文章，變成可以長期累積信任的知識資產。

## 建議的發文流程
比較安全的流程是：先抓趨勢來源，產生中英文同主題草稿，套用站內主視覺，補上 GEO answer summary，只有在頁面真的看得到 FAQ 時才輸出 FAQ structured data，最後保持草稿狀態等待人工審稿。審稿者要檢查正確性、移除無根據宣稱、補上 ALTOS LAB 的案例或觀點、確認中英文語意一致，再決定是否發布。

這樣可以保留每日內容節奏，也避免網站累積薄內容、重複內容或沒有證據的 AI 文章。

## AI 草稿要留在審稿流程
每日 AI 草稿可以提高內容節奏，但不應直接發布。人工需要補品牌脈絡、移除無根據宣稱、確認來源連結，並檢查中英文內容對齊。真正的目標不是單純發更多文章，而是建立一個可搜尋、可引用、能讓 ALTOS LAB 作為 AI 實驗室更容易被理解、比較與信任的知識庫。`;
  const keyTakeaways =
    language === "en"
      ? [
          "ALTOS LAB content should answer a real implementation decision, not only target a keyword.",
          "Source links and visible summaries help SEO and GEO systems understand trust signals.",
          "Strong lab journals connect AI trends to products, agents, workflows, tradeoffs and next steps.",
          "AI-assisted drafts should remain drafts until human review approves accuracy and brand fit."
        ]
      : [
          "ALTOS LAB 內容要回答真實導入決策，不只是塞關鍵字。",
          "可見來源與摘要能幫助搜尋與 AI 系統理解可信度。",
          "好的實驗室筆記會把 AI 趨勢翻成產品、Agent、流程、取捨與下一步。",
          "AI 產生內容應先保持草稿，通過人工審稿後再發布。"
        ];
  const faqs =
    language === "en"
      ? [
          {
            question: "Should AI-generated blog posts be published automatically?",
            answer:
              "No. They should remain drafts until a human reviews sources, accuracy, brand perspective and unsupported claims."
          },
          {
            question: "How does GEO fit inside a broader AI lab journal?",
            answer:
              "GEO is one visibility lane. The broader journal should also cover AI products, agents, automation, case studies and operational decisions."
          },
          {
            question: "What should a reviewer check before publishing?",
            answer:
              "A reviewer should check source quality, unsupported claims, bilingual parity, brand examples, image relevance and whether the article answers a real search intent."
          },
          {
            question: "Why include a cover image in AI content operations?",
            answer:
              "A relevant internal cover image improves scanning, sharing context and accessibility when paired with clear alt text."
          }
        ]
      : [
          {
            question: "AI 產生的文章可以自動發布嗎？",
            answer: "不建議。AI 草稿應先由人工檢查來源、正確性、品牌觀點與是否有無根據宣稱。"
          },
          {
            question: "GEO 在 ALTOS LAB 部落格裡扮演什麼角色？",
            answer: "GEO 是搜尋能見度的一條內容線，但部落格同時應該涵蓋 AI 產品、Agent、自動化、案例與營運決策。"
          },
          {
            question: "發布前審稿要檢查什麼？",
            answer: "需要檢查來源品質、無根據宣稱、中英文語意一致、品牌案例、圖片是否相關，以及文章是否真的回答搜尋意圖。"
          },
          {
            question: "為什麼 AI 內容也要配置主視覺？",
            answer: "合適的站內主視覺能提升掃讀、分享語境與可近用性；搭配清楚 alt text，也有助於 SEO 與使用者理解。"
          }
        ];

  return normalizeBlogPostInput({
    title,
    slug: slugify(language === "en" ? `${keyword} ${topic} english` : `${keyword} ${topic}`),
    status: "draft",
    language,
    translationGroupId,
    seoTitle: language === "en" ? `${keyword} and AI Implementation | ALTOS LAB` : `${keyword}與 AI 企業導入指南｜ALTOS LAB`,
    seoDescription:
      language === "en"
        ? `A source-backed ALTOS LAB draft on ${keyword}, AI products, agents, automation and search visibility.`
        : `ALTOS LAB 針對${keyword}、AI 產品、Agent、自動化與搜尋能見度的來源化內容指南。`,
    excerpt:
      language === "en"
        ? "A practical, source-backed draft on turning AI trend monitoring into shippable product, workflow and visibility decisions."
        : "這篇草稿說明如何把 AI 趨勢監測轉成可審稿、可索引，也能支援產品與流程導入的實驗室內容。",
    contentType,
    newsCategory,
    topic,
    audience,
    geoSummary:
      language === "en"
        ? "AI visibility improves when a lab publishes crawlable, source-backed, human-reviewed content about real product, workflow and buying decisions."
        : "AI 能見度來自實驗室持續發布可爬取、有來源、經人工審稿，並回答真實產品、流程與採購決策的內容。",
    body,
    keyTakeaways,
    faqs,
    sourceLinks: sources,
    tags: localizedDefaultTag(language),
    author: "ALTOS LAB",
    cover: chooseBlogCover(input, language),
    coverAlt: chooseBlogCoverAlt(input, language),
    coverSource: "fallback",
    readTimeMinutes: Math.max(3, estimateReadTimeMinutes(body, language)),
    featured: false,
    reviewStatus: "ai-draft",
    qualityChecks: {
      hasHumanReview: false,
      hasQualityReviewerApproval: false,
      hasVisibleSources: sources.length > 0,
      hasNoFabricatedClaims: false,
      hasSearchIntentAnswer: true,
      hasBilingualParity: true,
      notes: "Fallback template. Human review required before publish."
    },
    aiDisclosure: localizedDisclosure(language),
    generationDate,
    generationSlot: input.slot,
    generatedAt: nowIso(),
    generatedBy: "local-bilingual-lab-template",
    generationTrace: [
      {
        provider: "local",
        task: "content-draft",
        model: "local-template",
        promptVersion: BLOG_PROMPT_VERSION,
        sourceCount: sources.length,
        attemptedAt: nowIso()
      }
    ]
  });
}

function normalizeGeneratedPost({
  generated,
  input,
  language,
  translationGroupId,
  sources,
  generationDate,
  model,
  traces = []
}: {
  generated: DeepSeekPost | undefined;
  input: BlogGenerateInput;
  language: BlogLanguage;
  translationGroupId: string;
  sources: BlogSourceLink[];
  generationDate: string;
  model: string;
  traces?: BlogGenerationTrace[];
}) {
  if (!generated?.title || !generated.body) {
    return buildFallbackPost({ input, language, translationGroupId, sources, generationDate });
  }

  const body = String(generated.body);
  const contentType = generated.contentType || contentTypeFromInput(input);
  const newsCategory = generated.newsCategory || localizedNewsCategory(input, language);
  const seoFallback = [
    generated.title,
    generated.excerpt,
    generated.geoSummary,
    language === "en" ? input.intent : "協助經營者判斷 AI 趨勢、產品機會、自動化流程、搜尋能見度與企業導入下一步",
    language === "en"
      ? "ALTOS LAB explains the product, agent, automation, SEO, GEO and implementation decisions operators should make next."
      : "ALTOS LAB 說明企業如何判讀 AI 趨勢，並轉成產品、Agent、自動化、SEO、GEO 與實際導入決策。"
  ].filter(Boolean).join(" ");
  const seoDescription = fitSeoDescription(
    generated.seoDescription,
    seoFallback
  );
  const excerpt = fitSummaryField(
    generated.excerpt,
    [
      generated.title,
      generated.geoSummary,
      language === "en" ? input.intent : "協助經營者判斷 AI 趨勢、產品機會、自動化流程、搜尋能見度與企業導入下一步",
      language === "en"
        ? "A source-backed ALTOS LAB briefing for operators evaluating AI implementation."
        : "這是 ALTOS LAB 給企業營運者的來源化 AI 導入判斷摘要。"
    ].filter(Boolean).join(" "),
    70,
    220
  );
  const geoSummary = fitSummaryField(
    generated.geoSummary,
    [excerpt, language === "en" ? input.intent : "協助經營者判斷 AI 趨勢、產品機會、自動化流程、搜尋能見度與企業導入下一步"].filter(Boolean).join(" "),
    90,
    260
  );

  return normalizeBlogPostInput({
    ...generated,
    slug: generated.slug || slugify(`${generated.title} ${language}`),
    status: "draft",
    language,
    translationGroupId,
    seoDescription,
    excerpt,
    contentType,
    newsCategory,
    geoSummary,
    sourceLinks: sources.length ? sources : normalizeSourceLinks(generated.sourceLinks || []),
    tags: generated.tags?.length ? generated.tags : localizedDefaultTag(language),
    author: generated.author || "ALTOS LAB",
    cover: generated.cover?.startsWith("/") || generated.cover?.startsWith("http") ? generated.cover : chooseBlogCover(input, language),
    coverAlt: generated.coverAlt || chooseBlogCoverAlt(input, language),
    coverPrompt: generated.coverPrompt,
    coverSource: generated.coverSource || "fallback",
    coverGeneration: generated.coverGeneration,
    readTimeMinutes: Math.max(3, generated.readTimeMinutes || estimateReadTimeMinutes(body, language)),
    featured: false,
    reviewStatus: "ai-draft",
    qualityChecks: {
      hasHumanReview: false,
      hasQualityReviewerApproval: false,
      hasVisibleSources: sources.length > 0,
      hasNoFabricatedClaims: false,
      hasSearchIntentAnswer: Boolean(generated.geoSummary),
      hasBilingualParity: true,
      notes: "Generated by DeepSeek. ALTOS LAB quality gate required before publish."
    },
    aiDisclosure: localizedDisclosure(language),
    generationDate,
    generationSlot: input.slot,
    generatedAt: nowIso(),
    generatedBy: `${model}:${BLOG_PROMPT_VERSION}`,
    generationTrace: traces
  });
}

async function generateWithDeepSeek(input: BlogGenerateInput, sources: BlogSourceLink[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const baseUrl = deepSeekBaseUrl();
  const model = deepSeekModelForTask("content-draft");
  const timeoutMs = deepSeekTimeoutMs();
  const maxTokens = deepSeekMaxTokens();
  const traces: BlogGenerationTrace[] = [];
  const sourceBrief = sources
    .map((source, index) => `${index + 1}. ${source.title} (${source.publisher || "source"}) - ${source.url}`)
    .join("\n");
  const editorialBrief = input.slot ? pickEditorialBrief(input.slot) : undefined;
  const topic = input.topic || editorialBrief?.topic || sources[0]?.title || "AI trends and search visibility";

  async function requestJsonOnce({
    prompt,
    language,
    temperature
  }: {
    prompt: string;
    language: DeepSeekLanguage;
    temperature: number;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: stableDeepSeekSystemPrompt("content-draft")
            },
            { role: "user", content: prompt }
          ],
          thinking: { type: "disabled" },
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(
          `DeepSeek generation failed: ${response.status}${errorPayload?.error?.message ? ` ${errorPayload.error.message}` : ""}`
        );
      }

      const data = (await response.json()) as DeepSeekChatResponse;
      const choice = data.choices?.[0];
      if (!choice) throw new Error(`DeepSeek ${language} response did not include choices`);
      if (choice.finish_reason === "length") {
        throw new Error(`DeepSeek ${language} response was truncated at max_tokens=${maxTokens}`);
      }
      if (choice.finish_reason && choice.finish_reason !== "stop") {
        throw new Error(`DeepSeek ${language} stopped with finish_reason=${choice.finish_reason}`);
      }

      const message = choice.message || {};
      const content = message.content || message.reasoning_content || "";
      traces.push(
        createDeepSeekTrace({
          task: "content-draft",
          model,
          startedAt,
          finishReason: choice.finish_reason,
          usage: data.usage,
          sourceCount: sources.length
        })
      );
      return assertDeepSeekPost(extractJson(content) as DeepSeekPost, language);
    } catch (error) {
      traces.push(
        createDeepSeekTrace({
          task: "content-draft",
          model,
          startedAt,
          error:
            error instanceof Error && error.name === "AbortError"
              ? `DeepSeek ${language} generation timed out after ${timeoutMs}ms`
              : error instanceof Error
                ? error.message
                : "DeepSeek generation failed",
          sourceCount: sources.length
        })
      );
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`DeepSeek ${language} generation timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function requestJson(prompt: string, language: DeepSeekLanguage) {
    const attempts = [
      { prompt, temperature: 0.2 },
      {
        prompt: `${prompt}

Format repair instruction:
- The previous attempt failed validation.
- Return one complete, valid JSON object only.
- Keep the article concise enough to avoid truncation.
- Do not add any field outside the requested schema.`,
        temperature: 0.1
      }
    ];
    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        return await requestJsonOnce({ ...attempt, language });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`DeepSeek ${language} generation failed`);
  }

  function languagePrompt(language: DeepSeekLanguage) {
    const languageInstruction =
      language === "zh-Hant"
        ? "Write in Traditional Chinese for Taiwan. Use natural Taiwanese business language."
        : language === "ja"
          ? "Write in natural Japanese for business readers in Japan. Do not sound like a literal translation."
          : language === "ko"
            ? "Write in natural Korean for business readers in Korea. Do not sound like a literal translation."
            : language === "id"
              ? "Write in natural Bahasa Indonesia for Indonesian business readers. Avoid literal translation tone."
              : language === "vi"
                ? "Write in natural Vietnamese for Vietnamese business readers. Avoid literal translation tone."
                : language === "th"
                  ? "Write in natural Thai for Thai business readers. Avoid literal translation tone."
                  : language === "ms"
                    ? "Write in natural Bahasa Melayu for Malaysian business readers. Avoid literal translation tone."
                    : language === "fil"
                      ? "Write in natural Filipino for Philippine business readers. Avoid literal translation tone."
                      : "Write in natural business English.";
    const languageLabel = language;
    const contentType = contentTypeFromInput(input);
    const newsCategory = localizedNewsCategory(input, language);
    const brief = input.slot ? pickEditorialBrief(input.slot) : undefined;
    const bodyLengthRule =
      contentType === "breaking"
        ? "Body should be short and fast: 260-420 English words or equivalent local-language length."
        : contentType === "feature"
          ? "Body should be deep: 900-1200 English words or equivalent local-language length, and include a Markdown comparison table."
          : "Body should be substantial: 650-850 English words or equivalent local-language length.";

    return `You are writing one ${languageLabel} company-blog draft for ALTOS LAB, an AI implementation lab and product studio.

This is one side of a multilingual article set for zh-Hant, en, ja, ko, id, vi, th, ms and fil. Use the same angle, claims and source-backed reasoning as the paired language versions will use, while making the language sound native.

Topic: ${topic}
Primary keyword: ${input.keyword || topic}
Audience: ${input.audience || "business owners, operators, marketing teams and AI implementation buyers"}
Search intent: ${input.intent || "understand the trend and evaluate practical AI product, agent, automation and implementation steps"}
Content type: ${contentType}
News category: ${newsCategory}
Editorial mix: ALTOS LAB uses roughly ${Math.round((brief?.newsRatio ?? 0.35) * 100)}% latest source/news signal and ${Math.round((1 - (brief?.newsRatio ?? 0.35)) * 100)}% original lab synthesis for this lane.
Sources:
${sourceBrief}

Editorial writing system:
- Do not let older ALTOS LAB templates control the article. Choose one fresh narrative mode before drafting and make the structure fit the story.
- Mode A, Medium-style scene hook: open with a concrete operator scene, failure, or decision moment, then widen into the framework.
- Mode B, Foresight-style market brief: start from a news event, map competing routes or stakeholders, then explain what changes for readers.
- Mode C, AI Magazine-style company signal: use one company move as a lens for market structure, valuation, enterprise demand or platform power.
- Mode D, lab notebook: explain the mechanism, limits, uncertainty and what ALTOS LAB would test next.
- Mode E, contrarian operator column: name the popular mistake, show why it fails, then give a sharper decision rule.
- Strong articles usually include a memorable line, an honest take, one table/checklist, and a final judgment that a reader can repeat to a teammate.
- Avoid same-shape articles. Do not always use the same H2 sequence, same "what changed/why it matters" frame, or same SEO/GEO ending.
- Market-news title calibration: name the actor/source and the concrete move first, then the reader impact. Prefer verifiable nouns such as launch, availability, partnership, funding, policy, benchmark, security issue, rollout, region, price, capability or date. Avoid empty hype such as "顛覆", "終極", "改變一切", "所有人都在搶", "完整解析", "你一定要懂".
- Market-news lead calibration: first sentence should say who is affected and what changed now. Second sentence can add one risk, open question, or operational implication. Do not open with ALTOS LAB process, internal translation method, or generic AI-era throat clearing.
- Column calibration: the first 2-3 sentences must establish audience, time window, concrete signal and the decision tension before background. Use event + impact titles, not emotional adjectives. Every long column needs a visible boundary: region, date, source type, sample limit, or what the evidence cannot prove.
- Column rhythm: move from background to case/source evidence, then risk, then decision/action. Use one memorable judgment per section, not a wall of tables. Bold only short decision words, risk conditions, deadlines, metrics or concrete operator questions; avoid bolding full paragraphs.

Return exactly one valid JSON object. Do not include Markdown, prose, comments, analysis, XML, YAML or code fences.
${languageInstruction}

Use this exact shape and fill every string field:
{
  "title": "",
  "seoTitle": "",
  "seoDescription": "",
  "excerpt": "",
  "contentType": "${contentType}",
  "newsCategory": "${newsCategory}",
  "topic": "",
  "audience": "",
  "geoSummary": "",
  "body": "",
  "keyTakeaways": ["", "", ""],
  "faqs": [{"question": "", "answer": ""}],
  "tags": ["", "", ""],
  "sourceLinks": [{"title": "", "url": "", "publisher": ""}]
}

Quality rules:
- Write for people first. No keyword stuffing.
- Position ALTOS LAB as an AI lab that researches, builds and publishes across AI products, agents, workflow automation, AI operations, case studies and search visibility.
- SEO/GEO is one visibility lane, not the whole brand. Do not frame ALTOS LAB as only an SEO/GEO product.
- Do not force every article into an ALTOS LAB solution pitch. Some posts should be pure market briefs, research explainers, contrarian columns, source roundups, field notes or signal-chart analysis.
- Adjust the mix by article type: breaking = latest news first with minimal interpretation; column = recent news signal plus one sharp operator question; feature = durable framework anchored in recent sources.
- If sources contain fresh official announcements or credible recent news, name the event/source in the angle and explain what changed. If the sources are evergreen docs, label the piece as a framework or field note instead of pretending it is breaking news.
- Never put the content type label in the title or seoTitle. Do not prefix titles with "市場快訊", "Market brief", "Column", "Feature", "專欄", "專題", "市場ブリーフ", "コラム", "特集", "시장 브리프", "칼럼" or "기획". The website renders contentType as a separate badge.
- Do not make the title a taxonomy bucket. The title must name the source/event/mechanism/operator question and the implication for the reader.
- Use the listed RSS/source items as factual references only. Do not copy source wording, paragraphs, structure, images, charts, screenshots or article art.
- If contentType is "breaking", write like a newsroom market brief: event first, verified facts, source attribution, uncertainty, and what readers should watch next. Do not turn the article into an ALTOS LAB column or a management framework.
- If using foreign news, adapt the facts into original local-language copy. Do not translate paragraph by paragraph, copy the source article's section order, or reuse source-specific narrative color.
- For breaking posts, do not use internal-editorial headings such as "來源轉譯成企業判斷", "把海外新聞翻成企業能用的判斷", "ALTOS LAB 的實驗室判斷", "source translation note", "editorial read", "lab note", "scorecard", or equivalent local-language variants. Source/credit context belongs in the source list or a compact note, not as a main H2 argument section.
- Foreign-source context must be plain-language news attribution, not process display. It must answer: what did the source say, what is confirmed, what remains uncertain, and what readers can watch next.
- Do not leave technical terms unexplained. If you use terms like trace, eval, rollback, orchestration, retrieval, routing, agent workflow, plugin or observability, define them in the article's language the first time they appear. For zh-Hant, prefer "操作紀錄", "固定測試題/評測", "回滾/退回舊流程", "工作流編排", "檢索", "路由", "可觀測性".
- Use bold sparingly to help scanning: bold the one-sentence judgment, key operator questions, or concrete checklist phrase. Do not bold entire paragraphs.
- Use ==important sentence== for one short in-article highlight only when a sentence should receive ALTOS LAB's fixed #A4FF00 emphasis underline. Do not use more than 1-2 highlighted sentences per article.
- If a smart non-engineer would ask "所以這跟我有什麼關係？", rewrite the paragraph with a workflow example and a next decision.
- At least one body section must connect a concrete outside news event to the reader's business decision. Do not leave foreign sources only in sourceLinks.
- The article must be an original ALTOS LAB synthesis: summarize facts in your own words, cite the source URLs, and add implementation judgment.
- Make readers feel ALTOS LAB is a serious lab: source-grounded, practical, original, careful with uncertainty and useful for decision makers.
- Every article needs one fresh angle: a market signal, counterintuitive point, mechanism explainer, source trail, implementation framework, case breakdown, risk warning, decision matrix, comparison table or signal chart.
- Use a sharp title pattern: specific source/event/question + operator implication + ALTOS LAB framework. Never use generic titles like "AI platform trends", "search visibility and executive decisions", "what business leaders need to know", "不可忽視", "必須關注" or "關鍵轉變".
- The excerpt is the visible article subtitle. Treat it like a newsroom standfirst, not a summary field.
- Subtitle/standfirst craft rules:
  1. Start with a concrete tension, source/event or reader problem. Avoid "本文整理", "這篇文章", "This article", "learn how", "explore", "matters because" and template summary language.
  2. Include at least one named actor/source/event OR one vivid operator situation, plus the decision the reader must make.
  3. Make a busy reader want the next paragraph: show the stakes, tradeoff, surprise or useful promise in 1-2 sentences.
  4. Use specific nouns and verbs. Weak: "This trend is important for companies." Strong: "OpenAI's tax-agent case turns the question from 'can an agent act?' into 'can we trace, score and roll it back when it acts wrong?'"
  5. Never repeat the title with extra words. The subtitle must add a second angle: source evidence, risk, operator benefit or decision frame.
- Subtitle examples by language:
  zh-Hant: "不要把第一個 AI Agent 試點交給最複雜的流程。OpenAI 的 tax-agent 案例和 Hugging Face 的 agent 定義都指向同一件事：先選能留下操作紀錄、能人工審核、能退回舊流程的任務。"
  en: "Do not hand the first AI-agent pilot to the messiest workflow. OpenAI's tax-agent case and Hugging Face's agent framing both point to the same rule: start where operation logs, review and rollback are possible."
  ja: "最初のAIエージェント実験を、いきなり最も複雑な業務に置かない。OpenAIの事例とHugging Faceの定義から見える基準は、操作記録、レビュー、巻き戻しができる業務から始めることです。"
  ko: "첫 AI Agent 파일럿을 가장 복잡한 업무에 맡기지 마세요. OpenAI 사례와 Hugging Face의 agent 정의가 가리키는 기준은 작업 기록, 검토, 롤백이 가능한 흐름부터 시작하는 것입니다."
- Anti-slop style gate: cut throat-clearing openers, do not announce "this article will", avoid "not X but Y" structures, avoid generic hype words, use concrete actors and actions, vary sentence rhythm, and remove empty transitions.
- Sound like a sharp lab editor. Specific claims beat polished slogans.
- Do not invent client names, statistics, dates or source claims.
- Any claim tied to a trend must be supported by sourceLinks.
- The first 50 words must directly answer the search intent with concrete entities and an operator decision. Do not begin with "本文", "這篇文章", "In this article", "This article", "we will", "この記事では", or "이 글에서는".
- Do not use the same fixed H2 structure across drafts. Avoid stale template headings like "發生什麼變化", "為什麼重要", "訊號圖", "What changed", "Why it matters" unless that is truly the best human-readable heading for the specific story.
- Write like an editor who expects a busy founder to finish the piece: concrete first sentence, human rhythm, source-backed detail, one useful judgment per section.
- seoDescription must be 80-150 characters.
- excerpt must be 90-220 characters or equivalent local-language length; if the subject requires two short sentences, use two.
- geoSummary is reader-facing TL;DR, not an internal field label. It must be 2-4 useful sentences, 180-420 characters or equivalent local-language length, and explain the article's main judgment, evidence base, uncertainty and next operator action.
- Do not write "GEO answer summary" inside geoSummary. Do not describe the post as an "SEO/GEO asset" unless the topic is specifically search visibility.
- keyTakeaways must contain 4 concrete, non-generic bullets.
- faqs must contain 3-5 visible questions and answers covered by the article.
- sourceLinks must reuse only the URLs listed in Sources.
- Body must use 4-6 Markdown H2 headings and practical paragraphs. Make ALTOS LAB's editorial read visible, but do not use the same fixed heading every time.
- Use tables or a compact chart when it clarifies the topic. For a chart, use this exact Markdown block syntax in the body:
:::chart
title: Short chart title
labels: Source confidence|Market heat|Workflow impact|Execution difficulty
values: 72|64|81|55
caption: One sentence explaining that values are relative editorial scores, not market size.
:::
- ${bodyLengthRule}
- If contentType is "feature", include one Markdown comparison table and one step-by-step framework.
- If contentType is "column", answer one concrete operator question and include tradeoffs, a decision table or numbered operator framework, plus next steps.
- If contentType is "breaking", keep it timely and factual: what happened, who announced or reported it, why it matters now, what remains uncertain, and the credited sources. Avoid column-style frameworks, scorecards, lab-note headings, and internal translation-process sections.
- Cover image metadata must be topic-specific: write coverAlt/visual language around the article's concrete subject, not generic dashboards, team meetings, server rooms or workspaces.
- Keep status/review fields out of the JSON; the CMS will set them.`;
  }

  const entries = await Promise.all(
    BLOG_LANGUAGES.map(async (language) => [language, await requestJson(languagePrompt(language), language)] as const)
  );

  return { pair: assertDeepSeekPair(Object.fromEntries(entries) as DeepSeekPair), model, traces };
}

export async function repairBlogPostsWithDeepSeek(
  posts: BlogPost[],
  review: BlogPairQualityReview,
  input: BlogGenerateInput = {}
) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { posts, repaired: false, warning: "DEEPSEEK_API_KEY is not configured" };

  const baseUrl = deepSeekBaseUrl();
  const model = deepSeekModelForTask("quality-repair");
  const timeoutMs = deepSeekTimeoutMs();
  const maxTokens = deepSeekMaxTokens();

  async function repairOne(post: BlogPost) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    const languageIssues = review.issues
      .filter((issue) => issue.startsWith(`${post.language}/${post.slug}:`) || !issue.includes("/"))
      .concat(review.warnings.filter((warning) => warning.startsWith(`${post.language}/${post.slug}:`)))
      .slice(0, 12);

    const prompt = `You are ALTOS LAB's automated quality editor.

Repair only the quality issues listed below. Do not rewrite the whole article if a targeted edit is enough.
Preserve the same source URLs, same contentType, same newsCategory, same translationGroupId semantics and the same main angle.
Do not invent clients, private data, statistics or dates.
Make ALTOS LAB sound like a serious AI implementation lab and product studio, not only an SEO/GEO tool.
Remove AI-slop patterns: throat-clearing, generic hype, passive voice, "not X but Y" contrasts, meta transitions, repeated sentence rhythm and vague claims. Keep the article specific and source-grounded.
Reject generic trend framing. The repaired title must contain a concrete question, market signal, source-backed event, visual frame or operator decision. The opening must answer the query immediately and the article must make ALTOS LAB's editorial read visible without repeating a fixed heading.
Rewrite the excerpt as a strong visible subtitle/standfirst: concrete source/event or operator tension first, then the reader decision or tradeoff. It must not be a bland summary, must not repeat the title, and must not start with "本文", "這篇文章", "This article", "learn how", "explore", "この記事", or "이 글".
Make every technical section easy for a busy non-specialist to understand. Translate jargon into plain language on first use. If the draft uses trace, eval, rollback, orchestration, retrieval, routing, plugin or observability, explain the human meaning immediately, such as operation logs, test questions, returning to the old workflow, source lookup, or seeing where the system failed.
Use bold sparingly to mark the core judgment, the three operator questions, or a checklist phrase that helps scanning. Never use bold as decoration.
Use ==important sentence== for at most one short in-article highlight when a repaired sentence deserves ALTOS LAB's fixed #A4FF00 emphasis underline.
If the article feels templated, pick a stronger narrative mode: scene hook, market route comparison, company-signal analysis, lab notebook, or contrarian operator column. Keep the sources, but make the human reading experience less predictable.

Language: ${post.language}
Content type: ${post.contentType || contentTypeFromInput(input)}
News category: ${post.newsCategory || localizedNewsCategory(input, post.language)}
Quality issues:
${languageIssues.map((issue, index) => `${index + 1}. ${issue}`).join("\n") || "Improve source-grounded clarity, Labs POV, GEO structure, image/alt fit and readability."}

Return one valid JSON object with this exact shape:
{
  "title": "",
  "seoTitle": "",
  "seoDescription": "",
  "excerpt": "",
  "contentType": "${post.contentType || contentTypeFromInput(input)}",
  "newsCategory": "${post.newsCategory || localizedNewsCategory(input, post.language)}",
  "topic": "",
  "audience": "",
  "geoSummary": "",
  "body": "",
  "keyTakeaways": ["", "", "", ""],
  "faqs": [{"question": "", "answer": ""}],
  "tags": ["", "", ""],
  "coverAlt": ""
}

Current article JSON:
${JSON.stringify(
  {
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: post.newsCategory,
    topic: post.topic,
    audience: post.audience,
    geoSummary: post.geoSummary,
    body: post.body,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    tags: post.tags,
    coverAlt: post.coverAlt,
    sourceLinks: post.sourceLinks
  },
  null,
  2
)}`;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: stableDeepSeekSystemPrompt("quality-repair")
            },
            { role: "user", content: prompt }
          ],
          thinking: { type: "disabled" },
          temperature: 0.15,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error(`DeepSeek repair failed: ${response.status}`);
      const data = (await response.json()) as DeepSeekChatResponse;
      const choice = data.choices?.[0];
      const content = choice?.message?.content || choice?.message?.reasoning_content || "";
      const trace = createDeepSeekTrace({
        task: "quality-repair",
        model,
        startedAt,
        finishReason: choice?.finish_reason,
        usage: data.usage,
        sourceCount: post.sourceLinks.length
      });
      const generated = assertDeepSeekPost(extractJson(content) as DeepSeekPost, post.language);
      return normalizeGeneratedPost({
        generated: {
          ...generated,
          slug: post.slug,
          sourceLinks: post.sourceLinks,
          cover: post.cover,
          coverPrompt: post.coverPrompt,
          coverSource: post.coverSource,
          coverGeneration: post.coverGeneration,
          contentType: generated.contentType || post.contentType,
          newsCategory: generated.newsCategory || post.newsCategory
        },
        input: { ...input, contentType: post.contentType || input.contentType, newsCategory: post.newsCategory || input.newsCategory },
        language: post.language,
        translationGroupId: post.translationGroupId,
        sources: post.sourceLinks,
        generationDate: post.generationDate || input.generationDate || taiwanDate(),
        model: `${model}:quality-repair`,
        traces: [...(post.generationTrace || []), trace]
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const repairedPosts = await Promise.all(posts.map(repairOne));
    return { posts: repairedPosts, repaired: true };
  } catch (error) {
    return {
      posts,
      repaired: false,
      warning: error instanceof Error ? error.message : "DeepSeek quality repair failed"
    };
  }
}

export async function generateBlogDraftPair(input: BlogGenerateInput = {}) {
  const candidates = await fetchTrendCandidates(input);
  const sources = canonicalSources(candidates);
  const generationDate = input.generationDate || taiwanDate();
  const slotSuffix = input.slot ? `_${input.slot}` : "";
  const translationGroupId = `tg_${generationDate.replace(/-/g, "")}${slotSuffix}_${Date.now().toString(36)}`;

  try {
    const generated = await generateWithDeepSeek(input, sources);
    if (!generated) {
      const fallbackPosts = BLOG_LANGUAGES.map((language) =>
        buildFallbackPost({ input, language, translationGroupId, sources, generationDate })
      );
      const fallbackCovers = await generateBlogCovers(fallbackPosts);
      return {
        posts: fallbackCovers.posts,
        sources,
        provider: "fallback" as const,
        coverGeneration: fallbackCovers,
        promptVersion: BLOG_PROMPT_VERSION
      };
    }

    const normalizedPosts = BLOG_LANGUAGES.map((language) =>
      normalizeGeneratedPost({
        generated: generated.pair[language],
        input,
        language,
        translationGroupId,
        sources,
        generationDate,
        model: generated.model,
        traces: generated.traces
      })
    );
    const generatedCovers = await generateBlogCovers(normalizedPosts);

    return {
      posts: generatedCovers.posts,
      sources,
      provider: "deepseek" as const,
      coverGeneration: generatedCovers,
      promptVersion: BLOG_PROMPT_VERSION,
      traces: generated.traces
    };
  } catch (error) {
    const fallbackPosts = BLOG_LANGUAGES.map((language) =>
      buildFallbackPost({ input, language, translationGroupId, sources, generationDate })
    );
    const fallbackCovers = await generateBlogCovers(fallbackPosts);
    return {
      posts: fallbackCovers.posts,
      sources,
      provider: "fallback" as const,
      coverGeneration: fallbackCovers,
      promptVersion: BLOG_PROMPT_VERSION,
      warning: error instanceof Error ? error.message : "DeepSeek provider failed; used local fallback"
    };
  }
}
