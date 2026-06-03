import { readCmsData } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_BOOTSTRAP_CACHE_TTL_MS = Number(process.env.ADMIN_BOOTSTRAP_CACHE_TTL_MS || 15_000);

let adminBootstrapCache: { body: string; expiresAt: number } | null = null;

function jsonResponse(body: string, cacheStatus: "hit" | "miss") {
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "X-Altos-Admin-Bootstrap-Cache": cacheStatus
    }
  });
}

export async function GET() {
  const now = Date.now();
  if (adminBootstrapCache && adminBootstrapCache.expiresAt > now) {
    return jsonResponse(adminBootstrapCache.body, "hit");
  }

  const data = await readCmsData();
  const body = JSON.stringify(data);
  adminBootstrapCache = {
    body,
    expiresAt: now + ADMIN_BOOTSTRAP_CACHE_TTL_MS
  };

  return jsonResponse(body, "miss");
}
