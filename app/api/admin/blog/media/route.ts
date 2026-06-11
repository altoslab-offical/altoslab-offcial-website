import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { adminCookieName, getAdminSessionToken } from "@/lib/auth";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";
import { cloudflareKvMediaPathname, getCloudflareKvConfig, requireCloudflareKvNamespace } from "@/lib/cloudflare-kv";
import { cloudflareR2MediaPathname, getCloudflareR2Config, requireCloudflareR2Bucket } from "@/lib/cloudflare-r2";
import { gcsMediaPathname, getGcsStorageConfig, requireGcsStorageConfig, writeGcsObject } from "@/lib/gcp-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MediaUploadRequest = {
  filename?: string;
  contentType?: string;
  base64?: string;
  ingestRunId?: string;
};

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 8_000_000;

function toArrayBuffer(bytes: Buffer) {
  return new Uint8Array(bytes).buffer;
}

function safeFilename(input = "cover.png") {
  const ext = path.extname(input).toLowerCase();
  const stem = path.basename(input, ext).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
  return `${stem || "cover"}${safeExt}`;
}

function publicBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

function requestOrigin(request: Request) {
  return new URL(request.url).origin;
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

async function storeLocalPublicImage(filename: string, bytes: Buffer, request: Request) {
  const pathname = `data/generated-blog-media/${filename}`;
  const output = path.join(process.cwd(), pathname);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, bytes);
  return {
    url: `${publicBaseUrl(request)}/api/blog/generated-media/${encodeURIComponent(filename)}`,
    pathname,
    provider: "local-public"
  };
}

async function storeBlobImage(filename: string, bytes: Buffer, contentType: string) {
  const packageName = "@vercel/" + "blob";
  const { put } = (await import(packageName)) as typeof import("@vercel/blob");
  const pathname = `blog-generated/${filename}`;
  const blob = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 31536000
  });
  return {
    url: blob.url,
    pathname: blob.pathname,
    provider: "vercel-blob"
  };
}

async function storeCloudflareR2Image(filename: string, bytes: Buffer, contentType: string, request: Request) {
  const { bucket } = requireCloudflareR2Bucket();
  const pathname = cloudflareR2MediaPathname(filename);
  await bucket.put(pathname, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable"
    }
  });
  return {
    url: `${publicBaseUrl(request)}/api/blog/generated-media/${encodeURIComponent(filename)}`,
    pathname,
    provider: "cloudflare-r2"
  };
}

async function storeCloudflareKvImage(filename: string, bytes: Buffer, contentType: string, request: Request) {
  const { namespace } = requireCloudflareKvNamespace();
  const pathname = cloudflareKvMediaPathname(filename);
  await namespace.put(pathname, toArrayBuffer(bytes), {
    metadata: {
      contentType,
      size: String(bytes.length),
      cacheControl: "public, max-age=31536000, immutable",
      uploadedAt: new Date().toISOString()
    }
  });
  return {
    url: `${publicBaseUrl(request)}/api/blog/generated-media/${encodeURIComponent(filename)}`,
    pathname,
    provider: "cloudflare-kv"
  };
}

async function storeGcsImage(filename: string, bytes: Buffer, contentType: string, request: Request) {
  const config = requireGcsStorageConfig();
  const pathname = gcsMediaPathname(filename);
  await writeGcsObject(config, pathname, bytes, contentType);
  return {
    url: `${publicBaseUrl(request)}/api/blog/generated-media/${encodeURIComponent(filename)}`,
    pathname,
    provider: "gcs"
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!hasAdminSession(request)) {
    const auth = verifyBlogIngestRequest(request, body);
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let payload: MediaUploadRequest;
  try {
    payload = JSON.parse(body) as MediaUploadRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const contentType = payload.contentType || "";
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ ok: false, error: "contentType must be image/png, image/jpeg or image/webp" }, { status: 400 });
  }
  if (!payload.base64) {
    return NextResponse.json({ ok: false, error: "base64 image body is required" }, { status: 400 });
  }

  const bytes = Buffer.from(payload.base64, "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "image size is empty or exceeds 8MB" }, { status: 400 });
  }

  const filename = safeFilename(`${payload.ingestRunId || "manual"}-${payload.filename || "cover.png"}`);
  let stored: Awaited<ReturnType<typeof storeCloudflareKvImage>>;
  try {
    stored = getCloudflareKvConfig()
      ? await storeCloudflareKvImage(filename, bytes, contentType, request)
      : getCloudflareR2Config()
        ? await storeCloudflareR2Image(filename, bytes, contentType, request)
        : getGcsStorageConfig()
          ? await storeGcsImage(filename, bytes, contentType, request)
          : process.env.BLOG_MEDIA_ALLOW_LOCAL_STORAGE === "1"
            ? await storeLocalPublicImage(filename, bytes, request)
            : await storeBlobImage(filename, bytes, contentType);
  } catch (error) {
    console.error("[blog-media] failed to store generated media", error);
    return NextResponse.json({ ok: false, error: "generated media storage failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...stored,
    contentType,
    size: bytes.length
  });
}
