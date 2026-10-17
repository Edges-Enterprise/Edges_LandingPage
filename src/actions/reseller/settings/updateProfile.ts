// src/actions/reseller/settings/updateProfile.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface UpdateProfileParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  business_name?: string;
  business_address?: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<{
  success: boolean;
  data?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    business_name: string;
    business_address: string;
  };
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
      .select("*")
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
    if (params.phone !== undefined) updates.phone = params.phone;
    if (params.business_name !== undefined)
      updates.business_name = params.business_name;
    if (params.business_address !== undefined)
      updates.business_address = params.business_address;

    // Update application
    const { data: updated, error: updateError } = await supabase
      .from("global_reseller_applications")
      .update(updates)
      .eq("id", application.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update profile error:", updateError);
      return { success: false, error: updateError.message };
    }

    // If email changed, update auth user
    if (params.email && params.email !== application.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: params.email,
      });

      if (authError) {
        console.error("Update auth email error:", authError);
        // Don't fail the whole operation, just log it
      }
    }

    return {
      success: true,
      data: {
        first_name: updated.first_name,
        last_name: updated.last_name,
        email: updated.email,
        phone: updated.phone || "",
        business_name: updated.business_name || "",
        business_address: updated.business_address || "",
      },
    };
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
