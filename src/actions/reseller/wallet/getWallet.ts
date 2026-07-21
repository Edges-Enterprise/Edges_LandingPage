// src/actions/reseller/wallet/getWallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface WalletData {
  id: string;
  balance: number;
  currency: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export async function getWallet(): Promise<{
  success: boolean;
  data?: WalletData;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Get wallet from global_wallets table
    const { data: wallet, error: walletError } = await supabase
      .from("global_wallets")
      .select("*")
      .eq("reseller_id", application.id)
      .single();

    if (walletError) {
      if (walletError.code === "PGRST116") {
        // No wallet found - create one
        const { data: newWallet, error: createError } = await supabase
          .from("global_wallets")
          .insert({
            reseller_id: application.id,
            balance: 0,
            currency: "USD",
            status: "active",
          })
          .select()
          .single();

        if (createError) {
          console.error("Create wallet error:", createError);
          return { success: false, error: "Failed to create wallet" };
        }

        return {
          success: true,
          data: {
            id: newWallet.id,
            balance: newWallet.balance || 0,
            currency: newWallet.currency || "USD",
            status: newWallet.status || "active",
            created_at: newWallet.created_at,
            updated_at: newWallet.updated_at,
          },
        };
      }

      console.error("Get wallet error:", walletError);
      return { success: false, error: walletError.message };
    }

    return {
      success: true,
      data: {
        id: wallet.id,
        balance: wallet.balance || 0,
        currency: wallet.currency || "USD",
        status: wallet.status || "active",
        created_at: wallet.created_at,
        updated_at: wallet.updated_at,
      },
    };
  } catch (error) {
    console.error("GetWallet Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
