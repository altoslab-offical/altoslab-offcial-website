import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifyBlogIngestRequest } from "@/lib/blog-ingest-auth";

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

function safeFilename(input = "cover.png") {
  const ext = path.extname(input).toLowerCase();
  const stem = path.basename(input, ext).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
  return `${stem || "cover"}${safeExt}`;
}

function localBaseUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

async function storeLocalPublicImage(filename: string, bytes: Buffer, request: Request) {
  const pathname = `data/generated-blog-media/${filename}`;
  const output = path.join(process.cwd(), pathname);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, bytes);
  return {
    url: `${localBaseUrl(request)}/api/blog/generated-media/${encodeURIComponent(filename)}`,
    pathname,
    provider: "local-public"
  };
}

async function storeBlobImage(filename: string, bytes: Buffer, contentType: string) {
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

export async function POST(request: Request) {
  const body = await request.text();
  const auth = verifyBlogIngestRequest(request, body);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

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
  const stored =
    process.env.BLOG_MEDIA_ALLOW_LOCAL_STORAGE === "1"
      ? await storeLocalPublicImage(filename, bytes, request)
      : await storeBlobImage(filename, bytes, contentType);

  return NextResponse.json({
    ok: true,
    ...stored,
    contentType,
    size: bytes.length
  });
}
