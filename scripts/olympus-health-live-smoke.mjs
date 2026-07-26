import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { signOlympusIngestRequest } from "../lib/olympus-ingest-auth.ts";

const baseUrl = String(process.env.OLYMPUS_HEALTH_BASE_URL || "https://altoslab-ai.cc").replace(/\/$/, "");
const secret = process.env.OLYMPUS_RELEASE_HMAC_SECRET;
if (!secret) throw new Error("OLYMPUS_RELEASE_HMAC_SECRET is required");

const target = "/api/integrations/olympus/health";
const timestamp = new Date().toISOString();
const nonce = randomBytes(16).toString("hex");
const signature = signOlympusIngestRequest(secret, "GET", target, timestamp, nonce, "");
const response = await fetch(`${baseUrl}${target}`, {
  headers: {
    "x-olympus-signature-version": "olympus-v2",
    "x-olympus-audience": "olympus-website-release",
    "x-olympus-timestamp": timestamp,
    "x-olympus-nonce": nonce,
    "x-olympus-signature": `sha256=${signature}`
  },
  redirect: "error",
  signal: AbortSignal.timeout(10_000)
});
const payload = await response.json().catch(() => null);
assert.equal(response.status, 200);
assert.equal(payload?.ok, true);
assert.equal(payload?.siteOrigin, "https://altoslab-ai.cc");
assert.equal(payload?.contract?.kind, "olympus_website_release_set");
assert.deepEqual(payload?.contract?.languages, ["zh-Hant", "zh-Hans", "en"]);
assert.equal(payload?.auth?.scheme, "hmac-sha256");
assert.equal(payload?.auth?.version, "olympus-v2");
assert.equal(payload?.auth?.audience, "olympus-website-release");
assert.equal(payload?.publicMutationAllowed, false);

console.log(`Olympus signed health live smoke: PASS (${baseUrl})`);
