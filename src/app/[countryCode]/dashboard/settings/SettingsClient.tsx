// src/app/[countryCode]/dashboard/settings/SettingsClient.tsx
"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Bell,
  Sliders,
  Key,
  Smartphone,
  Mail,
  Globe,
} from "lucide-react";
import { ProfileSettings } from "./ProfileSettings";
import { SecuritySettings } from "./SecuritySettings";
import { NotificationSettings } from "./NotificationSettings";
import { PreferencesSettings } from "./PreferencesSettings";
import { cn } from "@/lib/utils/helpers";

interface SettingsClientProps {
  countryCode: string;
}

type SettingsTab = "profile" | "security" | "notifications" | "preferences";

export function SettingsClient({ countryCode }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "profile",
      label: "Profile",
      icon: <User size={18} />,
    },
    {
      id: "security",
      label: "Security",
      icon: <Shield size={18} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={18} />,
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: <Sliders size={18} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
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
      <div className="max-w-3xl">
        {activeTab === "profile" && (
          <ProfileSettings countryCode={countryCode} />
        )}
        {activeTab === "security" && (
          <SecuritySettings countryCode={countryCode} />
        )}
        {activeTab === "notifications" && (
          <NotificationSettings countryCode={countryCode} />
        )}
        {activeTab === "preferences" && (
          <PreferencesSettings countryCode={countryCode} />
        )}
      </div>
    </div>
  );
}
