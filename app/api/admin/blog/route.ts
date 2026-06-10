import { NextResponse } from "next/server";
import { mutateCmsData, normalizeBlogPostInput, readCmsData } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

function compactReleaseReadbackPost(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    language: post.language,
    translationGroupId: post.translationGroupId,
    contentType: post.contentType,
    status: post.status,
    qualityStatus: post.qualityStatus,
    imageQualityStatus: post.imageQualityStatus,
    releaseDecision: post.releaseDecision,
    generatedBy: post.generatedBy,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt
  };
}

export async function GET(request: Request) {
  const data = await readCmsData();
  const params = new URL(request.url).searchParams;
  if (params.get("fields") === "release-readback") {
    return NextResponse.json({
      posts: data.blogPosts.filter((post) => post.status === "published").map(compactReleaseReadbackPost)
    });
  }
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
