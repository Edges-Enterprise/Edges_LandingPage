// app/(protected)/data/[id]/DataProviderClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DataScreenHeader } from "@/components/DataScreenHeader";
import { BundleCard } from "@/components/BundleCard";
import { PurchaseModal } from "@/components/PurchaseModal";
import { CreatePinModal } from "@/components/CreatePinModal";
import { TransactionStatusModal } from "@/components/TransactionStatusModal";
import { purchaseDataAction } from "@/app/actions/data";

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
  lizzysub_plan_id?: number;
}

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
  imageKey?: string;
  availablePlanTypes?: string[];
  lizzysubId: number;
}

interface DataProviderClientProps {
  provider: Provider;
  initialPlans: DataBundle[];
  initialWalletBalance: number;
  initialHasPin: boolean;
}

export function DataProviderClient({
  provider,
  initialPlans,
  initialWalletBalance,
  initialHasPin,
}: DataProviderClientProps) {
  const router = useRouter();

  const [bundles] = useState<DataBundle[]>(initialPlans);
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [hasPin, setHasPin] = useState(initialHasPin);
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
  const [transactionStatus, setTransactionStatus] = useState<
    "processing" | "success" | "failed"
  >("processing");
  const [transactionMessage, setTransactionMessage] = useState("");
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = (bundle: DataBundle) => {
    setSelectedBundle(bundle);
    setTransactionError(null);
    setIsPurchaseModalOpen(true);
  };

  const handleContinue = async () => {
    if (!selectedBundle) return;

    // Validate phone number
    if (phoneNumber.length !== 11) {
      setTransactionError("Please enter a valid 11-digit phone number");
      return;
    }

    // Validate PIN
    if (!hasPin) {
      setTransactionError("Please create a transaction PIN first");
      return;
    }

    if (transactionPin.length < 4 || transactionPin.length > 6) {
      setTransactionError("Please enter your transaction PIN");
      return;
    }

    setIsPurchasing(true);
    setIsPurchaseModalOpen(false);
    setIsTransactionModalOpen(true);
    setTransactionStatus("processing");
    setTransactionMessage("Processing your data purchase...");

    try {
      const result = await purchaseDataAction({
        network: provider.lizzysubId,
        phone: phoneNumber,
        data_plan: selectedBundle.lizzysub_plan_id || selectedBundle.id,
        planName: selectedBundle.data,
        amount: selectedBundle.price,
        validity: selectedBundle.validity,
        pin: transactionPin,
      });

      if (result.error) {
        setTransactionStatus("failed");
        setTransactionMessage(result.error);
      } else {
        setTransactionStatus("success");
        setTransactionMessage(result.message || "Purchase successful!");
        setWalletBalance(
          result.data?.newBalance || walletBalance - selectedBundle.price
        );

        // Clear form
        setPhoneNumber("");
        setTransactionPin("");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      setTransactionStatus("failed");
      setTransactionMessage(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBack = () => {
    router.push("/data");
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    if (transactionStatus === "success") {
      // Refresh the page to update wallet balance
      router.refresh();
    }
  };

  const handlePinCreated = () => {
    setHasPin(true);
    setIsPinCreationModalOpen(false);
    setIsPurchaseModalOpen(true);
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
    const types = [
      ...new Set(
        bundles
          .filter((b) => b.category === activeCategory)
          .map((b) => b.planType)
      ),
    ];
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
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setTransactionError(null);
        }}
        bundle={selectedBundle}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        transactionPin={transactionPin}
        setTransactionPin={setTransactionPin}
        showPin={showPin}
        setShowPin={setShowPin}
        hasPin={hasPin}
        error={transactionError}
        onCreatePin={() => {
          setIsPurchaseModalOpen(false);
          setIsPinCreationModalOpen(true);
        }}
        onContinue={handleContinue}
        isPurchasing={isPurchasing}
      />

      <CreatePinModal
        isOpen={isPinCreationModalOpen}
        onClose={() => setIsPinCreationModalOpen(false)}
        user={true}
      />

      <TransactionStatusModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        status={transactionStatus}
        message={transactionMessage}
        bundle={selectedBundle}
        phoneNumber={phoneNumber}
        networkProvider={provider.name}
      />
    </div>
  );
}

