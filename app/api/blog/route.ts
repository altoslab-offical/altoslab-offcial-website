import { NextResponse } from "next/server";
import { getPublishedBlogPosts, getPublishedBlogPostsByLanguage } from "@/lib/cms";
import type { BlogLanguage } from "@/lib/types";

export async function GET(request: Request) {
  const language = new URL(request.url).searchParams.get("language") as BlogLanguage | null;
  const posts = language ? await getPublishedBlogPostsByLanguage(language) : await getPublishedBlogPosts();
  return NextResponse.json({ posts });
}
