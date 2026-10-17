// src/actions/reseller/wallet/createVirtualAccount.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { xixapay } from "@/lib/payments/xixapay";
import { PaymentGateway } from "@/lib/payments/payment.types";

// Define the extended type that Xixapay implements
interface XixapayGateway extends PaymentGateway {
  createVirtualAccount(
    resellerId: string,
    countryCode: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }>;
  getBanks(): Promise<Array<{ bankName: string; bankCode: string }>>;
  verifyBankAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<{ success: boolean; accountName?: string; error?: string }>;
  processPayout(params: {
    resellerId: string;
    amount: number;
    bankCode: string;
    accountNumber: string;
    narration?: string;
  }): Promise<{ success: boolean; reference?: string; error?: string }>;
}

interface CreateVirtualAccountParams {
  applicationId: string;
  countryCode: string;
}

export async function createVirtualAccount({
  applicationId,
  countryCode,
}: CreateVirtualAccountParams): Promise<{
  success: boolean;
  data?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  };
  error?: string;
}> {
  try {
    if (!applicationId) {
      return {
        success: false,
        error: "Application ID is required",
      };
    }

    const supabase = await createServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Verify the application belongs to the user
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, auth_user_id")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return {
        success: false,
        error: "Application not found",
      };
    }

    if (application.auth_user_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check if virtual account already exists
    const { data: existingAccount } = await supabase
      .from("global_virtual_accounts")
      .select("id")
      .eq("reseller_id", applicationId)
      .maybeSingle();

    if (existingAccount) {
      return {
        success: false,
        error: "Virtual account already exists",
      };
    }

    // ✅ Cast xixapay to the extended type - this method exists on Xixapay
    const xixapayGateway = xixapay as XixapayGateway;

    // Create virtual account using Xixapay
    const result = await xixapayGateway.createVirtualAccount(
      applicationId,
      countryCode,
    );

    return {
      success: true,
      data: {
        accountNumber: result.accountNumber,
        accountName: result.accountName,
        bankName: result.bankName,
      },
    };
  } catch (error) {
    console.error("Create virtual account error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create virtual account",
    };
  }
}
