// src/actions/reseller/customers/createGlobalCustomerVirtualAccount.ts
//
// Task 4, pointer 1.c.ii.zi.x. Multi-country equivalent of legacy's
// src/app/actions/reseller/wallet/customerVirtualAccount.ts's
// createCustomerVirtualAccount. In practice this is xixapay-only today
// (Nigeria, via the BVN/waitlist mechanism - see HANDOVER.md Task 4
// "Reality check" #5), but deliberately does not hardcode a country
// check: a reseller whose country isn't xixapay-backed simply gets an
// error back from the config check or the API call below, rather than
// a special-cased "NG only" gate here. See HANDOVER.md Task 4 for full
// context.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";

// Server-only env vars (no NEXT_PUBLIC_ prefix), matching the
// convention already established in src/lib/payments/xixapay.ts.
// Legacy's customerVirtualAccount.ts reads NEXT_PUBLIC_XIXAPAY_*
// instead, which unnecessarily exposes these to the client bundle
// even though they're only ever read inside "use server" actions.
// Not fixing legacy's version as part of this task (out of scope) -
// just not repeating it here.
const XIXAPAY_API_KEY = process.env.XIXAPAY_API_KEY || "";
const XIXAPAY_SECRET_KEY = process.env.XIXAPAY_SECRET_KEY || "";
const XIXAPAY_BUSINESS_ID = process.env.XIXAPAY_BUSINESS_ID || "";

interface CreateGlobalCustomerVirtualAccountResult {
  success?: boolean;
  error?: string;
  message?: string;
  accounts?: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
}

/**
 * Create a virtual account for a reseller's customer (auto-assigns a
 * BVN from the shared waitlist, same mechanism as the legacy and
 * reseller-side flows).
 */
export async function createGlobalCustomerVirtualAccount(
  resellerId: string,
  storeSlug: string,
): Promise<CreateGlobalCustomerVirtualAccountResult> {
  try {
    const admin = createAdminClient();
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "You must be logged in" };
    }

    // Resolve the customer record first. global_customer_virtual_accounts
    // has no auth_user_id column (unlike legacy's
    // reseller_customer_virtual_accounts), so - unlike legacy - this
    // can't check for an existing account by auth_user_id directly.
    // Doing the customer lookup first and then filtering the
    // existing-account check by customer_id instead achieves the same
    // result without a schema change - see HANDOVER.md Task 4,
    // "Findings ... 1.c.i" for why this was flagged.
    const { data: customer, error: customerError } = await admin
      .from("global_customers")
      .select("id, first_name, email")
      .eq("reseller_id", resellerId)
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return { error: "Customer record not found. Please contact support." };
    }

    const { data: existingAccount } = await admin
      .from("global_customer_virtual_accounts")
      .select("id")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customer.id)
      .eq("status", "active")
      .limit(1);

    if (existingAccount?.length) {
      return {
        error: "You already have an active virtual account in this store",
      };
    }

    // global_customers has no bvn column (unlike legacy's
    // reseller_customers.bvn), so - unlike legacy - this always draws
    // a fresh waitlist entry rather than checking for a previously-
    // assigned one first. This is safe in practice: the
    // existing-account check above already blocks a second call once
    // an account exists, so legacy's "customer already has a BVN but
    // no account" branch never actually applies here. A deliberate
    // simplification, not an oversight - flagged in HANDOVER.md.
    const { data: waitlistEntry, error: waitlistError } = await admin
      .from("waitlist")
      .select("id, full_name, bvn, mobile")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (waitlistError || !waitlistEntry || waitlistEntry.length === 0) {
      return { error: "Denied. Please contact support." };
    }

    const entry = waitlistEntry[0];
    const bvnToUse = entry.bvn;
    const waitlistName = entry.full_name;
    const waitlistPhone = entry.mobile;

    if (!bvnToUse || !/^\d{11}$/.test(bvnToUse)) {
      return { error: "Invalid BVN format. Please contact support." };
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
      return { error: "Failed to reserve BVN. Please try again." };
    }

    if (!XIXAPAY_SECRET_KEY || !XIXAPAY_API_KEY || !XIXAPAY_BUSINESS_ID) {
      console.error("Missing Xixapay config");
      return {
        error:
          "Payment provider configuration missing. Please contact support.",
      };
    }

    // Same synthetic-email-per-store pattern used for auth (see
    // useCustomerAuth.ts / registerCustomerToGlobalReseller.ts) - a
    // fresh per-call suffix here matches legacy's behavior exactly
    // (legacy doesn't reuse the customer's stored auth_email for this
    // purpose either, it generates a new one every call).
    const [localPart, domain] = customer.email.split("@");
    const suffix = Math.floor(Math.random() * 9) + 1;
    const separator = localPart.includes("+") ? "" : "+";
    const virtualEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;

    const xixapayPayload = {
      email: virtualEmail,
      name: waitlistName,
      phoneNumber: waitlistPhone,
      bankCode: ["20867"], // PalmPay - matches legacy and xixapay.ts's SUPPORTED_BANKS default
      businessId: XIXAPAY_BUSINESS_ID,
      accountType: "static",
      id_type: "bvn",
      id_number: bvnToUse,
    };

    const xixapayResponse = await fetch(
      "https://api.xixapay.com/api/v1/createVirtualAccount",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${XIXAPAY_SECRET_KEY}`,
          "api-key": XIXAPAY_API_KEY,
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

    // global_customer_virtual_accounts has no customer_email/
    // customer_name/customer_phone/customer_bvn/customer_nin columns
    // (unlike legacy's reseller_customer_virtual_accounts) - only the
    // fields below are actually storable today. Not proposing a
    // follow-up migration within this atomic step; flagged in
    // HANDOVER.md in case it's needed later (e.g. support/lookup
    // tooling that needs to see which BVN backs which account).
    const accountRecords = bankAccounts.map(
      (bank: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        bankCode?: string;
        accountType?: string;
        Reserved_Account_Id?: string;
      }) => ({
        reseller_id: resellerId,
        customer_id: customer.id,
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_name: bank.accountName,
        bank_code: bank.bankCode || "20867",
        account_type: bank.accountType || "static",
        tracking_reference: bank.Reserved_Account_Id,
        provider: "xixapay",
        status: "active",
      }),
    );

    const { error: insertError } = await admin
      .from("global_customer_virtual_accounts")
      .insert(accountRecords);

    if (insertError) {
      console.error("Insert error:", insertError);
      return { error: "Failed to save virtual account. Please try again." };
    }

    // Ensure a wallet exists. registerCustomerToGlobalReseller already
    // creates one on signup, but this stays resilient the same way
    // getGlobalCustomerWallet's read path does, in case that earlier
    // insert failed and was only logged rather than retried.
    const { data: wallet } = await admin
      .from("global_customer_wallets")
      .select("id")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (!wallet) {
      const { data: reseller } = await admin
        .from("global_reseller_applications")
        .select("country_code")
        .eq("id", resellerId)
        .single();

      // Resolve currency from the reseller's own country, same as
      // registerCustomerToGlobalReseller does, rather than leaving it
      // to global_customer_wallets.currency's USD default.
      const currency = reseller
        ? getCountryConfig(reseller.country_code).currency
        : "USD";

      await admin.from("global_customer_wallets").insert({
        reseller_id: resellerId,
        customer_id: customer.id,
        balance: 0,
        currency,
        total_spent: 0,
      });
    }

    return {
      success: true,
      message:
        "Virtual account created successfully! You can now fund your wallet.",
      accounts: bankAccounts.map(
        (bank: {
          bankName: string;
          accountNumber: string;
          accountName: string;
        }) => ({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
        }),
      ),
    };
  } catch (error) {
    console.error("Create global customer virtual account error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
