// src/actions/reseller/customers/getCurrentCustomerTransactions.ts
//
// Transaction history for the signed-in storefront customer. Same auth ->
// customer resolution as `getCurrentCustomerWallet`: `global_customers` RLS
// only grants SELECT to the reseller owner and
// `global_customer_transactions` has no policies at all, so the session
// client reads nothing for the customer themself and this must go through
// the service-role client after verifying the session.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerTransactionType =
  | "deposit"
  | "purchase"
  | "refund"
  | "withdrawal";

export interface CustomerTransaction {
  id: string;
  type: CustomerTransactionType;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  reference: string;
  description: string;
  createdAt: string;
}

/**
 * `global_customer_transactions` stores `deposit` / `purchase` / `refund` /
 * `withdrawal` directly (unlike `global_transactions`, which is constrained
 * to credit/debit/purchase/refund and needs a classifier). Unknown types are
 * treated as outgoing so a future type cannot silently inflate a balance.
 */
function normaliseType(raw: unknown): CustomerTransactionType {
  switch (raw) {
    case "deposit":
    case "credit":
      return "deposit";
    case "purchase":
    case "debit":
      return "purchase";
    case "refund":
      return "refund";
    default:
      return "withdrawal";
  }
}

export async function getCurrentCustomerTransactions(
  resellerId: string,
  limit = 25,
): Promise<{ data?: CustomerTransaction[]; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not signed in" };
  }

  const admin = createAdminClient();

  const { data: customer, error: customerError } = await admin
    .from("global_customers")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError) return { error: customerError.message };
  if (!customer) return { error: "Customer record not found" };

  const { data: rows, error: txError } = await admin
    .from("global_customer_transactions")
    .select(
      "id, type, amount, fee, net_amount, status, reference, description, created_at",
    )
    .eq("reseller_id", resellerId)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (txError) return { error: txError.message };

  return {
    data: (rows ?? []).map((row) => ({
      id: row.id,
      type: normaliseType(row.type),
      amount: Number(row.amount ?? 0),
      fee: Number(row.fee ?? 0),
      netAmount: Number(row.net_amount ?? row.amount ?? 0),
      status: row.status ?? "completed",
      reference: row.reference ?? "",
      description: row.description ?? "",
      createdAt: row.created_at,
    })),
  };
}
