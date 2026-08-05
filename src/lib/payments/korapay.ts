// src/lib/payments/korapay.ts
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentWebhookData,
} from "./payment.types";

const KORAPAY_BASE_URL = "https://api.korapay.com/merchant/api/v1";
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY || "";

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

// Mobile money networks supported by Korapay by country
const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
  GH: ["MTN", "AIRTEL_TIGO", "VODAFONE"],
  KE: ["MPESA", "AIRTEL", "EQUITEL"],
  CM: ["MTN", "ORANGE"],
  CI: ["MTN", "ORANGE", "MOOV", "WAVE"],
  SN: ["MTN", "ORANGE", "MOOV", "WAVE"],
  BF: ["MTN", "ORANGE", "MOOV", "WAVE"],
  BJ: ["MTN", "ORANGE", "MOOV", "WAVE"],
  TG: ["MTN", "ORANGE", "MOOV", "WAVE"],
  NE: ["MTN", "ORANGE", "MOOV", "WAVE"],
  ML: ["MTN", "ORANGE", "MOOV", "WAVE"],
  GN: ["MTN", "ORANGE", "MOOV", "WAVE"],
  CF: ["MTN", "ORANGE"],
  TD: ["MTN", "ORANGE"],
  CG: ["MTN", "ORANGE"],
  GQ: ["MTN", "ORANGE"],
  GA: ["MTN", "ORANGE"],
};

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

// Countries that support mobile money on Korapay
const MOBILE_MONEY_COUNTRIES = new Set([
  "GH",
  "KE",
  "CM",
  "CI",
  "SN",
  "BF",
  "BJ",
  "TG",
  "NE",
  "ML",
  "GN",
  "CF",
  "TD",
  "CG",
  "GQ",
  "GA",
]);

// Countries that support bank transfers (EFTs) on Korapay
const BANK_TRANSFER_COUNTRIES = new Set(["ZA"]);

function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "GHS";
}

function getDefaultNetwork(countryCode: string): string {
  const networks = MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()];
  return networks?.[0] || "MTN";
}

function supportsMobileMoney(countryCode: string): boolean {
  return MOBILE_MONEY_COUNTRIES.has(countryCode.toUpperCase());
}

function supportsBankTransfer(countryCode: string): boolean {
  return BANK_TRANSFER_COUNTRIES.has(countryCode.toUpperCase());
}

export const korapay: PaymentGateway = {
  /**
   * Initiate a payment using Korapay
   * - Mobile Money: GH, KE, CM, CI, SN, BF, BJ, TG, NE, ML, GN, CF, TD, CG, GQ, GA
   * - Bank Transfer (EFT): ZA (South Africa)
   *
   * NOTE: NGN is handled by Xixapay, NOT Korapay
   */
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
        mobileMoney,
      } = params;

      const upperCountry = countryCode.toUpperCase();
      const resolvedCurrency = currency || getCurrencyForCountry(countryCode);
      const reference = generateReference("KPY");

      // Get reseller details for customer info
      const supabase = await import("@/lib/supabase/server").then((m) =>
        m.createServerClient(),
      );
      const { data: application } = await supabase
        .from("global_reseller_applications")
        .select("first_name, last_name, email, phone, store_slug")
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
        "Customer";
      const customerEmail =
        customer?.email ||
        application.email ||
        `customer-${resellerId}@edges.com`;

      // ============================================================
      // 1. MOBILE MONEY PAYMENT (GH, KE, CM, CI, SN, BF, BJ, TG, NE, ML, GN, CF, TD, CG, GQ, GA)
      // ============================================================
      if (supportsMobileMoney(countryCode)) {
        if (!mobileMoney?.number) {
          return {
            success: false,
            reference,
            error:
              "Mobile money number is required for Korapay payments in this country",
          };
        }

        const payload: any = {
          amount,
          currency: resolvedCurrency,
          reference,
          customer: {
            name: customerName,
            email: customerEmail,
          },
          merchant_bears_cost: true,
          description: `Wallet funding for ${application.store_slug || "reseller"}`,
          metadata: {
            reseller_id: resellerId,
            country_code: countryCode,
            source,
            payment_type: "mobile_money",
            ...metadata,
          },
          mobile_money: {
            number: mobileMoney.number,
            network: mobileMoney.network || getDefaultNetwork(countryCode),
          },
        };

        // Call Korapay mobile money charge endpoint
        const response = await fetch(
          `${KORAPAY_BASE_URL}/charges/mobile-money`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();

        // Handle authorization required responses (OTP, STK_PROMPT, REDIRECT)
        if (
          data.code === "AA001" ||
          (data.status === true && data.data?.auth_model)
        ) {
          const authModel = data.data?.auth_model || "STK_PROMPT";
          return {
            success: true,
            reference: data.data?.transaction_reference || reference,
            providerReference:
              data.data?.payment_reference || data.data?.reference || "",
            redirectUrl: data.data?.authorization?.redirect_url,
            authModel: authModel,
          };
        }

        if (!response.ok || data.status === false) {
          return {
            success: false,
            reference,
            error: data.message || "Korapay mobile money payment failed",
          };
        }

        return {
          success: true,
          reference:
            data.data?.transaction_reference ||
            data.data?.reference ||
            reference,
          providerReference: data.data?.payment_reference || "",
          redirectUrl: data.data?.authorization?.redirect_url,
          authModel: data.data?.auth_model,
        };
      }

      // ============================================================
      // 2. BANK TRANSFER (EFT) - ZA (South Africa)
      // ============================================================
      if (supportsBankTransfer(countryCode)) {
        // For South Africa, we use the payout/disburse endpoint
        // Bank details should be passed in the metadata
        const bankDetails = metadata?.bankDetails as
          | {
              bankCode: string;
              accountNumber: string;
              accountName: string;
            }
          | undefined;

        if (!bankDetails) {
          return {
            success: false,
            reference,
            error: "Bank details are required for South Africa bank transfers",
          };
        }

        const payload = {
          reference,
          destination: {
            type: "bank_account",
            amount,
            currency: resolvedCurrency,
            narration: `Wallet funding for ${application.store_slug || "reseller"}`,
            bank_account: {
              bank: bankDetails.bankCode,
              account: bankDetails.accountNumber,
            },
            customer: {
              name: bankDetails.accountName || customerName,
              email: customerEmail,
            },
          },
          metadata: {
            reseller_id: resellerId,
            country_code: countryCode,
            source,
            payment_type: "bank_transfer",
            ...metadata,
          },
        };

        // Call Korapay payout/disburse endpoint for ZAR
        const response = await fetch(
          `${KORAPAY_BASE_URL}/transactions/disburse`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(payload),
          },
        );

        const data = await response.json();

        if (!response.ok || data.status === false) {
          return {
            success: false,
            reference,
            error: data.message || "Korapay bank transfer failed",
          };
        }

        return {
          success: true,
          reference: data.data?.reference || reference,
          providerReference: data.data?.reference || "",
          redirectUrl: undefined,
        };
      }

      // ============================================================
      // 3. UNSUPPORTED COUNTRY
      // ============================================================
      return {
        success: false,
        reference,
        error: `Payment method not supported for ${countryCode.toUpperCase()} on Korapay. Use Xixapay for Nigeria or Flutterwave for Rwanda/Uganda.`,
      };
    } catch (error) {
      console.error("Korapay initiatePayment error:", error);
      return {
        success: false,
        reference: generateReference("KPY"),
        error:
          error instanceof Error ? error.message : "Korapay payment failed",
      };
    }
  },

  /**
   * Verify webhook signature from Korapay
   * Uses x-korapay-signature header with HMAC SHA256
   */
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

      const isValid = hash === signature;
      if (!isValid) {
        console.warn("Korapay webhook signature verification failed");
      }
      return isValid;
    } catch (error) {
      console.error("Korapay verifyWebhook error:", error);
      return false;
    }
  },

  /**
   * Parse webhook data from Korapay
   */
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
        virtual_bank_account_details: eventData.virtual_bank_account_details,
        ...eventData.metadata,
      },
      customer: eventData.customer
        ? {
            name: eventData.customer.name,
            email: eventData.customer.email,
          }
        : undefined,
      sender: eventData.virtual_bank_account_details?.payer_bank_account
        ? {
            name: eventData.virtual_bank_account_details.payer_bank_account
              .account_name,
            account_number:
              eventData.virtual_bank_account_details.payer_bank_account
                .account_number,
            bank: eventData.virtual_bank_account_details.payer_bank_account
              .bank_name,
          }
        : undefined,
      receiver: eventData.virtual_bank_account_details?.virtual_bank_account
        ? {
            name: eventData.virtual_bank_account_details.virtual_bank_account
              .account_name,
            account_number:
              eventData.virtual_bank_account_details.virtual_bank_account
                .account_number,
            bank: eventData.virtual_bank_account_details.virtual_bank_account
              .bank_name,
          }
        : undefined,
    };
  },

  /**
   * Get transaction status from Korapay
   */
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

  /**
   * Get payout/transfer status from Korapay
   */
  async getPayoutStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
      const response = await fetch(
        `${KORAPAY_BASE_URL}/transactions/${reference}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

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
      console.error("Korapay getPayoutStatus error:", error);
      return {
        status: "pending",
        providerReference: reference,
      };
    }
  },

  /**
   * Create virtual account - NOT supported by Korapay for these countries
   */
  async createVirtualAccount(
    resellerId: string,
    countryCode: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }> {
    throw new Error(
      "Virtual accounts not supported by Korapay for these countries. Use Xixapay for Nigeria.",
    );
  },

  /**
   * Get supported banks - Korapay has bank lists for each country
   */
  async getBanks(): Promise<Array<{ bankName: string; bankCode: string }>> {
    // Korapay requires countryCode to get banks, but we'll return empty
    return [];
  },

  /**
   * Verify bank account - Korapay supports bank account verification
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

      if (!response.ok || data.status === false) {
        return {
          success: false,
          error: data.message || "Bank account verification failed",
        };
      }

      return {
        success: true,
        accountName: data.data?.account_name || "",
      };
    } catch (error) {
      console.error("Korapay verifyBankAccount error:", error);
      return {
        success: false,
        error: "Verification failed. Please try again.",
      };
    }
  },

  /**
   * Process payout (withdrawal) via Korapay
   */
  async processPayout(params: {
    resellerId: string;
    amount: number;
    currency: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    narration?: string;
  }): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const {
        resellerId,
        amount,
        currency,
        bankCode,
        accountNumber,
        accountName,
        narration,
      } = params;

      const reference = generateReference("KPY-PAYOUT");

      const payload = {
        reference,
        destination: {
          type: "bank_account",
          amount,
          currency,
          narration:
            narration || `Wallet withdrawal for reseller ${resellerId}`,
          bank_account: {
            bank: bankCode,
            account: accountNumber,
          },
          customer: {
            name: accountName,
            email: `reseller-${resellerId}@edges.com`,
          },
        },
        metadata: {
          reseller_id: resellerId,
        },
      };

      const response = await fetch(
        `${KORAPAY_BASE_URL}/transactions/disburse`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status === false) {
        return {
          success: false,
          error: data.message || "Payout failed",
        };
      }

      return {
        success: true,
        reference: data.data?.reference || reference,
      };
    } catch (error) {
      console.error("Korapay processPayout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payout failed",
      };
    }
  },

  /**
   * Process bulk payout via Korapay
   */
  async processBulkPayout(params: {
    resellerId: string;
    batchReference: string;
    currency: string;
    payouts: Array<{
      reference: string;
      amount: number;
      bankCode: string;
      accountNumber: string;
      customerName: string;
      customerEmail: string;
      narration?: string;
    }>;
  }): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { resellerId, batchReference, currency, payouts } = params;

      const payload = {
        batch_reference: batchReference || generateReference("KPY-BATCH"),
        currency,
        merchant_bears_cost: true,
        description: `Bulk payout for reseller ${resellerId}`,
        payouts: payouts.map((p) => ({
          reference: p.reference,
          amount: p.amount,
          type: "bank_account",
          narration: p.narration || "Wallet withdrawal",
          bank_account: {
            bank_code: p.bankCode,
            account_number: p.accountNumber,
          },
          customer: {
            name: p.customerName,
            email: p.customerEmail,
          },
        })),
      };

      const response = await fetch(
        `${KORAPAY_BASE_URL}/transactions/disburse/bulk`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status === false) {
        return {
          success: false,
          error: data.message || "Bulk payout failed",
        };
      }

      return {
        success: true,
        reference: data.data?.reference || batchReference,
      };
    } catch (error) {
      console.error("Korapay processBulkPayout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bulk payout failed",
      };
    }
  },

  /**
   * Get supported mobile money networks for a country
   */
  getMobileMoneyNetworks(countryCode: string): string[] {
    return MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()] || [];
  },

  /**
   * Check if country supports mobile money
   */
  supportsMobileMoney(countryCode: string): boolean {
    return supportsMobileMoney(countryCode);
  },

  /**
   * Check if country supports bank transfers
   */
  supportsBankTransfer(countryCode: string): boolean {
    return supportsBankTransfer(countryCode);
  },
};

// // src/lib/payments/korapay.ts
// import {
//   PaymentGateway,
//   PaymentInitiateParams,
//   PaymentInitiateResult,
//   PaymentWebhookData,
// } from "./payment.types";

// const KORAPAY_BASE_URL = "https://api.korapay.com/merchant/api/v1";
// const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY || "";

// function getHeaders(): HeadersInit {
//   return {
//     Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
//     "Content-Type": "application/json",
//   };
// }

// function generateReference(prefix: string = "KPY"): string {
//   const timestamp = Date.now().toString(36);
//   const random = Math.random().toString(36).substring(2, 8);
//   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// }

// // Mobile money networks supported by Korapay by country
// const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
//   GH: ["MTN", "AIRTEL_TIGO", "VODAFONE"],
//   KE: ["MPESA", "AIRTEL", "EQUITEL"],
//   CM: ["MTN", "ORANGE"],
//   CI: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   SN: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   BF: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   BJ: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   TG: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   NE: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   ML: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   GN: ["MTN", "ORANGE", "MOOV", "WAVE"],
//   CF: ["MTN", "ORANGE"],
//   TD: ["MTN", "ORANGE"],
//   CG: ["MTN", "ORANGE"],
//   GQ: ["MTN", "ORANGE"],
//   GA: ["MTN", "ORANGE"],
// };

// // Country to currency mapping for Korapay
// const COUNTRY_CURRENCY: Record<string, string> = {
//   GH: "GHS",
//   KE: "KES",
//   ZA: "ZAR",
//   CM: "XAF",
//   CF: "XAF",
//   TD: "XAF",
//   CG: "XAF",
//   GQ: "XAF",
//   GA: "XAF",
//   CI: "XOF",
//   SN: "XOF",
//   BF: "XOF",
//   BJ: "XOF",
//   TG: "XOF",
//   NE: "XOF",
//   ML: "XOF",
//   GN: "XOF",
// };

// // Countries that support mobile money on Korapay
// const MOBILE_MONEY_COUNTRIES = new Set([
//   "GH",
//   "KE",
//   "CM",
//   "CI",
//   "SN",
//   "BF",
//   "BJ",
//   "TG",
//   "NE",
//   "ML",
//   "GN",
//   "CF",
//   "TD",
//   "CG",
//   "GQ",
//   "GA",
// ]);

// // Countries that support bank transfers (EFTs) on Korapay
// const BANK_TRANSFER_COUNTRIES = new Set(["ZA"]);

// function getCurrencyForCountry(countryCode: string): string {
//   return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "GHS";
// }

// function getDefaultNetwork(countryCode: string): string {
//   const networks = MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()];
//   return networks?.[0] || "MTN";
// }

// function supportsMobileMoney(countryCode: string): boolean {
//   return MOBILE_MONEY_COUNTRIES.has(countryCode.toUpperCase());
// }

// function supportsBankTransfer(countryCode: string): boolean {
//   return BANK_TRANSFER_COUNTRIES.has(countryCode.toUpperCase());
// }

// export const korapay: PaymentGateway = {
//   /**
//    * Initiate a payment using Korapay
//    * - Mobile Money: GH, KE, CM, CI, SN, BF, BJ, TG, NE, ML, GN, CF, TD, CG, GQ, GA
//    * - Bank Transfer (EFT): ZA (South Africa)
//    *
//    * NOTE: NGN is handled by Xixapay, NOT Korapay
//    */
//   async initiatePayment(
//     params: PaymentInitiateParams,
//   ): Promise<PaymentInitiateResult> {
//     try {
//       const {
//         resellerId,
//         amount,
//         currency,
//         countryCode,
//         source,
//         metadata,
//         customer,
//         mobileMoney,
//       } = params;

//       const upperCountry = countryCode.toUpperCase();
//       const resolvedCurrency = currency || getCurrencyForCountry(countryCode);
//       const reference = generateReference("KPY");

//       // Get reseller details for customer info
//       const supabase = await import("@/lib/supabase/server").then((m) =>
//         m.createServerClient(),
//       );
//       const { data: application } = await supabase
//         .from("global_reseller_applications")
//         .select("first_name, last_name, email, phone, store_slug")
//         .eq("id", resellerId)
//         .single();

//       if (!application) {
//         return {
//           success: false,
//           reference,
//           error: "Reseller not found",
//         };
//       }

//       const customerName =
//         customer?.name ||
//         `${application.first_name} ${application.last_name}`.trim() ||
//         "Customer";
//       const customerEmail =
//         customer?.email ||
//         application.email ||
//         `customer-${resellerId}@edges.com`;

//       // ============================================================
//       // 1. MOBILE MONEY PAYMENT (GH, KE, CM, CI, SN, BF, BJ, TG, NE, ML, GN, CF, TD, CG, GQ, GA)
//       // ============================================================
//       if (supportsMobileMoney(countryCode)) {
//         if (!mobileMoney?.number) {
//           return {
//             success: false,
//             reference,
//             error:
//               "Mobile money number is required for Korapay payments in this country",
//           };
//         }

//         const payload: any = {
//           amount,
//           currency: resolvedCurrency,
//           reference,
//           customer: {
//             name: customerName,
//             email: customerEmail,
//           },
//           merchant_bears_cost: true,
//           description: `Wallet funding for ${application.store_slug || "reseller"}`,
//           metadata: {
//             reseller_id: resellerId,
//             country_code: countryCode,
//             source,
//             payment_type: "mobile_money",
//             ...metadata,
//           },
//           mobile_money: {
//             number: mobileMoney.number,
//             network: mobileMoney.network || getDefaultNetwork(countryCode),
//           },
//         };

//         // Call Korapay mobile money charge endpoint
//         const response = await fetch(
//           `${KORAPAY_BASE_URL}/charges/mobile-money`,
//           {
//             method: "POST",
//             headers: getHeaders(),
//             body: JSON.stringify(payload),
//           },
//         );

//         const data = await response.json();

//         // Handle authorization required responses (OTP, STK_PROMPT, REDIRECT)
//         if (
//           data.code === "AA001" ||
//           (data.status === true && data.data?.auth_model)
//         ) {
//           const authModel = data.data?.auth_model || "STK_PROMPT";
//           return {
//             success: true,
//             reference: data.data?.transaction_reference || reference,
//             providerReference:
//               data.data?.payment_reference || data.data?.reference || "",
//             redirectUrl: data.data?.authorization?.redirect_url,
//             authModel: authModel,
//           };
//         }

//         if (!response.ok || data.status === false) {
//           return {
//             success: false,
//             reference,
//             error: data.message || "Korapay mobile money payment failed",
//           };
//         }

//         return {
//           success: true,
//           reference:
//             data.data?.transaction_reference ||
//             data.data?.reference ||
//             reference,
//           providerReference: data.data?.payment_reference || "",
//           redirectUrl: data.data?.authorization?.redirect_url,
//           authModel: data.data?.auth_model,
//         };
//       }

//       // ============================================================
//       // 2. BANK TRANSFER (EFT) - ZA (South Africa)
//       // ============================================================
//       if (supportsBankTransfer(countryCode)) {
//         // For South Africa, we use the payout/disburse endpoint
//         // This is a bank transfer (EFT) to the reseller's bank account
//         // Bank details should be passed in the metadata
//         const bankDetails = metadata?.bankDetails as
//           | {
//               bankCode: string;
//               accountNumber: string;
//               accountName: string;
//             }
//           | undefined;

//         if (!bankDetails) {
//           return {
//             success: false,
//             reference,
//             error: "Bank details are required for South Africa bank transfers",
//           };
//         }

//         const payload = {
//           reference,
//           destination: {
//             type: "bank_account",
//             amount,
//             currency: resolvedCurrency,
//             narration: `Wallet funding for ${application.store_slug || "reseller"}`,
//             bank_account: {
//               bank: bankDetails.bankCode,
//               account: bankDetails.accountNumber,
//             },
//             customer: {
//               name: bankDetails.accountName || customerName,
//               email: customerEmail,
//             },
//           },
//           metadata: {
//             reseller_id: resellerId,
//             country_code: countryCode,
//             source,
//             payment_type: "bank_transfer",
//             ...metadata,
//           },
//         };

//         // Call Korapay payout/disburse endpoint for ZAR
//         const response = await fetch(
//           `${KORAPAY_BASE_URL}/transactions/disburse`,
//           {
//             method: "POST",
//             headers: getHeaders(),
//             body: JSON.stringify(payload),
//           },
//         );

//         const data = await response.json();

//         if (!response.ok || data.status === false) {
//           return {
//             success: false,
//             reference,
//             error: data.message || "Korapay bank transfer failed",
//           };
//         }

//         return {
//           success: true,
//           reference: data.data?.reference || reference,
//           providerReference: data.data?.reference || "",
//           redirectUrl: undefined,
//         };
//       }

//       // ============================================================
//       // 3. UNSUPPORTED COUNTRY
//       // ============================================================
//       return {
//         success: false,
//         reference,
//         error: `Payment method not supported for ${countryCode.toUpperCase()} on Korapay. Use Xixapay for Nigeria or Flutterwave for Rwanda/Uganda.`,
//       };
//     } catch (error) {
//       console.error("Korapay initiatePayment error:", error);
//       return {
//         success: false,
//         reference: generateReference("KPY"),
//         error:
//           error instanceof Error ? error.message : "Korapay payment failed",
//       };
//     }
//   },

//   /**
//    * Verify webhook signature from Korapay
//    * Uses x-korapay-signature header with HMAC SHA256
//    */
//   async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
//     try {
//       const signature = headers.get("x-korapay-signature");
//       if (!signature) return false;

//       // Korapay signs ONLY the data object, not the entire body
//       const payload = JSON.stringify(body.data || body);
//       const crypto = await import("crypto");
//       const hash = crypto
//         .createHmac("sha256", KORAPAY_SECRET_KEY)
//         .update(payload)
//         .digest("hex");

//       const isValid = hash === signature;
//       if (!isValid) {
//         console.warn("Korapay webhook signature verification failed");
//       }
//       return isValid;
//     } catch (error) {
//       console.error("Korapay verifyWebhook error:", error);
//       return false;
//     }
//   },

//   /**
//    * Parse webhook data from Korapay
//    */
//   parseWebhook(body: any): PaymentWebhookData {
//     const { event, data } = body;
//     const eventData = data || body.data || {};

//     // Determine if the transaction was successful
//     const isSuccess =
//       event === "charge.success" ||
//       event === "transfer.success" ||
//       eventData.status === "success" ||
//       eventData.transaction_status === "success";

//     return {
//       reference: eventData.payment_reference || eventData.reference || "",
//       status: isSuccess ? "completed" : "failed",
//       providerReference:
//         eventData.reference || eventData.transaction_reference || "",
//       amount:
//         parseFloat(eventData.amount) || parseFloat(eventData.amount_paid) || 0,
//       currency: eventData.currency || "",
//       metadata: {
//         event,
//         fee: eventData.fee,
//         payment_method:
//           eventData.payment_method || eventData.type || "mobile_money",
//         transaction_status: eventData.transaction_status,
//         amount_expected: eventData.amount_expected,
//         narration: eventData.narration,
//         batch_reference: eventData.batch_reference,
//         trace_id: eventData.trace_id,
//         virtual_bank_account_details: eventData.virtual_bank_account_details,
//         ...eventData.metadata,
//       },
//       customer: eventData.customer
//         ? {
//             name: eventData.customer.name,
//             email: eventData.customer.email,
//           }
//         : undefined,
//       sender: eventData.virtual_bank_account_details?.payer_bank_account
//         ? {
//             name: eventData.virtual_bank_account_details.payer_bank_account
//               .account_name,
//             account_number:
//               eventData.virtual_bank_account_details.payer_bank_account
//                 .account_number,
//             bank: eventData.virtual_bank_account_details.payer_bank_account
//               .bank_name,
//           }
//         : undefined,
//       receiver: eventData.virtual_bank_account_details?.virtual_bank_account
//         ? {
//             name: eventData.virtual_bank_account_details.virtual_bank_account
//               .account_name,
//             account_number:
//               eventData.virtual_bank_account_details.virtual_bank_account
//                 .account_number,
//             bank: eventData.virtual_bank_account_details.virtual_bank_account
//               .bank_name,
//           }
//         : undefined,
//     };
//   },

//   /**
//    * Get transaction status from Korapay
//    * GET /merchant/api/v1/charges/:reference
//    */
//   async getTransactionStatus(reference: string): Promise<{
//     status: "completed" | "failed" | "pending";
//     amount?: number;
//     currency?: string;
//     providerReference?: string;
//   }> {
//     try {
//       const response = await fetch(`${KORAPAY_BASE_URL}/charges/${reference}`, {
//         method: "GET",
//         headers: getHeaders(),
//       });

//       const data = await response.json();

//       if (!response.ok || data.status === false) {
//         return {
//           status: "failed",
//           providerReference: reference,
//         };
//       }

//       const statusMap: Record<string, "completed" | "failed" | "pending"> = {
//         success: "completed",
//         failed: "failed",
//         processing: "pending",
//         pending: "pending",
//       };

//       return {
//         status: statusMap[data.data?.status] || "pending",
//         amount: parseFloat(data.data?.amount) || 0,
//         currency: data.data?.currency || "",
//         providerReference: data.data?.reference || reference,
//       };
//     } catch (error) {
//       console.error("Korapay getTransactionStatus error:", error);
//       return {
//         status: "pending",
//         providerReference: reference,
//       };
//     }
//   },

//   /**
//    * Get payout/transfer status from Korapay
//    * GET /merchant/api/v1/transactions/:reference
//    */
//   async getPayoutStatus(reference: string): Promise<{
//     status: "completed" | "failed" | "pending";
//     amount?: number;
//     currency?: string;
//     providerReference?: string;
//   }> {
//     try {
//       const response = await fetch(
//         `${KORAPAY_BASE_URL}/transactions/${reference}`,
//         {
//           method: "GET",
//           headers: getHeaders(),
//         },
//       );

//       const data = await response.json();

//       if (!response.ok || data.status === false) {
//         return {
//           status: "failed",
//           providerReference: reference,
//         };
//       }

//       const statusMap: Record<string, "completed" | "failed" | "pending"> = {
//         success: "completed",
//         failed: "failed",
//         processing: "pending",
//         pending: "pending",
//       };

//       return {
//         status: statusMap[data.data?.status] || "pending",
//         amount: parseFloat(data.data?.amount) || 0,
//         currency: data.data?.currency || "",
//         providerReference: data.data?.reference || reference,
//       };
//     } catch (error) {
//       console.error("Korapay getPayoutStatus error:", error);
//       return {
//         status: "pending",
//         providerReference: reference,
//       };
//     }
//   },

//   /**
//    * Create virtual account - NOT supported by Korapay for these countries
//    * Virtual accounts are only for NGN (handled by Xixapay)
//    */
//   createVirtualAccount?(
//     resellerId: string,
//     countryCode: string,
//   ): Promise<{
//     accountNumber: string;
//     accountName: string;
//     bankName: string;
//   }> {
//     throw new Error(
//       "Virtual accounts not supported by Korapay for these countries. Use Xixapay for Nigeria.",
//     );
//   },

//   /**
//    * Get supported banks - Korapay has bank lists for each country
//    * GET /merchant/api/v1/misc/banks?countryCode=XX
//    */
//   getBanks?(
//     countryCode: string,
//   ): Promise<Array<{ bankName: string; bankCode: string }>> {
//     return Promise.resolve([]);
//   },

//   /**
//    * Verify bank account - Korapay supports bank account verification
//    * POST /merchant/api/v1/misc/banks/resolve
//    */
//   verifyBankAccount?(
//     bankCode: string,
//     accountNumber: string,
//     currency: string,
//   ): Promise<{ success: boolean; accountName?: string; error?: string }> {
//     return Promise.resolve({
//       success: false,
//       error: "Bank account verification not implemented for this gateway",
//     });
//   },

//   /**
//    * Process payout (withdrawal) via Korapay
//    * POST /merchant/api/v1/transactions/disburse
//    */
//   processPayout?(params: {
//     resellerId: string;
//     amount: number;
//     currency: string;
//     bankCode: string;
//     accountNumber: string;
//     accountName: string;
//     narration?: string;
//   }): Promise<{ success: boolean; reference?: string; error?: string }> {
//     return Promise.resolve({
//       success: false,
//       error: "Payout processing not implemented for this gateway",
//     });
//   },

//   /**
//    * Process bulk payout via Korapay
//    * POST /merchant/api/v1/transactions/disburse/bulk
//    */
//   processBulkPayout?(params: {
//     resellerId: string;
//     batchReference: string;
//     currency: string;
//     payouts: Array<{
//       reference: string;
//       amount: number;
//       bankCode: string;
//       accountNumber: string;
//       customerName: string;
//       customerEmail: string;
//       narration?: string;
//     }>;
//   }): Promise<{ success: boolean; reference?: string; error?: string }> {
//     return Promise.resolve({
//       success: false,
//       error: "Bulk payout processing not implemented for this gateway",
//     });
//   },

//   /**
//    * Get supported mobile money networks for a country
//    */
//   getMobileMoneyNetworks(countryCode: string): string[] {
//     return MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()] || [];
//   },

//   /**
//    * Check if country supports mobile money
//    */
//   supportsMobileMoney(countryCode: string): boolean {
//     return supportsMobileMoney(countryCode);
//   },

//   /**
//    * Check if country supports bank transfers
//    */
//   supportsBankTransfer(countryCode: string): boolean {
//     return supportsBankTransfer(countryCode);
//   },
// };

// // // src/lib/payments/korapay.ts
// // import {
// //   PaymentGateway,
// //   PaymentInitiateParams,
// //   PaymentInitiateResult,
// //   PaymentWebhookData,
// // } from "./payment.types";

// // const KORAPAY_BASE_URL = "https://api.korapay.com/merchant/api/v1";
// // const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY || "";

// // function getHeaders(): HeadersInit {
// //   return {
// //     Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
// //     "Content-Type": "application/json",
// //   };
// // }

// // function generateReference(prefix: string = "KPY"): string {
// //   const timestamp = Date.now().toString(36);
// //   const random = Math.random().toString(36).substring(2, 8);
// //   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// // }

// // // Mobile money networks supported by Korapay by country
// // const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
// //   GH: ["MTN", "AIRTEL_TIGO", "VODAFONE"],
// //   KE: ["MPESA", "AIRTEL", "EQUITEL"],
// //   CM: ["MTN", "ORANGE"],
// //   CI: ["MTN", "ORANGE", "MOOV", "WAVE"],
// //   EG: ["VODAFONE", "ORANGE", "ETISALAT"],
// //   TZ: ["VODACOM", "TIGO", "AIRTEL"],
// // };

// // // Country to currency mapping
// // const COUNTRY_CURRENCY: Record<string, string> = {
// //   NG: "NGN",
// //   GH: "GHS",
// //   KE: "KES",
// //   ZA: "ZAR",
// //   CM: "XAF",
// //   CI: "XOF",
// //   SN: "XOF",
// //   BF: "XOF",
// //   BJ: "XOF",
// //   TG: "XOF",
// //   NE: "XOF",
// //   ML: "XOF",
// //   GN: "XOF",
// //   CF: "XAF",
// //   TD: "XAF",
// //   CG: "XAF",
// //   GQ: "XAF",
// //   GA: "XAF",
// // };

// // // Get currency from country code
// // function getCurrencyForCountry(countryCode: string): string {
// //   return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "NGN";
// // }

// // export const korapay: PaymentGateway = {
// //   /**
// //    * Initiate a payment using Korapay
// //    * Supports: NGN (Nigeria), GHS (Ghana), KES (Kenya), ZAR (South Africa),
// //    * XAF (Cameroon, CAR, Chad, Congo, Equatorial Guinea, Gabon),
// //    * XOF (Ivory Coast, Senegal, Burkina Faso, Benin, Togo, Niger, Mali, Guinea)
// //    */
// //   async initiatePayment(
// //     params: PaymentInitiateParams,
// //   ): Promise<PaymentInitiateResult> {
// //     try {
// //       const {
// //         resellerId,
// //         amount,
// //         currency,
// //         countryCode,
// //         source,
// //         metadata,
// //         customer,
// //         mobileMoney,
// //       } = params;

// //       const resolvedCurrency = currency || getCurrencyForCountry(countryCode);
// //       const reference = generateReference("KPY");

// //       // Get reseller details for customer info
// //       const supabase = await import("@/lib/supabase/server").then((m) =>
// //         m.createServerClient(),
// //       );
// //       const { data: application } = await supabase
// //         .from("global_reseller_applications")
// //         .select("first_name, last_name, email, phone")
// //         .eq("id", resellerId)
// //         .single();

// //       if (!application) {
// //         return {
// //           success: false,
// //           reference,
// //           error: "Reseller not found",
// //         };
// //       }

// //       // Prepare customer data
// //       const customerData = {
// //         name:
// //           customer?.name ||
// //           `${application.first_name} ${application.last_name}`.trim() ||
// //           "Customer",
// //         email:
// //           customer?.email ||
// //           application.email ||
// //           `customer-${resellerId}@edges.com`,
// //       };

// //       // Build payload based on payment method
// //       let payload: any = {
// //         amount,
// //         currency: resolvedCurrency,
// //         reference,
// //         customer: customerData,
// //         merchant_bears_cost: true,
// //         narration: `Wallet funding for ${application.store_name || "reseller"}`,
// //         metadata: {
// //           reseller_id: resellerId,
// //           country_code: countryCode,
// //           source,
// //           ...metadata,
// //         },
// //       };

// //       // Determine payment channel
// //       let endpoint = `${KORAPAY_BASE_URL}/charges/initialize`;

// //       // If mobile money details provided, use mobile money endpoint
// //       if (mobileMoney?.number) {
// //         payload.mobile_money = {
// //           number: mobileMoney.number,
// //         };
// //         if (mobileMoney.network) {
// //           payload.mobile_money.network = mobileMoney.network;
// //         }
// //         endpoint = `${KORAPAY_BASE_URL}/charges/mobile-money`;
// //       } else {
// //         // Use standard checkout for card/bank transfer
// //         payload.channels = ["card", "bank_transfer"];
// //         if (
// //           ["GH", "KE", "CM", "CI", "EG", "TZ"].includes(
// //             countryCode.toUpperCase(),
// //           )
// //         ) {
// //           payload.channels.push("mobile_money");
// //         }
// //       }

// //       // Make API call
// //       const response = await fetch(endpoint, {
// //         method: "POST",
// //         headers: getHeaders(),
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await response.json();

// //       // Handle authorization required responses
// //       if (
// //         data.code === "AA001" ||
// //         (data.status === true && data.data?.auth_model)
// //       ) {
// //         const authModel = data.data?.auth_model || "STK_PROMPT";
// //         return {
// //           success: true,
// //           reference: data.data?.transaction_reference || reference,
// //           providerReference:
// //             data.data?.payment_reference || data.data?.reference || "",
// //           redirectUrl:
// //             data.data?.authorization?.redirect_url || data.data?.checkout_url,
// //           authModel: authModel,
// //         };
// //       }

// //       if (!response.ok || data.status === false) {
// //         return {
// //           success: false,
// //           reference,
// //           error: data.message || "Korapay payment failed",
// //         };
// //       }

// //       // Check for checkout URL in response
// //       const checkoutUrl = data.data?.checkout_url || data.data?.redirect_url;
// //       if (checkoutUrl) {
// //         return {
// //           success: true,
// //           reference: data.data?.reference || reference,
// //           providerReference: data.data?.payment_reference || "",
// //           redirectUrl: checkoutUrl,
// //         };
// //       }

// //       return {
// //         success: true,
// //         reference: data.data?.reference || reference,
// //         providerReference: data.data?.payment_reference || "",
// //         redirectUrl: data.data?.checkout_url,
// //       };
// //     } catch (error) {
// //       console.error("Korapay initiatePayment error:", error);
// //       return {
// //         success: false,
// //         reference: generateReference("KPY"),
// //         error:
// //           error instanceof Error ? error.message : "Korapay payment failed",
// //       };
// //     }
// //   },

// //   /**
// //    * Verify webhook signature from Korapay
// //    */
// //   async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
// //     try {
// //       const signature = headers.get("x-korapay-signature");
// //       if (!signature) return false;

// //       const payload = JSON.stringify(body.data || body);
// //       const crypto = await import("crypto");
// //       const hash = crypto
// //         .createHmac("sha256", KORAPAY_SECRET_KEY)
// //         .update(payload)
// //         .digest("hex");

// //       return hash === signature;
// //     } catch (error) {
// //       console.error("Korapay verifyWebhook error:", error);
// //       return false;
// //     }
// //   },

// //   /**
// //    * Parse webhook data from Korapay
// //    */
// //   parseWebhook(body: any): PaymentWebhookData {
// //     const { event, data } = body;
// //     const eventData = data || body.data || {};

// //     const isSuccess =
// //       event === "charge.success" || eventData.status === "success";

// //     return {
// //       reference: eventData.payment_reference || eventData.reference || "",
// //       status: isSuccess ? "completed" : "failed",
// //       providerReference:
// //         eventData.reference || eventData.transaction_reference || "",
// //       amount: parseFloat(eventData.amount) || 0,
// //       currency: eventData.currency || "",
// //       metadata: {
// //         event,
// //         fee: eventData.fee,
// //         payment_method: eventData.payment_method,
// //         virtual_bank_account_details: eventData.virtual_bank_account_details,
// //         ...eventData.metadata,
// //       },
// //       customer: eventData.customer
// //         ? {
// //             name: eventData.customer.name,
// //             email: eventData.customer.email,
// //           }
// //         : undefined,
// //     };
// //   },

// //   /**
// //    * Get transaction status from Korapay
// //    */
// //   async getTransactionStatus(reference: string): Promise<{
// //     status: "completed" | "failed" | "pending";
// //     amount?: number;
// //     currency?: string;
// //     providerReference?: string;
// //   }> {
// //     try {
// //       const response = await fetch(`${KORAPAY_BASE_URL}/charges/${reference}`, {
// //         method: "GET",
// //         headers: getHeaders(),
// //       });

// //       const data = await response.json();

// //       if (!response.ok || data.status === false) {
// //         return {
// //           status: "failed",
// //           providerReference: reference,
// //         };
// //       }

// //       const statusMap: Record<string, "completed" | "failed" | "pending"> = {
// //         success: "completed",
// //         failed: "failed",
// //         processing: "pending",
// //         pending: "pending",
// //       };

// //       return {
// //         status: statusMap[data.data?.status] || "pending",
// //         amount: parseFloat(data.data?.amount) || 0,
// //         currency: data.data?.currency || "",
// //         providerReference: data.data?.reference || reference,
// //       };
// //     } catch (error) {
// //       console.error("Korapay getTransactionStatus error:", error);
// //       return {
// //         status: "failed",
// //         providerReference: reference,
// //       };
// //     }
// //   },

// //   /**
// //    * Create virtual account (Korapay)
// //    * For NGN, GHS, USD
// //    */
// //   async createVirtualAccount(
// //     resellerId: string,
// //     countryCode: string,
// //   ): Promise<{
// //     accountNumber: string;
// //     accountName: string;
// //     bankName: string;
// //   }> {
// //     try {
// //       const supabase = await import("@/lib/supabase/server").then((m) =>
// //         m.createServerClient(),
// //       );

// //       // Get reseller details
// //       const { data: application } = await supabase
// //         .from("global_reseller_applications")
// //         .select("first_name, last_name, email, phone")
// //         .eq("id", resellerId)
// //         .single();

// //       if (!application) {
// //         throw new Error("Reseller not found");
// //       }

// //       const currency = getCurrencyForCountry(countryCode);
// //       const reference = generateReference("VAN");

// //       const payload = {
// //         reference,
// //         customer: {
// //           name: `${application.first_name} ${application.last_name}`.trim(),
// //           email: application.email,
// //         },
// //         amount: 0, // Static account
// //         currency,
// //         account_type: "static" as const,
// //         narration: `${application.store_name || "Reseller"} Virtual Account`,
// //       };

// //       const response = await fetch(`${KORAPAY_BASE_URL}/virtual-accounts`, {
// //         method: "POST",
// //         headers: getHeaders(),
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await response.json();

// //       if (!response.ok || data.status === false) {
// //         throw new Error(data.message || "Failed to create virtual account");
// //       }

// //       return {
// //         accountNumber: data.data?.account_number || "",
// //         accountName: data.data?.account_name || "",
// //         bankName: data.data?.account_bank_name || "",
// //       };
// //     } catch (error) {
// //       console.error("Korapay createVirtualAccount error:", error);
// //       throw error;
// //     }
// //   },
// // };
