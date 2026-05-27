// app/actions/reseller/getCustomerAuthEmail.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getCustomerAuthEmail(
  originalEmail: string,
  storeName: string,
) {
  const admin = createAdminClient();

  const { data: reseller } = await admin
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .single();

  if (!reseller) return null;

  const { data: customer } = await admin
    .from("reseller_customers")
    .select("auth_email")
    .eq("email", originalEmail)
    .eq("reseller_id", reseller.id)
    .single();

  return customer?.auth_email || null;
}
