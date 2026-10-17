// src/actions/reseller/settings/updateNotificationSettings.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  order_updates: boolean;
  build_updates: boolean;
  marketing_emails: boolean;
}

export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): Promise<{
  success: boolean;
  data?: NotificationSettings;
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

    // Get existing settings
    const { data: existing, error: getError } = await supabase
      .from("global_reseller_settings")
      .select("notification_settings")
      .eq("auth_user_id", user.id)
      .single();

    if (getError && getError.code !== "PGRST116") {
      console.error("Get settings error:", getError);
      return { success: false, error: getError.message };
    }

    const currentSettings = existing?.notification_settings || {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      order_updates: true,
      build_updates: true,
      marketing_emails: false,
    };

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update or insert settings
    if (existing) {
      const { error: updateError } = await supabase
        .from("global_reseller_settings")
        .update({
          notification_settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", user.id);

      if (updateError) {
        console.error("Update settings error:", updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase
        .from("global_reseller_settings")
        .insert({
          auth_user_id: user.id,
          notification_settings: updatedSettings,
        });

      if (insertError) {
        console.error("Insert settings error:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return {
      success: true,
      data: updatedSettings,
    };
  } catch (error) {
    console.error("UpdateNotificationSettings Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
