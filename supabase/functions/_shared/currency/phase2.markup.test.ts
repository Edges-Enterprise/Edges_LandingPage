// Run with: deno test --no-check --allow-env supabase/functions/_shared/currency/phase2.markup.test.ts
//
// Phase 2. Tests for platform markup resolution. Two rules that matter and
// are easy to get wrong:
//
//  1. The chain SPLITS BY CASE. HOME (plan cost currency == store currency)
//     is plan -> provider -> 0, with no country and no default. CROSS-BORDER
//     is country -> default. Plan and provider rows are home-only.
//  2. A disabled row at a more specific level means "no platform markup
//     here", and does NOT fall through to a broader level.

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
  { scope: "provider", scope_key: "lizzysub", markup_type: "percentage", markup_value: 4, enabled: true },
  { scope: "plan", scope_key: "plan_1", markup_type: "percentage", markup_value: 20, enabled: true },
  { scope: "plan", scope_key: "plan_off", markup_type: "percentage", markup_value: 30, enabled: false },
];

// --- CROSS-BORDER (the default when `home` is not set) -------------------

Deno.test("markup: cross-border is country beats default; plan/provider ignored", () => {
  // A plan row would win at home, but cross-border ignores it entirely.
  const country = resolvePlatformMarkup(rows, { countryCode: "rw", planId: "plan_1" });
  assert.equal(country.scope, "country");
  assert.equal(country.rule.markup_value, 10);

  const fallback = resolvePlatformMarkup(rows, { countryCode: "ke" });
  assert.equal(fallback.scope, "default");
  assert.equal(fallback.rule.markup_value, 5);

  // A provider row must NOT leak into the cross-border (FX) path.
  const providerIgnored = resolvePlatformMarkup(rows, {
    countryCode: "ke",
    provider: "lizzysub",
  });
  assert.equal(providerIgnored.scope, "default");
  assert.equal(providerIgnored.rule.markup_value, 5);
});

Deno.test("markup: country lookup is case-insensitive", () => {
  const upper = resolvePlatformMarkup(rows, { countryCode: "RW" });
  assert.equal(upper.scope, "country");
  assert.equal(upper.rule.markup_value, 10);
});

Deno.test("markup: a disabled plan row does NOT fall through (cross-border)", () => {
  const resolved = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_off",
  });
  // Cross-border ignores plan rows altogether, so the country rule applies.
  assert.equal(resolved.scope, "country");
  assert.equal(resolved.rule.markup_value, 10);
});

// --- HOME (cost currency == store currency) ------------------------------

Deno.test("markup: home is plan -> provider -> 0, never the default", () => {
  // A plan row wins at home.
  const plan = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_1",
    provider: "lizzysub",
    home: true,
  });
  assert.equal(plan.scope, "plan");
  assert.equal(plan.rule.markup_value, 20);

  // With no plan row, the provider row wins.
  const provider = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_other",
    provider: "lizzysub",
    home: true,
  });
  assert.equal(provider.scope, "provider");
  assert.equal(provider.rule.markup_value, 4);

  // With neither, there is NO markup: the country row and the 5% default
  // must not apply at home.
  const none = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_other",
    provider: "accragh",
    home: true,
  });
  assert.equal(none.none, true);
  assert.equal(none.rule.markup_value, 0);
  assert.equal(
    platformMarkupChain(rows, { countryCode: "rw", planId: "plan_other", home: true }).length,
    0,
  );
});

Deno.test("markup: a disabled plan row at home does NOT fall through", () => {
  const resolved = resolvePlatformMarkup(rows, {
    countryCode: "rw",
    planId: "plan_off",
    provider: "lizzysub",
    home: true,
  });
  assert.equal(resolved.scope, "plan");
  assert.equal(resolved.none, true, "disabled means no markup, not the provider's");
  assert.equal(
    platformMarkupChain(rows, { countryCode: "rw", planId: "plan_off", home: true }).length,
    0,
  );
});

// --- Shared --------------------------------------------------------------

Deno.test("markup: no enabled row anywhere means no markup", () => {
  const cross = resolvePlatformMarkup([], { countryCode: "rw" });
  assert.equal(cross.none, true);
  assert.equal(cross.rule.markup_value, 0);

  const home = resolvePlatformMarkup([], { countryCode: "rw", home: true });
  assert.equal(home.none, true);
  assert.equal(home.rule.markup_value, 0);
});

Deno.test("markup: fixed type survives resolution", () => {
  const resolved = resolvePlatformMarkup(rows, { countryCode: "ug" });
  assert.equal(resolved.rule.markup_type, "fixed");
  assert.equal(resolved.rule.markup_value, 50);
});

Deno.test("markup: provider scope source is reported", () => {
  const resolved = resolvePlatformMarkup(rows, {
    planId: "plan_other",
    provider: "lizzysub",
    home: true,
  });
  assert.equal(resolved.rule.source, "platform_provider");
});
