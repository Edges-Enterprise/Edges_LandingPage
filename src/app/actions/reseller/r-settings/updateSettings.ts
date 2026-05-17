// app/actions/reseller/updateSettings.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface UpdateSettingsParams {
  resellerId: string;
  phone: string;
  notificationsEnabled: boolean;
}

export async function updateResellerSettings({
  resellerId,
  phone,
  notificationsEnabled,
}: UpdateSettingsParams) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("resellers")
    .update({
      phone: phone || null,
      notifications_enabled: notificationsEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resellerId);

  if (error) {
    console.error("Error updating settings:", error);
    return { success: false, error: "Failed to update settings" };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
