// src/app/[countryCode]/dashboard/settings/SettingsClient.tsx
"use client";

import { useState } from "react";
import { User, Shield, Bell, Building2, Save, Check } from "lucide-react";
import ProfileSettings from "./ProfileSettings";
import SecuritySettings from "./SecuritySettings";
import NotificationSettings from "./NotificationSettings";
import BusinessSettings from "./BusinessSettings";
import { CountryConfig } from "@/config/countries";
import { SettingsData } from "@/types/reseller/settings";

interface SettingsClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  settingsData: SettingsData;
}

type TabType = "profile" | "security" | "notifications" | "business";

export default function SettingsClient({
  countryCode,
  config,
  translations,
  settingsData,
}: SettingsClientProps) {
  const t = translations;
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [showSaved, setShowSaved] = useState(false);

  const tabs = [
    { id: "profile" as TabType, label: t?.profile || "Profile", icon: User },
    {
      id: "security" as TabType,
      label: t?.security || "Security",
      icon: Shield,
    },
    {
      id: "notifications" as TabType,
      label: t?.notifications || "Notifications",
      icon: Bell,
    },
    {
      id: "business" as TabType,
      label: t?.business || "Business",
      icon: Building2,
    },
  ];

  const handleSaveSuccess = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <ProfileSettings
            profile={settingsData.profile}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
          />
        );
      case "security":
        return (
          <SecuritySettings
            security={settingsData.security}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
          />
        );
      case "notifications":
        return (
          <NotificationSettings
            notifications={settingsData.notifications}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
          />
        );
      case "business":
        return (
          <BusinessSettings
            application={settingsData.application}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.title || "Settings"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.subtitle || "Manage your account settings"}
          </p>
        </div>
        {showSaved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              background: "rgba(110,189,138,0.12)",
              border: "1px solid rgba(110,189,138,0.3)",
              borderRadius: 8,
              color: "#6EBD8A",
              fontSize: "0.9rem",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <Check size={18} />
            {t?.saved || "Changes saved successfully"}
          </div>
        )}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          marginBottom: "1.5rem",
          overflowX: "auto",
          paddingBottom: "1px",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid var(--brand-color)`
                  : "2px solid transparent",
                color: isActive ? "var(--text)" : "var(--muted)",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--muted)";
                }
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}
