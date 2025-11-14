// app/(protected)/history/ClientHistory.tsx

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
  } | null;
  type: string;
}

interface Props {
  initialHistory: HistoryItem[];
  userEmail: string;
}

const statusColors: { [key: string]: string } = {
  Success: "#22c55e",
  Failed: "#ef4444",
  Pending: "#eab308",
  Unknown: "#888",
};

export default function ClientHistory({ initialHistory, userEmail }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<
    "All" | "Success" | "Failed" | "Pending"
  >("All");
  const [selectedTransaction, setSelectedTransaction] =
    useState<HistoryItem | null>(null);
  const [history] = useState<HistoryItem[]>(initialHistory);

  const filteredHistory =
    filter === "All" ? history : history.filter((h) => h.status === filter);

  const formatAmount = (amount: number) => {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInDays < 1) {
      return date.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInDays < 7) {
      return date.toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const renderReceipt = () => {
    if (!selectedTransaction) return null;

    const item = selectedTransaction;
    const meta = item.metadata || {};
    const fees = meta.fees ?? {
      transfer_fee: 0,
      wallet_management_fee: 0,
      api_network_fee: 0,
      vat: 0,
      total_fee: 0,
      net_amount: 0,
    };
    const isFailed = item.status === "Failed";
    const isPending = item.status === "Pending";

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Receipt</h2>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <IoClose size={24} className="text-white" />
            </button>
          </div>
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-center py-4">
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold ${
                  isFailed
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : isPending
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30"
                }`}
              >
                {item.status}
              </div>
            </div>
            {/* Provider & Service */}
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Provider</p>
              <p className="text-white font-bold text-lg">{item.provider}</p>
              <p className="text-gray-400 text-sm mt-1">{item.data}</p>
            </div>
            {/* Amount */}
            <div className="text-center border-y border-gray-700 py-3">
              <p className="text-gray-400 text-sm">Amount Paid</p>
              <p className="text-2xl font-bold text-white">
                {formatAmount(item.price)}
              </p>
            </div>
            {/* Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-400">Phone Number</span>
                <span className="text-white font-medium text-right">
                  {item.phoneNumber}
                </span>
                <span className="text-gray-400">Reference</span>
                <span className="text-white font-medium text-right">
                  {item.reference}
                </span>
                <span className="text-gray-400">Date</span>
                <span className="text-white font-medium text-right">
                  {formatDate(item.date)}
                </span>
                {meta.payment_method && (
                  <>
                    <span className="text-gray-400">Payment Method</span>
                    <span className="text-white font-medium text-right">
                      {meta.payment_method}
                    </span>
                  </>
                )}
                {meta.validity && (
                  <>
                    <span className="text-gray-400">Validity</span>
                    <span className="text-white font-medium text-right">
                      {meta.validity}
                    </span>
                  </>
                )}
              </div>
              {/* Fees Breakdown (if available) */}
              {Object.keys(meta.fees || {}).length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2 font-medium uppercase tracking-wide">
                    Fees Breakdown
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transfer Fee</span>
                      <span className="text-white">
                        {formatAmount(fees.transfer_fee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wallet Fee</span>
                      <span className="text-white">
                        {formatAmount(fees.wallet_management_fee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network Fee</span>
                      <span className="text-white">
                        {formatAmount(fees.api_network_fee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VAT</span>
                      <span className="text-white">
                        {formatAmount(fees.vat)}
                      </span>
                    </div>
                    <div className="border-t border-gray-700 pt-1 mt-1">
                      <div className="flex justify-between font-bold">
                        <span>Total Fee</span>
                        <span>{formatAmount(fees.total_fee)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Net Amount</span>
                        <span>{formatAmount(fees.net_amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Error Message (if failed) */}
              {isFailed && meta.error_message && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{meta.error_message}</p>
                </div>
              )}
              {/* Gross Amount (if available) */}
              {meta.gross_amount && (
                <div className="text-center border-t border-gray-700 pt-3">
                  <p className="text-gray-400 text-sm">Gross Amount</p>
                  <p className="text-lg font-bold text-white">
                    {formatAmount(meta.gross_amount)}
                  </p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
              <p>Transaction powered by YourApp</p>
              <p className="mt-1">{userEmail}</p>
            </div>
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
                    className="text-xs sm:text-sm font-bold px-2 py-1 rounded-full bg-opacity-20 border"
                    style={{
                      color: statusColors[item.status],
                      backgroundColor: statusColors[item.status] + "20",
                      borderColor: statusColors[item.status] + "30",
                    }}
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

// // app/(protected)/history/ClientHistory.tsx

// "use client";

// import { useRouter } from "next/navigation";
// import { useState } from "react";
// import { IoClose, IoArrowBackOutline, IoDocumentText } from "react-icons/io5";

// interface HistoryItem {
//   id: string;
//   provider: string;
//   data: string;
//   price: number;
//   date: string;
//   status: "Success" | "Failed" | "Pending" | "Unknown";
//   phoneNumber: string;
//   reference: string;
//   metadata: {
//     payment_date?: string;
//     payment_method?: string;
//     phone_number?: string;
//     fees?: {
//       transfer_fee: number;
//       wallet_management_fee: number;
//       api_network_fee: number;
//       vat: number;
//       total_fee: number;
//       net_amount: number;
//     };
//     provider?: string;
//     plan?: string;
//     purchase?: string;
//     validity?: string;
//     actual_cost?: number;
//     plan_id?: number;
//     network_id?: number;
//     sold_at?: number;
//     bought_at?: number;
//     profit?: number;
//     gross_amount?: number;
//     error_message?: string;
//   } | null;
//   type: string;
// }

// interface Props {
//   initialHistory: HistoryItem[];
//   userEmail: string;
// }

// const statusColors: { [key: string]: string } = {
//   Success: "#22c55e",
//   Failed: "#ef4444",
//   Pending: "#eab308",
//   Unknown: "#888",
// };

// export default function ClientHistory({ initialHistory, userEmail }: Props) {
//   const router = useRouter();
//   const [filter, setFilter] = useState<
//     "All" | "Success" | "Failed" | "Pending"
//   >("All");
//   const [selectedTransaction, setSelectedTransaction] =
//     useState<HistoryItem | null>(null);
//   const [history] = useState<HistoryItem[]>(initialHistory);

//   const filteredHistory =
//     filter === "All" ? history : history.filter((h) => h.status === filter);

//   const formatAmount = (amount: number) => {
//     return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
//     const diffInDays = diffInHours / 24;

//     if (diffInDays < 1) {
//       return date.toLocaleTimeString("en-NG", {
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     } else if (diffInDays < 7) {
//       return date.toLocaleDateString("en-NG", {
//         weekday: "short",
//         day: "numeric",
//       });
//     } else {
//       return date.toLocaleDateString("en-NG", {
//         month: "short",
//         day: "numeric",
//         year: "numeric",
//       });
//     }
//   };

//   const renderReceipt = () => {
//     if (!selectedTransaction) return null;

//     const item = selectedTransaction;
//     const meta = item.metadata || {};
//     const fees = meta.fees ?? {
//       transfer_fee: 0,
//       wallet_management_fee: 0,
//       api_network_fee: 0,
//       vat: 0,
//       total_fee: 0,
//       net_amount: 0,
//     };
//     const isFailed = item.status === "Failed";
//     const isPending = item.status === "Pending";

//     return (
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//         <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
//           {/* Header */}
//           <div className="flex items-center justify-between p-4 border-b border-gray-700">
//             <h2 className="text-xl font-bold text-white">Receipt</h2>
//             <button
//               onClick={() => setSelectedTransaction(null)}
//               className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
//             >
//               <IoClose size={24} className="text-white" />
//             </button>
//           </div>

//           {/* Content */}
//           <div className="p-4 space-y-4">
//             {/* Status */}
//             <div className="flex items-center justify-center py-4">
//               <div
//                 className={`px-4 py-2 rounded-full text-sm font-bold ${
//                   isFailed
//                     ? "bg-red-500/20 text-red-400 border border-red-500/30"
//                     : isPending
//                     ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
//                     : "bg-green-500/20 text-green-400 border border-green-500/30"
//                 }`}
//               >
//                 {item.status}
//               </div>
//             </div>

//             {/* Provider & Service */}
//             <div className="text-center">
//               <p className="text-gray-400 text-sm mb-1">Provider</p>
//               <p className="text-white font-bold text-lg">{item.provider}</p>
//               <p className="text-gray-400 text-sm mt-1">{item.data}</p>
//             </div>

//             {/* Amount */}
//             <div className="text-center border-y border-gray-700 py-3">
//               <p className="text-gray-400 text-sm">Amount Paid</p>
//               <p className="text-2xl font-bold text-white">
//                 {formatAmount(item.price)}
//               </p>
//             </div>

//             {/* Details */}
//             <div className="space-y-3">
//               <div className="grid grid-cols-2 gap-2 text-sm">
//                 <span className="text-gray-400">Phone Number</span>
//                 <span className="text-white font-medium text-right">
//                   {item.phoneNumber}
//                 </span>
//                 <span className="text-gray-400">Reference</span>
//                 <span className="text-white font-medium text-right">
//                   {item.reference}
//                 </span>
//                 <span className="text-gray-400">Date</span>
//                 <span className="text-white font-medium text-right">
//                   {formatDate(item.date)}
//                 </span>
//                 {meta.payment_method && (
//                   <>
//                     <span className="text-gray-400">Payment Method</span>
//                     <span className="text-white font-medium text-right">
//                       {meta.payment_method}
//                     </span>
//                   </>
//                 )}
//                 {meta.validity && (
//                   <>
//                     <span className="text-gray-400">Validity</span>
//                     <span className="text-white font-medium text-right">
//                       {meta.validity}
//                     </span>
//                   </>
//                 )}
//               </div>

//               {/* Fees Breakdown (if available) */}
//               {Object.keys(meta.fees || {}).length > 0 && (
//                 <div>
//                   <p className="text-gray-400 text-sm mb-2 font-medium uppercase tracking-wide">
//                     Fees Breakdown
//                   </p>
//                   <div className="space-y-1 text-xs">
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Transfer Fee</span>
//                       <span className="text-white">
//                         {formatAmount(fees.transfer_fee)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Wallet Fee</span>
//                       <span className="text-white">
//                         {formatAmount(fees.wallet_management_fee)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Network Fee</span>
//                       <span className="text-white">
//                         {formatAmount(fees.api_network_fee)}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">SC</span>
//                       <span className="text-white">
//                         {formatAmount(fees.vat)}
//                       </span>
//                     </div>
//                     <div className="border-t border-gray-700 pt-1 mt-1">
//                       <div className="flex justify-between font-bold">
//                         <span>Total Fee</span>
//                         <span>{formatAmount(fees.total_fee)}</span>
//                       </div>
//                       <div className="flex justify-between text-sm text-green-400">
//                         <span>Net Amount</span>
//                         <span>{formatAmount(fees.net_amount)}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Error Message (if failed) */}
//               {isFailed && meta.error_message && (
//                 <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
//                   <p className="text-red-400 text-sm">{meta.error_message}</p>
//                 </div>
//               )}

//               {/* Gross Amount (if available) */}
//               {meta.gross_amount && (
//                 <div className="text-center border-t border-gray-700 pt-3">
//                   <p className="text-gray-400 text-sm">Gross Amount</p>
//                   <p className="text-lg font-bold text-white">
//                     {formatAmount(meta.gross_amount)}
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Footer */}
//             <div className="pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
//               <p>Transaction powered by YourApp</p>
//               <p className="mt-1">{userEmail}</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-black text-white">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="flex items-center justify-between py-6 sm:py-8">
//           <button
//             onClick={() => router.back()}
//             className="p-2 text-white hover:text-gray-300 hover:bg-gray-900 rounded-lg transition-colors"
//           >
//             <IoArrowBackOutline size={24} />
//           </button>
//           <h1 className="text-lg sm:text-xl font-bold">Transaction History</h1>
//           <div className="w-6" />
//         </div>

//         {/* Filter Tabs */}
//         <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
//           {["All", "Success", "Failed", "Pending"].map((item) => (
//             <button
//               key={item}
//               onClick={() => setFilter(item as typeof filter)}
//               className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors text-sm sm:text-base ${
//                 filter === item
//                   ? "bg-[#8B4513] border-[#8B4513] text-white font-bold"
//                   : "bg-black border-[#3A4A4B] text-white hover:border-[#8B4513]"
//               }`}
//             >
//               {item}
//             </button>
//           ))}
//         </div>

//         {/* Transaction List */}
//         <div className="space-y-4 pb-10">
//           {filteredHistory.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
//               <IoDocumentText size={48} />
//               <p className="mt-2">No history to show</p>
//             </div>
//           ) : (
//             filteredHistory.map((item) => (
//               <button
//                 key={item.id}
//                 onClick={() => setSelectedTransaction(item)}
//                 className="w-full bg-black border border-[#8B4513] rounded-xl p-4 hover:bg-[#1a1a1a] transition-colors text-left"
//               >
//                 <div className="flex justify-between items-start mb-2">
//                   <h3 className="text-white font-bold text-sm sm:text-base">
//                     {item.provider} - {item.data}
//                   </h3>
//                   <span
//                     className="text-xs sm:text-sm font-bold"
//                     style={{ color: statusColors[item.status] }}
//                   >
//                     {item.status}
//                   </span>
//                 </div>
//                 <p className="text-white text-sm sm:text-base mb-1">
//                   {formatAmount(item.price)}
//                 </p>
//                 <p className="text-gray-500 text-xs sm:text-sm">
//                   Phone: {item.phoneNumber}
//                 </p>
//                 <p className="text-gray-500 text-xs sm:text-sm mt-1">
//                   Date: {formatDate(item.date)}
//                 </p>
//               </button>
//             ))
//           )}
//         </div>
//       </div>

//       {/* Receipt Modal */}
//       {renderReceipt()}
//     </div>
//   );
// }
