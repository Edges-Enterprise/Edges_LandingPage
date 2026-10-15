// supabase/functions/global-store-customer-context/index.ts
//
// Task 8, pointer 8.a.ii.zi. The caller's own profile for a given store:
// who they are (owner or customer), their display name/email, and whether a
// transaction PIN is set. Replaces the legacy direct reads in
// hooks/useProfiles.ts and the read half of hooks/useTransactionPin.ts,
// which hit the Nigeria-only resellers / reseller_customers tables.
//
// Identity comes from the JWT, never from the request body (see
// _shared/storeIdentity.ts). The response carries no other customer's data.
import {
  resolveStoreIdentity,
  adminClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/storeIdentity.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId } = await req.json();
    const admin = adminClient();

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ profile: null });

    if (identity.userType === "reseller") {
      const { data } = await admin
        .from("global_reseller_applications")
        .select("id, store_name, email, transaction_pin, created_at")
        .eq("id", identity.resellerId)
        .maybeSingle();

      if (!data) return jsonResponse({ profile: null });

      return jsonResponse({
        profile: {
          id: data.id,
          account_type: "reseller",
          name: data.store_name,
          email: data.email,
          has_transaction_pin: !!data.transaction_pin,
          created_at: data.created_at,
        },
      });
    }

    const { data } = await admin
      .from("global_customers")
      .select("id, first_name, last_name, email, transaction_pin, created_at")
      .eq("id", identity.customerId!)
      .maybeSingle();

    if (!data) return jsonResponse({ profile: null });

    return jsonResponse({
      profile: {
        id: data.id,
        account_type: "customer",
        name:
          `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
          data.email,
        email: data.email,
        has_transaction_pin: !!data.transaction_pin,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error("global-store-customer-context error:", error);
    return jsonResponse({ error: "Profile request failed" }, 400);
  }
});
