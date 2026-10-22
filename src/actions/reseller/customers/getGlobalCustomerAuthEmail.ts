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

// Auth user rows are scanned at most this far; this is a login-support
// lookup and current scale is a few hundred accounts.
const MAX_PAGES = 10;
const PER_PAGE = 1000;

export async function getGlobalCustomerAuthEmail(
  originalEmail: string,
  storeSlug: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const typed = String(originalEmail).trim().toLowerCase();

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
    .eq("email", typed)
    .eq("reseller_id", reseller.id)
    .maybeSingle();

  if (customer?.auth_email) return customer.auth_email;

  // Rows written before the original address was stored hold the derived
  // alias in `email` too (email == auth_email), so the typed address can't
  // find them. Recover the alias from Supabase Auth's own
  // user_metadata.original_email — the authoritative record of what the
  // customer typed at signup — scoped to this store and confirmed against
  // the customer row. Without this, an affected customer's login resolves
  // to nothing and surfaces as "invalid login credentials".
  const slug = storeSlug.trim().toLowerCase();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data: list, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error || !list?.users?.length) break;

    for (const user of list.users) {
      const original = String(user.user_metadata?.original_email || "")
        .trim()
        .toLowerCase();
      const alias = String(user.email || "").toLowerCase();
      if (original !== typed || !alias.includes(slug)) continue;

      const { data: row } = await admin
        .from("global_customers")
        .select("auth_email")
        .eq("reseller_id", reseller.id)
        .eq("auth_email", alias)
        .maybeSingle();
      if (row?.auth_email) return row.auth_email;
    }

    if (list.users.length < PER_PAGE) break;
  }

  return null;
}
