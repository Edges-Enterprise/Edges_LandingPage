// app/actions/reseller/registerCustomer.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function registerCustomerToReseller(
  storeName: string,
  authUserId: string,
  email: string,
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
    .select("id, auth_user_id")
    .eq("reseller_id", reseller.id)
    .eq("email", email)
    .single();

  if (existing) {
    if (!existing.auth_user_id) {
      await admin.from("reseller_customers")
        .update({ auth_user_id: authUserId })
        .eq("id", existing.id);
    }
    return { success: true, customerId: existing.id };
  }

  const { data: customer } = await admin
    .from("reseller_customers")
    .insert({
      reseller_id: reseller.id,
      email,
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