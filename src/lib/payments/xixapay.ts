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
      let waitlistName = "";
      let waitlistPhone = "";

      if (!bvnToUse) {
        // ✅ Use admin client to bypass RLS for waitlist table
        const adminClient = await import("@/lib/supabase/admin").then((m) =>
          m.createAdminClient(),
        );

        const { data: waitlistEntry, error: waitlistError } = await adminClient
          .from("waitlist")
          .select("id, full_name, bvn, mobile")
          .eq("status", "pending")
          .limit(1)
          .order("created_at", { ascending: true });

        if (waitlistError) {
          console.error("Waitlist query error:", waitlistError);
          return {
            success: false,
            reference,
            error: "Failed to fetch BVN from waitlist",
          };
        }

        if (!waitlistEntry || waitlistEntry.length === 0) {
          return {
            success: false,
            reference,
            error: "No BVNs available. Please contact support.",
          };
        }

        const entry = waitlistEntry[0];
        bvnToUse = entry.bvn;
        waitlistName = entry.full_name;
        waitlistPhone = entry.mobile;

        // Mark waitlist as used - use admin client
        await adminClient
          .from("waitlist")
          .update({
            status: "used",
            assigned_to: application.id,
            assigned_to_type: "reseller",
            used_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        // Store BVN on reseller - use admin client
        await adminClient
          .from("global_reseller_applications")
          .update({ bvn: bvnToUse })
          .eq("id", resellerId);
      } else {
        // Reseller already has BVN - fetch waitlist entry
        const adminClient = await import("@/lib/supabase/admin").then((m) =>
          m.createAdminClient(),
        );

        const { data: waitlistEntry } = await adminClient
          .from("waitlist")
          .select("full_name, mobile")
          .eq("bvn", bvnToUse)
          .single();

        if (waitlistEntry) {
          waitlistName = waitlistEntry.full_name;
          waitlistPhone = waitlistEntry.mobile;
        } else {
          // Fallback: use reseller's data if waitlist entry not found
          waitlistName =
            application.store_name ||
            `${application.first_name} ${application.last_name}`.trim() ||
            "Customer";
          waitlistPhone = application.phone || "08000000000";
        }
      }

      // Prepare Xixapay payload
      const xixapayPayload = {
        email: virtualEmail,
        name: waitlistName,
        phoneNumber: waitlistPhone,
        bankCode: ["20867"],
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
        console.error("Xixapay createVirtualAccount error:", data);
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

      // ✅ Use admin client to bypass RLS for insert
      const adminClient = await import("@/lib/supabase/admin").then((m) =>
        m.createAdminClient(),
      );

      // Store virtual account in database - NO status column!
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
        // ❌ DO NOT include status - column doesn't exist
      }));

      console.log("📝 Inserting virtual account records:", accountRecords);

      const { error: insertError } = await adminClient
        .from("global_virtual_accounts")
        .insert(accountRecords);

      if (insertError) {
        console.error("❌ Failed to insert virtual account:", insertError);
        return {
          success: false,
          reference,
          error:
            "Failed to save virtual account to database: " +
            insertError.message,
        };
      }

      console.log("✅ Virtual account saved to database successfully");

      return {
        success: true,
        reference,
        providerReference:
          bankAccounts[0]?.Reserved_Account_Id ||
          bankAccounts[0]?.accountNumber ||
          "",
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
   * Header: xixapay
   * HMAC SHA256 of the full body
   */
  async verifyWebhook(body: any, headers: Headers): Promise<boolean> {
    try {
      const signature = headers.get("xixapay");
      if (!signature) {
        console.warn("Xixapay webhook: Missing xixapay signature header");
        return false;
      }

      const payload = JSON.stringify(body);
      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", XIXAPAY_SECRET_KEY)
        .update(payload)
        .digest("hex");

      const isValid = hash === signature;
      if (!isValid) {
        console.warn("Xixapay webhook: Signature verification failed", {
          expected: hash,
          received: signature,
        });
      }
      return isValid;
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
      amount: parseFloat(amount_paid) || parseFloat(settlement_amount) || 0,
      currency: "NGN",
      metadata: {
        sender,
        receiver,
        customer,
        settlement_amount,
        settlement_fee,
        description,
        timestamp,
        transaction_id,
        notification_status,
      },
      customer: customer
        ? {
            name: customer.name,
            email: customer.email,
            customer_id: customer.customer_id,
          }
        : undefined,
      sender: sender
        ? {
            name: sender.name,
            account_number: sender.account_number,
            bank: sender.bank,
          }
        : undefined,
      receiver: receiver
        ? {
            name: receiver.name,
            account_number: receiver.account_number,
            bank: receiver.bank,
          }
        : undefined,
    };
  },

  /**
   * Get transaction status from Xixapay
   * Note: Xixapay doesn't have a direct status endpoint
   * We query the database for the transaction
   */
  async getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }> {
    try {
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
   * Create virtual account for reseller (Xixapay specific)
   * Used by the VirtualAccount component
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
      let waitlistName = "";
      let waitlistPhone = "";

      if (!bvnToUse) {
        // ✅ Use admin client to bypass RLS for waitlist table
        const adminClient = await import("@/lib/supabase/admin").then((m) =>
          m.createAdminClient(),
        );

        const { data: waitlistEntry, error: waitlistError } = await adminClient
          .from("waitlist")
          .select("id, full_name, bvn, mobile")
          .eq("status", "pending")
          .limit(1)
          .order("created_at", { ascending: true });

        if (waitlistError) {
          console.error("Waitlist query error:", waitlistError);
          throw new Error("Failed to fetch BVN from waitlist");
        }

        if (!waitlistEntry || waitlistEntry.length === 0) {
          throw new Error("No BVNs available. Please contact support.");
        }

        const entry = waitlistEntry[0];
        bvnToUse = entry.bvn;
        waitlistName = entry.full_name;
        waitlistPhone = entry.mobile;

        // Mark waitlist as used - use admin client
        await adminClient
          .from("waitlist")
          .update({
            status: "used",
            assigned_to: application.id,
            assigned_to_type: "reseller",
            used_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        // Store BVN on reseller - use admin client
        await adminClient
          .from("global_reseller_applications")
          .update({ bvn: bvnToUse })
          .eq("id", resellerId);
      } else {
        // Reseller already has BVN - fetch waitlist entry
        const adminClient = await import("@/lib/supabase/admin").then((m) =>
          m.createAdminClient(),
        );

        const { data: waitlistEntry } = await adminClient
          .from("waitlist")
          .select("full_name, mobile")
          .eq("bvn", bvnToUse)
          .single();

        if (waitlistEntry) {
          waitlistName = waitlistEntry.full_name;
          waitlistPhone = waitlistEntry.mobile;
        } else {
          // Fallback: use reseller's data if waitlist entry not found
          waitlistName =
            application.store_name ||
            `${application.first_name} ${application.last_name}`.trim() ||
            "Customer";
          waitlistPhone = application.phone || "08000000000";
        }
      }

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

      // Call Xixapay API
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

      // ✅ Use admin client to bypass RLS for insert
      const adminClient = await import("@/lib/supabase/admin").then((m) =>
        m.createAdminClient(),
      );

      // Store in database - NO status column!
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

      console.log("📝 Inserting virtual account records:", accountRecords);

      const { error: insertError } = await adminClient
        .from("global_virtual_accounts")
        .insert(accountRecords);

      if (insertError) {
        console.error("❌ Failed to insert virtual account:", insertError);
        throw new Error(
          "Failed to save virtual account: " + insertError.message,
        );
      }

      console.log("✅ Virtual account saved to database successfully");

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
