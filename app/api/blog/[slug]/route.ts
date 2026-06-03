import { NextResponse } from "next/server";
import { getPublishedBlogPost } from "@/lib/cms";
import { toPublicBlogPost } from "@/lib/public-blog";
import type { BlogLanguage } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(request: Request, context: Params) {
  const { slug } = await context.params;
  const language = new URL(request.url).searchParams.get("language") as BlogLanguage | null;
  const post = await getPublishedBlogPost(slug, language || undefined);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post: toPublicBlogPost(post) });
}
