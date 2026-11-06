// src/actions/reseller/publishing/purchasePublishingPlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsdToLocalRate } from "@/lib/currency/exchangeRate";
import { getCountryConfig } from "@/config/countries";
// Server-side price list. The client sends only the plan id, so the amount
// charged cannot be edited from the browser.
import { PUBLISHING_PLAN_PRICES } from "@/lib/publishing/plans";

interface PurchaseResult {
  success: boolean;
  error?: string;
  insufficientFunds?: boolean;
  plan?: string;
  amountUsd?: number;
  amountLocal?: number | null;
  localCurrency?: string;
  /** What actually left the wallet, in the wallet's own currency. */
  charged?: number;
  newBalance?: number;
}

export async function purchasePublishingPlan(
  applicationId: string,
  planId: string,
): Promise<PurchaseResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const price = PUBLISHING_PLAN_PRICES[planId];
    if (!price) {
      return { success: false, error: "Invalid publishing plan" };
    }

    // The session must own the application it is charging.
    const { data: application } = await supabase
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("id", applicationId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!application) {
      return { success: false, error: "Reseller not found" };
    }

    const admin = createAdminClient();

    // Read the wallet before charging so the charge is in the wallet's own
    // currency. A reseller wallet is denominated in the store's country
    // currency (USD when the country has no local rail — Blocker 13), so a
    // local-currency wallet is debited the local value of the USD price, and
    // a USD wallet is debited the USD price. The plan's price list is USD;
    // this is the conversion to what actually leaves the wallet.
    const { data: wallet } = await admin
      .from("global_wallets")
      .select("id, balance, currency")
      .eq("reseller_id", application.id)
      .maybeSingle();

    const walletCurrency = wallet?.currency || "USD";
    // The local currency is the wallet's own currency, or the store's country
    // currency when the wallet is a USD wallet (for the plan record only).
    const localCurrency =
      walletCurrency === "USD"
        ? countryCurrency(application.country_code)
        : walletCurrency;
    const rate = await getUsdToLocalRate(localCurrency);
    const amountLocal = rate ? Math.round(price * rate) : null;

    // USD wallet: the USD price is debited as-is. Local wallet: the local
    // value is debited. A missing rate is a hard failure — charging USD into
    // a local wallet (or vice versa) is how the wrong magnitude leaves the
    // wallet, so never guess.
    const chargeAmount = walletCurrency === "USD" ? price : amountLocal;
    if (chargeAmount == null || chargeAmount <= 0) {
      return {
        success: false,
        error: `Exchange rate unavailable for ${localCurrency}`,
      };
    }

    // deduct_global_reseller_cost is SECURITY DEFINER and locks the wallet
    // row with FOR UPDATE, so two concurrent purchases cannot both pass the
    // balance check.
    const { data: deducted, error: deductError } = await admin.rpc(
      "deduct_global_reseller_cost",
      { p_reseller_id: application.id, p_cost_price: chargeAmount },
    );

    if (deductError) {
      // The function RAISEs on an insufficient balance.
      const message = deductError.message || "";
      if (/insufficient balance/i.test(message)) {
        return {
          success: false,
          insufficientFunds: true,
          error: message,
        };
      }
      console.error("Publishing wallet deduction error:", deductError);
      return { success: false, error: message || "Failed to deduct from wallet" };
    }

    if (!deducted?.success) {
      return {
        success: false,
        error: deducted?.error || "Failed to deduct from wallet",
      };
    }

    const now = new Date().toISOString();

    // Record the plan. RLS is on with no policies, so this goes through the
    // service-role client.
    const { error: planError } = await admin
      .from("global_reseller_publishing")
      .upsert(
        {
          application_id: application.id,
          publishing_plan: planId,
          amount_usd: price,
          amount_local: amountLocal,
          local_currency: localCurrency,
          updated_at: now,
        },
        { onConflict: "application_id" },
      );

    if (planError) {
      console.error("Publishing plan write error:", planError);
      return { success: false, error: planError.message };
    }

    // Ledger row. type/status are constrained to the values the rest of the
    // transactions code uses. `amount` is what left the wallet (the wallet's
    // own currency); the USD price and local equivalent are kept in metadata.
    const { error: txError } = await admin.from("global_transactions").insert({
      reseller_id: application.id,
      wallet_id: wallet?.id || null,
      type: "debit",
      amount: chargeAmount,
      description: `App publishing plan — ${planId}`,
      status: "completed",
      reference: `PUB-${Date.now()}`,
      metadata: {
        plan: planId,
        amount_usd: price,
        amount_local: amountLocal,
        local_currency: localCurrency,
        wallet_currency: walletCurrency,
        charged: chargeAmount,
      },
    });

    if (txError) {
      // The charge and the plan are already committed; the ledger row is
      // informational, so surface it without failing the purchase.
      console.error("Publishing transaction write error:", txError);
    }

    return {
      success: true,
      plan: planId,
      amountUsd: price,
      amountLocal,
      localCurrency,
      charged: chargeAmount,
      newBalance: Number(deducted.new_balance ?? wallet?.balance ?? 0),
    };
  } catch (error) {
    console.error("purchasePublishingPlan threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Country code -> local currency, via the one country config. The wallet's
// own currency is authoritative when it is not USD; this only supplies the
// store's country currency for a USD wallet's plan record.
function countryCurrency(countryCode: string): string {
  return getCountryConfig(countryCode).currency;
}
