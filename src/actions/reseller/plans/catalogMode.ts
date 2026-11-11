// src/actions/reseller/plans/catalogMode.ts
//
// The store's catalog mode and default markup: "sell everything" vs "sell the
// plans I picked". Backed by global_reseller_applications.catalog_mode and
// default_markup_* (migration 20261112_store_catalog_mode.sql).
//
// This is the control that makes the whole 11k-plan catalog sellable in one
// step: in `all` mode the store sells every active plan at the default markup,
// and a per-plan config row only exists where the reseller wants an override.
// Without it, "sell all plans" would need ~11k rows per store.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toStoreCatalogSettings } from "../../../../supabase/functions/_shared/catalog/catalogResolution.ts";

export interface CatalogSettings {
  catalogMode: "selected" | "all";
  defaultMarkupType: "percentage" | "fixed";
  defaultMarkupValue: number;
  /** How many per-plan override rows exist (opt-outs + custom markups). */
  overrideCount: number;
}

async function resolveApplicationId(): Promise<
  { applicationId: string } | { error: string }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: application } = await admin
    .from("global_reseller_applications")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!application) return { error: "Reseller not found" };
  return { applicationId: application.id };
}

export async function getCatalogSettings(): Promise<{
  success: boolean;
  data?: CatalogSettings;
  error?: string;
}> {
  try {
    const resolved = await resolveApplicationId();
    if ("error" in resolved) return { success: false, error: resolved.error };

    const admin = createAdminClient();
    const { data: application } = await admin
      .from("global_reseller_applications")
      .select("catalog_mode, default_markup_type, default_markup_value")
      .eq("id", resolved.applicationId)
      .maybeSingle();

    const { count } = await admin
      .from("global_reseller_plan_configs")
      .select("id", { count: "exact", head: true })
      .eq("reseller_id", resolved.applicationId);

    const settings = toStoreCatalogSettings(application);
    return {
      success: true,
      data: { ...settings, overrideCount: count ?? 0 },
    };
  } catch (error) {
    console.error("getCatalogSettings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function setCatalogMode(params: {
  catalogMode: "selected" | "all";
  defaultMarkupType?: "percentage" | "fixed";
  defaultMarkupValue?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (params.catalogMode !== "selected" && params.catalogMode !== "all") {
      return { success: false, error: "Invalid catalog mode" };
    }
    if (
      params.defaultMarkupValue !== undefined &&
      (!Number.isFinite(params.defaultMarkupValue) || params.defaultMarkupValue < 0)
    ) {
      return { success: false, error: "Invalid markup value" };
    }

    const resolved = await resolveApplicationId();
    if ("error" in resolved) return { success: false, error: resolved.error };

    const patch: Record<string, unknown> = {
      catalog_mode: params.catalogMode,
      updated_at: new Date().toISOString(),
    };
    if (params.defaultMarkupType !== undefined) {
      patch.default_markup_type = params.defaultMarkupType;
    }
    if (params.defaultMarkupValue !== undefined) {
      patch.default_markup_value = params.defaultMarkupValue;
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("global_reseller_applications")
      .update(patch)
      .eq("id", resolved.applicationId);

    if (error) {
      console.error("setCatalogMode error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("setCatalogMode error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
