// app/actions/reseller/wallet/customerVirtualAccount.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

interface CustomerVirtualAccountInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  resellerId: string;
  customerId: string;
  storeSlug: string;
}

interface CustomerVirtualAccountResult {
  success?: boolean;
  error?: string;
  message?: string;
  virtualEmail?: string;
  accounts?: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
}

/**
 * Get customer virtual accounts for a reseller's customer
 */
export async function getCustomerVirtualAccounts(
  customerId: string,
  resellerId: string,
) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_customer_virtual_accounts")
    .select("*")
    .eq("reseller_id", resellerId)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer virtual accounts:", error);
    return [];
  }

  return data;
}

/**
 * Check if a customer already has a virtual account
 */
export async function customerHasVirtualAccount(
  customerId: string,
  resellerId: string,
): Promise<boolean> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("reseller_customer_virtual_accounts")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Create a virtual account for a reseller's customer
 */
// export async function createCustomerVirtualAccount(
//   input: CustomerVirtualAccountInput,
// ): Promise<CustomerVirtualAccountResult> {
//   try {
//     const admin = createAdminClient();

//     // Validate required fields
//     if (!input.fullName || !input.phoneNumber || !input.email) {
//       return { error: "Name, phone number, and email are required" };
//     }

//     if (!input.resellerId || !input.customerId) {
//       return { error: "Reseller and customer IDs are required" };
//     }

//     // Check if customer already has an active virtual account in this store
//     const { data: existing } = await admin
//       .from("reseller_customer_virtual_accounts")
//       .select("id")
//       .eq("reseller_id", input.resellerId)
//       .eq("customer_id", input.customerId)
//       .eq("status", "active")
//       .limit(1);

//     if (existing?.length) {
//       return {
//         error: "You already have an active virtual account in this store",
//       };
//     }

//     // Validate environment variables
//     const secretKey = process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY;
//     const apiKey = process.env.NEXT_PUBLIC_XIXAPAY_API_KEY;
//     const businessId = process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID;

//     if (!secretKey || !apiKey || !businessId) {
//       console.error("Missing Xixapay config");
//       return {
//         error:
//           "Payment provider configuration missing. Please contact support.",
//       };
//     }

//     // Generate unique email for this store
//     const [localPart, domain] = input.email.split("@");
//     const suffix = Math.floor(Math.random() * 9) + 1;
//     const separator = localPart.includes("+") ? "" : "+";
//     const virtualEmail = `${localPart}${separator}${input.storeSlug}${suffix}@${domain}`;

//     // Prepare XixaPay request payload
//     const xixapayPayload = {
//       email: virtualEmail,
//       name: input.fullName,
//       phoneNumber: input.phoneNumber,
//       bankCode: ["20867"], // PalmPay
//       businessId,
//       accountType: "static",
//       id_type: "bvn",
//       id_number: "22222222222", // Placeholder BVN
//     };

//     console.log("Creating customer virtual account:", {
//       customerId: input.customerId,
//       storeSlug: input.storeSlug,
//       virtualEmail,
//     });

//     // Call XixaPay API
//     const xixapayResponse = await fetch(
//       "https://api.xixapay.com/api/v1/createVirtualAccount",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${secretKey}`,
//           "api-key": apiKey,
//         },
//         body: JSON.stringify(xixapayPayload),
//       },
//     );

//     const xixapayData = await xixapayResponse.json();

//     if (!xixapayResponse.ok || xixapayData.status !== "success") {
//       return {
//         error:
//           xixapayData.message ||
//           "Failed to create virtual account. Please try again.",
//       };
//     }

//     const bankAccounts = xixapayData.bankAccounts || [];
//     if (bankAccounts.length === 0) {
//       return { error: "No virtual accounts were created" };
//     }

//     // Store in customer virtual accounts table
//     const accountRecords = bankAccounts.map((bank: any) => ({
//       reseller_id: input.resellerId,
//       customer_id: input.customerId,
//       bank_name: bank.bankName,
//       account_number: bank.accountNumber,
//       account_name: bank.accountName,
//       account_type: bank.accountType || "static",
//       tracking_reference: bank.Reserved_Account_Id,
//       provider: "xixapay",
//       customer_email: virtualEmail,
//       customer_name: input.fullName,
//       customer_phone: input.phoneNumber,
//       customer_bvn: "22222222222",
//       customer_nin: null,
//       status: "active",
//     }));

//     const { error: insertError } = await admin
//       .from("reseller_customer_virtual_accounts")
//       .insert(accountRecords);

//     if (insertError) {
//       console.error("Insert error:", insertError);
//       return { error: "Failed to save virtual account. Please try again." };
//     }

//     // Also check if customer needs a wallet
//     const { data: wallet } = await admin
//       .from("reseller_customer_wallets")
//       .select("id")
//       .eq("reseller_id", input.resellerId)
//       .eq("customer_id", input.customerId)
//       .maybeSingle();

//     if (!wallet) {
//       // Create wallet for customer
//       await admin.from("reseller_customer_wallets").insert({
//         reseller_id: input.resellerId,
//         customer_id: input.customerId,
//         balance: 0,
//         total_spent: 0,
//       });
//     }

//     revalidatePath(`/${input.storeSlug}`);

//     return {
//       success: true,
//       message:
//         "Virtual account created successfully! You can now fund your wallet.",
//       virtualEmail,
//       accounts: bankAccounts.map((bank: any) => ({
//         bankName: bank.bankName,
//         accountNumber: bank.accountNumber,
//         accountName: bank.accountName,
//       })),
//     };
//   } catch (error) {
//     console.error("Create customer virtual account error:", error);
//     return { error: "Something went wrong. Please try again." };
//   }
// }

/**
 * Get customer wallet with virtual accounts
 */
export async function getCustomerWalletWithAccounts(
  customerId: string,
  resellerId: string,
) {
  const supabase = await createServerClient();

  const [walletResult, accountsResult] = await Promise.all([
    supabase
      .from("reseller_customer_wallets")
      .select("id, balance, total_spent")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .maybeSingle(),
    supabase
      .from("reseller_customer_virtual_accounts")
      .select("*")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  return {
    wallet: walletResult.data || { id: "", balance: 0, total_spent: 0 },
    virtualAccounts: accountsResult.data || [],
  };
}

/**
 * Create a virtual account for a reseller's customer (auto-assigns from waitlist)
 */
export async function createCustomerVirtualAccount(
  resellerId: string,
  // customerId: string,
  storeSlug: string,
): Promise<CustomerVirtualAccountResult> {
  try {
    const admin = createAdminClient();
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "You must be logged in" };
    }

    // 1. Check if customer already has a virtual account in this store
    const { data: existingVirtualAccount } = await admin
      .from("reseller_customer_virtual_accounts")
      .select("id")
      .eq("reseller_id", resellerId)
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .limit(1);
    
    if (existingVirtualAccount?.length) {
      return {
        error: "You already have an active virtual account in this store",
      };
    }

    // Look up customer record via admin client (bypasses RLS)
    const { data: customer, error: customerError } = await admin
      .from("reseller_customers")
      .select("id, first_name, email, bvn")
      .eq("reseller_id", resellerId)
      .eq("auth_user_id", user.id) // ← resolve from session
      .single();

    if (customerError || !customer) {
      console.error("Customer lookup error:", customerError);
      return { error: "Customer record not found. Please contact support." };
    }

     const customerId = customer.id;

    // 3. Check if customer already has a BVN assigned
    let bvnToUse = customer.bvn;

    if (!bvnToUse) {
      // 4. Fetch first unused BVN from waitlist (transaction to prevent race conditions)
      const { data: waitlistEntry, error: waitlistError } = await admin
        .from("waitlist")
        .select("id, full_name, bvn, mobile")
        .eq("status", "pending")
        .limit(1)
        .order("created_at", { ascending: true });

      if (waitlistError || !waitlistEntry || waitlistEntry.length === 0) {
        return { error: "Denied. Please contact support." };
      }

      const entry = waitlistEntry[0];
      bvnToUse = entry.bvn;

      // 5. Assign BVN to customer and mark waitlist as used
      const { error: updateCustomerError } = await admin
        .from("reseller_customers")
        .update({ bvn: bvnToUse })
        .eq("id", customerId);

      if (updateCustomerError) {
        return { error: "Failed to assign BVN. Please try again." };
      }

      const { error: updateWaitlistError } = await admin
        .from("waitlist")
        .update({
          status: "used",
          assigned_to: user.id,
          assigned_to_type: "customer",
          used_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      if (updateWaitlistError) {
        // Rollback: remove BVN from customer
        await admin.from("reseller_customers").update({ bvn: null }).eq("id", customerId);
        return { error: "Failed to reserve BVN. Please try again." };
      }

      // Store the waitlist data for later use
      var waitlistName = entry.full_name;
      var waitlistPhone = entry.mobile;
    } else {
      // Customer already has BVN - need to find the waitlist entry
      const { data: waitlistEntry } = await admin
        .from("waitlist")
        .select("full_name, mobile")
        .eq("bvn", bvnToUse)
        .single();

      if (waitlistEntry) {
        var waitlistName = waitlistEntry.full_name;
        var waitlistPhone = waitlistEntry.mobile;
      } else {
        // Fallback to customer's own name if waitlist entry not found
        var waitlistName = customer.first_name || "Customer";
        // var waitlistPhone = customer?.bvn || "";
      }
    }

    // 6. Validate BVN format
    if (!bvnToUse || !/^\d{11}$/.test(bvnToUse)) {
      return { error: "Invalid BVN format. Please contact support." };
    }

    // 7. Validate environment variables
    const secretKey = process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY;
    const apiKey = process.env.NEXT_PUBLIC_XIXAPAY_API_KEY;
    const businessId = process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID;

    if (!secretKey || !apiKey || !businessId) {
      console.error("Missing Xixapay config");
      return {
        error: "Payment provider configuration missing. Please contact support.",
      };
    }

    // 8. Generate unique email for this customer in this store
    const [localPart, domain] = customer.email.split("@");
    const suffix = Math.floor(Math.random() * 9) + 1;
    const separator = localPart.includes("+") ? "" : "+";
    const virtualEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;

    // 9. Prepare XixaPay request payload - using waitlist person's name and phone
    const xixapayPayload = {
      email: virtualEmail,
      name: waitlistName,  // ← Name from waitlist (BVN owner)
      phoneNumber: waitlistPhone,  // ← Phone from waitlist (BVN owner)
      bankCode: ["20867"], // PalmPay
      businessId,
      accountType: "static",
      id_type: "bvn",
      id_number: bvnToUse,  // ← BVN from waitlist
    };

    console.log("Creating customer virtual account:", {
      customerId,
      storeSlug,
      virtualEmail,
      waitlistName,
      hasBvn: !!bvnToUse,
    });

    // 10. Call XixaPay API
    const xixapayResponse = await fetch(
      "https://api.xixapay.com/api/v1/createVirtualAccount",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
          "api-key": apiKey,
        },
        body: JSON.stringify(xixapayPayload),
      },
    );

    const xixapayData = await xixapayResponse.json();

    if (!xixapayResponse.ok || xixapayData.status !== "success") {
      return {
        error: xixapayData.message || "Failed to create virtual account. Please try again.",
      };
    }

    const bankAccounts = xixapayData.bankAccounts || [];
    if (bankAccounts.length === 0) {
      return { error: "No virtual accounts were created" };
    }

    // 11. Store in database
    const accountRecords = bankAccounts.map((bank: any) => ({
      reseller_id: resellerId,
      customer_id: customerId,
      bank_name: bank.bankName,
      account_number: bank.accountNumber,
      account_name: bank.accountName,
      account_type: bank.accountType || "static",
      tracking_reference: bank.Reserved_Account_Id,
      provider: "xixapay",
      customer_email: virtualEmail,
      customer_name: waitlistName,  // ← Store waitlist name
      customer_phone: waitlistPhone,  // ← Store waitlist phone
      customer_bvn: bvnToUse,  // ← Store real BVN
      customer_nin: null,
      status: "active",
    }));

    const { error: insertError } = await admin
      .from("reseller_customer_virtual_accounts")
      .insert(accountRecords);

    if (insertError) {
      console.error("Insert error:", insertError);
      return { error: "Failed to save virtual account. Please try again." };
    }

    // 12. Also check if customer needs a wallet
    const { data: wallet } = await admin
      .from("reseller_customer_wallets")
      .select("id")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!wallet) {
      await admin.from("reseller_customer_wallets").insert({
        reseller_id: resellerId,
        customer_id: customerId,
        balance: 0,
        total_spent: 0,
      });
    }

    return {
      success: true,
      message: "Virtual account created successfully! You can now fund your wallet.",
      virtualEmail,
      accounts: bankAccounts.map((bank: any) => ({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      })),
    };
  } catch (error) {
    console.error("Create customer virtual account error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}