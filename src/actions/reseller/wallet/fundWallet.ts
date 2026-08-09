// src/actions/reseller/wallet/fundWallet.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { getPaymentGatewayByCountry } from "@/lib/payments";
import { PaymentInitiateParams } from "@/lib/payments/payment.types";

interface FundWalletParams {
  amount: number;
  currency?: string;
  source?: "web" | "app";
  countryCode: string;
  mobileMoney?: {
    number: string;
    network?: string;
  };
}

export async function fundWallet({
  amount,
  currency,
  source = "web",
  countryCode,
  mobileMoney,
}: FundWalletParams): Promise<{
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
      .select("id, email, first_name, last_name, phone")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Get country configuration
    const config = getCountryConfig(countryCode);
    const currencyCode = currency || config.currency;
    const gatewayProvider = config.paymentGateway?.provider || "korapay";

    // Get payment gateway for this country
    const gateway = getPaymentGatewayByCountry(countryCode);

    // Build initiate params
    const initiateParams: PaymentInitiateParams = {
      resellerId: application.id,
      amount,
      currency: currencyCode,
      countryCode,
      source,
      // ✅ Only 5 metadata keys (Korapay limit)
      metadata: {
        reseller_id: application.id,
        country_code: countryCode,
        source,
        payment_type: "wallet_funding",
        customer: `${application.first_name} ${application.last_name}`.trim(),
      },
    };

    // Add mobileMoney for Flutterwave (RW, UG)
    if (gatewayProvider === "flutterwave" && mobileMoney?.number) {
      initiateParams.mobileMoney = {
        number: mobileMoney.number,
        network: mobileMoney.network,
      };
    }

    // For Xixapay, we need customer details for virtual account creation
    if (gatewayProvider === "xixapay") {
      initiateParams.customer = {
        name: `${application.first_name} ${application.last_name}`.trim(),
        email: application.email,
      };
      if (application.phone) {
        initiateParams.mobileMoney = {
          number: application.phone,
        };
      }
    }

    // Initiate payment with the gateway
    const paymentResult = await gateway.initiatePayment(initiateParams);

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error || "Payment initiation failed",
      };
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    const { data: transaction, error: txError } = await adminClient
      .from("global_transactions")
      .insert({
        reseller_id: application.id,
        type: "credit",
        amount,
        description: `Wallet funding via ${gatewayProvider}`,
        status: "pending",
        reference: paymentResult.reference,
        payment_gateway: gatewayProvider,
        metadata: {
          gateway: gatewayProvider,
          source,
          currency: currencyCode,
          provider_reference: paymentResult.providerReference,
          redirect_url: paymentResult.redirectUrl,
          auth_model: paymentResult.authModel,
          mobile_money: mobileMoney,
          customer_email: application.email,
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
    console.error("Fund wallet error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to initiate payment",
    };
  }
}

