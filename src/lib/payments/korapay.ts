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
      } = params;

      const upperCountry = countryCode.toUpperCase();
      const resolvedCurrency = currency || getCurrencyForCountry(countryCode);
      const reference = generateReference("KPY");

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
          name: customerName,
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
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?reference=${reference}`,
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
          error: data.message || "Korapay payment failed",
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
          error instanceof Error ? error.message : "Korapay payment failed",
      };
    }
  },

  async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
    try {
      const signature = headers.get("x-korapay-signature");
      if (!signature) return false;

      const payload = JSON.stringify(body.data || body);
      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", KORAPAY_SECRET_KEY)
        .update(payload)
        .digest("hex");

      return hash === signature;
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
};