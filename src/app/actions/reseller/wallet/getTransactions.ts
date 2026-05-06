// app/actions/reseller/wallet/getTransactions.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types";

/**
 * Get transaction history for a reseller
 */
export async function getTransactions(
  resellerId: string,
  limit = 20,
): Promise<Transaction[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_transactions")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return data || [];
}