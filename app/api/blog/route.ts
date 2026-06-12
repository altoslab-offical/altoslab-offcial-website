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
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 120) : 80;
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
