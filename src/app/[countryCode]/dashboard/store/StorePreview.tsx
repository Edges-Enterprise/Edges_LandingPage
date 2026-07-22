// src/app/[countryCode]/dashboard/store/StorePreview.tsx
"use client";

import { useEffect, useState } from "react";
import { Eye, ShoppingBag, User, Search, Menu, X } from "lucide-react";
// import { createServerClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

interface StorePreviewProps {
  countryCode: string;
}

export function StorePreview({ countryCode }: StorePreviewProps) {
  const [storeData, setStoreData] = useState<{
    store_name: string;
    logo_url: string | null;
    theme_settings: any;
    welcome_message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    setIsLoading(true);

    try {
      const supabase = createAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: application, error: appError } = await supabase
        .from("global_reseller_applications")
        .select("store_name, logo_url, theme_settings, welcome_message")
        .eq("auth_user_id", user.id)
        .single();

      if (appError) {
        setIsLoading(false);
        return;
      }

      setStoreData(application);
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-96" />
      </div>
    );
  }

  if (!storeData) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Store Preview
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Configure your store to see a preview
          </p>
        </div>
      </div>
    );
  }

  const theme = storeData.theme_settings || {
    primary_color: "#C98A54",
    secondary_color: "#ab6c36",
    background_color: "#FFFFFF",
    text_color: "#111827",
    font_family: "Inter",
    button_style: "rounded",
  };

  const sampleProducts = [
    { id: 1, name: "MTN 1GB Data Plan", price: "₦500", category: "Data" },
    { id: 2, name: "Airtel 2GB Data Plan", price: "₦800", category: "Data" },
    { id: 3, name: "Glo 500MB Data Plan", price: "₦300", category: "Data" },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Store Preview
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        See how your store will look to customers
      </p>

      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
        style={{
          backgroundColor: theme.background_color,
          color: theme.text_color,
          fontFamily: theme.font_family,
        }}
      >
        {/* Header */}
        <header
          className="p-4 border-b"
          style={{ borderColor: theme.secondary_color + "40" }}
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              {storeData.logo_url ? (
                <img
                  src={storeData.logo_url}
                  alt="Store Logo"
                  className="h-10 w-10 object-contain rounded"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  {storeData.store_name?.charAt(0) || "S"}
                </div>
              )}
              <span
                className="font-bold text-lg"
                style={{ color: theme.primary_color }}
              >
                {storeData.store_name || "My Store"}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <span>Home</span>
              <span>Products</span>
              <span>About</span>
              <span>Contact</span>
            </div>
            <div className="flex items-center gap-4">
              <Search size={20} className="text-gray-400" />
              <User size={20} className="text-gray-400" />
              <button
                className="md:hidden"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3 text-sm">
              <span>Home</span>
              <span>Products</span>
              <span>About</span>
              <span>Contact</span>
            </div>
          )}
        </header>

        {/* Hero */}
        <div
          className="p-8 text-center"
          style={{ backgroundColor: theme.primary_color + "10" }}
        >
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: theme.primary_color }}
          >
            {storeData.welcome_message || `Welcome to ${storeData.store_name}`}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your trusted source for data bundles and airtime
          </p>
          <button
            className={cn(
              "mt-4 px-6 py-2 text-white text-sm font-medium",
              theme.button_style === "rounded" && "rounded-lg",
              theme.button_style === "square" && "rounded-none",
              theme.button_style === "pill" && "rounded-full",
            )}
            style={{ backgroundColor: theme.primary_color }}
          >
            Browse Products
          </button>
        </div>

        {/* Products */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Popular Plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sampleProducts.map((product) => (
              <div
                key={product.id}
                className="p-4 rounded-lg border"
                style={{ borderColor: theme.secondary_color + "40" }}
              >
                <h4 className="font-medium">{product.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {product.category}
                </p>
                <p
                  className="text-lg font-bold mt-2"
                  style={{ color: theme.primary_color }}
                >
                  {product.price}
                </p>
                <button
                  className={cn(
                    "mt-2 px-4 py-1.5 text-white text-sm w-full",
                    theme.button_style === "rounded" && "rounded-lg",
                    theme.button_style === "square" && "rounded-none",
                    theme.button_style === "pill" && "rounded-full",
                  )}
                  style={{ backgroundColor: theme.primary_color }}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="p-4 text-center text-sm border-t"
          style={{
            borderColor: theme.secondary_color + "40",
            backgroundColor: theme.background_color,
          }}
        >
          <p className="text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} {storeData.store_name}. All rights
            reserved.
          </p>
        </footer>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p>💡 This is a preview. Your actual store may look different.</p>
        <p>📱 The store is fully responsive and works on all devices.</p>
      </div>
    </div>
  );
}
