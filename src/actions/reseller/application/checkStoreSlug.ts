// src/actions/reseller/application/checkStoreSlug.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface StoreNameCheckResult {
  available: boolean;
  error?: string;
}

export async function checkStoreSlug(
  storeSlug: string,
): Promise<StoreNameCheckResult> {
  const supabase = await createServerClient();

  // Validate format first
  if (!storeSlug || storeSlug.length < 3) {
    return {
      available: false,
      error: "Store name must be at least 3 characters",
    };
  }

  if (!/^[a-z0-9-]+$/.test(storeSlug)) {
    return {
      available: false,
      error: "Only lowercase letters, numbers, and hyphens allowed",
    };
  }

  // Check in global_reseller_applications
  const { data, error } = await supabase
    .from("global_reseller_applications")
    .select("id")
    .eq("store_slug", storeSlug)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking store name:", error);
    return { available: false, error: "Failed to check store name" };
  }

  if (data) {
    return { available: false, error: "This store name is already taken" };
  }

  // Also check in existing resellers table if you want to prevent conflicts
  const { data: existingReseller, error: resellerError } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeSlug)
    .maybeSingle();

  if (resellerError && resellerError.code !== "PGRST116") {
    console.error("Error checking reseller store name:", resellerError);
    // Don't fail, just continue
  }

  if (existingReseller) {
    return { available: false, error: "This store name is already taken" };
  }

  return { available: true };
}
