// src/app/[countryCode]/dashboard/settings/NotificationSettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Mail,
  Smartphone,
  Megaphone,
  ShoppingBag,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { NotificationSettings as NotificationSettingsType } from "@/types/reseller/settings";

interface NotificationSettingsProps {
  notifications: NotificationSettingsType;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
}

export default function NotificationSettings({
  notifications,
  config,
  translations,
  onSave,
}: NotificationSettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(notifications);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (type: keyof NotificationSettingsType, key: string) => {
    setSettings({
      ...settings,
      [type]: {
        ...settings[type],
        [key]: !settings[type][key as keyof (typeof settings)[typeof type]],
      },
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get application ID
      const { data: appData } = await supabase
        .from("global_reseller_applications")
        .select("id")
        .single();

      if (!appData) throw new Error("Reseller not found");

      const { error } = await supabase.from("global_reseller_settings").upsert({
        reseller_id: appData.id,
        notifications: settings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      onSave();
    } catch (err) {
      setError(t?.error || "Failed to save notification settings");
      console.error("Notification settings error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const notificationTypes = [
    {
      key: "sales",
      label: t?.salesAlerts || "Sales Alerts",
      icon: ShoppingBag,
      description: t?.salesAlertsDesc || "Get notified when a sale is made",
    },
    {
      key: "orders",
      label: t?.orderUpdates || "Order Updates",
      icon: ShoppingBag,
      description:
        t?.orderUpdatesDesc || "Get notified about order status changes",
    },
    {
      key: "customers",
      label: t?.customerActivity || "Customer Activity",
      icon: Users,
      description:
        t?.customerActivityDesc || "Get notified about new customers",
    },
    {
      key: "marketing",
      label: t?.marketingUpdates || "Marketing Updates",
      icon: Megaphone,
      description:
        t?.marketingUpdatesDesc || "Receive marketing tips and promotions",
    },
    {
      key: "system",
      label: t?.systemAnnouncements || "System Announcements",
      icon: SettingsIcon,
      description: t?.systemAnnouncementsDesc || "Get important system updates",
    },
  ];

  const channels = [
    {
      key: "email_notifications",
      label: t?.emailNotifications || "Email",
      icon: Mail,
    },
    {
      key: "push_notifications",
      label: t?.pushNotifications || "Push",
      icon: Bell,
    },
    {
      key: "sms_notifications",
      label: t?.smsNotifications || "SMS",
      icon: Smartphone,
    },
  ];

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
        {t?.notifications || "Notification Preferences"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.notificationInfo || "Choose how you want to be notified"}
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

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--bg2)",
              }}
            >
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.notificationType || "Notification Type"}
              </th>
              {channels.map((channel) => (
                <th
                  key={channel.key}
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <channel.icon size={16} style={{ color: "var(--dim)" }} />
                    <span>{channel.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notificationTypes.map((type, index) => {
              const Icon = type.icon;

              return (
                <tr
                  key={type.key}
                  style={{
                    borderBottom:
                      index < notificationTypes.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Icon size={16} style={{ color: "var(--brand-color)" }} />
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--text)" }}>
                          {type.label}
                        </div>
                        <div
                          style={{ fontSize: "0.7rem", color: "var(--dim)" }}
                        >
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  {channels.map((channel) => {
                    const isEnabled =
                      settings[channel.key as keyof NotificationSettingsType]?.[
                        type.key as keyof typeof settings.email_notifications
                      ];

                    return (
                      <td
                        key={`${channel.key}-${type.key}`}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign: "center",
                        }}
                      >
                        <button
                          onClick={() =>
                            handleToggle(
                              channel.key as keyof NotificationSettingsType,
                              type.key,
                            )
                          }
                          style={{
                            width: 40,
                            height: 24,
                            borderRadius: 12,
                            background: isEnabled
                              ? "var(--brand-color)"
                              : "var(--bg3)",
                            border: "none",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.2s",
                            display: "inline-block",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 2,
                              left: isEnabled ? 18 : 2,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "white",
                              transition: "all 0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 2rem",
          background: "var(--brand-color)",
          color: "#FDF8F3",
          border: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: "1rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.opacity = "0.85";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        {isLoading
          ? t?.saving || "Saving..."
          : t?.saveChanges || "Save Changes"}
      </button>
    </div>
  );
}
