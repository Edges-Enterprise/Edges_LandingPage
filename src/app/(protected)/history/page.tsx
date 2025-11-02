import React from 'react'

const HistoryPage = () => {
  return (
    <div>History Page</div>
  )
}

export default HistoryPage

// // app/(protected)/history/page.tsx
// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import { FaArrowLeft, FaCheck, FaTimes, FaClock, FaQuestion, FaFileText } from 'react-icons/fa';
// import { motion, AnimatePresence } from 'framer-motion';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import moment from 'moment-timezone';

// interface HistoryItem {
//   id: string;
//   provider: string;
//   data: string;
//   price: number;
//   date: string;
//   status: 'Success' | 'Failed' | 'Pending' | 'Unknown';
//   phoneNumber: string;
//   reference: string;
//   metadata: any;
//   type: string;
// }

// const statusColors: { [key: string]: string } = {
//   Success: '#22c55e',
//   Failed: '#ef4444',
//   Pending: '#eab308',
//   Unknown: '#888',
// };

// export default function HistoryPage() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const supabase = createClientComponentClient();
//   const [filter, setFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');
//   const [history, setHistory] = useState<HistoryItem[]>([]);
//   const [selectedTransaction, setSelectedTransaction] = useState<HistoryItem | null>(null);
//   const [refreshing, setRefreshing] = useState(false);

//   const fetchHistory = useCallback(async () => {
//     try {
//       setRefreshing(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user?.email) {
//         alert('Please log in to view your transaction history.');
//         router.replace('/sign-in');
//         return;
//       }

//       const { data: txData, error: txError } = await supabase
//         .from('transactions')
//         .select('id, amount, status, metadata, created_at, reference, type, user_email')
//         .eq('user_email', user.email)
//         .order('created_at', { ascending: false });

//       if (txError) throw new Error('Failed to fetch transaction history');

//       if (txData.length === 0) {
//         alert('No transactions found for this account.');
//         setHistory([]);
//         return;
//       }

//       const knownProviders = ['glo', 'mtn', 'airtel', '9mobile'];

//       const formattedHistory: HistoryItem[] = txData.map((tx: any) => {
//         let provider = 'Unknown Provider';
//         let data = 'Unknown Transaction';
//         let phoneNumber = 'N/A';

//         const transactionType = (tx.type || 'unknown').toLowerCase().trim();

//         const parseProviderFromString = (input: string): { provider: string; data: string } | null => {
//           const inputLower = input.toLowerCase();
//           const matchedProvider = knownProviders.find((p) => inputLower.includes(p));
//           if (matchedProvider) {
//             const cleanedData = input
//               .replace(new RegExp(`\\b${matchedProvider}\\b`, 'i'), '')
//               .replace(/\s+/g, ' ')
//               .trim();
//             return {
//               provider: matchedProvider.charAt(0).toUpperCase() + matchedProvider.slice(1),
//               data: cleanedData || `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} Purchase`,
//             };
//           }
//           return null;
//         };

//         if (transactionType === 'data') {
//           provider = tx.metadata?.provider || 'Unknown Provider';
//           data = tx.metadata?.plan || tx.metadata?.purchase || 'Data Purchase';
//           phoneNumber = tx.metadata?.phone_number || 'N/A';
//           if (provider === 'Unknown Provider') {
//             const parsed = (tx.metadata?.plan && parseProviderFromString(tx.metadata.plan)) ||
//               (tx.metadata?.purchase && parseProviderFromString(tx.metadata.purchase));
//             if (parsed) {
//               provider = parsed.provider;
//               data = parsed.data;
//             }
//           }
//         } else if (transactionType === 'deposit') {
//           data = 'Wallet Funding';
//           provider = tx.metadata?.payment_method || 'Payment Gateway';
//           phoneNumber = tx.metadata?.phone_number || 'N/A';
//         } else {
//           data = tx.metadata?.plan || tx.metadata?.purchase || (transactionType.charAt(0).toUpperCase() + transactionType.slice(1));
//           provider = tx.metadata?.provider || 'Unknown Provider';
//           phoneNumber = tx.metadata?.phone_number || 'N/A';
//           if (provider === 'Unknown Provider') {
//             const parsed = (tx.metadata?.plan && parseProviderFromString(tx.metadata.plan)) ||
//               (tx.metadata?.purchase && parseProviderFromString(tx.metadata.purchase));
//             if (parsed) {
//               provider = parsed.provider;
//               data = parsed.data;
//             }
//           }
//         }

//         const normalizedStatus = (tx.status || 'unknown').toLowerCase();
//         const status = ['success', 'failed', 'pending'].includes(normalizedStatus)
//           ? (normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) as 'Success' | 'Failed' | 'Pending')
//           : 'Unknown';

//         return {
//           id: tx.id,
//           provider,
//           data,
//           price: Math.abs(tx.amount || 0),
//           date: tx.created_at,
//           status,
//           phoneNumber,
//           reference: tx.reference || 'N/A',
//           metadata: tx.metadata || {},
//           type: tx.type || 'Unknown',
//         };
//       });

//       setHistory(formattedHistory);
//     } catch (error) {
//       console.error('Error fetching history:', error);
//       alert('Failed to load transaction history. Please try again.');
//     } finally {
//       setRefreshing(false);
//     }
//   }, [supabase, router]);

//   useEffect(() => {
//     fetchHistory();
//   }, [fetchHistory]);

//   const onRefresh = useCallback(() => {
//     fetchHistory();
//   }, [fetchHistory]);

//   const filteredHistory = filter === 'All' ? history : history.filter((h) => h.status === filter);

//   const formatAmount = (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

//   const renderReceipt = () => (
//     <AnimatePresence>
//       {selectedTransaction && (
//         <motion.div
//           initial={{ opacity: 0, y: 50 }}
//           animate={{ opacity: 1, y: 0 }}
//           exit={{ opacity: 0, y: -50 }}
//           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//           onClick={() => setSelectedTransaction(null)}
//         >
//           <motion.div
//             initial={{ scale: 0.9 }}
//             animate={{ scale: 1 }}
//             className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold text-white">Receipt</h2>
//               <button onClick={() => setSelectedTransaction(null)} className="text-gray-400">
//                 <FaTimes />
//               </button>
//             </div>
//             <div className="space-y-2 text-white">
//               <p><strong>Type:</strong> {selectedTransaction.type}</p>
//               <p><strong>Provider:</strong> {selectedTransaction.provider}</p>
//               <p><strong>Plan:</strong> {selectedTransaction.data}</p>
//               <p><strong>Amount:</strong> {formatAmount(selectedTransaction.price)}</p>
//               <p><strong>Phone:</strong> {selectedTransaction.phoneNumber}</p>
//               <p><strong>Date:</strong> {moment(selectedTransaction.date).tz('Africa/Lagos').format('MMM D, YYYY h:mm A')}</p>
//               <p><strong>Status:</strong> <span style={{ color: statusColors[selectedTransaction.status] }}>{selectedTransaction.status}</span></p>
//               {selectedTransaction.status === 'Failed' && selectedTransaction.metadata?.error_message && (
//                 <div className="bg-red-900 p-2 rounded mt-2">
//                   <p>Error: {selectedTransaction.metadata.error_message}</p>
//                 </div>
//               )}
//               {selectedTransaction.status === 'Pending' && (
//                 <div className="bg-yellow-900 p-2 rounded mt-2">
//                   <p>This transaction is still being processed.</p>
//                 </div>
//               )}
//             </div>
//           </motion.div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   );

//   return (
//     <div className="min-h-screen bg-black p-4">
//       <div className="flex items-center justify-between mb-6 pt-4">
//         <button onClick={() => router.back()} className="text-white">
//           <FaArrowLeft size={24} />
//         </button>
//         <h1 className="text-2xl font-bold text-white">Transaction History</h1>
//         <div className="w-6" />
//       </div>

//       <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
//         {['All', 'Success', 'Failed', 'Pending'].map((item) => (
//           <button
//             key={item}
//             onClick={() => setFilter(item as any)}
//             className={`px-4 py-2 rounded-lg border ${
//               filter === item
//                 ? 'bg-[#8B4513] border-[#8B4513]'
//                 : 'bg-black border-gray-600'
//             } text-white text-sm`}
//           >
//             {item}
//           </button>
//         ))}
//       </div>

//       <div className="space-y-4">
//         {filteredHistory.map((item) => (
//           <motion.button
//             key={item.id}
//             onClick={() => setSelectedTransaction(item)}
//             className="w-full bg-black border border-[#8B4513] rounded-lg p-4 hover:bg-gray-800 transition-colors"
//             whileTap={{ scale: 0.98 }}
//           >
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-white font-bold text-lg">{item.provider} - {item.data}</span>
//               <span
//                 className="text-sm font-bold px-2 py-1 rounded"
//                 style={{ color: statusColors[item.status], backgroundColor: statusColors[item.status] + '20' }}
//               >
//                 {item.status}
//               </span>
//             </div>
//             <p className="text-white text-sm">{formatAmount(item.price)}</p>
//             <p className="text-gray-400 text-sm">Phone: {item.phoneNumber}</p>
//             <p className="text-gray-400 text-xs mt-1">
//               Date: {moment(item.date).tz('Africa/Lagos').format('MMM D, YYYY h:mm A')}
//             </p>
//           </motion.button>
//         ))}
//         {filteredHistory.length === 0 && (
//           <div className="flex flex-col items-center justify-center mt-20">
//             <FaFileText size={48} className="text-gray-500 mb-4" />
//             <p className="text-gray-400">No history to show</p>
//           </div>
//         )}
//       </div>

//       {refreshing && <div className="fixed top-4 right-4">Refreshing...</div>}

//       {renderReceipt()}
//     </div>
//   );
// }