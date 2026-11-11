// supabase/functions/_shared/catalog/catalogResolution.ts
//
// How a store's catalog resolves: which plans it sells, and the markup each
// one carries. Shared by the customer storefront (web
// src/lib/storefront/getStoreCatalog.ts and the global-store-catalog edge
// function), the reseller dashboard reads, and the purchase orchestrator, so
// the four cannot disagree about either question.
//
// Two modes, mirroring the platform's own markup resolution
// (global_platform_markups: default -> country -> plan, most specific wins):
//
//   selected  Every plan is opt-in. A plan with no enabled config row is NOT
//             sold. This is the pre-existing behaviour and the default.
//
//   all       The store sells every active plan. A per-plan config row is an
//             OVERRIDE: enabled = true keeps the plan with its own markup,
//             enabled = false opts that one plan out. A plan with no config
//             row is sold at the store's default markup.
//
// The reason `all` exists: "sell the whole catalog" (11,127 plans) would
// otherwise need 11,127 config rows per store, and the read path had to ship
// those ids in the PostgREST URL - which overflows past ~700 ids and returns
// HTTP 400, the storefront's "no active plans" failure. With `all`, the whole
// catalog is one field plus a default markup.

export type CatalogMode = "selected" | "all";

/** A per-plan config row, as the pricing pipeline consumes it. */
export interface CatalogPlanConfig {
  id?: string | null;
  plan_id?: string;
  enabled?: boolean;
  markup_type: string | null;
  markup_value: number | null;
  selling_price: number | null;
}

/** The store's catalog settings, from global_reseller_applications. */
export interface StoreCatalogSettings {
  catalogMode: CatalogMode;
  defaultMarkupType: "percentage" | "fixed";
  defaultMarkupValue: number;
}

/** Normalize the raw columns into a settings object, with safe defaults. */
export function toStoreCatalogSettings(row: {
  catalog_mode?: string | null;
  default_markup_type?: string | null;
  default_markup_value?: number | string | null;
} | null | undefined): StoreCatalogSettings {
  const mode = row?.catalog_mode === "all" ? "all" : "selected";
  const type = row?.default_markup_type === "fixed" ? "fixed" : "percentage";
  const value = Number(row?.default_markup_value ?? 0);
  return {
    catalogMode: mode,
    defaultMarkupType: type,
    defaultMarkupValue: Number.isFinite(value) && value >= 0 ? value : 0,
  };
}

export interface ResolvedCatalogPlan {
  /** False when the plan is not sold by this store. */
  include: boolean;
  /**
   * The config the pricing pipeline should use. In `all` mode this is the
   * store default when the plan has no row, so the caller passes it straight
   * to pricePlan and never has to branch.
   */
  config: CatalogPlanConfig | null;
}

/**
 * Decide whether a plan is sold and with which markup.
 *
 * `config` is the reseller's own config row for this plan, or null.
 */
export function resolveCatalogPlan(
  config: CatalogPlanConfig | null,
  settings: StoreCatalogSettings,
): ResolvedCatalogPlan {
  const enabled = config?.enabled === true;

  if (settings.catalogMode === "all") {
    if (config) {
      // A row is an override: it keeps the plan (with its own markup) when
      // enabled, and opts it out when not.
      return { include: enabled, config };
    }
    // No row: sold at the store's default markup. selling_price is null so
    // the pipeline computes the price from the markup rather than pinning it.
    return {
      include: true,
      config: {
        markup_type: settings.defaultMarkupType,
        markup_value: settings.defaultMarkupValue,
        selling_price: null,
      },
    };
  }

  // selected: strict opt-in, unchanged.
  return { include: enabled, config: config ?? null };
}
