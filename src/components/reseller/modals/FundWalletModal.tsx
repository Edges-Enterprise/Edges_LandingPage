// src/components/reseller/modals/FundWalletModal.tsx
"use client";

import { useState } from "react";
import { X, Loader2, CreditCard, Banknote } from "lucide-react";
import { fundWallet } from "@/actions/reseller/wallet/fundWallet";
import { cn } from "@/lib/utils/helpers";

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  countryCode: string;
}

export function FundWalletModal({
  isOpen,
  onClose,
  onSuccess,
  countryCode,
}: FundWalletModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (amount <= 0) {
      setError("Please enter a valid amount");
      setIsLoading(false);
      return;
    }

    try {
      const result = await fundWallet(amount, paymentMethod);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to fund wallet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Fund Wallet
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                )}
              >
                <CreditCard className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("bank")}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  paymentMethod === "bank"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                )}
              >
                <Banknote className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 100, 200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg border text-sm transition-all",
                    amount === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                  )}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || amount <= 0}
              className={cn(
                "flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
                "hover:bg-primary/80",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Fund Wallet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
