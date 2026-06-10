import { NextResponse } from "next/server";
import { refreshPublicBlogCacheFromStorage } from "@/lib/cms";

export async function POST() {
  try {
    const result = await refreshPublicBlogCacheFromStorage();
    return NextResponse.json({
      ok: Boolean(result.refreshed),
      phase: "admin-blog-refresh-public-cache",
      ...result,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        phase: "admin-blog-refresh-public-cache",
        error: error instanceof Error ? error.message : "Public blog cache refresh failed"
      },
      { status: 500 }
    );
  }
}
