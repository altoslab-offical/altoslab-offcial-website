import { NextResponse } from "next/server";
import { generateBlogDraftPair } from "@/lib/blog-generation";
import { applyQualityReview, reviewBlogPairForAutoPublish } from "@/lib/blog-quality";
import { taiwanDate } from "@/lib/blog-utils";
import { mutateCmsData, nowIso, readCmsData } from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";
import type { BlogGenerationSlot } from "@/lib/types";

type CronSlot = Extract<BlogGenerationSlot, "morning" | "afternoon">;

const SLOT_CONFIG: Record<CronSlot, { hour: string; topic: string; intent: string }> = {
  morning: {
    hour: "09:00",
    topic: "AI platform trends, search visibility and executive implementation decisions",
    intent: "quickly understand the latest AI/search trend and decide whether it matters for business implementation"
  },
  afternoon: {
    hour: "15:00",
    topic: "Enterprise AI automation, agent workflows and SEO/GEO operating playbooks",
    intent: "turn AI trend signals into practical workflow, content and measurement decisions for an operator"
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
  return process.env.AUTO_PUBLISH_BLOG === "true";
}

export async function runBlogDraftCron(request: Request, forcedSlot?: CronSlot) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return unauthorized("CRON_SECRET is not configured");
  if (requestSecret(request) !== configuredSecret) return unauthorized();

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const slot = forcedSlot || inferSlot(request);
  const slotConfig = SLOT_CONFIG[slot];

  try {
    const result = await withCmsStorageLock(`blog-drafts-${slot}`, async () => {
      const date = taiwanDate();
      const data = await readCmsData();
      const existingCount = data.blogPosts.filter(
        (post) =>
          post.generationDate === date &&
          post.generationSlot === slot &&
          post.generatedBy?.startsWith("cron:")
      ).length;

      if (existingCount >= 2 && !dryRun) {
        return {
          ok: true,
          skipped: true,
          reason: `${slot} bilingual draft pair already exists`,
          generationDate: date,
          generationSlot: slot,
          created: 0
        };
      }

      const generated = await generateBlogDraftPair({
        topic: slotConfig.topic,
        audience: "business owners, operators and marketing teams evaluating AI implementation",
        intent: slotConfig.intent,
        slot,
        generationDate: date
      });

      const preparedPosts = generated.posts.map((post) => ({
        ...post,
        status: "draft" as const,
        generationSlot: slot,
        scheduledFor: scheduledFor(date, slot),
        generatedAt: post.generatedAt || nowIso(),
        generatedBy: `cron:${slot}:${post.generatedBy || generated.provider}`
      }));
      const qualityReview = reviewBlogPairForAutoPublish(preparedPosts);
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
          sourceCount: generated.sources.length,
          publishMode: canPublish ? "auto-published" : shouldAutoPublish() ? "quality-held" : "draft-review",
          qualityReview: {
            approved: qualityReview.approved,
            score: qualityReview.score,
            issues: qualityReview.issues,
            warnings: qualityReview.warnings
          },
          posts: preparedPosts.map((post) => ({
            title: post.title,
            language: post.language,
            slug: post.slug,
            readTimeMinutes: post.readTimeMinutes,
            sourceLinks: post.sourceLinks.length,
            cover: post.cover
          }))
        };
      }

      let created = 0;
      let published = 0;
      let publishMode: "draft-review" | "auto-published" | "quality-held" = "draft-review";

      await mutateCmsData((current) => {
        const hasSlotPair = current.blogPosts.filter(
          (post) =>
            post.generationDate === date &&
            post.generationSlot === slot &&
            post.generatedBy?.startsWith("cron:")
        ).length;

        if (hasSlotPair >= 2) return;

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
        published,
        provider: generated.provider,
        warning: generated.warning,
        sourceCount: generated.sources.length,
        publishMode,
        qualityReview: {
          approved: qualityReview.approved,
          score: qualityReview.score,
          issues: qualityReview.issues,
          warnings: qualityReview.warnings
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
