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
import type { BlogLlmQualityEvaluation, BlogPost } from "./types";

type JudgePayload = {
  approved?: boolean;
  score?: number;
  issues?: string[];
  warnings?: string[];
  notes?: string;
};

type DeepSeekJudgeResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
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

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return extractJson(fenced[1]);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in judge output");
  return JSON.parse(match[0]);
}

function compactPostForJudge(post: BlogPost) {
  return {
    language: post.language,
    slug: post.slug,
    title: post.title,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    contentType: post.contentType,
    newsCategory: post.newsCategory,
    topic: post.topic,
    geoSummary: post.geoSummary,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    cover: {
      url: post.cover,
      alt: post.coverAlt,
      credit: post.coverCredit,
      license: post.coverLicense
    },
    bodyPreview: post.body.slice(0, 5200)
  };
}

function normalizeJudgePayload(payload: JudgePayload, fallbackThreshold: number, model: string, latencyMs: number): BlogLlmQualityEvaluation {
  const score = Math.max(0, Math.min(100, Math.round(Number(payload.score ?? 0))));
  const threshold = fallbackThreshold;
  const issues = Array.isArray(payload.issues) ? payload.issues.map(String).filter(Boolean).slice(0, 20) : [];
  const warnings = Array.isArray(payload.warnings) ? payload.warnings.map(String).filter(Boolean).slice(0, 20) : [];
  return {
    enabled: true,
    approved: Boolean(payload.approved) && score >= threshold && issues.length === 0,
    score,
    threshold,
    model,
    promptVersion: BLOG_PROMPT_VERSION,
    latencyMs,
    issues,
    warnings,
    notes: payload.notes
  };
}

export async function reviewBlogPairWithDeepSeek(
  posts: BlogPost[],
  deterministicReview: BlogPairQualityReview
): Promise<{ evaluation: BlogLlmQualityEvaluation; traces: ReturnType<typeof createDeepSeekTrace>[] } | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || process.env.BLOG_LLM_REVIEW === "false") return null;

  const model = deepSeekModelForTask("quality-review");
  const timeoutMs = deepSeekTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  const prompt = `Evaluate whether this multilingual ALTOS LAB article set can auto-publish.

Threshold: ${deterministicReview.threshold}
Content type: ${deterministicReview.contentType}
Deterministic score: ${deterministicReview.score}
Deterministic issues:
${deterministicReview.issues.slice(0, 40).map((issue, index) => `${index + 1}. ${issue}`).join("\n") || "none"}

Judge rubric:
- Source-grounded claims: article claims must be supportable by visible sourceLinks. Penalize invented stats, dates, model capabilities or client claims.
- Latest-news fit: if contentType is breaking, it must center on recent source items and state what happened, why it matters and uncertainty.
- ALTOS LAB POV: posts must sound like an AI implementation lab/product studio with practical judgment, not a generic AI news scraper or SEO tool page.
- SEO/GEO: title, meta, opening, headings, FAQ, sources and citable passages must help search engines and AI answer systems understand the content.
- Anti-slop: reject generic hype, meta openings, repeated fixed phrases, thin summaries and keyword stuffing.
- Multilingual parity: zh-Hant, en, ja, ko, id, vi, th, ms and fil should share the same source-backed angle while sounding native.
- Image/license fit: cover metadata must be topic-relevant, legal and credited.

Return one JSON object:
{
  "approved": true,
  "score": 0,
  "issues": [],
  "warnings": [],
  "notes": ""
}

Article set:
${JSON.stringify(posts.map(compactPostForJudge), null, 2)}`;

  try {
    const response = await fetch(`${deepSeekBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: stableDeepSeekSystemPrompt("quality-review") },
          { role: "user", content: prompt }
        ],
        thinking: { type: "disabled" },
        temperature: 0,
        max_tokens: Math.min(3200, deepSeekMaxTokens(4200)),
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(
        `DeepSeek quality judge failed: ${response.status}${errorPayload?.error?.message ? ` ${errorPayload.error.message}` : ""}`
      );
    }

    const payload = (await response.json()) as DeepSeekJudgeResponse;
    const choice = payload.choices?.[0];
    const content = choice?.message?.content || choice?.message?.reasoning_content || "";
    const latencyMs = Date.now() - startedAt;
    const evaluation = normalizeJudgePayload(extractJson(content) as JudgePayload, deterministicReview.threshold, model, latencyMs);
    const trace = createDeepSeekTrace({
      task: "quality-review",
      model,
      startedAt,
      finishReason: choice?.finish_reason,
      usage: payload.usage,
      sourceCount: Array.from(new Set(posts.flatMap((post) => post.sourceLinks.map((source) => source.url)))).length
    });

    return { evaluation, traces: [trace] };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `DeepSeek quality judge timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "DeepSeek quality judge failed";
    const trace = createDeepSeekTrace({
      task: "quality-review",
      model,
      startedAt,
      error: message,
      sourceCount: Array.from(new Set(posts.flatMap((post) => post.sourceLinks.map((source) => source.url)))).length
    });

    return {
      evaluation: {
        enabled: true,
        approved: false,
        score: 0,
        threshold: deterministicReview.threshold,
        model,
        promptVersion: BLOG_PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
        issues: [message],
        warnings: [],
        notes: "LLM judge failure holds auto-publish so low-quality or unreviewed content does not go live."
      },
      traces: [trace]
    };
  } finally {
    clearTimeout(timeout);
  }
}
