// src/actions/reseller/customers/setCurrentCustomerPin.ts
//
// First-time PIN creation for the storefront purchase flow.
//
// `useStorePurchase` used to write `global_customers.transaction_pin` straight
// from the browser client, which runs as `anon`. Every policy on
// `global_customers` is keyed on the RESELLER owner's auth id, so a customer
// updating their own row matched nothing: PostgREST returned 204 with no rows
// and no error, the PIN was silently never saved, and the purchase then failed
// in the orchestrator with "No transaction PIN found. Please set your PIN and
// try again." - a dead end, because every purchase retried the same no-op.
//
// Same RLS gap and the same remedy as getCurrentCustomerPinStatus: read/write
// through the service-role client once the session has been verified, with the
// filter pinned to the authenticated user's own row.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setCurrentCustomerPin(
  resellerId: string,
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: "PIN must be 4 digits" };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "Not signed in" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("global_customers")
    .update({ transaction_pin: pin })
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  // A 0-row update means the caller is not a customer of this store; report it
  // rather than letting the purchase fail later with a misleading PIN error.
  if (!data?.length) {
    return { success: false, error: "Customer not found for this store" };
  }

  return { success: true };
}
