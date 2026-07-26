import { NextResponse } from "next/server";
import { verifyOlympusIngestRequest } from "@/lib/olympus-ingest-auth";
import { BLOG_LANGUAGES } from "@/lib/blog-utils";
import { siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Authenticated capability discovery for the Olympus desktop connector.
 * It deliberately exposes no CMS, credential, or analytics detail.
 */
export async function GET(request: Request) {
  const auth = verifyOlympusIngestRequest(request, "");
  if (!auth.ok) return NextResponse.json({ ok: false, error: "olympus_auth_required" }, { status: auth.status });

  return NextResponse.json(
    {
      ok: true,
      site: siteName,
      siteOrigin: siteUrl,
      contract: {
        kind: "olympus_website_release_set",
        version: 1,
        languages: BLOG_LANGUAGES
      },
      auth: {
        scheme: "hmac-sha256",
        version: "olympus-v2",
        audience: "olympus-website-release",
        signedHeaders: ["x-olympus-signature-version", "x-olympus-audience", "x-olympus-timestamp", "x-olympus-nonce", "x-olympus-signature"]
      },
      publicMutationAllowed: false,
      checkedAt: new Date().toISOString()
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
