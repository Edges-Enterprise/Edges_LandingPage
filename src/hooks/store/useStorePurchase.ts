// src/hooks/store/useStorePurchase.ts
//
// Task 4, pointer 3.a.v.zi.x. Purchase state + handler for the customer
// storefront (legacy ~170-175, ~739-830). Unlike legacy, the legacy
// `purchasePlan` action has no global equivalent (`src/actions/reseller/
// orders/purchasePlan.ts` is a 0-byte stub), so this calls the Task-4
// global purchase edge functions directly via the Supabase functions
// endpoint - `global-purchase-data` / `global-purchase-airtime`, which
// dispatch through `_shared/purchaseOrchestrator.ts` (it already
// supports a customer buying from a store: it resolves userType,
// debits `global_customer_wallets`, and records
// `global_customer_transactions`).
//
// NOTE: `src/app/api/v1/purchase/{data,airtime}` are NOT used here -
// those are the api-key developer API (auth via `x-api-key` against
// `api_users`), not the storefront.
//
// The orchestrator only *verifies* the PIN, it never sets one, so a
// first-time customer's PIN is persisted here before the purchase -
// customer -> `global_customers`, owner -> `global_reseller_applications`
// (matching getCurrentCustomerPinStatus / changeTransactionPin).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidPhoneNumber } from "@/lib/phone/validatePhoneNumber";
import type { CountryConfig } from "@/config/countries";
import type { StoreProduct } from "@/types/reseller/storefront";
import { priceRangeAmount } from "@/actions/reseller/plans/priceRangeAmount";
import {
  lookupNetwork,
  type NetworkDetection,
} from "@/lib/storefront/networkLookup";
import { currencyDivisor } from "../../../supabase/functions/_shared/currency/registry.ts";

interface UseStorePurchaseArgs {
  loggedIn: boolean;
  isStoreOwner: boolean;
  resellerId: string;
  hasTransactionPin: boolean | null;
  config: CountryConfig;
  onPinSet: () => void;
  onPurchased: () => void | Promise<void>;
  onRequireLogin: () => void;
}

export function useStorePurchase({
  loggedIn,
  isStoreOwner,
  resellerId,
  hasTransactionPin,
  config,
  onPinSet,
  onPurchased,
  onRequireLogin,
}: UseStorePurchaseArgs) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StoreProduct | null>(null);
  const [purchasePhone, setPurchasePhone] = useState("");
  const [purchasePin, setPurchasePin] = useState("");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showPinInfo, setShowPinInfo] = useState(false);

  // Phase 2, step 8: a RANGE offer takes the amount the customer enters.
  const [purchaseAmount, setPurchaseAmount] = useState("");
  // The pipeline-priced total for the entered amount, plus any validation
  // message (out of bounds / off step) the server returned.
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  const [amountError, setAmountError] = useState("");
  const [quoting, setQuoting] = useState(false);

  // Phase 2, step 7: carrier/country detection for the entered number.
  const [detection, setDetection] = useState<NetworkDetection | null>(null);

  const startPurchase = useCallback(
    (product: StoreProduct) => {
      if (!loggedIn) {
        onRequireLogin();
        return;
      }
      setSelectedPlan(product);
      setIsCreatingPin(hasTransactionPin === false);
      setPurchasePhone("");
      setPurchasePin("");
      setPurchaseError("");
      setPurchaseSuccess("");
      setShowPin(false);
      setShowCreatePin(false);
      // Seed a RANGE plan at its minimum, which is always a valid amount.
      setPurchaseAmount(
        product.price_type === "RANGE" && product.range_min != null
          ? String(product.range_min)
          : "",
      );
      setQuotedPrice(product.price_type === "RANGE" ? product.price : null);
      setAmountError("");
      setDetection(null);
      setPurchaseModalOpen(true);
    },
    [loggedIn, hasTransactionPin, onRequireLogin],
  );

  const closePurchase = useCallback(() => {
    if (purchaseLoading) return;
    setPurchaseModalOpen(false);
  }, [purchaseLoading]);

  // Detection: debounce the phone input and resolve the carrier/country.
  const detectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!purchaseModalOpen) return;
    const digits = purchasePhone.replace(/\D/g, "");
    if (digits.length < 6) {
      setDetection(null);
      return;
    }
    if (detectTimer.current) clearTimeout(detectTimer.current);
    detectTimer.current = setTimeout(async () => {
      const found = await lookupNetwork(purchasePhone);
      setDetection(found);
    }, 500);
    return () => {
      if (detectTimer.current) clearTimeout(detectTimer.current);
    };
  }, [purchasePhone, purchaseModalOpen]);

  // RANGE: price the entered amount through the same pipeline the purchase
  // uses, so the confirm screen shows what the customer is actually charged.
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!purchaseModalOpen || selectedPlan?.price_type !== "RANGE") return;
    const amount = Number(purchaseAmount);
    if (!purchaseAmount || !Number.isFinite(amount) || amount <= 0) {
      setQuotedPrice(null);
      setAmountError("");
      return;
    }
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    setQuoting(true);
    quoteTimer.current = setTimeout(async () => {
      const result = await priceRangeAmount({
        resellerId,
        providerPlanId: selectedPlan.plan_id ?? selectedPlan.id,
        sendAmount: amount,
      });
      if (result.success && result.data) {
        setQuotedPrice(result.data.customerPrice);
        setAmountError("");
      } else {
        setQuotedPrice(null);
        setAmountError(result.error || "Enter a valid amount");
      }
      setQuoting(false);
    }, 350);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [purchaseAmount, purchaseModalOpen, selectedPlan, resellerId]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan) return;

    if (!isValidPhoneNumber(purchasePhone, config.phoneNumber)) {
      setPurchaseError("Please enter a valid phone number");
      return;
    }
    // A RANGE plan needs a valid, priced amount before it can be bought.
    if (selectedPlan.price_type === "RANGE") {
      if (amountError || quotedPrice === null) {
        setPurchaseError(amountError || "Choose an amount first");
        return;
      }
    }
    if (purchasePin.length !== 4) {
      setPurchaseError(
        isCreatingPin ? "Please create a 4-digit PIN" : "Please enter your 4-digit PIN",
      );
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError("");
    setPurchaseSuccess("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPurchaseError("Session expired. Please sign in again.");
      setPurchaseLoading(false);
      return;
    }

    // Persist a new PIN before purchasing (the orchestrator only verifies).
    if (isCreatingPin) {
      const pinError = isStoreOwner
        ? (
            await supabase
              .from("global_reseller_applications")
              .update({ transaction_pin: purchasePin })
              .eq("auth_user_id", user.id)
          ).error
        : (
            await supabase
              .from("global_customers")
              .update({ transaction_pin: purchasePin })
              .eq("auth_user_id", user.id)
              .eq("reseller_id", resellerId)
          ).error;

      if (pinError) {
        setPurchaseError("Failed to save PIN. Please try again.");
        setPurchaseLoading(false);
        return;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const functionName =
      selectedPlan.category?.toLowerCase() === "airtime"
        ? "global-purchase-airtime"
        : "global-purchase-data";

    let result: any;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            resellerId,
            planId: selectedPlan.plan_id,
            phoneNumber: purchasePhone,
            transactionPin: purchasePin,
            userId: user.id,
            // Phase 2: a RANGE offer carries the recipient amount the
            // customer chose, in minor units of the send currency. Zendit's
            // `ZEND` type is the amount the recipient receives.
            value: selectedPlan.price_type === "RANGE"
              ? {
                type: "ZEND",
                value: Math.round(
                  Number(purchaseAmount) *
                    currencyDivisor(
                      selectedPlan.send_currency ??
                        selectedPlan.currency ??
                        "USD",
                    ),
                ),
              }
              : undefined,
          }),
        },
      );
      result = await response.json();
    } catch {
      setPurchaseError("Transaction failed. Please try again.");
      setPurchaseLoading(false);
      return;
    }

    if (!result?.success) {
      setPurchaseError(result?.error || "Transaction failed. Please try again.");
      setPurchaseLoading(false);
      return;
    }

    setPurchaseSuccess(result.message || "Purchase successful!");
    onPinSet();
    await onPurchased();
    setTimeout(() => {
      setPurchaseModalOpen(false);
      setPurchasePhone("");
      setPurchasePin("");
      setPurchaseSuccess("");
    }, 2500);
    setPurchaseLoading(false);
  }, [
    selectedPlan,
    purchasePhone,
    purchasePin,
    purchaseAmount,
    amountError,
    quotedPrice,
    isCreatingPin,
    isStoreOwner,
    resellerId,
    config,
    onPinSet,
    onPurchased,
  ]);

  return {
    purchaseModalOpen,
    selectedPlan,
    purchasePhone,
    setPurchasePhone,
    purchasePin,
    setPurchasePin,
    purchaseLoading,
    purchaseError,
    purchaseSuccess,
    isCreatingPin,
    showPin,
    setShowPin,
    showCreatePin,
    setShowCreatePin,
    showPinInfo,
    setShowPinInfo,
    // Phase 2: RANGE amount entry + quoted price, and network detection.
    purchaseAmount,
    setPurchaseAmount,
    quotedPrice,
    amountError,
    quoting,
    detection,
    startPurchase,
    closePurchase,
    handlePurchase,
  };
}
