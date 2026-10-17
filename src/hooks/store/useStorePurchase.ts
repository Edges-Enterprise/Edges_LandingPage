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

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidPhoneNumber } from "@/lib/phone/validatePhoneNumber";
import type { CountryConfig } from "@/config/countries";
import type { StoreProduct } from "@/types/reseller/storefront";

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
      setPurchaseModalOpen(true);
    },
    [loggedIn, hasTransactionPin, onRequireLogin],
  );

  const closePurchase = useCallback(() => {
    if (purchaseLoading) return;
    setPurchaseModalOpen(false);
  }, [purchaseLoading]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan) return;

    if (!isValidPhoneNumber(purchasePhone, config.phoneNumber)) {
      setPurchaseError("Please enter a valid phone number");
      return;
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
    startPurchase,
    closePurchase,
    handlePurchase,
  };
}
