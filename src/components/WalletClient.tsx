// src/components/WalletClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaWallet,
  FaEye,
  FaPlusCircle,
  FaChevronDown,
  FaChevronUp,
  FaHistory,
  FaSync,
  FaCopy,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

interface Transaction {
  type: string;
  amount: number;
  method?: string;
  date: string;
  details?: string;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export function WalletClient() {
  const router = useRouter();
  const [showTransactions, setShowTransactions] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      type: "Wallet Funding",
      amount: 5000,
      method: "Paystack",
      date: "Nov 9, 2025",
      details: "Account Top-up",
    },
    {
      type: "Data Purchase",
      amount: -1500,
      method: "Wallet",
      date: "Nov 8, 2025",
      details: "MTN 2GB - 30 Days",
    },
    {
      type: "Wallet Funding",
      amount: 10000,
      method: "Bank Transfer",
      date: "Nov 7, 2025",
      details: "Account Top-up",
    },
  ]);
  const [hasPriorPurchase, setHasPriorPurchase] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Virtual Account States
  const [hasVirtualAccount, setHasVirtualAccount] = useState(true); // Set to true to test account display
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Mock virtual accounts (when hasVirtualAccount is true)
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([
    {
      bankName: "9Payment Service Bank",
      accountNumber: "5030200545",
      accountName: "Payvessel-John Doe",
    },
    {
      bankName: "PalmPay",
      accountNumber: "6030200545",
      accountName: "Payvessel-John Doe",
    },
  ]);

  // Form States
  const [formData, setFormData] = useState({
    email: "user@example.com", // This should be prefilled from user session
    name: "",
    phoneNumber: "",
    bvn: "",
    nin: "",
  });

  const formattedBalance = `₦${balance.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  })}`;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAccount(true);
    // Logic will be implemented later
    console.log("Creating virtual account with:", formData);
    setTimeout(() => {
      setIsCreatingAccount(false);
      setShowCreateAccountForm(false);
      setHasVirtualAccount(true);
    }, 2000);
  };

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.phoneNumber.trim().length >= 11 &&
    (formData.bvn.trim().length === 11 || formData.nin.trim().length === 11);

  return (
    <div className="min-h-screen bg-black p-2 overflow-y-auto pb-24">
      {/* Refreshing Indicator */}
      {refreshing && (
        <div className="fixed top-4 right-4 flex items-center gap-2 bg-gray-800 px-3 py-2 rounded text-white z-50 animate-fade-in">
          <FaSync className="animate-spin" /> Refreshing...
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Wallet 💼</h1>
        <p className="text-gray-400">Manage your balance and transactions</p>
      </div>

      {/* Balance Card */}
      <div className="bg-[#744925] rounded-2xl p-6 mb-6 mx-4 animate-slide-up">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/70">Wallet Balance</span>
          <FaEye size={20} className="text-white" />
        </div>
        <p className="text-4xl font-bold text-white">{formattedBalance}</p>
      </div>

      {/* Virtual Account Display or Fund Wallet Button */}
      {hasVirtualAccount ? (
        <div className="mx-4 mb-6 space-y-4">
          <h2 className="text-xl font-bold text-white mb-3">
            🏦 Your Virtual Accounts
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Transfer money to any of these accounts to fund your wallet
            instantly
          </p>
          {virtualAccounts.map((account, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-[#744925]/30 rounded-xl p-5 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#D7A77F] font-semibold text-lg">
                  {account.bankName}
                </h3>
                <div className="w-10 h-10 bg-[#744925] rounded-full flex items-center justify-center">
                  <FaWallet className="text-white" size={18} />
                </div>
              </div>

              <div className="space-y-3">
                {/* Account Number */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">
                    Account Number
                  </label>
                  <div className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                    <span className="text-white font-mono text-lg">
                      {account.accountNumber}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(account.accountNumber, `number-${index}`)
                      }
                      className="text-[#D7A77F] hover:text-[#E8B890] transition-colors"
                    >
                      {copiedField === `number-${index}` ? (
                        <FaCheckCircle size={20} />
                      ) : (
                        <FaCopy size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">
                    Account Name
                  </label>
                  <div className="flex items-center justify-between bg-gray-900 rounded-lg p-3">
                    <span className="text-white">{account.accountName}</span>
                    <button
                      onClick={() =>
                        handleCopy(account.accountName, `name-${index}`)
                      }
                      className="text-[#D7A77F] hover:text-[#E8B890] transition-colors"
                    >
                      {copiedField === `name-${index}` ? (
                        <FaCheckCircle size={20} />
                      ) : (
                        <FaCopy size={20} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-gray-500 text-xs text-center mt-4">
            💡 Tip: Save these account numbers in your bank app for quick
            transfers
          </p>
        </div>
      ) : (
        <div className="mx-4 mb-6">
          {!showCreateAccountForm ? (
            <button
              onClick={() => setShowCreateAccountForm(true)}
              className="w-full bg-[#744925] rounded-xl py-4 flex items-center justify-center gap-2 text-white font-semibold hover:bg-[#6d3f2a] transition-all active:scale-95 animate-pulse-subtle"
            >
              <FaPlusCircle size={20} />
              Fund Wallet
            </button>
          ) : (
            <div className="bg-gray-800 border border-[#744925]/30 rounded-xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Create Virtual Account
                </h2>
                <button
                  onClick={() => setShowCreateAccountForm(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-6">
                Get your unique account number to fund your wallet easily
              </p>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    className="w-full h-12 px-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
                    placeholder="your@email.com"
                    required
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    This is pre-filled but you can change it
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full h-12 px-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
                    placeholder="John Doe"
                    required
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    As it appears on your ID
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleFormChange("phoneNumber", e.target.value)
                    }
                    className="w-full h-12 px-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
                    placeholder="08012345678"
                    maxLength={11}
                    required
                  />
                </div>

                {/* BVN */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">
                    BVN <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bvn}
                    onChange={(e) => handleFormChange("bvn", e.target.value)}
                    className="w-full h-12 px-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>

                {/* NIN */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">
                    NIN <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nin}
                    onChange={(e) => handleFormChange("nin", e.target.value)}
                    className="w-full h-12 px-4 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>

                <p className="text-gray-500 text-xs">
                  * You must provide either BVN or NIN to create a static
                  account
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || isCreatingAccount}
                  className={`w-full h-12 rounded-lg flex items-center justify-center font-bold text-base transition-all ${
                    isFormValid && !isCreatingAccount
                      ? "bg-[#744925] text-white hover:bg-[#6d3f2a]"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isCreatingAccount ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Virtual Account"
                  )}
                </button>

                {/* Info Box */}
                <div className="bg-[#744925]/10 border border-[#744925]/30 rounded-lg p-4 mt-4">
                  <p className="text-gray-300 text-xs leading-relaxed">
                    🔒 Your information is secure and encrypted.
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <span className="text-yellow-500 mr-1">⚠️</span>
                    Edges Network does not store your information, We use it
                    only to create your virtual account with our banking
                    partners (
                    <span className="text-blue-500">
                      9Payment Service Bank
                    </span>{" "}
                    & <span className="text-purple-500">PalmPay</span>).
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Transactions Toggle */}
      <button
        onClick={() => setShowTransactions(!showTransactions)}
        className="w-full flex justify-between items-center mb-4 px-4 py-2 hover:bg-gray-900 rounded-lg transition-colors"
      >
        <span className="text-xl font-bold text-white">
          🧾 Recent Transactions
        </span>
        {showTransactions ? (
          <FaChevronUp size={22} className="text-white" />
        ) : (
          <FaChevronDown size={22} className="text-white" />
        )}
      </button>

      {/* Transactions List */}
      {showTransactions && (
        <div className="mx-4 space-y-4 mb-6">
          {transactions.length > 0 ? (
            transactions.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800 border border-white/10 rounded-xl p-4 flex justify-between items-center animate-slide-in"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div>
                  <p className="font-medium text-white">{item.type}</p>
                  <p className="text-gray-400 text-sm">
                    {item.details || item.method} • {item.date}
                  </p>
                </div>
                <p
                  className={`font-bold text-lg ${
                    item.amount < 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {item.amount < 0 ? "-" : "+"}₦
                  {Math.abs(item.amount).toLocaleString("en-NG")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">
              No transactions yet
            </p>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      {!showTransactions && hasPriorPurchase && !showCreateAccountForm && (
        <div className="mx-4">
          <h2 className="text-xl font-bold text-white mb-3">
            💡 Recommended Purchases
          </h2>
          <div className="space-y-3">
            <div className="bg-gray-800 border border-white/10 rounded-xl p-4 hover:bg-gray-750 transition-colors cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">MTN 2GB - 30 Days</p>
                  <p className="text-gray-400 text-sm">
                    Based on your last purchase
                  </p>
                </div>
                <p className="font-bold text-[#744925]">₦1,500</p>
              </div>
            </div>
            <div className="bg-gray-800 border border-white/10 rounded-xl p-4 hover:bg-gray-750 transition-colors cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">MTN 5GB - 30 Days</p>
                  <p className="text-gray-400 text-sm">Popular choice</p>
                </div>
                <p className="font-bold text-[#744925]">₦2,500</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Purchase Message */}
      {!showTransactions &&
        !hasPriorPurchase &&
        !showCreateAccountForm &&
        !hasVirtualAccount && (
          <p className="text-gray-400 text-center mt-8 px-4">
            Make a purchase and set a transaction PIN to see recommendations!
          </p>
        )}

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
          animation-fill-mode: both;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
          animation-fill-mode: both;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}