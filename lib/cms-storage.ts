import { promises as fs } from "fs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import path from "path";
import {
  getCloudflareR2Bucket,
  getCloudflareR2Config,
  requireCloudflareR2Bucket,
  type CloudflareR2Config,
  type R2BucketLike
} from "./cloudflare-r2";
import {
  getCloudflareKvConfig,
  getCloudflareKvNamespace,
  requireCloudflareKvNamespace,
  type CloudflareKvConfig,
  type KvNamespaceLike
} from "./cloudflare-kv";
import { seedData } from "./seed";
import type { CmsData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "cms.json");
const DEFAULT_STORAGE_KEY = "altoslab:cms:v1";

type UpstashResponse<T> = {
  result?: T;
  error?: string;
};

type UpstashConfig = {
  url: string;
  token: string;
  key: string;
};

type BlobConfig = {
  key: string;
  pathname: string;
  access: "public" | "private";
  encrypted: boolean;
};

type EncryptedCmsBlob = {
  encrypted: true;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

async function vercelBlobClient() {
  const packageName = "@vercel/" + "blob";
  return import(packageName) as Promise<typeof import("@vercel/blob")>;
}

export class CmsLockError extends Error {
  constructor(message = "CMS lock is already held") {
    super(message);
    this.name = "CmsLockError";
  }
}

function cloneSeedData(): CmsData {
  return JSON.parse(JSON.stringify(seedData)) as CmsData;
}

function normalizedUpstashUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  return {
    url: normalizedUpstashUrl(url),
    token,
    key: process.env.CMS_STORAGE_KEY || DEFAULT_STORAGE_KEY
  };
}

function blobPathFromStorageKey(key: string) {
  const safeKey = key.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `cms/${safeKey || "altoslab-cms-v1"}.json`;
}

function getBlobConfig(): BlobConfig | null {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) {
    return null;
  }

  const key = process.env.CMS_STORAGE_KEY || DEFAULT_STORAGE_KEY;
  return {
    key,
    pathname: blobPathFromStorageKey(key),
    access: process.env.BLOB_ACCESS === "private" ? "private" : "public",
    encrypted: Boolean(process.env.CMS_ENCRYPTION_KEY)
  };
}

function canWriteLocalFile() {
  return process.env.CMS_FILE_STORAGE === "1" || process.env.NODE_ENV !== "production";
}

export function getCmsStorageStatus() {
  const cloudflareKv = getCloudflareKvConfig();
  const cloudflareR2 = getCloudflareR2Config();
  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (cloudflareKv) {
    return {
      provider: "cloudflare-kv",
      durable: true,
      writable: true,
      configured: true,
      key: cloudflareKv.cmsKey,
      binding: cloudflareKv.binding,
      encrypted: Boolean(process.env.CMS_ENCRYPTION_KEY)
    };
  }

  if (cloudflareR2) {
    return {
      provider: "cloudflare-r2",
      durable: true,
      writable: true,
      configured: true,
      key: cloudflareR2.cmsKey,
      binding: cloudflareR2.binding,
      encrypted: Boolean(process.env.CMS_ENCRYPTION_KEY)
    };
  }

  if (upstash) {
    return {
      provider: "upstash-redis",
      durable: true,
      writable: true,
      configured: true,
      key: upstash.key
    };
  }

  if (blob) {
    return {
      provider: "vercel-blob",
      durable: true,
      writable: true,
      configured: true,
      key: blob.key,
      access: blob.access,
      encrypted: blob.encrypted
    };
  }

  return {
    provider: canWriteLocalFile() ? "local-file" : "seed-readonly",
    durable: canWriteLocalFile(),
    writable: canWriteLocalFile(),
    configured: canWriteLocalFile(),
    key: process.env.CMS_STORAGE_KEY || DEFAULT_STORAGE_KEY
  };
}

async function readFileCmsData() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as CmsData;
  } catch {
    return cloneSeedData();
  }
}

async function writeFileCmsData(data: CmsData) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function upstashCommand<T>(config: UpstashConfig, command: unknown[]): Promise<T> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => ({}))) as UpstashResponse<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Upstash request failed with " + response.status);
  }

  return payload.result as T;
}

function isBlobNotFoundError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "BlobNotFoundError" ||
      error.message.includes("Failed to fetch blob: 400 Bad Request") ||
      error.message.includes("Failed to fetch blob: 404 Not Found"))
  );
}

function isBlobPreconditionError(error: unknown) {
  return error instanceof Error && error.name === "BlobPreconditionFailedError";
}

function cmsEncryptionKey() {
  const secret = process.env.CMS_ENCRYPTION_KEY;
  if (!secret) return null;
  if (/^[a-f0-9]{64}$/i.test(secret)) return Buffer.from(secret, "hex");
  return createHash("sha256").update(secret).digest();
}

function encryptCmsData(data: CmsData): CmsData | EncryptedCmsBlob {
  const key = cmsEncryptionKey();
  if (!key) return data;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);

  return {
    encrypted: true,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
}

function decryptCmsData(payload: EncryptedCmsBlob): CmsData {
  const key = cmsEncryptionKey();
  if (!key) throw new Error("CMS_ENCRYPTION_KEY is required to read encrypted CMS data.");

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]).toString("utf8");

  return JSON.parse(decrypted) as CmsData;
}

function parseCmsBlobText(text: string): CmsData {
  const payload = JSON.parse(text) as CmsData | EncryptedCmsBlob;
  if ((payload as EncryptedCmsBlob).encrypted) {
    return decryptCmsData(payload as EncryptedCmsBlob);
  }

  return payload as CmsData;
}

async function readPublicListedBlob(blob: { url: string; etag?: string }) {
  const url = new URL(blob.url);
  url.searchParams.set("cmsCacheBust", String(Date.now()));

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch blob: " + response.status + " " + response.statusText);

  return {
    etag: blob.etag || response.headers.get("etag") || "",
    text: await response.text()
  };
}

async function readPublicBlobText(pathname: string) {
  const { list } = await vercelBlobClient();
  const result = await list({ prefix: pathname, limit: 10 });
  const blob = result.blobs.find((item) => item.pathname === pathname);
  return blob ? readPublicListedBlob(blob) : null;
}

function cmsVersionPrefix(pathname: string) {
  return pathname.replace(/\.json$/, ".versions/");
}

function cmsVersionPathname(pathname: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${cmsVersionPrefix(pathname)}${stamp}-${randomBytes(4).toString("hex")}.json`;
}

async function readR2Text(bucket: R2BucketLike, pathname: string) {
  const object = await bucket.get(pathname);
  if (!object) return null;
  return {
    etag: object.etag,
    text: await object.text()
  };
}

async function readKvText(namespace: KvNamespaceLike, key: string) {
  const value = await namespace.get(key);
  if (!value) return null;
  return { text: value };
}

function cmsKvVersionPrefix(key: string) {
  return `${key}:versions:`;
}

function cmsKvVersionKey(key: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${cmsKvVersionPrefix(key)}${stamp}:${randomBytes(4).toString("hex")}`;
}

async function readVersionedKvCmsData(namespace: KvNamespaceLike, key: string) {
  const primary = await readKvText(namespace, key).catch(() => null);
  if (primary) {
    try {
      return parseCmsBlobText(primary.text);
    } catch (error) {
      console.warn(
        "[cms] Primary Cloudflare KV CMS payload is unreadable; trying version history:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const versions = await namespace.list({ prefix: cmsKvVersionPrefix(key), limit: 1000 });
  const latestVersions = versions.keys
    .filter((item) => item.name)
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const version of latestVersions.slice(0, 20)) {
    const raw = await readKvText(namespace, version.name).catch(() => null);
    if (!raw) continue;
    try {
      return parseCmsBlobText(raw.text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable Cloudflare KV CMS version:",
        version.name,
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function writeVersionedKvJson(namespace: KvNamespaceLike, config: CloudflareKvConfig, value: unknown) {
  const content = JSON.stringify(value, null, 2);
  const metadata = {
    contentType: "application/json",
    updatedAt: new Date().toISOString()
  };
  await namespace.put(cmsKvVersionKey(config.cmsPathname), content, { metadata });
  await namespace.put(config.cmsPathname, content, { metadata });
}

async function withKvSoftLock<T>(
  namespace: KvNamespaceLike,
  config: CloudflareKvConfig,
  name: string,
  task: () => Promise<T>,
  ttlMs: number
) {
  const lockKey = `${config.cmsPathname}:lock:${name.replace(/[^a-z0-9_-]+/gi, "-")}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + ttlMs;
  const existing = await namespace.get(lockKey);

  if (existing) {
    const payload = JSON.parse(existing) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) throw new CmsLockError();
  }

  await namespace.put(lockKey, JSON.stringify({ token, expiresAt }), {
    expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000))
  });

  try {
    return await task();
  } finally {
    const current = await namespace.get(lockKey).catch(() => null);
    if (current) {
      const payload = JSON.parse(current) as { token?: string };
      if (payload.token === token) await namespace.delete(lockKey).catch(() => undefined);
    }
  }
}

async function readVersionedR2CmsData(bucket: R2BucketLike, pathname: string) {
  const primary = await readR2Text(bucket, pathname).catch(() => null);
  if (primary) {
    try {
      return parseCmsBlobText(primary.text);
    } catch (error) {
      console.warn(
        "[cms] Primary Cloudflare R2 CMS payload is unreadable; trying version history:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const versions = await bucket.list({ prefix: cmsVersionPrefix(pathname), limit: 1000 });
  const latestVersions = versions.objects
    .filter((item) => item.key.endsWith(".json"))
    .sort((a, b) => {
      const aTime = a.uploaded ? new Date(a.uploaded).getTime() : 0;
      const bTime = b.uploaded ? new Date(b.uploaded).getTime() : 0;
      return bTime - aTime;
    });

  for (const version of latestVersions.slice(0, 20)) {
    const raw = await readR2Text(bucket, version.key).catch(() => null);
    if (!raw) continue;
    try {
      return parseCmsBlobText(raw.text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable Cloudflare R2 CMS version:",
        version.key,
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function writeR2Json(bucket: R2BucketLike, pathname: string, value: unknown, ifMatch?: string) {
  const content = JSON.stringify(value, null, 2);
  const result = await bucket.put(pathname, content, {
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "no-store"
    },
    ...(ifMatch ? { onlyIf: { etagMatches: ifMatch } } : {})
  });
  if (!result) throw new CmsLockError();
}

async function writeVersionedR2Json(bucket: R2BucketLike, config: CloudflareR2Config, value: unknown) {
  await writeR2Json(bucket, cmsVersionPathname(config.cmsPathname), value);
  await writeR2Json(bucket, config.cmsPathname, value);
}

async function withR2Lock<T>(
  bucket: R2BucketLike,
  config: CloudflareR2Config,
  name: string,
  task: () => Promise<T>,
  ttlMs: number
) {
  const lockPathname = config.cmsPathname.replace(/\.json$/, `.lock.${name.replace(/[^a-z0-9_-]+/gi, "-")}.json`);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + ttlMs;
  const lockPayload = JSON.stringify({ token, expiresAt });

  const created = await bucket.put(lockPathname, lockPayload, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: {
      contentType: "application/json",
      cacheControl: "no-store"
    }
  });

  if (!created) {
    const existing = await readR2Text(bucket, lockPathname);
    if (!existing) throw new CmsLockError();

    const payload = JSON.parse(existing.text) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) throw new CmsLockError();

    await writeR2Json(bucket, lockPathname, { token, expiresAt }, existing.etag);
  }

  try {
    return await task();
  } finally {
    const current = await readR2Text(bucket, lockPathname).catch(() => null);
    if (current) {
      const payload = JSON.parse(current.text) as { token?: string };
      if (payload.token === token) {
        await bucket.delete(lockPathname).catch(() => undefined);
      }
    }
  }
}

async function readVersionedPublicCmsBlobText(pathname: string) {
  const { list } = await vercelBlobClient();
  const result = await list({ prefix: cmsVersionPrefix(pathname), limit: 1000 });
  const latest = result.blobs
    .filter((item) => item.pathname.endsWith(".json"))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];

  if (latest) return readPublicListedBlob(latest);
  return readPublicBlobText(pathname);
}

async function readVersionedPublicCmsData(pathname: string) {
  const primaryProbe = await readPublicBlobText(pathname).catch((error) => {
    if (error instanceof Error && error.message.includes("403")) {
      console.warn("[cms] Public CMS blob read is blocked; using seed data fallback.");
      return "blocked" as const;
    }
    return null;
  });

  if (primaryProbe === "blocked") return null;

  const { list } = await vercelBlobClient();
  const result = await list({ prefix: cmsVersionPrefix(pathname), limit: 1000 });
  const versions = result.blobs
    .filter((item) => item.pathname.endsWith(".json"))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  let publicReadBlocked = false;

  for (const version of versions.slice(0, 20)) {
    const raw = await readPublicListedBlob(version).catch((error) => {
      if (error instanceof Error && error.message.includes("403")) {
        console.warn("[cms] Public CMS blob read is blocked; using seed data fallback.");
        publicReadBlocked = true;
      }
      return null;
    });
    if (publicReadBlocked) break;
    if (!raw) continue;

    try {
      return parseCmsBlobText(raw.text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable CMS version:",
        version.pathname,
        error instanceof Error ? error.message : error
      );
    }
  }

  if (publicReadBlocked) return null;

  const primary = await readPublicBlobText(pathname).catch(() => null);
  if (!primary) return null;
  return parseCmsBlobText(primary.text);
}

async function readPrivateBlobText(config: BlobConfig, pathname: string) {
  try {
    const { get } = await vercelBlobClient();
    const result = await get(pathname, { access: config.access, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return {
      etag: result.blob.etag,
      text: await new Response(result.stream).text()
    };
  } catch (error) {
    if (isBlobNotFoundError(error)) return null;
    throw error;
  }
}

async function readBlobText(config: BlobConfig, pathname: string) {
  if (config.access === "public") {
    return pathname === config.pathname ? readVersionedPublicCmsBlobText(pathname) : readPublicBlobText(pathname);
  }

  const privateBlob = await readPrivateBlobText(config, pathname);
  return privateBlob ?? readVersionedPublicCmsBlobText(pathname);
}

async function writeBlobJson(config: BlobConfig, pathname: string, value: unknown, ifMatch?: string) {
  const shouldWriteVersion = config.access === "public" && pathname === config.pathname && !ifMatch;

  const { put } = await vercelBlobClient();
  await put(shouldWriteVersion ? cmsVersionPathname(pathname) : pathname, JSON.stringify(value, null, 2), {
    access: config.access,
    addRandomSuffix: false,
    allowOverwrite: !shouldWriteVersion,
    cacheControlMaxAge: 60,
    contentType: "application/json",
    ...(ifMatch ? { ifMatch } : {})
  });
}

async function withBlobLock<T>(config: BlobConfig, name: string, task: () => Promise<T>, ttlMs: number) {
  const lockPathname = config.pathname.replace(/\.json$/, `.lock.${name.replace(/[^a-z0-9_-]+/gi, "-")}.json`);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + ttlMs;

  try {
    const { put } = await vercelBlobClient();
    await put(lockPathname, JSON.stringify({ token, expiresAt }), {
      access: config.access,
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
      contentType: "application/json"
    });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("blob already exists"))) {
      throw error;
    }

    const existing = await readBlobText(config, lockPathname);
    if (!existing) throw new CmsLockError();

    const payload = JSON.parse(existing.text) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) {
      throw new CmsLockError();
    }

    try {
      await writeBlobJson(config, lockPathname, { token, expiresAt }, existing.etag);
    } catch (overwriteError) {
      if (isBlobPreconditionError(overwriteError)) throw new CmsLockError();
      throw overwriteError;
    }
  }

  try {
    return await task();
  } finally {
    const current = await readBlobText(config, lockPathname).catch(() => null);
    if (current) {
      const payload = JSON.parse(current.text) as { token?: string };
      if (payload.token === token) {
        const { del } = await vercelBlobClient();
        await del(lockPathname, { ifMatch: current.etag }).catch(() => undefined);
      }
    }
  }
}

export async function withCmsStorageLock<T>(
  name: string,
  task: () => Promise<T>,
  ttlMs = 120_000
): Promise<T> {
  const cloudflareKvConfig = getCloudflareKvConfig();
  const cloudflareKvNamespace = getCloudflareKvNamespace();
  if (cloudflareKvConfig) {
    if (!cloudflareKvNamespace) throw new Error("Cloudflare KV is enabled but the namespace binding is unavailable.");
    return withKvSoftLock(cloudflareKvNamespace, cloudflareKvConfig, name, task, ttlMs);
  }

  const cloudflareR2Config = getCloudflareR2Config();
  const cloudflareR2Bucket = getCloudflareR2Bucket();
  if (cloudflareR2Config) {
    if (!cloudflareR2Bucket) throw new Error("Cloudflare R2 is enabled but the bucket binding is unavailable.");
    return withR2Lock(cloudflareR2Bucket, cloudflareR2Config, name, task, ttlMs);
  }

  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (!upstash) {
    return blob ? withBlobLock(blob, name, task, ttlMs) : task();
  }

  const lockKey = `${upstash.key}:lock:${name}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await upstashCommand<string | null>(upstash, ["SET", lockKey, token, "NX", "PX", ttlMs]);

  if (acquired !== "OK") {
    throw new CmsLockError();
  }

  try {
    return await task();
  } finally {
    const currentToken = await upstashCommand<string | null>(upstash, ["GET", lockKey]).catch(() => null);
    if (currentToken === token) {
      await upstashCommand<number>(upstash, ["DEL", lockKey]).catch(() => 0);
    }
  }
}

export async function readCmsDataFromStorage(): Promise<CmsData> {
  const cloudflareKvConfig = getCloudflareKvConfig();
  const cloudflareKvNamespace = getCloudflareKvNamespace();
  if (cloudflareKvConfig) {
    if (!cloudflareKvNamespace) {
      console.warn("[cms] Cloudflare KV is configured but unavailable in this runtime; using seed data fallback.");
      return cloneSeedData();
    }

    const data = await readVersionedKvCmsData(cloudflareKvNamespace, cloudflareKvConfig.cmsPathname);
    return data || cloneSeedData();
  }

  const cloudflareR2Config = getCloudflareR2Config();
  const cloudflareR2Bucket = getCloudflareR2Bucket();
  if (cloudflareR2Config) {
    if (!cloudflareR2Bucket) {
      console.warn("[cms] Cloudflare R2 is configured but unavailable in this runtime; using seed data fallback.");
      return cloneSeedData();
    }

    const data = await readVersionedR2CmsData(cloudflareR2Bucket, cloudflareR2Config.cmsPathname);
    return data || cloneSeedData();
  }

  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (upstash) {
    const raw = await upstashCommand<string | null>(upstash, ["GET", upstash.key]);
    if (!raw) return cloneSeedData();
    return JSON.parse(raw) as CmsData;
  }

  if (blob) {
    if (blob.access === "public") {
      const versioned = await readVersionedPublicCmsData(blob.pathname);
      if (versioned) return versioned;
      return cloneSeedData();
    }

    const raw = await readBlobText(blob, blob.pathname);
    if (!raw) return cloneSeedData();
    return parseCmsBlobText(raw.text);
  }

  return readFileCmsData();
}

export async function writeCmsDataToStorage(data: CmsData) {
  const cloudflareKvConfig = getCloudflareKvConfig();
  if (cloudflareKvConfig) {
    const { config, namespace } = requireCloudflareKvNamespace();
    await writeVersionedKvJson(namespace, config, encryptCmsData(data));
    return;
  }

  const cloudflareR2Config = getCloudflareR2Config();
  if (cloudflareR2Config) {
    const { config, bucket } = requireCloudflareR2Bucket();
    await writeVersionedR2Json(bucket, config, encryptCmsData(data));
    return;
  }

  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (upstash) {
    await upstashCommand<string>(upstash, ["SET", upstash.key, JSON.stringify(data)]);
    return;
  }

  if (blob) {
    await writeBlobJson(blob, blob.pathname, encryptCmsData(data));
    return;
  }

  if (!canWriteLocalFile()) {
    throw new Error(
      "CMS storage is not configured. Set BLOB_READ_WRITE_TOKEN or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production."
    );
  }

  await writeFileCmsData(data);
}
