// src/lib/payments/xixapay.ts
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentWebhookData,
} from "./payment.types";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * The only message a reseller sees when account creation fails. Xixapay's own
 * `message` and `errors[]` stay in the server log: they name the BVN check and
 * read as a dead end to a customer who cannot act on them.
 */
const GENERIC_ACCOUNT_ERROR =
  "We couldn't set up your virtual account right now. Please try again in a moment, or contact support if it keeps happening.";

/**
 * How many pool BVNs one request may try before giving up. Bounded so a pool of
 * dead BVNs cannot hold the request open indefinitely.
 */
const BVN_ATTEMPTS_PER_REQUEST = 5;

/**
 * Name and phone that a BVN must be presented with. Xixapay verifies the BVN
 * against them, so they always come from the waitlist row that owns the BVN —
 * never from the reseller's own profile.
 */
async function bvnIdentity(bvn: string): Promise<{
  fullName: string;
  mobile: string;
} | null> {
  const { data } = await createAdminClient()
    .from("waitlist")
    .select("full_name, mobile")
    .eq("bvn", bvn)
    .maybeSingle();
  if (!data) return null;
  return { fullName: data.full_name, mobile: data.mobile };
}

interface AccountAttempt {
  ok: boolean;
  bankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    accountType?: string;
    Reserved_Account_Id?: string;
  }>;
  /** Present only when `ok` is false; safe to log, never shown to a reseller. */
  error?: string;
  /**
   * True when Xixapay refused the BVN itself. Only that verdict retires the
   * waitlist row: a network or server error must not throw a good BVN away.
   */
  bvnRejected?: boolean;
}

/** Xixapay reports a refused BVN as a verification failure, not an HTTP error. */
function isBvnRejection(errors: unknown): boolean {
  if (!Array.isArray(errors)) return false;
  return errors.some(
    (e) => typeof e === "string" && /licen[cs]e|verification/i.test(e),
  );
}

async function requestVirtualAccount(payload: {
  email: string;
  name: string;
  phoneNumber: string;
  id_number: string;
}): Promise<AccountAttempt> {
  try {
    const response = await fetch(
      `${XIXAPAY_BASE_URL}/api/v1/createVirtualAccount`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          ...payload,
          bankCode: ["20867"],
          businessId: XIXAPAY_BUSINESS_ID,
          accountType: "static",
          id_type: "bvn",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
      return {
        ok: false,
        bankAccounts: [],
        error: data.message || "Xixapay rejected the request",
      };
    }

    const bankAccounts = data.bankAccounts || [];
    if (bankAccounts.length === 0) {
      return {
        ok: false,
        bankAccounts: [],
        error: `No accounts returned (${(data.errors || []).join("; ") || "no reason given"})`,
        bvnRejected: isBvnRejection(data.errors),
      };
    }

    return { ok: true, bankAccounts };
  } catch (error) {
    return {
      ok: false,
      bankAccounts: [],
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

/** Take a BVN out of the pool and bind it to this reseller. */
async function claimWaitlistBvn(
  applicationId: string,
  entry: { id: string; bvn: string },
): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient
    .from("waitlist")
    .update({
      status: "used",
      assigned_to: applicationId,
      assigned_to_type: "reseller",
      used_at: new Date().toISOString(),
    })
    .eq("id", entry.id);
  await adminClient
    .from("global_reseller_applications")
    .update({ bvn: entry.bvn })
    .eq("id", applicationId);
}

/**
 * Undo `claimWaitlistBvn`. A BVN that produced no account must go back to the
 * pool, or the next attempt re-reads it from the reseller record and fails the
 * same way forever.
 */
async function releaseWaitlistBvn(
  applicationId: string,
  entryId: string,
): Promise<void> {
  const adminClient = createAdminClient();
  await adminClient
    .from("waitlist")
    .update({
      status: "pending",
      assigned_to: null,
      assigned_to_type: null,
      used_at: null,
    })
    .eq("id", entryId);
  await adminClient
    .from("global_reseller_applications")
    .update({ bvn: null })
    .eq("id", applicationId);
}

/**
 * Retire a BVN Xixapay has refused. It stays `used` so the pool never offers it
 * again, but carries no assignment — it bought no account and belongs to no
 * reseller.
 */
async function retireWaitlistBvn(entryId: string): Promise<void> {
  await createAdminClient()
    .from("waitlist")
    .update({
      status: "used",
      assigned_to: null,
      assigned_to_type: null,
      used_at: new Date().toISOString(),
    })
    .eq("id", entryId);
}

interface VirtualAccountOutcome {
  ok: boolean;
  bankAccounts: AccountAttempt["bankAccounts"];
  /** Safe to log; never shown to a reseller. */
  error?: string;
}

/**
 * Create the virtual account and persist it, without ever stranding a BVN.
 *
 * A BVN is only bound to the reseller once Xixapay has returned an account. On
 * rejection the row is released, so the next attempt starts from the pool
 * instead of replaying a BVN that has already been refused.
 */
async function provisionVirtualAccount(
  application: {
    id: string;
    email: string;
    phone: string | null;
    bvn: string | null;
  },
  virtualEmail: string,
): Promise<VirtualAccountOutcome> {
  const adminClient = createAdminClient();

  const fail = (error: string): VirtualAccountOutcome => ({
    ok: false,
    bankAccounts: [],
    error,
  });

  if (application.bvn) {
    const identity = await bvnIdentity(application.bvn);
    if (!identity) {
      // A BVN with no waitlist row cannot be presented to Xixapay at all. Drop
      // it so this attempt falls back to the pool rather than dead-ending.
      await adminClient
        .from("global_reseller_applications")
        .update({ bvn: null })
        .eq("id", application.id);
    } else {
      const attempt = await requestVirtualAccount({
        email: virtualEmail,
        name: identity.fullName,
        phoneNumber: identity.mobile,
        id_number: application.bvn,
      });

      if (attempt.ok) {
        return saveAccounts(application, virtualEmail, attempt.bankAccounts, {
          fullName: identity.fullName,
          mobile: identity.mobile,
          bvn: application.bvn,
        });
      }

      if (!attempt.bvnRejected) return fail(attempt.error ?? "Request failed");

      // A BVN left over from an earlier failed attempt. Retire it and clear it
      // from the reseller, then fall through to the pool: otherwise this store
      // replays the same refused BVN on every retry, forever.
      console.warn(
        `Retiring rejected BVN ${application.bvn} held by ${application.id}`,
      );
      const { data: held } = await adminClient
        .from("waitlist")
        .select("id")
        .eq("bvn", application.bvn)
        .maybeSingle();
      if (held) await retireWaitlistBvn(held.id);
      await adminClient
        .from("global_reseller_applications")
        .update({ bvn: null })
        .eq("id", application.id);
    }
  }

  const { data: pending, error: waitlistError } = await adminClient
    .from("waitlist")
    .select("id, full_name, bvn, mobile")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BVN_ATTEMPTS_PER_REQUEST);

  if (waitlistError) return fail("Failed to read the BVN pool");
  if (!pending || pending.length === 0) {
    return fail("Not available. Please contact support.");
  }

  // Walk the pool rather than trying only the oldest row. Refused BVNs are
  // retired as we go, so a pool front-loaded with dead BVNs still converges on
  // a working one instead of failing the same way on every attempt.
  for (const entry of pending) {
    const attempt = await requestVirtualAccount({
      email: virtualEmail,
      name: entry.full_name,
      phoneNumber: entry.mobile,
      id_number: entry.bvn,
    });

    if (!attempt.ok) {
      if (attempt.bvnRejected) {
        console.warn(`Retiring rejected BVN on waitlist row ${entry.id}`);
        await retireWaitlistBvn(entry.id);
        continue;
      }
      // Transport or provider fault: the BVN may be fine, so leave it pending.
      return fail(attempt.error ?? "Request failed");
    }

    await claimWaitlistBvn(application.id, entry);

    const saved = await saveAccounts(
      application,
      virtualEmail,
      attempt.bankAccounts,
      { fullName: entry.full_name, mobile: entry.mobile, bvn: entry.bvn },
    );

    if (!saved.ok) {
      // Xixapay holds a live account this reseller cannot see. Return the BVN
      // so a later attempt can still succeed, and let the log carry the detail.
      await releaseWaitlistBvn(application.id, entry.id);
    }
    return saved;
  }

  return fail("No usable BVN in the pool");
}

async function saveAccounts(
  application: { id: string },
  virtualEmail: string,
  bankAccounts: AccountAttempt["bankAccounts"],
  identity: { fullName: string; mobile: string; bvn: string },
): Promise<VirtualAccountOutcome> {
  const records = bankAccounts.map((bank) => ({
    reseller_id: application.id,
    bank_name: bank.bankName,
    account_number: bank.accountNumber,
    account_name: bank.accountName,
    account_type: bank.accountType || "static",
    tracking_reference: bank.Reserved_Account_Id,
    provider: "xixapay",
    customer_email: virtualEmail,
    customer_name: identity.fullName,
    customer_phone: identity.mobile,
    customer_bvn: identity.bvn,
    status: "active",
  }));

  const { error: insertError } = await createAdminClient()
    .from("global_virtual_accounts")
    .insert(records);

  if (insertError) {
    console.error("❌ Failed to save virtual account:", insertError);
    return {
      ok: false,
      bankAccounts: [],
      error: `Failed to save virtual account: ${insertError.message}`,
    };
  }

  return { ok: true, bankAccounts };
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
          error: "This currency is not supported for this payment method.",
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

      // A BVN is only bound to the reseller once Xixapay returns an account,
      // so a rejected BVN stays in the pool for the next signup.
      const outcome = await provisionVirtualAccount(
        application,
        virtualEmail,
      );

      if (!outcome.ok) {
        console.error("Xixapay createVirtualAccount failed:", outcome.error);
        return {
          success: false,
          reference,
          error: GENERIC_ACCOUNT_ERROR,
        };
      }

      const bankAccounts = outcome.bankAccounts;

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
          error instanceof Error ? error.message : "Payment failed",
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

      // A BVN is only bound to the reseller once Xixapay returns an account,
      // so a rejected BVN stays in the pool for the next signup.
      const outcome = await provisionVirtualAccount(
        application,
        virtualEmail,
      );

      if (!outcome.ok) {
        console.error("Xixapay createVirtualAccount failed:", outcome.error);
        throw new Error(GENERIC_ACCOUNT_ERROR);
      }

      const bankAccounts = outcome.bankAccounts;

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
    currency?: string;
    bankCode: string;
    accountNumber: string;
    accountName?: string;
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
        // Xixapay payouts settle instantly and the API has no status endpoint,
        // so a success here is final. There is also no idempotency key in the
        // payload, so a retry after an ambiguous timeout would pay twice.
        return {
          success: true,
          reference: data.reference,
          pending: false,
          definitive: true,
        };
      }

      return {
        success: false,
        error: data.message || "Payout failed",
        definitive: true,
      };
    } catch (error) {
      console.error("Xixapay processPayout error:", error);
      // Unknown outcome: the request may have reached Xixapay. Callers must not
      // refund on this.
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payout failed",
        definitive: false,
      };
    }
  },
};
