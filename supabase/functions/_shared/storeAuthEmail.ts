// supabase/functions/_shared/storeAuthEmail.ts
//
// Task 8, defect batch (bug A). Resolve the address a customer typed to the
// per-store derived auth email Supabase Auth actually has on file.
//
// The store suffix is internal: registration signs up as
// local+<slug>N@domain, so a plain email/password login must map back to it.
// Two row shapes exist in global_customers:
//   * email = the typed address, auth_email = the alias  (the current shape)
//   * email = auth_email = the alias                     (rows written before
//     the original address was stored)
// The direct lookup handles the first. The second is invisible to a lookup
// by the typed address, so it is recovered from Supabase Auth's own
// user_metadata.original_email - the authoritative record of what the
// customer typed at signup - scoped to this store's slug and confirmed
// against the customer row. Without the fallback those customers resolve to
// nothing and are told "invalid login credentials".
//
// Extracted from global-store-customer-auth-email/index.ts so the resolution
// can be unit-tested without starting the function's HTTP server.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Auth user rows are scanned at most this far; this is a login-support
// lookup and current scale is a few hundred accounts.
const MAX_PAGES = 10;
const PER_PAGE = 1000;

export async function resolveStoreAuthEmail(
  admin: SupabaseClient,
  resellerId: string,
  typedEmail: string,
): Promise<string | null> {
  const typed = String(typedEmail).trim().toLowerCase();

  const { data: direct } = await admin
    .from("global_customers")
    .select("auth_email")
    .eq("reseller_id", resellerId)
    .eq("email", typed)
    .maybeSingle();
  if (direct?.auth_email) return direct.auth_email;

  const { data: store } = await admin
    .from("global_reseller_applications")
    .select("store_slug")
    .eq("id", resellerId)
    .maybeSingle();
  const slug = String(store?.store_slug || "").trim().toLowerCase();
  if (!slug) return null;

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

      const { data: customer } = await admin
        .from("global_customers")
        .select("auth_email")
        .eq("reseller_id", resellerId)
        .eq("auth_email", alias)
        .maybeSingle();
      if (customer?.auth_email) return customer.auth_email;
    }

    if (list.users.length < PER_PAGE) break;
  }

  return null;
}
