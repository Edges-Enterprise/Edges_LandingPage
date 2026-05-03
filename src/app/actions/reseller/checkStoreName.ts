// actions/reseller/checkStoreName.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { StoreNameCheckResult } from "@/types";

export async function checkStoreName(
  storeName: string,
): Promise<StoreNameCheckResult> {
  const supabase = await createServerClient();

  // Validate format first
  if (!storeName || storeName.length < 3) {
    return {
      available: false,
      error: "Store name must be at least 3 characters",
    };
  }

  if (!/^[a-z0-9-]+$/.test(storeName)) {
    return {
      available: false,
      error: "Only lowercase letters, numbers, and hyphens allowed",
    };
  }

  const { data, error } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName.toLowerCase().trim())
    .single();

  // PGRST116 = no rows returned, which means the name is available
  if (error && error.code !== "PGRST116") {
    console.error("Error checking store name:", error);
    return { available: false, error: "Failed to check store name" };
  }

  return { available: !data };
}
