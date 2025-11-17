// app/actions/cable.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Validate IUC/Smart Card Number via Lizzysub API
 */
export async function validateIucAction(iuc: string, provider: string) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Map provider names to Lizzysub codes
    const cableMap: { [key: string]: string } = {
      DSTV: "dstv",
      GOTV: "gotv",
      STARTIMES: "startimes",
    };

    const cableCode = cableMap[provider.toUpperCase()];
    if (!cableCode) {
      return { error: "Invalid cable provider" };
    }

    console.log(`Validating IUC: ${iuc} for ${provider}`);

    // Call Supabase Edge Function for IUC validation
    const response = await fetch(
      `https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-validation?iuc=${iuc}&cable=${cableCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();

    console.log("IUC validation response:", data);

    if (data.status === "success" && data.customer) {
      return {
        success: true,
        customerName: data.customer,
        message: "IUC verified successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || "Invalid IUC number",
      };
    }
  } catch (error) {
    console.error("IUC validation error:", error);
    return { error: "Failed to validate IUC. Please try again." };
  }
}

/**
 * Purchase Cable TV Subscription via Lizzysub API
 */
export async function purchaseCableAction(formData: {
  provider: string;
  iuc: string;
  planId: string;
  planName: string;
  price: number;
  pin: string;
  bypass: boolean;
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

    // 2. Get user profile
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
    if (currentBalance < formData.price) {
      return {
        error: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${formData.price.toLocaleString()}`,
      };
    }

    // 5. Generate unique request ID
    const requestId = `EDGESN_CABLE_WEB_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)
      .toUpperCase()}`;

    // 6. Map provider to Lizzysub cable code
    const cableMap: { [key: string]: string } = {
      DSTV: "dstv",
      GOTV: "gotv",
      STARTIMES: "startimes",
    };

    const cableCode = cableMap[formData.provider.toUpperCase()];
    if (!cableCode) {
      return { error: "Invalid cable provider" };
    }

    // 7. Call Lizzysub API via Supabase Edge Function
    const lizzysubPayload = {
      cable: cableCode,
      iuc: formData.iuc,
      cable_plan: formData.planId,
      bypass: formData.bypass,
      requestId: requestId,
    };

    console.log("Calling Lizzysub Cable API:", {
      ...lizzysubPayload,
      iuc: formData.iuc.slice(0, 4) + "***" + formData.iuc.slice(-4),
    });

    const lizzysubResponse = await fetch(
      "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-proxy",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(lizzysubPayload),
      }
    );

    const lizzysubData = await lizzysubResponse.json();

    console.log("Lizzysub cable response:", {
      status: lizzysubData.status,
      message: lizzysubData.message?.slice(0, 50),
    });

    // 8. Handle API response
    if (lizzysubData.status !== "success") {
      // Create failed transaction record
      await supabase.from("transactions").insert({
        user_email: profile.email,
        amount: formData.price,
        reference: requestId,
        status: "failed",
        type: "cable_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          iuc: formData.iuc,
          plan_name: formData.planName,
          plan_id: formData.planId,
          error_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      });

      return {
        error: lizzysubData.message || "Transaction failed. Please try again.",
      };
    }

    // 9. Deduct from wallet
    const newBalance = currentBalance - formData.price;
    const { error: balanceError } = await supabase
      .from("wallet")
      .update({ balance: newBalance })
      .eq("user_email", profile.email);

    if (balanceError) {
      console.error("Balance update error:", balanceError);
      return { error: "Failed to update wallet balance" };
    }

    // 10. Create successful transaction record
    const { data: transaction } = await supabase
      .from("transactions")
      .insert({
        user_email: profile.email,
        amount: -formData.price, // Negative for outflow
        reference: requestId,
        status: "completed",
        type: "cable_purchase",
        env: "live",
        metadata: {
          provider: formData.provider,
          iuc: formData.iuc,
          plan_name: formData.planName,
          plan_id: formData.planId,
          api_message: lizzysubData.message,
          api_provider: "lizzysub",
        },
      })
      .select()
      .single();

    // 11. Create cable_purchases record (for specific tracking)
    await supabase.from("cable_purchases").insert({
      user_id: user.id,
      provider: formData.provider,
      plan_name: formData.planName,
      amount: formData.price,
    });

    // 12. Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "cable_purchase",
      message: `Successfully subscribed to ${formData.planName} for ${
        formData.iuc
      }. Charged: ₦${formData.price.toLocaleString()}`,
      is_read: false,
      metadata: {
        provider: formData.provider,
        iuc: formData.iuc,
        plan_name: formData.planName,
        amount: formData.price,
        reference: requestId,
      },
    });

    // 13. Revalidate pages
    revalidatePath("/cable");
    revalidatePath("/wallet");
    revalidatePath("/history");
    revalidatePath("/home");

    return {
      success: true,
      message: lizzysubData.message,
      data: {
        provider: formData.provider,
        iuc: formData.iuc,
        plan_name: formData.planName,
        amount: formData.price,
        newBalance: newBalance,
        reference: requestId,
        transaction_id: transaction?.id,
      },
    };
  } catch (error) {
    console.error("Purchase cable error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Get Cable Plans from Supabase
 */
export async function getCablePlansAction(provider: string) {
  try {
    const supabase = await createServerClient();

    const { data: plans, error } = await supabase
      .from("cable_plans")
      .select("*")
      .eq("provider", provider.toUpperCase())
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching cable plans:", error);
      return { error: "Failed to fetch plans" };
    }

    return { success: true, plans: plans || [] };
  } catch (error) {
    console.error("Get cable plans error:", error);
    return { error: "Failed to fetch plans" };
  }
}

// // app/actions/cable.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// /**
//  * Validate Cable IUC via Lizzysub API
//  */
// export async function validateCableIUCAction(formData: FormData): Promise<{
//   success: boolean;
//   data?: { customer_name: string };
//   error?: string;
// }> {
//   try {
//     const supabase = await createServerClient();
//     const iuc = formData.get("iuc") as string;
//     const cableApiId = parseInt(formData.get("cableApiId") as string);

//     if (!iuc || !cableApiId) {
//       return { success: false, error: "Missing IUC or cable provider" };
//     }

//     // 1. Get authenticated user
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return { success: false, error: "Unauthorized" };
//     }

//     console.log("Calling Lizzysub Cable Validation Edge Function:", {
//       iuc,
//       cableApiId,
//     });

//     // ✅ FIX: Use environment variable
//     const edgeUrl = new URL(
//       `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cable-validation`
//     );
//     edgeUrl.searchParams.set("iuc", iuc);
//     edgeUrl.searchParams.set("cable", cableApiId.toString());

//     const lizzysubResponse = await fetch(edgeUrl.toString(), {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
//       },
//     });

//     const lizzysubData = await lizzysubResponse.json();

//     console.log("Lizzysub validation response:", {
//       status: lizzysubData.status,
//       message: lizzysubData.message?.slice(0, 50),
//     });

//     if (lizzysubData.status !== "success") {
//       return { success: false, error: lizzysubData.message || "Invalid IUC" };
//     }

//     return {
//       success: true,
//       data: { customer_name: lizzysubData.customer_name || "Verified" },
//     };
//   } catch (error) {
//     console.error("Validate Cable IUC error:", error);
//     return { success: false, error: "Validation failed. Please try again." };
//   }
// }

// /**
//  * Purchase Cable Subscription via Lizzysub API
//  */
// export async function purchaseCableAction(formData: FormData): Promise<{
//   success: boolean;
//   message: string;
//   data?: {
//     reference: string;
//     amount: number;
//     plan_name: string;
//     iuc: string;
//     newBalance: number;
//   };
//   error?: string;
// }> {
//   try {
//     const supabase = await createServerClient();

//     // 1. Get authenticated user
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();
//     if (authError || !user) {
//       return {
//         success: false,
//         message: "Unauthorized",
//         error: "User not authenticated",
//       };
//     }

//     // 2. Get user profile and email
//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("email, transaction_pin")
//       .eq("id", user.id)
//       .single();

//     if (profileError || !profile) {
//       return {
//         success: false,
//         message: "Profile not found",
//         error: "Profile error",
//       };
//     }

//     // 3. Extract form data
//     const iuc = formData.get("iuc") as string;
//     const cableApiId = parseInt(formData.get("cableApiId") as string);
//     const cablePlanId = formData.get("cablePlanId") as string;
//     const pin = formData.get("pin") as string;
//     const bypass = formData.get("bypass") === "true";
//     const amount = parseFloat(formData.get("amount") as string);

//     if (!iuc || !cableApiId || !cablePlanId || !pin || !amount) {
//       return {
//         success: false,
//         message: "Missing required fields",
//         error: "Invalid input",
//       };
//     }

//     // 4. Verify PIN
//     if (!profile.transaction_pin || profile.transaction_pin.trim() === "") {
//       return {
//         success: false,
//         message: "Please create a transaction PIN first",
//         error: "No PIN",
//       };
//     }

//     if (pin !== profile.transaction_pin) {
//       return {
//         success: false,
//         message: "Incorrect transaction PIN",
//         error: "PIN mismatch",
//       };
//     }

//     // 5. Check wallet balance
//     const { data: wallet, error: walletError } = await supabase
//       .from("wallet")
//       .select("balance")
//       .eq("user_email", profile.email)
//       .single();

//     if (walletError || !wallet) {
//       return {
//         success: false,
//         message: "Wallet not found. Please fund your wallet first.",
//         error: "Wallet error",
//       };
//     }

//     const currentBalance = parseFloat(wallet.balance || "0");
//     if (currentBalance < amount) {
//       return {
//         success: false,
//         message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${amount.toLocaleString()}`,
//         error: "Low funds",
//       };
//     }

//     // 6. Generate unique request ID
//     const requestId = `EDGESN_CABLE_WEB_${Date.now()}_${Math.random()
//       .toString(36)
//       .substring(7)
//       .toUpperCase()}`;

//     // 7. Call Lizzysub API via Supabase Edge Function
//     const lizzysubPayload = {
//       cable: cableApiId,
//       iuc,
//       cable_plan: cablePlanId,
//       bypass,
//       requestId, // ✅ FIX: Changed from "request-id" to match edge function
//     };

//     console.log(
//       "Calling Lizzysub Cable Purchase Edge Function:",
//       lizzysubPayload
//     );

//     // ✅ FIX: Use environment variable
//     const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cable-proxy`;

//     const lizzysubResponse = await fetch(edgeFunctionUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
//       },
//       body: JSON.stringify(lizzysubPayload),
//     });

//     const lizzysubData = await lizzysubResponse.json();

//     console.log("Lizzysub response:", {
//       status: lizzysubData.status,
//       message: lizzysubData.message?.slice(0, 50),
//     });

//     // 8. Handle API response
//     if (lizzysubData.status !== "success") {
//       // Create failed transaction record
//       await supabase.from("transactions").insert({
//         user_email: profile.email,
//         amount,
//         reference: requestId,
//         status: "failed",
//         type: "cable_purchase",
//         env: "live",
//         metadata: {
//           cable_id: cableApiId,
//           cable_plan_id: cablePlanId,
//           iuc,
//           amount,
//           error_message: lizzysubData.message,
//           provider: "lizzysub",
//         },
//       });

//       return {
//         success: false,
//         message:
//           lizzysubData.message || "Transaction failed. Please try again.",
//         error: "API failure",
//       };
//     }

//     // 9. Deduct from wallet
//     const newBalance = currentBalance - amount;
//     const { error: balanceError } = await supabase
//       .from("wallet")
//       .update({ balance: newBalance })
//       .eq("user_email", profile.email);

//     if (balanceError) {
//       console.error("Balance update error:", balanceError);
//       return {
//         success: false,
//         message: "Failed to update wallet balance",
//         error: "Balance update failed",
//       };
//     }

//     // 10. Create successful transaction record
//     const reference = lizzysubData["request-id"] || requestId;
//     await supabase.from("transactions").insert({
//       user_email: profile.email,
//       amount: -amount, // Negative for outflow
//       reference,
//       status: "completed",
//       type: "cable_purchase",
//       env: "live",
//       metadata: {
//         cable_id: cableApiId,
//         cable_plan_id: cablePlanId,
//         iuc,
//         amount,
//         plan_name: lizzysubData.plan_name || "Cable Plan",
//         api_message: lizzysubData.message,
//         provider: "lizzysub",
//         lizzy_response: lizzysubData,
//       },
//     });

//     // 11. Create notification
//     await supabase.from("notifications").insert({
//       user_id: user.id,
//       notification_type: "cable_purchase",
//       message: `Successfully purchased cable subscription: ${
//         lizzysubData.plan_name || "Plan"
//       } for ₦${amount.toLocaleString()}.`,
//       is_read: false,
//       metadata: {
//         cable_id: cableApiId,
//         cable_plan_id: cablePlanId,
//         iuc,
//         amount,
//         plan_name: lizzysubData.plan_name || "Cable Plan",
//         reference,
//       },
//     });

//     // 12. Revalidate pages
//     revalidatePath("/cable");
//     revalidatePath("/wallet");
//     revalidatePath("/history");
//     revalidatePath("/home");

//     return {
//       success: true,
//       message: lizzysubData.message || "Purchase successful!",
//       data: {
//         reference,
//         amount,
//         plan_name: lizzysubData.plan_name || "Cable Plan",
//         iuc,
//         newBalance,
//       },
//     };
//   } catch (error) {
//     console.error("Purchase cable error:", error);
//     return {
//       success: false,
//       message: "Something went wrong. Please try again.",
//       error: "Server error",
//     };
//   }
// }

// /**
//  * Get User Wallet Balance for Cable Page
//  */
// export async function getWalletBalanceForCableAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { success: false, error: "Unauthorized", balance: 0 };
//     }

//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("email")
//       .eq("id", user.id)
//       .single();

//     if (!profile) {
//       return { success: false, error: "Profile not found", balance: 0 };
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
//     return { success: false, error: "Failed to fetch balance", balance: 0 };
//   }
// }

// /**
//  * Check if user has transaction PIN
//  */
// export async function checkTransactionPinAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { success: false, error: "Unauthorized", hasPin: false };
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
//     return { success: false, error: "Failed to check PIN", hasPin: false };
//   }
// }

// // // app/actions/cable.ts

// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import { revalidatePath } from "next/cache";

// // /**
// //  * Validate Cable IUC via Lizzysub API
// //  */
// // export async function validateCableIUCAction(formData: FormData): Promise<{
// //   success: boolean;
// //   data?: { customer_name: string };
// //   error?: string;
// // }> {
// //   try {
// //     const supabase = await createServerClient();
// //     const iuc = formData.get("iuc") as string;
// //     const cableApiId = parseInt(formData.get("cableApiId") as string);

// //     if (!iuc || !cableApiId) {
// //       return { success: false, error: "Missing IUC or cable provider" };
// //     }

// //     // 1. Get authenticated user
// //     const {
// //       data: { user },
// //       error: authError,
// //     } = await supabase.auth.getUser();
// //     if (authError || !user) {
// //       return { success: false, error: "Unauthorized" };
// //     }

// //     console.log("Calling Lizzysub Cable Validation Edge Function:", {
// //       iuc,
// //       cableApiId,
// //     });

// //     // Call via Supabase Edge Function
// //     const edgeUrl = new URL(
// //       `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cable-validation`
// //     );
// //     edgeUrl.searchParams.set("iuc", iuc);
// //     edgeUrl.searchParams.set("cable", cableApiId.toString());

// //     const lizzysubResponse = await fetch(edgeUrl.toString(), {
// //       method: "GET",
// //       headers: {
// //         Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
// //       },
// //     });

// //     const lizzysubData = await lizzysubResponse.json();

// //     console.log("Lizzysub validation response:", {
// //       status: lizzysubData.status,
// //       message: lizzysubData.message?.slice(0, 50),
// //     });

// //     if (lizzysubData.status !== "success") {
// //       return { success: false, error: lizzysubData.message || "Invalid IUC" };
// //     }

// //     return {
// //       success: true,
// //       data: { customer_name: lizzysubData.customer_name || "Verified" },
// //     };
// //   } catch (error) {
// //     console.error("Validate Cable IUC error:", error);
// //     return { success: false, error: "Validation failed. Please try again." };
// //   }
// // }

// // /**
// //  * Purchase Cable Subscription via Lizzysub API
// //  */
// // export async function purchaseCableAction(formData: FormData): Promise<{
// //   success: boolean;
// //   message: string;
// //   data?: {
// //     reference: string;
// //     amount: number;
// //     plan_name: string;
// //     iuc: string;
// //     newBalance: number;
// //   };
// //   error?: string;
// // }> {
// //   try {
// //     const supabase = await createServerClient();

// //     // 1. Get authenticated user
// //     const {
// //       data: { user },
// //       error: authError,
// //     } = await supabase.auth.getUser();
// //     if (authError || !user) {
// //       return {
// //         success: false,
// //         message: "Unauthorized",
// //         error: "User not authenticated",
// //       };
// //     }

// //     // 2. Get user profile and email
// //     const { data: profile, error: profileError } = await supabase
// //       .from("profiles")
// //       .select("email, transaction_pin")
// //       .eq("id", user.id)
// //       .single();

// //     if (profileError || !profile) {
// //       return {
// //         success: false,
// //         message: "Profile not found",
// //         error: "Profile error",
// //       };
// //     }

// //     // 3. Extract form data
// //     const iuc = formData.get("iuc") as string;
// //     const cableApiId = parseInt(formData.get("cableApiId") as string);
// //     const cablePlanId = formData.get("cablePlanId") as string;
// //     const pin = formData.get("pin") as string;
// //     const bypass = formData.get("bypass") === "true";
// //     const amount = parseFloat(formData.get("amount") as string);

// //     if (!iuc || !cableApiId || !cablePlanId || !pin || !amount) {
// //       return {
// //         success: false,
// //         message: "Missing required fields",
// //         error: "Invalid input",
// //       };
// //     }

// //     // 4. Verify PIN
// //     if (!profile.transaction_pin) {
// //       return {
// //         success: false,
// //         message: "Please create a transaction PIN first",
// //         error: "No PIN",
// //       };
// //     }

// //     if (pin !== profile.transaction_pin) {
// //       return {
// //         success: false,
// //         message: "Incorrect transaction PIN",
// //         error: "PIN mismatch",
// //       };
// //     }

// //     // 5. Check wallet balance
// //     const { data: wallet, error: walletError } = await supabase
// //       .from("wallet")
// //       .select("balance")
// //       .eq("user_email", profile.email)
// //       .single();

// //     if (walletError || !wallet) {
// //       return {
// //         success: false,
// //         message: "Wallet not found. Please fund your wallet first.",
// //         error: "Wallet error",
// //       };
// //     }

// //     const currentBalance = parseFloat(wallet.balance || "0");
// //     if (currentBalance < amount) {
// //       return {
// //         success: false,
// //         message: `Insufficient balance. You have ₦${currentBalance.toLocaleString()}, but need ₦${amount.toLocaleString()}`,
// //         error: "Low funds",
// //       };
// //     }

// //     // 6. Generate unique request ID
// //     const requestId = `EDGESN_CABLE_WEB_${Date.now()}_${Math.random()
// //       .toString(36)
// //       .substring(7)
// //       .toUpperCase()}`;

// //     // 7. Call Lizzysub API via Supabase Edge Function
// //     const lizzysubPayload = {
// //       cable: cableApiId,
// //       iuc,
// //       cable_plan: cablePlanId,
// //       bypass,
// //       "request-id": requestId,
// //     };

// //     console.log(
// //       "Calling Lizzysub Cable Purchase Edge Function:",
// //       lizzysubPayload
// //     );

// //     // Call via Supabase Edge Function
// //     const lizzysubResponse = await fetch(
// //       "https://jjyyfaxcwanrmiipzkoj.supabase.co/functions/v1/cable-proxy",
// //       {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
// //         },
// //         body: JSON.stringify(lizzysubPayload),
// //       }
// //     );

// //     const lizzysubData = await lizzysubResponse.json();

// //     console.log("Lizzysub response:", {
// //       status: lizzysubData.status,
// //       message: lizzysubData.message?.slice(0, 50),
// //     });

// //     // 8. Handle API response
// //     if (lizzysubData.status !== "success") {
// //       // Create failed transaction record
// //       await supabase.from("transactions").insert({
// //         user_email: profile.email,
// //         amount,
// //         reference: requestId,
// //         status: "failed",
// //         type: "cable_purchase",
// //         env: "live",
// //         metadata: {
// //           cable_id: cableApiId,
// //           cable_plan_id: cablePlanId,
// //           iuc,
// //           amount,
// //           error_message: lizzysubData.message,
// //           provider: "lizzysub",
// //         },
// //       });

// //       return {
// //         success: false,
// //         message:
// //           lizzysubData.message || "Transaction failed. Please try again.",
// //         error: "API failure",
// //       };
// //     }

// //     // 9. Deduct from wallet
// //     const newBalance = currentBalance - amount;
// //     const { error: balanceError } = await supabase
// //       .from("wallet")
// //       .update({ balance: newBalance })
// //       .eq("user_email", profile.email);

// //     if (balanceError) {
// //       console.error("Balance update error:", balanceError);
// //       return {
// //         success: false,
// //         message: "Failed to update wallet balance",
// //         error: "Balance update failed",
// //       };
// //     }

// //     // 10. Create successful transaction record
// //     const reference = lizzysubData["request-id"] || requestId;
// //     await supabase.from("transactions").insert({
// //       user_email: profile.email,
// //       amount: -amount, // Negative for outflow
// //       reference,
// //       status: "completed",
// //       type: "cable_purchase",
// //       env: "live",
// //       metadata: {
// //         cable_id: cableApiId,
// //         cable_plan_id: cablePlanId,
// //         iuc,
// //         amount,
// //         plan_name: lizzysubData.plan_name || "Cable Plan",
// //         api_message: lizzysubData.message,
// //         provider: "lizzysub",
// //         lizzy_response: lizzysubData,
// //       },
// //     });

// //     // 11. Create notification
// //     await supabase.from("notifications").insert({
// //       user_id: user.id,
// //       notification_type: "cable_purchase",
// //       message: `Successfully purchased cable subscription: ${
// //         lizzysubData.plan_name || "Plan"
// //       } for ₦${amount.toLocaleString()}.`,
// //       is_read: false,
// //       metadata: {
// //         cable_id: cableApiId,
// //         cable_plan_id: cablePlanId,
// //         iuc,
// //         amount,
// //         plan_name: lizzysubData.plan_name || "Cable Plan",
// //         reference,
// //       },
// //     });

// //     // 12. Revalidate pages
// //     revalidatePath("/cable");
// //     revalidatePath("/wallet");
// //     revalidatePath("/history");
// //     revalidatePath("/home");

// //     return {
// //       success: true,
// //       message: lizzysubData.message || "Purchase successful!",
// //       data: {
// //         reference,
// //         amount,
// //         plan_name: lizzysubData.plan_name || "Cable Plan",
// //         iuc,
// //         newBalance,
// //       },
// //     };
// //   } catch (error) {
// //     console.error("Purchase cable error:", error);
// //     return {
// //       success: false,
// //       message: "Something went wrong. Please try again.",
// //       error: "Server error",
// //     };
// //   }
// // }

// // /**
// //  * Get User Wallet Balance for Cable Page
// //  */
// // export async function getWalletBalanceForCableAction() {
// //   try {
// //     const supabase = await createServerClient();
// //     const {
// //       data: { user },
// //       error: authError,
// //     } = await supabase.auth.getUser();

// //     if (authError || !user) {
// //       return { success: false, error: "Unauthorized", balance: 0 };
// //     }

// //     const { data: profile } = await supabase
// //       .from("profiles")
// //       .select("email")
// //       .eq("id", user.id)
// //       .single();

// //     if (!profile) {
// //       return { success: false, error: "Profile not found", balance: 0 };
// //     }

// //     const { data: wallet } = await supabase
// //       .from("wallet")
// //       .select("balance")
// //       .eq("user_email", profile.email)
// //       .single();

// //     return {
// //       success: true,
// //       balance: parseFloat(wallet?.balance || "0"),
// //     };
// //   } catch (error) {
// //     console.error("Get wallet balance error:", error);
// //     return { success: false, error: "Failed to fetch balance", balance: 0 };
// //   }
// // }

// // /**
// //  * Check if user has transaction PIN
// //  */
// // export async function checkTransactionPinAction() {
// //   try {
// //     const supabase = await createServerClient();
// //     const {
// //       data: { user },
// //       error: authError,
// //     } = await supabase.auth.getUser();

// //     if (authError || !user) {
// //       return { success: false, error: "Unauthorized", hasPin: false };
// //     }

// //     const { data: profile } = await supabase
// //       .from("profiles")
// //       .select("transaction_pin")
// //       .eq("id", user.id)
// //       .single();

// //     const hasPin = !!(
// //       profile?.transaction_pin && profile.transaction_pin.trim() !== ""
// //     );

// //     return { success: true, hasPin };
// //   } catch (error) {
// //     console.error("Check PIN error:", error);
// //     return { success: false, error: "Failed to check PIN", hasPin: false };
// //   }
// // }
