// Run with: deno test --no-check --allow-env supabase/functions/_shared/catalog/phase2.catalog.test.ts
//
// Phase 2. Tests for detection and the RANGE purchase shape. The detection
// lookup is injected so no network is needed; the point of the test is the
// fallback behaviour, which is what silently mis-routes a topup if it is
// wrong.

import assert from "node:assert/strict";
import {
  clearDetectionCache,
  detectFromPrefix,
  detectNetwork,
  normaliseMsisdn,
} from "./detectNetwork.ts";

Deno.test("detect: normalises an msisdn to digits", () => {
  assert.equal(normaliseMsisdn("+250 788 123 456"), "250788123456");
  assert.equal(normaliseMsisdn("0788123456"), "0788123456");
  assert.equal(normaliseMsisdn(""), "");
});

Deno.test("detect: prefix fallback picks the longest match", () => {
  // 27 (ZA) must not win over 250 (RW) for a Rwandan number.
  assert.equal(detectFromPrefix("+250788123456")?.country, "rw");
  assert.equal(detectFromPrefix("+27711234567")?.country, "za");
  assert.equal(detectFromPrefix("+2348031234567")?.country, "ng");
  assert.equal(detectFromPrefix("+999123456"), null);
});

Deno.test("detect: uses the provider lookup when it answers", async () => {
  clearDetectionCache();
  let called = 0;
  const result = await detectNetwork("+250788123456", async (m) => {
    called++;
    assert.equal(m, "250788123456", "lookup gets digits, no plus");
    return {
      brand: "MTN",
      country: "RW",
      mobileCountryCode: "646",
      mobileNetworkCode: "10",
      msisdn: m,
    };
  });
  assert.equal(result.country, "rw", "country lowercased");
  assert.equal(result.brand, "MTN");
  assert.equal(result.method, "lookup");
  assert.equal(called, 1);
});

Deno.test("detect: caches per number so the second call is free", async () => {
  clearDetectionCache();
  let called = 0;
  const lookup = async (m: string) => {
    called++;
    return {
      brand: "Airtel",
      country: "UG",
      mobileCountryCode: "641",
      mobileNetworkCode: "01",
      msisdn: m,
    };
  };
  await detectNetwork("+256701234567", lookup);
  await detectNetwork("+256701234567", lookup);
  assert.equal(called, 1, "second lookup served from cache");
});

Deno.test("detect: falls back to prefix when the lookup fails", async () => {
  clearDetectionCache();
  const result = await detectNetwork("+250788123456", async () => {
    throw new Error("lookup unavailable");
  });
  assert.equal(result.method, "prefix", "fallback is labelled, not hidden");
  assert.equal(result.country, "rw");
});

Deno.test("detect: unknown when both fail, never a wrong guess", async () => {
  clearDetectionCache();
  const result = await detectNetwork("+999123456", async () => {
    throw new Error("lookup unavailable");
  });
  assert.equal(result.method, "unknown");
  assert.equal(result.country, "");
});
