// src/app/[countryCode]/dashboard/settings/NotificationSettings.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  ShoppingBag,
  Smartphone as PhoneIcon,
  Megaphone,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { updateNotificationSettings } from "@/actions/reseller/settings/updateNotificationSettings";

import { cn } from "@/lib/utils/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

interface NotificationSettingsProps {
  countryCode: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  order_updates: boolean;
  build_updates: boolean;
  marketing_emails: boolean;
}

export function NotificationSettings({
  countryCode,
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    order_updates: true,
    build_updates: true,
    marketing_emails: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
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

      const { data: settingsData, error: settingsError } = await supabase
        .from("global_reseller_settings")
        .select("notification_settings")
        .eq("auth_user_id", user.id)
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Fetch settings error:", settingsError);
      }

      if (settingsData?.notification_settings) {
        setSettings(settingsData.notification_settings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateNotificationSettings(settings);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update notification settings");
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  const notificationOptions = [
    {
      key: "email_notifications" as keyof NotificationSettings,
      label: "Email Notifications",
      description: "Receive notifications via email",
      icon: <Mail size={18} className="text-blue-500" />,
    },
    {
      key: "push_notifications" as keyof NotificationSettings,
      label: "Push Notifications",
      description: "Receive notifications in your browser",
      icon: <Bell size={18} className="text-purple-500" />,
    },
    {
      key: "sms_notifications" as keyof NotificationSettings,
      label: "SMS Notifications",
      description: "Receive notifications via SMS",
      icon: <MessageSquare size={18} className="text-green-500" />,
    },
    {
      key: "order_updates" as keyof NotificationSettings,
      label: "Order Updates",
      description: "Get notified about new orders and status changes",
      icon: <ShoppingBag size={18} className="text-orange-500" />,
    },
    {
      key: "build_updates" as keyof NotificationSettings,
      label: "Build Updates",
      description: "Get notified about app build status changes",
      icon: <PhoneIcon size={18} className="text-indigo-500" />,
    },
    {
      key: "marketing_emails" as keyof NotificationSettings,
      label: "Marketing Emails",
      description: "Receive promotional offers and updates",
      icon: <Megaphone size={18} className="text-pink-500" />,
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Notification Preferences
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Choose how you want to receive notifications
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white dark:bg-gray-600 flex items-center justify-center shadow-sm">
                  {option.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(option.key)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  settings[option.key]
                    ? "bg-primary"
                    : "bg-gray-300 dark:bg-gray-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    settings[option.key] ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          ))}
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
              Notification settings updated successfully!
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
