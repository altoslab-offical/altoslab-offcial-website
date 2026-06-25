import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adminCookieName, getAdminSessionToken } from "@/lib/auth";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { generatedMediaReachabilityIssues } from "@/lib/blog-image-reachability";
import { BLOG_LANGUAGES, blogIndexPath, blogPostPath } from "@/lib/blog-utils";
import {
  mutateCmsData,
  normalizeBlogPostInput,
  publishValidationForBlogPost,
  readCmsData,
  refreshPublicBlogCacheFromStorage
} from "@/lib/cms";
import type { BlogPost } from "@/lib/types";

type BlogPatch = {
  id?: string;
  patch?: Partial<BlogPost>;
};

function revalidateBlogPatchRoutes(posts: Array<{ language: string; slug: string }>) {
  const paths = new Set<string>(["/feed.xml", "/rss.xml", "/sitemap.xml", "/llms.txt", "/llms-full.txt"]);
  for (const language of BLOG_LANGUAGES) paths.add(blogIndexPath(language));
  for (const post of posts) paths.add(blogPostPath(post.slug, post.language as BlogPost["language"]));

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`[blog-bulk-patch] Unable to revalidate ${path}:`, error instanceof Error ? error.message : error);
    }
  }
}

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

  const imageIssuesById = new Map<string, string[]>();
  const currentData = await readCmsData();
  for (const item of patches) {
    const id = item.id || "";
    const patch = item.patch || {};
    const existing = currentData.blogPosts.find((post) => post.id === id);
    if (!existing) continue;
    const next = normalizeBlogPostInput(patch, existing);
    if (next.status !== "published") continue;
    const issues = await generatedMediaReachabilityIssues([next]);
    if (issues.length) imageIssuesById.set(id, issues);
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
      if (imageIssuesById.has(id)) {
        failures.push({ id, reason: imageIssuesById.get(id)?.join("; ") || "generated media reachability failed" });
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

  let publicCache:
    | Awaited<ReturnType<typeof refreshPublicBlogCacheFromStorage>>
    | { refreshed: false; error: string; skipped?: boolean }
    | null = null;
  if (result.updated.length > 0) {
    try {
      publicCache = await refreshPublicBlogCacheFromStorage();
      if (publicCache.refreshed) revalidateBlogPatchRoutes(result.updated);
    } catch (error) {
      publicCache = {
        refreshed: false,
        error: error instanceof Error ? error.message : "public blog cache refresh failed"
      };
    }
  }

  return NextResponse.json({
    ok: result.failures.length === 0 && publicCache?.refreshed !== false,
    updated: result.updated,
    failures: result.failures,
    publicCache
  });
}
