// app/actions/reseller/registerCustomer.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function registerCustomerToReseller(
  storeName: string,
  authUserId: string,
  email: string,
  authEmail?: string, // ← Add this parameter
) {
  const admin = createAdminClient();
  const username = email.split("@")[0];

  const { data: reseller } = await admin
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .eq("status", "active")
    .single();

  if (!reseller) return { error: "Store not found" };

  const { data: existing } = await admin
    .from("reseller_customers")
    .select("id, auth_user_id, auth_email")
    .eq("reseller_id", reseller.id)
    .eq("email", email)
    .single();

  if (existing) {
    // Update auth_user_id and auth_email if not set
    const updates: any = {};
    if (!existing.auth_user_id) updates.auth_user_id = authUserId;
    if (!existing.auth_email && authEmail) updates.auth_email = authEmail;

    if (Object.keys(updates).length > 0) {
      await admin
        .from("reseller_customers")
        .update(updates)
        .eq("id", existing.id);
    }
    return { success: true, customerId: existing.id };
  }

  const { data: customer } = await admin
    .from("reseller_customers")
    .insert({
      reseller_id: reseller.id,
      email, // Original email
      auth_email: authEmail, // ← Store the modified auth email
      first_name: username,
      auth_user_id: authUserId,
    })
    .select("id")
    .single();

  if (!customer) return { error: "Failed to create customer" };

  // Create wallet
  await admin.from("reseller_customer_wallets").insert({
    reseller_id: reseller.id,
    customer_id: customer.id,
    balance: 0,
    total_spent: 0,
  });

  return { success: true, customerId: customer.id };
}