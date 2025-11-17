// app/(protected)/cable/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CableTVClient from "./cable-client";

export default async function CablePage() {
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

  // Fetch all cable plans from Supabase
  const { data: allPlans } = await supabase
    .from("cable_plans")
    .select("*")
    .order("provider", { ascending: true })
    .order("price", { ascending: true });

  // Group plans by provider
  const plansByProvider = (allPlans || []).reduce((acc: any, plan: any) => {
    if (!acc[plan.provider]) {
      acc[plan.provider] = [];
    }
    acc[plan.provider].push({
      id: plan.cableplan_id,
      name: plan.name,
      price: parseFloat(plan.price),
      duration: plan.duration,
    });
    return acc;
  }, {});

  return (
    <CableTVClient
      initialBalance={balance}
      plansByProvider={plansByProvider}
      userId={user.id}
    />
  );
}

// "use client";
// import Image from "next/image";
// import { CABLE_PROVIDERS, mockPlans, SubscriptionPlan, CableProvider } from "@/constants/helper";
// import { useState, useEffect } from "react";
// import {
//   IoAlertOutline,
//   IoReloadOutline,
//   IoCheckmarkCircle,
// } from "react-icons/io5";
// // Define interfaces

// interface TransactionResult {
//   id: string;
//   provider: string;
//   data: string;
//   price: string;
//   date: string;
//   status: string;
//   smartCardNumber: string;
//   reference: string;
//   metadata: string;
// }

// // Function to clean plan name
// const cleanPlanName = (name: string): string => {
//   return name
//     .replace(/\s*\d+(?:,\d+)*\s*$/, "")
//     .replace(/\s*-\s*(1\s*Month|monthly)/i, "")
//     .trim();
// };

// export default function CableTV() {
//   const [selectedProvider, setSelectedProvider] = useState<CableProvider | null>(
//     null
//   );
//   const [smartCardNumber, setSmartCardNumber] = useState<string>("");
//   const [isSmartCardValid, setIsSmartCardValid] = useState<boolean>(false);
//   const [bypassVerification, setBypassVerification] = useState<boolean>(false);
//   const [iucOwnerName, setIucOwnerName] = useState<string | null>(null);
//   const [iucVerificationError, setIucVerificationError] = useState<
//     string | null
//   >(null);
//   const [isValidatingIuc, setIsValidatingIuc] = useState<boolean>(false);
//   const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
//     null
//   );
//   const [transactionPin, setTransactionPin] = useState<string>("");
//   const [balance] = useState<number>(50000); // Mock balance
//   const [transactionModalVisible, setTransactionModalVisible] =
//     useState<boolean>(false);
//   const [transactionStatus, setTransactionStatus] = useState<
//     "processing" | "success" | "failed"
//   >("processing");
//   const [transactionResult, setTransactionResult] =
//     useState<TransactionResult | null>(null);
//   const [plans, setPlans] = useState<{ [key: string]: SubscriptionPlan[] }>(
//     mockPlans
//   );
//   const [loadingPlans, setLoadingPlans] = useState<boolean>(false);

//   // Validate smart card number
//   const validateSmartCardNumber = (
//     card: string,
//     provider: CableProvider | null
//   ): boolean => {
//     if (bypassVerification) return true;
//     if (!card || card.length !== 10 || !/^\d{10}$/.test(card)) {
//       return false;
//     }
//     return !!provider;
//   };

//   // Mock IUC verification
//   const verifyIucNumber = async (card: string, provider: CableProvider | null) => {
//     if (
//       bypassVerification ||
//       !provider ||
//       !validateSmartCardNumber(card, provider)
//     ) {
//       setIucOwnerName(null);
//       setIucVerificationError(null);
//       return;
//     }

//     setIsValidatingIuc(true);
//     setIucOwnerName(null);
//     setIucVerificationError(null);

//     // Simulate API call
//     setTimeout(() => {
//       if (card === "1234567890") {
//         setIucOwnerName("John Doe");
//         setIucVerificationError(null);
//       } else {
//         setIucOwnerName(null);
//         setIucVerificationError("Invalid IUC number");
//       }
//       setIsValidatingIuc(false);
//     }, 1500);
//   };

//   // Update smart card validity
//   useEffect(() => {
//     setIsSmartCardValid(
//       validateSmartCardNumber(smartCardNumber, selectedProvider)
//     );
//     if (smartCardNumber && selectedProvider && smartCardNumber.length === 10) {
//       verifyIucNumber(smartCardNumber, selectedProvider);
//     } else {
//       setIucOwnerName(null);
//       setIucVerificationError(null);
//       setIsValidatingIuc(false);
//     }
//   }, [smartCardNumber, selectedProvider, bypassVerification]);

//   // Handle provider selection
//   const handleSelectProvider = (provider: CableProvider) => {
//     setSelectedProvider(provider);
//     setSelectedPlan(null);
//     setSmartCardNumber("");
//     setIsSmartCardValid(false);
//     setIucOwnerName(null);
//     setIucVerificationError(null);
//     setBypassVerification(false);
//   };

//   // Handle plan selection
//   const selectPlan = (plan: SubscriptionPlan) => {
//     if (selectedPlan?.id === plan.id) {
//       setSelectedPlan(null);
//     } else {
//       setSelectedPlan(plan);
//     }
//   };

//   // Check if purchase is enabled
//   const isPurchaseEnabled =
//     selectedProvider &&
//     (bypassVerification || isSmartCardValid) &&
//     selectedPlan &&
//     transactionPin.length >= 4 &&
//     transactionPin.length <= 6;

//   // Handle purchase (no logic yet)
//   const handlePurchase = () => {
//     if (!isPurchaseEnabled) return;

//     setTransactionModalVisible(true);
//     setTransactionStatus("processing");

//     // Simulate transaction
//     setTimeout(() => {
//       setTransactionStatus("success");
//       setTransactionResult({
//         id: "TXN123456",
//         provider: selectedProvider?.name || "",
//         data: selectedPlan?.name || "",
//         price: selectedPlan?.price.toString() || "0",
//         date: new Date().toISOString(),
//         status: "Success",
//         smartCardNumber: bypassVerification ? "N/A" : smartCardNumber,
//         reference: `REF${Date.now()}`,
//         metadata: JSON.stringify({ validity: selectedPlan?.duration }),
//       });
//     }, 2000);
//   };

//   // Close modal
//   const closeTransactionModal = () => {
//     setTransactionModalVisible(false);
//     setTransactionResult(null);
//   };

//   // Format number with commas
//   const formatNumberWithCommas = (number: number | null): string => {
//     if (number === null) return "0";
//     return number.toLocaleString();
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-4 md:p-8">
//       <div className="max-w-4xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-white mb-2">
//             Cable TV Subscription
//           </h1>
//           <p className="text-gray-400">
//             Select provider and plan to renew your subscription
//           </p>
//         </div>

//         {/* Select Provider */}
//         <div>
//           <h2 className="text-sm font-semibold mb-4">
//             Select Cable TV Provider
//           </h2>
//           <div className="grid grid-cols-3 gap-4">
//             {CABLE_PROVIDERS.map((provider) => (
//               <button
//                 key={provider.id}
//                 onClick={() => handleSelectProvider(provider)}
//                 className={`bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 ${
//                   selectedProvider?.id === provider.id
//                     ? "ring-2 ring-yellow-500 bg-zinc-800"
//                     : "hover:bg-zinc-800"
//                 }`}
//               >
//                 <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white flex items-center justify-center mb-2 border-2 border-yellow-600">
//                   <Image
//                     src={provider.image}
//                     alt={provider.name}
//                     fill
//                     className="object-contain"
//                   />
//                 </div>
//                 <p className="text-sm font-semibold text-center">
//                   {provider.name}
//                 </p>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Smart Card Number */}
//         <div>
//           <label className="block text-sm font-medium text-gray-400 mb-2">
//             Smart Card Number
//           </label>
//           <input
//             type="text"
//             value={smartCardNumber}
//             onChange={(e) =>
//               setSmartCardNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
//             }
//             placeholder="Enter 10-digit smart card number"
//             disabled={bypassVerification}
//             className={`w-full bg-zinc-900 rounded-lg px-4 py-3 text-white placeholder-gray-500 border ${
//               bypassVerification
//                 ? "border-gray-700 opacity-50"
//                 : smartCardNumber && isSmartCardValid && !iucVerificationError
//                 ? "border-yellow-500"
//                 : smartCardNumber && (!isSmartCardValid || iucVerificationError)
//                 ? "border-red-500"
//                 : "border-zinc-700"
//             } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
//           />
//           {isValidatingIuc && (
//             <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
//               <IoReloadOutline className="w-4 h-4 animate-spin" />
//               Validating IUC...
//             </p>
//           )}
//           {iucOwnerName && !bypassVerification && (
//             <p className="text-yellow-500 text-sm mt-2 flex items-center gap-2">
//               <IoCheckmarkCircle className="w-4 h-4" />
//               Owner: {iucOwnerName}
//             </p>
//           )}
//           {iucVerificationError && !bypassVerification && (
//             <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
//               <IoAlertOutline className="w-4 h-4" />
//               {iucVerificationError}
//             </p>
//           )}
//         </div>

//         {/* Bypass Verification Toggle */}
//         <div className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
//           <span className="text-sm font-medium text-gray-400">
//             Bypass IUC Verification
//           </span>
//           <button
//             onClick={() => setBypassVerification(!bypassVerification)}
//             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//               bypassVerification ? "bg-yellow-600" : "bg-zinc-700"
//             }`}
//           >
//             <span
//               className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
//                 bypassVerification ? "translate-x-6" : "translate-x-1"
//               }`}
//             />
//           </button>
//         </div>

//         {/* Subscription Plans */}
//         {selectedProvider && (
//           <div>
//             <h2 className="text-xl font-semibold mb-4">
//               Select Subscription Plan
//             </h2>
//             {loadingPlans ? (
//               <div className="text-center py-8">
//                 <IoReloadOutline className="w-8 h-8 animate-spin mx-auto text-yellow-500" />
//                 <p className="text-gray-400 mt-2">Loading plans...</p>
//               </div>
//             ) : plans[selectedProvider.name]?.length > 0 ? (
//               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//                 {plans[selectedProvider.name].map((plan) => (
//                   <button
//                     key={plan.id}
//                     onClick={() => selectPlan(plan)}
//                     className={`bg-zinc-900 rounded-lg p-4 border-2 transition-all hover:scale-105 ${
//                       selectedPlan?.id === plan.id
//                         ? "border-yellow-500 bg-zinc-800"
//                         : "border-yellow-700 hover:border-yellow-600"
//                     }`}
//                   >
//                     <p className="text-sm font-semibold text-white mb-2 line-clamp-2">
//                       {cleanPlanName(plan.name)}
//                     </p>
//                     <p className="text-lg font-bold text-yellow-600 mb-1">
//                       ₦{plan.price.toLocaleString()}
//                     </p>
//                     <p className="text-xs text-gray-400">{plan.duration}</p>
//                   </button>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-center text-gray-400 py-8">
//                 No plans available for this provider.
//               </p>
//             )}
//           </div>
//         )}

//         {/* Amount to Pay */}
//         <div className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between border border-yellow-700">
//           <span className="text-sm font-medium text-gray-400">
//             Amount to Pay
//           </span>
//           <span className="text-lg font-bold text-yellow-500">
//             ₦{formatNumberWithCommas(selectedPlan?.price || null)}
//           </span>
//         </div>

//         {/* Transaction PIN */}
//         <div className="flex items-center justify-between gap-4">
//           <label className="text-sm font-medium text-gray-400">
//             Transaction PIN
//           </label>
//           <input
//             type="password"
//             value={transactionPin}
//             onChange={(e) =>
//               setTransactionPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//             }
//             placeholder="Enter PIN"
//             maxLength={6}
//             className={`w-40 bg-zinc-900 rounded-lg px-4 py-2 text-white placeholder-gray-500 border ${
//               transactionPin ? "border-yellow-500" : "border-zinc-700"
//             } focus:outline-none focus:ring-2 focus:ring-yellow-500`}
//           />
//         </div>

//         {/* Purchase Button */}
//         <button
//           onClick={handlePurchase}
//           disabled={!isPurchaseEnabled}
//           className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
//             isPurchaseEnabled
//               ? "bg-yellow-600 hover:bg-yellow-700 text-white"
//               : "bg-zinc-800 text-gray-500 cursor-not-allowed"
//           }`}
//         >
//           {isPurchaseEnabled
//             ? "Purchase Subscription"
//             : "Complete Form to Purchase"}
//         </button>

//         {/* Footer */}
//         <div className="bg-zinc-900 rounded-lg p-6 opacity-50 space-y-2">
//           <h3 className="text-sm font-bold text-yellow-500 mb-2">
//             Customer Care for Cable Issues
//           </h3>
//           <p className="text-xs text-gray-400">
//             Contact DSTV/GOtv customer care on 01-2703232, 08039003788, or
//             toll-free lines: 08149860333, 07080630333, 09090630333.
//           </p>
//           <p className="text-xs text-gray-400">
//             Contact STARTIMES customer care on 094618888, 014618888.
//           </p>
//         </div>
//       </div>

//       {/* Transaction Modal */}
//       {transactionModalVisible && (
//         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
//           <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-yellow-700">
//             {transactionStatus === "processing" ? (
//               <div className="text-center">
//                 <IoReloadOutline className="w-16 h-16 animate-spin mx-auto text-yellow-500 mb-4" />
//                 <h3 className="text-xl font-bold mb-2">
//                   Processing Transaction
//                 </h3>
//                 <p className="text-gray-400">
//                   Please wait while we process your payment...
//                 </p>
//               </div>
//             ) : (
//               <>
//                 <div className="text-center mb-6">
//                   {transactionStatus === "success" ? (
//                     <IoCheckmarkCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
//                   ) : (
//                     <IoAlertOutline className="w-16 h-16 mx-auto text-red-500 mb-4" />
//                   )}
//                   <h3 className="text-xl font-bold">
//                     Transaction{" "}
//                     {transactionStatus === "success" ? "Successful" : "Failed"}
//                   </h3>
//                 </div>

//                 {transactionResult && (
//                   <div className="space-y-2 mb-6 text-sm">
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Provider:</span>
//                       <span className="font-semibold">
//                         {transactionResult.provider}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Plan:</span>
//                       <span className="font-semibold">
//                         {transactionResult.data}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Price:</span>
//                       <span className="font-semibold">
//                         ₦{transactionResult.price}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Smart Card:</span>
//                       <span className="font-semibold">
//                         {transactionResult.smartCardNumber}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Reference:</span>
//                       <span className="font-semibold text-xs">
//                         {transactionResult.reference}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Date:</span>
//                       <span className="font-semibold text-xs">
//                         {new Date(transactionResult.date).toLocaleString()}
//                       </span>
//                     </div>
//                   </div>
//                 )}

//                 <button
//                   onClick={closeTransactionModal}
//                   className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 rounded-lg transition-colors"
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
