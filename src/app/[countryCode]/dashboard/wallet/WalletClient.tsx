// src/app/[countryCode]/dashboard/wallet/WalletClient.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { getWallet, WalletData } from "@/actions/reseller/wallet/getWallet";
import {
  getTransactions,
  Transaction,
} from "@/actions/reseller/wallet/getTransactions";
import { FundWalletModal } from "@/components/reseller/modals/FundWalletModal";
import { WithdrawModal } from "@/components/reseller/modals/WithdrawModal";
import { cn } from "@/lib/utils";

interface WalletClientProps {
  countryCode: string;
}

export function WalletClient({ countryCode }: WalletClientProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [walletResult, txResult] = await Promise.all([
        getWallet(),
        getTransactions(20, 0),
      ]);

      if (walletResult.success && walletResult.data) {
        setWallet(walletResult.data);
      } else {
        setError(walletResult.error || "Failed to load wallet");
      }

      if (txResult.success && txResult.data) {
        setTransactions(txResult.data);
        setTotalTransactions(txResult.total || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFundSuccess = () => {
    setIsFundModalOpen(false);
    fetchData();
  };

  const handleWithdrawSuccess = () => {
    setIsWithdrawModalOpen(false);
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-4 h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-6 flex gap-4">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium text-red-500">⚠️ {error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Available Balance
              </p>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {showBalance
                    ? `$${wallet?.balance.toLocaleString() || "0.00"}`
                    : "••••••••"}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Currency: {wallet?.currency || "USD"} • Status:{" "}
                {wallet?.status || "Active"}
              </p>
            </div>
            <Wallet className="h-12 w-12 text-primary/30" />
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => setIsFundModalOpen(true)}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
            >
              Fund Wallet
            </button>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Virtual Account Details */}
      <VirtualAccountDetails countryCode={countryCode} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Credits
          </p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            $
            {transactions
              .filter((t) => t.type === "credit")
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Debits
          </p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">
            $
            {transactions
              .filter((t) => t.type === "debit")
              .reduce((sum, t) => sum + t.amount, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Transactions
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {totalTransactions}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transaction History
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your recent transactions
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No transactions yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isFundModalOpen && (
        <FundWalletModal
          isOpen={isFundModalOpen}
          onClose={() => setIsFundModalOpen(false)}
          onSuccess={handleFundSuccess}
          countryCode={countryCode}
        />
      )}

      {isWithdrawModalOpen && (
        <WithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          onSuccess={handleWithdrawSuccess}
          balance={wallet?.balance || 0}
          countryCode={countryCode}
        />
      )}
    </div>
  );
}

// Transaction Item Component
function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.type === "credit";

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isCredit
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30",
          )}
        >
          {isCredit ? (
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {transaction.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatDate(transaction.created_at)}</span>
            <span>•</span>
            <span className="truncate max-w-[100px]">
              Ref: {transaction.reference}
            </span>
            <span>•</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-xs font-medium",
                transaction.status === "completed" &&
                  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                transaction.status === "pending" &&
                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                transaction.status === "failed" &&
                  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
              )}
            >
              {transaction.status}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "font-semibold",
            isCredit
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          {isCredit ? "+" : "-"}${transaction.amount.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// Virtual Account Details Component
function VirtualAccountDetails({ countryCode }: { countryCode: string }) {
  const [account, setAccount] = useState<{
    accountNumber: string;
    bankName: string;
    accountName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchAccount() {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: application } = await supabase
          .from("global_reseller_applications")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (!application) return;

        const { data: accountData } = await supabase
          .from("global_virtual_accounts")
          .select("*")
          .eq("reseller_id", application.id)
          .single();

        if (accountData) {
          setAccount({
            accountNumber: accountData.account_number,
            bankName: accountData.bank_name,
            accountName: accountData.account_name,
          });
        }
      } catch (error) {
        console.error("Error fetching virtual account:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccount();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="mt-4 h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!account) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = account.accountNumber;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl p-6 border border-primary/20 dark:border-primary/30">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Virtual Account
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              {account.accountNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <Copy size={16} />
            </button>
            {copied && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Copied!
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {account.bankName} • {account.accountName}
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Use this account to fund your wallet</p>
          <p className="text-xs">Funds are automatically credited</p>
        </div>
      </div>
    </div>
  );
}

// Helper Functions
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
