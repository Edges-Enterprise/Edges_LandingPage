// Run with: deno test --no-check --allow-env supabase/functions/_shared/currency/phase2.markup.test.ts
//
// Phase 2. Tests for platform markup resolution. The rule that matters and
// is easy to get wrong: a disabled row at a more specific level means "no
// platform markup here", and does NOT fall through to a broader level.

import assert from "node:assert/strict";
import {
  platformMarkupChain,
  resolvePlatformMarkup,
  type PlatformMarkupRow,
} from "./markup.ts";

const rows: PlatformMarkupRow[] = [
  { scope: "default", scope_key: "*", markup_type: "percentage", markup_value: 5, enabled: true },
  { scope: "country", scope_key: "rw", markup_type: "percentage", markup_value: 10, enabled: true },
  { scope: "country", scope_key: "ug", markup_type: "fixed", markup_value: 50, enabled: true },
  { scope: "plan", scope_key: "plan_1", markup_type: "percentage", markup_value: 20, enabled: true },
  { scope: "plan", scope_key: "plan_off", markup_type: "percentage", markup_value: 30, enabled: false },
];

Deno.test("markup: plan beats country beats default", () => {
  const plan = resolvePlatformMarkup(rows, { countryCode: "rw", planId: "plan_1" });
  assert.equal(plan.scope, "plan");
  assert.equal(plan.rule.markup_value, 20);

  const country = resolvePlatformMarkup(rows, { countryCode: "rw", planId: "plan_other" });
  assert.equal(country.scope, "country");
  assert.equal(country.rule.markup_value, 10);

  const fallback = resolvePlatformMarkup(rows, { countryCode: "ke" });
  assert.equal(fallback.scope, "default");
  assert.equal(fallback.rule.markup_value, 5);
});

Deno.test("markup: country lookup is case-insensitive", () => {
  const upper = resolvePlatformMarkup(rows, { countryCode: "RW" });
  assert.equal(upper.scope, "country");
  assert.equal(upper.rule.markup_value, 10);
});

Deno.test("markup: a disabled plan row does NOT fall through", () => {
  const resolved = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_off",
  });
  assert.equal(resolved.scope, "plan");
  assert.equal(resolved.none, true, "disabled means no markup, not the country's");
  assert.equal(platformMarkupChain(rows, { countryCode: "rw", planId: "plan_off" }).length, 0);
});

Deno.test("markup: no enabled row anywhere means no markup", () => {
  const resolved = resolvePlatformMarkup([], { countryCode: "rw" });
  assert.equal(resolved.none, true);
  assert.equal(resolved.rule.markup_value, 0);
});

Deno.test("markup: fixed type survives resolution", () => {
  const resolved = resolvePlatformMarkup(rows, { countryCode: "ug" });
  assert.equal(resolved.rule.markup_type, "fixed");
  assert.equal(resolved.rule.markup_value, 50);
});
