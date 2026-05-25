import { promises as fs } from "fs";
import path from "path";
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

function canWriteLocalFile() {
  return process.env.CMS_FILE_STORAGE === "1" || process.env.NODE_ENV !== "production";
}

export function getCmsStorageStatus() {
  const upstash = getUpstashConfig();
  if (upstash) {
    return {
      provider: "upstash-redis",
      durable: true,
      writable: true,
      configured: true,
      key: upstash.key
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

export async function withCmsStorageLock<T>(
  name: string,
  task: () => Promise<T>,
  ttlMs = 120_000
): Promise<T> {
  const upstash = getUpstashConfig();
  if (!upstash) return task();

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
  if (upstash) {
    const raw = await upstashCommand<string | null>(upstash, ["GET", upstash.key]);
    if (!raw) return cloneSeedData();
    return JSON.parse(raw) as CmsData;
  }

  return readFileCmsData();
}

export async function writeCmsDataToStorage(data: CmsData) {
  const upstash = getUpstashConfig();
  if (upstash) {
    await upstashCommand<string>(upstash, ["SET", upstash.key, JSON.stringify(data)]);
    return;
  }

  if (!canWriteLocalFile()) {
    throw new Error(
      "CMS storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production."
    );
  }

  await writeFileCmsData(data);
}
