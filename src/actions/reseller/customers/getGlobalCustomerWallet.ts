// src/actions/reseller/customers/getGlobalCustomerWallet.ts
//
// Task 4, pointer 1.c.i.zi.x. Multi-country equivalent of the legacy
// src/app/actions/reseller/wallet/customerVirtualAccount.ts's
// getCustomerWalletWithAccounts. Reads a customer's wallet balance and
// any active virtual accounts against the global_* tables added in
// this task's schema migration. See HANDOVER.md Task 4 for full
// context.
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface GlobalCustomerWallet {
  id: string;
  balance: number;
  total_spent: number;
  currency: string;
}

export interface GlobalCustomerVirtualAccount {
  id: string;
  account_number: string;
  bank_name: string;
  account_name: string;
  bank_code: string | null;
  provider: string;
  status: string;
  created_at: string;
}

export async function getGlobalCustomerWallet(
  customerId: string,
  resellerId: string,
): Promise<{
  wallet: GlobalCustomerWallet;
  virtualAccounts: GlobalCustomerVirtualAccount[];
}> {
  const supabase = await createServerClient();

  const [walletResult, accountsResult] = await Promise.all([
    supabase
      .from("global_customer_wallets")
      .select("id, balance, total_spent, currency")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .maybeSingle(),
    supabase
      .from("global_customer_virtual_accounts")
      .select("*")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  return {
    // Mirrors legacy's zero-balance fallback shape for a customer who
    // hasn't had a wallet created yet (e.g. registerCustomerToGlobalReseller's
    // wallet insert failed and was only logged, not retried) — this
    // read path stays resilient to that rather than throwing.
    wallet: walletResult.data || {
      id: "",
      balance: 0,
      total_spent: 0,
      currency: "USD",
    },
    virtualAccounts: accountsResult.data || [],
  };
}
