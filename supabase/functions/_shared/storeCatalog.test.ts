// Run with: deno test supabase/functions/_shared/storeCatalog.test.ts
import assert from "node:assert/strict";
import {
  computeStorePrice,
  scopeToCountry,
  uniqueSorted,
  type PlanConfigRow,
} from "./storeCatalog.ts";

function cfg(partial: Partial<PlanConfigRow>): PlanConfigRow {
  return {
    plan_id: "p1",
    markup_type: "percentage",
    markup_value: 0,
    selling_price: null,
    ...partial,
  };
}

Deno.test("explicit selling_price wins over markup", () => {
  const price = computeStorePrice(100, cfg({ selling_price: 175, markup_value: 50 }));
  assert.equal(price, 175);
});

Deno.test("selling_price of 0 is honoured (not treated as missing)", () => {
  assert.equal(computeStorePrice(100, cfg({ selling_price: 0 })), 0);
});

Deno.test("percentage markup rounds like the orchestrator", () => {
  // 250 * 1.10 = 275
  assert.equal(computeStorePrice(250, cfg({ markup_type: "percentage", markup_value: 10 })), 275);
  // 99 * 1.15 = 113.85 -> 114
  assert.equal(computeStorePrice(99, cfg({ markup_type: "percentage", markup_value: 15 })), 114);
});

Deno.test("fixed markup adds a flat amount and rounds", () => {
  assert.equal(computeStorePrice(100, cfg({ markup_type: "fixed", markup_value: 25.4 })), 125);
});

Deno.test("zero/absent markup returns the base price", () => {
  assert.equal(computeStorePrice(100, cfg({ markup_type: "percentage", markup_value: 0 })), 100);
  assert.equal(computeStorePrice(100, undefined), 100);
});

Deno.test("scopeToCountry matches case-insensitively and keeps order", () => {
  const plans = [
    { id: "a", country_code: "NG" },
    { id: "b", country_code: "gh" },
    { id: "c", country_code: "ng" },
  ];
  assert.deepEqual(scopeToCountry(plans, "ng").map((p) => p.id), ["a", "c"]);
  assert.deepEqual(scopeToCountry(plans, "GH").map((p) => p.id), ["b"]);
});

Deno.test("scopeToCountry returns nothing for an empty country", () => {
  assert.deepEqual(scopeToCountry([{ country_code: "ng" }], ""), []);
  assert.deepEqual(scopeToCountry([{ country_code: "ng" }], null), []);
});

Deno.test("uniqueSorted trims, drops blanks, dedupes and sorts", () => {
  assert.deepEqual(uniqueSorted([" MTN ", "airtel", "MTN", "", null, undefined, "GLO"]), [
    "GLO",
    "MTN",
    "airtel",
  ]);
});
