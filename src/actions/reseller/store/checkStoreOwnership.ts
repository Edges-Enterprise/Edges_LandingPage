// src/actions/reseller/store/checkStoreOwnership.ts
//
// Authoritative "is the signed-in user the store owner?" check for the
// storefront.
//
// The storefront used to answer this by comparing the Auth account's
// `store_slug` metadata against the store being viewed. That is not a valid
// signal: `addCustomerWithLogin.ts` stamps a reseller-added customer's account
// with the *owner's* `store_slug`, so those customers compared equal and were
// misclassified as the store owner — which is why they saw the owner-only
// Dashboard in the storefront header/sidebar.
//
// A row in `global_reseller_applications` whose `auth_user_id` is this user is
// the only reliable ownership signal, so check that instead. The comparison
// runs server-side against the session user's own id, so it never trusts
// client-supplied metadata and never exposes the owner's UUID.
"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * @param params.applicationId the store to test ownership of.
 * @param params.storeSlug the store to test ownership of, when only the slug
 *   is known (the legacy storefront hook).
 * With neither, answers the broader "does this user own any store?" question,
 * which is what the dashboard gate needs (the dashboard RPC is itself scoped
 * only by the owner's id, not by country).
 */
export async function checkStoreOwnership(params?: {
  applicationId?: string;
  storeSlug?: string;
}): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let query = supabase
    .from("global_reseller_applications")
    .select("id")
    .eq("auth_user_id", user.id);

  if (params?.applicationId) {
    query = query.eq("id", params.applicationId);
  } else if (params?.storeSlug) {
    query = query.eq("store_slug", params.storeSlug);
  }

  const { data } = await query.limit(1).maybeSingle();
  return !!data;
}
