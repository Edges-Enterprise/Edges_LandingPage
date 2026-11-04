// supabase/functions/_shared/currency/markup.ts
//
// Phase 2. Resolve the platform markup for a plan.
//
// Three levels of specificity, most specific wins:
//
//   default  -> country -> plan
//
// The design is explicit that they do not stack across levels — a plan row
// replaces a country row replaces the default. (Within a single level there
// is exactly one row, enforced by a unique index.) The pricing pipeline
// applies the resolved rule; this module only decides which rule that is.
//
// The reseller's own markup is a separate thing, applied later and in the
// store currency. It is not resolved here.

import type { MarkupRule, MarkupType } from "./pricing.ts";

export interface PlatformMarkupRow {
  scope: "default" | "country" | "plan";
  scope_key: string;
  markup_type: string;
  markup_value: number;
  enabled: boolean;
}

export interface ResolvedMarkup {
  rule: MarkupRule;
  /** Which level the winning row came from, for display and audit. */
  scope: "default" | "country" | "plan";
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
      : row.scope === "country"
      ? "platform_country"
      : "platform_default",
  };
}

/**
 * Pick the winning markup row.
 *
 * Only enabled rows are considered, and a disabled row at a more specific
 * level does NOT fall back to a less specific one — a disabled plan-level
 * markup means "no platform markup for this plan", not "use the country's".
 * That is the reading that makes "disable this markup" mean something.
 */
export function resolvePlatformMarkup(
  rows: PlatformMarkupRow[],
  ctx: { countryCode?: string | null; planId?: string | null },
): ResolvedMarkup {
  const country = (ctx.countryCode ?? "").toLowerCase();
  const planId = ctx.planId ?? "";

  const find = (scope: PlatformMarkupRow["scope"], key: string) =>
    rows.find((r) => r.scope === scope && r.scope_key === key) ?? null;

  if (planId) {
    const planRow = find("plan", planId);
    if (planRow) {
      if (!planRow.enabled) {
        return {
          rule: { markup_type: "percentage", markup_value: 0, source: "platform_plan" },
          scope: "plan",
          none: true,
        };
      }
      return { rule: toRule(planRow), scope: "plan", none: false };
    }
  }

  if (country) {
    const countryRow = find("country", country);
    if (countryRow) {
      if (!countryRow.enabled) {
        return {
          rule: { markup_type: "percentage", markup_value: 0, source: "platform_country" },
          scope: "country",
          none: true,
        };
      }
      return { rule: toRule(countryRow), scope: "country", none: false };
    }
  }

  const defaultRow = find("default", "*");
  if (defaultRow && defaultRow.enabled) {
    return { rule: toRule(defaultRow), scope: "default", none: false };
  }

  return {
    rule: { markup_type: "percentage", markup_value: 0, source: "platform_default" },
    scope: "default",
    none: true,
  };
}

/**
 * The full platform markup chain for a plan, as the pipeline expects it.
 * Returns at most one rule: the levels replace each other.
 */
export function platformMarkupChain(
  rows: PlatformMarkupRow[],
  ctx: { countryCode?: string | null; planId?: string | null },
): MarkupRule[] {
  const resolved = resolvePlatformMarkup(rows, ctx);
  return resolved.none ? [] : [resolved.rule];
}
