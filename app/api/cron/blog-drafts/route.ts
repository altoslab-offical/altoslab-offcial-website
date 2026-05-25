import { NextResponse } from "next/server";
import { generateBlogDraftPair } from "@/lib/blog-generation";
import { taiwanDate } from "@/lib/blog-utils";
import { mutateCmsData } from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";

export const dynamic = "force-dynamic";

function requestSecret(request: Request) {
  const url = new URL(request.url);
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || request.headers.get("x-cron-secret") || url.searchParams.get("secret") || "";
}

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return unauthorized("CRON_SECRET is not configured");
  if (requestSecret(request) !== configuredSecret) return unauthorized();

  try {
    const result = await withCmsStorageLock("daily-blog-drafts", async () => {
      const date = taiwanDate();
      let existingCount = 0;

      await mutateCmsData((data) => {
        existingCount = data.blogPosts.filter(
          (post) => post.generationDate === date && post.generatedBy?.startsWith("cron:")
        ).length;
      });

      if (existingCount >= 2) {
        return {
          ok: true,
          skipped: true,
          reason: "Daily bilingual draft pair already exists",
          generationDate: date,
          created: 0
        };
      }

      const generated = await generateBlogDraftPair({
        topic: "AI trends, search visibility and practical implementation decisions",
        audience: "business owners, operators and marketing teams evaluating AI implementation",
        intent: "understand the latest AI trend and decide what to do next"
      });

      let created = 0;
      await mutateCmsData((data) => {
        const hasDailyPair = data.blogPosts.filter(
          (post) => post.generationDate === date && post.generatedBy?.startsWith("cron:")
        ).length;

        if (hasDailyPair >= 2) return;

        const posts = generated.posts.map((post) => ({
          ...post,
          generatedBy: `cron:${post.generatedBy || generated.provider}`
        }));
        data.blogPosts.unshift(...posts);
        created = posts.length;
      });

      return {
        ok: true,
        skipped: created === 0,
        generationDate: date,
        created,
        provider: generated.provider,
        warning: generated.warning,
        sourceCount: generated.sources.length,
        event: "ai_blog_draft_generated"
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
