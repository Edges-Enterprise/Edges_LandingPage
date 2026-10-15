// supabase/functions/global-store-transactions/index.ts
//
// Task 8, pointer 8.a.ii.zp. The caller's transaction history for a given
// store, read with the service role. Replaces the legacy direct reads in
// hooks/useTransactions.ts (reseller_transactions /
// reseller_customer_transactions), which were Nigeria-only.
//
// Identity comes from the JWT (see _shared/storeIdentity.ts); the response
// carries only the caller's own transactions. A reseller sees the store's
// wallet transactions (global_transactions); a customer sees their own
// (global_customer_transactions).
import {
  resolveStoreIdentity,
  adminClient,
  corsHeaders,
  jsonResponse,
} from "../_shared/storeIdentity.ts";

const MAX_LIMIT = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId, limit, offset } = await req.json();
    const admin = adminClient();

    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) return jsonResponse({ transactions: [] });

    const take = Math.min(Math.max(Number(limit) || 50, 1), MAX_LIMIT);
    const skip = Math.max(Number(offset) || 0, 0);

    if (identity.userType === "reseller") {
      const { data } = await admin
        .from("global_transactions")
        .select(
          "id, type, amount, description, status, reference, metadata, created_at",
        )
        .eq("reseller_id", identity.resellerId)
        .order("created_at", { ascending: false })
        .range(skip, skip + take - 1);

      return jsonResponse({ transactions: data ?? [] });
    }

    const { data } = await admin
      .from("global_customer_transactions")
      .select(
        "id, type, amount, previous_balance, new_balance, reference, status, description, metadata, created_at",
      )
      .eq("reseller_id", identity.resellerId)
      .eq("customer_id", identity.customerId!)
      .order("created_at", { ascending: false })
      .range(skip, skip + take - 1);

    return jsonResponse({ transactions: data ?? [] });
  } catch (error) {
    console.error("global-store-transactions error:", error);
    return jsonResponse({ error: "Transactions request failed" }, 400);
  }
});
