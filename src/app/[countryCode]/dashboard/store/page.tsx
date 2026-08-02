// src/app/[countryCode]/dashboard/store/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import StoreClient from "./StoreClient";
import "@/app/reseller.css";

interface StorePageProps {
  params: Promise<{ countryCode: string }>;
}

async function getStoreData(userId: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application - include email and phone
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, brand_color, store_name, store_slug, country_code, logo_url, notification_icon_url, email, phone, created_at, updated_at",
      )
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get store settings from global_reseller_settings
    const { data: settings, error: settingsError } = await supabase
      .from("global_reseller_settings")
      .select("*")
      .eq("reseller_id", application.id)
      .single();

    // Default settings - fix the typo: store_status instead of store_ status
    const defaultSettings = {
      store_name: application.store_name || "",
      store_slug: application.store_slug || "",
      brand_color: application.brand_color || "#C98A54",
      logo_url: application.logo_url,
      notification_icon_url: application.notification_icon_url,
      theme: "light" as const,
      store_status: "active" as const,
      welcome_message: `Welcome to ${application.store_name || "our store"}!`,
      contact_email: application.email || "",
      contact_phone: application.phone || "",
      social_links: {},
      business_hours: {},
      created_at: application.created_at,
      updated_at: application.updated_at,
    };

    const mergedSettings = {
      ...defaultSettings,
      ...(settings?.store_settings || {}),
    };

    return {
      application: {
        id: application.id,
        brand_color: application.brand_color,
        store_name: application.store_name,
        store_slug: application.store_slug,
        country_code: application.country_code,
        logo_url: application.logo_url,
        notification_icon_url: application.notification_icon_url,
        email: application.email || "",
        phone: application.phone || "",
        created_at: application.created_at,
        updated_at: application.updated_at,
      },
      settings: mergedSettings,
    };
  } catch (error) {
    console.error("Store data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/store.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/store.json");
      return translations.default;
    } catch {
      return {
        title: "Store",
        subtitle: "Configure your store settings and branding",
        storeSettings: "Store Settings",
        branding: "Branding",
        theme: "Theme",
        preview: "Store Preview",
        storeName: "Store Name",
        storeSlug: "Store URL",
        brandColor: "Brand Color",
        logo: "Store Logo",
        notificationIcon: "Notification Icon",
        uploadLogo: "Upload Logo",
        uploadNotificationIcon: "Upload Notification Icon",
        changeLogo: "Change Logo",
        changeNotificationIcon: "Change Notification Icon",
        removeLogo: "Remove Logo",
        removeNotificationIcon: "Remove Notification Icon",
        themeMode: "Theme Mode",
        light: "Light",
        dark: "Dark",
        storeStatus: "Store Status",
        active: "Active",
        inactive: "Inactive",
        maintenance: "Maintenance",
        welcomeMessage: "Welcome Message",
        contactEmail: "Contact Email",
        contactPhone: "Contact Phone",
        socialLinks: "Social Links",
        facebook: "Facebook",
        instagram: "Instagram",
        twitter: "Twitter",
        tiktok: "TikTok",
        whatsapp: "WhatsApp",
        businessHours: "Business Hours",
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",
        open: "Open",
        close: "Close",
        closed: "Closed",
        saveChanges: "Save Changes",
        saving: "Saving...",
        saved: "Changes saved successfully",
        error: "Failed to save changes",
        loading: "Loading store settings...",
        errorLoading: "Unable to load store settings",
        retry: "Retry",
        storeUrl: "Store URL",
        viewStore: "View Store",
        previewDescription: "This is how your store will look to customers",
        noLogo: "No logo uploaded",
        noNotificationIcon: "No notification icon uploaded",
        dragAndDrop: "Drag and drop or click to upload",
        supportedFormats: "PNG, JPG, SVG (max 5MB)",
        statusChanged: "Store status updated",
        themeChanged: "Theme updated",
        configureStore: "Configure your store's basic settings",
        brandingDescription: "Customize your store's visual identity",
        themeDescription: "Choose the look and feel of your store",
        logoUploaded: "Logo uploaded",
        notificationIconUploaded: "Notification icon uploaded",
        products: "Products",
        customers: "Customers",
        rating: "Rating",
        uploadError: "Failed to upload file",
        removeError: "Failed to remove asset",
        colorError: "Failed to update brand color",
        invalidFileType: "Please upload an image file",
        fileTooLarge: "File size must be less than 5MB",
        themeError: "Failed to update theme",
        updating: "Updating theme...",
        welcomeMessagePlaceholder: "Welcome to our store!",
        lightThemeDesc: "Clean and bright interface",
        darkThemeDesc: "Dark and modern interface",
        socialLinksDesc: "Add your social media links",
        businessHoursDesc: "Set your store's operating hours",
      };
    }
  }
}

export default async function StorePage({ params }: StorePageProps) {
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
  const storeData = await getStoreData(user.id);

  if (!storeData) {
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
            "Unable to load store settings. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <StoreClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        storeData={storeData}
      />
    </CountryProvider>
  );
}
