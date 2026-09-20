// src/actions/reseller/customers/getGlobalCustomerAuthEmail.ts
//
// Task 4, pointer 1.b.ii.zi.x. Multi-country equivalent of the legacy
// src/app/actions/reseller/getCustomerAuthEmail.ts. Given the email a
// customer actually types in and the store they're signing into,
// returns the synthetic auth_email Supabase Auth actually has on file
// for that (store, email) pair — or null if this customer has never
// registered at this specific store. See HANDOVER.md Task 4 for full
// context on why this indirection exists (Supabase Auth's email
// uniqueness vs. one real-world email needing an independent account
// per store).
"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getGlobalCustomerAuthEmail(
  originalEmail: string,
  storeSlug: string,
): Promise<string | null> {
  const admin = createAdminClient();

  // store_slug is globally unique — no country_code needed to scope
  // this lookup, same reasoning as registerCustomerToGlobalReseller.
  const { data: reseller, error: resellerError } = await admin
    .from("global_reseller_applications")
    .select("id")
    .eq("store_slug", storeSlug)
    .eq("application_status", "active")
    .single();

  if (resellerError || !reseller) {
    return null;
  }

  const { data: customer } = await admin
    .from("global_customers")
    .select("auth_email")
    .eq("email", originalEmail)
    .eq("reseller_id", reseller.id)
    .maybeSingle();

  return customer?.auth_email || null;
}
