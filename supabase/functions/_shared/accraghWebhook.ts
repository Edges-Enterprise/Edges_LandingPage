// supabase/functions/_shared/accraghWebhook.ts
//
// Task 4, branch 1.d.iv.zi. Signature verification for NetFillGh (AccraGH)
// order-status webhooks, per NetFillGh's own API docs (section 7):
//
//   headers:   X-NetFillGh-Timestamp  (unix seconds)
//              X-NetFillGh-Signature  ("sha256=" + hex)
//   signature: HMAC-SHA256( secret, `${timestamp}.${rawBody}` )
//   secret:    the per-account "signing secret" shown at
//              netfillgh.com/api_settings - NOT the API key.
//   freshness: reject if |now - timestamp| > 300 seconds.
//
// Must be computed over the RAW request body exactly as received, not a
// re-serialised JSON.parse() result.

export const MAX_TIMESTAMP_SKEW_SECONDS = 300;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyNetfillghSignature(args: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowSeconds?: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature, rawBody } = args;
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!timestamp || !/^\d+$/.test(timestamp)) {
    return { ok: false, reason: "missing or malformed timestamp" };
  }
  if (Math.abs(now - parseInt(timestamp, 10)) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp outside allowed window" };
  }

  if (!signature || !signature.startsWith("sha256=")) {
    return { ok: false, reason: "missing or malformed signature" };
  }
  const sigBytes = hexToBytes(signature.slice("sha256=".length));
  if (!sigBytes) {
    return { ok: false, reason: "signature is not valid hex" };
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(`${timestamp}.${rawBody}`),
  );

  return valid ? { ok: true } : { ok: false, reason: "signature mismatch" };
}
