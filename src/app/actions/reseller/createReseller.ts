// app/actions/reseller/createReseller.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CreateResellerResult, ResellerFormData } from "@/types";

export async function createReseller(
  formData: FormData,
): Promise<CreateResellerResult> {
  const supabase = await createServerClient();

  const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
  const email = (formData.get("email") as string)?.trim();
  const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
  const androidApp = formData.get("androidApp") === "true";

  // ── Validate ──────────────────────────────────────
  if (!storeName || !email) {
    return { error: "Store name and email are required" };
  }

  if (!/^[a-z0-9-]+$/.test(storeName)) {
    return {
      error:
        "Store name can only contain lowercase letters, numbers, and hyphens",
    };
  }

  if (storeName.length < 3) {
    return { error: "Store name must be at least 3 characters" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  if (!["light", "dark", "custom"].includes(theme)) {
    return { error: "Invalid theme selection" };
  }

  // ── Check store name availability ─────────────────
  const { data: existing } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .maybeSingle();

  if (existing) {
    return {
      error: "This store name is already taken. Please choose another.",
    };
  }

  // ── Create auth user (silent signup) ──────────────
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        store_name: storeName,
        role: "reseller",
        theme,
        android_app: androidApp,
      },
    });

  if (authError || !authData.user) {
    console.error("Auth user creation failed:", authError);
    return { error: "Failed to create account. Please try again." };
  }

  // ── Insert reseller record ────────────────────────
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .insert({
      auth_user_id: authData.user.id,
      email,
      store_name: storeName,
      theme,
      android_app: androidApp,
      status: "pending",
    })
    .select("id")
    .single();

  if (resellerError || !reseller) {
    console.error("Reseller insert failed:", resellerError);
    // Attempt cleanup: delete the auth user we just created
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { error: "Failed to create reseller account. Please try again." };
  }

  // The wallet and plan configs are auto-created by database triggers

  revalidatePath("/reseller");

  return {
    success: true,
    resellerId: reseller.id,
    storeUrl: `/${storeName}`,
    message: "Your store will be live within 72 hours",
  };
}
