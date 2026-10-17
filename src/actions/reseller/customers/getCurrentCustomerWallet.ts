// src/actions/reseller/customers/getCurrentCustomerWallet.ts
//
// Task 4, pointer 3.a.iii.zi.x. Resolves the signed-in customer from
// their Supabase Auth session and returns their wallet + active virtual
// accounts, so the client never has to know a customer UUID.
//
// Why this exists rather than resolving client-side: `global_customers`
// RLS only grants SELECT to the reseller owner (policy "Users can view
// their own customers", schema.sql), and `global_customer_wallets` /
// `global_customer_virtual_accounts` have no policies at all — so a
// browser client cannot read a customer's own row. The service-role
// server client can. This wraps the existing 1.c.i.zi.x
// `getGlobalCustomerWallet` with the auth->customer resolution that
// `fundGlobalCustomerWallet` (1.c.iv) also uses.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import {
  getGlobalCustomerWallet,
  type GlobalCustomerVirtualAccount,
} from "./getGlobalCustomerWallet";

export interface CurrentCustomerWallet {
  customerId: string;
  balance: number;
  totalSpent: number;
  currency: string;
  virtualAccounts: GlobalCustomerVirtualAccount[];
}

export async function getCurrentCustomerWallet(
  resellerId: string,
): Promise<{ data?: CurrentCustomerWallet; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not signed in" };
  }

  const { data: customer, error: customerError } = await supabase
    .from("global_customers")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError) return { error: customerError.message };
  if (!customer) return { error: "Customer record not found" };

  const { wallet, virtualAccounts } = await getGlobalCustomerWallet(
    customer.id,
    resellerId,
  );

  return {
    data: {
      customerId: customer.id,
      balance: wallet.balance,
      totalSpent: wallet.total_spent,
      currency: wallet.currency,
      virtualAccounts,
    },
  };
}
