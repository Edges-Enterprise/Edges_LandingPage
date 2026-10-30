// src/actions/reseller/store/saveStoreProfile.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The Store settings tab writes here. It used to upsert into
// global_reseller_settings with `reseller_id` / `store_settings` columns that
// do not exist, so every save failed; the fields with no home on
// global_reseller_applications (welcome_message, store_status, contact_phone)
// now live in global_reseller_store_settings. That table is RLS-locked to the
// service role, so the write goes through the admin client and the caller is
// authenticated against the row it is allowed to touch.

interface SaveStoreProfileParams {
  applicationId: string;
  welcomeMessage?: string;
  storeSubtext?: string;
  storeStatus?: "active" | "inactive" | "maintenance";
  contactPhone?: string;
}

const VALID_STATUS = ["active", "inactive", "maintenance"] as const;

export async function saveStoreProfile(params: SaveStoreProfileParams) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // The session must own the application it is writing to.
    const { data: application } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("id", params.applicationId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!application) {
      return { success: false, error: "Reseller not found" };
    }

    if (
      params.storeStatus !== undefined &&
      !VALID_STATUS.includes(params.storeStatus)
    ) {
      return { success: false, error: "Invalid store status" };
    }

    const admin = createAdminClient();
    const row: Record<string, any> = {
      application_id: params.applicationId,
      updated_at: new Date().toISOString(),
    };
    if (params.welcomeMessage !== undefined)
      row.welcome_message = params.welcomeMessage;
    if (params.storeSubtext !== undefined)
      row.store_subtext = params.storeSubtext;
    if (params.storeStatus !== undefined) row.store_status = params.storeStatus;
    if (params.contactPhone !== undefined)
      row.contact_phone = params.contactPhone;

    const { error } = await admin
      .from("global_reseller_store_settings")
      .upsert(row, { onConflict: "application_id" });

    if (error) {
      console.error("saveStoreProfile error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("saveStoreProfile threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
