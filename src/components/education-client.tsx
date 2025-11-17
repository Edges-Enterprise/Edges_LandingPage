// components/education-client.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import { EXAM_PROVIDERS } from "@/constants/helper";
import { purchaseExamPinsAction } from "@/app/actions/education";

interface EducationPurchaseProps {
  initialBalance: number;
  userId: string;
}

export default function EducationPurchase({
  initialBalance,
  userId,
}: EducationPurchaseProps) {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [showPin, setShowPin] = useState(false);
  const [transactionPin, setTransactionPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pins, setPins] = useState<string[]>([]);

  const handleSelectProvider = (id: number) => {
    setSelectedProvider(id);
    setQuantity("1");
    setError(null);
    setSuccess(null);
  };

  const formatCurrency = (num: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(num);

  const totalAmount =
    selectedProvider !== null
      ? EXAM_PROVIDERS[selectedProvider - 1].sellingPrice *
        parseInt(quantity || "0")
      : 0;

 const isPurchaseEnabled =
   selectedProvider !== null &&
   quantity >= "1" &&
   quantity <= "10" &&
   transactionPin.length >= 4 && // Updated: Allow 4-6 digits
   transactionPin.length <= 6 &&
   totalAmount > 0;

  const handlePurchase = async () => {
    if (!isPurchaseEnabled || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = {
      exam: selectedProvider!,
      quantity: parseInt(quantity),
      pin: transactionPin,
      totalAmount,
    };

    try {
      const result = await purchaseExamPinsAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setPins(result.data?.pins || []);
        setSuccess(
          `Exam pins purchased successfully! Reference: ${result.data?.reference}. Redirecting...`
        );
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10">
      {/* Wallet Balance Header */}
      <div className="w-full max-w-2xl mb-6 bg-zinc-900 rounded-2xl border border-zinc-800 p-4 text-center">
        <span className="text-sm font-semibold text-gray-400">
          Wallet Balance:{" "}
        </span>
        <span className="text-lg font-bold text-yellow-400">
          {formatCurrency(initialBalance)}
        </span>
      </div>

      <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800 p-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-yellow-400 text-center mb-6">
          Exam Pins
        </h1>

        {/* Section Title */}
        <h2 className="text-lg font-semibold mb-4">Select Exam Provider</h2>

        {/* Providers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {EXAM_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelectProvider(provider.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                selectedProvider === provider.id
                  ? "border-yellow-400 bg-zinc-800 scale-105"
                  : "border-zinc-700 hover:border-yellow-400"
              }`}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 overflow-hidden">
                <Image
                  src={provider.image}
                  alt={provider.name}
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <p className="text-sm font-semibold">{provider.name}</p>
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Quantity (1–10)
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min={1}
            max={10}
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Enter quantity"
          />
        </div>

        {/* Total */}
        <div className="flex justify-between items-center bg-zinc-800 border border-yellow-500 rounded-lg p-4 mb-6">
          <span className="text-gray-400 font-medium">Total Amount</span>
          <span className="text-yellow-400 font-bold">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Transaction PIN */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Transaction PIN
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={transactionPin}
              onChange={(e) =>
                setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              } // Enforce digits only, max 6
              maxLength={6}
              className="w-full p-3 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter 6-digit PIN"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
            >
              {showPin ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 text-green-200 p-4 rounded-lg mb-4 text-center">
            {success}
            {pins.length > 0 && (
              <div className="mt-2 p-2 bg-black rounded text-xs">
                <strong>Pins:</strong> {pins.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Purchase Button */}
        <div className="mb-6">
          <button
            onClick={handlePurchase}
            disabled={!isPurchaseEnabled || loading}
            className={`
              w-full rounded-lg py-4
              transition-all
              ${
                isPurchaseEnabled && !loading
                  ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold cursor-pointer"
                  : "bg-zinc-800 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {loading ? "Processing..." : "Click to Purchase"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 opacity-70 text-sm space-y-2">
          <p className="text-yellow-400 font-semibold">Important</p>
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li>Pins delivered instantly</li>
            <li>Keep your pins secure</li>
            <li>Contact support if issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
