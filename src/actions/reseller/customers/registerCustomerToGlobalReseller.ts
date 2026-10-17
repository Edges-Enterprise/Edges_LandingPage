// src/actions/reseller/customers/registerCustomerToGlobalReseller.ts
//
// Task 4, pointer 1.b.i.zi.x. Multi-country equivalent of the legacy
// src/app/actions/reseller/registerCustomer.ts's registerCustomerToReseller.
// Mirrors its exact logic (find-or-create a customer row scoped to one
// store, create a wallet on first creation) against the global_* tables
// instead of the legacy resellers/reseller_customers/reseller_customer_wallets
// ones. See HANDOVER.md Task 4 for full context.
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";

interface RegisterCustomerResult {
  success?: boolean;
  customerId?: string;
  error?: string;
}

export async function registerCustomerToGlobalReseller(
  storeSlug: string,
  authUserId: string,
  email: string,
  authEmail?: string,
): Promise<RegisterCustomerResult> {
  const admin = createAdminClient();

  // store_slug is globally unique (confirmed via
  // global_reseller_applications_store_slug_key), so no country_code
  // is needed to scope this lookup — matches legacy's storeName-only
  // scoping, just against the global table.
  const { data: reseller, error: resellerError } = await admin
    .from("global_reseller_applications")
    .select("id, country_code")
    .eq("store_slug", storeSlug)
    .eq("application_status", "active")
    .single();

  if (resellerError || !reseller) {
    return { error: "Store not found" };
  }

  const { data: existing } = await admin
    .from("global_customers")
    .select("id, auth_user_id, auth_email")
    .eq("reseller_id", reseller.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Same-email-across-multiple-stores model: this row is specific to
    // this (reseller_id, email) pair already — just backfill auth
    // fields if this is the first time this customer has signed in
    // for *this* store (mirrors legacy's update-if-unset behavior).
    const updates: Record<string, string> = {};
    if (!existing.auth_user_id) updates.auth_user_id = authUserId;
    if (!existing.auth_email && authEmail) updates.auth_email = authEmail;

    if (Object.keys(updates).length > 0) {
      await admin
        .from("global_customers")
        .update(updates)
        .eq("id", existing.id);
    }
    return { success: true, customerId: existing.id };
  }

  const username = email.split("@")[0];

  // global_customers.last_name is NOT NULL (unlike legacy's
  // reseller_customers.last_name, which is nullable) — signup only
  // collects an email, so there's no real surname to store. Using an
  // empty string satisfies the constraint without fabricating a name;
  // this is a genuine schema difference from legacy, not an oversight.
  const { data: customer, error: customerError } = await admin
    .from("global_customers")
    .insert({
      reseller_id: reseller.id,
      email,
      auth_email: authEmail,
      first_name: username,
      last_name: "",
      auth_user_id: authUserId,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    return { error: "Failed to create customer" };
  }

  // Resolve currency from the reseller's own country, not a caller-
  // supplied value — avoids a Nigerian customer's wallet silently
  // defaulting to global_customer_wallets.currency's USD default.
  // getCountryConfig never returns undefined — it falls back to
  // Nigeria's config for an unrecognized code, which is a more
  // sensible fallback here than USD given the rest of this codebase
  // already treats NG as the default country.
  const countryConfig = getCountryConfig(reseller.country_code);

  const { error: walletError } = await admin
    .from("global_customer_wallets")
    .insert({
      reseller_id: reseller.id,
      customer_id: customer.id,
      balance: 0,
      currency: countryConfig.currency,
      total_spent: 0,
    });

  if (walletError) {
    // Customer row already exists at this point; a failed wallet
    // insert shouldn't fail the whole signup (the wallet can be
    // created lazily on first access, same as legacy's purchasePlan.ts
    // does for reseller_customer_wallets) — log for visibility instead.
    console.error(
      "[registerCustomerToGlobalReseller] Wallet creation failed:",
      { customerId: customer.id, resellerId: reseller.id, walletError },
    );
  }

  return { success: true, customerId: customer.id };
}
