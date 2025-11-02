import React from 'react'

const WalletPage = () => {
  return (
    <div>Wallet Page</div>
  )
}

export default WalletPage

// // app/(protected)/wallet/page.tsx
// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { useRouter } from 'next/navigation';
// import { FaWallet, FaEye, FaPlusCircle, FaChevronDown, FaChevronUp, FaHistory, FaSync } from 'react-icons/fa';
// import { motion } from 'framer-motion';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import { useSupabaseSession } from '@supabase/auth-helpers-react'; // Assume ported hook

// interface Transaction {
//   type: string;
//   amount: number;
//   method?: string;
//   date: string;
//   details?: string;
// }

// export default function WalletPage() {
//   const router = useRouter();
//   const supabase = createClientComponentClient();
//   const { user, isLoading: isLoadingSession } = useSupabaseSession();
//   const [showTransactions, setShowTransactions] = useState(false);
//   const [balance, setBalance] = useState(0);
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [hasPriorPurchase, setHasPriorPurchase] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   const fetchUserAndWallet = useCallback(async () => {
//     if (isLoadingSession || !user) return;

//     try {
//       setRefreshing(true);

//       const { data: wallet } = await supabase
//         .from('wallet')
//         .select('balance')
//         .eq('user_email', user.email)
//         .single();

//       setBalance(wallet?.balance || 0);

//       // Realtime subscription
//       const channel = supabase
//         .channel(`wallet:user_email=${user.email}`)
//         .on(
//           'postgres_changes',
//           { event: 'UPDATE', schema: 'public', table: 'wallet', filter: `user_email=eq.${user.email}` },
//           (payload) => setBalance(payload.new.balance ?? 0)
//         )
//         .subscribe();

//       const { data: txData } = await supabase
//         .from('transactions')
//         .select('amount, status, metadata, created_at, type')
//         .eq('user_email', user.email)
//         .eq('status', 'success')
//         .order('created_at', { ascending: false })
//         .limit(5);

//       // Map transactions similar to RN logic
//       const mappedTransactions = txData?.map((tx: any) => {
//         // ... mapping logic as in RN (abbreviated for brevity)
//         return {
//           type: 'Wallet Funding', // Placeholder
//           amount: tx.amount,
//           method: tx.metadata?.payment_method || 'Unknown',
//           details: tx.metadata?.purchase || 'N/A',
//           date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
//         };
//       }) || [];

//       setTransactions(mappedTransactions);

//       // Check prior purchases
//       const { data: dataPurchases } = await supabase.from('data_purchases').select('id').eq('user_email', user.email).limit(1);
//       setHasPriorPurchase(!!dataPurchases?.length);

//       return () => {
//         supabase.removeChannel(channel);
//       };
//     } catch (error) {
//       console.error('Error fetching wallet data:', error);
//     } finally {
//       setRefreshing(false);
//     }
//   }, [user, isLoadingSession, supabase]);

//   useEffect(() => {
//     fetchUserAndWallet();
//     const interval = setInterval(fetchUserAndWallet, 5 * 60 * 1000);
//     return () => clearInterval(interval);
//   }, [fetchUserAndWallet]);

//   const formattedBalance = `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

//   return (
//     <div className="min-h-screen bg-black p-4 overflow-y-auto">
//       {refreshing && <div className="fixed top-4 right-4 flex items-center gap-2 bg-gray-800 px-3 py-2 rounded text-white">
//         <FaSync className="animate-spin" /> Refreshing...
//       </div>}

//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-white mb-2">Wallet 💼</h1>
//         <p className="text-gray-400">Manage your balance and transactions</p>
//       </div>

//       <motion.div
//         initial={{ y: 20, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         className="bg-[#744925] rounded-2xl p-6 mb-6 mx-4"
//       >
//         <div className="flex justify-between items-center mb-2">
//           <span className="text-white/70">Wallet Balance</span>
//           <FaEye size={20} className="text-white" />
//         </div>
//         <p className="text-4xl font-bold text-white">{formattedBalance}</p>
//       </motion.div>

//       <motion.div
//         animate={{ scale: [1, 1.05, 1] }}
//         transition={{ duration: 1.5, repeat: Infinity }}
//         className="mx-4 mb-6"
//       >
//         <button
//           onClick={() => router.push('/fund')}
//           className="w-full bg-[#744925] rounded-xl py-4 flex items-center justify-center gap-2 text-white font-semibold hover:bg-[#6d3f2a] transition-colors"
//         >
//           <FaPlusCircle size={20} />
//           Fund Wallet
//         </button>
//       </motion.div>

//       <button
//         onClick={() => setShowTransactions(!showTransactions)}
//         className="w-full flex justify-between items-center mb-4 px-4 py-2"
//       >
//         <span className="text-xl font-bold text-white">🧾 Recent Transactions</span>
//         {showTransactions ? <FaChevronUp size={22} className="text-white" /> : <FaChevronDown size={22} className="text-white" />}
//       </button>

//       {showTransactions && (
//         <div className="mx-4 space-y-4 mb-6">
//           {transactions.length > 0 ? (
//             transactions.map((item, index) => (
//               <motion.div
//                 key={index}
//                 initial={{ x: -20, opacity: 0 }}
//                 animate={{ x: 0, opacity: 1 }}
//                 transition={{ delay: index * 0.1 }}
//                 className="bg-gray-800 border border-white/10 rounded-xl p-4 flex justify-between items-center"
//               >
//                 <div>
//                   <p className="font-medium text-white">{item.type}</p>
//                   <p className="text-gray-400 text-sm">{item.details || item.method} • {item.date}</p>
//                 </div>
//                 <p className={`font-bold text-lg ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
//                   {item.amount < 0 ? '-' : '+'}₦{Math.abs(item.amount).toLocaleString('en-NG')}
//                 </p>
//               </motion.div>
//             ))
//           ) : (
//             <p className="text-gray-400 text-center py-4">No transactions yet</p>
//           )}
//         </div>
//       )}

//       {!showTransactions && hasPriorPurchase && (
//         <div className="mx-4">
//           <h2 className="text-xl font-bold text-white mb-3">💡 Recommended Purchases</h2>
//           {/* Recommendations list - placeholder */}
//           <p className="text-gray-400">Recommendations based on history (implement logic).</p>
//         </div>
//       )}

//       {!showTransactions && !hasPriorPurchase && (
//         <p className="text-gray-400 text-center mt-8">Make a purchase and set a transaction PIN to see recommendations!</p>
//       )}
//     </div>
//   );
// }