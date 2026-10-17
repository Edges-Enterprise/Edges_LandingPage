// src/app/[countryCode]/dashboard/settings/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import SettingsClient from "./SettingsClient";
import "@/app/reseller.css";

interface SettingsPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getSettingsData(userId: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, brand_color, store_name, store_slug, country_code, first_name, last_name, email, phone, logo_url, notification_icon_url, created_at, updated_at",
      )
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get notification settings from global_reseller_settings if exists
    const { data: settings, error: settingsError } = await supabase
      .from("global_reseller_settings")
      .select("*")
      .eq("reseller_id", application.id)
      .single();

    // Default notification settings
    const defaultNotifications = {
      email_notifications: {
        sales: true,
        orders: true,
        customers: true,
        marketing: false,
        system: true,
      },
      push_notifications: {
        sales: true,
        orders: true,
        customers: true,
        marketing: false,
        system: true,
      },
      sms_notifications: {
        sales: false,
        orders: false,
        customers: false,
        marketing: false,
        system: true,
      },
    };

    // Get sessions (mock for now - would come from auth system)
    const sessions = [
      {
        id: "1",
        device_name: "Chrome on Windows",
        device_type: "desktop",
        ip_address: "192.168.1.1",
        location: "Lagos, Nigeria",
        last_active: new Date().toISOString(),
        is_current: true,
      },
    ];

    return {
      application,
      profile: {
        id: application.id,
        first_name: application.first_name || "",
        last_name: application.last_name || "",
        email: application.email || "",
        phone: application.phone || "",
        country_code: application.country_code || "",
        store_name: application.store_name || "",
        store_slug: application.store_slug || "",
        brand_color: application.brand_color || "#C98A54",
        logo_url: application.logo_url,
        notification_icon_url: application.notification_icon_url,
        created_at: application.created_at,
        updated_at: application.updated_at,
      },
      security: {
        two_factor_enabled: false,
        last_password_change: new Date().toISOString(),
        sessions,
      },
      notifications: settings?.notifications || defaultNotifications,
    };
  } catch (error) {
    console.error("Settings data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/settings.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/settings.json");
      return translations.default;
    } catch {
      return {
        title: "Settings",
        subtitle: "Manage your account settings",
        profile: "Profile",
        security: "Security",
        notifications: "Notifications",
        business: "Business",
        profileInfo: "Profile Information",
        personalInfo: "Personal Information",
        storeInfo: "Store Information",
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        phone: "Phone",
        storeName: "Store Name",
        storeSlug: "Store URL",
        brandColor: "Brand Color",
        saveChanges: "Save Changes",
        saving: "Saving...",
        saved: "Changes saved successfully",
        error: "Failed to save changes",
        changePassword: "Change Password",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        twoFactorAuth: "Two-Factor Authentication",
        enable2FA: "Enable 2FA",
        disable2FA: "Disable 2FA",
        sessions: "Active Sessions",
        deviceName: "Device",
        ipAddress: "IP Address",
        lastActive: "Last Active",
        currentDevice: "Current Device",
        revokeSession: "Revoke",
        emailNotifications: "Email Notifications",
        pushNotifications: "Push Notifications",
        smsNotifications: "SMS Notifications",
        salesAlerts: "Sales Alerts",
        orderUpdates: "Order Updates",
        customerActivity: "Customer Activity",
        marketingUpdates: "Marketing Updates",
        systemAnnouncements: "System Announcements",
        loading: "Loading settings...",
        errorLoading: "Unable to load settings",
        retry: "Retry",
        passwordMismatch: "Passwords do not match",
        passwordMinLength: "Password must be at least 8 characters",
        currentPasswordRequired: "Current password is required",
        newPasswordRequired: "New password is required",
        confirmPasswordRequired: "Please confirm your password",
        passwordUpdated: "Password updated successfully",
        passwordError: "Failed to update password",
      };
    }
  }
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { countryCode } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const config = getCountryConfig(countryCode);
  const language = config.language.code || "en";
  const translations = await getTranslations(language);
  const settingsData = await getSettingsData(user.id);

  if (!settingsData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ color: "var(--muted)" }}>
          {translations?.errorLoading ||
            "Unable to load settings. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <SettingsClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        settingsData={settingsData}
      />
    </CountryProvider>
  );
}
