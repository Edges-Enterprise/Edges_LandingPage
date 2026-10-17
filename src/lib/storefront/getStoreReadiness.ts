// src/lib/storefront/getStoreReadiness.ts
//
// Store sell-readiness for the customer storefront (Task 4, branch 4.b).
//
// This is the multi-country equivalent of the legacy
// `app/api/store-status/route.ts`, which the old storefront called
// client-side and gated every "Buy" on. The old route reads
// legacy/NG-only tables (`resellers`, `reseller_virtual_accounts`,
// `reseller_wallets`); this reads their `global_*` counterparts:
//
//   hasWhatsApp       -> global_reseller_applications.phone
//   hasVirtualAccount -> an active global_virtual_accounts row for the
//                        reseller (any provider — this does not check
//                        the gateway-specific split, matching legacy)
//   hasBalance        -> global_wallets.balance > 0 (owner's own wallet)
//
// A store is sellable only when all three hold. This is an anonymous
// storefront read, so it uses the admin (service-role) client, NOT
// `createServerClient()`: RLS is enabled on `global_virtual_accounts`
// and `global_wallets` with only owner-scoped SELECT policies, so with a
// customer session cookie present the user's JWT is sent and both reads
// come back empty. The service-role client bypasses RLS; the result is
// non-sensitive booleans + a reason string.

import { createAdminClient } from "@/lib/supabase/admin";

export interface StoreReadiness {
  canSell: boolean;
  hasVirtualAccount: boolean;
  hasBalance: boolean;
  hasWhatsApp: boolean;
  balance: number;
  reason: string | null;
}

function buildReason(state: Omit<StoreReadiness, "canSell" | "reason">): {
  canSell: boolean;
  reason: string | null;
} {
  const canSell =
    state.hasWhatsApp && state.hasVirtualAccount && state.hasBalance;
  if (canSell) return { canSell, reason: null };
  if (!state.hasWhatsApp) {
    return {
      canSell,
      reason:
        "Store owner hasn't set up WhatsApp support. Please check back later.",
    };
  }
  if (!state.hasVirtualAccount) {
    return {
      canSell,
      reason: "Store is not fully set up yet. Please check back later.",
    };
  }
  return {
    canSell,
    reason: "Store is temporarily unavailable. Please check back later.",
  };
}

export async function getStoreReadiness(
  resellerId: string,
  phone: string | null | undefined,
): Promise<StoreReadiness> {
  const supabase = createAdminClient();

  const [{ data: virtualAccount }, { data: wallet }] = await Promise.all([
    supabase
      .from("global_virtual_accounts")
      .select("id")
      .eq("reseller_id", resellerId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("global_wallets")
      .select("balance")
      .eq("reseller_id", resellerId)
      .maybeSingle(),
  ]);

  const state = {
    hasWhatsApp: !!(phone && phone.trim().length > 0),
    hasVirtualAccount: !!virtualAccount,
    hasBalance: Number(wallet?.balance ?? 0) > 0,
    balance: Number(wallet?.balance ?? 0),
  };

  return { ...state, ...buildReason(state) };
}
