import { NextResponse } from "next/server";
import { generateBlogDraftPair, repairBlogPostsWithDeepSeek } from "@/lib/blog-generation";
import { applyQualityReview, reviewBlogPairForAutoPublish, withLlmQualityEvaluation } from "@/lib/blog-quality";
import { reviewBlogPairWithDeepSeek } from "@/lib/blog-llm-review";
import { pickEditorialBrief } from "@/lib/blog-source-registry";
import { BLOG_LANGUAGES, taiwanDate } from "@/lib/blog-utils";
import { mutateCmsData, nowIso, readCmsData } from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";
import type { BlogContentType, BlogGenerationSlot, BlogPost } from "@/lib/types";

type CronSlot = Extract<BlogGenerationSlot, "morning" | "afternoon">;

const SLOT_CONFIG: Record<CronSlot, { hour: string }> = {
  morning: {
    hour: "09:00"
  },
  afternoon: {
    hour: "16:00"
  }
};

function requestSecret(request: Request) {
  const url = new URL(request.url);
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || request.headers.get("x-cron-secret") || url.searchParams.get("secret") || "";
}

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

function taiwanHour(input = new Date()) {
  const tw = new Date(input.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  return tw.getHours();
}

function inferSlot(request: Request): CronSlot {
  const url = new URL(request.url);
  const slot = url.searchParams.get("slot");
  if (slot === "morning" || slot === "afternoon") return slot;
  return taiwanHour() < 12 ? "morning" : "afternoon";
}

function scheduledFor(date: string, slot: CronSlot) {
  return `${date}T${SLOT_CONFIG[slot].hour}:00+08:00`;
}

function shouldAutoPublish() {
  return process.env.AUTO_PUBLISH_BLOG !== "false";
}

function shouldRunLegacyDeepSeekCron() {
  return process.env.BLOG_DISABLE_DEEPSEEK_CRON === "false";
}

function isSlotCronPost(post: BlogPost, date: string, slot: CronSlot) {
  return post.generationDate === date && post.generationSlot === slot && post.generatedBy?.startsWith("cron:");
}

function isReplaceableAutoDraft(post: BlogPost) {
  return (
    post.status === "draft" &&
    post.reviewStatus === "ai-draft" &&
    !post.qualityChecks.hasHumanReview &&
    !post.qualityChecks.hasQualityReviewerApproval
  );
}

function coverGenerationSummary(generated: Awaited<ReturnType<typeof generateBlogDraftPair>>["coverGeneration"]) {
  if (!generated) return undefined;
  return {
    generated: generated.generated,
    failed: generated.failed,
    warnings: generated.warnings
  };
}

export async function runBlogDraftCron(request: Request, forcedSlot?: CronSlot) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return unauthorized("CRON_SECRET is not configured");
  if (requestSecret(request) !== configuredSecret) return unauthorized();

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const slot = forcedSlot || inferSlot(request);

  if (!shouldRunLegacyDeepSeekCron()) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "Legacy DeepSeek blog cron is disabled. Use the signed local Antigravity ingest pipeline.",
        generationSlot: slot
      },
      { status: 200 }
    );
  }

  try {
    const result = await withCmsStorageLock(`blog-drafts-${slot}`, async () => {
      const date = taiwanDate();
      const editorialBrief = pickEditorialBrief(slot, new Date(`${date}T00:00:00+08:00`));
      const generationInput = {
        topic: editorialBrief.topic,
        audience: "business owners, operators and marketing teams evaluating AI implementation",
        intent: editorialBrief.intent,
        slot,
        contentType: editorialBrief.contentType,
        newsCategory: editorialBrief.newsCategory,
        generationDate: date
      } satisfies {
        topic: string;
        audience: string;
        intent: string;
        slot: CronSlot;
        contentType: BlogContentType;
        newsCategory: string;
        generationDate: string;
      };
      const data = await readCmsData();
      const existingSlotPosts = data.blogPosts.filter((post) => isSlotCronPost(post, date, slot));
      const existingCount = existingSlotPosts.length;
      const canReplaceExistingAutoDrafts =
        existingCount >= BLOG_LANGUAGES.length && existingSlotPosts.every((post) => isReplaceableAutoDraft(post));

      if (existingCount >= BLOG_LANGUAGES.length && !dryRun && !canReplaceExistingAutoDrafts) {
        return {
          ok: true,
          skipped: true,
          reason: `${slot} multilingual article set already exists`,
          generationDate: date,
          generationSlot: slot,
          created: 0
        };
      }

      const generated = await generateBlogDraftPair(generationInput);

      let preparedPosts = generated.posts.map((post) => ({
        ...post,
        status: "draft" as const,
        generationSlot: slot,
        scheduledFor: scheduledFor(date, slot),
        generatedAt: post.generatedAt || nowIso(),
        generatedBy: `cron:${slot}:${post.generatedBy || generated.provider}`
      }));
      let qualityReview = await reviewBlogPairForAutoPublish(preparedPosts);
      let repairAttempts = 0;
      const repairWarnings: string[] = [];

      while (shouldAutoPublish() && !qualityReview.approved && repairAttempts < 2 && generated.provider === "deepseek") {
        repairAttempts += 1;
        const repaired = await repairBlogPostsWithDeepSeek(preparedPosts, qualityReview, generationInput);
        if (!repaired.repaired) {
          if (repaired.warning) repairWarnings.push(repaired.warning);
          break;
        }
        preparedPosts = repaired.posts.map((post) => ({
          ...post,
          status: "draft" as const,
          generationSlot: slot,
          scheduledFor: scheduledFor(date, slot),
          generatedAt: post.generatedAt || nowIso(),
          generatedBy: `cron:${slot}:${post.generatedBy || generated.provider}:repair-${repairAttempts}`
        }));
        qualityReview = await reviewBlogPairForAutoPublish(preparedPosts);
      }

      if (shouldAutoPublish() && qualityReview.approved && generated.provider === "deepseek") {
        const llmReview = await reviewBlogPairWithDeepSeek(preparedPosts, qualityReview);
        if (llmReview) {
          preparedPosts = preparedPosts.map((post) => ({
            ...post,
            generationTrace: [...(post.generationTrace || []), ...llmReview.traces]
          }));
          qualityReview = withLlmQualityEvaluation(qualityReview, llmReview.evaluation);
        }
      }
      const canPublish = shouldAutoPublish() && qualityReview.approved;

      if (dryRun) {
        return {
          ok: true,
          dryRun: true,
          skipped: false,
          generationDate: date,
          generationSlot: slot,
          scheduledFor: scheduledFor(date, slot),
          created: 0,
          published: 0,
          wouldPublish: canPublish,
          provider: generated.provider,
          warning: generated.warning,
          coverGeneration: coverGenerationSummary(generated.coverGeneration),
          sourceCount: generated.sources.length,
          contentType: editorialBrief.contentType,
          newsCategory: editorialBrief.newsCategory,
          newsRatio: editorialBrief.newsRatio,
          repairAttempts,
          repairWarnings,
          publishMode: canPublish ? "auto-published" : shouldAutoPublish() ? "quality-held" : "draft-review",
          qualityReview: {
            approved: qualityReview.approved,
            score: qualityReview.score,
            issues: qualityReview.issues,
            warnings: qualityReview.warnings,
            llmEvaluation: qualityReview.llmEvaluation
          },
          posts: preparedPosts.map((post) => ({
            title: post.title,
            language: post.language,
            slug: post.slug,
            readTimeMinutes: post.readTimeMinutes,
            sourceLinks: post.sourceLinks.length,
            cover: post.cover,
            coverSource: post.coverSource,
            coverCredit: post.coverCredit,
            coverLicense: post.coverLicense
          }))
        };
      }

      let created = 0;
      let published = 0;
      let replaced = 0;
      let publishMode: "draft-review" | "auto-published" | "quality-held" = "draft-review";

      await mutateCmsData((current) => {
        const currentSlotPosts = current.blogPosts.filter((post) => isSlotCronPost(post, date, slot));
        const shouldReplace =
          currentSlotPosts.length >= BLOG_LANGUAGES.length && currentSlotPosts.every((post) => isReplaceableAutoDraft(post));

        if (currentSlotPosts.length >= BLOG_LANGUAGES.length && !shouldReplace) return;
        if (shouldReplace) {
          current.blogPosts = current.blogPosts.filter((post) => !isSlotCronPost(post, date, slot));
          replaced = currentSlotPosts.length;
        }

        const posts = preparedPosts.map((post) => applyQualityReview(post, qualityReview, canPublish));
        current.blogPosts.unshift(...posts);
        created = posts.length;
        published = posts.filter((post) => post.status === "published").length;
        publishMode = canPublish ? "auto-published" : shouldAutoPublish() ? "quality-held" : "draft-review";
      });

      return {
        ok: true,
        skipped: created === 0,
        generationDate: date,
        generationSlot: slot,
        scheduledFor: scheduledFor(date, slot),
        created,
        replaced,
        published,
        provider: generated.provider,
        warning: generated.warning,
        coverGeneration: coverGenerationSummary(generated.coverGeneration),
        sourceCount: generated.sources.length,
        contentType: editorialBrief.contentType,
        newsCategory: editorialBrief.newsCategory,
        newsRatio: editorialBrief.newsRatio,
        repairAttempts,
        repairWarnings,
        publishMode,
        qualityReview: {
          approved: qualityReview.approved,
          score: qualityReview.score,
          issues: qualityReview.issues,
          warnings: qualityReview.warnings,
          llmEvaluation: qualityReview.llmEvaluation
        },
        event: published ? "blog_post_published" : "ai_blog_draft_generated"
      };
    });

    return NextResponse.json(result, { status: result.skipped ? 200 : 201 });
  } catch (error) {
    if (error instanceof CmsLockError) {
      return NextResponse.json({ ok: true, skipped: true, reason: error.message }, { status: 202 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}
