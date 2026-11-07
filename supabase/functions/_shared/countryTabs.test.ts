// Run with: deno test supabase/functions/_shared/countryTabs.test.ts
//
// The globe view's country tabs must never exceed five, and must always keep
// the country the customer is looking at.

import assert from "node:assert/strict";
import {
  MAX_COUNTRY_TABS,
  rankCountryTabs,
} from "../../../src/lib/storefront/countryTabs.ts";

const plans = (spec: Record<string, number>) => {
  const out: { country_code: string }[] = [];
  for (const [cc, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out.push({ country_code: cc });
  }
  return out;
};

Deno.test("countryTabs: shows every country when there are five or fewer", () => {
  const tabs = rankCountryTabs(plans({ ng: 3, gh: 2, ke: 1 }));
  assert.deepEqual(tabs.map((t) => t.country), ["gh", "ke", "ng"]);
});

Deno.test("countryTabs: caps at five, keeping the largest catalogs", () => {
  const tabs = rankCountryTabs(
    plans({ ng: 50, gh: 40, ke: 30, ug: 20, rw: 10, zm: 5, za: 4 }),
  );
  assert.equal(tabs.length, MAX_COUNTRY_TABS);
  assert.deepEqual(tabs.map((t) => t.country), ["gh", "ke", "ng", "rw", "ug"]);
});

Deno.test("countryTabs: keeps the active country even when it is the smallest", () => {
  const tabs = rankCountryTabs(
    plans({ ng: 50, gh: 40, ke: 30, ug: 20, rw: 10, za: 1 }),
    MAX_COUNTRY_TABS,
    "za",
  );
  assert.equal(tabs.length, MAX_COUNTRY_TABS);
  assert.ok(tabs.some((t) => t.country === "za"), "active country is present");
});

Deno.test("countryTabs: an active country outside the catalog is ignored", () => {
  const tabs = rankCountryTabs(
    plans({ ng: 50, gh: 40, ke: 30, ug: 20, rw: 10, za: 1 }),
    MAX_COUNTRY_TABS,
    "us",
  );
  assert.equal(tabs.length, MAX_COUNTRY_TABS);
  assert.ok(!tabs.some((t) => t.country === "us"));
});
