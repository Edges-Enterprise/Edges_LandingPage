// supabase/functions/global-create-customer-virtual-account/index.ts
//
// Task 8, branch 8.e.v. The mobile app's "Create Virtual Account" button
// called the legacy `create-mobile-customer-virtual-account` function, which
// resolves the store by name and is dead under the global_* model - it
// returns 404 "Store not found" for every store (verified live 2026-10-20
// against roseline, toms-sub, kwams-sub, marcel-data and others, by slug
// *and* by store_name).
//
// This is the global_* equivalent, mirroring the web action
// src/actions/reseller/customers/createGlobalCustomerVirtualAccount.ts
// (Task 4, pointer 1.c.ii.zi.x). Same behaviour, run with the service role,
// with the store taken from the caller's JWT rather than a request-supplied
// name.
//
// Identity invariant (see _shared/storeIdentity.ts): the reseller is taken
// from the token, never from the body. Only a *customer* of the store may
// create a customer virtual account; a reseller calling this is rejected.
import {
  adminClient,
  corsHeaders,
  jsonResponse,
  resolveStoreIdentity,
} from "../_shared/storeIdentity.ts";
import { getCountryCurrency } from "../_shared/countryCurrency.ts";

const XIXAPAY_API_KEY = Deno.env.get("XIXAPAY_API_KEY") || "";
const XIXAPAY_SECRET_KEY = Deno.env.get("XIXAPAY_SECRET_KEY") || "";
const XIXAPAY_BUSINESS_ID = Deno.env.get("XIXAPAY_BUSINESS_ID") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { resellerId } = await req.json();

    const admin = adminClient();
    const resolved = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );

    if (resolved.error) {
      return jsonResponse({ error: resolved.error }, resolved.status ?? 401);
    }
    if (!resolved.identity) {
      return jsonResponse(
        { error: "Customer record not found. Please contact support." },
        404,
      );
    }
    if (resolved.identity.userType !== "customer") {
      return jsonResponse(
        { error: "Only a store customer can create a customer virtual account." },
        403,
      );
    }

    const storeId = resolved.identity.resellerId;
    const customerId = resolved.identity.customerId!;

    const { data: customer } = await admin
      .from("global_customers")
      .select("id, first_name, email")
      .eq("id", customerId)
      .single();

    if (!customer) {
      return jsonResponse(
        { error: "Customer record not found. Please contact support." },
        404,
      );
    }

    const { data: store } = await admin
      .from("global_reseller_applications")
      .select("store_slug, country_code")
      .eq("id", storeId)
      .single();

    if (!store) {
      return jsonResponse({ error: "Store not found" }, 404);
    }

    // global_customer_virtual_accounts has no auth_user_id column, so the
    // existing-account check is scoped by customer_id (same as the web
    // action).
    const { data: existingAccount } = await admin
      .from("global_customer_virtual_accounts")
      .select("id")
      .eq("reseller_id", storeId)
      .eq("customer_id", customerId)
      .eq("status", "active")
      .limit(1);

    if (existingAccount?.length) {
      return jsonResponse(
        { error: "You already have an active virtual account in this store" },
        400,
      );
    }

    // Draw a fresh BVN from the waitlist. global_customers has no bvn
    // column, so - unlike legacy - there is no previously-assigned BVN to
    // reuse; the existing-account check above already blocks a second call.
    const { data: waitlistEntry } = await admin
      .from("waitlist")
      .select("id, full_name, bvn, mobile")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (!waitlistEntry || waitlistEntry.length === 0) {
      return jsonResponse({ error: "Denied. Please contact support." }, 400);
    }

    const entry = waitlistEntry[0];
    const bvnToUse = entry.bvn;
    const waitlistName = entry.full_name;
    const waitlistPhone = entry.mobile;

    if (!bvnToUse || !/^\d{11}$/.test(bvnToUse)) {
      return jsonResponse(
        { error: "Invalid BVN format. Please contact support." },
        400,
      );
    }

    if (!XIXAPAY_SECRET_KEY || !XIXAPAY_API_KEY || !XIXAPAY_BUSINESS_ID) {
      console.error("Missing Xixapay config");
      return jsonResponse(
        { error: "Payment provider configuration missing. Please contact support." },
        500,
      );
    }

    const { error: reserveError } = await admin
      .from("waitlist")
      .update({
        status: "used",
        assigned_to: resolved.identity.userId,
        assigned_to_type: "customer",
        used_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    if (reserveError) {
      return jsonResponse(
        { error: "Failed to reserve BVN. Please try again." },
        400,
      );
    }

    // Same synthetic-email-per-store pattern the app uses for auth; a fresh
    // per-call suffix matches the web action and legacy exactly.
    const [localPart, domain] = customer.email.split("@");
    const suffix = Math.floor(Math.random() * 9) + 1;
    const separator = localPart.includes("+") ? "" : "+";
    const virtualEmail = `${localPart}${separator}${store.store_slug}${suffix}@${domain}`;

    const xixapayResponse = await fetch(
      "https://api.xixapay.com/api/v1/createVirtualAccount",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${XIXAPAY_SECRET_KEY}`,
          "api-key": XIXAPAY_API_KEY,
        },
        body: JSON.stringify({
          email: virtualEmail,
          name: waitlistName,
          phoneNumber: waitlistPhone,
          bankCode: ["20867"], // PalmPay - matches legacy and xixapay.ts's default
          businessId: XIXAPAY_BUSINESS_ID,
          accountType: "static",
          id_type: "bvn",
          id_number: bvnToUse,
        }),
      },
    );

    const xixapayData = await xixapayResponse.json();

    if (!xixapayResponse.ok || xixapayData.status !== "success") {
      return jsonResponse(
        {
          error:
            xixapayData.message ||
            "Failed to create virtual account. Please try again.",
        },
        400,
      );
    }

    const bankAccounts = xixapayData.bankAccounts || [];
    if (bankAccounts.length === 0) {
      return jsonResponse({ error: "No virtual accounts were created" }, 400);
    }

    const accountRecords = bankAccounts.map(
      (bank: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        bankCode?: string;
        accountType?: string;
        Reserved_Account_Id?: string;
      }) => ({
        reseller_id: storeId,
        customer_id: customerId,
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
      console.error("global-create-customer-virtual-account insert error:", insertError);
      return jsonResponse(
        { error: "Failed to save virtual account. Please try again." },
        400,
      );
    }

    // Ensure a wallet exists (signup normally created it; this stays
    // resilient the same way the read path does).
    const { data: wallet } = await admin
      .from("global_customer_wallets")
      .select("id")
      .eq("reseller_id", storeId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (!wallet) {
      await admin.from("global_customer_wallets").insert({
        reseller_id: storeId,
        customer_id: customerId,
        balance: 0,
        currency: getCountryCurrency(store.country_code),
        total_spent: 0,
      });
    }

    return jsonResponse({
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
    });
  } catch (error) {
    console.error("global-create-customer-virtual-account error:", error);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});
