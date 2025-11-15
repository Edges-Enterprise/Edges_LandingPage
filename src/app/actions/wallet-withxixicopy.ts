// app/actions/wallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Create Transaction PIN
 */
export async function createTransactionPinAction(pin: string) {
  try {
    if (!/^\d{4,6}$/.test(pin)) {
      return { error: "PIN must be 4-6 digits" };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ transaction_pin: pin })
      .eq("id", user.id);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return { error: "Failed to save PIN" };
    }

    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error("Create PIN error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Verify Transaction PIN
 */
export async function verifyTransactionPinAction(pin: string) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", valid: false };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.transaction_pin) {
      return { error: "PIN not set", valid: false };
    }

    const isValid = pin === profile.transaction_pin;

    if (!isValid) {
      return { error: "Incorrect PIN", valid: false };
    }

    return { success: true, valid: true };
  } catch (error) {
    console.error("Verify PIN error:", error);
    return { error: "Something went wrong", valid: false };
  }
}

/**
 * Get Wallet Balance
 */
export async function getWalletBalanceAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", balance: 0 };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Wallet balance error:", profileError);
      return { error: "Failed to fetch balance", balance: 0 };
    }

    return { success: true, balance: profile.wallet_balance || 0 };
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return { error: "Something went wrong", balance: 0 };
  }
}

/**
 * Update Transaction PIN
 */
export async function updateTransactionPinAction(
  currentPin: string,
  newPin: string
) {
  try {
    if (!/^\d{4,6}$/.test(newPin)) {
      return { error: "New PIN must be 4-6 digits" };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const verifyResult = await verifyTransactionPinAction(currentPin);
    if (!verifyResult.valid) {
      return { error: "Current PIN is incorrect" };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ transaction_pin: newPin })
      .eq("id", user.id);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return { error: "Failed to update PIN" };
    }

    revalidatePath("/changepin");
    return { success: true };
  } catch (error) {
    console.error("Update PIN error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Create Virtual Account via XixaPay
 */
export async function createVirtualAccountXixaPayAction(formData: {
  email: string;
  name: string;
  phoneNumber: string;
  bvn?: string;
  nin?: string;
}) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Validate required fields
    if (!formData.name || !formData.phoneNumber) {
      return { error: "Name and phone number are required" };
    }

    // Must have either BVN or NIN for static accounts
    if (!formData.bvn && !formData.nin) {
      return { error: "Either BVN or NIN is required" };
    }

    // Check if user already has virtual accounts
    const { data: existing } = await supabase
      .from("virtual_accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { error: "You already have virtual accounts" };
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_XIXAPAY_API_KEY) {
      console.error("XIXAPAY_API_KEY not set");
      return {
        error: "XixaPay configuration missing. Please contact support.",
      };
    }

    if (!process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY) {
      console.error("XIXAPAY_SECRET_KEY not set");
      return {
        error: "XixaPay configuration missing. Please contact support.",
      };
    }

    if (!process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID) {
      console.error("XIXAPAY_BUSINESS_ID not set");
      return {
        error: "XixaPay configuration missing. Please contact support.",
      };
    }

    // Get username for custom account name
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = profile?.username || formData.name.split(" ")[0];

    // Prepare XixaPay request payload
    const xixapayPayload = {
      email: formData.email,
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      bankCode: ["20867"], // Palmpay, KOLOMONI MFB, Safehaven
      businessId: process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID!,
      accountType: "static",
      id_type: formData.bvn ? "bvn" : "nin",
      id_number: formData.bvn || formData.nin,
    };

    console.log("Creating XixaPay virtual account:", {
      ...xixapayPayload,
      id_number: "***",
    });

    // Call XixaPay API
    const xixapayResponse = await fetch(
      "https://api.xixapay.com/api/v1/createVirtualAccount",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env
            .NEXT_PUBLIC_XIXAPAY_SECRET_KEY!}`,
          "api-key": process.env.NEXT_PUBLIC_XIXAPAY_API_KEY!,
        },
        body: JSON.stringify(xixapayPayload),
      }
    );

    const xixapayData = await xixapayResponse.json();

    console.log("XixaPay response:", {
      status: xixapayData.status,
      message: xixapayData.message,
      accountsCount: xixapayData.bankAccounts?.length,
    });

    // Check for API errors
    if (!xixapayResponse.ok || xixapayData.status !== "success") {
      console.error("XixaPay error:", xixapayData);
      return {
        error: xixapayData.message || "Failed to create virtual account",
      };
    }

    const bankAccounts = xixapayData.bankAccounts || [];

    if (bankAccounts.length === 0) {
      return { error: "No virtual accounts were created" };
    }

    // Store virtual accounts in database
    const accountRecords = bankAccounts.map((bank: any) => ({
      user_id: user.id,
      bank_name: bank.bankName,
      account_number: bank.accountNumber,
      account_name: bank.accountName,
      account_type: bank.accountType || "static",
      tracking_reference: bank.Reserved_Account_Id,
      expire_date: null,
      provider: "xixapay",
      // Store customer information
      customer_email: formData.email,
      customer_name: formData.name,
      customer_phone: formData.phoneNumber,
      customer_bvn: formData.bvn || null,
      customer_nin: formData.nin || null,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("virtual_accounts")
      .insert(accountRecords);

    if (insertError) {
      console.error("Insert error:", insertError);
      return { error: "Failed to save virtual accounts" };
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "deposit",
      message: `Virtual accounts created successfully! You can now fund your wallet via bank transfer.`,
      is_read: false,
      metadata: {
        accounts_count: bankAccounts.length,
        banks: bankAccounts.map((b: any) => b.bankName).join(", "),
        provider: "xixapay",
      },
    });

    revalidatePath("/wallet");
    revalidatePath("/home");

    return {
      success: true,
      accounts: bankAccounts.map((bank: any) => ({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      })),
      message: `${bankAccounts.length} virtual accounts created successfully via XixaPay!`,
    };
  } catch (error) {
    console.error("Create XixaPay virtual account error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Create Virtual Account via PayVessel (existing implementation)
 */
export async function createVirtualAccountPayVesselAction(formData: {
  email: string;
  name: string;
  phoneNumber: string;
  bvn?: string;
  nin?: string;
}) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Validate required fields
    if (!formData.name || !formData.phoneNumber) {
      return { error: "Name and phone number are required" };
    }

    // Must have either BVN or NIN
    if (!formData.bvn && !formData.nin) {
      return { error: "Either BVN or NIN is required" };
    }

    // Check if user already has virtual accounts
    const { data: existing } = await supabase
      .from("virtual_accounts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { error: "You already have virtual accounts" };
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_PAYVESSEL_API_KEY) {
      console.error("PAYVESSEL_API_KEY not set");
      return {
        error: "PayVessel configuration missing. Please contact support.",
      };
    }

    if (!process.env.NEXT_PUBLIC_PAYVESSEL_SECRET_KEY) {
      console.error("PAYVESSEL_API_SECRET not set");
      return {
        error: "PayVessel configuration missing. Please contact support.",
      };
    }

    if (!process.env.NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID) {
      console.error("PAYVESSEL_BUSINESS_ID not set");
      return {
        error: "PayVessel configuration missing. Please contact support.",
      };
    }


    // Prepare PayVessel request
    const payvesselPayload = {
      email: formData.email,
      name: formData.name,
      phoneNumber: formData.phoneNumber,
      bankcode: ["999991"], // PalmPay 
      account_type: "STATIC",
      businessid: process.env.NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID!,
      ...(formData.bvn && { bvn: formData.bvn }),
      ...(formData.nin && { nin: formData.nin }),
    };

    console.log("Creating PayVessel virtual account:", {
      ...payvesselPayload,
      bvn: formData.bvn ? "***" : undefined,
      nin: formData.nin ? "***" : undefined,
    });

    // Call PayVessel API
    const payvesselResponse = await fetch(
      "https://api.payvessel.com/pms/api/external/request/customerReservedAccount/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.NEXT_PUBLIC_PAYVESSEL_API_KEY!,
          "api-secret": `Bearer ${process.env
            .NEXT_PUBLIC_PAYVESSEL_SECRET_KEY!}`,
        },
        body: JSON.stringify(payvesselPayload),
      }
    );

    const payvesselData = await payvesselResponse.json();

    console.log("PayVessel response:", {
      status: payvesselData.status,
      success: payvesselData.success,
      message: payvesselData.message,
      banksCount: payvesselData.banks?.length,
    });

    // Check for API key errors
    if (payvesselData.message?.includes("Invalid API Key")) {
      console.error("PayVessel API Key is invalid!");
      return {
        error: "Payment provider configuration error. Please contact support.",
      };
    }

    if (!payvesselResponse.ok || !payvesselData.status) {
      console.error("PayVessel error:", payvesselData);
      return {
        error: payvesselData.message || "Failed to create virtual account",
      };
    }

    const banks = payvesselData.banks || [];

    if (banks.length === 0) {
      return { error: "No virtual accounts were created" };
    }

    // Store virtual accounts in database
    const accountRecords = banks.map((bank: any) => ({
      user_id: user.id,
      bank_name: bank.bankName,
      account_number: bank.accountNumber,
      account_name: bank.accountName,
      account_type: bank.account_type || "STATIC",
      tracking_reference: bank.trackingReference,
      expire_date: bank.expire_date || null,
      provider: "payvessel",
      customer_email: formData.email,
      customer_name: formData.name,
      customer_phone: formData.phoneNumber,
      customer_bvn: formData.bvn || null,
      customer_nin: formData.nin || null,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("virtual_accounts")
      .insert(accountRecords);

    if (insertError) {
      console.error("Insert error:", insertError);
      return { error: "Failed to save virtual accounts" };
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      notification_type: "deposit",
      message: `Virtual accounts created successfully! You can now fund your wallet via bank transfer.`,
      is_read: false,
      metadata: {
        accounts_count: banks.length,
        banks: banks.map((b: any) => b.bankName).join(", "),
        provider: "payvessel",
      },
    });

    revalidatePath("/wallet");
    revalidatePath("/home");

    return {
      success: true,
      accounts: banks.map((bank: any) => ({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      })),
      message: `${banks.length} virtual accounts created successfully via PayVessel!`,
    };
  } catch (error) {
    console.error("Create PayVessel virtual account error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Unified function that tries both providers
 * First tries XixaPay, falls back to PayVessel if needed
 */
export async function createVirtualAccountAction(formData: {
  email: string;
  name: string;
  phoneNumber: string;
  bvn?: string;
  nin?: string;
  provider?: "xixapay" | "payvessel" | "auto";
}) {
  const preferredProvider = formData.provider || "auto";

  // If auto or xixapay preferred, try XixaPay first
  if (preferredProvider === "auto" || preferredProvider === "xixapay") {
    const xixapayResult = await createVirtualAccountXixaPayAction(formData);

    if (xixapayResult.success) {
      return xixapayResult;
    }

    console.log("XixaPay failed, trying PayVessel:", xixapayResult.error);
  }

  // Try PayVessel (either as fallback or as preferred)
  if (preferredProvider === "auto" || preferredProvider === "payvessel") {
    return await createVirtualAccountPayVesselAction(formData);
  }

  return { error: "Invalid provider specified" };
}

// // // app/actions/wallet.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// /**
//  * Create Transaction PIN
//  * Stores the PIN as plain text (not secure, only for dev/testing)
//  */
// export async function createTransactionPinAction(pin: string) {
//   try {
//     // Validate PIN format
//     if (!/^\d{4,6}$/.test(pin)) {
//       return { error: "PIN must be 4-6 digits" };
//     }

//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Update profile with plain PIN
//     const { error: updateError } = await supabase
//       .from("profiles")
//       .update({ transaction_pin: pin })
//       .eq("id", user.id);

//     if (updateError) {
//       console.error("PIN update error:", updateError);
//       return { error: "Failed to save PIN" };
//     }

//     revalidatePath("/home");
//     return { success: true };
//   } catch (error) {
//     console.error("Create PIN error:", error);
//     return { error: "Something went wrong" };
//   }
// }

// /**
//  * Verify Transaction PIN
//  */
// export async function verifyTransactionPinAction(pin: string) {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", valid: false };
//     }

//     // Fetch stored PIN
//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("transaction_pin")
//       .eq("id", user.id)
//       .single();

//     if (profileError || !profile?.transaction_pin) {
//       return { error: "PIN not set", valid: false };
//     }

//     const isValid = pin === profile.transaction_pin;

//     if (!isValid) {
//       return { error: "Incorrect PIN", valid: false };
//     }

//     return { success: true, valid: true };
//   } catch (error) {
//     console.error("Verify PIN error:", error);
//     return { error: "Something went wrong", valid: false };
//   }
// }

// /**
//  * Get Wallet Balance
//  */
// export async function getWalletBalanceAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", balance: 0 };
//     }

//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("wallet_balance")
//       .eq("id", user.id)
//       .single();

//     if (profileError) {
//       console.error("Wallet balance error:", profileError);
//       return { error: "Failed to fetch balance", balance: 0 };
//     }

//     return { success: true, balance: profile.wallet_balance || 0 };
//   } catch (error) {
//     console.error("Get wallet balance error:", error);
//     return { error: "Something went wrong", balance: 0 };
//   }
// }

// /**
//  * Update Transaction PIN
//  */
// export async function updateTransactionPinAction(
//   currentPin: string,
//   newPin: string
// ) {
//   try {
//     if (!/^\d{4,6}$/.test(newPin)) {
//       return { error: "New PIN must be 4-6 digits" };
//     }

//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Verify current PIN
//     const verifyResult = await verifyTransactionPinAction(currentPin);
//     if (!verifyResult.valid) {
//       return { error: "Current PIN is incorrect" };
//     }

//     // Update to new PIN (plain text)
//     const { error: updateError } = await supabase
//       .from("profiles")
//       .update({ transaction_pin: newPin })
//       .eq("id", user.id);

//     if (updateError) {
//       console.error("PIN update error:", updateError);
//       return { error: "Failed to update PIN" };
//     }

//     revalidatePath("/changepin");
//     return { success: true };
//   } catch (error) {
//     console.error("Update PIN error:", error);
//     return { error: "Something went wrong" };
//   }
// }

// /**
//  * Create Virtual Account via PayVessel
//  */
// // export async function createVirtualAccountAction(formData: {
// //   email: string;
// //   name: string;
// //   phoneNumber: string;
// //   bvn?: string;
// //   nin?: string;
// // }) {
// //   try {
// //     const supabase = await createServerClient();
// //     const {
// //       data: { user },
// //       error: authError,
// //     } = await supabase.auth.getUser();

// //     if (authError || !user) {
// //       return { error: "Unauthorized" };
// //     }

// //     // Validate required fields
// //     if (!formData.name || !formData.phoneNumber) {
// //       return { error: "Name and phone number are required" };
// //     }

// //     // Must have either BVN or NIN (not both, not neither)
// //     if (!formData.bvn && !formData.nin) {
// //       return { error: "Either BVN or NIN is required" };
// //     }

// //     // Check if user already has virtual accounts
// //     const { data: existing } = await supabase
// //       .from("virtual_accounts")
// //       .select("id")
// //       .eq("user_id", user.id)
// //       .limit(1);

// //     if (existing && existing.length > 0) {
// //       return { error: "You already have virtual accounts" };
// //     }

// //     // Create custom account name (max 40 chars)
// //     const accountName = `EDGES-${username}`
// //       .toUpperCase()
// //       .replace(/[^A-Z0-9\s-]/g, "") // Remove special characters
// //       .slice(0, 40); // Ensure max length

// //     // Prepare PayVessel request
// //     const payvesselPayload = {
// //       email: formData.email,
// //       name: formData.name,
// //       phoneNumber: formData.phoneNumber,
// //       bankcode: ["999991"], // PalmPay and 9Payment Service Bank / changed to only palmpay
// //       account_type: "STATIC",
// //       businessid: process.env.NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID!,
// //       business_name: accountName, // Custom account name
// //       ...(formData.bvn && { bvn: formData.bvn }),
// //       ...(formData.nin && { nin: formData.nin }),
// //     };

// //     console.log("Creating virtual account:", {
// //       ...payvesselPayload,
// //       bvn: formData.bvn ? "***" : undefined,
// //       nin: formData.nin ? "***" : undefined,
// //     });

// //     // Call PayVessel API
// //     const payvesselResponse = await fetch(
// //       "https://api.payvessel.com/pms/api/external/request/customerReservedAccount/",
// //       {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           "api-key": process.env.NEXT_PUBLIC_PAYVESSEL_API_KEY!,
// //           "api-secret": `Bearer ${process.env
// //             .NEXT_PUBLIC_PAYVESSEL_SECRET_KEY!}`,
// //         },
// //         body: JSON.stringify(payvesselPayload),
// //       }
// //     );

// //     const payvesselData = await payvesselResponse.json();

// //     console.log("PayVessel response:", {
// //       status: payvesselData.status,
// //       banksCount: payvesselData.banks?.length,
// //     });

// //     if (!payvesselResponse.ok || !payvesselData.status) {
// //       console.error("PayVessel error:", payvesselData);
// //       return {
// //         error: payvesselData.message || "Failed to create virtual account",
// //       };
// //     }

// //     const banks = payvesselData.banks || [];

// //     if (banks.length === 0) {
// //       return { error: "No virtual accounts were created" };
// //     }

// //     // Store virtual accounts AND customer info in database
// //     const accountRecords = banks.map((bank: any) => ({
// //       user_id: user.id,
// //       bank_name: bank.bankName,
// //       account_number: bank.accountNumber,
// //       account_name: bank.accountName,
// //       account_type: bank.account_type || "STATIC",
// //       tracking_reference: bank.trackingReference,
// //       expire_date: bank.expire_date || null,
// //       provider: "payvessel",
// //       // Store customer information
// //       customer_email: formData.email,
// //       customer_name: formData.name,
// //       customer_phone: formData.phoneNumber,
// //       customer_bvn: formData.bvn || null,
// //       customer_nin: formData.nin || null,
// //       created_at: new Date().toISOString(),
// //     }));

// //     const { error: insertError } = await supabase
// //       .from("virtual_accounts")
// //       .insert(accountRecords);

// //     if (insertError) {
// //       console.error("Insert error:", insertError);
// //       return { error: "Failed to save virtual accounts" };
// //     }

// //     // Create notification
// //     await supabase.from("notifications").insert({
// //       user_id: user.id,
// //       notification_type: "deposit",
// //       message: `Virtual accounts created successfully! You can now fund your wallet via bank transfer.`,
// //       is_read: false,
// //       metadata: {
// //         accounts_count: banks.length,
// //         banks: banks.map((b: any) => b.bankName).join(", "),
// //       },
// //     });

// //     revalidatePath("/wallet");
// //     revalidatePath("/home");

// //     return {
// //       success: true,
// //       accounts: banks.map((bank: any) => ({
// //         bankName: bank.bankName,
// //         accountNumber: bank.accountNumber,
// //         accountName: bank.accountName,
// //       })),
// //       message: `${banks.length} virtual accounts created successfully!`,
// //     };
// //   } catch (error) {
// //     console.error("Create virtual account error:", error);
// //     return { error: "Something went wrong. Please try again." };
// //   }
// // }

// /**
//  * Create Virtual Account via PayVessel
//  */
// export async function createVirtualAccountAction(formData: {
//   email: string;
//   name: string;
//   phoneNumber: string;
//   bvn?: string;
//   nin?: string;
// }) {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Validate required fields
//     if (!formData.name || !formData.phoneNumber) {
//       return { error: "Name and phone number are required" };
//     }

//     // Must have either BVN or NIN (not both, not neither)
//     if (!formData.bvn && !formData.nin) {
//       return { error: "Either BVN or NIN is required" };
//     }

//     // Check if user already has virtual accounts
//     const { data: existing } = await supabase
//       .from("virtual_accounts")
//       .select("id")
//       .eq("user_id", user.id)
//       .limit(1);

//     if (existing && existing.length > 0) {
//       return { error: "You already have virtual accounts" };
//     }

//     // Validate environment variables
//     if (!process.env.NEXT_PUBLIC_PAYVESSEL_API_KEY) {
//       console.error("PAYVESSEL_API_KEY not set");
//       return {
//         error: "PayVessel configuration missing. Please contact support.",
//       };
//     }

//     if (!process.env.NEXT_PUBLIC_PAYVESSEL_SECRET_KEY) {
//       console.error("PAYVESSEL_API_SECRET not set");
//       return {
//         error: "PayVessel configuration missing. Please contact support.",
//       };
//     }

//     if (!process.env.NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID) {
//       console.error("PAYVESSEL_BUSINESS_ID not set");
//       return { error: "PayVessel configuration missing. Please contact support." };
//     }

//     // Get username for custom account name
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("username")
//       .eq("id", user.id)
//       .single();

//     const username = profile?.username || formData.name.split(" ")[0];

//     // Create custom account name (max 40 chars)
//     const accountName = `EDGESN-${username}`
//       .toUpperCase()
//       .replace(/[^A-Z0-9\s-]/g, "") // Remove special characters
//       .slice(0, 40); // Ensure max length

//     // Prepare PayVessel request
//     const payvesselPayload = {
//       email: formData.email,
//       name: formData.name,
//       phoneNumber: formData.phoneNumber,
//       bankcode: ["999991", "120001"], // PalmPay and 9Payment Service Bank
//       account_type: "STATIC",
//       businessid: process.env.NEXT_PUBLIC_PAYVESSEL_BUSINESS_ID!,
//       business_name: accountName, // Custom account name
//       ...(formData.bvn && { bvn: formData.bvn }),
//       ...(formData.nin && { nin: formData.nin }),
//     };

//     console.log("Creating virtual account:", {
//       ...payvesselPayload,
//       bvn: formData.bvn ? "***" : undefined,
//       nin: formData.nin ? "***" : undefined,
//     });

//     // Call PayVessel API
//     const payvesselResponse = await fetch(
//       "https://api.payvessel.com/pms/api/external/request/customerReservedAccount/",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "api-key": process.env.NEXT_PUBLIC_PAYVESSEL_API_KEY!,
//           "api-secret": `Bearer ${process.env
//             .NEXT_PUBLIC_PAYVESSEL_SECRET_KEY!}`,
//         },
//         body: JSON.stringify(payvesselPayload),
//       }
//     );

//     const payvesselData = await payvesselResponse.json();

//     console.log("PayVessel response:", {
//       status: payvesselData.status,
//       success: payvesselData.success,
//       message: payvesselData.message,
//       banksCount: payvesselData.banks?.length,
//     });

//     // Check for API key errors
//     if (payvesselData.message?.includes("Invalid API Key")) {
//       console.error("PayVessel API Key is invalid!");
//       return {
//         error: "Payment provider configuration error. Please contact support.",
//       };
//     }

//     if (!payvesselResponse.ok || !payvesselData.status) {
//       console.error("PayVessel error:", payvesselData);
//       return {
//         error: payvesselData.message || "Failed to create virtual account",
//       };
//     }

//     const banks = payvesselData.banks || [];

//     if (banks.length === 0) {
//       return { error: "No virtual accounts were created" };
//     }

//     // Store virtual accounts AND customer info in database
//     const accountRecords = banks.map((bank: any) => ({
//       user_id: user.id,
//       bank_name: bank.bankName,
//       account_number: bank.accountNumber,
//       account_name: bank.accountName,
//       account_type: bank.account_type || "STATIC",
//       tracking_reference: bank.trackingReference,
//       expire_date: bank.expire_date || null,
//       provider: "payvessel",
//       // Store customer information
//       customer_email: formData.email,
//       customer_name: formData.name,
//       customer_phone: formData.phoneNumber,
//       customer_bvn: formData.bvn || null,
//       customer_nin: formData.nin || null,
//       created_at: new Date().toISOString(),
//     }));

//     const { error: insertError } = await supabase
//       .from("virtual_accounts")
//       .insert(accountRecords);

//     if (insertError) {
//       console.error("Insert error:", insertError);
//       return { error: "Failed to save virtual accounts" };
//     }

//     // Create notification
//     await supabase.from("notifications").insert({
//       user_id: user.id,
//       notification_type: "deposit",
//       message: `Virtual accounts created successfully! You can now fund your wallet via bank transfer.`,
//       is_read: false,
//       metadata: {
//         accounts_count: banks.length,
//         banks: banks.map((b: any) => b.bankName).join(", "),
//       },
//     });

//     revalidatePath("/wallet");
//     revalidatePath("/home");

//     return {
//       success: true,
//       accounts: banks.map((bank: any) => ({
//         bankName: bank.bankName,
//         accountNumber: bank.accountNumber,
//         accountName: bank.accountName,
//       })),
//       message: `${banks.length} virtual accounts created successfully!`,
//     };
//   } catch (error) {
//     console.error("Create virtual account error:", error);
//     return { error: "Something went wrong. Please try again." };
//   }
// }

// /**
//  * Create Virtual Account via XixaPay
//  */
// export async function createVirtualAccountXixaPayAction(formData: {
//   email: string;
//   name: string;
//   phoneNumber: string;
//   bvn?: string;
//   nin?: string;
// }) {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Validate required fields
//     if (!formData.name || !formData.phoneNumber) {
//       return { error: "Name and phone number are required" };
//     }

//     // Must have either BVN or NIN for static accounts
//     if (!formData.bvn && !formData.nin) {
//       return { error: "Either BVN or NIN is required" };
//     }

//     // Check if user already has virtual accounts
//     const { data: existing } = await supabase
//       .from("virtual_accounts")
//       .select("id")
//       .eq("user_id", user.id)
//       .limit(1);

//     if (existing && existing.length > 0) {
//       return { error: "You already have virtual accounts" };
//     }

//     // Validate environment variables
//     if (!process.env.XIXAPAY_API_KEY) {
//       console.error("XIXAPAY_API_KEY not set");
//       return {
//         error: "XixaPay configuration missing. Please contact support.",
//       };
//     }

//     if (!process.env.XIXAPAY_SECRET_KEY) {
//       console.error("XIXAPAY_SECRET_KEY not set");
//       return {
//         error: "XixaPay configuration missing. Please contact support.",
//       };
//     }

//     if (!process.env.XIXAPAY_BUSINESS_ID) {
//       console.error("XIXAPAY_BUSINESS_ID not set");
//       return {
//         error: "XixaPay configuration missing. Please contact support.",
//       };
//     }

//     // Get username for custom account name
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("username")
//       .eq("id", user.id)
//       .single();

//     const username = profile?.username || formData.name.split(" ")[0];

//     // Prepare XixaPay request payload
//     const xixapayPayload = {
//       email: formData.email,
//       name: formData.name,
//       phoneNumber: formData.phoneNumber,
//       bankCode: ["20867", "20987", "29007"], // Palmpay, KOLOMONI MFB, Safehaven
//       businessId: process.env.XIXAPAY_BUSINESS_ID!,
//       accountType: "static",
//       id_type: formData.bvn ? "bvn" : "nin",
//       id_number: formData.bvn || formData.nin,
//     };

//     console.log("Creating XixaPay virtual account:", {
//       ...xixapayPayload,
//       id_number: "***",
//     });

//     // Call XixaPay API
//     const xixapayResponse = await fetch(
//       "https://api.xixapay.com/api/v1/createVirtualAccount",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${process.env.XIXAPAY_SECRET_KEY!}`,
//           "api-key": process.env.XIXAPAY_API_KEY!,
//         },
//         body: JSON.stringify(xixapayPayload),
//       }
//     );

//     const xixapayData = await xixapayResponse.json();

//     console.log("XixaPay response:", {
//       status: xixapayData.status,
//       message: xixapayData.message,
//       accountsCount: xixapayData.bankAccounts?.length,
//     });

//     // Check for API errors
//     if (!xixapayResponse.ok || xixapayData.status !== "success") {
//       console.error("XixaPay error:", xixapayData);
//       return {
//         error: xixapayData.message || "Failed to create virtual account",
//       };
//     }

//     const bankAccounts = xixapayData.bankAccounts || [];

//     if (bankAccounts.length === 0) {
//       return { error: "No virtual accounts were created" };
//     }

//     // Store virtual accounts in database
//     const accountRecords = bankAccounts.map((bank: any) => ({
//       user_id: user.id,
//       bank_name: bank.bankName,
//       account_number: bank.accountNumber,
//       account_name: bank.accountName,
//       account_type: bank.accountType || "static",
//       tracking_reference: bank.Reserved_Account_Id,
//       expire_date: null,
//       provider: "xixapay",
//       // Store customer information
//       customer_email: formData.email,
//       customer_name: formData.name,
//       customer_phone: formData.phoneNumber,
//       customer_bvn: formData.bvn || null,
//       customer_nin: formData.nin || null,
//       created_at: new Date().toISOString(),
//     }));

//     const { error: insertError } = await supabase
//       .from("virtual_accounts")
//       .insert(accountRecords);

//     if (insertError) {
//       console.error("Insert error:", insertError);
//       return { error: "Failed to save virtual accounts" };
//     }

//     // Create notification
//     await supabase.from("notifications").insert({
//       user_id: user.id,
//       notification_type: "deposit",
//       message: `Virtual accounts created successfully! You can now fund your wallet via bank transfer.`,
//       is_read: false,
//       metadata: {
//         accounts_count: bankAccounts.length,
//         banks: bankAccounts.map((b: any) => b.bankName).join(", "),
//         provider: "xixapay",
//       },
//     });

//     revalidatePath("/wallet");
//     revalidatePath("/home");

//     return {
//       success: true,
//       accounts: bankAccounts.map((bank: any) => ({
//         bankName: bank.bankName,
//         accountNumber: bank.accountNumber,
//         accountName: bank.accountName,
//       })),
//       message: `${bankAccounts.length} virtual accounts created successfully via XixaPay!`,
//     };
//   } catch (error) {
//     console.error("Create XixaPay virtual account error:", error);
//     return { error: "Something went wrong. Please try again." };
//   }
// }
