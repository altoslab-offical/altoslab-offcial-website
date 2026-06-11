import { getCloudflareContext } from "@opennextjs/cloudflare";

const DEFAULT_D1_BINDING = "ALTOS_BLOG_D1";
const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";

type D1RunResult = {
  success?: boolean;
  meta?: {
    changes?: number;
  };
};

type D1AllResult<T = Record<string, unknown>> = {
  results?: T[];
  success?: boolean;
};

export type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1AllResult<T>>;
  run(): Promise<D1RunResult>;
};

export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike;
  exec?(query: string): Promise<unknown>;
};

export type CloudflareD1Config = {
  enabled: boolean;
  binding: string;
  cmsKey: string;
};

export function cloudflareD1BindingName() {
  return process.env.CLOUDFLARE_D1_BINDING?.trim() || DEFAULT_D1_BINDING;
}

export function getCloudflareD1Config(): CloudflareD1Config | null {
  if (process.env.CLOUDFLARE_D1_ENABLED !== "1") return null;

  return {
    enabled: true,
    binding: cloudflareD1BindingName(),
    cmsKey: process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY
  };
}

export function isCloudflareD1Configured() {
  return Boolean(getCloudflareD1Config());
}

export function getCloudflareD1Database(): D1DatabaseLike | null {
  const config = getCloudflareD1Config();
  if (!config) return null;

  try {
    const context = getCloudflareContext();
    const database = (context.env as Record<string, unknown>)[config.binding] as D1DatabaseLike | undefined;
    if (database?.prepare) return database;
  } catch {
    return null;
  }

  return null;
}

export function requireCloudflareD1Database() {
  const config = getCloudflareD1Config();
  const database = getCloudflareD1Database();
  if (!config || !database) {
    throw new Error("Cloudflare D1 is enabled but the configured database binding is unavailable.");
  }
  return { config, database };
}
