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

const blockedPhrases = [
  "lorem ipsum",
  "todo",
  "undefined",
  "as an ai language model",
  "i cannot browse",
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
  if (!post.cover || !post.coverAlt) issues.push("cover image and alt text are required");
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

  const lower = `${post.title}\n${post.excerpt}\n${post.body}`.toLowerCase();
  const blocked = blockedPhrases.filter((phrase) => lower.includes(phrase));
  if (blocked.length) issues.push(`blocked placeholder or AI disclaimer phrase found: ${blocked.join(", ")}`);

  if (post.generatedBy?.includes("local-bilingual-geo-template")) {
    issues.push("local fallback template cannot auto-publish");
  }
  if (!post.generatedBy?.includes("deepseek")) {
    warnings.push("provider is not DeepSeek; auto-publish should be conservative");
  }

  const score = Math.max(0, 100 - issues.length * 12 - warnings.length * 3);
  return { language: post.language, slug: post.slug, score, issues, warnings };
}

export function reviewBlogPairForAutoPublish(posts: BlogPost[]): BlogPairQualityReview {
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
    publishedAt: publish ? post.publishedAt || now : post.publishedAt,
    updatedAt: now
  };
}
