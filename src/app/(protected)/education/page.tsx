"use client";

import { EXAM_PROVIDERS } from "@/constants/helper";
import Image from "next/image";
import React, { useState } from "react";
import { HiEye, HiEyeSlash } from "react-icons/hi2";


export default function EducationPage() {
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [showPin, setShowPin] = useState(false);
  const [transactionPin, setTransactionPin] = useState("");

  const handleSelectProvider = (id: number) => {
    setSelectedProvider(id);
    setQuantity("1");
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10">
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
              onChange={(e) => setTransactionPin(e.target.value)}
              maxLength={6}
              className="w-full p-3 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter PIN"
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

        {/* Slide to Pay Placeholder */}
        <div className="flex justify-center items-center bg-zinc-800 border border-zinc-700 rounded-lg py-4 text-yellow-400 font-semibold text-lg">
          Click to Purchase
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
