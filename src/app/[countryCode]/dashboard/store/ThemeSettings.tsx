// src/app/[countryCode]/dashboard/store/ThemeSettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Moon, Sun, Check } from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { StoreSettings } from "@/types/reseller/store";

interface ThemeSettingsProps {
  application: {
    id: string;
  };
  settings: StoreSettings;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
  onUpdate: (data: any) => void;
}

export default function ThemeSettings({
  application,
  settings,
  config,
  translations,
  onSave,
  onUpdate,
}: ThemeSettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">(
    settings.theme || "light"
  );
  const [error, setError] = useState<string | null>(null);

  const themes = [
    {
      id: "light" as const,
      label: t?.light || "Light",
      icon: Sun,
      description: t?.lightThemeDesc || "Clean and bright interface",
      preview: {
        bg: "#FAF8F5",
        text: "#1A1410",
        card: "#FFFFFF",
        border: "#E5E0D8",
        accent: "var(--brand-color)",
      },
    },
    {
      id: "dark" as const,
      label: t?.dark || "Dark",
      icon: Moon,
      description: t?.darkThemeDesc || "Dark and modern interface",
      preview: {
        bg: "#120C08",
        text: "#F5F0EB",
        card: "#1C1510",
        border: "#2D241C",
        accent: "var(--brand-color)",
      },
    },
  ];

  const handleThemeChange = async (theme: "light" | "dark") => {
    setSelectedTheme(theme);
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("global_reseller_settings")
        .upsert({
          reseller_id: application.id,
          store_settings: {
            ...settings,
            theme,
          },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      onUpdate({
        ...settings,
        theme,
      });

      // Apply theme to document
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);

      onSave();
    } catch (error) {
      setError(t?.themeError || "Failed to update theme");
      console.error("Theme update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {t?.theme || "Theme"}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {t?.themeDescription || "Choose the look and feel of your store"}
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            color: "#EF4444",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = selectedTheme === theme.id;

          return (
            <div
              key={theme.id}
              style={{
                background: "var(--card)",
                border: isActive 
                  ? `2px solid var(--brand-color)` 
                  : "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.3s",
                opacity: isLoading && selectedTheme !== theme.id ? 0.5 : 1,
              }}
              onClick={() => handleThemeChange(theme.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(var(--brand-color-rgb), 0.3)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {/* Preview */}
              <div
                style={{
                  padding: "1.5rem",
                  background: theme.preview.bg,
                  minHeight: 120,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: theme.preview.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>
                      E
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 12,
                        borderRadius: 3,
                        background: theme.preview.card,
                        border: `1px solid ${theme.preview.border}`,
                      }}
                    />
                    <div
                      style={{
                        width: 20,
                        height: 12,
                        borderRadius: 3,
                        background: theme.preview.card,
                        border: `1px solid ${theme.preview.border}`,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    width: "60%",
                    height: 8,
                    borderRadius: 4,
                    background: theme.preview.accent,
                  }}
                />
                <div
                  style={{
                    width: "80%",
                    height: 6,
                    borderRadius: 3,
                    background: theme.preview.border,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: theme.preview.card,
                      border: `1px solid ${theme.preview.border}`,
                    }}
                  />
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: theme.preview.card,
                      border: `1px solid ${theme.preview.border}`,
                    }}
                  />
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: theme.preview.card,
                      border: `1px solid ${theme.preview.border}`,
                    }}
                  />
                </div>
              </div>

              {/* Info */}
              <div
                style={{
                  padding: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg2)",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--brand-color)" }} />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {theme.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>
                    {theme.description}
                  </p>
                </div>
                {isActive && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--brand-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} style={{ color: "#FDF8F3" }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <p style={{ textAlign: "center", color: "var(--muted)", marginTop: "1rem" }}>
          {t?.updating || "Updating theme..."}
        </p>
      )}
    </div>
  );
}