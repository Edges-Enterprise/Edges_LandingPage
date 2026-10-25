// supabase/functions/_shared/storeAuthEmail.ts
//
// Task 8, defect batch (bug A). Resolve the address a user typed to the
// per-store derived auth email Supabase Auth actually has on file.
//
// Both roles sign in with the address they registered with, but Supabase Auth
// holds a derived alias for each:
//   * reseller/owner: <local>+reseller-<cc>-<slug>-<rand>@<domain>
//     (generateAuthEmail in submitApplication.ts)
//   * customer:       <local>+<slug>N@<domain>
//   * legacy customer: email = auth_email = the alias (rows written before the
//     original address was stored)
// The suffix is internal, so a plain email/password login must map back to it.
//
// Owner resolution is exact and store-scoped: the typed address is compared
// against THIS store's `original_email` (the authoritative record of what was
// typed at signup) and its `auth_email` returned. Comparing in code rather than
// with a case-insensitive SQL filter avoids wildcard hazards, because `_` is a
// common character in email local parts.
//
// Customer resolution has two shapes in global_customers:
//   * email = the typed address, auth_email = the alias  (the current shape)
//   * email = auth_email = the alias                     (legacy rows)
// The direct lookup handles the first. The second is invisible to a lookup by
// the typed address, so it is recovered from Supabase Auth's own
// user_metadata.original_email, scoped to this store's slug and confirmed
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
    .select("store_slug, auth_email, original_email, email")
    .eq("id", resellerId)
    .maybeSingle();

  // Store owner. Their Auth identity is the derived alias, which a lookup by
  // the typed address never finds, so match the application row instead.
  if (store?.auth_email) {
    const original = String(store.original_email || store.email || "")
      .trim()
      .toLowerCase();
    if (original === typed) return store.auth_email;
  }

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

