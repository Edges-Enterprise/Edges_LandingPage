// app/(protected)/electric/electricity-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IoAlertOutline,
  IoReloadOutline,
  IoCheckmarkCircle,
  IoChevronForwardOutline,
  IoArrowBackOutline,
} from "react-icons/io5";
import { DISCO_PROVIDERS, METER_TYPES } from "@/constants/helper";
import {
  validateMeterAction,
  purchaseElectricityAction,
} from "@/app/actions/electricity";

const BILL_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000];

interface ElectricityClientProps {
  initialBalance: number;
  userId: string;
}

export default function ElectricityClient({
  initialBalance,
  userId,
}: ElectricityClientProps) {
  const router = useRouter();

  // State
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [meterNumber, setMeterNumber] = useState("");
  const [bypassVerification, setBypassVerification] = useState(false);
  const [meterOwnerName, setMeterOwnerName] = useState<string | null>(null);
  const [meterVerificationError, setMeterVerificationError] = useState<
    string | null
  >(null);
  const [isValidatingMeter, setIsValidatingMeter] = useState(false);
  const [meterType, setMeterType] = useState("prepaid");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Format number with commas
  const formatNumberWithCommas = (number: number): string => {
    return number.toLocaleString();
  };

  // Validate meter number
  const isMeterValid =
    bypassVerification ||
    (meterNumber.length === 11 && /^\d{11}$/.test(meterNumber));

  // Verify meter number
  const verifyMeterNumber = async (
    meter: string,
    provider: any,
    type: string
  ) => {
    if (bypassVerification || !provider || meter.length !== 11) {
      setMeterOwnerName(null);
      setMeterVerificationError(null);
      return;
    }

    setIsValidatingMeter(true);
    setMeterOwnerName(null);
    setMeterVerificationError(null);

    const result = await validateMeterAction(meter, provider.id, type);

    if (result.success && result.customerName) {
      setMeterOwnerName(result.customerName);
      setMeterVerificationError(null);
    } else {
      setMeterOwnerName(null);
      setMeterVerificationError(result.error || "Invalid meter number");
    }
    setIsValidatingMeter(false);
  };

  // Auto-validate meter when complete
  useEffect(() => {
    if (meterNumber.length === 11 && selectedProvider && !bypassVerification) {
      verifyMeterNumber(meterNumber, selectedProvider, meterType);
    } else {
      setMeterOwnerName(null);
      setMeterVerificationError(null);
      setIsValidatingMeter(false);
    }
  }, [meterNumber, selectedProvider, meterType, bypassVerification]);

  // Handle provider selection
  const handleSelectProvider = (provider: any) => {
    setSelectedProvider(provider);
    setMeterNumber("");
    setMeterOwnerName(null);
    setMeterVerificationError(null);
  };

  // Handle amount selection
  const selectAmount = (amount: number) => {
    if (selectedAmount === amount) {
      setSelectedAmount(null);
      setCustomAmount("");
    } else {
      setSelectedAmount(amount);
      setCustomAmount("");
    }
  };

  // Handle custom amount
  const handleCustomAmount = (text: string) => {
    const numericValue = text.replace(/\D/g, "");
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  // Get final amount
  const getFinalAmount = () => {
    if (selectedAmount) return selectedAmount;
    const custom = parseFloat(customAmount);
    if (!isNaN(custom) && custom >= 500) return custom;
    return null;
  };

  const finalAmount = getFinalAmount();

  // Check if purchase is enabled
  const isPurchaseEnabled =
    selectedProvider &&
    (bypassVerification || (isMeterValid && !meterVerificationError)) &&
    finalAmount &&
    finalAmount >= 500 &&
    transactionPin.length >= 4;

  // Handle purchase
  const handlePurchase = async () => {
    if (!isPurchaseEnabled || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setToken(null);

    const formData = {
      provider: selectedProvider.name,
      discoId: selectedProvider.id,
      meterNumber: meterNumber,
      meterType: meterType,
      amount: finalAmount!,
      pin: transactionPin,
      bypass: bypassVerification,
    };

    try {
      const result = await purchaseElectricityAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          `Electricity purchase successful! ${
            result.data?.token ? "Token: " + result.data.token : ""
          } Redirecting...`
        );
        if (result.data?.token) {
          setToken(result.data.token);
        }
        setTimeout(() => router.push("/history"), 3000);
      }
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
      console.error("Purchase error:", err);
    } finally {
      setLoading(false);
      setTransactionPin(""); // Clear PIN for security
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <IoArrowBackOutline className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Electricity Bill</h1>
          <div className="w-10" />
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
            Select Electricity Provider
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {DISCO_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider)}
                className={`bg-zinc-900 rounded-xl p-3 flex flex-col items-center justify-center transition-all hover:scale-105 ${
                  selectedProvider?.id === provider.id
                    ? "ring-2 ring-yellow-500 bg-zinc-800"
                    : "hover:bg-zinc-800"
                }`}
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white flex items-center justify-center mb-1 border-2 border-yellow-600">
                  <Image
                    src={provider.image}
                    alt={provider.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-[10px] font-semibold text-center leading-tight">
                  {provider.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Meter Number */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Meter Number
          </label>
          <input
            type="text"
            value={meterNumber}
            onChange={(e) =>
              setMeterNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            placeholder="Enter 11-digit meter number"
            disabled={bypassVerification}
            className={`w-full bg-zinc-900 rounded-lg px-4 py-3 text-white placeholder-gray-500 border ${
              bypassVerification
                ? "border-gray-700 opacity-50"
                : meterNumber && isMeterValid && !meterVerificationError
                ? "border-yellow-500"
                : meterNumber && (!isMeterValid || meterVerificationError)
                ? "border-red-500"
                : "border-zinc-700"
            } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
          />
          {isValidatingMeter && (
            <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
              <IoReloadOutline className="w-4 h-4 animate-spin" />
              Validating meter...
            </p>
          )}
          {meterOwnerName && !bypassVerification && (
            <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
              <IoCheckmarkCircle className="w-4 h-4" />
              Owner: {meterOwnerName}
            </p>
          )}
          {meterVerificationError && !bypassVerification && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <IoAlertOutline className="w-4 h-4" />
              {meterVerificationError}
            </p>
          )}
        </div>

        {/* Bypass Verification Toggle */}
        <div className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-gray-400">
            Bypass Meter Verification
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

        {/* Meter Type */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Meter Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {METER_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setMeterType(type.value)}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  meterType === type.value
                    ? "bg-transparent border-2 border-yellow-500 text-white"
                    : "bg-zinc-900 border-2 border-transparent text-white"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Selection */}
        <div>
          <h2 className="text-base font-semibold mb-3">Select Amount</h2>
          <div className="grid grid-cols-3 gap-2">
            {BILL_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => selectAmount(amount)}
                className={`py-3 rounded-lg font-semibold transition-all ${
                  selectedAmount === amount
                    ? "bg-transparent border-2 border-yellow-500 text-yellow-500"
                    : "bg-zinc-900 border-2 border-transparent text-white"
                }`}
              >
                ₦{amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Custom Amount (min ₦500)
          </label>
          <input
            type="text"
            value={customAmount}
            onChange={(e) => handleCustomAmount(e.target.value)}
            placeholder="Enter custom amount"
            className={`w-full bg-zinc-900 rounded-lg px-4 py-3 text-white placeholder-gray-500 border ${
              customAmount && parseFloat(customAmount) >= 1000
                ? "border-yellow-500"
                : "border-zinc-700"
            } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
          />
        </div>

        {/* Amount to Pay */}
        {finalAmount && (
          <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between border border-yellow-700">
            <span className="text-sm font-medium text-gray-400">
              Amount to Pay
            </span>
            <span className="text-lg font-bold text-yellow-500">
              ₦{formatNumberWithCommas(finalAmount)}
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
          <div className="bg-green-900 text-green-200 p-4 rounded-lg">
            <p className="text-center font-semibold mb-2">{success}</p>
            {token && (
              <div className="bg-green-800 p-3 rounded-lg mt-2">
                <p className="text-xs text-green-200 mb-1">
                  Electricity Token:
                </p>
                <p className="text-lg font-mono font-bold text-center tracking-wider">
                  {token}
                </p>
              </div>
            )}
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
              Purchase Electricity
              <IoChevronForwardOutline className="w-5 h-5" />
            </>
          ) : (
            "Complete Form to Purchase"
          )}
        </button>

        {/* Footer */}
        <div className="bg-zinc-900 rounded-lg p-6 opacity-50">
          <h3 className="text-sm font-bold text-yellow-500 mb-2">
            Important Information
          </h3>
          <p className="text-xs text-gray-400">
            • Ensure your meter number is correct before purchase
          </p>
          <p className="text-xs text-gray-400">
            • For prepaid meters, you'll receive a token
          </p>
          <p className="text-xs text-gray-400">
            • Minimum purchase amount is ₦500
          </p>
        </div>
      </div>
    </div>
  );
}
