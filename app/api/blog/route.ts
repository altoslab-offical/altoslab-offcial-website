import { NextResponse } from "next/server";
import { getPublishedBlogInventoryPostsForApi } from "@/lib/cms";
import { toPublicBlogInventoryPost, toPublicBlogListPost } from "@/lib/public-blog";
import type { BlogLanguage } from "@/lib/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const language = params.get("language") as BlogLanguage | null;
  const fields = params.get("fields") || "";
  const rawLimit = Number(params.get("limit") || 0);
  const isInventory = fields === "inventory";
  const cloudflareLimitCap = process.env.CLOUDFLARE_KV_ENABLED === "1" ? 24 : 120;
  const defaultLimit = process.env.CLOUDFLARE_KV_ENABLED === "1" ? 24 : 80;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, cloudflareLimitCap) : defaultLimit;
  const posts = await getPublishedBlogInventoryPostsForApi(language || undefined, limit);
  const serializer = isInventory ? toPublicBlogInventoryPost : toPublicBlogListPost;
  return NextResponse.json(
    { posts: posts.map(serializer) },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    }
  );
}
