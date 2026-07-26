import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { POST as releaseArticleSet } from "@/app/api/admin/blog/release-set/route";
import { signBlogIngestBody } from "@/lib/blog-ingest-auth";
import { verifyOlympusIngestRequest } from "@/lib/olympus-ingest-auth";
import { BLOG_LANGUAGES, blogPostPath } from "@/lib/blog-utils";
import { mutateRawCmsData, readCmsData } from "@/lib/cms";
import { CmsLockError, withCmsStorageLock } from "@/lib/cms-storage";
import {
  boundedLedger,
  createLedgerEntry,
  createOlympusReleaseReceipt,
  ledgerDecision,
  OLYMPUS_RELEASE_LEDGER_SCHEMA,
  parseOlympusReleaseRequest,
  releaseIngestRunId,
  releaseSetRequestSha256,
  validOlympusIdempotencyKey,
  type OlympusReleaseLedgerEntry,
  type OlympusReleaseReceipt,
  type OlympusReleaseSet
} from "@/lib/olympus-release-contract";
import { siteUrl } from "@/lib/seo";
import type { BlogPost, CmsData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 850_000;

/**
 * A narrow, HMAC-authenticated bridge for Olympus. The public/admin blog
 * endpoints remain unchanged; every successful request is still evaluated by
 * the existing release-set quality and media gates.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
    return response(413, { ok: false, error: "olympus_release_payload_too_large" });
  }
  const auth = verifyOlympusIngestRequest(request, body);
  if (!auth.ok) return response(auth.status, { ok: false, error: "olympus_auth_required" });

  let input: ReturnType<typeof parseOlympusReleaseRequest>;
  try {
    input = parseOlympusReleaseRequest(JSON.parse(body));
  } catch (error) {
    return response(400, { ok: false, error: error instanceof Error ? error.message : "olympus_release_request_invalid" });
  }
  const requestSha256 = releaseSetRequestSha256(input.releaseSet);

  try {
    return await withCmsStorageLock(`olympus-release-${hash(input.idempotencyKey).slice(0, 40)}`, async () => {
      const existing = await readCmsData();
      const decision = ledgerDecision(existing.olympusReleaseLedger, input.idempotencyKey, requestSha256);
      if (decision.kind === "replay") return response(200, { ok: true, replayed: true, receipt: decision.receipt });
      if (decision.kind === "conflict") {
        return response(409, { ok: false, error: "olympus_release_idempotency_conflict" });
      }

      const releaseSet = prepareReleaseSet(input.releaseSet, input.idempotencyKey);
      const releaseResponse = await callExistingReleaseSet(releaseSet);
      const releasePayload = await releaseResponse.json().catch(() => null);
      const publishedPosts = publishedPostsFromReleaseResponse(releasePayload, releaseSet);
      if (!releaseResponse.ok || publishedPosts.length !== BLOG_LANGUAGES.length) {
        return response(releaseResponse.status >= 400 ? releaseResponse.status : 409, {
          ok: false,
          error: "olympus_release_pipeline_rejected"
        });
      }

      const receipt = createOlympusReleaseReceipt({
        idempotencyKey: input.idempotencyKey,
        releaseSet,
        posts: publishedPosts,
        siteOrigin: siteUrl,
        blogPath: (post) => blogPostPath(post.slug, post.language),
        publishedAt: new Date().toISOString()
      });
      const entry = createLedgerEntry({
        idempotencyKey: input.idempotencyKey,
        requestSha256,
        receipt,
        now: new Date().toISOString()
      });
      await mutateRawCmsData((data) => {
        const current = validatedLedger(data.olympusReleaseLedger);
        const concurrent = ledgerDecision(current, input.idempotencyKey, requestSha256);
        if (concurrent.kind === "conflict") throw new OlympusConflictError();
        if (concurrent.kind === "replay") return;
        data.olympusReleaseLedger = boundedLedger(current, entry);
      });
      return response(201, { ok: true, replayed: false, receipt });
    });
  } catch (error) {
    if (error instanceof CmsLockError) return response(202, { ok: false, error: "olympus_release_busy" });
    if (error instanceof OlympusConflictError) return response(409, { ok: false, error: "olympus_release_idempotency_conflict" });
    return response(500, { ok: false, error: "olympus_release_internal_error" });
  }
}

/** A signed reconciliation lookup. No public receipt can be read anonymously. */
export async function GET(request: Request) {
  const auth = verifyOlympusIngestRequest(request, "");
  if (!auth.ok) return response(auth.status, { ok: false, error: "olympus_auth_required" });
  const url = new URL(request.url);
  const idempotencyKey = url.searchParams.get("idempotency_key");
  const externalId = url.searchParams.get("id");
  if (Boolean(idempotencyKey) === Boolean(externalId)) {
    return response(400, { ok: false, error: "olympus_reconcile_lookup_invalid" });
  }
  if (idempotencyKey && !validOlympusIdempotencyKey(idempotencyKey)) {
    return response(400, { ok: false, error: "olympus_reconcile_lookup_invalid" });
  }
  const data = await readCmsData();
  const ledger = validatedLedger(data.olympusReleaseLedger);
  const entry = idempotencyKey
    ? ledger.find((item) => item.idempotencyKey === idempotencyKey)
    : ledger.find((item) => item.receipt.id === externalId);
  if (!entry) return response(404, { ok: false, error: "olympus_release_not_found" });
  return response(200, { ok: true, receipt: entry.receipt });
}

function prepareReleaseSet(releaseSet: OlympusReleaseSet, idempotencyKey: string): OlympusReleaseSet {
  const next = structuredClone(releaseSet);
  // The client cannot select an ingest identity independently of its release
  // key. This lets the existing pipeline identify repeated work safely.
  next.ingestRunId = releaseIngestRunId(idempotencyKey);
  return next;
}

async function callExistingReleaseSet(releaseSet: OlympusReleaseSet): Promise<Response> {
  // The desktop-facing secret is accepted only by the narrow Olympus bridge.
  // The in-process handoff re-signs with the separate admin ingest secret so
  // compromise of one credential cannot authenticate the other route.
  const secret = process.env.BLOG_INGEST_HMAC_SECRET;
  if (!secret) throw new Error("olympus_release_hmac_secret_unconfigured");
  const body = JSON.stringify(releaseSet);
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString("hex");
  const signature = signBlogIngestBody(secret, timestamp, nonce, body);
  return releaseArticleSet(new Request("http://olympus.internal/api/admin/blog/release-set", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-altos-timestamp": timestamp,
      "x-altos-nonce": nonce,
      "x-altos-signature": `sha256=${signature}`
    },
    body
  }));
}

function publishedPostsFromReleaseResponse(value: unknown, releaseSet: OlympusReleaseSet): Array<Pick<BlogPost, "id" | "language" | "slug" | "body" | "publishedAt">> {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.posts) || !Array.isArray(releaseSet.posts)) return [];
  const inputPosts = releaseSet.posts.filter(isRecord);
  const responsePosts = value.posts.filter(isRecord);
  if (responsePosts.length !== BLOG_LANGUAGES.length) return [];
  const published = responsePosts.map((post) => {
    if (post.status !== "published" || typeof post.id !== "string" || typeof post.language !== "string" || typeof post.slug !== "string") return null;
    const source = inputPosts.find((candidate) => candidate.language === post.language && candidate.slug === post.slug);
    if (!source || typeof source.body !== "string") return null;
    return {
      id: post.id,
      language: post.language,
      slug: post.slug,
      body: source.body,
      publishedAt: new Date().toISOString()
    };
  });
  return published.every(Boolean)
    ? published as Array<Pick<BlogPost, "id" | "language" | "slug" | "body" | "publishedAt">>
    : [];
}

function validatedLedger(value: CmsData["olympusReleaseLedger"]): OlympusReleaseLedgerEntry[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is OlympusReleaseLedgerEntry => entry?.schema === OLYMPUS_RELEASE_LEDGER_SCHEMA)
    : [];
}

function response(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

class OlympusConflictError extends Error {}
