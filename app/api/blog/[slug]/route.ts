import { NextResponse } from "next/server";
import { getPublishedBlogPost } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> | { slug: string } };

export async function GET(_: Request, context: Params) {
  const { slug } = await context.params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}
