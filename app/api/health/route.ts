import { NextResponse } from "next/server";
import { isGaConfigured, isGtmConfigured } from "@/lib/analytics";
import { isAdminConfigured } from "@/lib/auth";
import { isBlogImageGenerationConfigured } from "@/lib/blog-cover-generation";
import { BLOG_NEWS_MIX } from "@/lib/blog-source-registry";
import { BLOG_LANGUAGES } from "@/lib/blog-utils";
import { isCloudflareKvConfigured } from "@/lib/cloudflare-kv";
import { isCloudflareR2Configured } from "@/lib/cloudflare-r2";
import { getCmsStorageStatus } from "@/lib/cms-storage";
import { isGcsStorageConfigured } from "@/lib/gcp-storage";
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
      gaConfigured: isGaConfigured(),
      ga4PropertyConfigured: Boolean((process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID)?.trim()),
      searchConsoleSiteConfigured: Boolean(
        (process.env.SEARCH_CONSOLE_SITE_URL || process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL)?.trim()
      ),
      deepSeekConfigured: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
      deepSeekContentModel: process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-pro",
      deepSeekRouterModel: process.env.DEEPSEEK_ROUTER_MODEL || "deepseek-v4-flash",
      deepSeekReviewModel: process.env.DEEPSEEK_REVIEW_MODEL || process.env.DEEPSEEK_CONTENT_MODEL || "deepseek-v4-pro",
      llmQualityReview: process.env.BLOG_LLM_REVIEW !== "false",
      legalImageSourcingConfigured: isBlogImageGenerationConfigured(),
      imageBlobStorageConfigured: process.env.BLOG_IMAGE_STORE_BLOB !== "false" && Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
      imageCloudflareKvConfigured: isCloudflareKvConfigured(),
      imageCloudflareR2Configured: isCloudflareR2Configured(),
      imageGcsStorageConfigured: isGcsStorageConfigured(),
      externalBlogIngestConfigured: Boolean(process.env.BLOG_INGEST_HMAC_SECRET?.trim()),
      legacyDeepSeekCronDisabled: process.env.BLOG_DISABLE_DEEPSEEK_CRON !== "false",
      cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      autoPublishBlog: process.env.AUTO_PUBLISH_BLOG !== "false",
      blogLanguages: BLOG_LANGUAGES,
      dailyBlogSlots: ["morning", "afternoon"],
      dailyColumnTarget: 2,
      marketScanWindows: ["10:30", "12:30", "14:30", "18:30", "20:30"],
      blogNewsMix: BLOG_NEWS_MIX,
      searchVerificationConfigured: hasSearchVerificationConfigured()
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    checkedAt: new Date().toISOString()
  });
}
