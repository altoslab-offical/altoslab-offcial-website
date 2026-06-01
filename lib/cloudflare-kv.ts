import { getCloudflareContext } from "@opennextjs/cloudflare";

const DEFAULT_KV_BINDING = "ALTOS_BLOG_KV";
const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";

type KvListKey = {
  name: string;
  expiration?: number;
  metadata?: Record<string, unknown>;
};

export type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  get(key: string, options: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
  getWithMetadata<T = Record<string, unknown>>(
    key: string,
    options?: { type?: "text" | "arrayBuffer" }
  ): Promise<{ value: string | ArrayBuffer | null; metadata: T | null }>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { metadata?: Record<string, unknown>; expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: KvListKey[]; list_complete: boolean; cursor?: string }>;
};

export type CloudflareKvConfig = {
  enabled: boolean;
  binding: string;
  cmsKey: string;
  cmsPathname: string;
};

function safeStorageKey(key: string) {
  return key.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

export function cloudflareKvBindingName() {
  return process.env.CLOUDFLARE_KV_BINDING?.trim() || DEFAULT_KV_BINDING;
}

export function cloudflareKvCmsPathname(key = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY) {
  return `cms:${safeStorageKey(key)}`;
}

export function cloudflareKvMediaPathname(filename: string) {
  const safeFilename = filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "cover.png";
  return `blog-generated:${safeFilename}`;
}

export function getCloudflareKvConfig(): CloudflareKvConfig | null {
  const enabled = process.env.CLOUDFLARE_KV_ENABLED === "1" || Boolean(process.env.CLOUDFLARE_KV_BINDING?.trim());
  if (!enabled) return null;

  const cmsKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;
  return {
    enabled,
    binding: cloudflareKvBindingName(),
    cmsKey,
    cmsPathname: cloudflareKvCmsPathname(cmsKey)
  };
}

export function isCloudflareKvConfigured() {
  return Boolean(getCloudflareKvConfig());
}

export function getCloudflareKvNamespace(): KvNamespaceLike | null {
  const config = getCloudflareKvConfig();
  if (!config) return null;

  try {
    const context = getCloudflareContext();
    const namespace = (context.env as Record<string, unknown>)[config.binding] as KvNamespaceLike | undefined;
    if (namespace?.get && namespace.put && namespace.list && namespace.delete) return namespace;
  } catch {
    return null;
  }

  return null;
}

export function requireCloudflareKvNamespace() {
  const config = getCloudflareKvConfig();
  const namespace = getCloudflareKvNamespace();
  if (!config || !namespace) {
    throw new Error("Cloudflare KV is enabled but the configured namespace binding is not available.");
  }
  return { config, namespace };
}
