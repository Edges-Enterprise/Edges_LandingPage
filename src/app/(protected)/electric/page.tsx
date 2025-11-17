// app/(protected)/electricity/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ElectricityClient from "./electricity-client";

export default async function ElectricityPage() {
  const supabase = await createServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user email and wallet balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  let balance = 0;
  if (profile) {
    const { data: wallet } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();
    balance = parseFloat(wallet?.balance || "0");
  }

  return <ElectricityClient initialBalance={balance} userId={user.id} />;
}

// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import { useRouter } from "next/navigation";
// import { FaArrowLeft } from "react-icons/fa";
// import { DISCO_PROVIDERS, METER_TYPES } from "@/constants/helper";

// const BILL_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000];

// export default function ElectricityBillPage() {
//   const router = useRouter();
//   const [selectedProvider, setSelectedProvider] = useState(null);
//   const [meterNumber, setMeterNumber] = useState("");
//   const [isMeterValid, setIsMeterValid] = useState(false);
//   const [meterOwnerName, setMeterOwnerName] = useState(null);
//   const [meterVerificationError, setMeterVerificationError] = useState(null);
//   const [isValidatingMeter, setIsValidatingMeter] = useState(false);
//   const [bypassVerification, setBypassVerification] = useState(false);
//   const [meterType, setMeterType] = useState("prepaid");
//   const [selectedAmount, setSelectedAmount] = useState(null);
//   const [customAmount, setCustomAmount] = useState("");
//   const [discountedPrice, setDiscountedPrice] = useState(null);
//   const [transactionPin, setTransactionPin] = useState("");
//   const [transactionModalVisible, setTransactionModalVisible] = useState(false);
//   const [transactionStatus, setTransactionStatus] = useState("processing");

//   const handleSelectProvider = (provider) => {
//     setSelectedProvider(provider);
//   };

//   const selectAmount = (amount) => {
//     if (selectedAmount === amount) {
//       setSelectedAmount(null);
//       setCustomAmount("");
//       setDiscountedPrice(null);
//     } else {
//       setSelectedAmount(amount);
//       setCustomAmount("");
//       setDiscountedPrice(amount);
//     }
//   };

//   const handleCustomAmount = (text) => {
//     setCustomAmount(text);
//     setSelectedAmount(null);
//     const amount = parseFloat(text);
//     if (!isNaN(amount) && amount >= 1000) {
//       setDiscountedPrice(amount);
//     } else {
//       setDiscountedPrice(null);
//     }
//   };

//   const formatNumberWithCommas = (number) => {
//     if (number === null) return "0";
//     return number.toLocaleString();
//   };

//   const isSlideEnabled =
//     selectedProvider &&
//     (bypassVerification || isMeterValid) &&
//     (selectedAmount || parseFloat(customAmount) >= 1000) &&
//     transactionPin.length >= 4 &&
//     transactionPin.length <= 6;

//   return (
//     <div className="min-h-screen bg-black text-white">
//       <div className="max-w-7xl mx-auto px-4 py-6">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <button
//             onClick={() => router.back()}
//             className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
//           >
//             <FaArrowLeft className="w-6 h-6 text-white" />
//           </button>
//           <h1 className="text-xl sm:text-2xl font-semibold">
//             Electricity Bill
//           </h1>
//           <div className="w-10" />
//         </div>

//         <div className="space-y-6 pb-24">
//           {/* Provider Selection */}
//           <div>
//             <h2 className="text-base font-semibold mb-3">
//               Select Electricity Provider
//             </h2>
//             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
//               {DISCO_PROVIDERS.map((provider) => (
//                 <button
//                   key={provider.id}
//                   onClick={() => handleSelectProvider(provider)}
//                   className={`flex-shrink-0 flex flex-col items-center justify-center bg-gray-900 rounded-xl p-3 w-20 h-20 transition-all ${
//                     selectedProvider?.id === provider.id
//                       ? "border-2 border-amber-500 bg-transparent"
//                       : "border-2 border-transparent"
//                   }`}
//                 >
//                   <div className="w-10 h-10 bg-white rounded-full mb-1 flex items-center justify-center overflow-hidden relative">
//                     <Image
//                       src={provider.image}
//                       alt={provider.name}
//                       fill
//                       // sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//                       className="object-contain "
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                         e.currentTarget.nextSibling.style.display = "flex";
//                       }}
//                     />
//                     <span className="text-xs font-bold text-gray-800 hidden">
//                       {provider.name.charAt(0)}
//                     </span>
//                   </div>
//                   <span className="text-[10px] font-semibold text-center leading-tight">
//                     {provider.name}
//                   </span>
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Meter Number Input */}
//           <div>
//             <label className="block text-sm text-gray-400 mb-2">
//               Meter Number
//             </label>
//             <input
//               type="text"
//               value={meterNumber}
//               onChange={(e) => setMeterNumber(e.target.value)}
//               placeholder="Enter 11-digit meter number"
//               maxLength={11}
//               className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
//                 meterNumber &&
//                 isMeterValid &&
//                 !meterVerificationError &&
//                 !bypassVerification
//                   ? "border-amber-500 ring-amber-500/30"
//                   : meterNumber &&
//                     (!isMeterValid || meterVerificationError) &&
//                     !bypassVerification
//                   ? "border-red-500 ring-red-500/30"
//                   : bypassVerification
//                   ? "border-gray-700"
//                   : "border-gray-800"
//               }`}
//             />
//             {isValidatingMeter && (
//               <p className="text-xs text-amber-500 mt-1">Validating meter...</p>
//             )}
//             {meterOwnerName && !bypassVerification && (
//               <p className="text-xs text-amber-500 mt-1">
//                 Owner: {meterOwnerName}
//               </p>
//             )}
//             {meterVerificationError && !bypassVerification && (
//               <p className="text-xs text-red-500 mt-1">
//                 {meterVerificationError}
//               </p>
//             )}
//           </div>

//           {/* Bypass Verification */}
//           <div className="flex items-center justify-between">
//             <span className="text-sm text-gray-400">
//               Bypass Meter Verification
//             </span>
//             <button
//               onClick={() => setBypassVerification(!bypassVerification)}
//               className={`relative w-12 h-6 rounded-full transition-colors ${
//                 bypassVerification ? "bg-amber-500" : "bg-gray-700"
//               }`}
//             >
//               <div
//                 className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
//                   bypassVerification ? "translate-x-6" : ""
//                 }`}
//               />
//             </button>
//           </div>

//           {/* Meter Type Selection */}
//           <div>
//             <label className="block text-sm text-gray-400 mb-2">
//               Meter Type
//             </label>
//             <div className="grid grid-cols-2 gap-3">
//               {METER_TYPES.map((type) => (
//                 <button
//                   key={type.value}
//                   onClick={() => setMeterType(type.value)}
//                   className={`py-3 rounded-lg font-semibold transition-all ${
//                     meterType === type.value
//                       ? "bg-transparent border-2 border-amber-500 text-white"
//                       : "bg-gray-900 border-2 border-transparent text-white"
//                   }`}
//                 >
//                   {type.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Amount Selection */}
//           <div>
//             <h2 className="text-base font-semibold mb-3">Select Amount</h2>
//             <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
//               {BILL_AMOUNTS.map((amount) => (
//                 <button
//                   key={amount}
//                   onClick={() => selectAmount(amount)}
//                   className={`py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
//                     selectedAmount === amount
//                       ? "bg-transparent border-2 border-amber-500 text-amber-500"
//                       : "bg-gray-900 border-2 border-transparent text-white"
//                   }`}
//                 >
//                   ₦{amount.toLocaleString()}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Amount to Pay */}
//           <div className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
//             <span className="text-sm text-gray-400">Amount to pay</span>
//             <span className="text-base font-semibold text-amber-500">
//               ₦{formatNumberWithCommas(discountedPrice)}
//             </span>
//           </div>

//           {/* Custom Amount */}
//           <div className="flex items-center justify-between">
//             <label className="text-sm text-gray-400">Custom Amount</label>
//             <input
//               type="text"
//               value={customAmount}
//               onChange={(e) => handleCustomAmount(e.target.value)}
//               placeholder="min 1000"
//               className="w-32 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
//             />
//           </div>

//           {/* Transaction PIN */}
//           <div className="flex items-center justify-between">
//             <label className="text-sm text-gray-400">Transaction PIN</label>
//             <input
//               type="password"
//               value={transactionPin}
//               onChange={(e) => setTransactionPin(e.target.value)}
//               placeholder="Enter PIN"
//               maxLength={6}
//               className="w-32 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
//             />
//           </div>

//           {/* Purchase Button */}
//           <div className="mt-6">
//             <button
//               onClick={() => {
//                 if (isSlideEnabled) {
//                   setTransactionModalVisible(true);
//                   setTransactionStatus("processing");
//                 }
//               }}
//               disabled={!isSlideEnabled}
//               className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
//                 isSlideEnabled
//                   ? "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] cursor-pointer"
//                   : "bg-gray-800 cursor-not-allowed opacity-50"
//               }`}
//             >
//               {selectedProvider ? "Purchase" : "Select a provider to continue"}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Transaction Modal */}
//       {transactionModalVisible && (
//         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
//           <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
//             {transactionStatus === "processing" ? (
//               <>
//                 <h2 className="text-xl font-semibold text-white mb-3 text-center">
//                   Processing Transaction
//                 </h2>
//                 <p className="text-gray-400 text-center mb-6">
//                   Please wait while we process your payment...
//                 </p>
//                 <div className="flex justify-center">
//                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <h2 className="text-xl font-semibold text-white mb-3 text-center">
//                   Transaction{" "}
//                   {transactionStatus === "success" ? "Successful" : "Failed"}
//                 </h2>
//                 <div className="space-y-3 mb-6">
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-400">Provider:</span>
//                     <span className="text-white font-medium">AEDC</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-400">Amount:</span>
//                     <span className="text-white font-medium">₦5,000</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-400">Meter Number:</span>
//                     <span className="text-white font-medium">12345678901</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-400">Status:</span>
//                     <span
//                       className={`font-medium ${
//                         transactionStatus === "success"
//                           ? "text-green-500"
//                           : "text-red-500"
//                       }`}
//                     >
//                       {transactionStatus === "success" ? "Success" : "Failed"}
//                     </span>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => setTransactionModalVisible(false)}
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
//                 >
//                   Close
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
