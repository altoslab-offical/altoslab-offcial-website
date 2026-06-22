import { NextResponse } from "next/server";
import { adminCookieName, getAdminSessionToken } from "@/lib/auth";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { mutateCmsData, normalizeBlogPostInput, publishValidationForBlogPost } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type BlogPatch = {
  id?: string;
  patch?: Partial<BlogPost>;
};

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

export async function POST(request: Request) {
  const body = await request.text();
  if (!hasAdminSession(request)) {
    const auth = verifyBlogIngestRequest(request, body);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const input = JSON.parse(body || "{}") as { patches?: BlogPatch[] };
  const patches = Array.isArray(input.patches) ? input.patches : [];

  if (!patches.length) {
    return NextResponse.json({ ok: false, errors: ["patches must be a non-empty array"] }, { status: 400 });
  }

  const result = await mutateCmsData((data) => {
    const updated: Array<{ id: string; language: string; slug: string; title: string }> = [];
    const failures: Array<{ id: string; reason: string }> = [];

    for (const item of patches) {
      const id = item.id || "";
      const patch = item.patch || {};
      const index = data.blogPosts.findIndex((post) => post.id === id);
      if (index === -1) {
        failures.push({ id, reason: "not found" });
        continue;
      }

      const next = normalizeBlogPostInput(patch, data.blogPosts[index]);
      if (next.status === "published") {
        const errors = publishValidationForBlogPost(next);
        if (errors.length) {
          failures.push({ id, reason: errors.join("; ") });
          continue;
        }
      }

      data.blogPosts[index] = next;
      updated.push({ id: next.id, language: next.language, slug: next.slug, title: next.title });
    }

    return { updated, failures };
  });

  return NextResponse.json({
    ok: result.failures.length === 0,
    updated: result.updated,
    failures: result.failures
  });
}
