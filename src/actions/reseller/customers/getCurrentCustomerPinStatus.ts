// src/actions/reseller/customers/getCurrentCustomerPinStatus.ts
//
// Task 4, pointer 3.a.iv.zi.x. Whether the signed-in user has set a
// transaction PIN, for the storefront purchase flow. Mirrors legacy
// (store)/old-storeName's branch (legacy ~716-730) but against the
// global tables:
//   - store owner -> global_reseller_applications.transaction_pin
//     (same row the existing changeTransactionPin action reads)
//   - customer    -> global_customers.transaction_pin
//
// Server-side because the customer path reads a row the browser cannot
// (global_customers RLS grants SELECT only to the reseller owner).
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCurrentCustomerPinStatus(
  resellerId: string,
  isStoreOwner: boolean,
): Promise<{ hasPin: boolean; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { hasPin: false, error: "Not signed in" };
  }

  if (isStoreOwner) {
    const { data, error } = await supabase
      .from("global_reseller_applications")
      .select("transaction_pin")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error) return { hasPin: false, error: error.message };
    return { hasPin: !!data?.transaction_pin };
  }

  // Same RLS gap as getCurrentCustomerWallet: `global_customers` SELECT is
  // owner-only, so the session client reads no row for the customer and
  // every customer looked like they had no transaction PIN. Read through
  // the service-role client after the session check; the filter is the
  // authenticated user's own id.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("global_customers")
    .select("transaction_pin")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) return { hasPin: false, error: error.message };
  return { hasPin: !!data?.transaction_pin };
}
