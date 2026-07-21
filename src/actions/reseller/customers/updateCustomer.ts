// src/actions/reseller/customers/updateCustomer.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface UpdateCustomerParams {
  customerId: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: "active" | "inactive";
}

export async function updateCustomer(params: UpdateCustomerParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (params.first_name !== undefined) updates.first_name = params.first_name;
    if (params.last_name !== undefined) updates.last_name = params.last_name;
    if (params.email !== undefined) updates.email = params.email;
    if (params.phone !== undefined) updates.phone = params.phone;
    if (params.address !== undefined) updates.address = params.address;
    if (params.city !== undefined) updates.city = params.city;
    if (params.state !== undefined) updates.state = params.state;
    if (params.country !== undefined) updates.country = params.country;
    if (params.status !== undefined) updates.status = params.status;

    // Update customer
    const { error: updateError } = await supabase
      .from("global_customers")
      .update(updates)
      .eq("id", params.customerId)
      .eq("reseller_id", application.id);

    if (updateError) {
      console.error("Update customer error:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("UpdateCustomer Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
