import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { cloudflareKvMediaPathname, getCloudflareKvConfig, getCloudflareKvNamespace } from "@/lib/cloudflare-kv";
import { cloudflareR2MediaPathname, getCloudflareR2Config, getCloudflareR2Bucket } from "@/lib/cloudflare-r2";
import { gcsMediaPathname, getGcsStorageConfig, readGcsObject } from "@/lib/gcp-storage";
import { awsS3MediaPathname, getAwsS3StorageConfig, readAwsS3Object } from "@/lib/aws-s3-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ filename: string }> | { filename: string } };

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

async function readStaticGeneratedMediaResponse(request: Request, safeFilename: string) {
  const assetUrl = new URL(`/generated-blog-media/${safeFilename}`, request.url);

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = getCloudflareContext();
    const assets = (context.env as { ASSETS?: { fetch(input: Request): Promise<Response> } }).ASSETS;
    if (assets?.fetch) {
      const response = await assets.fetch(new Request(assetUrl));
      if (response.ok) {
        return new NextResponse(response.body, {
          headers: {
            "Content-Type": response.headers.get("Content-Type") || contentTypeFor(safeFilename),
            "Cache-Control": response.headers.get("Cache-Control") || "public, max-age=31536000, immutable",
            ...(response.headers.get("Content-Length") ? { "Content-Length": response.headers.get("Content-Length") || "" } : {}),
            ...(response.headers.get("ETag") ? { ETag: response.headers.get("ETag") || "" } : {})
          }
        });
      }
    }
  } catch {
    // Local Next runtimes do not expose the Cloudflare ASSETS binding.
  }

  try {
    const response = await fetch(assetUrl, { redirect: "follow" });
    if (response.ok) {
      return new NextResponse(response.body, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") || contentTypeFor(safeFilename),
          "Cache-Control": response.headers.get("Cache-Control") || "public, max-age=31536000, immutable",
          ...(response.headers.get("Content-Length") ? { "Content-Length": response.headers.get("Content-Length") || "" } : {}),
          ...(response.headers.get("ETag") ? { ETag: response.headers.get("ETag") || "" } : {})
        }
      });
    }
  } catch {
    // Fall through to local filesystem for non-Cloudflare development.
  }

  return null;
}

export async function GET(request: Request, context: Params) {
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

  const gcsConfig = getGcsStorageConfig();
  if (gcsConfig) {
    const object = await readGcsObject(gcsConfig, gcsMediaPathname(safeFilename));
    if (object) {
      return new NextResponse(object.arrayBuffer, {
        headers: {
          "Content-Type": object.contentType || contentTypeFor(safeFilename),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(object.size),
          ...(object.generation ? { ETag: object.generation } : {})
        }
      });
    }
  }

  const awsS3Config = getAwsS3StorageConfig();
  if (awsS3Config) {
    const object = await readAwsS3Object(awsS3Config, awsS3MediaPathname(safeFilename));
    if (object) {
      return new NextResponse(object.arrayBuffer, {
        headers: {
          "Content-Type": object.contentType || contentTypeFor(safeFilename),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(object.size),
          ...(object.etag ? { ETag: object.etag } : {})
        }
      });
    }
  }

  const staticResponse = await readStaticGeneratedMediaResponse(request, safeFilename);
  if (staticResponse) return staticResponse;

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
