// app/actions/reseller/plans/updatePlan.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface UpdatePlanInput {
  resellerPlanId: string;
  enabled?: boolean;
  markup_type?: "fixed" | "percentage";
  markup_value?: number;
}

/**
 * Update a single plan config for a reseller
 */
export async function updateResellerPlan(
  resellerId: string,
  input: UpdatePlanInput,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient();

  const updates: Record<string, any> = {};
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  if (input.markup_type) updates.markup_type = input.markup_type;
  if (input.markup_value !== undefined)
    updates.markup_value = input.markup_value;

  if (Object.keys(updates).length === 0) {
    return { error: "No updates provided" };
  }

  const { error } = await supabase
    .from("reseller_plan_configs")
    .update(updates)
    .eq("id", input.resellerPlanId)
    .eq("reseller_id", resellerId);

  if (error) {
    console.error("Error updating plan:", error);
    return { error: "Failed to update plan" };
  }

  revalidatePath("/dashboard/plans");
  revalidatePath(`/store/${resellerId}`);
  return { success: true };
}

/**
 * Bulk update all plans for a reseller to the same markup
 */
export async function bulkUpdateAllPlans(
  resellerId: string,
  markup_type: "fixed" | "percentage",
  markup_value: number,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("reseller_plan_configs")
    .update({ markup_type, markup_value })
    .eq("reseller_id", resellerId);

  if (error) {
    console.error("Error bulk updating plans:", error);
    return { error: "Failed to update plans" };
  }

  revalidatePath("/dashboard/plans");
  return { success: true };
}