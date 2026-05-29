import { NextResponse } from "next/server";
import { generateBlogDraftPair, type BlogGenerateInput } from "@/lib/blog-generation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as BlogGenerateInput;
  const result = await generateBlogDraftPair(input);

  return NextResponse.json({
    posts: result.posts,
    post: result.posts[0],
    provider: result.provider,
    sources: result.sources,
    promptVersion: result.promptVersion,
    traces: result.traces,
    coverGeneration: result.coverGeneration,
    warning: result.warning
  });
}
