// Bundle Card Component
"use client";

import React, { useState } from "react";
import { IoWifi,IoSearch,IoGift,IoClose,IoEye,IoEyeOff, IoArrowBackOutline,IoFlash, IoReloadOutline,IoCalendar, IoArrowForwardOutline } from "react-icons/io5";

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

export const BundleCard = ({
  bundle,
  onPurchase,
}: {
  bundle: DataBundle;
  onPurchase: () => void;
}) => {
  const formatNumber = (num: number) => num.toLocaleString();
 
 return (
    <div className="bg-gray-900 rounded-2xl p-4 mb-3 hover:bg-gray-800 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-bold text-white truncate">
            {bundle.data}
          </h3>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            {bundle.validity}
          </p>
        </div>
        <div className="text-right ml-3">
          <p className="text-base md:text-lg font-bold text-white">
            ₦{formatNumber(bundle.price)}
          </p>
        </div>
      </div>

      {bundle.planType && bundle.planType !== "HOT" && (
        <p className="text-xs md:text-sm text-gray-500 mb-2">
          {bundle.planType.replace(/_/g, " ")}
        </p>
      )}

      {bundle.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {bundle.description}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={onPurchase}
          className="bg-[#744925] hover:bg-[#8B5530] text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
        >
          Purchase
        </button>
      </div>
    </div>
  );
};