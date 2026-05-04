"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CreateResellerResult, ResellerFormData } from "@/types";
import { sendAdminEmail } from "@/lib/email/email";

function generatePassword(storeName: string, email: string): string {
  const prefix = storeName.slice(0, 4);
  const suffix = email.split("@")[0].slice(0, 4);
  const random = Math.random().toString(36).slice(2, 6);
  return `${prefix}${suffix}${random}`;
}

export async function createReseller(
  formData: FormData,
): Promise<CreateResellerResult> {
  // ✅ user-aware client (for reads if needed)
  const supabase = await createServerClient();

  // ✅ admin client (bypasses RLS)
  const admin = createAdminClient();

  const storeName = (formData.get("storeName") as string)?.toLowerCase().trim();
  const email = (formData.get("email") as string)?.trim();
  const theme = (formData.get("theme") as ResellerFormData["theme"]) || "light";
  const androidApp = formData.get("androidApp") === "true";

  // ── Validation ─────────────────────────────
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

  // ── Check store name (can stay on normal client) ──
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

  // ── Generate password ──────────────────────
  const password = generatePassword(storeName, email);

  // ── Create Auth User (ADMIN) ───────────────
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
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

  // ── Insert Reseller (ADMIN → bypasses RLS) ──
  const { data: reseller, error: resellerError } = await admin
    .from("resellers")
    .insert({
      auth_user_id: authData.user.id,
      email,
      store_name: storeName,
      theme,
      android_app: androidApp,
      status: "active",
    })
    .select("id")
    .single();

  if (resellerError || !reseller) {
    console.error("Reseller insert failed:", resellerError);

    // rollback auth user
    await admin.auth.admin.deleteUser(authData.user.id);

    return { error: "Failed to create reseller account. Please try again." };
  }

  // ── Sign in the new reseller ──────────────
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("Auto sign-in failed:", signInError);
    // Non-fatal — store still created, they can sign in manually
  }

  // ── Email ────────────────────────────────
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_STORE_URL ||
    "http://localhost:3000";

  const storeUrl = `${baseUrl}/${storeName}`;

  const displayName = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const emailMessage = `
Your branded store has been created and is live 🎁.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 STORE URL:
${storeUrl}

📧 EMAIL:
${email}

🔐 PASSWORD:
${password}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Keep these credentials safe.

👉 Dashboard: ${baseUrl}/dashboard
`;

  try {
    await sendAdminEmail({
      to: email,
      subject: `🎉 Your ${displayName} Store is Ready!`,
      message: emailMessage,
      recipientName: displayName,
      isHtml: false,
    });
  } catch (err) {
    console.error("Email error:", err);
  }

  revalidatePath("/reseller");

  return {
    success: true,
    resellerId: reseller.id,
    storeUrl: `/${storeName}`,
    message: "Check your email for login credentials.",
  };
}
