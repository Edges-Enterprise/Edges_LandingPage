// Run with: deno test supabase/functions/_shared/catalog/catalogResolution.test.ts
import assert from "node:assert/strict";
import {
  resolveCatalogPlan,
  toStoreCatalogSettings,
  type StoreCatalogSettings,
} from "./catalogResolution.ts";

const SELECTED: StoreCatalogSettings = {
  catalogMode: "selected",
  defaultMarkupType: "percentage",
  defaultMarkupValue: 0,
};

const ALL: StoreCatalogSettings = {
  catalogMode: "all",
  defaultMarkupType: "percentage",
  defaultMarkupValue: 15,
};

Deno.test("toStoreCatalogSettings defaults to selected with no markup", () => {
  assert.deepEqual(toStoreCatalogSettings(null), SELECTED);
  assert.deepEqual(toStoreCatalogSettings({}), SELECTED);
});

Deno.test("toStoreCatalogSettings reads all mode and a fixed default", () => {
  assert.deepEqual(
    toStoreCatalogSettings({
      catalog_mode: "all",
      default_markup_type: "fixed",
      default_markup_value: 250,
    }),
    { catalogMode: "all", defaultMarkupType: "fixed", defaultMarkupValue: 250 },
  );
});

Deno.test("toStoreCatalogSettings rejects an unknown mode and a bad value", () => {
  assert.deepEqual(
    toStoreCatalogSettings({
      catalog_mode: "everything",
      default_markup_type: "flat",
      default_markup_value: -5,
    }),
    SELECTED,
  );
  // A numeric string (PostgREST numeric) is accepted.
  assert.equal(
    toStoreCatalogSettings({ default_markup_value: "12" }).defaultMarkupValue,
    12,
  );
});

Deno.test("selected: a plan is sold only with an enabled row", () => {
  assert.deepEqual(resolveCatalogPlan(null, SELECTED), {
    include: false,
    config: null,
  });

  const disabled = resolveCatalogPlan(
    { markup_type: "percentage", markup_value: 10, selling_price: null, enabled: false },
    SELECTED,
  );
  assert.equal(disabled.include, false);

  const row = { markup_type: "fixed", markup_value: 40, selling_price: 500, enabled: true };
  assert.deepEqual(resolveCatalogPlan(row, SELECTED), {
    include: true,
    config: row,
  });
});

Deno.test("all: a plan with no row is sold at the store default markup", () => {
  const resolved = resolveCatalogPlan(null, ALL);
  assert.equal(resolved.include, true);
  assert.deepEqual(resolved.config, {
    markup_type: "percentage",
    markup_value: 15,
    // null so the pipeline computes from markup rather than pinning a price
    selling_price: null,
  });
});

Deno.test("all: a row overrides the default and can opt a plan out", () => {
  const row = { markup_type: "fixed", markup_value: 99, selling_price: 1234, enabled: true };
  assert.deepEqual(resolveCatalogPlan(row, ALL), { include: true, config: row });

  // enabled = false is an explicit opt-out, not "use the default".
  const optedOut = resolveCatalogPlan(
    { markup_type: "percentage", markup_value: 5, selling_price: null, enabled: false },
    ALL,
  );
  assert.equal(optedOut.include, false);
});

Deno.test("all: a store default of zero markup still includes plans", () => {
  const resolved = resolveCatalogPlan(null, {
    catalogMode: "all",
    defaultMarkupType: "percentage",
    defaultMarkupValue: 0,
  });
  assert.equal(resolved.include, true);
  assert.equal(resolved.config?.markup_value, 0);
});
