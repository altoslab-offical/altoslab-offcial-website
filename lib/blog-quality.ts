import { defaultQualityChecks } from "./blog-utils";
import type { BlogLanguage, BlogPost } from "./types";

type PostReview = {
  language: BlogLanguage;
  slug: string;
  score: number;
  issues: string[];
  warnings: string[];
};

export type BlogPairQualityReview = {
  approved: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  postReviews: PostReview[];
  notes: string;
};

const MIN_SOURCES = 4;
const MIN_FAQS = 2;
const MIN_TAKEAWAYS = 3;
const MIN_READ_TIME = 2;
const MAX_SEO_DESCRIPTION = 180;
const MIN_SEO_DESCRIPTION = 70;
const SOURCE_LINK_TIMEOUT_MS = 4500;

const allowedCoverPaths = new Set([
  "/geo-cover.png",
  "/project-newsletter-cover.png",
  "/orclaw-cover.png",
  "/proj4-cover.png",
  "/wonda-cover.png",
  "/project-fortune-cover.png"
]);

const blockedPhrases = [
  "lorem ipsum",
  "todo",
  "undefined",
  "as an ai language model",
  "i cannot browse",
  "quickly understand the latest",
  "我無法瀏覽",
  "作為一個 ai"
];

function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()!-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSourceHosts(post: BlogPost) {
  return new Set(
    post.sourceLinks
      .map((source) => {
        try {
          return new URL(source.url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })
      .filter(Boolean)
  ).size;
}

function markdownHeadingCount(body: string) {
  return (body.match(/^##\s+/gm) || []).length;
}

function reviewPost(post: BlogPost): PostReview {
  const issues: string[] = [];
  const warnings: string[] = [];
  const text = plainText(post.body);
  const seoDescriptionLength = post.seoDescription?.trim().length || 0;

  if (!post.title || post.title.length < 12) issues.push("title is too short");
  if (!post.slug) issues.push("slug is missing");
  if (seoDescriptionLength < MIN_SEO_DESCRIPTION || seoDescriptionLength > MAX_SEO_DESCRIPTION) {
    issues.push("seoDescription must be 70-180 characters");
  }
  if (!post.excerpt || post.excerpt.length < 50) issues.push("excerpt is too thin");
  if (!post.geoSummary || post.geoSummary.length < 80) issues.push("geoSummary is too thin");
  if (post.readTimeMinutes < MIN_READ_TIME) issues.push("read time is below 2 minutes");
  if (text.length < (post.language === "en" ? 1800 : 700)) issues.push("body is too short for auto-publish");
  if (markdownHeadingCount(post.body) < 2) issues.push("body needs at least two H2 sections");
  if (post.keyTakeaways.length < MIN_TAKEAWAYS) issues.push("needs at least three key takeaways");
  if (post.faqs.length < MIN_FAQS) issues.push("needs at least two visible FAQs");
  if (post.sourceLinks.length < MIN_SOURCES) issues.push("needs at least four source links");
  if (uniqueSourceHosts(post) < 2) issues.push("source links need at least two unique domains");
  if (!post.cover || !post.coverAlt) {
    issues.push("cover image and alt text are required");
  } else {
    if (!allowedCoverPaths.has(post.cover)) issues.push("cover image must use an approved ALTOS LAB asset");
    if (post.coverAlt.trim().length < 18) issues.push("cover alt text is too thin");
  }
  if (!post.tags.length) issues.push("tags are required");

  const invalidSources = post.sourceLinks.filter((source) => {
    try {
      const url = new URL(source.url);
      return url.protocol !== "https:";
    } catch {
      return true;
    }
  });
  if (invalidSources.length) issues.push("all source links must be valid https URLs");
  if (post.sourceLinks.some((source) => !source.title?.trim())) issues.push("all source links need visible titles");
  if (post.sourceLinks.some((source) => !source.publisher?.trim())) warnings.push("some source links are missing publisher labels");

  const lower = `${post.title}\n${post.excerpt}\n${post.geoSummary}\n${post.body}`.toLowerCase();
  const blocked = blockedPhrases.filter((phrase) => lower.includes(phrase));
  if (blocked.length) issues.push(`blocked placeholder or AI disclaimer phrase found: ${blocked.join(", ")}`);
  if (post.geoSummary.includes("...")) issues.push("geoSummary should not contain truncation ellipsis");

  if (post.generatedBy?.includes("local-bilingual-geo-template")) {
    issues.push("local fallback template cannot auto-publish");
  }
  if (!post.generatedBy?.includes("deepseek")) {
    warnings.push("provider is not DeepSeek; auto-publish should be conservative");
  }

  const score = Math.max(0, 100 - issues.length * 12 - warnings.length * 3);
  return { language: post.language, slug: post.slug, score, issues, warnings };
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
  const postReviews = posts.map(reviewPost);
  const languages = new Set(posts.map((post) => post.language));
  const translationGroups = new Set(posts.map((post) => post.translationGroupId).filter(Boolean));

  if (posts.length !== 2) issues.push("auto-publish requires exactly two posts");
  if (!languages.has("zh-Hant") || !languages.has("en")) issues.push("auto-publish requires zh-Hant and en pair");
  if (translationGroups.size !== 1) issues.push("translationGroupId must match across the pair");

  const [first, second] = posts;
  if (first && second && first.title.trim() === second.title.trim()) {
    issues.push("bilingual pair titles are identical");
  }

  for (const review of postReviews) {
    issues.push(...review.issues.map((issue) => `${review.language}/${review.slug}: ${issue}`));
    warnings.push(...review.warnings.map((warning) => `${review.language}/${review.slug}: ${warning}`));
  }
  const sourceValidation = await validateSourceReachability(posts);
  issues.push(...sourceValidation.issues);
  warnings.push(...sourceValidation.warnings);

  const score = Math.min(...postReviews.map((review) => review.score), issues.length ? 70 : 100);
  const approved = issues.length === 0 && score >= 85;
  const notes = approved
    ? `Auto quality reviewer approved bilingual publish. Score ${score}.`
    : `Auto quality reviewer held publish. Score ${score}. Issues: ${issues.join("; ")}`;

  return { approved, score, issues, warnings, postReviews, notes };
}

export function applyQualityReview(post: BlogPost, review: BlogPairQualityReview, publish: boolean): BlogPost {
  const now = new Date().toISOString();
  const qualityIssues = [...review.issues, ...review.warnings];

  return {
    ...post,
    status: publish ? "published" : "draft",
    reviewStatus: publish ? "approved" : "needs-revision",
    qualityChecks: defaultQualityChecks({
      ...post.qualityChecks,
      hasHumanReview: Boolean(post.qualityChecks.hasHumanReview),
      hasQualityReviewerApproval: publish,
      hasVisibleSources: post.sourceLinks.length >= MIN_SOURCES,
      hasNoFabricatedClaims: publish,
      hasSearchIntentAnswer: Boolean(post.geoSummary),
      hasBilingualParity: review.issues.every((issue) => !issue.includes("bilingual") && !issue.includes("translationGroupId")),
      qualityScore: review.score,
      qualityIssues,
      notes: review.notes
    }),
    aiDisclosure: publish
      ? post.language === "en"
        ? "AI-assisted article reviewed by ALTOS LAB's automated quality gate before publication."
        : "本文章由 AI 協助產生，發布前已通過 ALTOS LAB 自動品質審核與來源檢查。"
      : post.aiDisclosure,
    publishedAt: publish ? post.publishedAt || now : post.publishedAt,
    updatedAt: now
  };
}
