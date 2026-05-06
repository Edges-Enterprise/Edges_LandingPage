// app/actions/reseller/wallet/getWallet.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { ResellerWallet } from "@/types";

/**
 * Get a reseller's wallet
 */
export async function getWallet(
  resellerId: string,
): Promise<ResellerWallet | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_wallets")
    .select("*")
    .eq("reseller_id", resellerId)
    .single();

  if (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }

  return data;
}