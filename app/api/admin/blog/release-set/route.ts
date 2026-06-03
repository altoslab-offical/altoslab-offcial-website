import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { normalizeBlogAuthor, publicEditorialReviewNote } from "@/lib/blog-authors";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { multilingualCoverConsistencyIssues } from "@/lib/blog-image-quality";
import { BLOG_LANGUAGES, defaultQualityChecks, taiwanDate } from "@/lib/blog-utils";
import { createId, mutateRawCmsData, normalizeBlogPostInput, nowIso, publishValidationForBlogPost } from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";
import type { BlogGenerationSlot, BlogPost } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RELEASE_BODY_BYTES = 850_000;

type IngestSlot = Extract<BlogGenerationSlot, "morning" | "afternoon">;

type ReleaseSummary = {
  approved?: boolean;
  score?: number;
  threshold?: number;
  issues?: string[];
  warnings?: string[];
};

type BlogReleaseRequest = {
  ingestRunId?: string;
  slot?: IngestSlot;
  generationDate?: string;
  scheduledFor?: string;
  translationGroupId?: string;
  publishMode?: "publish-if-valid";
  replaceExistingPublished?: boolean;
  generation?: {
    provider?: "gemini-chatgpt" | "local-antigravity" | "local";
    model?: string;
    promptVersion?: string;
    sourceCount?: number;
  };
  qualityManifest?: {
    gateVersion?: string;
    reviewer?: string;
    reviewedAt?: string;
    contentSha256?: string;
    posts?: {
      language?: string;
      slug?: string;
      bodySha256?: string;
      cover?: string;
      contentImages?: string[];
    }[];
    qualitySummary?: ReleaseSummary;
    imageQualitySummary?: ReleaseSummary;
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

function parsePayload(body: string): BlogReleaseRequest {
  const payload = JSON.parse(body) as BlogReleaseRequest;
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

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestSourcePost(post: Partial<BlogPost>) {
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
    audience: post.audience,
    geoSummary: post.geoSummary,
    body: post.body,
    keyTakeaways: post.keyTakeaways,
    faqs: post.faqs,
    sourceLinks: post.sourceLinks,
    tags: post.tags,
    author: post.author,
    cover: post.cover,
    coverAlt: post.coverAlt,
    coverSource: post.coverSource,
    coverGeneration: post.coverGeneration,
    coverCredit: post.coverCredit,
    coverCreditUrl: post.coverCreditUrl,
    coverLicense: post.coverLicense,
    coverLicenseUrl: post.coverLicenseUrl,
    contentImages: post.contentImages,
    aiDisclosure: post.aiDisclosure
  };
}

function releaseContentSha256(payload: BlogReleaseRequest) {
  const posts = [...(payload.posts || [])]
    .map(digestSourcePost)
    .sort((a, b) => String(a.language || "").localeCompare(String(b.language || "")));
  return sha256(
    stableJson({
      translationGroupId: payload.translationGroupId || payload.posts?.find((post) => post.translationGroupId)?.translationGroupId,
      slot: payload.slot,
      generationDate: payload.generationDate,
      scheduledFor: payload.scheduledFor,
      posts
    })
  );
}

function bodySha256(post: Partial<BlogPost>) {
  return sha256(String(post.body || ""));
}

function isLocalOrHttpCoverUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isPublicHttpsUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isColumnOrFeature(post: Partial<BlogPost>) {
  return post.contentType === "column" || post.contentType === "feature";
}

function releaseCoverContractIssues(posts: Partial<BlogPost>[] = []) {
  const issues = multilingualCoverConsistencyIssues(posts);
  const columnPosts = posts.filter(isColumnOrFeature);
  if (columnPosts.length) {
    const counts = [...new Set(columnPosts.map((post) => (Array.isArray(post.contentImages) ? post.contentImages.length : 0)))];
    if (counts.length !== 1) {
      issues.push(`translated column/feature posts must share the same content image count, got ${counts.join(", ")}`);
    }
    const expectedCount = counts[0] || 0;
    if (expectedCount < 2) issues.push("column/feature posts require at least two in-article images");
    if (expectedCount > 3) issues.push("column/feature posts should keep in-article images to three or fewer");
    for (let index = 0; index < expectedCount; index += 1) {
      const urls = [...new Set(columnPosts.map((post) => post.contentImages?.[index]?.url).filter(Boolean))];
      if (urls.length !== 1) {
        issues.push(`translated column/feature posts must share contentImages[${index}] URL, got ${urls.join(", ") || "missing"}`);
      }
    }
  }
  for (const post of posts) {
    if (isLocalOrHttpCoverUrl(post.cover)) {
      issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} release cover must use a public https URL, not localhost or http`);
    }
    if (isColumnOrFeature(post)) {
      const contentImages = Array.isArray(post.contentImages) ? post.contentImages : [];
      if (contentImages.length < 2) issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} column/feature requires at least two in-article images`);
      if (contentImages.length > 3) issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} column/feature should use no more than three in-article images`);
      for (const [index, image] of contentImages.entries()) {
        const label = `${post.language || "unknown"}/${post.slug || "missing-slug"} contentImages[${index}]`;
        if (!isPublicHttpsUrl(image?.url)) issues.push(`${label}: URL must be public https`);
        if (image?.source !== "generated") issues.push(`${label}: source must be generated`);
        if (!/(chatgpt|gpt|openai)/i.test(String(image?.provider || ""))) issues.push(`${label}: provider must be ChatGPT/GPT`);
        if (!image?.prompt || String(image.prompt).length < 40) issues.push(`${label}: prompt metadata is missing or too thin`);
        if (!image?.generatedAt) issues.push(`${label}: generatedAt is missing`);
        if (!image?.alt || String(image.alt).length < 18) issues.push(`${label}: alt is missing or too thin`);
        if (!image?.caption) issues.push(`${label}: caption is missing`);
        if (!image?.credit) issues.push(`${label}: credit is missing`);
        const visualChecks = image?.visualChecks || {};
        for (const key of ["topicFit", "noTextArtifacts", "noLogos", "noPeople", "noTrademarkRisk", "noGenericStockLook"]) {
          if ((visualChecks as Record<string, unknown>)[key] !== true) issues.push(`${label}: visualChecks.${key} must be true`);
        }
      }
    }
  }
  return issues;
}

function releaseManifestIssues(payload: BlogReleaseRequest) {
  const issues: string[] = [];
  const manifest = payload.qualityManifest;
  const quality = manifest?.qualitySummary;
  const image = manifest?.imageQualitySummary;

  if (!manifest?.gateVersion) issues.push("qualityManifest.gateVersion is required");
  if (!manifest?.reviewer) issues.push("qualityManifest.reviewer is required");
  if (!manifest?.reviewedAt) issues.push("qualityManifest.reviewedAt is required");
  if (!manifest?.contentSha256) {
    issues.push("qualityManifest.contentSha256 is required");
  } else if (manifest.contentSha256 !== releaseContentSha256(payload)) {
    issues.push("qualityManifest.contentSha256 does not match release payload");
  }
  if (!Array.isArray(manifest?.posts)) {
    issues.push("qualityManifest.posts is required");
  } else {
    for (const post of payload.posts || []) {
      const manifestPost = manifest.posts.find((item) => item.language === post.language && item.slug === post.slug);
      if (!manifestPost) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} missing qualityManifest post digest`);
      } else if (manifestPost.bodySha256 !== bodySha256(post)) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} bodySha256 does not match release payload`);
      } else if (manifestPost.cover !== post.cover) {
        issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} cover URL does not match release payload`);
      } else if (isColumnOrFeature(post)) {
        const manifestContentImages = Array.isArray(manifestPost.contentImages) ? manifestPost.contentImages : [];
        const payloadContentImages = Array.isArray(post.contentImages) ? post.contentImages.map((image) => image.url).filter(Boolean) : [];
        if (JSON.stringify(manifestContentImages) !== JSON.stringify(payloadContentImages)) {
          issues.push(`${post.language || "unknown"}/${post.slug || "missing-slug"} contentImages URLs do not match release payload`);
        }
      }
    }
  }
  if (quality?.approved !== true) issues.push("qualityManifest.qualitySummary.approved must be true");
  if (typeof quality?.score !== "number") issues.push("qualityManifest.qualitySummary.score is required");
  if (typeof quality?.threshold !== "number") issues.push("qualityManifest.qualitySummary.threshold is required");
  if (typeof quality?.score === "number" && typeof quality?.threshold === "number" && quality.score < quality.threshold) {
    issues.push("qualityManifest.qualitySummary.score must meet threshold");
  }
  if (Array.isArray(quality?.issues) && quality.issues.length > 0) {
    issues.push("qualityManifest.qualitySummary.issues must be empty");
  }
  if (image?.approved !== true) issues.push("qualityManifest.imageQualitySummary.approved must be true");
  if (typeof image?.score !== "number") issues.push("qualityManifest.imageQualitySummary.score is required");
  if (typeof image?.threshold !== "number") issues.push("qualityManifest.imageQualitySummary.threshold is required");
  if (typeof image?.score === "number" && typeof image?.threshold === "number" && image.score < image.threshold) {
    issues.push("qualityManifest.imageQualitySummary.score must meet threshold");
  }
  if (Array.isArray(image?.issues) && image.issues.length > 0) {
    issues.push("qualityManifest.imageQualitySummary.issues must be empty");
  }
  issues.push(...releaseCoverContractIssues(payload.posts || []));

  return issues;
}

function normalizeReleasePosts(payload: BlogReleaseRequest, slot: IngestSlot, ingestRunId: string) {
  const now = nowIso();
  const generationDate = payload.generationDate || taiwanDate();
  const translationGroupId =
    payload.translationGroupId ||
    payload.posts?.find((post) => post.translationGroupId)?.translationGroupId ||
    createId("translation");
  const scheduled = payload.scheduledFor || scheduledFor(generationDate, slot);
  const provider =
    payload.generation?.provider === "local" || payload.generation?.provider === "local-antigravity"
      ? "gemini-chatgpt"
      : payload.generation?.provider || "gemini-chatgpt";
  const qualityScore = payload.qualityManifest?.qualitySummary?.score;
  const notes = `Release approved by ${payload.qualityManifest?.reviewer || "ALTOS LAB quality gate"} at ${
    payload.qualityManifest?.reviewedAt || now
  }.`;

  return (payload.posts || []).map((post) => {
    const normalized = normalizeBlogPostInput({
      ...post,
      status: "draft",
      author: normalizeBlogAuthor(post.author, { slot, seed: translationGroupId }),
      translationGroupId,
      generationDate,
      generationSlot: slot,
      scheduledFor: scheduled,
      generatedAt: post.generatedAt || now,
      generatedBy: post.generatedBy || `external:${slot}:${provider}`,
      ingestRunId,
      qualityStatus: "passed",
      imageQualityStatus: "held",
      releaseDecision: "held_for_review",
      reviewStatus: "approved",
      qualityIssues: [],
      generationTrace: [
        ...(post.generationTrace || []),
        {
          provider,
          task: "quality-review",
          model: payload.generation?.model,
          promptVersion: payload.generation?.promptVersion,
          sourceCount: payload.generation?.sourceCount ?? post.sourceLinks?.length,
          attemptedAt: now
        }
      ]
    });

    return normalizeBlogPostInput({
      ...normalized,
      aiDisclosure: publicEditorialReviewNote(normalized.language),
      qualityChecks: defaultQualityChecks({
        ...normalized.qualityChecks,
        hasHumanReview: Boolean(normalized.qualityChecks.hasHumanReview),
        hasQualityReviewerApproval: true,
        hasVisibleSources: normalized.sourceLinks.length > 0,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: Boolean(normalized.geoSummary),
        hasBilingualParity: true,
        hasSourceTrust: true,
        hasLabsPointOfView: true,
        hasCreativeAngle: true,
        hasReaderEngagement: true,
        hasImageFit: false,
        hasAntiSlopReview: true,
        qualityScore,
        qualityIssues: [],
        antiSlopScore: Math.max(35, Number(normalized.qualityChecks.antiSlopScore || 40)),
        antiSlopIssues: [],
        notes: [normalized.qualityChecks.notes, notes].filter(Boolean).join("\n")
      })
    });
  });
}

function summaryIssues(summary?: ReleaseSummary) {
  return Array.isArray(summary?.issues) ? summary.issues : [];
}

function summaryWarnings(summary?: ReleaseSummary) {
  return Array.isArray(summary?.warnings) ? summary.warnings : [];
}

function manifestReleaseNotes(payload: BlogReleaseRequest) {
  const quality = payload.qualityManifest?.qualitySummary;
  const image = payload.qualityManifest?.imageQualitySummary;
  return [
    `Release approved by ${payload.qualityManifest?.reviewer || "ALTOS LAB quality gate"} at ${
      payload.qualityManifest?.reviewedAt || nowIso()
    }.`,
    `Signed release manifest passed: article ${quality?.score ?? "n/a"}/${quality?.threshold ?? "n/a"}, image ${
      image?.score ?? "n/a"
    }/${image?.threshold ?? "n/a"}.`
  ].join(" ");
}

function applyManifestReleaseReview(post: BlogPost, payload: BlogReleaseRequest, publish: boolean) {
  const quality = payload.qualityManifest?.qualitySummary;
  const image = payload.qualityManifest?.imageQualitySummary;
  const qualityIssues = [...summaryIssues(quality), ...summaryWarnings(quality), ...summaryIssues(image), ...summaryWarnings(image)];
  const notes = manifestReleaseNotes(payload);

  return releasePost(
    normalizeBlogPostInput({
      ...post,
      qualityStatus: quality?.approved ? "passed" : "held",
      imageQualityStatus: image?.approved ? "passed" : "held",
      releaseDecision: publish ? "published" : "held_for_review",
      reviewStatus: publish ? "approved" : "needs-revision",
      qualityIssues,
      qualityChecks: defaultQualityChecks({
        ...post.qualityChecks,
        hasHumanReview: Boolean(post.qualityChecks.hasHumanReview),
        hasQualityReviewerApproval: publish,
        hasVisibleSources: post.sourceLinks.length > 0,
        hasNoFabricatedClaims: publish,
        hasSearchIntentAnswer: Boolean(post.geoSummary),
        hasBilingualParity: publish,
        hasSourceTrust: publish,
        hasLabsPointOfView: publish,
        hasCreativeAngle: publish,
        hasReaderEngagement: publish,
        hasImageFit: image?.approved === true,
        hasAntiSlopReview: publish,
        qualityScore: quality?.score,
        qualityIssues,
        antiSlopScore: Math.max(35, Number(post.qualityChecks.antiSlopScore || 40)),
        antiSlopIssues: [],
        notes: [post.qualityChecks.notes, notes].filter(Boolean).join("\n")
      })
    }),
    publish
  );
}

function validationSummary(posts: BlogPost[]) {
  return posts.flatMap((post) => publishValidationForBlogPost(post).map((issue) => `${post.language}/${post.slug}: ${issue}`));
}

function releasePost(post: BlogPost, publish: boolean) {
  const now = nowIso();
  return {
    ...post,
    status: publish ? "published" : "draft",
    reviewStatus: publish ? "approved" : "needs-revision",
    releaseDecision: publish ? "published" : "held_for_review",
    publishedAt: publish ? post.publishedAt || now : post.publishedAt,
    updatedAt: now
  } satisfies BlogPost;
}

function isReplaceableIngestDraft(post: BlogPost) {
  return (
    post.status === "draft" &&
    post.releaseDecision !== "published" &&
    !post.qualityChecks.hasHumanReview &&
    !post.qualityChecks.hasQualityReviewerApproval
  );
}

function isReplaceablePublishedQualityRefresh(post: BlogPost, payload: BlogReleaseRequest) {
  return (
    payload.replaceExistingPublished === true &&
    post.status === "published" &&
    post.releaseDecision === "published" &&
    !post.qualityChecks.hasHumanReview &&
    post.generatedBy?.startsWith("external:") === true
  );
}

function isReplaceableExistingPost(post: BlogPost, payload: BlogReleaseRequest) {
  return isReplaceableIngestDraft(post) || isReplaceablePublishedQualityRefresh(post, payload);
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
  if (new TextEncoder().encode(body).byteLength > MAX_RELEASE_BODY_BYTES) {
    return json(413, { ok: false, error: "Blog release payload is too large" });
  }
  const auth = verifyBlogIngestRequest(request, body);
  if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

  let payload: BlogReleaseRequest;
  try {
    payload = parsePayload(body);
  } catch (error) {
    return json(400, { ok: false, error: error instanceof Error ? error.message : "Invalid JSON body" });
  }

  const slot = isIngestSlot(payload.slot) ? payload.slot : null;
  const ingestRunId = payload.ingestRunId || createId("ingest");
  const inputIssues: string[] = [];

  if (!slot) inputIssues.push("slot must be morning or afternoon");
  if (payload.publishMode !== "publish-if-valid") inputIssues.push("publishMode must be publish-if-valid");
  if (!Array.isArray(payload.posts)) inputIssues.push("posts must be an array");
  if (Array.isArray(payload.posts) && payload.posts.length !== BLOG_LANGUAGES.length) {
    inputIssues.push(`posts must contain exactly ${BLOG_LANGUAGES.length} language versions`);
  }
  if (
    payload.generation?.provider &&
    payload.generation.provider !== "gemini-chatgpt" &&
    payload.generation.provider !== "local-antigravity" &&
    payload.generation.provider !== "local"
  ) {
    inputIssues.push("generation.provider must be gemini-chatgpt");
  }
  inputIssues.push(...releaseManifestIssues(payload));
  if (inputIssues.length || !slot || !Array.isArray(payload.posts)) {
    return json(400, { ok: false, ingestRunId, errors: inputIssues });
  }

  const normalizedPosts = normalizeReleasePosts(payload, slot, ingestRunId);
  const languageIssues = missingLanguageIssues(normalizedPosts);
  if (languageIssues.length) {
    return json(400, { ok: false, ingestRunId, errors: languageIssues });
  }

  const qualitySummary = {
    approved: payload.qualityManifest?.qualitySummary?.approved === true,
    score: payload.qualityManifest?.qualitySummary?.score,
    threshold: payload.qualityManifest?.qualitySummary?.threshold,
    issues: summaryIssues(payload.qualityManifest?.qualitySummary),
    warnings: summaryWarnings(payload.qualityManifest?.qualitySummary),
    gateVersion: payload.qualityManifest?.gateVersion,
    reviewer: payload.qualityManifest?.reviewer,
    contentSha256: payload.qualityManifest?.contentSha256
  };
  const imageQualitySummary = {
    approved: payload.qualityManifest?.imageQualitySummary?.approved === true,
    score: payload.qualityManifest?.imageQualitySummary?.score,
    threshold: payload.qualityManifest?.imageQualitySummary?.threshold,
    issues: summaryIssues(payload.qualityManifest?.imageQualitySummary),
    warnings: summaryWarnings(payload.qualityManifest?.imageQualitySummary),
    gateVersion: payload.qualityManifest?.gateVersion,
    reviewer: payload.qualityManifest?.reviewer,
    contentSha256: payload.qualityManifest?.contentSha256
  };
  const preliminaryCanPublish = qualitySummary.approved && imageQualitySummary.approved;
  const preliminaryPosts = normalizedPosts.map((post) => applyManifestReleaseReview(post, payload, preliminaryCanPublish));
  const publishValidationErrors = preliminaryCanPublish ? validationSummary(preliminaryPosts) : [];
  const canPublish = preliminaryCanPublish && publishValidationErrors.length === 0;
  const finalPosts = normalizedPosts.map((post) => applyManifestReleaseReview(post, payload, canPublish));
  const allErrors = [...qualitySummary.issues, ...imageQualitySummary.issues, ...publishValidationErrors];

  try {
    const result = await withCmsStorageLock(`blog-release-${finalPosts[0]?.translationGroupId || ingestRunId}`, async () =>
      mutateRawCmsData((data) => {
        const translationGroupId = finalPosts[0]?.translationGroupId;
        const existing = data.blogPosts.filter(
          (post) => post.ingestRunId === ingestRunId || (translationGroupId && post.translationGroupId === translationGroupId)
        );
        const protectedExisting = existing.filter((post) => !isReplaceableExistingPost(post, payload));
        if (protectedExisting.length) {
          const protectedLanguages = new Set(protectedExisting.map((post) => post.language));
          const protectedSlugs = new Set(protectedExisting.map((post) => post.slug));
          const additivePosts = finalPosts.filter(
            (post) => !protectedLanguages.has(post.language) && !protectedSlugs.has(post.slug)
          );
          if (additivePosts.length) {
            const additiveLanguages = new Set(additivePosts.map((post) => post.language));
            const additiveSlugs = new Set(additivePosts.map((post) => post.slug));
            const removedIds: string[] = [];
            data.blogPosts = data.blogPosts.filter((post) => {
              const inExistingSet = post.ingestRunId === ingestRunId || (translationGroupId && post.translationGroupId === translationGroupId);
              if (!inExistingSet) return true;
              if (protectedExisting.some((protectedPost) => protectedPost.id === post.id)) return true;
              const shouldRemove = additiveLanguages.has(post.language) || additiveSlugs.has(post.slug);
              if (shouldRemove) removedIds.push(post.id);
              return !shouldRemove;
            });
            data.blogPosts.unshift(...additivePosts);
            return {
              ok: true,
              skipped: false,
              reason: "Protected existing posts kept; missing language versions added",
              posts: [...protectedExisting, ...additivePosts],
              replacedIds: removedIds
            };
          }
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
      event: canPublish ? "blog_release_published" : "blog_release_held"
    });
  } catch (error) {
    if (error instanceof CmsLockError) {
      return json(202, { ok: true, skipped: true, ingestRunId, reason: error.message });
    }
    return json(500, { ok: false, ingestRunId, error: error instanceof Error ? error.message : "Blog release failed" });
  }
}
