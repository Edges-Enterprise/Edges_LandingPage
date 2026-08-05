// src/lib/payments/xixapay.ts
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentWebhookData,
} from "./payment.types";

const XIXAPAY_BASE_URL = "https://api.xixapay.com";
const XIXAPAY_API_KEY = process.env.XIXAPAY_API_KEY || "";
const XIXAPAY_SECRET_KEY = process.env.XIXAPAY_SECRET_KEY || "";
const XIXAPAY_BUSINESS_ID = process.env.XIXAPAY_BUSINESS_ID || "";

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${XIXAPAY_SECRET_KEY}`,
    "api-key": XIXAPAY_API_KEY,
    "Content-Type": "application/json",
  };
}

function generateReference(prefix: string = "XIXA"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

// Supported banks
const SUPPORTED_BANKS = [
  { code: "20867", name: "Palmpay" },
  { code: "20987", name: "KOLOMONI MFB" },
  { code: "29007", name: "Safehaven" },
  { code: "100004", name: "OPAY" },
];

export const xixapay: PaymentGateway = {
  /**
   * Initiate a payment using Xixapay (virtual account creation)
   * Nigeria only - supports NGN
   */
  async initiatePayment(
    params: PaymentInitiateParams,
  ): Promise<PaymentInitiateResult> {
    try {
      const { resellerId, amount, currency, countryCode, source, metadata } =
        params;

      // Xixapay only supports NGN
      if (currency !== "NGN") {
        return {
          success: false,
          reference: "",
          error: "Xixapay only supports NGN currency",
        };
      }

      const reference = generateReference("XIXA");

      // Get reseller details from database
      const supabase = await import("@/lib/supabase/server").then((m) =>
        m.createServerClient(),
      );
      const { data: application, error: appError } = await supabase
        .from("global_reseller_applications")
        .select("id, first_name, last_name, email, phone, store_name, bvn")
        .eq("id", resellerId)
        .single();

      if (appError || !application) {
        return {
          success: false,
          reference,
          error: "Reseller not found",
        };
      }

      // Validate email
      const emailCheck = await import("@/lib/email/validateEmail").then((m) =>
        m.checkEmail(application.email),
      );
      if (!emailCheck.valid) {
        return {
          success: false,
          reference,
          error: `Invalid email format: ${application.email}`,
        };
      }

      // Generate virtual email for Xixapay
      const [localPart, domain] = application.email.split("@");
      const suffix = Math.floor(Math.random() * 9) + 1;
      const separator = localPart.includes("+") ? "" : "+";
      const virtualEmail = `${localPart}${separator}${application.id.slice(0, 8)}${suffix}@${domain}`;

      // Check if reseller already has a BVN
      let bvnToUse = application.bvn;

      if (!bvnToUse) {
        // Fetch BVN from waitlist
        const { data: waitlistEntry } = await supabase
          .from("waitlist")
          .select("id, full_name, bvn, mobile")
          .eq("status", "pending")
          .limit(1)
          .order("created_at", { ascending: true });

        if (!waitlistEntry || waitlistEntry.length === 0) {
          return {
            success: false,
            reference,
            error: "No BVNs available. Please contact support.",
          };
        }

        const entry = waitlistEntry[0];
        bvnToUse = entry.bvn;

        // Mark waitlist as used
        await supabase
          .from("waitlist")
          .update({
            status: "used",
            assigned_to: application.id,
            assigned_to_type: "reseller",
            used_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        // Store BVN on reseller
        await supabase
          .from("global_reseller_applications")
          .update({ bvn: bvnToUse })
          .eq("id", resellerId);
      }

      // Prepare Xixapay payload - using waitlist person's details for BVN owner
      const waitlistName =
        application.store_name ||
        `${application.first_name} ${application.last_name}`;
      const waitlistPhone = application.phone || "";

      const xixapayPayload = {
        email: virtualEmail,
        name: waitlistName,
        phoneNumber: waitlistPhone,
        bankCode: ["20867"], // Palmpay
        businessId: XIXAPAY_BUSINESS_ID,
        accountType: "static",
        id_type: "bvn",
        id_number: bvnToUse,
      };

      // Call Xixapay API to create virtual account
      const response = await fetch(
        `${XIXAPAY_BASE_URL}/api/v1/createVirtualAccount`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(xixapayPayload),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        return {
          success: false,
          reference,
          error: data.message || "Failed to create virtual account",
        };
      }

      const bankAccounts = data.bankAccounts || [];
      if (bankAccounts.length === 0) {
        return {
          success: false,
          reference,
          error: "No virtual accounts were created",
        };
      }

      // Store virtual account in database
      const accountRecords = bankAccounts.map((bank: any) => ({
        reseller_id: resellerId,
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_name: bank.accountName,
        account_type: bank.accountType || "static",
        tracking_reference: bank.Reserved_Account_Id,
        provider: "xixapay",
        customer_email: virtualEmail,
        customer_name: waitlistName,
        customer_phone: waitlistPhone,
        customer_bvn: bvnToUse,
        status: "active",
      }));

      await supabase.from("global_virtual_accounts").insert(accountRecords);

      return {
        success: true,
        reference,
        providerReference:
          bankAccounts[0]?.Reserved_Account_Id ||
          bankAccounts[0]?.accountNumber ||
          "",
        // Xixapay uses virtual accounts - no redirect needed
        paymentUrl: undefined,
        redirectUrl: undefined,
      };
    } catch (error) {
      console.error("Xixapay initiatePayment error:", error);
      return {
        success: false,
        reference: generateReference("XIXA"),
        error:
          error instanceof Error ? error.message : "Xixapay payment failed",
      };
    }
  },

  /**
   * Verify webhook signature from Xixapay
   */
  async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
    try {
      const signature = headers.get("xixapay");
      if (!signature) return false;

      const payload = JSON.stringify(body);
      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", XIXAPAY_SECRET_KEY)
        .update(payload)
        .digest("hex");

      return hash === signature;
    } catch (error) {
      console.error("Xixapay verifyWebhook error:", error);
      return false;
    }
  },

  /**
   * Parse webhook data from Xixapay
   */
  parseWebhook(body: any): PaymentWebhookData {
    const {
      notification_status,
      transaction_id,
      amount_paid,
      settlement_amount,
      settlement_fee,
      customer,
      sender,
      receiver,
      description,
      timestamp,
    } = body;

    const status =
      notification_status === "payment_successful" ? "completed" : "pending";

    return {
      reference: transaction_id || body.reference || "",
      status,
      providerReference: transaction_id || "",
      amount: amount_paid || settlement_amount || 0,
      currency: "NGN",
      metadata: {
        sender,
        receiver,
        customer,
        settlement_amount,
        settlement_fee,
        description,
        timestamp,
      },
      customer: customer
        ? {
            name: customer.name,
            email: customer.email,
            customer_id: customer.customer_id,
          }
        : undefined,
    };
  },

  /**
   * Get transaction status from Xixapay
   * Note: Xixapay doesn't have a direct status endpoint
   */
  async getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
      // Query the database for the transaction
      const supabase = await import("@/lib/supabase/server").then((m) =>
        m.createServerClient(),
      );
      const { data: transaction } = await supabase
        .from("global_transactions")
        .select("status, amount, currency, provider_reference")
        .eq("reference", reference)
        .maybeSingle();

      if (transaction) {
        return {
          status: transaction.status as "completed" | "failed" | "pending",
          amount: transaction.amount,
          currency: transaction.currency || "NGN",
          providerReference: transaction.provider_reference,
        };
      }

      return {
        status: "pending",
        providerReference: reference,
      };
    } catch (error) {
      console.error("Xixapay getTransactionStatus error:", error);
      return {
        status: "pending",
        providerReference: reference,
      };
    }
  },

  /**
   * Create virtual account for reseller
   */
  async createVirtualAccount(
    resellerId: string,
    countryCode: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }> {
    try {
      const supabase = await import("@/lib/supabase/server").then((m) =>
        m.createServerClient(),
      );

      // Get reseller details
      const { data: application, error: appError } = await supabase
        .from("global_reseller_applications")
        .select("id, first_name, last_name, email, phone, store_name, bvn")
        .eq("id", resellerId)
        .single();

      if (appError || !application) {
        throw new Error("Reseller not found");
      }

      // Validate email
      const emailCheck = await import("@/lib/email/validateEmail").then((m) =>
        m.checkEmail(application.email),
      );
      if (!emailCheck.valid) {
        throw new Error(`Invalid email format: ${application.email}`);
      }

      // Generate virtual email
      const [localPart, domain] = application.email.split("@");
      const suffix = Math.floor(Math.random() * 9) + 1;
      const separator = localPart.includes("+") ? "" : "+";
      const virtualEmail = `${localPart}${separator}${application.id.slice(0, 8)}${suffix}@${domain}`;

      // Get or create BVN
      let bvnToUse = application.bvn;

      if (!bvnToUse) {
        const { data: waitlistEntry } = await supabase
          .from("waitlist")
          .select("id, full_name, bvn, mobile")
          .eq("status", "pending")
          .limit(1)
          .order("created_at", { ascending: true });

        if (!waitlistEntry || waitlistEntry.length === 0) {
          throw new Error("No BVNs available. Please contact support.");
        }

        const entry = waitlistEntry[0];
        bvnToUse = entry.bvn;

        await supabase
          .from("waitlist")
          .update({
            status: "used",
            assigned_to: application.id,
            assigned_to_type: "reseller",
            used_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        await supabase
          .from("global_reseller_applications")
          .update({ bvn: bvnToUse })
          .eq("id", resellerId);
      }

      const waitlistName =
        application.store_name ||
        `${application.first_name} ${application.last_name}`;
      const waitlistPhone = application.phone || "";

      const xixapayPayload = {
        email: virtualEmail,
        name: waitlistName,
        phoneNumber: waitlistPhone,
        bankCode: ["20867"],
        businessId: XIXAPAY_BUSINESS_ID,
        accountType: "static" as const,
        id_type: "bvn" as const,
        id_number: bvnToUse,
      };

      const response = await fetch(
        `${XIXAPAY_BASE_URL}/api/v1/createVirtualAccount`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(xixapayPayload),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to create virtual account");
      }

      const bankAccounts = data.bankAccounts || [];
      if (bankAccounts.length === 0) {
        throw new Error("No virtual accounts were created");
      }

      // Store in database
      const accountRecords = bankAccounts.map((bank: any) => ({
        reseller_id: resellerId,
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_name: bank.accountName,
        account_type: bank.accountType || "static",
        tracking_reference: bank.Reserved_Account_Id,
        provider: "xixapay",
        customer_email: virtualEmail,
        customer_name: waitlistName,
        customer_phone: waitlistPhone,
        customer_bvn: bvnToUse,
        status: "active",
      }));

      await supabase.from("global_virtual_accounts").insert(accountRecords);

      return {
        accountNumber: bankAccounts[0]?.accountNumber || "",
        accountName: bankAccounts[0]?.accountName || "",
        bankName: bankAccounts[0]?.bankName || "",
      };
    } catch (error) {
      console.error("Xixapay createVirtualAccount error:", error);
      throw error;
    }
  },

  /**
   * Get supported banks from Xixapay
   */
  async getBanks(): Promise<Array<{ bankName: string; bankCode: string }>> {
    try {
      const response = await fetch(`${XIXAPAY_BASE_URL}/api/get/banks`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter out invalid/test bank codes
        return data
          .filter((bank: any) => {
            const code = bank.bank_code;
            const isNumeric = /^\d+$/.test(code);
            const isTooShort = code.length < 3;
            const isFake =
              code.startsWith("faker") ||
              code.startsWith("dyy") ||
              code.startsWith("test") ||
              code === "NOT find in NIP" ||
              code === "888888" ||
              code === "999999" ||
              code === "000333" ||
              code === "314159" ||
              code === "1999999" ||
              code === "999044";
            return isNumeric && !isTooShort && !isFake;
          })
          .map((bank: any) => ({
            bankName: bank.bank_name,
            bankCode: bank.bank_code,
          }));
      }

      return [];
    } catch (error) {
      console.error("Error fetching Xixapay banks:", error);
      return [];
    }
  },

  /**
   * Verify bank account before payout
   */
  async verifyBankAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    try {
      const response = await fetch(`${XIXAPAY_BASE_URL}/api/verify/bank`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          bank: bankCode,
          accountNumber,
        }),
      });

      const data = await response.json();

      if (data.AccountName) {
        return {
          success: true,
          accountName: data.AccountName,
        };
      }

      return {
        success: false,
        error: data.message || data.error || "Account verification failed",
      };
    } catch (error) {
      console.error("Xixapay verifyBankAccount error:", error);
      return {
        success: false,
        error: "Verification failed. Please try again.",
      };
    }
  },

  /**
   * Process a payout (withdrawal) via Xixapay
   */
  async processPayout(params: {
    resellerId: string;
    amount: number;
    bankCode: string;
    accountNumber: string;
    narration?: string;
  }): Promise<{ success: boolean; reference?: string; error?: string }> {
    try {
      const { resellerId, amount, bankCode, accountNumber, narration } = params;

      const response = await fetch(`${XIXAPAY_BASE_URL}/api/v1/transfer`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          businessId: XIXAPAY_BUSINESS_ID,
          amount,
          bank: bankCode,
          accountNumber,
          narration: narration || `Withdrawal from wallet - ${resellerId}`,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          success: true,
          reference: data.reference,
        };
      }

      return {
        success: false,
        error: data.message || "Payout failed",
      };
    } catch (error) {
      console.error("Xixapay processPayout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payout failed",
      };
    }
  },
};



// // src/lib/payments/xixapay.ts
// import {
//   PaymentGateway,
//   PaymentInitiateParams,
//   PaymentInitiateResult,
//   PaymentWebhookData,
// } from "./payment.types";

// const XIXAPAY_BASE_URL = "https://api.xixapay.com";
// const XIXAPAY_API_KEY = process.env.XIXAPAY_API_KEY || "";
// const XIXAPAY_SECRET_KEY = process.env.XIXAPAY_SECRET_KEY || "";
// const XIXAPAY_BUSINESS_ID = process.env.XIXAPAY_BUSINESS_ID || "";

// function getHeaders(): HeadersInit {
//   return {
//     Authorization: `Bearer ${XIXAPAY_SECRET_KEY}`,
//     "api-key": XIXAPAY_API_KEY,
//     "Content-Type": "application/json",
//   };
// }

// // Supported bank codes for Xixapay
// const BANKS = [
//   { code: "20867", name: "Palmpay" },
//   { code: "20987", name: "KOLOMONI MFB" },
//   { code: "29007", name: "Safehaven" },
//   { code: "100004", name: "OPAY" },
// ];

// function generateReference(prefix: string = "XIXA"): string {
//   const timestamp = Date.now().toString(36);
//   const random = Math.random().toString(36).substring(2, 8);
//   return `${prefix}-${timestamp}-${random}`.toUpperCase();
// }

// export const xixapay: PaymentGateway = {
//   /**
//    * Initiate a payment using Xixapay
//    * For Nigeria only - creates virtual accounts for funding
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
//         bankCode,
//         accountType,
//         id_type,
//         id_number,
//       } = params;

//       // Xixapay only supports NGN
//       if (currency !== "NGN") {
//         return {
//           success: false,
//           reference: "",
//           error: "Xixapay only supports NGN currency",
//         };
//       }

//       // Generate reference
//       const reference = generateReference("XIXA");

//       // Determine account type (default to dynamic)
//       const accType = accountType || "dynamic";

//       // Prepare request payload
//       let payload: any = {
//         businessId: XIXAPAY_BUSINESS_ID,
//         bankCode: bankCode ? [bankCode] : ["20867"],
//         accountType: accType,
//       };

//       // If we have customer data from metadata
//       if (metadata?.customer_id) {
//         payload.customer_id = metadata.customer_id;
//       } else {
//         // Use reseller data to create customer
//         const supabase = await import("@/lib/supabase/server").then((m) =>
//           m.createServerClient(),
//         );
//         const { data: application } = await supabase
//           .from("global_reseller_applications")
//           .select("first_name, last_name, email, phone")
//           .eq("id", resellerId)
//           .single();

//         if (application) {
//           payload.email = application.email;
//           payload.name =
//             `${application.first_name} ${application.last_name}`.trim();
//           payload.phoneNumber = application.phone;
//         }
//       }

//       // For static accounts, ID is required
//       if (accType === "static") {
//         if (!id_type || !id_number) {
//           return {
//             success: false,
//             reference,
//             error: "Static account requires id_type and id_number (nin or bvn)",
//           };
//         }
//         payload.id_type = id_type;
//         payload.id_number = id_number;
//       }

//       // For dynamic accounts, amount is required
//       if (accType === "dynamic") {
//         payload.amount = amount;
//       }

//       // Make API call to create virtual account
//       const response = await fetch(
//         `${XIXAPAY_BASE_URL}/api/v1/createVirtualAccount`,
//         {
//           method: "POST",
//           headers: getHeaders(),
//           body: JSON.stringify(payload),
//         },
//       );

//       const data = await response.json();

//       if (!response.ok || data.status === "failed") {
//         return {
//           success: false,
//           reference,
//           error: data.message || "Failed to create virtual account",
//         };
//       }

//       // Extract account details
//       const account = data.bankAccounts?.[0] || {};
//       const customer = data.customer || {};

//       return {
//         success: true,
//         reference,
//         providerReference:
//           account.Reserved_Account_Id || account.accountNumber || "",
//         paymentUrl: undefined, // Xixapay uses virtual accounts, no redirect
//         redirectUrl: undefined,
//       };
//     } catch (error) {
//       console.error("Xixapay initiatePayment error:", error);
//       return {
//         success: false,
//         reference: generateReference("XIXA"),
//         error:
//           error instanceof Error ? error.message : "Xixapay payment failed",
//       };
//     }
//   },

//   /**
//    * Verify webhook signature from Xixapay
//    */
//   async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
//     try {
//       const signature = headers.get("xixapay");
//       if (!signature) return false;

//       const payload = JSON.stringify(body);
//       const crypto = await import("crypto");
//       const hash = crypto
//         .createHmac("sha256", XIXAPAY_SECRET_KEY)
//         .update(payload)
//         .digest("hex");

//       return hash === signature;
//     } catch (error) {
//       console.error("Xixapay verifyWebhook error:", error);
//       return false;
//     }
//   },

//   /**
//    * Parse webhook data from Xixapay
//    */
//   parseWebhook(body: any): PaymentWebhookData {
//     const {
//       notification_status,
//       transaction_id,
//       amount_paid,
//       settlement_amount,
//       customer,
//       sender,
//       receiver,
//     } = body;

//     const status =
//       notification_status === "payment_successful" ? "completed" : "pending";

//     return {
//       reference: transaction_id || body.reference || "",
//       status,
//       providerReference: transaction_id || "",
//       amount: amount_paid || settlement_amount || 0,
//       currency: "NGN",
//       metadata: {
//         sender,
//         receiver,
//         customer,
//         settlement_amount,
//         settlement_fee: body.settlement_fee,
//         description: body.description,
//         timestamp: body.timestamp,
//       },
//       customer: customer
//         ? {
//             name: customer.name,
//             email: customer.email,
//             customer_id: customer.customer_id,
//           }
//         : undefined,
//     };
//   },

//   /**
//    * Get transaction status from Xixapay
//    */
//   async getTransactionStatus(reference: string): Promise<{
//     status: "completed" | "failed" | "pending";
//     amount?: number;
//     currency?: string;
//     providerReference?: string;
//   }> {
//     try {
//       // Xixapay doesn't have a direct status endpoint
//       // We would need to implement this based on their API
//       // For now, we return pending
//       return {
//         status: "pending",
//         providerReference: reference,
//       };
//     } catch (error) {
//       console.error("Xixapay getTransactionStatus error:", error);
//       return {
//         status: "failed",
//         providerReference: reference,
//       };
//     }
//   },

//   /**
//    * Create virtual account for reseller (Xixapay specific)
//    */
//   async createVirtualAccount(
//     resellerId: string,
//     countryCode: string,
//   ): Promise<{
//     accountNumber: string;
//     accountName: string;
//     bankName: string;
//   }> {
//     try {
//       const supabase = await import("@/lib/supabase/server").then((m) =>
//         m.createServerClient(),
//       );

//       // Get reseller details
//       const { data: application } = await supabase
//         .from("global_reseller_applications")
//         .select("first_name, last_name, email, phone")
//         .eq("id", resellerId)
//         .single();

//       if (!application) {
//         throw new Error("Reseller not found");
//       }

//       const payload = {
//         businessId: XIXAPAY_BUSINESS_ID,
//         email: application.email,
//         name: `${application.first_name} ${application.last_name}`.trim(),
//         phoneNumber: application.phone,
//         bankCode: ["20867"],
//         accountType: "static" as const,
//         id_type: "bvn",
//         id_number: "00000000000", // Placeholder - should be collected from user
//       };

//       const response = await fetch(
//         `${XIXAPAY_BASE_URL}/api/v1/createVirtualAccount`,
//         {
//           method: "POST",
//           headers: getHeaders(),
//           body: JSON.stringify(payload),
//         },
//       );

//       const data = await response.json();

//       if (!response.ok || data.status === "failed") {
//         throw new Error(data.message || "Failed to create virtual account");
//       }

//       const account = data.bankAccounts?.[0] || {};

//       return {
//         accountNumber: account.accountNumber || "",
//         accountName: account.accountName || "",
//         bankName: account.bankName || "",
//       };
//     } catch (error) {
//       console.error("Xixapay createVirtualAccount error:", error);
//       throw error;
//     }
//   },
// };
