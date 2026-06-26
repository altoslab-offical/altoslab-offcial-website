import { NextResponse } from "next/server";
import { adminCookieName, getAdminSessionToken } from "@/lib/auth";
import { mutateCmsData, normalizeBlogPostInput, publishValidationForBlogPost } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type Params = { params: Promise<{ id: string }> | { id: string } };

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function hasAdminSession(request: Request) {
  const expected = getAdminSessionToken();
  return Boolean(expected && cookieValue(request, adminCookieName) === expected);
}

export async function PATCH(request: Request, context: Params) {
  if (!hasAdminSession(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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

export async function DELETE(request: Request, context: Params) {
  if (!hasAdminSession(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
