import { getCloudflareContext } from "@opennextjs/cloudflare";

const DEFAULT_R2_BINDING = "ALTOS_BLOG_R2";
const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";

export type R2ObjectLike = {
  key: string;
  etag: string;
  httpEtag?: string;
  size: number;
  uploaded?: Date;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
  };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type R2Conditional = {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
};

type R2PutOptions = {
  onlyIf?: R2Conditional | Headers;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
  };
  customMetadata?: Record<string, string>;
};

export type R2BucketLike = {
  get(key: string, options?: unknown): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: R2PutOptions
  ): Promise<R2ObjectLike | null>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ objects: R2ObjectLike[] }>;
};

export type CloudflareR2Config = {
  enabled: boolean;
  binding: string;
  cmsKey: string;
  cmsPathname: string;
};

function safeStorageKey(key: string) {
  return key.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

export function cloudflareR2BindingName() {
  return process.env.CLOUDFLARE_R2_BINDING?.trim() || DEFAULT_R2_BINDING;
}

export function cloudflareR2CmsPathname(key = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY) {
  return `cms/${safeStorageKey(key)}.json`;
}

export function cloudflareR2MediaPathname(filename: string) {
  const safeFilename = filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "cover.png";
  return `blog-generated/${safeFilename}`;
}

export function getCloudflareR2Config(): CloudflareR2Config | null {
  const enabled = process.env.CLOUDFLARE_R2_ENABLED === "1";
  if (!enabled) return null;

  const cmsKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;
  return {
    enabled,
    binding: cloudflareR2BindingName(),
    cmsKey,
    cmsPathname: cloudflareR2CmsPathname(cmsKey)
  };
}

export function isCloudflareR2Configured() {
  return Boolean(getCloudflareR2Config());
}

export function getCloudflareR2Bucket(): R2BucketLike | null {
  const config = getCloudflareR2Config();
  if (!config) return null;

  try {
    const context = getCloudflareContext();
    const bucket = (context.env as Record<string, unknown>)[config.binding] as R2BucketLike | undefined;
    if (bucket?.get && bucket.put && bucket.list && bucket.delete) return bucket;
  } catch {
    return null;
  }

  return null;
}

export function requireCloudflareR2Bucket() {
  const config = getCloudflareR2Config();
  const bucket = getCloudflareR2Bucket();
  if (!config || !bucket) {
    throw new Error("Cloudflare R2 is enabled but the configured bucket binding is not available.");
  }
  return { config, bucket };
}
