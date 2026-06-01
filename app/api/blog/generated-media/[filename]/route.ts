import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { cloudflareKvMediaPathname, getCloudflareKvConfig, getCloudflareKvNamespace } from "@/lib/cloudflare-kv";
import { cloudflareR2MediaPathname, getCloudflareR2Config, getCloudflareR2Bucket } from "@/lib/cloudflare-r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ filename: string }> | { filename: string } };

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

export async function GET(_: Request, context: Params) {
  const { filename } = await context.params;
  const safeFilename = path.basename(filename);
  const cloudflareKvConfig = getCloudflareKvConfig();
  const cloudflareKvNamespace = getCloudflareKvNamespace();

  if (cloudflareKvConfig && cloudflareKvNamespace) {
    const result = await cloudflareKvNamespace.getWithMetadata(cloudflareKvMediaPathname(safeFilename), {
      type: "arrayBuffer"
    });
    if (result.value) {
      const metadata = result.metadata || {};
      return new NextResponse(result.value as ArrayBuffer, {
        headers: {
          "Content-Type": typeof metadata.contentType === "string" ? metadata.contentType : contentTypeFor(safeFilename),
          "Cache-Control":
            typeof metadata.cacheControl === "string" ? metadata.cacheControl : "public, max-age=31536000, immutable",
          ...(typeof metadata.size === "string" ? { "Content-Length": metadata.size } : {})
        }
      });
    }
  }

  const cloudflareR2Config = getCloudflareR2Config();
  const cloudflareR2Bucket = getCloudflareR2Bucket();

  if (cloudflareR2Config && cloudflareR2Bucket) {
    const object = await cloudflareR2Bucket.get(cloudflareR2MediaPathname(safeFilename));
    if (object) {
      const contentType = object.httpMetadata?.contentType || contentTypeFor(safeFilename);
      return new NextResponse(await object.arrayBuffer(), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable",
          "Content-Length": String(object.size),
          ETag: object.httpEtag || object.etag
        }
      });
    }
  }

  const filepath = path.join(process.cwd(), "data", "generated-blog-media", safeFilename);

  try {
    const bytes = await fs.readFile(filepath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentTypeFor(safeFilename),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Generated media not found" }, { status: 404 });
  }
}
