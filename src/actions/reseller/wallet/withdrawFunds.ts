// src/actions/reseller/wallet/withdrawFunds.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { getPaymentGatewayByCountry } from "@/lib/payments";

interface WithdrawFundsParams {
  amount: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    bankCode?: string;
  };
  countryCode: string;
}

export async function withdrawFunds({
  amount,
  bankDetails,
  countryCode,
}: WithdrawFundsParams): Promise<{
  success: boolean;
  data?: {
    transaction_id: string;
    new_balance: number;
    provider_reference?: string;
  };
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

    if (amount <= 0) {
      return { success: false, error: "Amount must be greater than 0" };
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

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from("global_wallets")
      .select("id, balance")
      .eq("reseller_id", application.id)
      .single();

    if (walletError) {
      return { success: false, error: "Wallet not found" };
    }

    if ((wallet.balance || 0) < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Get country configuration
    const config = getCountryConfig(countryCode);
    const gateway = getPaymentGatewayByCountry(countryCode);

    // Create withdrawal transaction (pending)
    const { data: transaction, error: txError } = await supabase
      .from("global_transactions")
      .insert({
        reseller_id: application.id,
        wallet_id: wallet.id,
        type: "withdrawal",
        amount,
        currency: config.currency,
        status: "pending",
        reference: `WTH-${Date.now()}`,
        payment_method: config.paymentGateway.provider,
        metadata: {
          bank_details: bankDetails,
          gateway: config.paymentGateway.provider,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      return { success: false, error: "Failed to create withdrawal request" };
    }

    // For Xixapay (Nigeria), we can process instantly
    // For other gateways, we may need to queue
    if (config.paymentGateway.provider === "xixapay") {
      try {
        // Process withdrawal through Xixapay
        // This would call xixapay.withdraw()
        // For now, we'll deduct from wallet and mark as completed
        const newBalance = (wallet.balance || 0) - amount;

        const { error: updateError } = await supabase
          .from("global_wallets")
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet.id);

        if (!updateError) {
          await supabase
            .from("global_transactions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", transaction.id);
        }

        return {
          success: true,
          data: {
            transaction_id: transaction.id,
            new_balance: newBalance,
          },
        };
      } catch (error) {
        console.error("Xixapay withdrawal error:", error);
        // Keep transaction as pending for manual review
      }
    }

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        new_balance: wallet.balance || 0, // Not deducted yet for non-Xixapay
      },
    };
  } catch (error) {
    console.error("WithdrawFunds Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// // src/actions/reseller/wallet/withdrawFunds.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";

// export async function withdrawFunds(
//   amount: number,
//   bankDetails: {
//     bankName: string;
//     accountNumber: string;
//     accountName: string;
//     bankCode?: string;
//   },
// ): Promise<{
//   success: boolean;
//   data?: {
//     transaction_id: string;
//     new_balance: number;
//   };
//   error?: string;
// }> {
//   try {
//     const supabase = await createServerClient();

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser();

//     if (userError || !user) {
//       return { success: false, error: "Unauthorized" };
//     }

//     if (amount <= 0) {
//       return { success: false, error: "Amount must be greater than 0" };
//     }

//     // Get the reseller's application
//     const { data: application, error: appError } = await supabase
//       .from("global_reseller_applications")
//       .select("id")
//       .eq("auth_user_id", user.id)
//       .single();

//     if (appError || !application) {
//       return { success: false, error: "Reseller not found" };
//     }

//     // Get wallet
//     const { data: wallet, error: walletError } = await supabase
//       .from("global_wallets")
//       .select("id, balance")
//       .eq("reseller_id", application.id)
//       .single();

//     if (walletError) {
//       return { success: false, error: "Wallet not found" };
//     }

//     if ((wallet.balance || 0) < amount) {
//       return { success: false, error: "Insufficient balance" };
//     }

//     // Update wallet balance
//     const newBalance = (wallet.balance || 0) - amount;

//     const { data: updatedWallet, error: updateError } = await supabase
//       .from("global_wallets")
//       .update({
//         balance: newBalance,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", wallet.id)
//       .select()
//       .single();

//     if (updateError) {
//       console.error("Update wallet error:", updateError);
//       return { success: false, error: "Failed to update wallet" };
//     }

//     // Create transaction record
//     const { data: transaction, error: txError } = await supabase
//       .from("global_transactions")
//       .insert({
//         reseller_id: application.id,
//         wallet_id: wallet.id,
//         type: "debit",
//         amount: amount,
//         description: `Withdrawal to ${bankDetails.bankName}`,
//         status: "pending",
//         reference: `WTH-${Date.now()}`,
//         metadata: {
//           bank_details: bankDetails,
//         },
//       })
//       .select()
//       .single();

//     if (txError) {
//       console.error("Create transaction error:", txError);
//     }

//     return {
//       success: true,
//       data: {
//         transaction_id: transaction?.id || "",
//         new_balance: newBalance,
//       },
//     };
//   } catch (error) {
//     console.error("WithdrawFunds Error:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }
