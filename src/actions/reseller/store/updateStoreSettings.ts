// src/actions/reseller/store/updateStoreSettings.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface UpdateStoreSettingsParams {
  store_name?: string;
  store_description?: string;
  welcome_message?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  social_links?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

export async function updateStoreSettings(
  params: UpdateStoreSettingsParams,
): Promise<{
  success: boolean;
  data?: Record<string, any>;
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

    if (params.store_name !== undefined) updates.store_name = params.store_name;
    if (params.store_description !== undefined)
      updates.store_description = params.store_description;
    if (params.welcome_message !== undefined)
      updates.welcome_message = params.welcome_message;
    if (params.contact_email !== undefined)
      updates.contact_email = params.contact_email;
    if (params.contact_phone !== undefined)
      updates.contact_phone = params.contact_phone;
    if (params.address !== undefined) updates.address = params.address;
    if (params.social_links !== undefined)
      updates.social_links = params.social_links;

    // Update application
    const { data: updated, error: updateError } = await supabase
      .from("global_reseller_applications")
      .update(updates)
      .eq("id", application.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update store settings error:", updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("UpdateStoreSettings Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
