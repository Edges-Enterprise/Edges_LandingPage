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
export async function createCustomerVirtualAccount(
  input: CustomerVirtualAccountInput,
): Promise<CustomerVirtualAccountResult> {
  try {
    const admin = createAdminClient();

    // Validate required fields
    if (!input.fullName || !input.phoneNumber || !input.email) {
      return { error: "Name, phone number, and email are required" };
    }

    if (!input.resellerId || !input.customerId) {
      return { error: "Reseller and customer IDs are required" };
    }

    // Check if customer already has an active virtual account in this store
    const { data: existing } = await admin
      .from("reseller_customer_virtual_accounts")
      .select("id")
      .eq("reseller_id", input.resellerId)
      .eq("customer_id", input.customerId)
      .eq("status", "active")
      .limit(1);

    if (existing?.length) {
      return {
        error: "You already have an active virtual account in this store",
      };
    }

    // Validate environment variables
    const secretKey = process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY;
    const apiKey = process.env.NEXT_PUBLIC_XIXAPAY_API_KEY;
    const businessId = process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID;

    if (!secretKey || !apiKey || !businessId) {
      console.error("Missing Xixapay config");
      return {
        error:
          "Payment provider configuration missing. Please contact support.",
      };
    }

    // Generate unique email for this store
    const [localPart, domain] = input.email.split("@");
    const suffix = Math.floor(Math.random() * 9) + 1;
    const separator = localPart.includes("+") ? "" : "+";
    const virtualEmail = `${localPart}${separator}${input.storeSlug}${suffix}@${domain}`;

    // Prepare XixaPay request payload
    const xixapayPayload = {
      email: virtualEmail,
      name: input.fullName,
      phoneNumber: input.phoneNumber,
      bankCode: ["20867"], // PalmPay
      businessId,
      accountType: "static",
      id_type: "bvn",
      id_number: "22222222222", // Placeholder BVN
    };

    console.log("Creating customer virtual account:", {
      customerId: input.customerId,
      storeSlug: input.storeSlug,
      virtualEmail,
    });

    // Call XixaPay API
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
        error:
          xixapayData.message ||
          "Failed to create virtual account. Please try again.",
      };
    }

    const bankAccounts = xixapayData.bankAccounts || [];
    if (bankAccounts.length === 0) {
      return { error: "No virtual accounts were created" };
    }

    // Store in customer virtual accounts table
    const accountRecords = bankAccounts.map((bank: any) => ({
      reseller_id: input.resellerId,
      customer_id: input.customerId,
      bank_name: bank.bankName,
      account_number: bank.accountNumber,
      account_name: bank.accountName,
      account_type: bank.accountType || "static",
      tracking_reference: bank.Reserved_Account_Id,
      provider: "xixapay",
      customer_email: virtualEmail,
      customer_name: input.fullName,
      customer_phone: input.phoneNumber,
      customer_bvn: "22222222222",
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

    // Also check if customer needs a wallet
    const { data: wallet } = await admin
      .from("reseller_customer_wallets")
      .select("id")
      .eq("reseller_id", input.resellerId)
      .eq("customer_id", input.customerId)
      .maybeSingle();

    if (!wallet) {
      // Create wallet for customer
      await admin.from("reseller_customer_wallets").insert({
        reseller_id: input.resellerId,
        customer_id: input.customerId,
        balance: 0,
        total_spent: 0,
      });
    }

    revalidatePath(`/${input.storeSlug}`);

    return {
      success: true,
      message:
        "Virtual account created successfully! You can now fund your wallet.",
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
