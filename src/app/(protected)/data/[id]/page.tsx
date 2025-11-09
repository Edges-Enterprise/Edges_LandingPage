// // // app/(protected)/data/[id]/page.tsx

// // export default async function DataProviderPage({
// //   params,
// // }: {
// //   params: Promise<{ id: string }>;
// // }) {
// //   const { id } = await params;

// //   return (
// //     <div className="min-h-screen bg-black text-white">
// //       <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
// //         {/* Header */}
// //         serviceprovider: {id}
// //       </div>
// //     </div>
// //   );
// // }


// "use client";

// import React, { useState } from "react";
// import { DataScreenHeader } from "@/components/DataScreenHeader";
// import { BundleCard } from "@/components/BundleCard";
// import { PurchaseModal } from "@/components/PurchaseModal";
// import { CreatePinModal } from "@/components/CreatePinModal";
// import { TransactionStatusModal } from "@/components/TransactionStatusModal";
// import { IoWifi,IoSearch,IoGift,IoClose,IoEye,IoEyeOff, IoArrowBackOutline,IoFlash, IoReloadOutline,IoCalendar, IoArrowForwardOutline } from "react-icons/io5";



// // Types
// interface DataBundle {
//   id: number;
//   data: string;
//   price: number;
//   validity: string;
//   category: string;
//   description?: string;
//   variation_code?: string;
//   planType: string;
// }

// interface Provider {
//   id: number;
//   name: string;
//   image: string;
//   code?: string;
//   imageKey?: string;
//   availablePlanTypes?: string[];
//   lizzysubId: number;
// }

// // Sample data
// const sampleProvider: Provider = {
//   id: 1,
//   name: "MTN",
//   image: "/mtn-logo.png",
//   code: "mtn",
//   imageKey: "MTN",
//   lizzysubId: 1,
// };

// const sampleBundles: DataBundle[] = [
//   {
//     id: 1,
//     data: "1GB",
//     price: 500,
//     validity: "30 Days",
//     category: "Hot",
//     planType: "MTN",
//     description: "1GB data valid for 30 days",
//   },
//   {
//     id: 2,
//     data: "2GB",
//     price: 1000,
//     validity: "30 Days",
//     category: "Monthly Plans",
//     planType: "SME",
//     description: "2GB SME data valid for 30 days",
//   },
//   {
//     id: 3,
//     data: "5GB",
//     price: 2500,
//     validity: "30 Days",
//     category: "Monthly Plans",
//     planType: "CORPORATE_GIFTING",
//     description: "5GB corporate gifting data",
//   },
//   {
//     id: 4,
//     data: "500MB",
//     price: 200,
//     validity: "7 Days",
//     category: "Weekly Plans",
//     planType: "MTN",
//     description: "500MB weekly plan",
//   },
// ];


// const planTypes = [
//   "SME",
//   "SME2",
//   "CORPORATE_GIFTING",
//   "GIFTING",
// ];


// // Main Component
// export default function ServiceProviderPage() {
//   const [selectedProvider] = useState<Provider>(sampleProvider);
//   const [walletBalance] = useState(25000);
//   const [activeCategory, setActiveCategory] = useState("Hot");
//   const [activePlanType, setActivePlanType] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
//   const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
//   const [isPinCreationModalOpen, setIsPinCreationModalOpen] = useState(false);
//   const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [transactionPin, setTransactionPin] = useState("");
//   const [showPin, setShowPin] = useState(false);
//   const [hasPin, setHasPin] = useState(false);
//   const [newPin, setNewPin] = useState("");
//   const [confirmPin, setConfirmPin] = useState("");
//   const [showNewPin, setShowNewPin] = useState(false);
//   const [showConfirmPin, setShowConfirmPin] = useState(false);
//   const [transactionStatus, setTransactionStatus] = useState<
//     "processing" | "success" | "failed"
//   >("processing");
//   const [isLoading, setIsLoading] = useState(false);

//   const handlePurchase = (bundle: DataBundle) => {
//     setSelectedBundle(bundle);
//     setIsPurchaseModalOpen(true);
//   };

//   const handleContinue = () => {
//     setIsPurchaseModalOpen(false);
//     setIsTransactionModalOpen(true);
//     setTransactionStatus("processing");

//     // Simulate transaction
//     setTimeout(() => {
//       setTransactionStatus("success");
//     }, 2000);
//   };

//   const filteredBundles = searchTerm
//     ? sampleBundles.filter(
//         (b) =>
//           b.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           b.description?.toLowerCase().includes(searchTerm.toLowerCase())
//       )
//     : activeCategory === "Hot"
//     ? sampleBundles.filter((b) => b.category === "Hot")
//     : sampleBundles.filter((b) => b.category === activeCategory);

//   const planTypeOptions = [...new Set(filteredBundles.map((b) => b.planType))];

//   return (
//     <div className="min-h-screen bg-black">
//       <DataScreenHeader
//         provider={selectedProvider}
//         walletBalance={walletBalance}
//         activeCategory={activeCategory}
//         onCategoryChange={setActiveCategory}
//         activePlanType={activePlanType}
//         planTypeOptions={planTypeOptions}
//         onPlanTypeChange={setActivePlanType}
//         searchTerm={searchTerm}
//         onSearchChange={setSearchTerm}
//         onSearchClear={() => setSearchTerm("")}
//         onBack={() => console.log("Go back")}
//       />

//       <div className="w-full max-w-7xl mx-auto px-4 py-6">
//         {isLoading ? (
//           <div className="flex flex-col items-center justify-center py-20">
//             <IoReloadOutline size={48} className="text-[#744925] animate-spin mb-4" />
//             <p className="text-gray-400">Loading Plans...</p>
//           </div>
//         ) : filteredBundles.length === 0 ? (
//           <div className="text-center py-20">
//             <p className="text-gray-400 text-lg">
//               {searchTerm
//                 ? "No matching plans found"
//                 : `No plans available in ${activeCategory}`}
//             </p>
//           </div>
//         ) : (
//           <>
//             <h2 className="text-white text-lg mb-4">
//               {searchTerm ? "Search Results:" : `${activeCategory} Plans:`}
//             </h2>
//             <div className="space-y-0">
//               {filteredBundles.map((bundle) => (
//                 <BundleCard
//                   key={bundle.id}
//                   bundle={bundle}
//                   onPurchase={() => handlePurchase(bundle)}
//                 />
//               ))}
//             </div>
//           </>
//         )}
//       </div>

//       <PurchaseModal
//         isOpen={isPurchaseModalOpen}
//         onClose={() => setIsPurchaseModalOpen(false)}
//         bundle={selectedBundle}
//         phoneNumber={phoneNumber}
//         setPhoneNumber={setPhoneNumber}
//         transactionPin={transactionPin}
//         setTransactionPin={setTransactionPin}
//         showPin={showPin}
//         setShowPin={setShowPin}
//         hasPin={hasPin}
//         onCreatePin={() => {
//           setIsPurchaseModalOpen(false);
//           setIsPinCreationModalOpen(true);
//         }}
//         onContinue={handleContinue}
//       />

//       <CreatePinModal
//         isOpen={isPinCreationModalOpen}
//         onClose={() => setIsPinCreationModalOpen(false)}
//         newPin={newPin}
//         setNewPin={setNewPin}
//         confirmPin={confirmPin}
//         setConfirmPin={setConfirmPin}
//         showNewPin={showNewPin}
//         setShowNewPin={setShowNewPin}
//         showConfirmPin={showConfirmPin}
//         setShowConfirmPin={setShowConfirmPin}
//         onSave={() => {
//           setIsLoading(true);
//           setTimeout(() => {
//             setHasPin(true);
//             setIsPinCreationModalOpen(false);
//             setIsLoading(false);
//             setIsPurchaseModalOpen(true);
//           }, 1500);
//         }}
//         isLoading={isLoading}
//       />

//       <TransactionStatusModal
//         isOpen={isTransactionModalOpen}
//         onClose={() => {
//           setIsTransactionModalOpen(false);
//           setPhoneNumber("");
//           setTransactionPin("");
//         }}
//         status={transactionStatus}
//         bundle={selectedBundle}
//         phoneNumber={phoneNumber}
//         networkProvider="MTN"
//       />

//       <style jsx global>{`
//         @keyframes fade-in {
//           from {
//             opacity: 0;
//           }
//           to {
//             opacity: 1;
//           }
//         }

//         @keyframes slide-up {
//           from {
//             opacity: 0;
//             transform: translateY(100%);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }

//         @keyframes scale-in {
//           from {
//             opacity: 0;
//             transform: scale(0.95);
//           }
//           to {
//             opacity: 1;
//             transform: scale(1);
//           }
//         }

//         .animate-fade-in {
//           animation: fade-in 0.2s ease-out;
//         }

//         .animate-slide-up {
//           animation: slide-up 0.3s ease-out;
//         }

//         .animate-scale-in {
//           animation: scale-in 0.2s ease-out;
//         }

//         .line-clamp-2 {
//           display: -webkit-box;
//           -webkit-line-clamp: 2;
//           -webkit-box-orient: vertical;
//           overflow: hidden;
//         }

//         .scrollbar-hide::-webkit-scrollbar {
//           display: none;
//         }

//         .scrollbar-hide {
//           -ms-overflow-style: none;
//           scrollbar-width: none;
//         }

//         /* Custom scrollbar for bundle list */
//         ::-webkit-scrollbar {
//           width: 8px;
//         }

//         ::-webkit-scrollbar-track {
//           background: #000;
//         }

//         ::-webkit-scrollbar-thumb {
//           background: #333;
//           border-radius: 4px;
//         }

//         ::-webkit-scrollbar-thumb:hover {
//           background: #555;
//         }

//         @media (prefers-reduced-motion: reduce) {
//           * {
//             animation-duration: 0.01ms !important;
//             animation-iteration-count: 1 !important;
//             transition-duration: 0.01ms !important;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }


// app/(protected)/data/[id]/page.tsx

import React from "react";
import { notFound } from "next/navigation";
import { DataProviderClient } from "./DataProviderClient";
import { NETWORK_IMAGES } from "@/constants/helper";

const DEFAULT_PROVIDER_IMAGE = "/default-provider.png";

const NETWORK_ID_MAPPING = {
  mtn: { ebenk: 1, lizzysub: 1, name: "MTN" },
  airtel: { ebenk: 4, lizzysub: 2, name: "AIRTEL" },
  glo: { ebenk: 2, lizzysub: 3, name: "GLO" },
  "9mobile": { ebenk: 3, lizzysub: 4, name: "9MOBILE" },
};

export default async function DataProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Look up provider data based on the id
  const providerData = NETWORK_ID_MAPPING[id as keyof typeof NETWORK_ID_MAPPING];

  if (!providerData) {
    notFound();
  }

  const provider = {
    id: providerData.ebenk,
    name: providerData.name,
    image: NETWORK_IMAGES[providerData.name as keyof typeof NETWORK_IMAGES] || DEFAULT_PROVIDER_IMAGE,
    code: id,
    imageKey: providerData.name,
    availablePlanTypes: ["SME", "SME2", "CORPORATE_GIFTING", "GIFTING"],
    ebenkId: providerData.ebenk,
    lizzysubId: providerData.lizzysub,
  };

  return <DataProviderClient provider={provider} />;
}