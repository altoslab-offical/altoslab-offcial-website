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
import {
  getCloudflareD1Config,
  getCloudflareD1Database,
  requireCloudflareD1Database,
  type CloudflareD1Config,
  type D1DatabaseLike
} from "./cloudflare-d1";
import {
  deleteGcsObject,
  GcsPreconditionError,
  getGcsStorageConfig,
  listGcsObjects,
  readGcsText,
  requireGcsStorageConfig,
  writeGcsObject,
  type GcsStorageConfig
} from "./gcp-storage";
import {
  AwsS3PreconditionError,
  deleteAwsS3Object,
  getAwsS3StorageConfig,
  listAwsS3Objects,
  readAwsS3Text,
  requireAwsS3StorageConfig,
  writeAwsS3Object,
  type AwsS3StorageConfig
} from "./aws-s3-storage";
import { seedData } from "./seed";
import type { CmsData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "cms.json");
const DEFAULT_STORAGE_KEY = "altoslab:cms:v1";
const DEFAULT_D1_CHUNK_SIZE = 180_000;

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

type D1ChunkedBlobMarker = {
  cloudflareD1Chunked: true;
  chunks: number;
  byteLength: number;
  updatedAt: string;
  chunkTable?: "cms_blob_chunks" | "cms_version_chunks";
  chunkId?: string;
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
  const cloudflareD1 = getCloudflareD1Config();
  const cloudflareKv = getCloudflareKvConfig();
  const cloudflareR2 = getCloudflareR2Config();
  const gcs = getGcsStorageConfig();
  const awsS3 = getAwsS3StorageConfig();
  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (cloudflareD1) {
    return {
      provider: "cloudflare-d1",
      durable: true,
      writable: true,
      configured: true,
      key: cloudflareD1.cmsKey,
      binding: cloudflareD1.binding,
      encrypted: Boolean(process.env.CMS_ENCRYPTION_KEY)
    };
  }

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

  if (gcs) {
    return {
      provider: "gcs",
      durable: true,
      writable: true,
      configured: true,
      key: gcs.cmsKey,
      bucket: gcs.bucket,
      pathname: gcs.cmsPathname,
      encrypted: Boolean(process.env.CMS_ENCRYPTION_KEY)
    };
  }

  if (awsS3) {
    return {
      provider: "aws-s3",
      durable: true,
      writable: true,
      configured: true,
      key: awsS3.cmsKey,
      bucket: awsS3.bucket,
      region: awsS3.region,
      pathname: awsS3.cmsPathname,
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

let d1SchemaReady = false;

function cmsD1VersionId(key: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeKey = key.replace(/[^a-z0-9._:-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
  return `${safeKey}:${stamp}:${randomBytes(4).toString("hex")}`;
}

async function runD1(database: D1DatabaseLike, query: string, ...values: unknown[]) {
  return values.length > 0 ? database.prepare(query).bind(...values).run() : database.prepare(query).run();
}

async function ensureD1Schema(database: D1DatabaseLike) {
  if (d1SchemaReady) return;

  const schema = `
CREATE TABLE IF NOT EXISTS cms_blobs (
  cms_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_versions (
  id TEXT PRIMARY KEY,
  cms_key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_versions_key_created_at ON cms_versions (cms_key, created_at DESC);
CREATE TABLE IF NOT EXISTS cms_blob_chunks (
  cms_key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (cms_key, chunk_index)
);
CREATE TABLE IF NOT EXISTS cms_version_chunks (
  version_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (version_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS cms_locks (
  lock_key TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`;

  for (const statement of schema
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)) {
    await runD1(database, statement);
  }

  d1SchemaReady = true;
}

function d1ChunkSize() {
  const configured = Number(process.env.CLOUDFLARE_D1_CMS_CHUNK_SIZE || DEFAULT_D1_CHUNK_SIZE);
  return Number.isFinite(configured) && configured > 10_000 ? configured : DEFAULT_D1_CHUNK_SIZE;
}

function splitTextIntoChunks(text: string, size = d1ChunkSize()) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) chunks.push(text.slice(index, index + size));
  return chunks;
}

function d1ChunkedMarker(
  chunks: number,
  byteLength: number,
  updatedAt: string,
  chunkTable?: "cms_blob_chunks" | "cms_version_chunks",
  chunkId?: string
): D1ChunkedBlobMarker {
  return {
    cloudflareD1Chunked: true,
    chunks,
    byteLength,
    updatedAt,
    chunkTable,
    chunkId
  };
}

function parseD1ChunkedMarker(text: string): D1ChunkedBlobMarker | null {
  try {
    const payload = JSON.parse(text) as Partial<D1ChunkedBlobMarker>;
    if (payload?.cloudflareD1Chunked === true && Number.isInteger(payload.chunks) && Number(payload.chunks) >= 0) {
      return payload as D1ChunkedBlobMarker;
    }
  } catch {
    return null;
  }
  return null;
}

async function readD1ChunkedText(database: D1DatabaseLike, table: "cms_blob_chunks" | "cms_version_chunks", id: string) {
  const idColumn = table === "cms_blob_chunks" ? "cms_key" : "version_id";
  const chunks = await database
    .prepare(`SELECT chunk_index, value FROM ${table} WHERE ${idColumn} = ?1 ORDER BY chunk_index ASC`)
    .bind(id)
    .all<{ chunk_index?: number; value?: string }>();
  return (chunks.results || [])
    .filter((chunk) => typeof chunk.value === "string")
    .sort((a, b) => Number(a.chunk_index || 0) - Number(b.chunk_index || 0))
    .map((chunk) => chunk.value)
    .join("");
}

async function resolveD1CmsBlobText(
  database: D1DatabaseLike,
  text: string,
  options: { cmsKey?: string; versionId?: string }
) {
  const marker = parseD1ChunkedMarker(text);
  if (!marker) return text;

  if (marker.chunkTable && marker.chunkId) return readD1ChunkedText(database, marker.chunkTable, marker.chunkId);
  if (options.cmsKey) return readD1ChunkedText(database, "cms_blob_chunks", options.cmsKey);
  if (options.versionId) return readD1ChunkedText(database, "cms_version_chunks", options.versionId);
  return text;
}

async function writeD1Chunks(
  database: D1DatabaseLike,
  table: "cms_blob_chunks" | "cms_version_chunks",
  id: string,
  content: string
) {
  const idColumn = table === "cms_blob_chunks" ? "cms_key" : "version_id";
  await runD1(database, `DELETE FROM ${table} WHERE ${idColumn} = ?1`, id);
  const chunks = splitTextIntoChunks(content);
  for (const [index, chunk] of chunks.entries()) {
    await runD1(
      database,
      `INSERT INTO ${table} (${idColumn}, chunk_index, value) VALUES (?1, ?2, ?3)`,
      id,
      index,
      chunk
    );
  }
  return chunks.length;
}

async function readVersionedD1CmsData(database: D1DatabaseLike, config: CloudflareD1Config) {
  await ensureD1Schema(database);

  const primary = await database
    .prepare("SELECT value FROM cms_blobs WHERE cms_key = ?1")
    .bind(config.cmsKey)
    .first<{ value?: string }>()
    .catch(() => null);
  if (typeof primary?.value === "string") {
    try {
      const text = await resolveD1CmsBlobText(database, primary.value, { cmsKey: config.cmsKey });
      return parseCmsBlobText(text);
    } catch (error) {
      console.warn(
        "[cms] Primary Cloudflare D1 CMS payload is unreadable; trying version history:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const versions = await database
    .prepare("SELECT id, value FROM cms_versions WHERE cms_key = ?1 ORDER BY created_at DESC LIMIT 20")
    .bind(config.cmsKey)
    .all<{ id?: string; value?: string }>()
    .catch(() => ({ results: [] }));

  for (const version of versions.results || []) {
    if (typeof version.value !== "string") continue;
    try {
      const text = await resolveD1CmsBlobText(database, version.value, { versionId: version.id });
      return parseCmsBlobText(text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable Cloudflare D1 CMS version:",
        version.id || "unknown",
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function writeVersionedD1Json(database: D1DatabaseLike, config: CloudflareD1Config, value: unknown) {
  await ensureD1Schema(database);

  const content = JSON.stringify(value, null, 2);
  const updatedAt = new Date().toISOString();
  const versionId = cmsD1VersionId(config.cmsKey);
  const versionChunks = await writeD1Chunks(database, "cms_version_chunks", versionId, content);
  const marker = d1ChunkedMarker(versionChunks, Buffer.byteLength(content), updatedAt, "cms_version_chunks", versionId);
  const versionValue = JSON.stringify(marker);
  const primaryValue = JSON.stringify(marker);

  await runD1(
    database,
    "INSERT INTO cms_versions (id, cms_key, value, created_at) VALUES (?1, ?2, ?3, ?4)",
    versionId,
    config.cmsKey,
    versionValue,
    updatedAt
  );
  await runD1(
    database,
    `INSERT INTO cms_blobs (cms_key, value, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(cms_key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    config.cmsKey,
    primaryValue,
    updatedAt
  );
}

async function withD1Lock<T>(
  database: D1DatabaseLike,
  config: CloudflareD1Config,
  name: string,
  task: () => Promise<T>,
  ttlMs: number
) {
  await ensureD1Schema(database);

  const safeName = name.replace(/[^a-z0-9_-]+/gi, "-") || "default";
  const lockKey = `${config.cmsKey}:lock:${safeName}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const expiresAt = now + ttlMs;

  await runD1(database, "DELETE FROM cms_locks WHERE lock_key = ?1 AND expires_at <= ?2", lockKey, now);
  const acquired = await runD1(
    database,
    "INSERT OR IGNORE INTO cms_locks (lock_key, token, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)",
    lockKey,
    token,
    expiresAt,
    now
  );
  if (acquired.meta?.changes !== 1) throw new CmsLockError();

  try {
    return await task();
  } finally {
    await runD1(database, "DELETE FROM cms_locks WHERE lock_key = ?1 AND token = ?2", lockKey, token).catch(() => undefined);
  }
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

async function readVersionedGcsCmsData(config: GcsStorageConfig, pathname: string) {
  const primary = await readGcsText(config, pathname).catch(() => null);
  if (primary) {
    try {
      return parseCmsBlobText(primary.text);
    } catch (error) {
      console.warn(
        "[cms] Primary GCS CMS payload is unreadable; trying version history:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const versions = await listGcsObjects(config, cmsVersionPrefix(pathname), 1000);
  const latestVersions = versions
    .filter((item) => item.name.endsWith(".json"))
    .sort((a, b) => {
      const aTime = a.updated ? new Date(a.updated).getTime() : 0;
      const bTime = b.updated ? new Date(b.updated).getTime() : 0;
      return bTime - aTime;
    });

  for (const version of latestVersions.slice(0, 20)) {
    const raw = await readGcsText(config, version.name).catch(() => null);
    if (!raw) continue;
    try {
      return parseCmsBlobText(raw.text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable GCS CMS version:",
        version.name,
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function writeGcsJson(config: GcsStorageConfig, pathname: string, value: unknown, ifGenerationMatch?: string | number) {
  await writeGcsObject(config, pathname, JSON.stringify(value, null, 2), "application/json", ifGenerationMatch);
}

async function writeVersionedGcsJson(config: GcsStorageConfig, value: unknown) {
  await writeGcsJson(config, cmsVersionPathname(config.cmsPathname), value);
  await writeGcsJson(config, config.cmsPathname, value);
}

async function withGcsLock<T>(config: GcsStorageConfig, name: string, task: () => Promise<T>, ttlMs: number) {
  const lockPathname = config.cmsPathname.replace(/\.json$/, `.lock.${name.replace(/[^a-z0-9_-]+/gi, "-")}.json`);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + ttlMs;

  try {
    await writeGcsJson(config, lockPathname, { token, expiresAt }, 0);
  } catch (error) {
    if (!(error instanceof GcsPreconditionError)) throw error;

    const existing = await readGcsText(config, lockPathname);
    if (!existing) throw new CmsLockError();

    const payload = JSON.parse(existing.text) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) throw new CmsLockError();

    try {
      await writeGcsJson(config, lockPathname, { token, expiresAt }, existing.generation);
    } catch (overwriteError) {
      if (overwriteError instanceof GcsPreconditionError) throw new CmsLockError();
      throw overwriteError;
    }
  }

  try {
    return await task();
  } finally {
    const current = await readGcsText(config, lockPathname).catch(() => null);
    if (current) {
      const payload = JSON.parse(current.text) as { token?: string };
      if (payload.token === token) await deleteGcsObject(config, lockPathname).catch(() => undefined);
    }
  }
}

async function readVersionedAwsS3CmsData(config: AwsS3StorageConfig, pathname: string) {
  const primary = await readAwsS3Text(config, pathname).catch(() => null);
  if (primary) {
    try {
      return parseCmsBlobText(primary.text);
    } catch (error) {
      console.warn(
        "[cms] Primary AWS S3 CMS payload is unreadable; trying version history:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const versions = await listAwsS3Objects(config, cmsVersionPrefix(pathname), 1000);
  const latestVersions = versions
    .filter((item) => item.name.endsWith(".json"))
    .sort((a, b) => {
      const aTime = a.updated ? new Date(a.updated).getTime() : 0;
      const bTime = b.updated ? new Date(b.updated).getTime() : 0;
      return bTime - aTime;
    });

  for (const version of latestVersions.slice(0, 20)) {
    const raw = await readAwsS3Text(config, version.name).catch(() => null);
    if (!raw) continue;
    try {
      return parseCmsBlobText(raw.text);
    } catch (error) {
      console.warn(
        "[cms] Skipping unreadable AWS S3 CMS version:",
        version.name,
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function writeAwsS3Json(config: AwsS3StorageConfig, pathname: string, value: unknown, options: { ifMatch?: string; ifNoneMatch?: "*" } = {}) {
  await writeAwsS3Object(config, pathname, JSON.stringify(value, null, 2), "application/json", options);
}

async function writeVersionedAwsS3Json(config: AwsS3StorageConfig, value: unknown) {
  await writeAwsS3Json(config, cmsVersionPathname(config.cmsPathname), value);
  await writeAwsS3Json(config, config.cmsPathname, value);
}

async function withAwsS3Lock<T>(config: AwsS3StorageConfig, name: string, task: () => Promise<T>, ttlMs: number) {
  const lockPathname = config.cmsPathname.replace(/\.json$/, `.lock.${name.replace(/[^a-z0-9_-]+/gi, "-")}.json`);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + ttlMs;

  try {
    await writeAwsS3Json(config, lockPathname, { token, expiresAt }, { ifNoneMatch: "*" });
  } catch (error) {
    if (!(error instanceof AwsS3PreconditionError)) throw error;

    const existing = await readAwsS3Text(config, lockPathname);
    if (!existing) throw new CmsLockError();

    const payload = JSON.parse(existing.text) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) throw new CmsLockError();

    try {
      await writeAwsS3Json(config, lockPathname, { token, expiresAt }, { ifMatch: existing.etag });
    } catch (overwriteError) {
      if (overwriteError instanceof AwsS3PreconditionError) throw new CmsLockError();
      throw overwriteError;
    }
  }

  try {
    return await task();
  } finally {
    const current = await readAwsS3Text(config, lockPathname).catch(() => null);
    if (current) {
      const payload = JSON.parse(current.text) as { token?: string };
      if (payload.token === token) await deleteAwsS3Object(config, lockPathname).catch(() => undefined);
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
  const cloudflareD1Config = getCloudflareD1Config();
  const cloudflareD1Database = getCloudflareD1Database();
  if (cloudflareD1Config) {
    if (!cloudflareD1Database) throw new Error("Cloudflare D1 is enabled but the database binding is unavailable.");
    return withD1Lock(cloudflareD1Database, cloudflareD1Config, name, task, ttlMs);
  }

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

  const gcs = getGcsStorageConfig();
  if (gcs) return withGcsLock(gcs, name, task, ttlMs);

  const awsS3 = getAwsS3StorageConfig();
  if (awsS3) return withAwsS3Lock(awsS3, name, task, ttlMs);

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
  const cloudflareD1Config = getCloudflareD1Config();
  const cloudflareD1Database = getCloudflareD1Database();
  if (cloudflareD1Config) {
    if (!cloudflareD1Database) {
      console.warn("[cms] Cloudflare D1 is configured but unavailable in this runtime; using seed data fallback.");
      return cloneSeedData();
    }

    const data = await readVersionedD1CmsData(cloudflareD1Database, cloudflareD1Config);
    return data || cloneSeedData();
  }

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

  const gcs = getGcsStorageConfig();
  if (gcs) {
    const data = await readVersionedGcsCmsData(gcs, gcs.cmsPathname);
    return data || cloneSeedData();
  }

  const awsS3 = getAwsS3StorageConfig();
  if (awsS3) {
    const data = await readVersionedAwsS3CmsData(awsS3, awsS3.cmsPathname);
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
  const cloudflareD1Config = getCloudflareD1Config();
  if (cloudflareD1Config) {
    const { config, database } = requireCloudflareD1Database();
    await writeVersionedD1Json(database, config, encryptCmsData(data));
    return;
  }

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

  const gcs = getGcsStorageConfig();
  if (gcs) {
    await writeVersionedGcsJson(requireGcsStorageConfig(), encryptCmsData(data));
    return;
  }

  const awsS3 = getAwsS3StorageConfig();
  if (awsS3) {
    await writeVersionedAwsS3Json(requireAwsS3StorageConfig(), encryptCmsData(data));
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
      "CMS storage is not configured. Set GCS_BUCKET, BLOB_READ_WRITE_TOKEN, or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production."
    );
  }

  await writeFileCmsData(data);
}
