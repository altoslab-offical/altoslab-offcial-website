import type { BlogPost } from "@/lib/types";

const MIN_GENERATED_MEDIA_BYTES = 64_000;
const IMAGE_PROBE_TIMEOUT_MS = 5000;

type ImageReference = {
  label: string;
  url: string;
};

function isGeneratedMediaUrl(url?: string) {
  if (!url) return false;
  try {
    return new URL(url).pathname.startsWith("/api/blog/generated-media/");
  } catch {
    return false;
  }
}

function imageReferencesForPost(post: Partial<BlogPost>) {
  const refs: ImageReference[] = [];
  if (isGeneratedMediaUrl(post.cover)) {
    refs.push({ label: `${post.language || "unknown"}/${post.slug || "missing-slug"} cover`, url: String(post.cover) });
  }
  for (const [index, image] of (post.contentImages || []).entries()) {
    if (isGeneratedMediaUrl(image?.url)) {
      refs.push({
        label: `${post.language || "unknown"}/${post.slug || "missing-slug"} contentImages[${index}]`,
        url: String(image.url)
      });
    }
  }
  return refs;
}

async function probeGeneratedMedia(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_PROBE_TIMEOUT_MS);

  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (head.status === 404 || head.status === 410) return `generated media returned HTTP ${head.status}`;
    if (head.status >= 400 && head.status !== 403 && head.status !== 405) {
      return `generated media returned HTTP ${head.status}`;
    }

    const contentType = head.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
    const contentLength = Number(head.headers.get("content-length") || 0);
    if (contentType && !["image/png", "image/jpeg", "image/webp"].includes(contentType)) {
      return `generated media content-type is ${contentType}`;
    }
    if (contentLength > 0 && contentLength < MIN_GENERATED_MEDIA_BYTES) {
      return `generated media is too small (${contentLength} bytes)`;
    }

    if (head.ok && contentLength >= MIN_GENERATED_MEDIA_BYTES) return "";

    const get = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-65535" },
      redirect: "follow",
      signal: controller.signal
    });
    if (get.status === 404 || get.status === 410) return `generated media returned HTTP ${get.status}`;
    if (!get.ok && get.status !== 206) return `generated media binary probe returned HTTP ${get.status}`;
    const getType = get.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || contentType;
    if (getType && !["image/png", "image/jpeg", "image/webp"].includes(getType)) {
      return `generated media content-type is ${getType}`;
    }
    const bytes = Buffer.from(await get.arrayBuffer());
    if (bytes.length < 1024) return `generated media binary probe is too small (${bytes.length} bytes)`;
    return "";
  } catch (error) {
    return `generated media could not be verified: ${error instanceof Error ? error.message : "request failed"}`;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generatedMediaReachabilityIssues(posts: Partial<BlogPost>[]) {
  const byUrl = new Map<string, Set<string>>();
  for (const post of posts) {
    for (const ref of imageReferencesForPost(post)) {
      if (!byUrl.has(ref.url)) byUrl.set(ref.url, new Set());
      byUrl.get(ref.url)?.add(ref.label);
    }
  }

  const issues: string[] = [];
  await Promise.all(
    [...byUrl.entries()].map(async ([url, labels]) => {
      const issue = await probeGeneratedMedia(url);
      if (issue) issues.push(`${[...labels].join(", ")}: ${issue}`);
    })
  );
  return issues.sort();
}
