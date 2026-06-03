const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";
const DEFAULT_GCS_MEDIA_PREFIX = "blog-generated";
const DEFAULT_METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

export type GcsStorageConfig = {
  enabled: boolean;
  bucket: string;
  cmsKey: string;
  cmsPathname: string;
  mediaPrefix: string;
};

export type GcsObjectRead = {
  name: string;
  generation: string;
  contentType: string;
  size: number;
  arrayBuffer: ArrayBuffer;
};

export type GcsListedObject = {
  name: string;
  generation?: string;
  updated?: string;
};

export class GcsPreconditionError extends Error {
  constructor(message = "GCS precondition failed") {
    super(message);
    this.name = "GcsPreconditionError";
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function safeStorageKey(key: string) {
  return key.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

function safeObjectSegment(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "cover.png";
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function storageApiUrl(config: GcsStorageConfig, objectName: string, media = false) {
  const url = new URL(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o/${encodeURIComponent(objectName)}`
  );
  if (media) url.searchParams.set("alt", "media");
  return url;
}

function uploadApiUrl(config: GcsStorageConfig, objectName: string, ifGenerationMatch?: string | number) {
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(config.bucket)}/o`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", objectName);
  if (ifGenerationMatch !== undefined) url.searchParams.set("ifGenerationMatch", String(ifGenerationMatch));
  return url;
}

async function metadataToken() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(process.env.GCP_METADATA_TOKEN_URL || DEFAULT_METADATA_TOKEN_URL, {
      headers: { "Metadata-Flavor": "Google" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`metadata token returned ${response.status}`);
    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!payload.access_token) throw new Error("metadata token response did not include access_token");
    const ttlSeconds = Math.max(60, Number(payload.expires_in || 300) - 60);
    cachedToken = { value: payload.access_token, expiresAt: Date.now() + ttlSeconds * 1000 };
    return cachedToken.value;
  } finally {
    clearTimeout(timeout);
  }
}

async function gcsAccessToken() {
  const staticToken = process.env.GCS_ACCESS_TOKEN || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if (staticToken?.trim()) return staticToken.trim();
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  return metadataToken();
}

async function gcsFetch(url: URL, init: RequestInit = {}) {
  const token = await gcsAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store"
  });
}

function toBodyInit(value: string | Buffer | ArrayBuffer | Uint8Array): BodyInit {
  if (typeof value === "string") return value;
  if (value instanceof ArrayBuffer) return value;
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

export function gcsCmsPathname(key = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY) {
  return process.env.GCS_CMS_PATH?.trim() || `cms/${safeStorageKey(key)}.json`;
}

export function gcsMediaPathname(filename: string) {
  const prefix = trimSlashes(process.env.GCS_MEDIA_PREFIX || DEFAULT_GCS_MEDIA_PREFIX);
  return `${prefix}/${safeObjectSegment(filename)}`;
}

export function getGcsStorageConfig(): GcsStorageConfig | null {
  const bucket = process.env.GCS_BUCKET?.trim() || process.env.GCP_STORAGE_BUCKET?.trim();
  const enabled = process.env.GCS_STORAGE_ENABLED === "1" || Boolean(bucket && process.env.GCS_STORAGE_ENABLED !== "0");
  if (!enabled || !bucket) return null;

  const cmsKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;
  return {
    enabled,
    bucket,
    cmsKey,
    cmsPathname: gcsCmsPathname(cmsKey),
    mediaPrefix: trimSlashes(process.env.GCS_MEDIA_PREFIX || DEFAULT_GCS_MEDIA_PREFIX)
  };
}

export function isGcsStorageConfigured() {
  return Boolean(getGcsStorageConfig());
}

export function requireGcsStorageConfig() {
  const config = getGcsStorageConfig();
  if (!config) throw new Error("GCS storage is enabled but GCS_BUCKET is not configured.");
  return config;
}

export async function readGcsObject(config: GcsStorageConfig, objectName: string): Promise<GcsObjectRead | null> {
  const response = await gcsFetch(storageApiUrl(config, objectName, true));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GCS read ${objectName} failed with ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return {
    name: objectName,
    generation: response.headers.get("x-goog-generation") || "",
    contentType: response.headers.get("content-type") || "application/octet-stream",
    size: Number(response.headers.get("content-length") || arrayBuffer.byteLength),
    arrayBuffer
  };
}

export async function readGcsText(config: GcsStorageConfig, objectName: string) {
  const object = await readGcsObject(config, objectName);
  if (!object) return null;
  return {
    generation: object.generation,
    text: Buffer.from(object.arrayBuffer).toString("utf8")
  };
}

export async function listGcsObjects(config: GcsStorageConfig, prefix: string, limit = 1000) {
  const url = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o`);
  url.searchParams.set("prefix", prefix);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("fields", "items(name,generation,updated)");
  const response = await gcsFetch(url);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`GCS list ${prefix} failed with ${response.status}`);
  const payload = (await response.json()) as { items?: GcsListedObject[] };
  return payload.items || [];
}

export async function writeGcsObject(
  config: GcsStorageConfig,
  objectName: string,
  value: string | Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
  ifGenerationMatch?: string | number
) {
  const response = await gcsFetch(uploadApiUrl(config, objectName, ifGenerationMatch), {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: toBodyInit(value)
  });
  if (response.status === 412) throw new GcsPreconditionError();
  if (!response.ok) throw new Error(`GCS write ${objectName} failed with ${response.status}`);
  return (await response.json()) as { name: string; generation?: string };
}

export async function deleteGcsObject(config: GcsStorageConfig, objectName: string) {
  const response = await gcsFetch(storageApiUrl(config, objectName), { method: "DELETE" });
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`GCS delete ${objectName} failed with ${response.status}`);
}
