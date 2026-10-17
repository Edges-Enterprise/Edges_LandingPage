// src/app/[countryCode]/dashboard/settings/PreferencesSettings.tsx
"use client";

import { useState } from "react";
import {
  Globe,
  Moon,
  Sun,
  Languages,
  Clock,
  DollarSign,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface PreferencesSettingsProps {
  countryCode: string;
}

export function PreferencesSettings({ countryCode }: PreferencesSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState({
    language: "en",
    theme: "light",
    timezone: "UTC",
    currency: "USD",
  });

  const handleChange = (key: string, value: string) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Save preferences logic here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Preferences
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Customize your dashboard experience
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-gray-400" />
              Language
            </div>
          </label>
          <select
            value={preferences.language}
            onChange={(e) => handleChange("language", e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gray-400" />
              Theme
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChange("theme", "light")}
              className={cn(
                "p-3 rounded-lg border text-center transition-all",
                preferences.theme === "light"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
              )}
            >
              <Sun className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange("theme", "dark")}
              className={cn(
                "p-3 rounded-lg border text-center transition-all",
                preferences.theme === "dark"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
              )}
            >
              <Moon className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Dark</span>
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              Timezone
            </div>
          </label>
          <select
            value={preferences.timezone}
            onChange={(e) => handleChange("timezone", e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Africa/Lagos">Lagos (WAT)</option>
            <option value="Africa/Nairobi">Nairobi (EAT)</option>
            <option value="Asia/Dubai">Dubai (GST)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
            <option value="Australia/Sydney">Sydney (AEDT)</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-gray-400" />
              Currency
            </div>
          </label>
          <select
            value={preferences.currency}
            onChange={(e) => handleChange("currency", e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          >
            <option value="USD">USD ($)</option>
            <option value="NGN">NGN (₦)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="KES">KES (KSh)</option>
            <option value="ZAR">ZAR (R)</option>
            <option value="GHS">GHS (GH₵)</option>
            <option value="EGP">EGP (E£)</option>
            <option value="MAD">MAD (DH)</option>
          </select>
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
              Preferences saved successfully!
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
            "Save Preferences"
          )}
        </button>
      </form>
    </div>
  );
}
