import { NextResponse } from "next/server";
import { isGtmConfigured } from "@/lib/analytics";
import { isAdminConfigured } from "@/lib/auth";
import { isBlogImageGenerationConfigured } from "@/lib/blog-cover-generation";
import { BLOG_NEWS_MIX } from "@/lib/blog-source-registry";
import { getCmsStorageStatus } from "@/lib/cms-storage";
import { hasSearchVerificationConfigured, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    siteUrl,
    adminConfigured: isAdminConfigured(),
    cmsStorage: getCmsStorageStatus(),
    integrations: {
      gtmConfigured: isGtmConfigured(),
      deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
      deepSeekContentModel: process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-pro",
      deepSeekRouterModel: process.env.DEEPSEEK_ROUTER_MODEL || "deepseek-v4-flash",
      deepSeekReviewModel: process.env.DEEPSEEK_REVIEW_MODEL || process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-pro",
      llmQualityReview: process.env.BLOG_LLM_REVIEW !== "false",
      legalImageSourcingConfigured: isBlogImageGenerationConfigured(),
      imageBlobStorageConfigured: process.env.BLOG_IMAGE_STORE_BLOB === "true" && Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
      cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      autoPublishBlog: process.env.AUTO_PUBLISH_BLOG !== "false",
      blogLanguages: ["zh-Hant", "en", "ja", "ko"],
      dailyBlogSlots: ["morning", "afternoon"],
      blogNewsMix: BLOG_NEWS_MIX,
      searchVerificationConfigured: hasSearchVerificationConfigured()
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    checkedAt: new Date().toISOString()
  });
}
