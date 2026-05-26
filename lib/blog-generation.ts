import { estimateReadTimeMinutes, normalizeSourceLinks, taiwanDate } from "./blog-utils";
import { normalizeBlogPostInput, nowIso, slugify } from "./cms";
import type { BlogLanguage, BlogPost, BlogSourceLink } from "./types";

export type BlogGenerateInput = {
  topic?: string;
  audience?: string;
  keyword?: string;
  intent?: string;
  sourceLinks?: BlogSourceLink[];
};

type TrendCandidate = {
  title: string;
  url: string;
  publisher?: string;
  publishedAt?: string;
  summary?: string;
};

type DeepSeekPost = Partial<BlogPost> & {
  sourceLinks?: BlogSourceLink[];
};

type DeepSeekPair = {
  zh?: DeepSeekPost;
  en?: DeepSeekPost;
};

type DeepSeekLanguage = Extract<BlogLanguage, "zh-Hant" | "en">;

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

const DEFAULT_RSS_SOURCES = [
  "https://openai.com/news/rss.xml",
  "https://blog.google/innovation-and-ai/technology/ai/rss/",
  "https://deepmind.google/blog/rss.xml",
  "https://huggingface.co/blog/feed.xml",
  "https://feeds.feedburner.com/blogspot/amDG",
  "https://vercel.com/blog/rss.xml",
];

function sourceListFromEnv() {
  return (process.env.BLOG_TREND_SOURCES || DEFAULT_RSS_SOURCES.join(","))
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean)
    .slice(0, 8);
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
  const publisher = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return undefined;
    }
  })();
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];

  return itemMatches.slice(0, 4).map((item) => {
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
      url: hrefMatch?.[1] || linkText
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
      if (candidates.length >= 8) break;
    }
    if (candidates.length >= 8) break;
  }

  return candidates.length ? candidates.slice(0, 8) : FALLBACK_SOURCES;
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
  if (!value.zh?.title || !value.zh.body || !value.en?.title || !value.en.body) {
    throw new Error("DeepSeek JSON did not include complete zh/en article drafts");
  }
  return value;
}

function assertDeepSeekPost(value: DeepSeekPost, language: DeepSeekLanguage) {
  if (!value.title || !value.body || !value.geoSummary) {
    throw new Error(`DeepSeek JSON did not include a complete ${language} article draft`);
  }
  return value;
}

function canonicalSources(candidates: TrendCandidate[]) {
  return normalizeSourceLinks(candidates.map(({ title, url, publisher, publishedAt }) => ({ title, url, publisher, publishedAt })));
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
  const topic = input.topic?.trim() || "AI 搜尋與企業內容自動化";
  const keyword = input.keyword?.trim() || (language === "en" ? "AI search visibility" : "AI 搜尋能見度");
  const audience =
    input.audience?.trim() ||
    (language === "en" ? "founders, operators and marketing teams" : "企業主、營運主管與行銷負責人");
  const title =
    language === "en"
      ? `${keyword}: a practical playbook for AI-visible company content`
      : `${keyword}實戰：企業如何用可信內容提升 AI 搜尋能見度`;
  const body =
    language === "en"
      ? `## The short answer
AI search visibility improves when a company publishes clear, source-backed, human-reviewed pages that answer real buying and implementation questions. The goal is not to flood the site with generic content, but to make expertise easier for search engines and AI answer systems to cite.

## Start from one decision your buyer needs to make
Choose a question that matters before a prospect contacts ALTOS LAB: what process should be automated first, what data is needed, how risk is controlled, or how SEO and GEO work together. A useful article should help the reader make that decision.

## Use sources without outsourcing judgment
Source links give the article an evidence trail. The draft should still add ALTOS LAB's point of view: implementation sequence, constraints, review gates, and measurable outcomes.

## Keep AI drafts in review
Daily AI-assisted drafts are useful for momentum, but they should stay unpublished until a human adds brand context, removes unsupported claims, and confirms bilingual parity.`
      : `## 直接回答
企業要提升 AI 搜尋能見度，重點不是大量灌水文章，而是持續發布清楚、有來源、經人工審稿、能回答真實採購與導入問題的內容。這些內容要讓搜尋引擎與 AI 回答系統都容易理解與引用。

## 從客戶真正要做的決策開始
先選一個潛在客戶會問的問題：第一個該自動化的流程是什麼、需要哪些資料、如何控管風險、SEO 和 GEO 怎麼搭配。好文章要幫讀者做出更清楚的判斷。

## 來源不是代替觀點
Source links 提供證據鏈，但文章仍然要加入 ALTOS LAB 的實作觀點：導入順序、限制條件、審稿門檻與可量化結果。

## AI 草稿要留在審稿流程
每日 AI 草稿可以提高內容節奏，但不應直接發布。人工需要補品牌脈絡、移除無根據宣稱，並確認中英文內容對齊。`;
  const keyTakeaways =
    language === "en"
      ? [
          "AI-visible content should answer a real decision, not only target a keyword.",
          "Source links and visible summaries help SEO and GEO systems understand trust signals.",
          "AI-assisted drafts should remain drafts until human review approves accuracy and brand fit."
        ]
      : [
          "GEO 內容要回答真實決策，不只是塞關鍵字。",
          "可見來源與摘要能幫助搜尋與 AI 系統理解可信度。",
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
            question: "How does GEO relate to SEO?",
            answer:
              "GEO builds on SEO foundations: crawlable pages, clear headings, structured data, source-backed content and useful answers."
          }
        ]
      : [
          {
            question: "AI 產生的文章可以自動發布嗎？",
            answer: "不建議。AI 草稿應先由人工檢查來源、正確性、品牌觀點與是否有無根據宣稱。"
          },
          {
            question: "GEO 和 SEO 是分開的嗎？",
            answer: "GEO 建立在 SEO 基礎上：可爬取頁面、清楚標題、結構化資料、有來源的內容與有用答案。"
          }
        ];

  return normalizeBlogPostInput({
    title,
    slug: slugify(language === "en" ? `${keyword} ${topic} english` : `${keyword} ${topic}`),
    status: "draft",
    language,
    translationGroupId,
    seoTitle: language === "en" ? `${keyword} for AI Search Visibility | ALTOS LAB` : `${keyword}與 AI 搜尋能見度指南｜ALTOS LAB`,
    seoDescription:
      language === "en"
        ? `A source-backed ALTOS LAB draft on ${keyword}, SEO, GEO and human-reviewed AI content operations.`
        : `ALTOS LAB 針對${keyword}、SEO、GEO 與 AI 草稿審稿流程的來源化內容指南。`,
    excerpt:
      language === "en"
        ? "A practical, source-backed draft on turning AI trend monitoring into reviewable company blog content."
        : "這篇草稿說明如何把 AI 趨勢監測轉成可審稿、可索引、可被 AI 搜尋理解的企業內容。",
    topic,
    audience,
    geoSummary:
      language === "en"
        ? "AI search visibility comes from crawlable, source-backed, human-reviewed content that answers real implementation and buying questions."
        : "AI 搜尋能見度來自可爬取、有來源、經人工審稿，並能回答真實導入與採購問題的內容。",
    body,
    keyTakeaways,
    faqs,
    sourceLinks: sources,
    tags: language === "en" ? ["AI search", "GEO", "SEO", "AI content"] : ["AI 搜尋", "GEO", "SEO", "AI 內容"],
    author: "ALTOS LAB",
    cover: "/geo-cover.png",
    readTimeMinutes: estimateReadTimeMinutes(body, language),
    featured: false,
    reviewStatus: "ai-draft",
    qualityChecks: {
      hasHumanReview: false,
      hasVisibleSources: sources.length > 0,
      hasNoFabricatedClaims: false,
      hasSearchIntentAnswer: true,
      hasBilingualParity: true,
      notes: "Fallback template. Human review required before publish."
    },
    aiDisclosure:
      language === "en"
        ? "AI-assisted draft. Human review is required before publication."
        : "AI 協助產生的草稿，發布前必須經人工審稿。",
    generationDate,
    generatedAt: nowIso(),
    generatedBy: "local-bilingual-geo-template"
  });
}

function normalizeGeneratedPost({
  generated,
  input,
  language,
  translationGroupId,
  sources,
  generationDate,
  model
}: {
  generated: DeepSeekPost | undefined;
  input: BlogGenerateInput;
  language: BlogLanguage;
  translationGroupId: string;
  sources: BlogSourceLink[];
  generationDate: string;
  model: string;
}) {
  if (!generated?.title || !generated.body) {
    return buildFallbackPost({ input, language, translationGroupId, sources, generationDate });
  }

  const body = String(generated.body);
  return normalizeBlogPostInput({
    ...generated,
    slug: generated.slug || slugify(`${generated.title} ${language}`),
    status: "draft",
    language,
    translationGroupId,
    sourceLinks: normalizeSourceLinks(generated.sourceLinks?.length ? generated.sourceLinks : sources),
    tags: generated.tags?.length ? generated.tags : language === "en" ? ["AI", "GEO", "SEO"] : ["AI", "GEO", "SEO"],
    author: generated.author || "ALTOS LAB",
    cover: generated.cover || "/geo-cover.png",
    readTimeMinutes: generated.readTimeMinutes || estimateReadTimeMinutes(body, language),
    featured: false,
    reviewStatus: "ai-draft",
    qualityChecks: {
      hasHumanReview: false,
      hasVisibleSources: sources.length > 0,
      hasNoFabricatedClaims: false,
      hasSearchIntentAnswer: Boolean(generated.geoSummary),
      hasBilingualParity: true,
      notes: "Generated by DeepSeek. Human review required before publish."
    },
    aiDisclosure:
      language === "en"
        ? "AI-assisted draft. Human review is required before publication."
        : "AI 協助產生的草稿，發布前必須經人工審稿。",
    generationDate,
    generatedAt: nowIso(),
    generatedBy: model
  });
}

async function generateWithDeepSeek(input: BlogGenerateInput, sources: BlogSourceLink[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-flash";
  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS || 45_000);
  const sourceBrief = sources
    .map((source, index) => `${index + 1}. ${source.title} (${source.publisher || "source"}) - ${source.url}`)
    .join("\n");
  const topic = input.topic || sources[0]?.title || "AI trends and search visibility";

  async function requestJson(prompt: string, language: DeepSeekLanguage) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
              content:
                "You are a JSON API. Return only one valid JSON object matching the user's schema. Never include reasoning text outside JSON."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 2800,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(
          `DeepSeek generation failed: ${response.status}${errorPayload?.error?.message ? ` ${errorPayload.error.message}` : ""}`
        );
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message || {};
      const content = message.content || message.reasoning_content || "";
      return assertDeepSeekPost(extractJson(content) as DeepSeekPost, language);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`DeepSeek ${language} generation timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function languagePrompt(language: DeepSeekLanguage) {
    const languageInstruction =
      language === "zh-Hant"
        ? "Write in Traditional Chinese for Taiwan. Use natural Taiwanese business language."
        : "Write in natural business English.";
    const languageLabel = language === "zh-Hant" ? "zh-Hant" : "en";

    return `You are writing one ${languageLabel} company-blog draft for ALTOS LAB, an AI implementation studio.

This is one side of a bilingual article pair. Use the same angle, claims and source-backed reasoning as the paired language version will use.

Topic: ${topic}
Primary keyword: ${input.keyword || topic}
Audience: ${input.audience || "business owners, operators, marketing teams and AI implementation buyers"}
Search intent: ${input.intent || "understand the trend and evaluate practical AI implementation steps"}
Sources:
${sourceBrief}

Return exactly one valid JSON object. Do not include Markdown, prose, comments, analysis, XML, YAML or code fences.
${languageInstruction}

Use this exact shape and fill every string field:
{
  "title": "",
  "seoTitle": "",
  "seoDescription": "",
  "excerpt": "",
  "topic": "",
  "audience": "",
  "geoSummary": "",
  "body": "",
  "keyTakeaways": ["", "", ""],
  "faqs": [{"question": "", "answer": ""}],
  "tags": ["", "", ""],
  "sourceLinks": [{"title": "", "url": "", "publisher": ""}]
}

Rules:
- Write for people first. No keyword stuffing.
- Do not invent client names, statistics, dates or source claims.
- Any claim tied to a trend must be supported by sourceLinks.
- The first 50 words must directly answer the search intent.
- Include 3-5 FAQs only if the article visibly covers the answer.
- Body should use Markdown headings and paragraphs, about 350-650 words.
- Keep status/review fields out of the JSON; the CMS will set them.`;
  }

  const [zh, en] = await Promise.all([
    requestJson(languagePrompt("zh-Hant"), "zh-Hant"),
    requestJson(languagePrompt("en"), "en")
  ]);

  return { pair: assertDeepSeekPair({ zh, en }), model };
}

export async function generateBlogDraftPair(input: BlogGenerateInput = {}) {
  const candidates = await fetchTrendCandidates(input);
  const sources = canonicalSources(candidates);
  const generationDate = taiwanDate();
  const translationGroupId = `tg_${generationDate.replace(/-/g, "")}_${Date.now().toString(36)}`;

  try {
    const generated = await generateWithDeepSeek(input, sources);
    if (!generated) {
      return {
        posts: [
          buildFallbackPost({ input, language: "zh-Hant", translationGroupId, sources, generationDate }),
          buildFallbackPost({ input, language: "en", translationGroupId, sources, generationDate })
        ],
        sources,
        provider: "fallback" as const
      };
    }

    return {
      posts: [
        normalizeGeneratedPost({
          generated: generated.pair.zh,
          input,
          language: "zh-Hant",
          translationGroupId,
          sources,
          generationDate,
          model: generated.model
        }),
        normalizeGeneratedPost({
          generated: generated.pair.en,
          input,
          language: "en",
          translationGroupId,
          sources,
          generationDate,
          model: generated.model
        })
      ],
      sources,
      provider: "deepseek" as const
    };
  } catch (error) {
    return {
      posts: [
        buildFallbackPost({ input, language: "zh-Hant", translationGroupId, sources, generationDate }),
        buildFallbackPost({ input, language: "en", translationGroupId, sources, generationDate })
      ],
      sources,
      provider: "fallback" as const,
      warning: error instanceof Error ? error.message : "DeepSeek provider failed; used local fallback"
    };
  }
}
