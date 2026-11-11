// supabase/functions/_shared/purchaseOrchestrator.ts
//
// Task 4, branch 1.d.iii. The global_* equivalent of the proven
// purchase-data/purchase-airtime pattern (identity resolution, base
// plan + reseller markup config lookup, dual balance checks, PIN
// verification, provider call, deduction, order + transaction
// recording). Shared by both global-purchase-data and
// global-purchase-airtime rather than duplicated, since this is
// money-movement logic - see HANDOVER.md Task 4 for the full design
// writeup, including why this does NOT always deduct on a successful
// provider call (see providers.ts's `final` flag).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { purchaseFromProvider, PurchaseCategory } from "./providers.ts";
import { getCountryDialCode } from "./countryDialCodes.ts";
import {
  loadStoreContext,
  pricePlan,
  priceRangePlan,
  PriceUnavailableError,
} from "./currency/storePrice.ts";
import { currencyDivisor } from "./currency/registry.ts";
import { RangeError as RangeValidationError } from "./currency/range.ts";
import {
  resolveCatalogPlan,
  toStoreCatalogSettings,
} from "./catalog/catalogResolution.ts";

export interface PurchaseRequest {
  resellerId: string; // global_reseller_applications.id for the store being bought from
  providerPlanId: string; // global_base_plans.provider_plan_id, as shown to the buyer
  phoneNumber: string;
  transactionPin: string;
  userId: string; // auth.users.id of the caller (reseller or customer)
  // Phase 2: the customer's chosen amount for a Zendit RANGE offer (airtime
  // top-up). Absent for FIXED offers.
  value?: { type: "PRICE" | "ZEND"; value: number };
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  plan_name?: string;
  amount?: number;
  order_id?: string;
  status?: "completed" | "pending";
  error?: string;
}

export async function processPurchase(
  supabaseAdmin: SupabaseClient,
  category: PurchaseCategory,
  req: PurchaseRequest,
): Promise<PurchaseResult> {
  const { resellerId, providerPlanId, phoneNumber, transactionPin, userId } =
    req;

  // 1. Resolve caller identity - reseller self-purchase vs customer,
  // same branch structure as the proven legacy pattern.
  let customerId: string | null = null;
  let userType: "reseller" | "customer";
  let customerEmail: string | null = null;
  let customerName = "";

  const { data: reseller } = await supabaseAdmin
    .from("global_reseller_applications")
    .select("id, first_name, last_name, email")
    .eq("id", resellerId)
    .eq("auth_user_id", userId)
    .eq("application_status", "active")
    .maybeSingle();

  if (reseller) {
    userType = "reseller";
    customerEmail = reseller.email;
    customerName = `${reseller.first_name} ${reseller.last_name}`.trim();
  } else {
    const { data: customer } = await supabaseAdmin
      .from("global_customers")
      .select("id, reseller_id, email, first_name, last_name")
      .eq("reseller_id", resellerId)
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!customer) {
      return { success: false, error: "User not found", message: "User not found" };
    }

    userType = "customer";
    customerId = customer.id;
    customerEmail = customer.email;
    customerName = `${customer.first_name} ${customer.last_name}`.trim();
  }

  // 2. Resolve the base plan by its provider-facing id + country/category scope.
  const { data: basePlan, error: basePlanError } = await supabaseAdmin
    .from("global_base_plans")
    .select(
      "id, provider, provider_plan_id, country_code, network, name, category, base_price, currency, price_type, range_min, range_max, range_increment, send_value, send_currency, zendit_fx",
    )
    .eq("provider_plan_id", providerPlanId)
    .eq("category", category)
    .eq("is_active", true)
    .single();

  if (basePlanError || !basePlan) {
    return { success: false, error: "Plan not available", message: "Plan not available" };
  }

  // 3. Resolve what this store sells and the plan's markup, the same way the
  //    storefront does. A store in `all` mode sells every active plan, priced
  //    by its default markup when the plan has no config row; a per-plan row
  //    is an override (enabled = false opts one plan out). In `selected` mode
  //    the plan needs an enabled row. Resolving here - not a bare
  //    `.eq("enabled", true)` lookup - is what lets a customer buy a plan that
  //    has no row, and keeps the charged price equal to the displayed one.
  const { data: rawPlanConfig } = await supabaseAdmin
    .from("global_reseller_plan_configs")
    .select("id, enabled, markup_type, markup_value, selling_price")
    .eq("reseller_id", resellerId)
    .eq("plan_id", basePlan.id)
    .maybeSingle();

  // 3b. The store's country and catalog settings. Phase 2 prices a plan into
  //     the store's own currency, and the currency comes from the store's
  //     country, never from the caller or from the plan.
  const { data: storeRow } = await supabaseAdmin
    .from("global_reseller_applications")
    .select("country_code, catalog_mode, default_markup_type, default_markup_value")
    .eq("id", resellerId)
    .maybeSingle();
  const storeCountry = (storeRow?.country_code || "").toLowerCase();

  const resolvedPlan = resolveCatalogPlan(
    rawPlanConfig as never,
    toStoreCatalogSettings(storeRow as never),
  );
  if (!resolvedPlan.include) {
    return { success: false, error: "Plan not available", message: "Plan not available" };
  }
  const planConfig = resolvedPlan.config;

  // 4. Calculate the final price through the one pricing pipeline.
  //
  //    base_price is a USD wholesale cost (normalised at catalog sync), so
  //    the customer price, the platform price and the provider cost are all
  //    in the store currency.
  //
  //    Two different numbers come out of the pipeline and must not be
  //    confused:
  //      * costPrice     = the PLATFORM price (raw cost + platform markup +
  //                        FX buffer). This is the reseller's cost basis:
  //                        process_global_purchase_deductions credits the
  //                        reseller (selling_price - cost_price), and the
  //                        balance check uses it.
  //      * providerCost  = the RAW wholesale cost. This is what the platform
  //                        pays the provider, so it is what the provider call
  //                        must send — never the platform price.
  //
  //    This replaces the old local arithmetic (selling_price, else markup on
  //    base_price) with the same function the storefront and dashboard use,
  //    so the three can no longer disagree.
  let costPrice: number;
  let providerCost: number;
  let finalPrice: number;
  let profit: number;
  let priceDetail;
  try {
    const { context, platformMarkups } = await loadStoreContext(
      supabaseAdmin,
      { countryCode: storeCountry, planId: basePlan.id },
    );

    // A RANGE offer is priced from the amount the customer chose, against
    // the bounds we just read (current, not a cached snapshot), so a stale
    // bound cannot let an invalid amount reach Zendit. A FIXED offer prices
    // from its stored cost as before.
    const isRange =
      (basePlan.price_type ?? "FIXED").toUpperCase() === "RANGE";

    if (isRange) {
      if (!req.value) {
        return {
          success: false,
          error: "Choose an amount",
          message: "Choose an amount",
        };
      }
      // The customer's entry is a recipient amount in the send currency.
      // `value.value` is in minor units, so it is scaled back for pricing.
      const sendDivisor = currencyDivisor(basePlan.send_currency ?? context.currency);
      priceDetail = priceRangePlan(
        basePlan as never,
        planConfig as never,
        context,
        platformMarkups,
        req.value.value / sendDivisor,
      );
    } else {
      priceDetail = pricePlan(
        basePlan as never,
        planConfig as never,
        context,
        platformMarkups,
      );
    }

    finalPrice = priceDetail.customerPriceDecimal;
    costPrice = priceDetail.platformLocalDecimal;
    providerCost = priceDetail.costLocalDecimal;
    profit = finalPrice - costPrice;
  } catch (error) {
    if (error instanceof RangeValidationError) {
      return { success: false, error: error.message, message: error.message };
    }
    if (error instanceof PriceUnavailableError) {
      console.error("purchase pricing unavailable:", error.message);
      return {
        success: false,
        error: "Store pricing unavailable",
        message: "Store pricing unavailable",
      };
    }
    throw error;
  }

  // 5. Reseller must be able to cover the wholesale cost, regardless of
  // who is buying - same as the proven pattern.
  const { data: resellerBalance, error: balanceError } = await supabaseAdmin
    .rpc("get_global_reseller_balance", { p_reseller_id: resellerId });

  if (balanceError) {
    return {
      success: false,
      error: "Store configuration error. Please contact support.",
      message: "Store configuration error. Please contact support.",
    };
  }

  if (parseFloat(resellerBalance || "0") < costPrice) {
    return {
      success: false,
      error: "Unable to fulfill this order. Please try again later.",
      message: "Unable to fulfill this order. Please try again later.",
    };
  }

  // 6. Customer wallet check (reseller self-purchase has no separate wallet to check here).
  let customerWallet: { id: string; balance: number } | null = null;

  if (userType === "customer") {
    const { data: wallet } = await supabaseAdmin
      .from("global_customer_wallets")
      .select("id, balance")
      .eq("reseller_id", resellerId)
      .eq("customer_id", customerId)
      .single();

    if (!wallet) {
      return { success: false, error: "Customer wallet not found", message: "Customer wallet not found" };
    }

    if (wallet.balance < finalPrice) {
      return {
        success: false,
        error: `Insufficient balance. Need ${finalPrice} but have ${wallet.balance}`,
        message: `Insufficient balance. Need ${finalPrice} but have ${wallet.balance}`,
      };
    }

    customerWallet = wallet;
  }

  // 7. Verify transaction PIN - from global_reseller_applications for a
  // self-purchase, global_customers otherwise.
  let storedPin: string | null = null;

  if (userType === "reseller") {
    const { data: resellerPinRow } = await supabaseAdmin
      .from("global_reseller_applications")
      .select("transaction_pin")
      .eq("id", resellerId)
      .single();
    storedPin = resellerPinRow?.transaction_pin ?? null;
  } else {
    const { data: customerPinRow } = await supabaseAdmin
      .from("global_customers")
      .select("transaction_pin")
      .eq("id", customerId)
      .single();
    storedPin = customerPinRow?.transaction_pin ?? null;
  }

  if (!storedPin) {
    return {
      success: false,
      error: "No transaction PIN found. Please set your PIN and try again.",
      message: "No transaction PIN found. Please set your PIN and try again.",
    };
  }

  if (transactionPin !== storedPin) {
    return { success: false, error: "Invalid transaction PIN", message: "Invalid transaction PIN" };
  }

  // 8. Generate a unique request id (reused as each provider's own idempotency key).
  const requestId = `GRC_${category.toUpperCase()}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)
    .toUpperCase()}`;

  // 9. Call the provider.
  const dialCode = getCountryDialCode(basePlan.country_code);
  const providerResult = await purchaseFromProvider(
    {
      category,
      provider: basePlan.provider as "lizzysub" | "accragh" | "zendit",
      providerPlanId: basePlan.provider_plan_id,
      phoneNumber,
      countryDialCode: dialCode,
      // The provider is paid the raw wholesale cost, not the platform price.
      amount: providerCost,
      requestId,
      // Phase 2: a RANGE offer needs the chosen amount carried through to
      // the provider call. A FIXED offer must not send one.
      priceType: priceDetail.priceType,
      value: priceDetail.priceType === "RANGE" ? req.value : undefined,
    },
    basePlan.network || "",
  );

  // 10. Provider definitively rejected the request - nothing to deduct, log a failed order.
  if (!providerResult.ok) {
    await supabaseAdmin.rpc("create_global_purchase_order", {
      p_reseller_id: resellerId,
      p_customer_id: customerId,
      p_customer_name: customerName || customerEmail || "Unknown",
      p_plan_id: basePlan.id,
      p_plan_name: basePlan.name,
      p_amount: finalPrice,
      p_profit: profit,
      p_payment_method: basePlan.provider,
      p_transaction_reference: requestId,
      p_status: "failed",
    });

    return { success: false, error: providerResult.message, message: providerResult.message };
  }

  // 11. Provider accepted but has NOT confirmed final success yet
  // (accragh/zendit - see providers.ts). Record a pending order and a
  // pending ledger entry on both sides, but do NOT move any wallet
  // balance - that only happens once a webhook confirms completion.
  // AccraGH orders are finished by the accragh-webhook edge function via
  // the settle_global_pending_purchase SQL function (matching on
  // global_orders.transaction_reference = the provider's order_ref).
  // Zendit orders are finished the same way by the zendit-webhook edge
  // function (matching on the transactionId we supplied, which is stored
  // here as the transaction reference).
  if (!providerResult.final) {
    const { data: pendingOrderId } = await supabaseAdmin.rpc(
      "create_global_purchase_order",
      {
        p_reseller_id: resellerId,
        p_customer_id: customerId,
        p_customer_name: customerName || customerEmail || "Unknown",
        p_plan_id: basePlan.id,
        p_plan_name: basePlan.name,
        p_amount: userType === "reseller" ? costPrice : finalPrice,
        p_profit: userType === "reseller" ? 0 : profit,
        p_payment_method: basePlan.provider,
        p_transaction_reference: providerResult.providerReference || requestId,
        p_status: "pending",
      },
    );

    if (userType === "customer" && customerWallet) {
      await supabaseAdmin.from("global_customer_transactions").insert({
        reseller_id: resellerId,
        customer_id: customerId,
        type: "purchase",
        amount: finalPrice,
        net_amount: finalPrice,
        previous_balance: customerWallet.balance,
        new_balance: customerWallet.balance, // unchanged - not deducted yet
        order_id: pendingOrderId,
        plan_id: basePlan.id,
        reference: providerResult.providerReference || requestId,
        status: "pending",
        description: `Purchased ${basePlan.name} (${basePlan.network || basePlan.provider}) - awaiting confirmation`,
        metadata: { provider: basePlan.provider, provider_response: providerResult.raw },
      });
    }

    return {
      success: true,
      message: providerResult.message,
      plan_name: basePlan.name,
      amount: userType === "reseller" ? costPrice : finalPrice,
      order_id: pendingOrderId,
      status: "pending",
    };
  }

  // 12. Final, confirmed success (lizzysub) - deduct for real.
  let deductionOk = false;

  if (userType === "customer" && customerWallet) {
    const { data: result, error: deductionError } = await supabaseAdmin.rpc(
      "process_global_purchase_deductions",
      {
        p_customer_wallet_id: customerWallet.id,
        p_customer_deduct: finalPrice,
        p_reseller_id: resellerId,
        p_cost_price: costPrice,
        p_selling_price: finalPrice,
        p_profit: profit,
      },
    );
    deductionOk = !deductionError && !!result?.success;

    if (!deductionOk) {
      const { error: failedLedgerError } = await supabaseAdmin
        .from("global_transactions")
        .insert({
          reseller_id: resellerId,
          amount: finalPrice,
          type: "purchase",
          status: "failed",
          reference: requestId,
          payment_gateway: basePlan.provider,
          description: `Failed purchase ${basePlan.name} (${basePlan.network || basePlan.provider}) - deduction failed after delivery`,
          metadata: {
            plan_id: basePlan.id,
            plan_name: basePlan.name,
            customer_email: customerEmail,
            phone_number: phoneNumber,
            error: "Deduction failed after delivery (unexpected)",
            requires_manual_reconciliation: true,
          },
        });

      if (failedLedgerError) {
        console.error(
          "failed-purchase ledger insert failed:",
          failedLedgerError.message,
        );
      }

      return {
        success: false,
        error: "Transaction failed. Please contact support.",
        message: "Transaction failed. Please contact support.",
      };
    }
  } else {
    const { data: result, error: deductionError } = await supabaseAdmin.rpc(
      "deduct_global_reseller_cost",
      { p_reseller_id: resellerId, p_cost_price: costPrice },
    );
    deductionOk = !deductionError && !!result?.success;

    if (!deductionOk) {
      return {
        success: false,
        error: "Transaction failed. Please contact support.",
        message: "Transaction failed. Please contact support.",
      };
    }
  }

  // 13. Create the completed order.
  const { data: orderId } = await supabaseAdmin.rpc(
    "create_global_purchase_order",
    {
      p_reseller_id: resellerId,
      p_customer_id: customerId,
      p_customer_name: customerName || customerEmail || "Unknown",
      p_plan_id: basePlan.id,
      p_plan_name: basePlan.name,
      p_amount: userType === "reseller" ? costPrice : finalPrice,
      p_profit: userType === "reseller" ? 0 : profit,
      p_payment_method: basePlan.provider,
      p_transaction_reference: requestId,
      p_status: "completed",
    },
  );

  // 14. Record the customer-side transaction.
  if (userType === "customer" && customerWallet) {
    const customerNewBalance = customerWallet.balance - finalPrice;

    await supabaseAdmin.from("global_customer_transactions").insert({
      reseller_id: resellerId,
      customer_id: customerId,
      type: "purchase",
      amount: finalPrice,
      net_amount: finalPrice,
      previous_balance: customerWallet.balance,
      new_balance: customerNewBalance,
      order_id: orderId,
      plan_id: basePlan.id,
      reference: `ORDER_${orderId}`,
      status: "completed",
      description: `Purchased ${basePlan.name} (${basePlan.network || basePlan.provider})`,
      metadata: {
        plan_name: basePlan.name,
        network: basePlan.network,
        provider: basePlan.provider,
        phone_number: phoneNumber,
        request_id: requestId,
        profit,
        cost_price: costPrice,
        provider_response: providerResult.raw,
      },
    });
  }

  // 15. Record the reseller-side ledger entry (always - both self-purchase and customer sales).
  const { error: ledgerError } = await supabaseAdmin
    .from("global_transactions")
    .insert({
      reseller_id: resellerId,
      amount: userType === "reseller" ? costPrice : finalPrice,
      type: "purchase",
      status: "completed",
      reference: orderId || requestId,
      payment_gateway: basePlan.provider,
      description: `Purchased ${basePlan.name} (${basePlan.network || basePlan.provider})`,
      metadata: {
        order_id: orderId,
        plan_id: basePlan.id,
        plan_name: basePlan.name,
        customer_email: customerEmail,
        phone_number: phoneNumber,
        provider_ref: requestId,
      },
    });

  // The order and wallet movements are already committed; a ledger-row failure
  // must not fail the purchase, but it must not be swallowed either.
  if (ledgerError) {
    console.error("reseller ledger insert failed:", ledgerError.message);
  }

  // Notify the buyer's own inbox. global_notifications is the owner's inbox,
  // global_customer_notifications a customer's - same split the mobile
  // global-store-notifications function uses. Best-effort: the order is
  // already placed, so a failed insert must not fail the purchase.
  const purchaseMessage = `${basePlan.name} (${basePlan.network || basePlan.provider}) purchased for ${phoneNumber}.`;
  const purchaseMetadata = {
    order_id: orderId,
    plan_name: basePlan.name,
    network: basePlan.network,
    phone_number: phoneNumber,
    amount: userType === "reseller" ? costPrice : finalPrice,
    request_id: requestId,
  };

  if (userType === "customer" && customerId) {
    await supabaseAdmin.from("global_customer_notifications").insert({
      reseller_id: resellerId,
      customer_id: customerId,
      notification_type: "purchase",
      message: purchaseMessage,
      metadata: purchaseMetadata,
    });
  } else {
    await supabaseAdmin.from("global_notifications").insert({
      reseller_id: resellerId,
      notification_type: "purchase",
      message: purchaseMessage,
      metadata: purchaseMetadata,
    });
  }

  return {
    success: true,
    message: providerResult.message || `${basePlan.name} purchased successfully!`,
    plan_name: basePlan.name,
    amount: userType === "reseller" ? costPrice : finalPrice,
    order_id: orderId,
    status: "completed",
  };
}
