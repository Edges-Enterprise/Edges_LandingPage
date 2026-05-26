// app/actions/reseller/wallet/resellerCustomerWallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── Types ─────────────────────────────────────────────
interface ResellerStatus {
  canSell: boolean;
  hasVirtualAccount: boolean;
  hasBalance: boolean;
  hasWhatsApp: boolean;
  balance: number;
  reason: string | null;
}

interface CreateVirtualAccountInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  resellerId: string;
}

interface CreateVirtualAccountResult {
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

interface CustomerWallet {
  id: string;
  balance: number;
  total_spent: number;
}

// ─── Check if a reseller is ready to accept orders ─────
export async function checkResellerCanSell(
  storeName: string,
): Promise<ResellerStatus> {
  const supabase = await createServerClient();

  // 1. Find the reseller
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, store_name, phone")
    .eq("store_name", storeName)
    .eq("status", "active")
    .single();

  if (!reseller) {
    return {
      canSell: false,
      hasVirtualAccount: false,
      hasBalance: false,
      hasWhatsApp: false,
      balance: 0,
      reason: "Store not found",
    };
  }

  // 2. Check if reseller has WhatsApp number
  const hasWhatsApp = !!reseller.phone && reseller.phone.trim().length > 0;

  // 3. Check if reseller has a virtual account
  const { data: virtualAccount } = await supabase
    .from("reseller_virtual_accounts")
    .select("id")
    .eq("reseller_id", reseller.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const hasVirtualAccount = !!virtualAccount;

  // 4. Check wallet balance
  const { data: wallet } = await supabase
    .from("reseller_wallets")
    .select("balance")
    .eq("reseller_id", reseller.id)
    .single();

  const balance = wallet?.balance || 0;
  const hasBalance = balance > 0;
  const canSell = hasWhatsApp && hasVirtualAccount && hasBalance;

  // 5. Determine the reason if they can't sell
  let reason: string | null = null;
  if (!canSell) {
    if (!hasWhatsApp) {
      reason = "Store owner hasn't set up WhatsApp support. Please check back later.";
    } else if (!hasVirtualAccount) {
      reason = "Store is not fully set up yet. Please check back later.";
    } else if (!hasBalance) {
      reason = "Store is temporarily unavailable. Please check back later.";
    }
  }

  return {
    canSell,
    hasVirtualAccount,
    hasBalance,
    hasWhatsApp,
    balance,
    reason,
  };
}

// ─── Check reseller status by ID (for dashboard) ───────
export async function checkResellerStatusById(
  resellerId: string,
): Promise<ResellerStatus> {
  const supabase = await createServerClient();

  const { data: reseller } = await supabase
    .from("resellers")
    .select("phone")
    .eq("id", resellerId)
    .single();

  const hasWhatsApp = !!reseller?.phone && reseller.phone.trim().length > 0;

  const { data: virtualAccount } = await supabase
    .from("reseller_virtual_accounts")
    .select("id")
    .eq("reseller_id", resellerId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const { data: wallet } = await supabase
    .from("reseller_wallets")
    .select("balance")
    .eq("reseller_id", resellerId)
    .single();

  const balance = wallet?.balance || 0;
  const hasVirtualAccount = !!virtualAccount;
  const hasBalance = balance > 0;

  return {
    canSell: hasWhatsApp && hasVirtualAccount && hasBalance,
    hasVirtualAccount,
    hasBalance,
    hasWhatsApp,
    balance,
    reason: null,
  };
}

// ─── Get or create a customer wallet ───────────────────
export async function getOrCreateCustomerWallet(
  customerId: string,
  resellerId: string,
): Promise<CustomerWallet | null> {
  const supabase = await createServerClient();

  // Try to find existing wallet
  const { data: existing } = await supabase
    .from("reseller_customer_wallets")
    .select("id, balance, total_spent")
    .eq("reseller_id", resellerId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create a new wallet with zero balance
  const { data: wallet, error } = await supabase
    .from("reseller_customer_wallets")
    .insert({
      reseller_id: resellerId,
      customer_id: customerId,
      balance: 0,
      total_spent: 0,
    })
    .select("id, balance, total_spent")
    .single();

  if (error) {
    console.error("Failed to create customer wallet:", error);
    return null;
  }

  return wallet;
}

// ─── Get reseller virtual accounts ─────────────────────
export async function getResellerVirtualAccounts(resellerId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_virtual_accounts")
    .select("*")
    .eq("reseller_id", resellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching virtual accounts:", error);
    return [];
  }

  return data;
}

// ─── Create a virtual account for a reseller ───────────
export async function createResellerVirtualAccount(
  input: CreateVirtualAccountInput,
): Promise<CreateVirtualAccountResult> {
  try {
    const admin = createAdminClient();

    // Validate required fields
    if (!input.fullName || !input.phoneNumber || !input.email) {
      return { error: "Name, phone number, and email are required" };
    }

    if (!input.resellerId) {
      return { error: "Reseller ID is required" };
    }

    // Check if already has an active virtual account
    const { data: existing } = await admin
      .from("reseller_virtual_accounts")
      .select("id")
      .eq("reseller_id", input.resellerId)
      .eq("status", "active")
      .limit(1);

    if (existing?.length) {
      return { error: "You already have an active virtual account" };
    }

    // Validate environment variables
    const secretKey = process.env.NEXT_PUBLIC_XIXAPAY_SECRET_KEY;
    const apiKey = process.env.NEXT_PUBLIC_XIXAPAY_API_KEY;
    const businessId = process.env.NEXT_PUBLIC_XIXAPAY_BUSINESS_ID;

    if (!secretKey || !apiKey || !businessId) {
      console.error("Missing Xixapay config:", {
        secretKey: !!secretKey,
        apiKey: !!apiKey,
        businessId: !!businessId,
      });
      return {
        error:
          "Payment provider configuration missing. Please contact support.",
      };
    }

    // Generate unique email for this store
    const [localPart, domain] = input.email.split("@");
    const suffix = Math.floor(Math.random() * 9) + 1;
    const separator = localPart.includes("+") ? "" : "+";
    const virtualEmail = `${localPart}${separator}${input.resellerId.slice(0, 8)}${suffix}@${domain}`;

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

    console.log("Creating virtual account for reseller:", {
      resellerId: input.resellerId,
      virtualEmail,
      name: input.fullName,
    });

    // Add these logs right before the XixaPay call
    console.log("XixaPay Request:", {
      url: "https://api.xixapay.com/api/v1/createVirtualAccount",
      payload: xixapayPayload,
      hasSecretKey: !!secretKey,
      hasApiKey: !!apiKey,
      hasBusinessId: !!businessId,
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

    console.log("XixaPay response:", {
      status: xixapayData.status,
      message: xixapayData.message,
      accountsCount: xixapayData.bankAccounts?.length,
    });

    // Log the full response
    console.log("XixaPay Full Response:", {
      status: xixapayResponse.status,
      ok: xixapayResponse.ok,
      data: xixapayData,
      bankAccountsCount: xixapayData.bankAccounts?.length,
    });

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

    // Store in database
    const accountRecords = bankAccounts.map((bank: any) => ({
      reseller_id: input.resellerId,
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
      .from("reseller_virtual_accounts")
      .insert(accountRecords);

    if (insertError) {
      console.error("Insert error:", insertError);
      return { error: "Failed to save virtual account. Please try again." };
    }

    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Virtual account created successfully!",
      virtualEmail,
      accounts: bankAccounts.map((bank: any) => ({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
      })),
    };
  } catch (error) {
    console.error("Create virtual account error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
