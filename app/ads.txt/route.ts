import { adsenseClient } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function publisherId() {
  const match = adsenseClient?.match(/^ca-(pub-\d+)$/i);
  return match?.[1] || "";
}

export function GET() {
  const publisher = publisherId();
  const body = publisher ? `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` : "";

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
