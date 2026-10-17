// supabase/functions/global-store-register-customer/index.ts
//
// Task 8, branch 8.a.ii (registration redirect / signup path). The mobile
// app's register screen used to find-or-create the customer row by writing
// the legacy reseller_customers table directly with the publishable key.
// This is the global_* equivalent, run with the service role, mirroring the
// web action src/actions/reseller/customers/registerCustomerToGlobalReseller.ts
// (find-or-create by (reseller_id, email), backfill auth fields on first
// sign-in for this store, create the wallet on first creation with the
// store's own currency).
//
// The caller must present a valid JWT: the new/updated customer row's
// auth_user_id is taken from the token, never from the body, so a caller
// cannot attach an arbitrary auth user to a store's customer list.
import {
  adminClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/storeIdentity.ts";
import { getCountryCurrency } from "../_shared/countryCurrency.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId, email, authEmail } = await req.json();

    if (!resellerId || !email) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const token = (req.headers.get("Authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) {
      return jsonResponse({ error: "Missing authorization token" }, 401);
    }

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid authorization token" }, 401);
    }
    const authUserId = userData.user.id;

    const { data: reseller } = await admin
      .from("global_reseller_applications")
      .select("id, country_code, auth_user_id")
      .eq("id", resellerId)
      .eq("application_status", "active")
      .maybeSingle();

    if (!reseller) return jsonResponse({ error: "Store not found" }, 404);

    // The store owner signing in is not a customer: their identity is the
    // reseller row, so do not create a customer record for them.
    if (reseller.auth_user_id && reseller.auth_user_id === authUserId) {
      return jsonResponse({ success: true, customerId: null, userType: "reseller" });
    }

    const { data: existing } = await admin
      .from("global_customers")
      .select("id, auth_user_id, auth_email")
      .eq("reseller_id", reseller.id)
      .or(`email.eq.${email},auth_email.eq.${authEmail ?? email}`)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, string> = {};
      if (!existing.auth_user_id) updates.auth_user_id = authUserId;
      if (!existing.auth_email && authEmail) updates.auth_email = authEmail;
      if (Object.keys(updates).length > 0) {
        await admin.from("global_customers").update(updates).eq("id", existing.id);
      }
      return jsonResponse({ success: true, customerId: existing.id });
    }

    // last_name is NOT NULL in global_customers (unlike the legacy table);
    // signup only collects an email, so an empty string satisfies the
    // constraint without fabricating a surname.
    const { data: customer, error: customerError } = await admin
      .from("global_customers")
      .insert({
        reseller_id: reseller.id,
        email,
        auth_email: authEmail,
        first_name: email.split("@")[0],
        last_name: "",
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (customerError || !customer) {
      console.error("global-store-register-customer insert error:", customerError);
      return jsonResponse({ error: "Failed to create customer" }, 400);
    }

    const { error: walletError } = await admin
      .from("global_customer_wallets")
      .insert({
        reseller_id: reseller.id,
        customer_id: customer.id,
        balance: 0,
        currency: getCountryCurrency(reseller.country_code),
        total_spent: 0,
      });

    if (walletError) {
      // The customer row exists; a failed wallet insert is recoverable
      // (created lazily later), so log rather than fail the signup.
      console.error("global-store-register-customer wallet error:", walletError);
    }

    return jsonResponse({ success: true, customerId: customer.id });
  } catch (error) {
    console.error("global-store-register-customer error:", error);
    return jsonResponse({ error: "Registration failed" }, 400);
  }
});
