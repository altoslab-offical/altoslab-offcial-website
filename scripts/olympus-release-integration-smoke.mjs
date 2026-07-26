import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  boundedLedger,
  createLedgerEntry,
  createOlympusReleaseReceipt,
  ledgerDecision,
  parseOlympusReleaseRequest,
  releaseSetRequestSha256
} from "../lib/olympus-release-contract.ts";
import { signOlympusIngestRequest, verifyOlympusIngestRequest } from "../lib/olympus-ingest-auth.ts";
import { verifyBlogIngestRequest } from "../lib/blog-ingest-auth.ts";

process.env.BLOG_INGEST_HMAC_SECRET = "admin-ingest-smoke-secret-not-for-production";
process.env.OLYMPUS_RELEASE_HMAC_SECRET = "olympus-integration-smoke-secret-not-for-production";

const idempotencyKey = "olympus-smoke-release-20260722-0001";
const releaseSet = {
  slot: "morning",
  generationDate: "2026-07-22",
  scheduledFor: "2026-07-22T08:40:00+08:00",
  translationGroupId: "olympus-smoke-group-20260722",
  publishMode: "publish-if-valid",
  qualityManifest: { contentSha256: "a".repeat(64) },
  posts: [
    { language: "zh-Hant", slug: "olympus-smoke-zh-hant", body: "繁體中文測試內文" },
    { language: "zh-Hans", slug: "olympus-smoke-zh-hans", body: "简体中文测试正文" },
    { language: "en", slug: "olympus-smoke-en", body: "Olympus smoke-test body." }
  ]
};
const request = parseOlympusReleaseRequest({
  schema: "olympus_website_release_request_v1",
  idempotencyKey,
  releaseSet
});
const requestSha256 = releaseSetRequestSha256(request.releaseSet);

assert.throws(
  () => parseOlympusReleaseRequest({ ...request, releaseSet: { ...releaseSet, posts: releaseSet.posts.slice(0, 2) } }),
  /requires_three_languages/
);

const body = JSON.stringify(request);
const timestamp = new Date().toISOString();
const nonce = randomBytes(16).toString("hex");
const target = "/api/integrations/olympus/releases";
const signature = signOlympusIngestRequest(process.env.OLYMPUS_RELEASE_HMAC_SECRET, "POST", target, timestamp, nonce, body);
const signedRequest = () => new Request("https://example.test/api/integrations/olympus/releases", {
  method: "POST",
  headers: {
    "x-olympus-signature-version": "olympus-v2",
    "x-olympus-audience": "olympus-website-release",
    "x-olympus-timestamp": timestamp,
    "x-olympus-nonce": nonce,
    "x-olympus-signature": `sha256=${signature}`
  },
  body
});
assert.equal(verifyOlympusIngestRequest(signedRequest(), body).ok, true, "valid HMAC must pass");
assert.equal(verifyOlympusIngestRequest(signedRequest(), body).ok, false, "replayed nonce must fail before any release work");
const releaseSecret = process.env.OLYMPUS_RELEASE_HMAC_SECRET;
delete process.env.OLYMPUS_RELEASE_HMAC_SECRET;
assert.equal(
  verifyOlympusIngestRequest(signedRequest(), body).ok,
  false,
  "the admin ingest secret must never act as a fallback for the Olympus bridge"
);
process.env.OLYMPUS_RELEASE_HMAC_SECRET = releaseSecret;
const adminReplay = new Request("https://example.test/api/admin/blog/release-set", {
  method: "POST",
  headers: signedRequest().headers,
  body
});
assert.equal(verifyBlogIngestRequest(adminReplay, body).ok, false, "an Olympus v2 signature must not authenticate an admin ingest route");

const crossRouteNonce = randomBytes(16).toString("hex");
const healthSignature = signOlympusIngestRequest(
  process.env.OLYMPUS_RELEASE_HMAC_SECRET,
  "GET",
  "/api/integrations/olympus/health",
  timestamp,
  crossRouteNonce,
  ""
);
const crossRouteRequest = new Request("https://example.test/api/integrations/olympus/releases", {
  method: "GET",
  headers: {
    "x-olympus-signature-version": "olympus-v2",
    "x-olympus-audience": "olympus-website-release",
    "x-olympus-timestamp": timestamp,
    "x-olympus-nonce": crossRouteNonce,
    "x-olympus-signature": `sha256=${healthSignature}`
  }
});
assert.equal(verifyOlympusIngestRequest(crossRouteRequest, "").ok, false, "a health signature must not replay on the release route");

const badNonce = randomBytes(16).toString("hex");
const badRequest = new Request("https://example.test/api/integrations/olympus/releases", {
  method: "POST",
  headers: {
    "x-olympus-signature-version": "olympus-v2",
    "x-olympus-audience": "olympus-website-release",
    "x-olympus-timestamp": timestamp,
    "x-olympus-nonce": badNonce,
    "x-olympus-signature": "sha256=" + "0".repeat(64)
  },
  body
});
assert.equal(verifyOlympusIngestRequest(badRequest, body).ok, false, "bad HMAC must fail before any release work");

const receipt = createOlympusReleaseReceipt({
  idempotencyKey,
  releaseSet,
  posts: releaseSet.posts.map((post, index) => ({
    id: `post_olympus_smoke_${index + 1}`,
    language: post.language,
    slug: post.slug,
    body: post.body,
    publishedAt: "2026-07-22T01:00:00.000Z"
  })),
  siteOrigin: "https://altoslab-ai.cc",
  blogPath: (post) => post.language === "zh-Hant" ? `/blog/${post.slug}` : `/${post.language}/blog/${post.slug}`,
  publishedAt: "2026-07-22T01:00:00.000Z"
});
const entry = createLedgerEntry({
  idempotencyKey,
  requestSha256,
  receipt,
  now: "2026-07-22T01:00:00.000Z"
});
const ledger = boundedLedger([], entry);
assert.equal(ledgerDecision(ledger, idempotencyKey, requestSha256).kind, "replay", "same request must reconcile without a write");
assert.equal(ledgerDecision(ledger, idempotencyKey, "b".repeat(64)).kind, "conflict", "same key with changed payload must fail closed");
assert.equal(receipt.posts.length, 3);
assert.ok(receipt.posts.every((post) => post.canonicalUrl.startsWith("https://altoslab-ai.cc/")));

const releaseRoute = await readFile(new URL("../app/api/integrations/olympus/releases/route.ts", import.meta.url), "utf8");
assert.ok(
  releaseRoute.indexOf("const auth = verifyOlympusIngestRequest(request, body);") < releaseRoute.indexOf("return await withCmsStorageLock"),
  "authentication must occur before a release lock or any release pipeline call"
);
assert.ok(releaseRoute.includes("return response(409, { ok: false, error: \"olympus_release_idempotency_conflict\" });"));
assert.ok(releaseRoute.includes("const secret = process.env.BLOG_INGEST_HMAC_SECRET;"));

console.log("Olympus release integration contract smoke: PASS");
