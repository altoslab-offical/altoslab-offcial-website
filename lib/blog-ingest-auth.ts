import { createHmac, timingSafeEqual } from "crypto";

type NonceEntry = {
  expiresAt: number;
};

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const seenNonces = new Map<string, NonceEntry>();

function cleanupNonces(now: number) {
  for (const [nonce, entry] of seenNonces.entries()) {
    if (entry.expiresAt <= now) seenNonces.delete(nonce);
  }
}

function normalizeSignature(signature: string) {
  return signature.trim().replace(/^sha256=/i, "");
}

export function signBlogIngestBody(secret: string, timestamp: string, nonce: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

export function verifyBlogIngestRequest(request: Request, body: string) {
  const secret = process.env.BLOG_INGEST_HMAC_SECRET;
  if (!secret) {
    return { ok: false as const, status: 503, error: "BLOG_INGEST_HMAC_SECRET is not configured" };
  }

  const timestamp = request.headers.get("x-altos-timestamp") || "";
  const nonce = request.headers.get("x-altos-nonce") || "";
  const signature = normalizeSignature(request.headers.get("x-altos-signature") || "");
  if (!timestamp || !nonce || !signature) {
    return { ok: false as const, status: 401, error: "Missing ingest signature headers" };
  }

  const now = Date.now();
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > SIGNATURE_TOLERANCE_MS) {
    return { ok: false as const, status: 401, error: "Ingest signature timestamp is outside the accepted window" };
  }

  cleanupNonces(now);
  const nonceKey = `${timestamp}:${nonce}:${signature}`;
  if (seenNonces.has(nonceKey)) {
    return { ok: false as const, status: 401, error: "Ingest signature nonce was already used" };
  }

  const expected = signBlogIngestBody(secret, timestamp, nonce, body);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { ok: false as const, status: 401, error: "Invalid ingest signature" };
  }

  seenNonces.set(nonceKey, { expiresAt: now + SIGNATURE_TOLERANCE_MS });
  return { ok: true as const };
}
