// src/lib/admin/requirePlatformAdmin.ts
//
// The gate for the platform-admin surface. This is the ONE thing standing
// between a signed-in reseller/customer and the platform's own markup and
// catalog controls, so it is enforced server-side on every page and every
// action — never trusted from the client.
//
// The existing `[countryCode]/admin/...` routes are build placeholders with
// NO auth check; this helper deliberately does not reuse their layouts.

import { createServerClient } from "@/lib/supabase/server";

export interface PlatformAdmin {
  userId: string;
  email: string | null;
}

/**
 * Return the caller when they are a signed-in platform admin, else null.
 *
 * `profiles.is_admin` is the platform's own flag (the same one the existing
 * admin email/notification actions check). A missing profile, a read error
 * and a non-admin all resolve to null — fail closed.
 */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.is_admin) return null;

  return { userId: user.id, email: user.email ?? null };
}
