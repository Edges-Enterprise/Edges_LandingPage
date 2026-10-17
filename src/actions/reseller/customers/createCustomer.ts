// src/actions/reseller/customers/createCustomer.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface CreateCustomerParams {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export async function createCustomer(params: CreateCustomerParams): Promise<{
  success: boolean;
  data?: { id: string };
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

    // Check if customer already exists
    const { data: existing, error: checkError } = await supabase
      .from("global_customers")
      .select("id")
      .eq("email", params.email)
      .eq("reseller_id", application.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Check customer error:", checkError);
    }

    if (existing) {
      return {
        success: false,
        error: "Customer with this email already exists",
      };
    }

    // Create customer
    const { data: customer, error: createError } = await supabase
      .from("global_customers")
      .insert({
        reseller_id: application.id,
        first_name: params.first_name,
        last_name: params.last_name,
        email: params.email,
        phone: params.phone,
        address: params.address,
        city: params.city,
        state: params.state,
        country: params.country,
        status: "active",
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Create customer error:", createError);
      return { success: false, error: createError.message };
    }

    return {
      success: true,
      data: { id: customer.id },
    };
  } catch (error) {
    console.error("CreateCustomer Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
