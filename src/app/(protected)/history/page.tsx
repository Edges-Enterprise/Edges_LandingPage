"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IoClose, IoArrowBackOutline, IoDocumentText } from "react-icons/io5";

interface HistoryItem {
  id: string;
  provider: string;
  data: string;
  price: number;
  date: string;
  status: "Success" | "Failed" | "Pending" | "Unknown";
  phoneNumber: string;
  reference: string;
  metadata: {
    payment_date?: string;
    payment_method?: string;
    phone_number?: string;
    fees?: {
      transfer_fee: number;
      wallet_management_fee: number;
      api_network_fee: number;
      vat: number;
      total_fee: number;
      net_amount: number;
    };
    provider?: string;
    plan?: string;
    purchase?: string;
    validity?: string;
    actual_cost?: number;
    plan_id?: number;
    network_id?: number;
    sold_at?: number;
    bought_at?: number;
    profit?: number;
    gross_amount?: number;
    error_message?: string;
  };
  type: string;
}

const statusColors: { [key: string]: string } = {
  Success: "#22c55e",
  Failed: "#ef4444",
  Pending: "#eab308",
  Unknown: "#888",
};

// Mock data for demonstration
const mockHistory: HistoryItem[] = [
  {
    id: "1",
    provider: "MTN",
    data: "5GB Data Plan",
    price: 2500,
    date: "2025-11-08T10:30:00Z",
    status: "Success",
    phoneNumber: "08012345678",
    reference: "TXN123456789",
    metadata: {
      payment_method: "Wallet",
      validity: "30 days",
      gross_amount: 2500,
    },
    type: "data",
  },
  {
    id: "2",
    provider: "Glo",
    data: "Wallet Funding",
    price: 9000,
    date: "2025-11-07T14:20:00Z",
    status: "Success",
    phoneNumber: "N/A",
    reference: "TXN987654321",
    metadata: {
      payment_method: "Card Payment",
      gross_amount: 10000,
      fees: {
        transfer_fee: 200,
        wallet_management_fee: 400,
        api_network_fee: 200,
        vat: 200,
        total_fee: 1000,
        net_amount: 9000,
      },
    },
    type: "deposit",
  },
  {
    id: "3",
    provider: "Airtel",
    data: "2GB Data Plan",
    price: 1200,
    date: "2025-11-06T09:15:00Z",
    status: "Failed",
    phoneNumber: "08098765432",
    reference: "TXN456789123",
    metadata: {
      payment_method: "Wallet",
      validity: "7 days",
      error_message: "Insufficient balance",
    },
    type: "data",
  },
];

export default function TransactionHistory() {
    const router = useRouter();
  const [filter, setFilter] = useState<
    "All" | "Success" | "Failed" | "Pending"
  >("All");
  const [selectedTransaction, setSelectedTransaction] =
    useState<HistoryItem | null>(null);
  const [history] = useState<HistoryItem[]>(mockHistory);

  const filteredHistory =
    filter === "All" ? history : history.filter((h) => h.status === filter);

  const formatAmount = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderReceipt = () => {
    if (!selectedTransaction) return null;
    const {
      price,
      reference,
      metadata,
      date,
      status,
      provider,
      phoneNumber,
      type,
      data,
    } = selectedTransaction;

    const fees = metadata.fees || {
      transfer_fee: 0,
      wallet_management_fee: 0,
      api_network_fee: 0,
      vat: 0,
      total_fee: 0,
      net_amount: 0,
    };

    const grossAmount = metadata?.gross_amount || 0;
    const paymentMethod = metadata?.payment_method || "Not Available";
    const validity = metadata?.validity || "N/A";

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#2A3A3B] rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setSelectedTransaction(null)}
            className="ml-auto block p-2 text-white hover:bg-gray-900 rounded-lg hover:text-gray-300 transition-colors"
          >
            <IoClose size={24} />
          </button>

          <h2 className="text-xl font-bold text-white mb-2">
            {type.toLowerCase() === "deposit"
              ? "Deposit Receipt"
              : "Purchase Receipt"}
          </h2>

          <div className="h-px bg-gray-600 my-4" />

          <div className="space-y-2 text-white text-sm">
            <p>Reference: {reference}</p>

            {type.toLowerCase() === "deposit" ? (
              <>
                {status === "Success" && grossAmount > 0 ? (
                  <>
                    <p>Amount Received: {formatAmount(grossAmount)}</p>
                    <p>Fees:</p>
                    <p className="ml-4">
                      - Transfer Fee:{" "}
                      {formatAmount(fees.transfer_fee || grossAmount * 0.02)}
                    </p>
                    <p className="ml-4">
                      - Wallet Management Fee:{" "}
                      {formatAmount(
                        fees.wallet_management_fee || grossAmount * 0.04
                      )}
                    </p>
                    <p className="ml-4">
                      - API & Network Fee:{" "}
                      {formatAmount(fees.api_network_fee || grossAmount * 0.02)}
                    </p>
                    <p className="ml-4">
                      - SC: {formatAmount(fees.vat || grossAmount * 0.02)}
                    </p>
                    <p>
                      Total Fees:{" "}
                      {formatAmount(fees.total_fee || grossAmount * 0.1)}
                    </p>
                    <p>Amount Credited: {formatAmount(price)}</p>
                  </>
                ) : status === "Success" ? (
                  <>
                    <p>
                      Amount Received:{" "}
                      {formatAmount(metadata.gross_amount || price)}
                    </p>
                    <p>Fees:</p>
                    <p className="ml-4">
                      - Transfer Fee: {formatAmount(fees.transfer_fee)}
                    </p>
                    <p className="ml-4">
                      - Wallet Management Fee:{" "}
                      {formatAmount(fees.wallet_management_fee)}
                    </p>
                    <p className="ml-4">
                      - API & Network Fee: {formatAmount(fees.api_network_fee)}
                    </p>
                    <p className="ml-4">- SC: {formatAmount(fees.vat)}</p>
                    <p>Total Fees: {formatAmount(fees.total_fee)}</p>
                    <p>Amount Credited: {formatAmount(price)}</p>
                  </>
                ) : (
                  <>
                    <p>Amount: {formatAmount(price)}</p>
                    <p>Transaction Status: {status}</p>
                  </>
                )}
              </>
            ) : (
              <>
                <p>Plan: {data}</p>
                <p>Provider: {provider}</p>
                <p>Amount: {formatAmount(price)}</p>
                <p>Phone Number: {phoneNumber}</p>
                <p>Validity: {validity}</p>
              </>
            )}

            <p>Date: {formatDate(date)}</p>
            <p>Status: {status}</p>
            <p>Payment Method: {paymentMethod}</p>

            {status === "Failed" && (
              <div className="mt-4 p-2 bg-red-500/10 rounded border-l-4 border-red-500">
                <p>❌ This transaction was not completed successfully.</p>
                {metadata?.error_message && (
                  <p>Error: {metadata.error_message}</p>
                )}
              </div>
            )}

            {status === "Pending" && (
              <div className="mt-4 p-2 bg-yellow-500/10 rounded border-l-4 border-yellow-500">
                <p>⏳ This transaction is still being processed.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between py-6 sm:py-8">
          <button
            onClick={() => router.back()}
            className="p-2 text-white hover:text-gray-300 hover:bg-gray-900 rounded-lg transition-colors"
          >
            <IoArrowBackOutline size={24} />
          </button>
          <h1 className="text-lg sm:text-xl font-bold">Transaction History</h1>
          <div className="w-6" />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          {["All", "Success", "Failed", "Pending"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item as typeof filter)}
              className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors text-sm sm:text-base ${
                filter === item
                  ? "bg-[#8B4513] border-[#8B4513] text-white font-bold"
                  : "bg-black border-[#3A4A4B] text-white hover:border-[#8B4513]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="space-y-4 pb-10">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <IoDocumentText size={48} />
              <p className="mt-2">No history to show</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTransaction(item)}
                className="w-full bg-black border border-[#8B4513] rounded-xl p-4 hover:bg-[#1a1a1a] transition-colors text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-bold text-sm sm:text-base">
                    {item.provider} - {item.data}
                  </h3>
                  <span
                    className="text-xs sm:text-sm font-bold"
                    style={{ color: statusColors[item.status] }}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-white text-sm sm:text-base mb-1">
                  {formatAmount(item.price)}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Phone: {item.phoneNumber}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Date: {formatDate(item.date)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {renderReceipt()}
    </div>
  );
}
