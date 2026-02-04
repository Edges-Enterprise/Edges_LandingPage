// app/actions/data.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetch Hot Deals from Supabase
 */
export async function getHotDealsAction(networkName: string) {
  try {
    const supabase = await createServerClient();

    // Hot deals table uses plan_type field (not category)
    const { data, error } = await supabase
      .from("hot_deals")
      .select("*")
      .ilike("plan_type", networkName) // MTN, AIRTEL, GLO, 9MOBILE
      .order("price", { ascending: true });

    if (error) {
      console.error("Hot deals fetch error:", error);
      return { error: "Failed to fetch hot deals", plans: [] };
    }

    return { success: true, plans: data || [] };
  } catch (error) {
    console.error("Get hot deals error:", error);
    return { error: "Something went wrong", plans: [] };
  }
}

/**
 * Fetch Data Plans from Lizzysub Table
 */
export async function getDataPlansAction(
  networkName: string,
  category?: string,
) {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("lizzy")
      .select("*")
      .ilike("network", networkName); // Case-insensitive match

    const { data, error } = await query.order("plan_amount", {
      ascending: true,
    });

    if (error) {
      console.error("Data plans fetch error:", error);
      return { error: "Failed to fetch data plans", plans: [] };
    }

    return { success: true, plans: data || [] };
  } catch (error) {
    console.error("Get data plans error:", error);
    return { error: "Something went wrong", plans: [] };
  }
}

/**
 * Purchase Data via Lizzysub API
 */
// export async function purchaseDataAction(formData: {
//   network: number;
//   phone: string;
//   data_plan: number;
//   planName: string;
//   amount: number;
//   validity: string;
//   pin: string;
// }) {
//   try {
//     const supabase = await createServerClient();

//     // 1. Get authenticated user
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // 2. Get user profile and email
//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("email, transaction_pin")
//       .eq("id", user.id)
//       .single();

//     if (profileError || !profile) {
//       return { error: "Profile not found" };
//     }

//     // 3. Verify PIN
//     if (!profile.transaction_pin) {
//       return { error: "Please create a transaction PIN first" };
//     }

//     if (formData.pin !== profile.transaction_pin) {
//       return { error: "Incorrect transaction PIN" };
//     }

//     // 4. Check wallet balance
//     const { data: wallet, error: walletError } = await supabase
//       .from("wallet")
//       .select("balance")
//       .eq("user_email", profile.email)
//       .single();

//     if (walletError || !wallet) {
//       return { error: "Wallet not found. Please fund your wallet first." };
//     }

//     const currentBalance = parseFloat(wallet.balance || "0");
//     if (currentBalance < formData.amount) {
//       return {
//         error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.amount.toLocaleString()}`,
//       };
//     }

//     // 5. Generate unique request ID
//     const requestId = `EDGESN_DATA_${Date.now()}_${Math.random()
//       .toString(36)
//       .substring(7)
//       .toUpperCase()}`;

//     // 6. Call Lizzysub API
//     const lizzysubPayload = {
//       network: formData.network,
//       phone: formData.phone,
//       data_plan: formData.data_plan,
//       bypass: false,
//       "request-id": requestId,
//     };

//     console.log("Calling Lizzysub API:", {
//       ...lizzysubPayload,
//       phone: formData.phone.slice(0, 4) + "***" + formData.phone.slice(-4),
//     });

//     const lizzysubResponse = await fetch("https://lizzysub.com/api/data", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Token ${process.env.NEXT_PUBLIC_LIZZYSUB_API_KEY}`,
//       },
//       body: JSON.stringify(lizzysubPayload),
//     });

//     const lizzysubData = await lizzysubResponse.json();

//     console.log("Lizzysub response:", {
//       status: lizzysubData.status,
//       message: lizzysubData.message?.slice(0, 50),
//     });

//     // 7. Handle API response
//     if (lizzysubData.status !== "success") {
//       // Create failed transaction record
//       await supabase.from("transactions").insert({
//         user_email: profile.email,
//         amount: formData.amount,
//         reference: requestId,
//         status: "failed",
//         type: "data_purchase",
//         env: "live",
//         metadata: {
//           network: lizzysubData.network || "Unknown",
//           phone_number: formData.phone,
//           plan_name: formData.planName,
//           validity: formData.validity,
//           error_message: lizzysubData.message,
//           lizzysub_plan_id: formData.data_plan,
//         },
//       });

//       return {
//         error: lizzysubData.message || "Transaction failed. Please try again.",
//       };
//     }

//     // 8. Deduct from wallet
//     const newBalance = currentBalance - formData.amount;
//     const { error: balanceError } = await supabase
//       .from("wallet")
//       .update({ balance: newBalance })
//       .eq("user_email", profile.email);

//     if (balanceError) {
//       console.error("Balance update error:", balanceError);
//       return { error: "Failed to update wallet balance" };
//     }

//     // 9. Create successful transaction record
//     await supabase.from("transactions").insert({
//       user_email: profile.email,
//       amount: formData.amount,
//       reference: requestId,
//       status: "completed",
//       type: "data_purchase",
//       env: "live",
//       metadata: {
//         network: lizzysubData.network,
//         phone_number: lizzysubData.phone_number,
//         plan_name: formData.planName,
//         dataplan: lizzysubData.dataplan,
//         validity: formData.validity,
//         system: lizzysubData.system,
//         plan_type: lizzysubData.plan_type,
//         oldbal: lizzysubData.oldbal,
//         newbal: lizzysubData.newbal,
//         api_message: lizzysubData.message,
//         lizzysub_plan_id: formData.data_plan,
//         wallet_vending: lizzysubData.wallet_vending,
//       },
//     });

//     // 10. Create notification
//     await supabase.from("notifications").insert({
//       user_id: user.id,
//       notification_type: "data_purchase",
//       message: `Successfully purchased ${
//         lizzysubData.dataplan || formData.planName
//       } for ${formData.phone}`,
//       is_read: false,
//       metadata: {
//         network: lizzysubData.network,
//         phone: formData.phone,
//         amount: formData.amount,
//         plan: lizzysubData.dataplan,
//         reference: requestId,
//       },
//     });

//     // 11. Revalidate pages
//     revalidatePath("/data");
//     revalidatePath("/wallet");
//     revalidatePath("/history");
//     revalidatePath("/home");

//     return {
//       success: true,
//       message: lizzysubData.message,
//       data: {
//         network: lizzysubData.network,
//         phone_number: lizzysubData.phone_number,
//         dataplan: lizzysubData.dataplan,
//         amount: formData.amount,
//         newBalance: newBalance,
//         reference: requestId,
//       },
//     };
//   } catch (error) {
//     console.error("Purchase data error:", error);
//     return { error: "Something went wrong. Please try again." };
//   }
// }

/**
 * Get User Wallet Balance for Data Page
 */
export async function getWalletBalanceForDataAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", balance: 0 };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { error: "Profile not found", balance: 0 };
    }

    const { data: wallet } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    return {
      success: true,
      balance: parseFloat(wallet?.balance || "0"),
    };
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return { error: "Failed to fetch balance", balance: 0 };
  }
}

/**
 * Check if user has transaction PIN
 */
export async function checkTransactionPinAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", hasPin: false };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("id", user.id)
      .single();

    const hasPin = !!(
      profile?.transaction_pin && profile.transaction_pin.trim() !== ""
    );

    return { success: true, hasPin };
  } catch (error) {
    console.error("Check PIN error:", error);
    return { error: "Failed to check PIN", hasPin: false };
  }
}

/**
 * Purchase Data via Lizzysub API
 */
export async function purchaseDataAction(formData: {
  network: number;
  phone: string;
  data_plan: number;
  planName: string;
  amount: number;
  validity: string;
  pin: string;
}) {
  try {
    const supabase = await createServerClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // 2. Get user profile and email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, transaction_pin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { error: "Profile not found" };
    }

    // 3. Verify PIN
    if (!profile.transaction_pin) {
      return { error: "Please create a transaction PIN first" };
    }

    if (formData.pin !== profile.transaction_pin) {
      return { error: "Incorrect transaction PIN" };
    }

    // 4. Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();

    if (walletError || !wallet) {
      return { error: "Wallet not found. Please fund your wallet first." };
    }

    const currentBalance = parseFloat(wallet.balance || "0");
    if (currentBalance < formData.amount) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.amount.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_DATA_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 6. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      network: formData.network,
      phone: formData.phone,
      data_plan: formData.data_plan,
      bypass: false,
      "request-id": requestId,
    };

    console.log("Calling Lizzysub Edge Function:", {
      ...lizzysubPayload,
      phone: formData.phone.slice(0, 4) + "***" + formData.phone.slice(-4),
    });

    // Call via Supabase Edge Function (token is handled server-side)
    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/lizzysub-proxy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzysubPayload),
      },
    );

    const lizzysubData = await lizzysubResponse.json();

    console.log("Lizzysub response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 7. Handle API response
    if (lizzysubData.status !== "success") {
      let userErrorMessage =
        lizzysubData.message || "Transaction failed. Please try again.";

      // Check for specific provider balance error and make it generic
      if (
        userErrorMessage.includes(
          "Insufficient Account Kindly Fund Your Wallet",
        )
      ) {
        userErrorMessage =
          "Service temporarily unavailable. Please try again later.";
      }
      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.amount,
        reference: requestId,
        status: "failed",
        type: "data_purchase",
        env: "live",
        metadata: {
          network: lizzysubData.network || "Unknown",
          phone_number: formData.phone,
          plan_name: formData.planName,
          validity: formData.validity,
          error_message: lizzysubData.message,
          lizzysub_plan_id: formData.data_plan,
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 8. Deduct from wallet
    const newBalance = currentBalance - formData.amount;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 9. Create successful transaction record
    await supabase.from("transactions").insert({
      user_email: profile.email,
      amount: formData.amount,
      reference: requestId,
      status: "completed",
      type: "data_purchase",
      env: "live",
      metadata: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        plan_name: formData.planName,
        dataplan: lizzysubData.dataplan,
        validity: formData.validity,
        system: lizzysubData.system,
        plan_type: lizzysubData.plan_type,
        oldbal: lizzysubData.oldbal,
        newbal: lizzysubData.newbal,
        api_message: lizzysubData.message,
        lizzysub_plan_id: formData.data_plan,
        wallet_vending: lizzysubData.wallet_vending,
      },
    });

    // 10. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "data_purchase",
      message: `Successfully purchased ${
        lizzysubData.dataplan || formData.planName
      } for ${formData.phone}`,
      is_read: false,
      metadata: {
        network: lizzysubData.network,
        phone: formData.phone,
        amount: formData.amount,
        plan: lizzysubData.dataplan,
        reference: requestId,
      },
    });

    // 11. Revalidate pages
    revalidatePath("/data");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        network: lizzysubData.network,
        phone_number: lizzysubData.phone_number,
        dataplan: lizzysubData.dataplan,
        amount: formData.amount,
        newBalance: newBalance,
        reference: requestId,
      },
    };
  } catch (error) {
    console.error("Purchase data error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get User Wallet Balance for Data Page
 */
// export async function getWalletBalanceForDataAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", balance: 0 };
//     }

//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("email")
//       .eq("id", user.id)
//       .single();

//     if (!profile) {
//       return { error: "Profile not found", balance: 0 };
//     }

//     const { data: wallet } = await supabase
//       .from("wallet")
//       .select("balance")
//       .eq("user_email", profile.email)
//       .single();

//     return {
//       success: true,
//       balance: parseFloat(wallet?.balance || "0"),
//     };
//   } catch (error) {
//     console.error("Get wallet balance error:", error);
//     return { error: "Failed to fetch balance", balance: 0 };
//   }
// }

/**
 * Check if user has transaction PIN
 */
// export async function checkTransactionPinAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", hasPin: false };
//     }

//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("transaction_pin")
//       .eq("id", user.id)
//       .single();

//     const hasPin = !!(
//       profile?.transaction_pin && profile.transaction_pin.trim() !== ""
//     );

//     return { success: true, hasPin };
//   } catch (error) {
//     console.error("Check PIN error:", error);
//     return { error: "Failed to check PIN", hasPin: false };
//   }
// }
