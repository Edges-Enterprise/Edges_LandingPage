// app/actions/reseller/plans/getPlans.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
import type { PlanWithPricing, StorePlan } from "@/types";

export async function getResellerPlans(
  resellerId: string,
  network?: string,
): Promise<PlanWithPricing[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("reseller_plan_configs")
    .select(`
      id,
      reseller_id,
      plan_id,
      enabled,
      markup_type,
      markup_value,
      created_at,
      updated_at,
      plan:plan_id (
        id,
        plan_id,
        network,
        plan_type,
        plan_name,
        amount,
        validity,
        is_active
      )
    `)
    .eq("reseller_id", resellerId)
    .eq("plan.is_active", true);

  if (network) {
    query = query.eq("plan.network", network);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reseller plans:", error);
    return [];
  }

  // Filter out null plans and sort manually by amount
  return (data || [])
    .filter((rp: any) => rp.plan !== null)
    .map((rp: any) => ({
      ...rp,
      finalPrice: calculateResellerPrice(
        rp.plan.amount,
        rp.markup_type,
        rp.markup_value,
      ),
      profit:
        calculateResellerPrice(rp.plan.amount, rp.markup_type, rp.markup_value) -
        rp.plan.amount,
    }))
    .sort((a, b) => a.plan.amount - b.plan.amount);
}

export async function getStorePlans(
  storeName: string,
  network?: string,
): Promise<StorePlan[]> {
  const supabase = createAdminClient();

  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .eq("status", "active")
    .single();

  if (resellerError || !reseller) return [];

  let query = supabase
    .from("reseller_plan_configs")
    .select(
      `
      plan:plan_id (
        id,
        plan_id,
        network,
        plan_type,
        plan_name,
        amount,
        validity
      ),
      markup_type,
      markup_value
    `,
    )
    .eq("reseller_id", reseller.id)
    .eq("enabled", true)
    .eq("plan.is_active", true);

  if (network) {
    query = query.eq("plan.network", network);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching store plans:", error);
    return [];
  }

  return (data || [])
    .filter((rp: any) => rp.plan !== null)
    .map((rp: any) => ({
      id: rp.plan.id,
      plan_id: rp.plan.plan_id,
      network: rp.plan.network,
      plan_type: rp.plan.plan_type,
      plan_name: rp.plan.plan_name,
      price: calculateResellerPrice(
        rp.plan.amount,
        rp.markup_type,
        rp.markup_value,
      ),
      validity: rp.plan.validity || undefined,
    }))
    .sort((a, b) => a.price - b.price);
}

/**
 * Get all active base plans (admin use)
 */
export async function getBasePlans(category?: "data" | "airtime") {
  const supabase = await createServerClient();

  let query = supabase
    .from("reseller_base_plans")
    .select("*")
    .eq("is_active", true);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query.order("base_price", { ascending: true });

  if (error) {
    console.error("Error fetching base plans:", error);
    return [];
  }

  return data || [];
}
