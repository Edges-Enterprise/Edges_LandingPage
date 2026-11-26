// Run with: node --experimental-strip-types supabase/functions/_shared/catalog/lizzysubCatalog.test.ts
import assert from "node:assert/strict";
import {
  normalizeLizzysubPlan,
  parseSize,
  parseValidity,
  roundUpBuffer,
} from "./lizzysubCatalog.ts";
import type { LizzysubPlan } from "./lizzysubClient.ts";

function plan(overrides: Partial<LizzysubPlan>): LizzysubPlan {
  return {
    plan_id: "1",
    name: "1.0GB GIFTING = ₦500.00 30 days",
    amount: 500,
    network: "MTN",
    plan_type: "GIFTING",
    ...overrides,
  };
}

assert.equal(roundUpBuffer(475), 475);
assert.equal(roundUpBuffer(476), 480);
assert.equal(roundUpBuffer(480), 480);
assert.equal(roundUpBuffer(93), 95);
assert.equal(roundUpBuffer(186), 190);
assert.equal(roundUpBuffer(29100), 29100);
assert.equal(roundUpBuffer(14625), 14630);

assert.equal(parseSize("6.01GB GIFTING = ₦1,860.00 Get 6.01GB"), "6.01GB");
assert.equal(parseSize("2500MB GIFTING = ₦1,488.00"), "2500MB");
assert.equal(parseSize("20TB GIFTING = ₦29,250.00 Get Unlimited 20"), "20TB");
assert.equal(parseSize("COOPERATE GIFTING = ₦500.00"), null);

assert.deepEqual(parseValidity("Get 6.01GB Always ON (410MB Daily for 15 days)"), {
  label: "15 days",
  days: 15,
});
assert.deepEqual(parseValidity("20-30days (stable)"), {
  label: "20-30 days",
  days: 30,
});
assert.deepEqual(parseValidity("Less than 7days"), {
  label: "Less than 7 days",
  days: 7,
});
assert.deepEqual(parseValidity("1 Month"), { label: "1 month", days: 30 });
assert.deepEqual(parseValidity("1 week"), { label: "1 week", days: 7 });
assert.deepEqual(parseValidity("Valid for one year"), { label: "1 year", days: 365 });
assert.deepEqual(parseValidity("Valid for 24 hrs"), { label: "24 hours", days: 1 });
assert.deepEqual(parseValidity("Very stable 1gb weekly bundle"), {
  label: "7 days",
  days: 7,
});
assert.deepEqual(parseValidity("no timing here"), { label: "", days: null });

const normal = normalizeLizzysubPlan(
  plan({
    plan_id: "259",
    name: "6.01GB GIFTING = ₦1,860.00 Get 6.01GB Always ON (410MB Daily for 15 days). Valid for 15 days.",
    amount: 1860,
    network: "GLO",
  }),
);
assert.ok("plan" in normal);
assert.equal(normal.plan.provider_plan_id, "259");
assert.equal(normal.plan.network, "GLO");
assert.equal(normal.plan.name, "6.01GB");
assert.equal(normal.plan.base_price, 1860);
assert.equal(normal.plan.validity, "15 days");
assert.equal(normal.plan.duration_days, 15);
assert.equal(normal.plan.country_code, "NG");
assert.equal(normal.plan.currency, "NGN");
assert.equal(normal.plan.metadata.provider_cost, 1860);
assert.equal(normal.plan.metadata.plan_type, "GIFTING");

const testPlan = normalizeLizzysubPlan(
  plan({
    plan_id: "311",
    name: "1.000000GB GIFTING = ₦500,000.00 Warning | Dont buy it | It is for testing",
    amount: 500000,
  }),
);
assert.ok("rejected" in testPlan);

const held = normalizeLizzysubPlan(
  plan({ plan_id: "312", name: "3GB COOPERATE GIFTING = ₦950.00 30 days", amount: 950 }),
);
assert.ok("rejected" in held);
assert.match(held.rejected.reason, /held/);

const blocked = normalizeLizzysubPlan(
  plan({
    plan_id: "242",
    name: "1.0000000MB COOPERATE GIFTING = ₦50,000.00 7days",
    amount: 50000,
  }),
);
assert.ok("rejected" in blocked);
assert.match(blocked.rejected.reason, /held/);

const noSize = normalizeLizzysubPlan(
  plan({ plan_id: "900", name: "COOPERATE GIFTING = ₦500.00 7days", amount: 500 }),
);
assert.ok("rejected" in noSize);

console.log("lizzysubCatalog: all assertions passed");
