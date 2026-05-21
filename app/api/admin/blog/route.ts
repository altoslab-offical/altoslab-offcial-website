import { NextResponse } from "next/server";
import { mutateCmsData, normalizeBlogPostInput, readCmsData } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

export async function GET() {
  const data = await readCmsData();
  return NextResponse.json({ posts: data.blogPosts });
}

export async function POST(request: Request) {
  const input = (await request.json()) as Partial<BlogPost>;
  const post = normalizeBlogPostInput(input);

  await mutateCmsData((data) => {
    data.blogPosts.unshift(post);
  });

  return NextResponse.json({ post }, { status: 201 });
}
