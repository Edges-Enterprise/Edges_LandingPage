// app/actions/reseller/updateSettings.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface UpdateSettingsParams {
  resellerId: string;
  storeName: string;
  phone: string;
  theme: string;
}

export async function updateResellerSettings({
  resellerId,
  storeName,
  phone,
  theme,
}: UpdateSettingsParams) {
  const supabase = await createServerClient();

  // Check if store name is unique (if changed)
  const { data: existingStore } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .neq("id", resellerId)
    .single();

  if (existingStore) {
    return { success: false, error: "Store name is already taken" };
  }

  const { error } = await supabase
    .from("resellers")
    .update({
      store_name: storeName,
      phone: phone || null,
      theme: theme,
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
