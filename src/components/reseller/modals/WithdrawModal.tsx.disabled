// src/components/reseller/modals/WithdrawModal.tsx
"use client";

import { useState } from "react";
import { X, Loader2, Building2, User, CreditCard } from "lucide-react";
import { withdrawFunds } from "@/actions/reseller/wallet/withdrawFunds";
import { cn } from "@/lib/utils/helpers";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  balance: number;
  countryCode: string;
}

export function WithdrawModal({
  isOpen,
  onClose,
  onSuccess,
  balance,
  countryCode,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
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

    if (amount > balance) {
      setError("Insufficient balance");
      setIsLoading(false);
      return;
    }

    if (
      !bankDetails.bankName ||
      !bankDetails.accountNumber ||
      !bankDetails.accountName
    ) {
      setError("Please fill in all bank details");
      setIsLoading(false);
      return;
    }

    try {
      const result = await withdrawFunds(amount, bankDetails);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to process withdrawal");
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
            Withdraw Funds
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Available Balance
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${balance.toLocaleString()}
          </p>
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
                max={balance}
                step="0.01"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max: ${balance.toLocaleString()}
            </p>
          </div>

          {/* Bank Details */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Bank Details
            </p>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Bank Name
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, bankName: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                  placeholder="e.g., GTBank"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Account Number
              </label>
              <div className="relative">
                <CreditCard
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) =>
                    setBankDetails({
                      ...bankDetails,
                      accountNumber: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                  placeholder="e.g., 0123456789"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Account Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={bankDetails.accountName}
                  onChange={(e) =>
                    setBankDetails({
                      ...bankDetails,
                      accountName: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
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
              disabled={isLoading || amount <= 0 || amount > balance}
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
                "Withdraw"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
