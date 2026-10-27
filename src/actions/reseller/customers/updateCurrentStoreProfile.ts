// src/actions/reseller/customers/updateCurrentStoreProfile.ts
//
// Updates the signed-in storefront visitor's own profile. Same resolution as
// getCurrentStoreProfile: the session client proves identity, the
// service-role client performs the write, because no `global_*` policy grants
// a customer update. Only the caller's own row is touched.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateStoreProfileParams {
  resellerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function updateCurrentStoreProfile(
  params: UpdateStoreProfileParams,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Not signed in" };
  }

  const firstName = params.firstName?.trim();
  if (!firstName) {
    return { success: false, error: "First name is required" };
  }

  const admin = createAdminClient();

  const { data: application } = await admin
    .from("global_reseller_applications")
    .select("id, auth_user_id")
    .eq("id", params.resellerId)
    .maybeSingle();

  if (!application) return { success: false, error: "Store not found" };

  if (application.auth_user_id === user.id) {
    const updates: Record<string, unknown> = {
      first_name: firstName,
      updated_at: new Date().toISOString(),
    };
    if (params.lastName !== undefined) updates.last_name = params.lastName.trim();
    if (params.phone !== undefined) updates.phone = params.phone.trim();

    const { error } = await admin
      .from("global_reseller_applications")
      .update(updates)
      .eq("id", application.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const updates: Record<string, unknown> = {
    first_name: firstName,
    updated_at: new Date().toISOString(),
  };
  if (params.lastName !== undefined) updates.last_name = params.lastName.trim();
  if (params.phone !== undefined) updates.phone = params.phone.trim();

  const { error } = await admin
    .from("global_customers")
    .update(updates)
    .eq("reseller_id", application.id)
    .eq("auth_user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
