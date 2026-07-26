import { createHash } from "crypto";
import type { BlogPost } from "./types";

export const OLYMPUS_RELEASE_REQUEST_SCHEMA = "olympus_website_release_request_v1";
export const OLYMPUS_RELEASE_RECEIPT_SCHEMA = "olympus_website_release_receipt_v1";
export const OLYMPUS_RELEASE_LEDGER_SCHEMA = "olympus_website_release_ledger_v1";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;

export type OlympusReleaseSet = Record<string, unknown> & {
  qualityManifest?: { contentSha256?: unknown };
  posts?: unknown;
};

export type OlympusReleaseRequest = {
  schema: typeof OLYMPUS_RELEASE_REQUEST_SCHEMA;
  idempotencyKey: string;
  releaseSet: OlympusReleaseSet;
};

export type OlympusReleaseReceiptPost = {
  id: string;
  language: string;
  slug: string;
  canonicalUrl: string;
  bodySha256: string;
  publishedAt: string;
};

export type OlympusReleaseReceipt = {
  schema: typeof OLYMPUS_RELEASE_RECEIPT_SCHEMA;
  status: "published";
  id: string;
  idempotencyKey: string;
  releaseContentSha256: string;
  posts: OlympusReleaseReceiptPost[];
  publishedAt: string;
};

export type OlympusReleaseLedgerEntry = {
  schema: typeof OLYMPUS_RELEASE_LEDGER_SCHEMA;
  idempotencyKey: string;
  requestSha256: string;
  receipt: OlympusReleaseReceipt;
  createdAt: string;
  updatedAt: string;
};

export function parseOlympusReleaseRequest(value: unknown): OlympusReleaseRequest {
  if (!isRecord(value)) throw new Error("olympus_release_request_invalid");
  if (value.schema !== OLYMPUS_RELEASE_REQUEST_SCHEMA) throw new Error("olympus_release_schema_invalid");
  const idempotencyKey = typeof value.idempotencyKey === "string" ? value.idempotencyKey : "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) throw new Error("olympus_release_idempotency_key_invalid");
  if (!isRecord(value.releaseSet) || Array.isArray(value.releaseSet)) throw new Error("olympus_release_set_invalid");
  const releaseSet = value.releaseSet as OlympusReleaseSet;
  const contentSha256 = releaseContentSha256(releaseSet);
  if (!contentSha256) throw new Error("olympus_release_content_sha256_invalid");
  if (!Array.isArray(releaseSet.posts) || releaseSet.posts.length !== 3) {
    throw new Error("olympus_release_set_requires_three_languages");
  }
  return { schema: OLYMPUS_RELEASE_REQUEST_SCHEMA, idempotencyKey, releaseSet };
}

export function validOlympusIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && IDEMPOTENCY_KEY.test(value);
}

export function releaseContentSha256(releaseSet: OlympusReleaseSet): string | null {
  const value = releaseSet.qualityManifest?.contentSha256;
  return typeof value === "string" && SHA256_HEX.test(value) ? value.toLowerCase() : null;
}

export function releaseSetRequestSha256(releaseSet: OlympusReleaseSet): string {
  return sha256(stableJson(releaseSet));
}

export function releaseExternalId(idempotencyKey: string): string {
  return `olympus-release-${sha256(idempotencyKey).slice(0, 40)}`;
}

export function releaseIngestRunId(idempotencyKey: string): string {
  return `olympus-${sha256(idempotencyKey).slice(0, 40)}`;
}

export function ledgerDecision(
  entries: OlympusReleaseLedgerEntry[] | undefined,
  idempotencyKey: string,
  requestSha256: string
): { kind: "new" } | { kind: "replay"; receipt: OlympusReleaseReceipt } | { kind: "conflict" } {
  const entry = (entries || []).find((item) => item?.idempotencyKey === idempotencyKey);
  if (!entry) return { kind: "new" };
  return entry.requestSha256 === requestSha256
    ? { kind: "replay", receipt: entry.receipt }
    : { kind: "conflict" };
}

export function createOlympusReleaseReceipt(input: {
  idempotencyKey: string;
  releaseSet: OlympusReleaseSet;
  posts: Array<Pick<BlogPost, "id" | "language" | "slug" | "body" | "publishedAt">>;
  siteOrigin: string;
  blogPath: (post: Pick<BlogPost, "slug" | "language">) => string;
  publishedAt: string;
}): OlympusReleaseReceipt {
  const releaseContentSha = releaseContentSha256(input.releaseSet);
  if (!releaseContentSha) throw new Error("olympus_release_content_sha256_invalid");
  if (input.posts.length !== 3 || input.posts.some((post) => !post.id || !post.slug || !post.publishedAt)) {
    throw new Error("olympus_release_published_post_receipt_invalid");
  }
  const posts = input.posts
    .map((post) => ({
      id: post.id,
      language: post.language,
      slug: post.slug,
      canonicalUrl: new URL(input.blogPath(post), input.siteOrigin).toString(),
      bodySha256: sha256(String(post.body || "")),
      publishedAt: post.publishedAt as string
    }))
    .sort((a, b) => a.language.localeCompare(b.language));
  return {
    schema: OLYMPUS_RELEASE_RECEIPT_SCHEMA,
    status: "published",
    id: releaseExternalId(input.idempotencyKey),
    idempotencyKey: input.idempotencyKey,
    releaseContentSha256: releaseContentSha,
    posts,
    publishedAt: input.publishedAt
  };
}

export function createLedgerEntry(input: {
  idempotencyKey: string;
  requestSha256: string;
  receipt: OlympusReleaseReceipt;
  now: string;
}): OlympusReleaseLedgerEntry {
  return {
    schema: OLYMPUS_RELEASE_LEDGER_SCHEMA,
    idempotencyKey: input.idempotencyKey,
    requestSha256: input.requestSha256,
    receipt: input.receipt,
    createdAt: input.now,
    updatedAt: input.now
  };
}

export function boundedLedger(entries: OlympusReleaseLedgerEntry[] | undefined, next: OlympusReleaseLedgerEntry): OlympusReleaseLedgerEntry[] {
  return [...(entries || []).filter((entry) => entry.idempotencyKey !== next.idempotencyKey), next]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 500);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
