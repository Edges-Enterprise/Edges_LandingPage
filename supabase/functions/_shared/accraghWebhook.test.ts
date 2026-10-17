// Run with: deno test supabase/functions/_shared/accraghWebhook.test.ts
// Expected signatures below were generated independently (Node crypto,
// createHmac("sha256", secret).update(`${ts}.${body}`)) following the PHP
// example in NetFillGh's own docs: 'sha256=' . hash_hmac('sha256', ts.'.'.body, secret)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyNetfillghSignature } from "./accraghWebhook.ts";

const secret = "whsec_test_secret";
const body = JSON.stringify({
  event: "order.status_changed",
  data: { order_ref: "API_abc123def456", status: "completed" },
});
const ts = "1790000000";
const sig = "sha256=" +
  createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
const now = 1790000000 + 10;

Deno.test("accepts a valid signature", async () => {
  const r = await verifyNetfillghSignature({
    secret, timestamp: ts, signature: sig, rawBody: body, nowSeconds: now,
  });
  assert.equal(r.ok, true);
});

Deno.test("rejects a tampered body", async () => {
  const r = await verifyNetfillghSignature({
    secret, timestamp: ts, signature: sig,
    rawBody: body.replace("completed", "failed"), nowSeconds: now,
  });
  assert.equal(r.ok, false);
});

Deno.test("rejects the wrong secret", async () => {
  const r = await verifyNetfillghSignature({
    secret: "other", timestamp: ts, signature: sig, rawBody: body, nowSeconds: now,
  });
  assert.equal(r.ok, false);
});

Deno.test("rejects a timestamp swapped after signing", async () => {
  const r = await verifyNetfillghSignature({
    secret, timestamp: String(Number(ts) + 1), signature: sig, rawBody: body,
    nowSeconds: now,
  });
  assert.equal(r.ok, false);
});

Deno.test("rejects stale and future timestamps (>300s)", async () => {
  for (const skew of [301, -301]) {
    const r = await verifyNetfillghSignature({
      secret, timestamp: ts, signature: sig, rawBody: body,
      nowSeconds: Number(ts) + skew,
    });
    assert.equal(r.ok, false);
  }
  const edge = await verifyNetfillghSignature({
    secret, timestamp: ts, signature: sig, rawBody: body,
    nowSeconds: Number(ts) + 300,
  });
  assert.equal(edge.ok, true);
});

Deno.test("rejects missing / malformed headers", async () => {
  const base = { secret, rawBody: body, nowSeconds: now };
  for (
    const h of [
      { timestamp: null, signature: sig },
      { timestamp: "abc", signature: sig },
      { timestamp: ts, signature: null },
      { timestamp: ts, signature: sig.replace("sha256=", "") }, // no prefix
      { timestamp: ts, signature: "sha256=zzzz" }, // not hex
      { timestamp: ts, signature: "sha256=" }, // empty
      { timestamp: ts, signature: "sha256=" + sig.slice(7, -2) }, // wrong length
    ]
  ) {
    const r = await verifyNetfillghSignature({ ...base, ...h });
    assert.equal(r.ok, false);
  }
});
