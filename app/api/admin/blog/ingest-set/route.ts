import { NextResponse } from "next/server";
import { applyImageQualityReview, reviewBlogImagesForRelease } from "@/lib/blog-image-quality";
import { applyQualityReview, reviewBlogPairForAutoPublish } from "@/lib/blog-quality";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { BLOG_LANGUAGES, taiwanDate } from "@/lib/blog-utils";
import {
  createId,
  getPublishedBlogDuplicatePosts,
  mutateCmsData,
  normalizeBlogPostInput,
  nowIso,
  publishValidationForBlogPost,
  readCmsData
} from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";
import type { BlogGenerationSlot, BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IngestSlot = Extract<BlogGenerationSlot, "morning" | "afternoon">;
type PublishMode = "publish-if-valid" | "draft";

type BlogIngestRequest = {
  ingestRunId?: string;
  slot?: IngestSlot;
  generationDate?: string;
  scheduledFor?: string;
  translationGroupId?: string;
  publishMode?: PublishMode;
  validateOnly?: boolean;
  replaceExistingPublished?: boolean;
  generation?: {
    provider?: "gemini-chatgpt" | "source-translation" | "local-antigravity" | "local";
    model?: string;
    promptVersion?: string;
    sourceCount?: number;
  };
  posts?: Partial<BlogPost>[];
};

const SLOT_CONFIG: Record<IngestSlot, { hour: string }> = {
  morning: { hour: "09:00" },
  afternoon: { hour: "16:00" }
};

function scheduledFor(date: string, slot: IngestSlot) {
  return `${date}T${SLOT_CONFIG[slot].hour}:00+08:00`;
}

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

function isIngestSlot(value: unknown): value is IngestSlot {
  return value === "morning" || value === "afternoon";
}

function isPublishMode(value: unknown): value is PublishMode {
  return value === "publish-if-valid" || value === "draft";
}

function parsePayload(body: string): BlogIngestRequest {
  const payload = JSON.parse(body) as BlogIngestRequest;
  if (!payload || typeof payload !== "object") throw new Error("Request body must be a JSON object");
  return payload;
}

function missingLanguageIssues(posts: BlogPost[]) {
  const issues: string[] = [];
  const languages = posts.map((post) => post.language);
  const isMarketNewsSet = posts.some((post) => post.contentType === "breaking");
  const missingLanguages = BLOG_LANGUAGES.filter((language) => !languages.includes(language));
  for (const language of BLOG_LANGUAGES) {
    if (!languages.includes(language)) issues.push(`missing ${language} article`);
  }
  for (const language of BLOG_LANGUAGES) {
    if (languages.filter((item) => item === language).length > 1) issues.push(`duplicate ${language} article`);
  }
  if (isMarketNewsSet && missingLanguages.length) {
    issues.push(`market news fast lane requires translated versions for every configured language; missing ${missingLanguages.join(", ")}`);
  }
  return issues;
}

function normalizedDuplicateKey(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCoverKey(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return trimmed.toLowerCase();
  }
}

function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const genericStockImageHosts = [
  "unsplash.com",
  "images.unsplash.com",
  "pexels.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "openverse.org",
  "openverse.engineering",
  "api.openverse.org",
  "api.openverse.engineering"
];

function parsedHost(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceHostMatches(creditUrl: string, sourceUrl: string) {
  const creditHost = parsedHost(creditUrl);
  const sourceHost = parsedHost(sourceUrl);
  return Boolean(
    creditHost &&
      sourceHost &&
      (creditHost === sourceHost || creditHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${creditHost}`))
  );
}

function blogSourceLinks(post: Pick<BlogPost, "sourceLinks">) {
  return Array.isArray(post.sourceLinks) ? post.sourceLinks : [];
}

function isGenericStockImageUrl(value?: string) {
  const host = parsedHost(value);
  return Boolean(host && genericStockImageHosts.some((stockHost) => host === stockHost || host.endsWith(`.${stockHost}`)));
}

function sourceCoverCreditMatchesSource(post: BlogPost) {
  return blogSourceLinks(post).some((source) => sourceHostMatches(post.coverCreditUrl || "", source.url));
}

function generationContractIssues(posts: BlogPost[]) {
  return posts.flatMap((post) => {
    const issues: string[] = [];
    const generatedBy = post.generatedBy?.toLowerCase() || "";
    const coverProvider = post.coverGeneration?.provider?.toLowerCase() || "";
    const isMarketNews = post.contentType === "breaking";
    const isSourceTranslatedMarketNews =
      isMarketNews && /source-translation|source_translat|source-worker|codex-market|market-source/.test(generatedBy);

    if (!generatedBy.includes("gemini") && !isSourceTranslatedMarketNews) {
      issues.push(`${post.language}/${post.slug}: article must be drafted or revised through Gemini before ingest`);
    }
    if (isMarketNews) {
      if (post.coverSource !== "source") {
        issues.push(`${post.language}/${post.slug}: market news coverSource must be source, not ${post.coverSource || "missing"}`);
      }
      if (!post.coverCredit?.trim()) {
        issues.push(`${post.language}/${post.slug}: market news source image requires visible coverCredit`);
      }
      if (!isHttpUrl(post.coverCreditUrl)) {
        issues.push(`${post.language}/${post.slug}: market news source image requires a public coverCreditUrl`);
      }
      if (!post.coverLicense?.trim()) {
        issues.push(`${post.language}/${post.slug}: market news source image requires coverLicense/source-rights metadata`);
      }
      if (isGenericStockImageUrl(post.cover) || isGenericStockImageUrl(post.coverCreditUrl)) {
        issues.push(`${post.language}/${post.slug}: market news source image must come from the source article or official announcement, not stock/free image providers`);
      }
      if (!sourceCoverCreditMatchesSource(post)) {
        issues.push(`${post.language}/${post.slug}: market news coverCreditUrl must match one of the sourceLinks`);
      }
    } else {
      if (post.coverSource !== "generated") {
        issues.push(`${post.language}/${post.slug}: non-news coverSource must be generated through ChatGPT/GPT`);
      }
      if (!/(chatgpt|gpt|openai)/i.test(coverProvider)) {
        issues.push(`${post.language}/${post.slug}: generated cover must come from ChatGPT/GPT, not ${post.coverGeneration?.provider || "unknown"}`);
      }
    }
    return issues;
  });
}

function duplicateTopicIssues(posts: BlogPost[], existingPosts: BlogPost[]) {
  const incomingGroupIds = new Set(posts.map((post) => post.translationGroupId));
  const incomingByLanguage = posts.map((post) => ({
    post,
    title: normalizedDuplicateKey(post.title),
    topic: normalizedDuplicateKey(post.topic),
    sources: new Set(blogSourceLinks(post).map((source) => source.url.toLowerCase()))
  }));

  return incomingByLanguage.flatMap(({ post, title, topic, sources }) => {
    const issues: string[] = [];
    for (const existing of existingPosts) {
      if (incomingGroupIds.has(existing.translationGroupId)) continue;
      if (existing.language !== post.language) continue;
      if (existing.status !== "published" && existing.status !== "draft") continue;

      const existingTitle = normalizedDuplicateKey(existing.title);
      const existingTopic = normalizedDuplicateKey(existing.topic);
      const sharedSources = blogSourceLinks(existing).filter((source) => sources.has(source.url.toLowerCase())).length;

      if (existing.slug === post.slug || (title && title === existingTitle)) {
        issues.push(`${post.language}/${post.slug}: duplicates existing article ${existing.slug}`);
      } else if (topic && topic === existingTopic && sharedSources >= 2) {
        issues.push(`${post.language}/${post.slug}: repeats topic/source angle from existing article ${existing.slug}`);
      }
    }
    return issues;
  });
}

function duplicateCoverIssues(posts: BlogPost[], existingPosts: BlogPost[]) {
  const issues: string[] = [];
  const incomingByKey = new Map<string, BlogPost>();
  const incomingGroupIds = new Set(posts.map((post) => post.translationGroupId));

  for (const post of posts) {
    const key = normalizedCoverKey(post.cover || "");
    if (!key) continue;
    const previous = incomingByKey.get(key);
    if (previous && previous.translationGroupId !== post.translationGroupId) {
      issues.push(`${post.language}/${post.slug}: cover image duplicates incoming article ${previous.slug}`);
    }
    incomingByKey.set(key, post);
  }

  for (const post of posts) {
    const key = normalizedCoverKey(post.cover || "");
    if (!key) continue;
    for (const existing of existingPosts) {
      if (incomingGroupIds.has(existing.translationGroupId)) continue;
      if (existing.status !== "published" && existing.status !== "draft") continue;
      if (normalizedCoverKey(existing.cover || "") === key) {
        issues.push(`${post.language}/${post.slug}: cover image repeats existing article ${existing.slug}`);
        break;
      }
    }
  }

  return issues;
}

function normalizeIngestPosts(payload: BlogIngestRequest, slot: IngestSlot, ingestRunId: string) {
  const now = nowIso();
  const generationDate = payload.generationDate || taiwanDate();
  const translationGroupId =
    payload.translationGroupId ||
    payload.posts?.find((post) => post.translationGroupId)?.translationGroupId ||
    createId("translation");
  const scheduled = payload.scheduledFor || scheduledFor(generationDate, slot);
  const provider =
    payload.generation?.provider === "local" || payload.generation?.provider === "local-antigravity"
      ? "local-antigravity"
      : payload.generation?.provider || "gemini-chatgpt";

  return (payload.posts || []).map((post) =>
    normalizeBlogPostInput({
      ...post,
      status: "draft",
      translationGroupId,
      generationDate,
      generationSlot: slot,
      scheduledFor: scheduled,
      generatedAt: post.generatedAt || now,
      generatedBy: post.generatedBy || `external:${slot}:${provider}`,
      ingestRunId,
      qualityStatus: "held",
      imageQualityStatus: "held",
      releaseDecision: "held_for_review",
      generationTrace: [
        ...(post.generationTrace || []),
        {
          provider,
          task: "content-draft",
          model: payload.generation?.model,
          promptVersion: payload.generation?.promptVersion,
          sourceCount: payload.generation?.sourceCount ?? post.sourceLinks?.length,
          attemptedAt: now
        }
      ]
    })
  );
}

function validationSummary(posts: BlogPost[], qualityApproved: boolean, imageApproved: boolean) {
  if (!qualityApproved || !imageApproved) return [];
  return posts.flatMap((post) => publishValidationForBlogPost(post).map((issue) => `${post.language}/${post.slug}: ${issue}`));
}

function isReplaceableIngestDraft(post: BlogPost) {
  return (
    post.status === "draft" &&
    post.releaseDecision !== "published" &&
    !post.qualityChecks.hasHumanReview &&
    !post.qualityChecks.hasQualityReviewerApproval
  );
}

function responseSummary(posts: BlogPost[]) {
  return posts.map((post) => ({
    id: post.id,
    language: post.language,
    slug: post.slug,
    status: post.status,
    qualityStatus: post.qualityStatus,
    imageQualityStatus: post.imageQualityStatus,
    releaseDecision: post.releaseDecision
  }));
}

function isCloudflareBoundedValidate() {
  return process.env.CLOUDFLARE_KV_ENABLED === "1" || process.env.ALTOS_BLOG_BOUNDED_WORKER_VALIDATE === "1";
}

async function existingPostsForDuplicateCheck() {
  if (!isCloudflareBoundedValidate()) return (await readCmsData()).blogPosts;

  const posts = await getPublishedBlogDuplicatePosts();
  if (!posts.length) {
    throw new Error("Cloudflare duplicate cache is empty; refusing validate-only duplicate check");
  }
  return posts;
}

export async function POST(request: Request) {
  const body = await request.text();
  const auth = verifyBlogIngestRequest(request, body);
  if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

  let payload: BlogIngestRequest;
  try {
    payload = parsePayload(body);
  } catch (error) {
    return json(400, { ok: false, error: error instanceof Error ? error.message : "Invalid JSON body" });
  }

  const url = new URL(request.url);
  const validateOnly = payload.validateOnly === true || url.searchParams.get("validateOnly") === "true";
  const slot = isIngestSlot(payload.slot) ? payload.slot : null;
  const publishMode = isPublishMode(payload.publishMode) ? payload.publishMode : "publish-if-valid";
  const ingestRunId = payload.ingestRunId || createId("ingest");
  const inputIssues: string[] = [];

  if (!slot) inputIssues.push("slot must be morning or afternoon");
  if (!Array.isArray(payload.posts)) inputIssues.push("posts must be an array");
  if (payload.generation?.provider !== "gemini-chatgpt" && payload.generation?.provider !== "source-translation") {
    inputIssues.push("generation.provider must be gemini-chatgpt or source-translation");
  }
  if (inputIssues.length || !slot || !Array.isArray(payload.posts)) {
    return json(400, { ok: false, ingestRunId, errors: inputIssues });
  }

  const normalizedPosts = normalizeIngestPosts(payload, slot, ingestRunId);
  const languageIssues = missingLanguageIssues(normalizedPosts);
  const contractIssues = generationContractIssues(normalizedPosts);
  let existingPosts: BlogPost[] = [];
  const duplicateReadIssues: string[] = [];
  try {
    existingPosts = await existingPostsForDuplicateCheck();
  } catch (error) {
    duplicateReadIssues.push(`duplicate check could not read existing blog posts: ${error instanceof Error ? error.message : "CMS read failed"}`);
  }
  const duplicateIssues = duplicateReadIssues.length
    ? duplicateReadIssues
    : [...duplicateTopicIssues(normalizedPosts, existingPosts), ...duplicateCoverIssues(normalizedPosts, existingPosts)];
  if (languageIssues.length || contractIssues.length || duplicateIssues.length) {
    return json(400, { ok: false, ingestRunId, errors: [...languageIssues, ...contractIssues, ...duplicateIssues] });
  }

  const boundedValidate = isCloudflareBoundedValidate();
  const qualityReview = await reviewBlogPairForAutoPublish(normalizedPosts, {
    verifySourceLinks: !boundedValidate
  });
  const imageReview = await reviewBlogImagesForRelease(normalizedPosts, {
    requireGeneratedCoverForNonBreaking: true,
    requireSourceCoverForBreaking: true,
    requireBlobCover: process.env.BLOG_IMAGE_ALLOW_NON_BLOB !== "1",
    verifyRemoteImage: !boundedValidate && process.env.BLOG_IMAGE_VERIFY_REMOTE !== "false",
    allowLocalHttp: process.env.BLOG_IMAGE_ALLOW_LOCAL_HTTP === "1"
  });

  const publishIntent = publishMode === "publish-if-valid";
  const preliminaryCanPublish = publishIntent && qualityReview.approved && imageReview.approved;
  const preliminaryPosts = normalizedPosts.map((post) =>
    applyImageQualityReview(applyQualityReview(post, qualityReview, preliminaryCanPublish), imageReview, preliminaryCanPublish)
  );
  const publishValidationErrors = validationSummary(preliminaryPosts, qualityReview.approved, imageReview.approved);
  const canPublish = preliminaryCanPublish && publishValidationErrors.length === 0;
  const finalPosts = normalizedPosts.map((post) =>
    applyImageQualityReview(applyQualityReview(post, qualityReview, canPublish), imageReview, canPublish)
  );
  const allErrors = [...qualityReview.issues, ...imageReview.issues, ...publishValidationErrors];

  const qualitySummary = {
    approved: qualityReview.approved,
    score: qualityReview.score,
    threshold: qualityReview.threshold,
    issues: qualityReview.issues,
    warnings: qualityReview.warnings
  };
  const imageQualitySummary = {
    approved: imageReview.approved,
    score: imageReview.score,
    threshold: imageReview.threshold,
    issues: imageReview.issues,
    warnings: imageReview.warnings,
    postReviews: imageReview.postReviews
  };

  if (validateOnly) {
    return json(200, {
      ok: true,
      validateOnly: true,
      ingestRunId,
      wouldPublish: canPublish,
      publishedIds: [],
      heldDraftIds: [],
      updatedIds: [],
      errors: allErrors,
      qualitySummary,
      imageQualitySummary,
      posts: responseSummary(finalPosts)
    });
  }

  try {
    const result = await withCmsStorageLock(`blog-ingest-${finalPosts[0]?.translationGroupId || ingestRunId}`, async () =>
      mutateCmsData((data) => {
        const translationGroupId = finalPosts[0]?.translationGroupId;
        const existing = data.blogPosts.filter(
          (post) => post.ingestRunId === ingestRunId || (translationGroupId && post.translationGroupId === translationGroupId)
        );
        const protectedExisting = existing.filter(
          (post) =>
            !isReplaceableIngestDraft(post) &&
            !(
              payload.replaceExistingPublished === true &&
              post.status === "published"
            )
        );
        if (protectedExisting.length) {
          return {
            ok: true,
            skipped: true,
            reason: "Existing published or human-reviewed article set is not replaceable",
            existingIds: protectedExisting.map((post) => post.id),
            posts: existing
          };
        }

        data.blogPosts = data.blogPosts.filter(
          (post) => post.ingestRunId !== ingestRunId && (!translationGroupId || post.translationGroupId !== translationGroupId)
        );
        data.blogPosts.unshift(...finalPosts);
        return {
          ok: true,
          skipped: false,
          posts: finalPosts,
          replacedIds: existing.map((post) => post.id)
        };
      })
    );

    const writtenPosts = result.posts || [];
    return json(result.skipped ? 200 : 201, {
      ok: true,
      skipped: result.skipped,
      reason: result.reason,
      ingestRunId,
      publishedIds: writtenPosts.filter((post) => post.status === "published").map((post) => post.id),
      heldDraftIds: writtenPosts.filter((post) => post.status === "draft").map((post) => post.id),
      updatedIds: result.replacedIds || [],
      errors: allErrors,
      qualitySummary,
      imageQualitySummary,
      posts: responseSummary(writtenPosts),
      event: canPublish ? "blog_ingest_published" : "blog_ingest_quality_held"
    });
  } catch (error) {
    if (error instanceof CmsLockError) {
      return json(202, { ok: true, skipped: true, ingestRunId, reason: error.message });
    }
    return json(500, { ok: false, ingestRunId, error: error instanceof Error ? error.message : "Blog ingest failed" });
  }
}
