// supabase/functions/_shared/currency/providerRate.test.ts
//
// Phase 2. The collection-provider FX leg must distinguish "the provider has
// no rate for this pair" (routine) from "the provider rejected us" (the leg
// is dead). Conflating them is what let a 401'ing Korapay leg report success
// while writing nothing — Blocker 10.

import { assertEquals } from "jsr:@std/assert@1";
import { fetchKorapayRate } from "./providerRate.ts";

const original = Deno.env.get("KORAPAY_SECRET_KEY");

function withSecret(value: string | undefined, fn: () => Promise<void>) {
  if (value === undefined) Deno.env.delete("KORAPAY_SECRET_KEY");
  else Deno.env.set("KORAPAY_SECRET_KEY", value);
  return fn().finally(() => {
    if (original === undefined) Deno.env.delete("KORAPAY_SECRET_KEY");
    else Deno.env.set("KORAPAY_SECRET_KEY", original);
  });
}

function stubFetch(status: number, body: unknown): typeof fetch {
  return (() =>
    Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )) as unknown as typeof fetch;
}

Deno.test("a 401 from the provider is a dead leg, not a missing rate", async () => {
  await withSecret("test-key", async () => {
    const outcome = await fetchKorapayRate(
      "NGN",
      stubFetch(401, { message: "unauthorized" }),
    );
    assertEquals(outcome.kind, "rejected");
    if (outcome.kind === "rejected") assertEquals(outcome.status, 401);
  });
});

Deno.test("a 403 from the provider is a dead leg too", async () => {
  await withSecret("test-key", async () => {
    const outcome = await fetchKorapayRate("GHS", stubFetch(403, "forbidden"));
    assertEquals(outcome.kind, "rejected");
  });
});

Deno.test("a missing key is a dead leg, not a missing rate", async () => {
  await withSecret(undefined, async () => {
    const outcome = await fetchKorapayRate("NGN", stubFetch(200, {}));
    assertEquals(outcome.kind, "rejected");
  });
});

Deno.test("a 200 with a rate yields the rate", async () => {
  await withSecret("test-key", async () => {
    const outcome = await fetchKorapayRate(
      "NGN",
      stubFetch(200, { status: true, data: { rate: 1351.4 } }),
    );
    assertEquals(outcome.kind, "rate");
    if (outcome.kind === "rate") assertEquals(outcome.rate, 1351.4);
  });
});

Deno.test("a 200 with no usable rate is a routine no_rate", async () => {
  await withSecret("test-key", async () => {
    const outcome = await fetchKorapayRate(
      "RWF",
      stubFetch(200, { status: true, data: {} }),
    );
    assertEquals(outcome.kind, "no_rate");
  });
});

Deno.test("a non-auth error status is a no_rate, not a dead leg", async () => {
  await withSecret("test-key", async () => {
    const outcome = await fetchKorapayRate("XOF", stubFetch(404, {}));
    assertEquals(outcome.kind, "no_rate");
  });
});

Deno.test("a zero or negative rate is rejected as unusable", async () => {
  await withSecret("test-key", async () => {
    const zero = await fetchKorapayRate(
      "KES",
      stubFetch(200, { data: { rate: 0 } }),
    );
    assertEquals(zero.kind, "no_rate");
  });
});
