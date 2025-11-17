// components/cable-client.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IoAlertOutline,
  IoReloadOutline,
  IoCheckmarkCircle,
  IoChevronForwardOutline,
} from "react-icons/io5";
import { CABLE_PROVIDERS } from "@/constants/helper";
import { validateIucAction, purchaseCableAction } from "@/app/actions/cable";

// Clean plan name helper
const cleanPlanName = (name: string): string => {
  return name
    .replace(/\s*\d+(?:,\d+)*\s*$/, "")
    .replace(/\s*-\s*(1\s*Month|monthly)/i, "")
    .trim();
};

interface CablePlan {
  id: string;
  name: string;
  price: number;
  duration: string;
}

interface CableTVClientProps {
  initialBalance: number;
  plansByProvider: { [key: string]: CablePlan[] };
  userId: string;
}

export default function CableTVClient({
  initialBalance,
  plansByProvider,
  userId,
}: CableTVClientProps) {
  const router = useRouter();

  // State
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [bypassVerification, setBypassVerification] = useState(false);
  const [iucOwnerName, setIucOwnerName] = useState<string | null>(null);
  const [iucVerificationError, setIucVerificationError] = useState<
    string | null
  >(null);
  const [isValidatingIuc, setIsValidatingIuc] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [transactionPin, setTransactionPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Format number with commas
  const formatNumberWithCommas = (number: number): string => {
    return number.toLocaleString();
  };

  // Validate smart card number
  const isSmartCardValid =
    bypassVerification ||
    (smartCardNumber.length === 10 && /^\d{10}$/.test(smartCardNumber));

  // Verify IUC number
  const verifyIucNumber = async (card: string, provider: any) => {
    if (bypassVerification || !provider || card.length !== 10) {
      setIucOwnerName(null);
      setIucVerificationError(null);
      return;
    }

    setIsValidatingIuc(true);
    setIucOwnerName(null);
    setIucVerificationError(null);

    const result = await validateIucAction(card, provider.name);

    if (result.success && result.customerName) {
      setIucOwnerName(result.customerName);
      setIucVerificationError(null);
    } else {
      setIucOwnerName(null);
      setIucVerificationError(result.error || "Invalid IUC number");
    }
    setIsValidatingIuc(false);
  };

  // Auto-validate IUC when card number is complete
  useEffect(() => {
    if (
      smartCardNumber.length === 10 &&
      selectedProvider &&
      !bypassVerification
    ) {
      verifyIucNumber(smartCardNumber, selectedProvider);
    } else {
      setIucOwnerName(null);
      setIucVerificationError(null);
      setIsValidatingIuc(false);
    }
  }, [smartCardNumber, selectedProvider, bypassVerification]);

  // Handle provider selection
  const handleSelectProvider = (provider: any) => {
    setSelectedProvider(provider);
    setSelectedPlan(null);
    setSmartCardNumber("");
    setIucOwnerName(null);
    setIucVerificationError(null);
  };

  // Handle plan selection
  const selectPlan = (plan: CablePlan) => {
    setSelectedPlan(selectedPlan?.id === plan.id ? null : plan);
  };

  // Check if purchase is enabled
  const isPurchaseEnabled =
    selectedProvider &&
    (bypassVerification || (isSmartCardValid && !iucVerificationError)) &&
    selectedPlan &&
    transactionPin.length >= 4;

  // Handle purchase
  const handlePurchase = async () => {
    if (!isPurchaseEnabled || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = {
      provider: selectedProvider.name,
      iuc: smartCardNumber,
      planId: selectedPlan!.id,
      planName: selectedPlan!.name,
      price: selectedPlan!.price,
      pin: transactionPin,
      bypass: bypassVerification,
    };

    try {
      const result = await purchaseCableAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          `Cable subscription purchased successfully! Reference: ${result.data?.reference}. Redirecting...`
        );
        setTimeout(() => router.push("/history"), 2000);
      }
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
      console.error("Purchase error:", err);
    } finally {
      setLoading(false);
      setTransactionPin(""); // Clear PIN for security
    }
  };

  // Get plans for selected provider
  const currentPlans = selectedProvider
    ? plansByProvider[selectedProvider.name] || []
    : [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Cable TV Subscription
          </h1>
          <p className="text-gray-400">
            Select provider and plan to renew your subscription
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="bg-zinc-900 rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-400">
            Wallet Balance:
          </span>
          <span className="text-lg font-bold text-white">
            ₦{formatNumberWithCommas(initialBalance)}
          </span>
        </div>

        {/* Select Provider */}
        <div>
          <h2 className="text-sm font-semibold mb-4">
            Select Cable TV Provider
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {CABLE_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider)}
                className={`bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 ${
                  selectedProvider?.id === provider.id
                    ? "ring-2 ring-yellow-500 bg-zinc-800"
                    : "hover:bg-zinc-800"
                }`}
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center mb-2 border-2 border-yellow-600">
                  <Image
                    src={provider.image}
                    alt={provider.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm font-semibold text-center">
                  {provider.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Smart Card Number (IUC)
          </label>
          <input
            type="text"
            value={smartCardNumber}
            onChange={(e) =>
              setSmartCardNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Enter 10-digit smart card number"
            disabled={bypassVerification}
            className={`w-full bg-zinc-900 rounded-lg px-4 py-3 text-white placeholder-gray-500 border ${
              bypassVerification
                ? "border-gray-700 opacity-50"
                : smartCardNumber && isSmartCardValid && !iucVerificationError
                ? "border-yellow-500"
                : smartCardNumber && (!isSmartCardValid || iucVerificationError)
                ? "border-red-500"
                : "border-zinc-700"
            } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
          />
          {isValidatingIuc && (
            <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
              <IoReloadOutline className="w-4 h-4 animate-spin" />
              Validating IUC...
            </p>
          )}
          {iucOwnerName && !bypassVerification && (
            <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
              <IoCheckmarkCircle className="w-4 h-4" />
              Owner: {iucOwnerName}
            </p>
          )}
          {iucVerificationError && !bypassVerification && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <IoAlertOutline className="w-4 h-4" />
              {iucVerificationError}
            </p>
          )}
        </div>

        {/* Bypass Verification Toggle */}
        <div className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-gray-400">
            Bypass IUC Verification
          </span>
          <button
            onClick={() => setBypassVerification(!bypassVerification)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              bypassVerification ? "bg-yellow-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                bypassVerification ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Subscription Plans */}
        {selectedProvider && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Select Subscription Plan
            </h2>
            {currentPlans.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => selectPlan(plan)}
                    className={`bg-zinc-900 rounded-lg p-4 border-2 transition-all hover:scale-105 ${
                      selectedPlan?.id === plan.id
                        ? "border-yellow-500 bg-zinc-800"
                        : "border-yellow-700 hover:border-yellow-600"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white mb-2 line-clamp-2">
                      {cleanPlanName(plan.name)}
                    </p>
                    <p className="text-lg font-bold text-yellow-600 mb-1">
                      ₦{plan.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{plan.duration}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">
                No plans available for this provider.
              </p>
            )}
          </div>
        )}

        {/* Amount to Pay */}
        {selectedPlan && (
          <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between border border-yellow-700">
            <span className="text-sm font-medium text-gray-400">
              Amount to Pay
            </span>
            <span className="text-lg font-bold text-yellow-500">
              ₦{formatNumberWithCommas(selectedPlan.price)}
            </span>
          </div>
        )}

        {/* Transaction PIN */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Transaction PIN
          </label>
          <input
            type="password"
            value={transactionPin}
            onChange={(e) =>
              setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter 4-digit PIN"
            maxLength={6}
            className={`w-full bg-zinc-900 rounded-lg px-4 py-3 text-white placeholder-gray-500 border ${
              transactionPin ? "border-yellow-500" : "border-zinc-700"
            } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 text-green-200 p-4 rounded-lg text-center">
            {success}
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={!isPurchaseEnabled || loading}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
            isPurchaseEnabled && !loading
              ? "bg-yellow-600 hover:bg-yellow-700 text-white"
              : "bg-zinc-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <>
              <IoReloadOutline className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : isPurchaseEnabled ? (
            <>
              Purchase Subscription
              <IoChevronForwardOutline className="w-5 h-5" />
            </>
          ) : (
            "Complete Form to Purchase"
          )}
        </button>

        {/* Footer */}
        <div className="bg-zinc-900 rounded-lg p-6 opacity-50 space-y-2">
          <h3 className="text-sm font-bold text-yellow-500 mb-2">
            Customer Care for Cable Issues
          </h3>
          <p className="text-xs text-gray-400">
            <strong>DSTV/GOtv:</strong> 01-2703232, 08039003788, Toll-free:
            08149860333, 07080630333, 09090630333
          </p>
          <p className="text-xs text-gray-400">
            <strong>STARTIMES:</strong> 094618888, 014618888
          </p>
        </div>
      </div>
    </div>
  );
}
