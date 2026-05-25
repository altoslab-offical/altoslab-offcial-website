import { NextResponse } from "next/server";
import { isGtmConfigured } from "@/lib/analytics";
import { isAdminConfigured } from "@/lib/auth";
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
      cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      searchVerificationConfigured: hasSearchVerificationConfigured()
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    checkedAt: new Date().toISOString()
  });
}
