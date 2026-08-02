// src/app/[countryCode]/dashboard/store/StoreClient.tsx
"use client";

import { useState } from "react";
import { Store, Palette, Eye, Save } from "lucide-react";
import StoreSettings from "./StoreSettings";
import BrandingSettings from "./BrandingSettings";
import ThemeSettings from "./ThemeSettings";
import StorePreview from "./StorePreview";
import { CountryConfig } from "@/config/countries";
import { StoreData } from "@/types/reseller/store";

interface StoreClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  storeData: StoreData;
}

type TabType = "settings" | "branding" | "theme" | "preview";

export default function StoreClient({
  countryCode,
  config,
  translations,
  storeData,
}: StoreClientProps) {
  const t = translations;
  const [activeTab, setActiveTab] = useState<TabType>("settings");
  const [showSaved, setShowSaved] = useState(false);
  const [data, setData] = useState(storeData);

  const tabs = [
    { id: "settings" as TabType, label: t?.storeSettings || "Settings", icon: Store },
    { id: "branding" as TabType, label: t?.branding || "Branding", icon: Palette },
    { id: "theme" as TabType, label: t?.theme || "Theme", icon: Eye },
    { id: "preview" as TabType, label: t?.preview || "Preview", icon: Eye },
  ];

  const handleSaveSuccess = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handleDataUpdate = (updatedData: any) => {
    setData(updatedData);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "settings":
        return (
          <StoreSettings
            application={data.application}
            settings={data.settings}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
            onUpdate={handleDataUpdate}
          />
        );
      case "branding":
        return (
          <BrandingSettings
            application={data.application}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
            onUpdate={handleDataUpdate}
          />
        );
      case "theme":
        return (
          <ThemeSettings
            application={data.application}
            settings={data.settings}
            config={config}
            translations={t}
            onSave={handleSaveSuccess}
            onUpdate={handleDataUpdate}
          />
        );
      case "preview":
        return (
          <StorePreview
            application={data.application}
            settings={data.settings}
            config={config}
            translations={t}
          />
        );
      default:
        return null;
    }
  };

  const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://telcos.opik.net"}/${countryCode}/${data.application.store_slug}`;

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
            {t?.title || "Store"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.subtitle || "Configure your store settings and branding"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.6rem 1.2rem",
              background: "transparent",
              border: "1px solid var(--border2)",
              borderRadius: 8,
              color: "var(--text)",
              textDecoration: "none",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
              e.currentTarget.style.background = "rgba(var(--brand-color-rgb), 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {t?.viewStore || "View Store"} →
          </a>
        </div>
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
            marginBottom: "1rem",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <Save size={18} />
          {t?.saved || "Changes saved successfully"}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
                borderBottom: isActive ? `2px solid var(--brand-color)` : "2px solid transparent",
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