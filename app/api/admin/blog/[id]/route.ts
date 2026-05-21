import { NextResponse } from "next/server";
import { mutateCmsData, normalizeBlogPostInput, publishValidationForBlogPost } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(request: Request, context: Params) {
  const { id } = await context.params;
  const input = (await request.json()) as Partial<BlogPost>;

  const result = await mutateCmsData((data) => {
    const index = data.blogPosts.findIndex((post) => post.id === id);
    if (index === -1) return null;
    const next = normalizeBlogPostInput(input, data.blogPosts[index]);
    if (next.status === "published") {
      const errors = publishValidationForBlogPost(next);
      if (errors.length) return { errors };
    }
    data.blogPosts[index] = next;
    return { post: next };
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("errors" in result) return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_: Request, context: Params) {
  const { id } = await context.params;

  const post = await mutateCmsData((data) => {
    const index = data.blogPosts.findIndex((item) => item.id === id);
    if (index === -1) return null;
    data.blogPosts[index] = { ...data.blogPosts[index], status: "archived", updatedAt: new Date().toISOString() };
    return data.blogPosts[index];
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}
