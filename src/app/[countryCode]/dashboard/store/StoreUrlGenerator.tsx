// src/app/[countryCode]/dashboard/store/StoreUrlGenerator.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Copy,
  CheckCircle,
  Loader2,
  Share2,
  QrCode,
} from "lucide-react";
// import { createAdminClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

interface StoreUrlGeneratorProps {
  countryCode: string;
}

export function StoreUrlGenerator({ countryCode }: StoreUrlGeneratorProps) {
  const [storeSlug, setStoreSlug] = useState<string>("");
  const [storeUrl, setStoreUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

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
        .select("store_slug")
        .eq("auth_user_id", user.id)
        .single();

      if (appError) {
        setIsLoading(false);
        return;
      }

      if (application?.store_slug) {
        setStoreSlug(application.store_slug);
        const url = `${window.location.origin}/${countryCode}/${application.store_slug}`;
        setStoreUrl(url);
        // Generate QR code URL using a public API
        setQrCodeUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
        );
      }
    } catch (err) {
      console.error("Error fetching store data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = storeUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Visit ${storeSlug || "My Store"}`,
          text: `Check out my store at Edges Network!`,
          url: storeUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!storeSlug) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Store URL
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-8 text-center">
          <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Your store URL will be available once you set up your store
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Store URL
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Share your store with customers using this unique URL
      </p>

      <div className="space-y-6">
        {/* URL Display */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Globe size={16} />
            <span>Your store URL</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={storeUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono border border-gray-200 dark:border-gray-600"
            />
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Copy URL"
            >
              {copied ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <Copy size={18} />
              )}
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Share URL"
            >
              <Share2 size={18} />
            </button>
          </div>
          {copied && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              ✓ Copied to clipboard!
            </p>
          )}
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <QrCode size={16} />
              <span>QR Code</span>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={qrCodeUrl}
                alt="Store QR Code"
                className="h-32 w-32 bg-white rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <p>Scan this QR code with your phone camera</p>
                <p className="text-xs">
                  Customers can instantly access your store
                </p>
                <button
                  onClick={() => window.open(qrCodeUrl, "_blank")}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Store Slug Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">Store Slug:</span> /{countryCode}/
            {storeSlug}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            This is your unique store identifier. You can change it in your
            store settings.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.open(storeUrl, "_blank")}
            className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors flex items-center gap-2"
          >
            <Globe size={18} />
            Open Store
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Share2 size={18} />
            Share Store
          </button>
          <button
            onClick={() => {
              const subject = `Check out my store: ${storeSlug}`;
              const body = `Visit my store at Edges Network:\n\n${storeUrl}\n\nWe offer the best data bundles and airtime!`;
              window.open(
                `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
              );
            }}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Share2 size={18} />
            Email Store
          </button>
        </div>
      </div>
    </div>
  );
}
