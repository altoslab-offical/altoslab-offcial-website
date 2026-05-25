import { promises as fs } from "fs";
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
    pathname: blobPathFromStorageKey(key)
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
      key: blob.key
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
  return error instanceof Error && error.name === "BlobNotFoundError";
}

function isBlobPreconditionError(error: unknown) {
  return error instanceof Error && error.name === "BlobPreconditionFailedError";
}

async function readPrivateBlobText(pathname: string) {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
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

async function writePrivateBlobJson(pathname: string, value: unknown, ifMatch?: string) {
  await put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
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
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
      contentType: "application/json"
    });
  } catch (error) {
    const existing = await readPrivateBlobText(lockPathname);
    if (!existing) throw new CmsLockError();

    const payload = JSON.parse(existing.text) as { expiresAt?: number };
    if (!payload.expiresAt || payload.expiresAt > Date.now()) {
      throw new CmsLockError();
    }

    try {
      await writePrivateBlobJson(lockPathname, { token, expiresAt }, existing.etag);
    } catch (overwriteError) {
      if (isBlobPreconditionError(overwriteError)) throw new CmsLockError();
      throw overwriteError;
    }
  }

  try {
    return await task();
  } finally {
    const current = await readPrivateBlobText(lockPathname).catch(() => null);
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
    const raw = await readPrivateBlobText(blob.pathname);
    if (!raw) return cloneSeedData();
    return JSON.parse(raw.text) as CmsData;
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
    await writePrivateBlobJson(blob.pathname, data);
    return;
  }

  if (!canWriteLocalFile()) {
    throw new Error(
      "CMS storage is not configured. Set BLOB_READ_WRITE_TOKEN or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production."
    );
  }

  await writeFileCmsData(data);
}
