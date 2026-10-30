// src/actions/reseller/settings/updateNotificationSettings.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "@/lib/settings/notificationDefaults";

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

    // global_reseller_settings has RLS on with no policies (service role
    // only), so the session client reads and writes nothing - the insert
    // failed with 42501. Read and write through the admin client after the
    // session check above; every statement filters on the caller's own id.
    //
    // The table is keyed by auth_user_id; it has no `reseller_id` column.
    const admin = createAdminClient();

    const { data: existing, error: getError } = await admin
      .from("global_reseller_settings")
      .select("notification_settings")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (getError) {
      console.error("Get notification settings error:", getError);
      return { success: false, error: getError.message };
    }

    const currentSettings: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...((existing?.notification_settings as NotificationSettings) || {}),
    };

    // Merge per channel so a partial payload cannot drop a whole column.
    const updatedSettings: NotificationSettings = {
      email_notifications: {
        ...currentSettings.email_notifications,
        ...settings.email_notifications,
      },
      push_notifications: {
        ...currentSettings.push_notifications,
        ...settings.push_notifications,
      },
      sms_notifications: {
        ...currentSettings.sms_notifications,
        ...settings.sms_notifications,
      },
    };

    if (existing) {
      const { error: updateError } = await admin
        .from("global_reseller_settings")
        .update({
          notification_settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", user.id);

      if (updateError) {
        console.error("Update notification settings error:", updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await admin
        .from("global_reseller_settings")
        .insert({
          auth_user_id: user.id,
          notification_settings: updatedSettings,
        });

      if (insertError) {
        console.error("Insert notification settings error:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, data: updatedSettings };
  } catch (error) {
    console.error("UpdateNotificationSettings Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
