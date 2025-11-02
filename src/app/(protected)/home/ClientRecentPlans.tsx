// app/(protected)/home/ClientRecentPlans.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface PopularPlan {
  plan_name: string;
  provider: string;
  image: string;
  amount: number;
  validity: string;
  phone_number: string;
  network_id: string;
  plan_id: string;
}

interface Props {
  plans: PopularPlan[];
  phoneNumber: string;
  userEmail: string;
  hasTransactionPin: boolean;
  user: any;
}

export default function ClientRecentPlans({
  plans,
  phoneNumber,
  userEmail,
  hasTransactionPin,
  user,
}: Props) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const handleSwipePurchase = async (plan: PopularPlan) => {
    if (!user) {
      alert("You must be logged in to make a purchase.");
      router.push("/sign-in");
      return;
    }

    if (!hasTransactionPin) {
      setIsPinModalVisible(true);
      return;
    }

    setIsPurchasing(plan.plan_id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized");

      const bundle: DataBundle = {
        id: parseInt(plan.plan_id) || 0,
        data: plan.plan_name,
        price: plan.amount,
        validity: plan.validity,
        category: "Data",
        description: plan.plan_name,
        variation_code: `data_${plan.plan_name
          .toLowerCase()
          .replace(/\s/g, "_")}`,
        planType: "Data Plan",
      };

      const provider: Provider = {
        id: parseInt(plan.network_id) || 0,
        name: plan.provider,
        image: plan.image,
        code: plan.provider.toLowerCase(),
        imageKey: plan.provider.toUpperCase(),
      };

      const params: ConfirmationParams = {
        bundle: JSON.stringify(bundle),
        provider: JSON.stringify({
          id: provider.id,
          name: provider.name,
          code: provider.code,
          imageKey: provider.imageKey,
        }),
        phoneNumber: plan.phone_number || phoneNumber,
        userEmail,
        transactionPin: user.user_metadata?.transaction_pin ?? "",
        source: "index",
        networkId: plan.network_id,
        planId: plan.plan_id,
      };

      router.push({
        pathname: "/confirmation",
        query: params,
      });
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Failed to initiate purchase. Please try again.");
    } finally {
      setIsPurchasing(null);
    }
  };

  // PlanItemWithSwipe - Web version with click/hover (responsive)
  const PlanItemWithSwipe = ({
    plan,
    image,
    index,
    onSwipePurchase,
  }: {
    plan: string;
    image: string;
    index: number;
    onSwipePurchase: () => void;
  }) => (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.2 }}
      className="bg-gray-800 rounded-xl p-4 md:p-5 hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-3 md:gap-4"
      onClick={onSwipePurchase}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <img
        src={image}
        alt={plan}
        className="w-12 h-12 md:w-16 md:h-16 rounded object-cover flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = DEFAULT_PROVIDER_IMAGE;
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm md:text-base truncate">
          {plan}
        </p>
        <p className="text-gray-400 text-xs md:text-sm truncate">
          ₦{plan.amount || 300} - {plan.validity || "N/A"}
        </p>
      </div>
      {isPurchasing === plan.plan_id && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-auto flex-shrink-0"></div>
      )}
    </motion.div>
  );

  return (
    <>
      <div className="space-y-4 md:space-y-5">
        {plans.map((plan, index) => (
          <PlanItemWithSwipe
            key={`${plan.plan_id}-${index}`}
            plan={plan.plan_name}
            image={plan.image}
            index={index}
            onSwipePurchase={() => handleSwipePurchase(plan)}
          />
        ))}
      </div>
      {/* Trigger PIN modal */}
      {isPinModalVisible && (
        <ClientPinModal
          visible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          user={user}
        />
      )}
    </>
  );
}
