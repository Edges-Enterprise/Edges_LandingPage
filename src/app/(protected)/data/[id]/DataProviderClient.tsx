// app/(protected)/data/[id]/DataProviderClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DataScreenHeader } from "@/components/DataScreenHeader";
import { BundleCard } from "@/components/BundleCard";
import { PurchaseModal } from "@/components/PurchaseModal";
import { CreatePinModal } from "@/components/CreatePinModal";
import { TransactionStatusModal } from "@/components/TransactionStatusModal";

// Types
interface DataBundle {
  id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code?: string;
  planType: string;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
  imageKey?: string;
  availablePlanTypes?: string[];
  ebenkId: number;
  lizzysubId: number;
}

// Sample bundles data
const generateSampleBundles = (providerName: string): DataBundle[] => [
  // Hot Plans (no plan type filtering)
  {
    id: 1,
    data: "1GB",
    price: 300,
    validity: "30 Days",
    category: "Hot",
    planType: "HOT",
    description: "1GB hot deal - limited time offer",
  },
  {
    id: 2,
    data: "2GB",
    price: 550,
    validity: "30 Days",
    category: "Hot",
    planType: "HOT",
    description: "2GB hot deal - best value",
  },
  {
    id: 3,
    data: "5GB",
    price: 1250,
    validity: "30 Days",
    category: "Hot",
    planType: "HOT",
    description: "5GB mega hot deal",
  },
  
  // Daily Plans
  {
    id: 4,
    data: "100MB",
    price: 100,
    validity: "1 Day",
    category: "Daily Plans",
    planType: "SME",
    description: "100MB daily data",
  },
  {
    id: 5,
    data: "200MB",
    price: 150,
    validity: "1 Day",
    category: "Daily Plans",
    planType: "SME2",
    description: "200MB daily data",
  },
  {
    id: 6,
    data: "500MB",
    price: 200,
    validity: "1 Day",
    category: "Daily Plans",
    planType: "GIFTING",
    description: "500MB daily gifting plan",
  },
  
  // Weekly Plans
  {
    id: 7,
    data: "750MB",
    price: 500,
    validity: "7 Days",
    category: "Weekly Plans",
    planType: "SME",
    description: "750MB weekly data",
  },
  {
    id: 8,
    data: "1.5GB",
    price: 800,
    validity: "7 Days",
    category: "Weekly Plans",
    planType: "SME2",
    description: "1.5GB weekly data",
  },
  {
    id: 9,
    data: "3GB",
    price: 1200,
    validity: "7 Days",
    category: "Weekly Plans",
    planType: "CORPORATE_GIFTING",
    description: "3GB weekly corporate plan",
  },
  {
    id: 10,
    data: "2.5GB",
    price: 1000,
    validity: "7 Days",
    category: "Weekly Plans",
    planType: "GIFTING",
    description: "2.5GB weekly gifting plan",
  },
  
  // Monthly Plans
  {
    id: 11,
    data: "2GB",
    price: 1000,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "SME",
    description: "2GB monthly SME data",
  },
  {
    id: 12,
    data: "5GB",
    price: 2000,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "SME2",
    description: "5GB monthly SME2 data",
  },
  {
    id: 13,
    data: "10GB",
    price: 3500,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "GIFTING",
    description: "10GB monthly gifting plan",
  },
  {
    id: 14,
    data: "20GB",
    price: 6000,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "CORPORATE_GIFTING",
    description: "20GB monthly corporate plan",
  },
  {
    id: 15,
    data: "40GB",
    price: 10000,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "SME",
    description: "40GB monthly SME data",
  },
  {
    id: 16,
    data: "75GB",
    price: 15000,
    validity: "30 Days",
    category: "Monthly Plans",
    planType: "SME2",
    description: "75GB monthly SME2 data",
  },
];

interface DataProviderClientProps {
  provider: Provider;
}

export function DataProviderClient({ provider }: DataProviderClientProps) {
  const router = useRouter();
  
  const [bundles] = useState<DataBundle[]>(generateSampleBundles(provider.name));
  const [walletBalance] = useState(25000);
  const [activeCategory, setActiveCategory] = useState("Hot");
  const [activePlanType, setActivePlanType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<DataBundle | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPinCreationModalOpen, setIsPinCreationModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "processing" | "success" | "failed"
  >("processing");
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = (bundle: DataBundle) => {
    setSelectedBundle(bundle);
    setIsPurchaseModalOpen(true);
  };

  const handleContinue = () => {
    setIsPurchaseModalOpen(false);
    setIsTransactionModalOpen(true);
    setTransactionStatus("processing");

    // Simulate transaction
    setTimeout(() => {
      setTransactionStatus("success");
    }, 2000);
  };

  const handleBack = () => {
    router.push('/data');
  };

  // Filter bundles based on search and category
  const filteredBundles = React.useMemo(() => {
    let filtered = bundles;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.validity.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      // Apply category filter
      filtered = filtered.filter((b) => b.category === activeCategory);
      
      // Apply plan type filter (only for non-Hot categories)
      if (activeCategory !== "Hot" && activePlanType) {
        filtered = filtered.filter((b) => b.planType === activePlanType);
      }
    }

    return filtered;
  }, [bundles, searchTerm, activeCategory, activePlanType]);

  // Get available plan types for current category
  const planTypeOptions = React.useMemo(() => {
    if (activeCategory === "Hot" || searchTerm) {
      return [];
    }
    const types = [...new Set(
      bundles
        .filter((b) => b.category === activeCategory)
        .map((b) => b.planType)
    )];
    return types;
  }, [bundles, activeCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-black">
      <DataScreenHeader
        provider={provider}
        walletBalance={walletBalance}
        activeCategory={activeCategory}
        onCategoryChange={(category: string) => {
          setActiveCategory(category);
          setActivePlanType("");
        }}
        activePlanType={activePlanType}
        planTypeOptions={planTypeOptions}
        onPlanTypeChange={setActivePlanType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchClear={() => setSearchTerm("")}
        onBack={handleBack}
      />

      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {filteredBundles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              {searchTerm
                ? "No matching plans found"
                : activePlanType
                ? `No ${activePlanType} plans available`
                : `No plans available in ${activeCategory}`}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-white text-lg mb-4 font-semibold">
              {searchTerm 
                ? `Search Results (${filteredBundles.length})` 
                : activePlanType 
                ? `${activeCategory} - ${activePlanType} (${filteredBundles.length})`
                : `${activeCategory} (${filteredBundles.length})`}
            </h2>
            <div className="space-y-0">
              {filteredBundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onPurchase={() => handlePurchase(bundle)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        bundle={selectedBundle}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        transactionPin={transactionPin}
        setTransactionPin={setTransactionPin}
        showPin={showPin}
        setShowPin={setShowPin}
        hasPin={hasPin}
        onCreatePin={() => {
          setIsPurchaseModalOpen(false);
          setIsPinCreationModalOpen(true);
        }}
        onContinue={handleContinue}
      />

      <CreatePinModal
        isOpen={isPinCreationModalOpen}
        onClose={() => setIsPinCreationModalOpen(false)}
        newPin={newPin}
        setNewPin={setNewPin}
        confirmPin={confirmPin}
        setConfirmPin={setConfirmPin}
        showNewPin={showNewPin}
        setShowNewPin={setShowNewPin}
        showConfirmPin={showConfirmPin}
        setShowConfirmPin={setShowConfirmPin}
        onSave={() => {
          setIsLoading(true);
          setTimeout(() => {
            setHasPin(true);
            setIsPinCreationModalOpen(false);
            setIsLoading(false);
            setIsPurchaseModalOpen(true);
          }, 1500);
        }}
        isLoading={isLoading}
      />

      <TransactionStatusModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setPhoneNumber("");
          setTransactionPin("");
        }}
        status={transactionStatus}
        bundle={selectedBundle}
        phoneNumber={phoneNumber}
        networkProvider={provider.name}
      />

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
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #000;
        }

        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}