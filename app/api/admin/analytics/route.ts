import { NextResponse } from "next/server";
import { buildAnalyticsDashboard } from "@/lib/ga-dashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") || "28");
  const dashboard = await buildAnalyticsDashboard({ days });

  return NextResponse.json(dashboard, {
    headers: {
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate"
    }
  });
}
