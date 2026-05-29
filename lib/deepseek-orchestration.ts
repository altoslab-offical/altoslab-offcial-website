import type { BlogGenerationTrace } from "./types";

export type DeepSeekTask = "source-planning" | "content-draft" | "quality-review" | "quality-repair";

type DeepSeekUsagePayload = {
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

type DeepSeekTelemetryInput = {
  task: DeepSeekTask;
  model: string;
  startedAt: number;
  finishReason?: string;
  usage?: DeepSeekUsagePayload;
  sourceCount?: number;
  error?: string;
};

export const BLOG_PROMPT_VERSION = "altos-blog-v2.0.0";

export function deepSeekBaseUrl() {
  return (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
}

export function deepSeekTimeoutMs() {
  const configured = Number(process.env.DEEPSEEK_TIMEOUT_MS || 45_000);
  return Number.isFinite(configured) ? Math.min(90_000, Math.max(15_000, configured)) : 45_000;
}

export function deepSeekMaxTokens(defaultValue = 7600) {
  const configured = Number(process.env.DEEPSEEK_MAX_TOKENS || defaultValue);
  if (!Number.isFinite(configured)) return defaultValue;
  return Math.min(8000, Math.max(4200, Math.floor(configured)));
}

export function deepSeekModelForTask(task: DeepSeekTask) {
  const routerModel = process.env.DEEPSEEK_ROUTER_MODEL || "deepseek-v4-flash";
  const contentModel = process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-pro";
  const reviewModel = process.env.DEEPSEEK_REVIEW_MODEL || contentModel;
  const repairModel = process.env.DEEPSEEK_REPAIR_MODEL || contentModel;

  if (task === "source-planning") return routerModel;
  if (task === "quality-review") return reviewModel;
  if (task === "quality-repair") return repairModel;
  return contentModel;
}

export function stableDeepSeekSystemPrompt(task: DeepSeekTask) {
  const shared = [
    `prompt_version: ${BLOG_PROMPT_VERSION}`,
    "publisher: ALTOS LAB",
    "role: strict JSON API",
    "rules:",
    "- Return only valid JSON.",
    "- Do not include private reasoning, Markdown fences, YAML, XML or commentary outside JSON.",
    "- Do not invent clients, data, dates, source claims, citations or URLs.",
    "- Keep facts grounded in the supplied source brief.",
    "- Treat SEO/GEO as crawlability, answerability, source clarity, structured data and useful original synthesis."
  ].join("\n");

  if (task === "quality-review") {
    return `${shared}
task: editorial quality judge
judge_dimensions:
- source-grounded claims
- title/meta/search intent fit
- Labs point of view
- anti-AI-slop and originality
- local-language quality
- image/source/license fit`;
  }

  if (task === "quality-repair") {
    return `${shared}
task: targeted editorial repair
repair_policy:
- Fix only failed checks.
- Preserve source URLs, angle and multilingual parity.
- Strengthen specificity, openings, tables, FAQ, source grounding and Labs POV.`;
  }

  if (task === "source-planning") {
    return `${shared}
task: source planning and trend triage
planning_policy:
- Prefer official and high-authority fresh sources.
- Mark market news separately from evergreen interpretation.
- Never copy source wording.`;
  }

  return `${shared}
task: multilingual editorial drafting
draft_policy:
- Write original ALTOS LAB synthesis from sources.
- Combine latest news signals with Labs implementation judgment.
- Create citable passages, direct-answer openings, useful headings, FAQ and image metadata.`;
}

export function deepSeekUsageFromPayload(usage?: DeepSeekUsagePayload): BlogGenerationTrace["usage"] | undefined {
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    promptCacheHitTokens: usage.prompt_cache_hit_tokens,
    promptCacheMissTokens: usage.prompt_cache_miss_tokens,
    reasoningTokens: usage.reasoning_tokens ?? usage.completion_tokens_details?.reasoning_tokens
  };
}

export function createDeepSeekTrace(input: DeepSeekTelemetryInput): BlogGenerationTrace {
  return {
    provider: "deepseek",
    task: input.task,
    model: input.model,
    promptVersion: BLOG_PROMPT_VERSION,
    latencyMs: Math.max(0, Date.now() - input.startedAt),
    finishReason: input.finishReason,
    usage: deepSeekUsageFromPayload(input.usage),
    sourceCount: input.sourceCount,
    error: input.error,
    attemptedAt: new Date(input.startedAt).toISOString()
  };
}
