import { NextResponse } from "next/server";
import { adminCookieName, getAdminSessionToken } from "@/lib/auth";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { refreshPublicBlogCacheFromStorage } from "@/lib/cms";

export const dynamic = "force-dynamic";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function hasAdminSession(request: Request) {
  const expected = getAdminSessionToken();
  return Boolean(expected && cookieValue(request, adminCookieName) === expected);
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!hasAdminSession(request)) {
    const auth = verifyBlogIngestRequest(request, body);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

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
