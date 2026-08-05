// src/lib/payments/flutterwave.ts
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentWebhookData,
} from "./payment.types";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

function generateReference(prefix: string = "FLW"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Mobile money networks supported by Flutterwave by country
// Only Rwanda and Uganda - Ghana and Kenya use Korapay
const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
  RW: ["MTN", "AIRTEL"], // Rwanda - MTN Momo, Airtel Money
  UG: ["MTN", "AIRTEL"], // Uganda - MTN Momo, Airtel Money
};

// Country to currency mapping for Flutterwave
const COUNTRY_CURRENCY: Record<string, string> = {
  RW: "RWF",
  UG: "UGX",
};

// Countries that support mobile money on Flutterwave
const MOBILE_MONEY_COUNTRIES = new Set(["RW", "UG"]);

function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "RWF";
}

function getDefaultNetwork(countryCode: string): string {
  const networks = MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()];
  return networks?.[0] || "MTN";
}

function supportsMobileMoney(countryCode: string): boolean {
  return MOBILE_MONEY_COUNTRIES.has(countryCode.toUpperCase());
}

export const flutterwave: PaymentGateway = {
  /**
   * Initiate a mobile money payment using Flutterwave
   * Supports: Rwanda (RWF), Uganda (UGX) only
   *
   * Uses the orchestrator flow for one-time payments
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
      const reference = generateReference("FLW");

      // Only support mobile money for Rwanda and Uganda
      if (!supportsMobileMoney(countryCode)) {
        return {
          success: false,
          reference,
          error: `Mobile money not supported for ${countryCode.toUpperCase()} on Flutterwave. Use Korapay for other countries.`,
        };
      }

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
      const customerPhone = mobileMoney?.number || application.phone || "";

      // Build mobile money payload for Flutterwave orchestrator flow
      const payload: any = {
        tx_ref: reference,
        amount,
        currency: resolvedCurrency,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?reference=${reference}`,
        customer: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone || undefined,
        },
        customizations: {
          title: `Wallet Funding - ${application.store_slug || "Edges"}`,
          description: "Fund your wallet via mobile money",
        },
        meta: {
          reseller_id: resellerId,
          country_code: countryCode,
          source,
          payment_type: "mobile_money",
          ...metadata,
        },
        payment_options: "mobilemoney",
        payment_plan: "mobilemoney",
      };

      // Add mobile money details if provided
      if (mobileMoney?.number) {
        const network = mobileMoney.network || getDefaultNetwork(countryCode);
        payload.phone_number = mobileMoney.number;
        payload.mobilemoney = {
          phone: mobileMoney.number,
          network: network,
          country: upperCountry,
        };
      } else {
        return {
          success: false,
          reference,
          error: "Mobile money number is required for Flutterwave payments",
        };
      }

      // Use orchestrator direct charge endpoint
      const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Check for success response
      if (data.status !== "success") {
        return {
          success: false,
          reference,
          error: data.message || "Flutterwave mobile money payment failed",
        };
      }

      const redirectUrl = data.data?.link || data.data?.redirect_url;

      return {
        success: true,
        reference: data.data?.tx_ref || reference,
        providerReference: data.data?.flw_ref || data.data?.reference || "",
        redirectUrl: redirectUrl,
        authModel: "REDIRECT",
      };
    } catch (error) {
      console.error("Flutterwave initiatePayment error:", error);
      return {
        success: false,
        reference: generateReference("FLW"),
        error:
          error instanceof Error ? error.message : "Flutterwave payment failed",
      };
    }
  },

  /**
   * Verify webhook signature from Flutterwave
   * Flutterwave uses "verif-hash" header
   */
  async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
    try {
      const signature = headers.get("verif-hash");
      if (!signature) return false;

      const payload = typeof body === "string" ? body : JSON.stringify(body);

      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", FLUTTERWAVE_SECRET_KEY)
        .update(payload)
        .digest("hex");

      const isValid = hash === signature;
      if (!isValid) {
        console.warn("Flutterwave webhook signature verification failed");
      }
      return isValid;
    } catch (error) {
      console.error("Flutterwave verifyWebhook error:", error);
      return false;
    }
  },

  /**
   * Parse webhook data from Flutterwave
   */
  parseWebhook(body: any): PaymentWebhookData {
    const { event, data } = body;
    const eventData = data || body.data || {};

    const isSuccess =
      event === "charge.completed" &&
      (eventData.status === "successful" || eventData.status === "success");

    return {
      reference: eventData.tx_ref || eventData.reference || "",
      status: isSuccess ? "completed" : "failed",
      providerReference: eventData.flw_ref || eventData.id || "",
      amount: parseFloat(eventData.amount) || 0,
      currency: eventData.currency || "",
      metadata: {
        event,
        status: eventData.status,
        payment_type: eventData.payment_type,
        processor_response: eventData.processor_response,
        narration: eventData.narration,
        ...eventData.meta,
      },
      customer: eventData.customer
        ? {
            name: eventData.customer.name,
            email: eventData.customer.email,
          }
        : undefined,
    };
  },

  /**
   * Get transaction status from Flutterwave
   * GET /v3/transactions/:reference/verify
   */
  async getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
      const response = await fetch(
        `${FLUTTERWAVE_BASE_URL}/transactions/${reference}/verify`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        return {
          status: "failed",
          providerReference: reference,
        };
      }

      const statusMap: Record<string, "completed" | "failed" | "pending"> = {
        successful: "completed",
        failed: "failed",
        pending: "pending",
      };

      return {
        status: statusMap[data.data?.status] || "pending",
        amount: parseFloat(data.data?.amount) || 0,
        currency: data.data?.currency || "",
        providerReference: data.data?.flw_ref || reference,
      };
    } catch (error) {
      console.error("Flutterwave getTransactionStatus error:", error);
      return {
        status: "pending",
        providerReference: reference,
      };
    }
  },

  /**
   * Check if country supports mobile money on Flutterwave
   */
  supportsMobileMoney(countryCode: string): boolean {
    return supportsMobileMoney(countryCode);
  },

  /**
   * Get mobile money networks for a country
   */
  getMobileMoneyNetworks(countryCode: string): string[] {
    return MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()] || [];
  },
};

// // src/lib/payments/flutterwave.ts
// import {
//   PaymentGateway,
//   PaymentInitiateParams,
//   PaymentInitiateResult,
//   PaymentWebhookData,
// } from "./payment.types";

// const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
// const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";
// const FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || "";

// function getHeaders(): HeadersInit {
//   return {
//     Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
//     "Content-Type": "application/json",
//   };
// }

// function generateReference(prefix: string = "FLW"): string {
//   const timestamp = Date.now().toString(36);
//   const random = Math.random().toString(36).substring(2, 8);
//   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// }

// // Mobile money networks supported by Flutterwave by country
// const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
//   RW: ["MTN", "AIRTEL"], // Rwanda - MTN Momo, Airtel Money
//   UG: ["MTN", "AIRTEL"], // Uganda - MTN Momo, Airtel Money
//   GH: ["MTN", "AIRTEL_TIGO", "VODAFONE"], // Ghana (not actively used)
//   KE: ["MPESA", "AIRTEL", "EQUITEL"], // Kenya (not actively used)
// };

// // Country to currency mapping for Flutterwave
// const COUNTRY_CURRENCY: Record<string, string> = {
//   RW: "RWF",
//   UG: "UGX",
//   GH: "GHS",
//   KE: "KES",
// };

// // Countries that support mobile money on Flutterwave
// const MOBILE_MONEY_COUNTRIES = new Set(["RW", "UG", "GH", "KE"]);

// function getCurrencyForCountry(countryCode: string): string {
//   return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "RWF";
// }

// function getDefaultNetwork(countryCode: string): string {
//   const networks = MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()];
//   return networks?.[0] || "MTN";
// }

// function supportsMobileMoney(countryCode: string): boolean {
//   return MOBILE_MONEY_COUNTRIES.has(countryCode.toUpperCase());
// }

// export const flutterwave: PaymentGateway = {
//   /**
//    * Initiate a mobile money payment using Flutterwave
//    * Supports: Rwanda (RWF), Uganda (UGX)
//    *
//    * Uses the orchestrator flow for one-time payments
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
//       const reference = generateReference("FLW");

//       // Only support mobile money for these countries
//       if (!supportsMobileMoney(countryCode)) {
//         return {
//           success: false,
//           reference,
//           error: `Mobile money not supported for ${countryCode.toUpperCase()} on Flutterwave. Use Korapay or Xixapay.`,
//         };
//       }

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
//       const customerPhone = mobileMoney?.number || application.phone || "";

//       // Build mobile money payload for Flutterwave orchestrator flow
//       const payload: any = {
//         tx_ref: reference,
//         amount,
//         currency: resolvedCurrency,
//         redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?reference=${reference}`,
//         customer: {
//           email: customerEmail,
//           name: customerName,
//         },
//         customizations: {
//           title: `Wallet Funding - ${application.store_slug || "Edges"}`,
//           description: "Fund your wallet via mobile money",
//           logo:
//             application.logo_url ||
//             `${process.env.NEXT_PUBLIC_APP_URL}/favicon.ico`,
//         },
//         meta: {
//           reseller_id: resellerId,
//           country_code: countryCode,
//           source,
//           payment_type: "mobile_money",
//           ...metadata,
//         },
//         payment_options: "mobilemoney",
//         payment_plan: "mobilemoney",
//       };

//       // Add mobile money details if provided
//       if (mobileMoney?.number) {
//         const network = mobileMoney.network || getDefaultNetwork(countryCode);
//         // Flutterwave orchestrator uses phone_number in the main payload
//         payload.phone_number = mobileMoney.number;
//         payload.mobilemoney = {
//           phone: mobileMoney.number,
//           network: network,
//           country: upperCountry,
//         };
//         // Add to customer for orchestrator
//         payload.customer.phone = mobileMoney.number;
//       } else {
//         return {
//           success: false,
//           reference,
//           error: "Mobile money number is required for Flutterwave payments",
//         };
//       }

//       // Use orchestrator direct charge endpoint (simpler, all-in-one)
//       const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
//         method: "POST",
//         headers: getHeaders(),
//         body: JSON.stringify(payload),
//       });

//       const data = await response.json();

//       // Check for success response
//       if (data.status !== "success") {
//         return {
//           success: false,
//           reference,
//           error: data.message || "Flutterwave mobile money payment failed",
//         };
//       }

//       // Check for redirect URL (for mobile money authorization)
//       const redirectUrl = data.data?.link || data.data?.redirect_url;

//       return {
//         success: true,
//         reference: data.data?.tx_ref || reference,
//         providerReference: data.data?.flw_ref || data.data?.reference || "",
//         redirectUrl: redirectUrl,
//         authModel: "REDIRECT", // Mobile money typically uses redirect
//       };
//     } catch (error) {
//       console.error("Flutterwave initiatePayment error:", error);
//       return {
//         success: false,
//         reference: generateReference("FLW"),
//         error:
//           error instanceof Error ? error.message : "Flutterwave payment failed",
//       };
//     }
//   },

//   /**
//    * Verify webhook signature from Flutterwave
//    * Flutterwave uses "verif-hash" header
//    */
//   async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
//     try {
//       const signature = headers.get("verif-hash");
//       if (!signature) return false;

//       // Flutterwave expects the body as a string for verification
//       const payload = typeof body === "string" ? body : JSON.stringify(body);

//       const crypto = await import("crypto");
//       const hash = crypto
//         .createHmac("sha256", FLUTTERWAVE_SECRET_KEY)
//         .update(payload)
//         .digest("hex");

//       const isValid = hash === signature;
//       if (!isValid) {
//         console.warn("Flutterwave webhook signature verification failed");
//       }
//       return isValid;
//     } catch (error) {
//       console.error("Flutterwave verifyWebhook error:", error);
//       return false;
//     }
//   },

//   /**
//    * Parse webhook data from Flutterwave
//    * Event types: charge.completed, transfer.success, etc.
//    */
//   parseWebhook(body: any): PaymentWebhookData {
//     const { event, data } = body;
//     const eventData = data || body.data || {};

//     // Determine if the transaction was successful
//     const isSuccess =
//       event === "charge.completed" &&
//       (eventData.status === "successful" || eventData.status === "success");

//     return {
//       reference: eventData.tx_ref || eventData.reference || "",
//       status: isSuccess ? "completed" : "failed",
//       providerReference: eventData.flw_ref || eventData.id || "",
//       amount: parseFloat(eventData.amount) || 0,
//       currency: eventData.currency || "",
//       metadata: {
//         event,
//         status: eventData.status,
//         payment_type: eventData.payment_type,
//         processor_response: eventData.processor_response,
//         narration: eventData.narration,
//         ...eventData.meta,
//       },
//       customer: eventData.customer
//         ? {
//             name: eventData.customer.name,
//             email: eventData.customer.email,
//           }
//         : undefined,
//     };
//   },

//   /**
//    * Get transaction status from Flutterwave
//    * GET /v3/transactions/:reference/verify
//    */
//   async getTransactionStatus(reference: string): Promise<{
//     status: "completed" | "failed" | "pending";
//     amount?: number;
//     currency?: string;
//     providerReference?: string;
//   }> {
//     try {
//       const response = await fetch(
//         `${FLUTTERWAVE_BASE_URL}/transactions/${reference}/verify`,
//         {
//           method: "GET",
//           headers: getHeaders(),
//         },
//       );

//       const data = await response.json();

//       if (!response.ok || data.status !== "success") {
//         return {
//           status: "failed",
//           providerReference: reference,
//         };
//       }

//       const statusMap: Record<string, "completed" | "failed" | "pending"> = {
//         successful: "completed",
//         failed: "failed",
//         pending: "pending",
//       };

//       return {
//         status: statusMap[data.data?.status] || "pending",
//         amount: parseFloat(data.data?.amount) || 0,
//         currency: data.data?.currency || "",
//         providerReference: data.data?.flw_ref || reference,
//       };
//     } catch (error) {
//       console.error("Flutterwave getTransactionStatus error:", error);
//       return {
//         status: "pending",
//         providerReference: reference,
//       };
//     }
//   },

//   /**
//    * Create virtual account - NOT supported by Flutterwave
//    */
//   async createVirtualAccount?(
//     resellerId: string,
//     countryCode: string,
//   ): Promise<{
//     accountNumber: string;
//     accountName: string;
//     bankName: string;
//   }> {
//     throw new Error(
//       "Virtual accounts not supported by Flutterwave. Use Xixapay for Nigeria.",
//     );
//   },

//   /**
//    * Get supported banks - NOT used for mobile money
//    */
//   async getBanks?(): Promise<Array<{ bankName: string; bankCode: string }>> {
//     // Flutterwave has banks endpoint but we don't need it for mobile money
//     return [];
//   },

//   /**
//    * Verify bank account - NOT used for mobile money
//    */
//   async verifyBankAccount?(
//     bankCode: string,
//     accountNumber: string,
//     currency: string = "NGN",
//   ): Promise<{ success: boolean; accountName?: string; error?: string }> {
//     try {
//       // Flutterwave bank account resolution
//       const response = await fetch(`${FLUTTERWAVE_BASE_URL}/accounts/resolve`, {
//         method: "POST",
//         headers: getHeaders(),
//         body: JSON.stringify({
//           account_number: accountNumber,
//           account_bank: bankCode,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok || data.status !== "success") {
//         return {
//           success: false,
//           error: data.message || "Bank account verification failed",
//         };
//       }

//       return {
//         success: true,
//         accountName: data.data?.account_name || "",
//       };
//     } catch (error) {
//       console.error("Flutterwave verifyBankAccount error:", error);
//       return {
//         success: false,
//         error: "Verification failed. Please try again.",
//       };
//     }
//   },

//   /**
//    * Process payout (withdrawal) via Flutterwave
//    * POST /v3/transfers
//    */
//   async processPayout?(params: {
//     resellerId: string;
//     amount: number;
//     currency: string;
//     bankCode: string;
//     accountNumber: string;
//     accountName: string;
//     narration?: string;
//   }): Promise<{ success: boolean; reference?: string; error?: string }> {
//     try {
//       const {
//         resellerId,
//         amount,
//         currency,
//         bankCode,
//         accountNumber,
//         accountName,
//         narration,
//       } = params;

//       const reference = generateReference("FLW-PAYOUT");

//       // First, create a recipient
//       const recipientPayload = {
//         type: "bank",
//         name: accountName,
//         account_number: accountNumber,
//         bank_code: bankCode,
//         currency,
//       };

//       const recipientResponse = await fetch(
//         `${FLUTTERWAVE_BASE_URL}/transfers/recipients`,
//         {
//           method: "POST",
//           headers: getHeaders(),
//           body: JSON.stringify(recipientPayload),
//         },
//       );

//       const recipientData = await recipientResponse.json();

//       if (!recipientResponse.ok || recipientData.status !== "success") {
//         return {
//           success: false,
//           error: recipientData.message || "Failed to create recipient",
//         };
//       }

//       const recipientId = recipientData.data?.id;

//       // Then initiate the transfer
//       const transferPayload = {
//         account_bank: bankCode,
//         account_number: accountNumber,
//         amount,
//         narration: narration || `Wallet withdrawal for reseller ${resellerId}`,
//         currency,
//         reference,
//         callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/flutterwave`,
//         debit_currency: currency,
//         recipient: recipientId,
//       };

//       const transferResponse = await fetch(
//         `${FLUTTERWAVE_BASE_URL}/transfers`,
//         {
//           method: "POST",
//           headers: getHeaders(),
//           body: JSON.stringify(transferPayload),
//         },
//       );

//       const transferData = await transferResponse.json();

//       if (!transferResponse.ok || transferData.status !== "success") {
//         return {
//           success: false,
//           error: transferData.message || "Transfer failed",
//         };
//       }

//       return {
//         success: true,
//         reference: transferData.data?.reference || reference,
//       };
//     } catch (error) {
//       console.error("Flutterwave processPayout error:", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : "Payout failed",
//       };
//     }
//   },

//   /**
//    * Get mobile money networks for a country
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
// };

// // // src/lib/payments/flutterwave.ts
// // import {
// //   PaymentGateway,
// //   PaymentInitiateParams,
// //   PaymentInitiateResult,
// //   PaymentWebhookData,
// // } from "./payment.types";

// // const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";
// // const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || "";
// // const FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY || "";

// // function getHeaders(): HeadersInit {
// //   return {
// //     Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
// //     "Content-Type": "application/json",
// //   };
// // }

// // function generateReference(prefix: string = "FLW"): string {
// //   const timestamp = Date.now().toString(36);
// //   const random = Math.random().toString(36).substring(2, 8);
// //   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// // }

// // // Mobile money networks by country for Flutterwave
// // const MOBILE_MONEY_NETWORKS: Record<string, string[]> = {
// //   RW: ["MTN", "AIRTEL"], // Rwanda - MTN Momo
// //   UG: ["MTN", "AIRTEL"], // Uganda - MTN Momo
// //   GH: ["MTN", "AIRTEL_TIGO", "VODAFONE"], // Ghana
// //   KE: ["MPESA", "AIRTEL", "EQUITEL"], // Kenya
// // };

// // // Country to currency mapping for Flutterwave
// // const COUNTRY_CURRENCY: Record<string, string> = {
// //   RW: "RWF",
// //   UG: "UGX",
// //   GH: "GHS",
// //   KE: "KES",
// // };

// // function getCurrencyForCountry(countryCode: string): string {
// //   return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "USD";
// // }

// // export const flutterwave: PaymentGateway = {
// //   /**
// //    * Initiate a payment using Flutterwave
// //    * Supports: Rwanda (RWF - MTN Momo), Uganda (UGX - MTN Momo)
// //    * Also supports Ghana, Kenya via mobile money
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
// //       const reference = generateReference("FLW");

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

// //       const customerName =
// //         customer?.name ||
// //         `${application.first_name} ${application.last_name}`.trim() ||
// //         "Customer";
// //       const customerEmail =
// //         customer?.email ||
// //         application.email ||
// //         `customer-${resellerId}@edges.com`;
// //       const customerPhone = mobileMoney?.number || application.phone || "";

// //       // Prepare payload for Flutterwave
// //       const payload: any = {
// //         tx_ref: reference,
// //         amount,
// //         currency: resolvedCurrency,
// //         redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback?reference=${reference}`,
// //         customer: {
// //           email: customerEmail,
// //           name: customerName,
// //         },
// //         meta: {
// //           reseller_id: resellerId,
// //           country_code: countryCode,
// //           source,
// //           ...metadata,
// //         },
// //         customizations: {
// //           title: `Fund Wallet - ${application.store_name || "Edges"}`,
// //           description: "Wallet funding",
// //         },
// //       };

// //       // If mobile money details provided, use mobile money
// //       if (mobileMoney?.number) {
// //         const network =
// //           mobileMoney.network || this.getDefaultNetwork(countryCode);
// //         payload.payment_options = "mobilemoney";
// //         payload.mobilemoney = {
// //           phone: mobileMoney.number,
// //           network: network,
// //           country: countryCode.toUpperCase(),
// //         };
// //         payload.payment_plan = "mobilemoney";
// //       } else {
// //         // Default to card payments
// //         payload.payment_options = "card";
// //       }

// //       // Make API call to Flutterwave
// //       const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
// //         method: "POST",
// //         headers: getHeaders(),
// //         body: JSON.stringify(payload),
// //       });

// //       const data = await response.json();

// //       if (data.status !== "success") {
// //         return {
// //           success: false,
// //           reference,
// //           error: data.message || "Flutterwave payment failed",
// //         };
// //       }

// //       // Check if we have a redirect URL
// //       const redirectUrl = data.data?.link || data.data?.redirect_url;

// //       return {
// //         success: true,
// //         reference,
// //         providerReference: data.data?.flw_ref || data.data?.reference || "",
// //         redirectUrl: redirectUrl,
// //       };
// //     } catch (error) {
// //       console.error("Flutterwave initiatePayment error:", error);
// //       return {
// //         success: false,
// //         reference: generateReference("FLW"),
// //         error:
// //           error instanceof Error ? error.message : "Flutterwave payment failed",
// //       };
// //     }
// //   },

// //   /**
// //    * Get default mobile money network for a country
// //    */
// //   getDefaultNetwork(countryCode: string): string {
// //     const networks = MOBILE_MONEY_NETWORKS[countryCode.toUpperCase()];
// //     return networks?.[0] || "MTN";
// //   },

// //   /**
// //    * Verify webhook signature from Flutterwave
// //    */
// //   async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
// //     try {
// //       // Flutterwave uses a different signature mechanism
// //       const signature = headers.get("verif-hash");
// //       if (!signature) return false;

// //       // Flutterwave expects the body as a string
// //       const payload = typeof body === "string" ? body : JSON.stringify(body);

// //       // For Flutterwave, we compare the verif-hash header
// //       // The secret key is used to verify the signature
// //       const crypto = await import("crypto");
// //       const hash = crypto
// //         .createHmac("sha256", FLUTTERWAVE_SECRET_KEY)
// //         .update(payload)
// //         .digest("hex");

// //       return hash === signature;
// //     } catch (error) {
// //       console.error("Flutterwave verifyWebhook error:", error);
// //       return false;
// //     }
// //   },

// //   /**
// //    * Parse webhook data from Flutterwave
// //    */
// //   parseWebhook(body: any): PaymentWebhookData {
// //     const { event, data } = body;

// //     // Flutterwave webhook structure
// //     const isSuccess =
// //       event === "charge.completed" && data?.status === "successful";

// //     return {
// //       reference: data?.tx_ref || data?.reference || "",
// //       status: isSuccess ? "completed" : "failed",
// //       providerReference: data?.flw_ref || data?.id || "",
// //       amount: parseFloat(data?.amount) || 0,
// //       currency: data?.currency || "",
// //       metadata: {
// //         event,
// //         status: data?.status,
// //         processor_response: data?.processor_response,
// //         payment_type: data?.payment_type,
// //         ...data?.meta,
// //       },
// //       customer: data?.customer
// //         ? {
// //             name: data.customer.name,
// //             email: data.customer.email,
// //           }
// //         : undefined,
// //     };
// //   },

// //   /**
// //    * Get transaction status from Flutterwave
// //    */
// //   async getTransactionStatus(reference: string): Promise<{
// //     status: "completed" | "failed" | "pending";
// //     amount?: number;
// //     currency?: string;
// //     providerReference?: string;
// //   }> {
// //     try {
// //       const response = await fetch(
// //         `${FLUTTERWAVE_BASE_URL}/transactions/${reference}/verify`,
// //         {
// //           method: "GET",
// //           headers: getHeaders(),
// //         },
// //       );

// //       const data = await response.json();

// //       if (!response.ok || data.status !== "success") {
// //         return {
// //           status: "failed",
// //           providerReference: reference,
// //         };
// //       }

// //       const statusMap: Record<string, "completed" | "failed" | "pending"> = {
// //         successful: "completed",
// //         failed: "failed",
// //         pending: "pending",
// //       };

// //       return {
// //         status: statusMap[data.data?.status] || "pending",
// //         amount: parseFloat(data.data?.amount) || 0,
// //         currency: data.data?.currency || "",
// //         providerReference: data.data?.flw_ref || reference,
// //       };
// //     } catch (error) {
// //       console.error("Flutterwave getTransactionStatus error:", error);
// //       return {
// //         status: "failed",
// //         providerReference: reference,
// //       };
// //     }
// //   },

// //   /**
// //    * Create virtual account - Not supported by Flutterwave
// //    */
// //   async createVirtualAccount?(
// //     resellerId: string,
// //     countryCode: string,
// //   ): Promise<{
// //     accountNumber: string;
// //     accountName: string;
// //     bankName: string;
// //   }> {
// //     throw new Error("Virtual accounts not supported by Flutterwave");
// //   },
// // };
