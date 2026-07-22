// src/app/[countryCode]/dashboard/store/StoreClient.tsx
"use client";

import { useState } from "react";
import {
  Store,
  Palette,
  Image,
  Globe,
  Settings,
  Eye,
  Share2,
} from "lucide-react";
import { StoreSettings } from "./StoreSettings";
import { BrandingUploader } from "./BrandingUploader";
import { ThemeSelector } from "./ThemeSelector";
import { StorePreview } from "./StorePreview";
import { StoreUrlGenerator } from "./StoreUrlGenerator";
import { cn } from "@/lib/utils/helpers";

interface StoreClientProps {
  countryCode: string;
}

type StoreTab = "settings" | "branding" | "theme" | "preview" | "url";

export function StoreClient({ countryCode }: StoreClientProps) {
  const [activeTab, setActiveTab] = useState<StoreTab>("settings");

  const tabs: Array<{
    id: StoreTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "settings",
      label: "Settings",
      icon: <Store size={18} />,
    },
    {
      id: "branding",
      label: "Branding",
      icon: <Image size={18} />,
    },
    {
      id: "theme",
      label: "Theme",
      icon: <Palette size={18} />,
    },
    {
      id: "preview",
      label: "Preview",
      icon: <Eye size={18} />,
    },
    {
      id: "url",
      label: "Store URL",
      icon: <Globe size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Store Configuration
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Customize your branded storefront
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              window.open(`/${countryCode}/${storeSlug}`, "_blank")
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
          >
            <Eye size={18} />
            View Store
          </button>
          <button
            onClick={() => {
              /* Copy store link */
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        {activeTab === "settings" && (
          <StoreSettings countryCode={countryCode} />
        )}
        {activeTab === "branding" && (
          <BrandingUploader countryCode={countryCode} />
        )}
        {activeTab === "theme" && <ThemeSelector countryCode={countryCode} />}
        {activeTab === "preview" && <StorePreview countryCode={countryCode} />}
        {activeTab === "url" && <StoreUrlGenerator countryCode={countryCode} />}
      </div>
    </div>
  );
}

// Helper - get store slug from context or props
const storeSlug = "your-store"; // This would come from the reseller's data
