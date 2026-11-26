// supabase/functions/_shared/catalog/lizzysubCatalog.ts
//
// Maps a Lizzysub plan onto a global_base_plans row.
//
// Lizzysub publishes one flat string per plan, e.g.
//   "6.01GB GIFTING = ₦1,860.00 Get 6.01GB Always ON (410MB Daily for 15 days)."
// so the size, validity and description all come from parsing that string.
//
// Rules:
//   * base_price is the wholesale cost rounded UP to the next ₦5 (under
//     ₦1,000) or ₦10 — the buffer convention the catalogue already uses.
//     The sync never lowers an existing base_price, so a row that already
//     carries a larger buffer keeps it.
//   * A plan whose id is on HELD_PLAN_IDS is reported and skipped. They are
//     deliberately not for sale yet; remove an id from that set to import it.
//   * Anything that looks like a provider test plan is refused rather than
//     imported, because it would become a purchasable listing.

import type { LizzysubPlan } from "./lizzysubClient.ts";

export interface NormalizedLizzysubPlan {
  provider: "lizzysub";
  provider_plan_id: string;
  country_code: string;
  network: string;
  name: string;
  description: string;
  category: "data";
  data_amount: string;
  validity: string;
  duration_days: number | null;
  base_price: number;
  currency: "NGN";
  metadata: Record<string, unknown>;
  price_type: "FIXED";
}

export interface LizzysubRejection {
  offerId: string | null;
  reason: string;
}

/**
 * Ids the owner asked us to hold back.
 *   312, 314-319 — Airtel COOPERATE GIFTING: "not all sims are eligible", so
 *                  the rule needs confirming with Lizzysub first.
 *   330          — 10MB for ₦500: no retail value.
 * 311 (the ₦500,000 test plan) is refused by TEST_PLAN_PATTERN.
 *
 * Anything rejected here is NOT upserted, so the deactivation pass would turn
 * it off on the next run. That makes this list the only place a live plan may
 * be withheld; do not add a rejection rule that catches ordinary plans.
 */
const HELD_PLAN_IDS = new Set([
  "312",
  "314",
  "315",
  "316",
  "317",
  "318",
  "319",
  "330",
]);

/**
 * A sanity ceiling only. Legitimate broadband plans reach ₦218,250 (1.5TB
 * yearly), so the ceiling sits far above them and exists solely to stop an
 * absurd value from being imported if the provider returns one.
 */
const MAX_PLAN_AMOUNT = 1_000_000;

const TEST_PLAN_PATTERN = /warning|don'?t\s+buy|\btest(?:ing)?\b/i;

export function roundUpBuffer(amount: number): number {
  const step = amount < 1000 ? 5 : 10;
  return Math.ceil(amount / step) * step;
}

export function parseSize(name: string): string | null {
  const match = name.match(/^\s*([\d.]+)\s*(GB|TB|MB)\b/i);
  if (!match) return null;
  return `${match[1]}${match[2].toUpperCase()}`;
}

export function parseValidity(name: string): {
  label: string;
  days: number | null;
} {
  const text = name.toLowerCase();

  const range = text.match(/(\d+)\s*-\s*(\d+)\s*days?/);
  if (range) {
    return { label: `${range[1]}-${range[2]} days`, days: Number(range[2]) };
  }

  const lessThan = text.match(/less than\s*(\d+)\s*days?/);
  if (lessThan) {
    return { label: `Less than ${lessThan[1]} days`, days: Number(lessThan[1]) };
  }

  const years = text.match(/(\d+)\s*years?/) ?? text.match(/one year|yearly/);
  if (years) {
    const n = /^\d+$/.test(years[1] ?? "") ? Number(years[1]) : 1;
    return { label: `${n} year${n === 1 ? "" : "s"}`, days: n * 365 };
  }

  const months = text.match(/(\d+)\s*months?/);
  if (months) {
    const n = Number(months[1]);
    return { label: `${n} month${n === 1 ? "" : "s"}`, days: n * 30 };
  }

  const weeks = text.match(/(\d+)\s*weeks?/);
  if (weeks) {
    const n = Number(weeks[1]);
    return { label: `${n} week${n === 1 ? "" : "s"}`, days: n * 7 };
  }

  const days = text.match(/(\d+)\s*days?/);
  if (days) {
    const n = Number(days[1]);
    return { label: `${n} day${n === 1 ? "" : "s"}`, days: n };
  }

  const hours = text.match(/(\d+)\s*(?:hrs?|hours?)/);
  if (hours) {
    const n = Number(hours[1]);
    return { label: `${n} hours`, days: Math.max(1, Math.round(n / 24)) };
  }

  if (/weekly/.test(text)) return { label: "7 days", days: 7 };
  if (/monthly/.test(text)) return { label: "1 month", days: 30 };

  return { label: "", days: null };
}

/** The part of the provider string after the price, used as the description. */
function descriptionOf(name: string): string {
  const parts = name.split("=");
  if (parts.length < 2) return name.trim();
  return parts.slice(1).join("=").replace(/^\s*₦?[\d,.]+\s*/, "").trim();
}

export function normalizeLizzysubPlan(
  plan: LizzysubPlan,
): { plan: NormalizedLizzysubPlan } | { rejected: LizzysubRejection } {
  const reject = (reason: string) => ({
    rejected: { offerId: plan.plan_id, reason },
  });

  if (!Number.isFinite(plan.amount) || plan.amount <= 0) {
    return reject("amount is not a positive number");
  }
  if (plan.amount >= MAX_PLAN_AMOUNT) {
    return reject(`amount ₦${plan.amount} is above the sanity ceiling`);
  }
  if (TEST_PLAN_PATTERN.test(plan.name)) {
    return reject("looks like a provider test plan");
  }
  if (HELD_PLAN_IDS.has(plan.plan_id)) {
    return reject("held pending provider eligibility confirmation");
  }

  const size = parseSize(plan.name);
  if (!size) return reject("no data size in the plan name");

  const validity = parseValidity(plan.name);

  return {
    plan: {
      provider: "lizzysub",
      provider_plan_id: plan.plan_id,
      country_code: "NG",
      network: plan.network,
      name: size,
      description: descriptionOf(plan.name),
      category: "data",
      data_amount: size,
      validity: validity.label,
      duration_days: validity.days,
      base_price: roundUpBuffer(plan.amount),
      currency: "NGN",
      metadata: {
        network: plan.network,
        plan_id: Number(plan.plan_id),
        plan_type: plan.plan_type,
        provider_cost: plan.amount,
        original_table: "lizzysub_sync",
      },
      price_type: "FIXED",
    },
  };
}
