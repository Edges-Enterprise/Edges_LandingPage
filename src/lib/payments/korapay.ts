// src/lib/payments/korapay.ts
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentWebhookData,
} from "./payment.types";

const KORAPAY_BASE_URL = "https://api.korapay.com/merchant/api/v1";
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY || "";

// ✅ Feature flag - toggle this when API access is granted
export const USE_DIRECT_API = false;

// Korapay rejects `charges/initialize` with "One or more fields are invalid.
// Please fix them and try again." when customer.name contains any of
// + ( ) % < > = , or when it is empty (all verified live against the
// sandbox). Payer names are derived from the email local part at signup, so
// an alias like `bob+kesh-data1` reaches the gateway verbatim and every such
// funding attempt fails. Replace the rejected set with spaces and fall back
// to a placeholder when nothing usable remains.
export function sanitizeKorapayName(name: string): string {
  const cleaned = (name || "")
    .replace(/[+()%<>=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Customer";
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

function generateReference(prefix: string = "KPY"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Country to currency mapping for Korapay
const COUNTRY_CURRENCY: Record<string, string> = {
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  CM: "XAF",
  CF: "XAF",
  TD: "XAF",
  CG: "XAF",
  GQ: "XAF",
  GA: "XAF",
  CI: "XOF",
  SN: "XOF",
  BF: "XOF",
  BJ: "XOF",
  TG: "XOF",
  NE: "XOF",
  ML: "XOF",
  GN: "XOF",
};

function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "GHS";
}

export const korapay: PaymentGateway = {
  async initiatePayment(
    params: PaymentInitiateParams,
  ): Promise<PaymentInitiateResult> {
    try {
      const {
        resellerId,
        amount,
        currency,
        countryCode,
        source,
        metadata,
        customer,
        returnPath,
      } = params;

      const upperCountry = countryCode.toUpperCase();
      const resolvedCurrency = currency || getCurrencyForCountry(countryCode);
      const reference = generateReference("KPY");

      // A blank key yields `Authorization: Bearer ` and Korapay answers
      // 401 "authorization token is invalid" - wording that reads like a
      // user error but actually means the deployment secret is missing.
      // Report the real cause instead of forwarding the gateway's text.
      if (!KORAPAY_SECRET_KEY) {
        console.error("korapay: missing KORAPAY_SECRET_KEY", {
          env: process.env.VERCEL_ENV,
          deployment: process.env.VERCEL_DEPLOYMENT_ID,
          url: process.env.VERCEL_URL,
          defined: Object.prototype.hasOwnProperty.call(
            process.env,
            "KORAPAY_SECRET_KEY",
          ),
        });
        return {
          success: false,
          reference,
          // Name the environment: this error means the serving deployment
          // has no KORAPAY_SECRET_KEY, which is the case for every Vercel
          // `preview` deployment (the secret is scoped to `production`).
          error: `Payment provider is not configured${
            process.env.VERCEL_ENV ? ` (${process.env.VERCEL_ENV})` : ""
          }. Please contact support.`,
        };
      }

      // A USD charge cannot go through Korapay: the live account has no USD
      // checkout channel, so `/charges/initialize` answers
      // `409 AA021 "You don't have any channel enabled for checkout
      // payment"`. Fail here with the real cause instead of forwarding that.
      // Callers route USD to Flutterwave (see lib/payments/index.ts,
      // resolvePaymentGatewayType); this guards the gateway itself.
      if (resolvedCurrency.toUpperCase() === "USD") {
        return {
          success: false,
          reference,
          error:
            "This currency is not supported for this payment method. " +
            "Please try another currency.",
        };
      }

      // Get reseller details
      const supabase = await import("@/lib/supabase/server").then((m) =>
        m.createServerClient(),
      );
      const { data: application } = await supabase
        .from("global_reseller_applications")
        .select("first_name, last_name, email, phone, store_slug, store_name")
        .eq("id", resellerId)
        .single();

      if (!application) {
        return {
          success: false,
          reference,
          error: "Reseller not found",
        };
      }

      const customerName =
        customer?.name ||
        `${application.first_name} ${application.last_name}`.trim() ||
        application.store_name ||
        "Customer";
      const customerEmail =
        customer?.email ||
        application.email ||
        `customer-${resellerId}@edges.com`;

      // ✅ Build payload for Checkout Redirect
      const payload = {
        amount,
        currency: resolvedCurrency,
        reference,
        customer: {
          name: sanitizeKorapayName(customerName),
          email: customerEmail,
        },
        merchant_bears_cost: true,
        narration: `Wallet funding for ${application.store_slug || "reseller"}`,
        metadata: {
          reseller_id: resellerId,
          country_code: countryCode,
          source,
          payment_type: "wallet_funding",
          ...metadata,
        },
        channels: ["mobile_money"],
        default_channel: "mobile_money",
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?reference=${reference}${returnPath ? `&returnTo=${encodeURIComponent(returnPath)}` : ""}`,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/korapay`,
      };

      console.log("📤 Korapay Checkout Redirect Request:");
      console.log("URL:", `${KORAPAY_BASE_URL}/charges/initialize`);
      console.log("Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${KORAPAY_BASE_URL}/charges/initialize`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("📥 Response Status:", response.status);
      console.log("📥 Response Text:", responseText.substring(0, 500));

      // ✅ Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON. Response was HTML.");
        return {
          success: false,
          reference,
          error:
            "Payment service returned an error. Please check your API credentials.",
        };
      }

      if (!response.ok || data.status === false) {
        return {
          success: false,
          reference,
          error: data.message || "Payment failed",
        };
      }

      return {
        success: true,
        reference: data.data?.reference || reference,
        providerReference: data.data?.reference || "",
        redirectUrl: data.data?.checkout_url,
        authModel: "REDIRECT",
      };
    } catch (error) {
      console.error("❌ Korapay initiatePayment error:", error);
      return {
        success: false,
        reference: generateReference("KPY"),
        error:
          error instanceof Error ? error.message : "Payment failed",
      };
    }
  },

  // src/lib/payments/korapay.ts
  // Update the verifyWebhook method:

  async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
    try {
      const signature = headers.get("x-korapay-signature");
      if (!signature) {
        console.warn("Korapay webhook: Missing x-korapay-signature header");
        return false;
      }

      // ⚠️ IMPORTANT: Korapay signs ONLY the data object, not the full body
      const dataToSign = body.data || body;
      const payload = JSON.stringify(dataToSign);

      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", KORAPAY_SECRET_KEY)
        .update(payload)
        .digest("hex");

      const isValid = hash === signature;

      if (!isValid) {
        console.warn("Korapay webhook: Signature verification failed", {
          expected: hash,
          received: signature,
        });
      }

      return isValid;
    } catch (error) {
      console.error("Korapay verifyWebhook error:", error);
      return false;
    }
  },
  
  parseWebhook(body: any): PaymentWebhookData {
    const { event, data } = body;
    const eventData = data || body.data || {};

    const isSuccess =
      event === "charge.success" ||
      event === "transfer.success" ||
      eventData.status === "success" ||
      eventData.transaction_status === "success";

    return {
      reference: eventData.payment_reference || eventData.reference || "",
      status: isSuccess ? "completed" : "failed",
      providerReference:
        eventData.reference || eventData.transaction_reference || "",
      amount:
        parseFloat(eventData.amount) || parseFloat(eventData.amount_paid) || 0,
      currency: eventData.currency || "",
      metadata: {
        event,
        fee: eventData.fee,
        payment_method:
          eventData.payment_method || eventData.type || "mobile_money",
        transaction_status: eventData.transaction_status,
        amount_expected: eventData.amount_expected,
        narration: eventData.narration,
        batch_reference: eventData.batch_reference,
        trace_id: eventData.trace_id,
        ...eventData.metadata,
      },
      customer: eventData.customer
        ? {
            name: eventData.customer.name,
            email: eventData.customer.email,
          }
        : undefined,
    };
  },

  async getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
      const response = await fetch(`${KORAPAY_BASE_URL}/charges/${reference}`, {
        method: "GET",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok || data.status === false) {
        return {
          status: "failed",
          providerReference: reference,
        };
      }

      const statusMap: Record<string, "completed" | "failed" | "pending"> = {
        success: "completed",
        failed: "failed",
        processing: "pending",
        pending: "pending",
      };

      return {
        status: statusMap[data.data?.status] || "pending",
        amount: parseFloat(data.data?.amount) || 0,
        currency: data.data?.currency || "",
        providerReference: data.data?.reference || reference,
      };
    } catch (error) {
      console.error("Korapay getTransactionStatus error:", error);
      return {
        status: "pending",
        providerReference: reference,
      };
    }
  },

  getMobileMoneyNetworks(countryCode: string): string[] {
    return [];
  },

  supportsMobileMoney(countryCode: string): boolean {
    return true;
  },

  async getBanks(): Promise<Array<{ bankName: string; bankCode: string }>> {
    return [];
  },

  /**
   * Resolves a bank account so a withdrawal can be checked before money moves.
   * Korapay's `currency` field here is a currency code despite the docs
   * calling it a country (they show "KE" but the field takes "KES").
   */
  async verifyBankAccount(
    bankCode: string,
    accountNumber: string,
    currency: string = "NGN",
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    try {
      const response = await fetch(`${KORAPAY_BASE_URL}/misc/banks/resolve`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          bank: bankCode,
          account: accountNumber,
          currency,
        }),
      });

      const data = await response.json();

      if (data.status === true && data.data?.account_name) {
        return { success: true, accountName: data.data.account_name };
      }

      return {
        success: false,
        error: data.message || "Account verification failed",
      };
    } catch (error) {
      console.error("Korapay verifyBankAccount error:", error);
      return { success: false, error: "Verification failed. Please try again." };
    }
  },

  /**
   * Sends a withdrawal to a bank account.
   *
   * A `true` status means Korapay accepted the payout, not that the money has
   * landed — it comes back as `processing` and settles later. Callers must not
   * treat this as final; confirm with `getPayoutStatus`.
   */
  async processPayout(params: {
    resellerId: string;
    amount: number;
    currency: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    narration?: string;
    reference?: string;
    customerEmail?: string;
  }): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
    pending?: boolean;
    definitive?: boolean;
  }> {
    try {
      const {
        amount,
        currency,
        bankCode,
        accountNumber,
        accountName,
        narration,
        reference,
        customerEmail,
        resellerId,
      } = params;

      // Korapay requires at least 5 characters and rejects duplicates.
      const payoutReference =
        reference || generateReference(`KPY-W-${resellerId.slice(0, 8)}`);

      const response = await fetch(
        `${KORAPAY_BASE_URL}/transactions/disburse`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            reference: payoutReference,
            destination: {
              type: "bank_account",
              amount: Number(amount.toFixed(2)),
              currency,
              narration: narration || "Wallet withdrawal",
              bank_account: {
                bank: bankCode,
                account: accountNumber,
              },
              customer: {
                name: accountName,
                email: customerEmail || "payouts@edges.enterprise",
              },
            },
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.status === true) {
        return {
          success: true,
          reference: data.data?.reference || payoutReference,
          // Accepted but unsettled: the caller keeps the withdrawal pending
          // and lets the status poll or webhook close it.
          pending: data.data?.status === "processing",
          definitive: true,
        };
      }

      return {
        success: false,
        error: data.message || "Payout failed",
        reference: payoutReference,
        definitive: true,
      };
    } catch (error) {
      console.error("Korapay processPayout error:", error);
      // Unknown outcome: the request may have reached Korapay. Callers must
      // not refund on this, or a payout that did go through is paid twice.
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payout failed",
        definitive: false,
      };
    }
  },

  async getPayoutStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
      const response = await fetch(
        `${KORAPAY_BASE_URL}/transactions/disburse/${reference}`,
        { method: "GET", headers: getHeaders() },
      );

      const data = await response.json();

      if (!response.ok || data.status === false) {
        // A 404 means Korapay never accepted the payout, so nothing moved and
        // the caller should refund. Any other error is unknown: stay pending
        // rather than refunding a payout that may still settle.
        return {
          status: response.status === 404 ? "failed" : "pending",
          providerReference: reference,
        };
      }

      const statusMap: Record<string, "completed" | "failed" | "pending"> = {
        success: "completed",
        successful: "completed",
        failed: "failed",
        processing: "pending",
        pending: "pending",
      };

      return {
        status: statusMap[data.data?.status] || "pending",
        amount: parseFloat(data.data?.amount) || 0,
        currency: data.data?.currency || "",
        providerReference: data.data?.reference || reference,
      };
    } catch (error) {
      console.error("Korapay getPayoutStatus error:", error);
      return { status: "pending", providerReference: reference };
    }
  },
};
