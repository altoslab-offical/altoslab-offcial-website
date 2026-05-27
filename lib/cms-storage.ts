import { promises as fs } from "fs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import path from "path";
import { del, get, put } from "@vercel/blob";
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
  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
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

async function readBlobText(config: BlobConfig, pathname: string) {
  try {
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

async function writeBlobJson(config: BlobConfig, pathname: string, value: unknown, ifMatch?: string) {
  await put(pathname, JSON.stringify(value, null, 2), {
    access: config.access,
    addRandomSuffix: false,
    allowOverwrite: true,
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
  const upstash = getUpstashConfig();
  const blob = getBlobConfig();
  if (upstash) {
    const raw = await upstashCommand<string | null>(upstash, ["GET", upstash.key]);
    if (!raw) return cloneSeedData();
    return JSON.parse(raw) as CmsData;
  }

  if (blob) {
    const raw = await readBlobText(blob, blob.pathname);
    if (!raw) return cloneSeedData();
    return parseCmsBlobText(raw.text);
  }

  return readFileCmsData();
}

export async function writeCmsDataToStorage(data: CmsData) {
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
