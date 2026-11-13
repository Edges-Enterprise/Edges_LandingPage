"use server";

// src/app/actions/platform-plans.ts
//
// Platform-admin actions for the plan catalog and the platform markup.
// Every action re-checks the admin gate server-side (the page's gate is not
// a substitute) and writes with the service-role client, because
// `global_platform_markups` and `global_base_plans` have RLS on with no
// policies — only the service role reaches them.

import { revalidatePath } from "next/cache";
import { getPlatformAdmin } from "@/lib/admin/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export type MarkupScope = "default" | "country" | "provider" | "plan";
export type MarkupType = "percentage" | "fixed";

export interface MarkupRow {
  id: string;
  scope: MarkupScope;
  scope_key: string;
  markup_type: MarkupType;
  markup_value: number;
  enabled: boolean;
}

export interface PlatformPlanRow {
  id: string;
  provider: string;
  provider_plan_id: string;
  country_code: string;
  network: string | null;
  name: string;
  category: string;
  base_price: number;
  currency: string;
  price_type: string | null;
  is_active: boolean;
}

const SCOPES: MarkupScope[] = ["default", "country", "provider", "plan"];

function normalizeScopeKey(scope: MarkupScope, key: string): string {
  if (scope === "default") return "*";
  const trimmed = (key ?? "").trim();
  return scope === "country" ? trimmed.toLowerCase() : trimmed;
}

async function deny() {
  return { success: false as const, error: "Admin access required" };
}

/** All platform markup rows, for the markup table. */
export async function listPlatformMarkups(): Promise<MarkupRow[]> {
  const admin = await getPlatformAdmin();
  if (!admin) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("global_platform_markups")
    .select("id, scope, scope_key, markup_type, markup_value, enabled")
    .order("scope")
    .order("scope_key");
  return (data ?? []).map((r) => ({
    ...r,
    markup_value: Number(r.markup_value),
  })) as MarkupRow[];
}

/**
 * Create or update the markup row at one level. The unique index on
 * (scope, scope_key) makes this an upsert: setting the default twice
 * updates the existing row rather than adding a second.
 */
export async function savePlatformMarkup(params: {
  scope: MarkupScope;
  scopeKey: string;
  markupType: MarkupType;
  markupValue: number;
  enabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) return deny();

  if (!SCOPES.includes(params.scope)) {
    return { success: false, error: "Unknown scope" };
  }
  const value = Number(params.markupValue);
  if (!Number.isFinite(value) || value < 0) {
    return { success: false, error: "Markup must be a number of at least 0" };
  }
  const scopeKey = normalizeScopeKey(params.scope, params.scopeKey);
  if (!scopeKey) {
    return { success: false, error: "A scope key is required" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("global_platform_markups")
    .upsert(
      {
        scope: params.scope,
        scope_key: scopeKey,
        markup_type: params.markupType === "fixed" ? "fixed" : "percentage",
        markup_value: value,
        enabled: params.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "scope,scope_key" },
    );
  if (error) return { success: false, error: error.message };

  revalidatePath("/[countryCode]/admin/platform-plans", "page");
  return { success: true };
}

export async function deletePlatformMarkup(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) return deny();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("global_platform_markups")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/[countryCode]/admin/platform-plans", "page");
  return { success: true };
}

/** Enable or disable one plan. Every catalog read filters `is_active`. */
export async function setPlanActive(
  planId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) return deny();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("global_base_plans")
    .update({ is_active: isActive })
    .eq("id", planId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/[countryCode]/admin/platform-plans", "page");
  return { success: true };
}

export interface PlanSearchParams {
  provider?: string;
  countryCode?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * One page of plans, filtered. Paged with a unique `id` tiebreaker, because
 * PostgREST caps a range at 1,000 rows and an un-tiebroken order can skip or
 * repeat rows across pages.
 */
export async function searchPlatformPlans(params: PlanSearchParams): Promise<{
  plans: PlatformPlanRow[];
  total: number;
}> {
  const admin = await getPlatformAdmin();
  if (!admin) return { plans: [], total: 0 };

  const supabase = createAdminClient();
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
  const page = Math.max(params.page ?? 0, 0);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("global_base_plans")
    .select(
      "id, provider, provider_plan_id, country_code, network, name, category, base_price, currency, price_type, is_active",
      { count: "exact" },
    );
  if (params.provider) query = query.eq("provider", params.provider);
  if (params.countryCode) {
    query = query.eq("country_code", params.countryCode.toLowerCase());
  }
  if (params.search) {
    // Strip the characters that would break PostgREST's `or(...)` grammar.
    const term = params.search.replace(/[,()%]/g, "").trim();
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,provider_plan_id.ilike.%${term}%`,
      );
    }
  }
  query = query.order("id", { ascending: true }).range(from, to);

  const { data, error, count } = await query;
  if (error) return { plans: [], total: 0 };
  return {
    plans: (data ?? []).map((r) => ({
      ...r,
      base_price: Number(r.base_price),
    })) as PlatformPlanRow[],
    total: count ?? 0,
  };
}
