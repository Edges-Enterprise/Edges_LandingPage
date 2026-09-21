// src/actions/reseller/customers/fundGlobalCustomerWallet.ts
//
// Task 4, pointer 1.c.iv.zi.x. Multi-country equivalent of the
// reseller-side src/actions/reseller/wallet/fundWallet.ts, customer-
// scoped. Mobile-money funding (korapay/flutterwave countries) only -
// xixapay countries fund via the persistent virtual account created by
// createGlobalCustomerVirtualAccount.ts (1.c.ii) instead, so this
// action deliberately returns early with a clear error if called for
// an xixapay-gateway reseller, rather than silently doing the wrong
// thing. That's a config-driven branch (config.paymentGateway.provider),
// not a hardcoded country check.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { getPaymentGatewayByCountry } from "@/lib/payments";
import { PaymentInitiateParams } from "@/lib/payments/payment.types";

interface FundGlobalCustomerWalletParams {
  resellerId: string;
  amount: number;
  countryCode: string;
  source?: "web" | "app";
  mobileMoney?: {
    number: string;
    network?: string;
  };
}

interface FundGlobalCustomerWalletResult {
  success: boolean;
  data?: {
    transaction_id: string;
    reference: string;
    paymentUrl?: string;
    redirectUrl?: string;
    providerReference?: string;
    authModel?: string;
  };
  error?: string;
}

export async function fundGlobalCustomerWallet({
  resellerId,
  amount,
  countryCode,
  source = "web",
  mobileMoney,
}: FundGlobalCustomerWalletParams): Promise<FundGlobalCustomerWalletResult> {
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

    // Resolve the customer record (mirrors createGlobalCustomerVirtualAccount's
    // lookup pattern - see 1.c.ii's findings for why this comes before
    // any wallet/account lookup rather than trusting a client-supplied
    // customer id).
    const { data: customer, error: customerError } = await supabase
      .from("global_customers")
      .select("id, first_name, last_name, email")
      .eq("reseller_id", resellerId)
      .eq("auth_user_id", user.id)
      .single();

    if (customerError || !customer) {
      return { success: false, error: "Customer record not found" };
    }

    const config = getCountryConfig(countryCode);
    const currencyCode = config.currency;
    const gatewayProvider = config.paymentGateway?.provider;

    // xixapay countries fund via the persistent virtual account
    // (1.c.ii) instead of an initiate-payment call - see file header.
    if (gatewayProvider === "xixapay") {
      return {
        success: false,
        error:
          "This store funds wallets by bank transfer to a virtual account. Use the virtual account flow instead of card/mobile-money funding.",
      };
    }

    const gateway = getPaymentGatewayByCountry(countryCode);
    const customerName =
      `${customer.first_name} ${customer.last_name}`.trim() ||
      customer.email;

    const initiateParams: PaymentInitiateParams = {
      resellerId,
      amount,
      currency: currencyCode,
      countryCode,
      source,
      customer: {
        name: customerName,
        email: customer.email,
      },
      // Korapay limits metadata to 5 keys - matches fundWallet.ts's
      // comment/constraint exactly, plus customer_id since this is
      // what a future webhook-completion handler needs to tell a
      // customer deposit apart from a reseller one.
      metadata: {
        reseller_id: resellerId,
        customer_id: customer.id,
        country_code: countryCode,
        source,
        payment_type: "customer_wallet_funding",
      },
    };

    if (gatewayProvider === "flutterwave" && mobileMoney?.number) {
      initiateParams.mobileMoney = {
        number: mobileMoney.number,
        network: mobileMoney.network,
      };
    }

    const paymentResult = await gateway.initiatePayment(initiateParams);

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error || "Payment initiation failed",
      };
    }

    const adminClient = createAdminClient();

    // Insert into global_customer_transactions (1.c.iii), not
    // global_transactions - the latter has no customer_id column at
    // all, see that pointer's findings. previous_balance/new_balance
    // are both set to the pre-deposit balance here since this is a
    // *pending* record - the real balance change happens on webhook
    // completion (see "Next atomic step" below - that handler doesn't
    // exist yet for customers).
    const { data: wallet } = await adminClient
      .from("global_customer_wallets")
      .select("balance")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customer.id)
      .maybeSingle();

    const currentBalance = wallet?.balance ?? 0;

    const { data: transaction, error: txError } = await adminClient
      .from("global_customer_transactions")
      .insert({
        reseller_id: resellerId,
        customer_id: customer.id,
        type: "deposit",
        amount,
        net_amount: amount,
        previous_balance: currentBalance,
        new_balance: currentBalance, // updated for real on completion, not here
        description: `Wallet funding via ${gatewayProvider}`,
        status: "pending",
        reference: paymentResult.reference,
        payment_gateway: gatewayProvider,
        // global_customer_transactions has no dedicated provider_reference
        // or completed_at columns (mirrors reseller_customer_transactions,
        // which also has neither) - unlike the reseller-side
        // handleSuccessfulDeposit.ts, which references both columns on
        // global_transactions even though that table doesn't have them
        // either (a pre-existing bug, flagged in HANDOVER.md, not fixed
        // here as it's out of this task's scope). Storing the
        // equivalent data in metadata instead of repeating that bug.
        metadata: {
          gateway: gatewayProvider,
          source,
          currency: currencyCode,
          provider_reference: paymentResult.providerReference,
          redirect_url: paymentResult.redirectUrl,
          auth_model: paymentResult.authModel,
          mobile_money: mobileMoney,
          customer_email: customer.email,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      return {
        success: false,
        error: "Failed to create transaction record",
      };
    }

    return {
      success: true,
      data: {
        transaction_id: transaction?.id || "",
        reference: paymentResult.reference,
        paymentUrl: paymentResult.paymentUrl,
        redirectUrl: paymentResult.redirectUrl,
        providerReference: paymentResult.providerReference,
        authModel: paymentResult.authModel,
      },
    };
  } catch (error) {
    console.error("Fund global customer wallet error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to initiate payment",
    };
  }
}
