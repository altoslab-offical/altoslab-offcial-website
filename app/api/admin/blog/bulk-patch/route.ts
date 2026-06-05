import { NextResponse } from "next/server";
import { mutateCmsData, normalizeBlogPostInput, publishValidationForBlogPost } from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type BlogPatch = {
  id?: string;
  patch?: Partial<BlogPost>;
};

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as { patches?: BlogPatch[] };
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
