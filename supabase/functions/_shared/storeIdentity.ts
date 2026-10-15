// supabase/functions/_shared/storeIdentity.ts
//
// Task 8, branch 8.a.ii. Identity resolution for the customer-facing
// storefront read functions (global-store-customer-context,
// global-store-wallet, global-store-transactions).
//
// The invariant every one of those functions must preserve: they return
// ONLY the caller's own rows. The caller is identified from the JWT
// (auth.getUser(token) -> user.id); it is NEVER taken from a
// request-supplied id. resellerId is a routing hint - it says WHICH store
// to look in - not an authorization claim: the row is only returned when
// its auth_user_id matches the authenticated caller.
//
// This mirrors the identity branch in _shared/purchaseOrchestrator.ts
// (steps 1): a caller is either the store owner
// (global_reseller_applications.auth_user_id) or a customer of the store
// (global_customers.auth_user_id), and never both.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ResolvedIdentity {
  userId: string;
  userType: "reseller" | "customer";
  /** global_reseller_applications.id */
  resellerId: string;
  /** global_customers.id, null for a reseller. */
  customerId: string | null;
}

export interface ResolveResult {
  identity: ResolvedIdentity | null;
  /** Set only for a caller error (bad/missing token); absent means "not found". */
  error?: string;
  status?: number;
}

/**
 * Verify the caller's JWT and resolve them against the given store.
 *
 * Returns `{ identity: null }` when the token is valid but the caller is
 * neither the owner nor a customer of this store (the caller should render
 * an empty result, not an error). Returns `{ error, status }` when the token
 * itself is missing or invalid.
 */
export async function resolveStoreIdentity(
  admin: SupabaseClient,
  authHeader: string | null,
  resellerId: string | undefined,
): Promise<ResolveResult> {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { identity: null, error: "Missing authorization token", status: 401 };
  }
  if (!resellerId) {
    return { identity: null, error: "Missing required field: resellerId", status: 400 };
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { identity: null, error: "Invalid authorization token", status: 401 };
  }
  const userId = userData.user.id;

  // Owner?
  const { data: reseller } = await admin
    .from("global_reseller_applications")
    .select("id")
    .eq("id", resellerId)
    .eq("auth_user_id", userId)
    .eq("application_status", "active")
    .maybeSingle();

  if (reseller) {
    return {
      identity: { userId, userType: "reseller", resellerId: reseller.id, customerId: null },
    };
  }

  // Customer of this store?
  const { data: customer } = await admin
    .from("global_customers")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (customer) {
    return {
      identity: { userId, userType: "customer", resellerId, customerId: customer.id },
    };
  }

  return { identity: null };
}

/** Service-role admin client, built from the function's own environment. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Shared CORS headers for the storefront read functions. */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
