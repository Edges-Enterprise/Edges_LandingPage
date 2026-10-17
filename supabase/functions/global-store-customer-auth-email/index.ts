// supabase/functions/global-store-customer-auth-email/index.ts
//
// Task 8, branch 8.a.ii.zq. The login screen needs the per-store derived
// auth email for a shopper email (registration signs up with
// local+slugN@domain, so a plain email/password login must resolve back to
// it). Replaces the legacy get-customer-auth-email function, which looked up
// reseller_customers by store_name.
//
// Signed-out call (no JWT): it takes the shopper's email, so it must not
// confirm whether an email is registered - a "not found" and a "found"
// response are indistinguishable in shape, and it never returns the
// customer row. It is a login-support lookup, matching the legacy function's
// trust model.
import { adminClient, corsHeaders, jsonResponse } from "../_shared/storeIdentity.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId, email } = await req.json();
    if (!resellerId || !email) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const admin = adminClient();
    const { data } = await admin
      .from("global_customers")
      .select("auth_email")
      .eq("reseller_id", resellerId)
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();

    return jsonResponse({ success: true, authEmail: data?.auth_email ?? null });
  } catch (error) {
    console.error("global-store-customer-auth-email error:", error);
    return jsonResponse({ success: true, authEmail: null });
  }
});
