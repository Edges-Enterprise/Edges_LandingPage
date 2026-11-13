// supabase/functions/_shared/currency/markup.ts
//
// Phase 2. Resolve the platform markup for a plan.
//
// The resolution SPLITS BY CASE, decided by whether the plan's cost currency
// equals the store's currency (the caller passes `home`):
//
//   HOME (cost currency == store currency, e.g. a Lizzysub NGN plan in an NG
//   store): plan -> provider -> 0. There is no FX, so nothing converts and no
//   buffer is added; the platform takes nothing unless it set a plan/provider
//   row. The reseller marks up on the RAW cost.
//
//   CROSS-BORDER (any mismatch, including every Zendit plan because Zendit is
//   USD): country -> default. The country lever stays for volatile currencies;
//   plan and provider rows are HOME-ONLY and are ignored here, so a per-plan
//   cut cannot leak into the FX path.
//
// Within a case the levels are most-specific-wins and they do not stack — a
// plan row replaces a provider row replaces nothing. (Within a single level
// there is exactly one row, enforced by a unique index.) The pricing pipeline
// applies the resolved rule; this module only decides which rule that is.
//
// The reseller's own markup is a separate thing, applied later and in the
// store currency. It is not resolved here.

import type { MarkupRule, MarkupType } from "./pricing.ts";

export interface PlatformMarkupRow {
  scope: "default" | "country" | "provider" | "plan";
  scope_key: string;
  markup_type: string;
  markup_value: number;
  enabled: boolean;
}

export interface ResolvedMarkup {
  rule: MarkupRule;
  /** Which level the winning row came from, for display and audit. */
  scope: "default" | "country" | "provider" | "plan";
  /** True when no row was enabled at any level (price == cost). */
  none: boolean;
}

function toRule(row: PlatformMarkupRow): MarkupRule {
  const type: MarkupType = row.markup_type === "fixed" ? "fixed" : "percentage";
  return {
    markup_type: type,
    markup_value: Number(row.markup_value) || 0,
    source: row.scope === "plan"
      ? "platform_plan"
      : row.scope === "provider"
      ? "platform_provider"
      : row.scope === "country"
      ? "platform_country"
      : "platform_default",
  };
}

const NO_MARKUP: MarkupRule = {
  markup_type: "percentage",
  markup_value: 0,
  source: "platform_default",
};

/**
 * Pick the winning markup row for one case.
 *
 * Only enabled rows are considered, and a disabled row at a more specific
 * level does NOT fall back to a less specific one — a disabled plan-level
 * markup means "no platform markup for this plan", not "use the provider's".
 * That is the reading that makes "disable this markup" mean something.
 */
export function resolvePlatformMarkup(
  rows: PlatformMarkupRow[],
  ctx: {
    countryCode?: string | null;
    planId?: string | null;
    provider?: string | null;
    /** True when the plan's cost currency equals the store's. */
    home?: boolean;
  },
): ResolvedMarkup {
  const country = (ctx.countryCode ?? "").toLowerCase();
  const provider = (ctx.provider ?? "").toLowerCase();
  const planId = ctx.planId ?? "";
  const home = ctx.home === true;

  const find = (scope: PlatformMarkupRow["scope"], key: string) =>
    rows.find((r) => r.scope === scope && r.scope_key === key) ?? null;

  // A disabled (or absent-and-disabled) row at a level is a terminal "no
  // markup at this level" answer, not a fallback to a broader one.
  const decide = (
    scope: PlatformMarkupRow["scope"],
  ): ResolvedMarkup | null => {
    const key = scope === "plan"
      ? planId
      : scope === "provider"
      ? provider
      : scope === "country"
      ? country
      : "*";
    if (scope !== "default" && !key) return null;
    const row = find(scope, key);
    if (!row) return null;
    if (!row.enabled) {
      return {
        rule: { ...NO_MARKUP, source: toRule(row).source },
        scope,
        none: true,
      };
    }
    return { rule: toRule(row), scope, none: false };
  };

  // HOME: plan -> provider -> 0. No country, no default: the matched local
  // case carries no FX, so the platform's default 12% must not apply.
  if (home) {
    for (const scope of ["plan", "provider"] as const) {
      const hit = decide(scope);
      if (hit) return hit;
    }
    return { rule: NO_MARKUP, scope: "default", none: true };
  }

  // CROSS-BORDER: country -> default. Plan and provider rows are home-only.
  for (const scope of ["country", "default"] as const) {
    const hit = decide(scope);
    if (hit) return hit;
  }
  return { rule: NO_MARKUP, scope: "default", none: true };
}

/**
 * The full platform markup chain for a plan, as the pipeline expects it.
 * Returns at most one rule: the levels replace each other.
 */
export function platformMarkupChain(
  rows: PlatformMarkupRow[],
  ctx: {
    countryCode?: string | null;
    planId?: string | null;
    provider?: string | null;
    home?: boolean;
  },
): MarkupRule[] {
  const resolved = resolvePlatformMarkup(rows, ctx);
  return resolved.none ? [] : [resolved.rule];
}
