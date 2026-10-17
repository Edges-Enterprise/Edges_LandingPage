// src/app/[countryCode]/dashboard/store/ThemeSelector.tsx
"use client";

import { useEffect, useState } from "react";
import { Palette, Check, Loader2, CheckCircle } from "lucide-react";
import { updateStoreTheme } from "@/actions/reseller/store/updateStoreTheme";
// import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
// import { createServerClient } from "@/lib/supabase/server";

interface ThemeSelectorProps {
  countryCode: string;
}

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  button_style: "rounded" | "square" | "pill";
  layout: "grid" | "list";
}

const PRESET_COLORS = [
  "#C98A54",
  "#DC2626",
  "#16A34A",
  "#2563EB",
  "#7C3AED",
  "#E11D48",
  "#059669",
  "#0284C7",
  "#9333EA",
  "#EA580C",
];

const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Poppins",
  "Open Sans",
  "Lato",
  "Montserrat",
];

const BUTTON_STYLES = [
  { value: "rounded", label: "Rounded" },
  { value: "square", label: "Square" },
  { value: "pill", label: "Pill" },
];

const LAYOUTS = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

export function ThemeSelector({ countryCode }: ThemeSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeSettings>({
    primary_color: "#C98A54",
    secondary_color: "#ab6c36",
    accent_color: "#C98A54",
    background_color: "#FFFFFF",
    text_color: "#111827",
    font_family: "Inter",
    button_style: "rounded",
    layout: "grid",
  });

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    setIsLoading(true);
    setError(null);

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
        .select("theme_settings")
        .eq("auth_user_id", user.id)
        .single();

      if (appError && appError.code !== "PGRST116") {
        setError(appError.message);
        setIsLoading(false);
        return;
      }

      if (application?.theme_settings) {
        setTheme(application.theme_settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (key: keyof ThemeSettings, value: string) => {
    setTheme({ ...theme, [key]: value });
  };

  const handleSelectChange = (key: keyof ThemeSettings, value: string) => {
    setTheme({ ...theme, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateStoreTheme({
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        accent_color: theme.accent_color,
        background_color: theme.background_color,
        text_color: theme.text_color,
        font_family: theme.font_family,
        button_style: theme.button_style,
        layout: theme.layout,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update theme");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Theme Customization
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Customize the look and feel of your store
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Primary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Primary Color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange("primary_color", color)}
                className={cn(
                  "h-10 w-10 rounded-lg border-2 transition-all",
                  theme.primary_color === color
                    ? "border-primary scale-110"
                    : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: color }}
              >
                {theme.primary_color === color && (
                  <Check className="h-5 w-5 text-white mx-auto" />
                )}
              </button>
            ))}
            <input
              type="color"
              value={theme.primary_color}
              onChange={(e) =>
                handleColorChange("primary_color", e.target.value)
              }
              className="h-10 w-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Secondary Color
          </label>
          <input
            type="color"
            value={theme.secondary_color}
            onChange={(e) =>
              handleColorChange("secondary_color", e.target.value)
            }
            className="h-10 w-20 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-600"
          />
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Font Family
          </label>
          <select
            value={theme.font_family}
            onChange={(e) => handleSelectChange("font_family", e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Button Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Button Style
          </label>
          <div className="flex gap-2">
            {BUTTON_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => handleSelectChange("button_style", style.value)}
                className={cn(
                  "px-4 py-2 border rounded-lg transition-all text-sm font-medium",
                  theme.button_style === style.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                )}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Layout Style
          </label>
          <div className="flex gap-2">
            {LAYOUTS.map((layout) => (
              <button
                key={layout.value}
                type="button"
                onClick={() => handleSelectChange("layout", layout.value)}
                className={cn(
                  "px-4 py-2 border rounded-lg transition-all text-sm font-medium",
                  theme.layout === layout.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                )}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Preview */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Preview
          </p>
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: theme.background_color,
              color: theme.text_color,
              fontFamily: theme.font_family,
            }}
          >
            <h4
              className="text-lg font-bold"
              style={{ color: theme.primary_color }}
            >
              Sample Heading
            </h4>
            <p className="text-sm">Sample text with your theme colors</p>
            <button
              className={cn(
                "mt-2 px-4 py-2 text-white text-sm",
                theme.button_style === "rounded" && "rounded-lg",
                theme.button_style === "square" && "rounded-none",
                theme.button_style === "pill" && "rounded-full",
              )}
              style={{ backgroundColor: theme.primary_color }}
            >
              Sample Button
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Theme updated successfully!
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "px-6 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
            "hover:bg-primary/80",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-2",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Theme"
          )}
        </button>
      </form>
    </div>
  );
}
