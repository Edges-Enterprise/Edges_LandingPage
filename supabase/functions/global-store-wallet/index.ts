// supabase/functions/global-store-wallet/index.ts
//
// Task 8, pointer 8.a.ii.zo. The caller's wallet and virtual accounts for a
// given store, read with the service role. Replaces the legacy direct reads
// in hooks/useWallet.ts (reseller_wallets / reseller_customer_wallets) and
// hooks/useVirtualAccounts.ts (reseller_virtual_accounts /
// reseller_customer_virtual_accounts).
//
// Identity comes from the JWT (see _shared/storeIdentity.ts); the response
// carries only the caller's own wallet/accounts.
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
    if (!identity) return jsonResponse({ wallet: null, virtual_accounts: [] });

    if (identity.userType === "reseller") {
      const { data: wallet } = await admin
        .from("global_wallets")
        .select("id, balance, currency, status")
        .eq("reseller_id", identity.resellerId)
        .maybeSingle();

      const { data: accounts } = await admin
        .from("global_virtual_accounts")
        .select(
          "id, account_number, bank_name, account_name, provider, status, created_at",
        )
        .eq("reseller_id", identity.resellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      return jsonResponse({
        wallet: {
          id: wallet?.id ?? "",
          balance: Number(wallet?.balance ?? 0),
          currency: wallet?.currency ?? null,
        },
        virtual_accounts: accounts ?? [],
      });
    }

    const { data: wallet } = await admin
      .from("global_customer_wallets")
      .select("id, balance, currency, total_spent, status")
      .eq("reseller_id", identity.resellerId)
      .eq("customer_id", identity.customerId!)
      .maybeSingle();

    const { data: accounts } = await admin
      .from("global_customer_virtual_accounts")
      .select(
        "id, account_number, bank_name, account_name, provider, status, created_at",
      )
      .eq("reseller_id", identity.resellerId)
      .eq("customer_id", identity.customerId!)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    return jsonResponse({
      wallet: {
        id: wallet?.id ?? "",
        balance: Number(wallet?.balance ?? 0),
        currency: wallet?.currency ?? null,
      },
      virtual_accounts: accounts ?? [],
    });
  } catch (error) {
    console.error("global-store-wallet error:", error);
    return jsonResponse({ error: "Wallet request failed" }, 400);
  }
});
