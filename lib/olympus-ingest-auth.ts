import { createHmac, timingSafeEqual } from "crypto";

const VERSION = "olympus-v2";
const AUDIENCE = "olympus-website-release";
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const seenNonces = new Map<string, number>();

export function signOlympusIngestRequest(
  secret: string,
  method: string,
  requestTarget: string,
  timestamp: string,
  nonce: string,
  body: string
): string {
  return createHmac("sha256", secret)
    .update(canonicalRequest(method, requestTarget, timestamp, nonce, body))
    .digest("hex");
}

export function verifyOlympusIngestRequest(request: Request, body: string) {
  const secret = process.env.OLYMPUS_RELEASE_HMAC_SECRET;
  if (!secret) return { ok: false as const, status: 503, error: "olympus_hmac_not_configured" };

  const version = request.headers.get("x-olympus-signature-version") || "";
  const audience = request.headers.get("x-olympus-audience") || "";
  const timestamp = request.headers.get("x-olympus-timestamp") || "";
  const nonce = request.headers.get("x-olympus-nonce") || "";
  const signature = (request.headers.get("x-olympus-signature") || "").trim().replace(/^sha256=/i, "");
  if (
    version !== VERSION || audience !== AUDIENCE || !timestamp ||
    !/^[a-f0-9]{32,128}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)
  ) return { ok: false as const, status: 401, error: "olympus_signature_headers_invalid" };

  const now = Date.now();
  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > SIGNATURE_TOLERANCE_MS) {
    return { ok: false as const, status: 401, error: "olympus_signature_timestamp_invalid" };
  }
  for (const [key, expiresAt] of seenNonces) if (expiresAt <= now) seenNonces.delete(key);

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const requestTarget = `${url.pathname}${url.search}`;
  const nonceKey = `${version}\n${audience}\n${method}\n${requestTarget}\n${timestamp}\n${nonce}`;
  if (seenNonces.has(nonceKey)) return { ok: false as const, status: 401, error: "olympus_signature_replayed" };

  const expected = signOlympusIngestRequest(secret, method, requestTarget, timestamp, nonce, body);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { ok: false as const, status: 401, error: "olympus_signature_invalid" };
  }
  seenNonces.set(nonceKey, now + SIGNATURE_TOLERANCE_MS);
  return { ok: true as const };
}

function canonicalRequest(method: string, requestTarget: string, timestamp: string, nonce: string, body: string): string {
  if (!/^\/[\x21-\x7e]*$/.test(requestTarget) || /[\r\n\0]/.test(requestTarget)) {
    throw new Error("olympus_request_target_invalid");
  }
  return `${VERSION}\n${AUDIENCE}\n${method.toUpperCase()}\n${requestTarget}\n${timestamp}\n${nonce}\n${body}`;
}
