import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/auth";
import { getCmsStorageStatus } from "@/lib/cms-storage";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    siteUrl,
    adminConfigured: isAdminConfigured(),
    cmsStorage: getCmsStorageStatus(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    checkedAt: new Date().toISOString()
  });
}
