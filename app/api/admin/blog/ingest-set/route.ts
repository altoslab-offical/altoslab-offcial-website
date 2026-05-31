import { NextResponse } from "next/server";
import { applyImageQualityReview, reviewBlogImagesForRelease } from "@/lib/blog-image-quality";
import { applyQualityReview, reviewBlogPairForAutoPublish } from "@/lib/blog-quality";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { BLOG_LANGUAGES, taiwanDate } from "@/lib/blog-utils";
import { createId, mutateCmsData, normalizeBlogPostInput, nowIso, publishValidationForBlogPost } from "@/lib/cms";
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
  generation?: {
    provider?: "local-antigravity" | "local";
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
  for (const language of BLOG_LANGUAGES) {
    if (!languages.includes(language)) issues.push(`missing ${language} article`);
  }
  for (const language of BLOG_LANGUAGES) {
    if (languages.filter((item) => item === language).length > 1) issues.push(`duplicate ${language} article`);
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
  const provider = payload.generation?.provider === "local" ? "local-antigravity" : payload.generation?.provider || "local-antigravity";

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
  if (payload.generation?.provider && payload.generation.provider !== "local-antigravity" && payload.generation.provider !== "local") {
    inputIssues.push("generation.provider must be local-antigravity");
  }
  if (inputIssues.length || !slot || !Array.isArray(payload.posts)) {
    return json(400, { ok: false, ingestRunId, errors: inputIssues });
  }

  const normalizedPosts = normalizeIngestPosts(payload, slot, ingestRunId);
  const languageIssues = missingLanguageIssues(normalizedPosts);
  if (languageIssues.length) {
    return json(400, { ok: false, ingestRunId, errors: languageIssues });
  }

  const qualityReview = await reviewBlogPairForAutoPublish(normalizedPosts);
  const imageReview = await reviewBlogImagesForRelease(normalizedPosts, {
    requireGeneratedCover: true,
    requireBlobCover: process.env.BLOG_IMAGE_ALLOW_NON_BLOB !== "1",
    verifyRemoteImage: process.env.BLOG_IMAGE_VERIFY_REMOTE !== "false",
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
        const protectedExisting = existing.filter((post) => !isReplaceableIngestDraft(post));
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
