// src/app/[countryCode]/[storeName]/page.tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { getStoreCatalog } from "@/lib/storefront/getStoreCatalog";
import { getStoreReadiness } from "@/lib/storefront/getStoreReadiness";
import StoreContent from "./StoreContent";

interface StorePageProps {
  params: Promise<{ countryCode: string; storeName: string }>;
}

async function getStoreData(storeSlug: string) {
  // Anonymous storefront read: use the admin (service-role) client so the
  // RLS-protected store/catalog tables resolve for signed-in and
  // signed-out visitors alike. `createServerClient()` sends a customer's
  // JWT when a session cookie is present, which filtered this data to
  // nothing (empty storefront when signed in).
  const supabase = createAdminClient();

  try {
    // Get store owner (reseller)
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, store_name, store_slug, brand_color, logo_url, country_code, phone, email",
      )
      .eq("store_slug", storeSlug)
      .eq("application_status", "active")
      .single();

    if (appError || !application) {
      return null;
    }

    // Latest built APK for the install banner (global_app_builds is the
    // global equivalent of the legacy reseller_app_configs.apk_url).
    const { data: appBuild } = await supabase
      .from("global_app_builds")
      .select("apk_url")
      .eq("application_id", application.id)
      .not("apk_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const apkUrl = appBuild?.apk_url || null;

    // Get the plans the reseller actually enabled for this store. Source
    // is the live catalog (global_base_plans x
    // global_reseller_plan_configs), not global_plans (which has no
    // network column and is not what the purchase flow reads). Strictly
    // opt-in: nothing enabled -> an empty catalog, which StoreProducts
    // renders as "no active plans on this store".
    const { plans: products, categories, networks } = await getStoreCatalog(
      application.id,
      application.country_code,
    );

    // Store sell-readiness (legacy /api/store-status equivalent, global
    // tables) — gates every "Buy" until the owner has WhatsApp, an
    // active virtual account, and a funded wallet.
    const storeStatus = await getStoreReadiness(
      application.id,
      application.phone,
    );

    // The welcome message and store status the owner set in the dashboard's
    // Store settings tab. Previously hardcoded, so edits never showed here.
    const { data: storeSettings } = await supabase
      .from("global_reseller_store_settings")
      .select("welcome_message, store_status")
      .eq("application_id", application.id)
      .maybeSingle();

    return {
      application,
      products,
      categories,
      networks,
      apkUrl,
      storeStatus,
      settings: {
        welcome_message:
          storeSettings?.welcome_message ||
          `Welcome to ${application.store_name || "our store"}!`,
        contact_email: application.email,
        contact_phone: application.phone,
        store_status: storeSettings?.store_status || "active",
        theme: "light",
      },
    };
  } catch (error) {
    console.error("Store data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/storefront.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/storefront.json");
      return translations.default;
    } catch {
      return {
        title: "Store",
        subtitle: "Browse our products",
        products: "Products",
        categories: "Categories",
        networks: "Networks",
        allCategories: "All Categories",
        allNetworks: "All Networks",
        productNotFound: "Product not found",
        storeNotFound: "Store not found",
        storeOffline: "Store is currently offline",
        storeMaintenance: "Store is under maintenance",
        loading: "Loading...",
        error: "Something went wrong",
        retry: "Retry",
        noProducts: "No products available",
        comingSoon: "More products coming soon!",
        price: "Price",
        network: "Network",
        category: "Category",
        data: "Data",
        airtime: "Airtime",
        electricity: "Electricity",
        cable: "Cable TV",
        contact: "Contact",
      };
    }
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { countryCode, storeName } = await params;

  const config = getCountryConfig(countryCode);
  const storeData = await getStoreData(storeName);

  if (!storeData) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Store not found
        </p>
        <p style={{ color: "var(--dim)" }}>
          The store you're looking for doesn't exist or is not active.
        </p>
      </div>
    );
  }

  // Check store status
  if (storeData.settings.store_status === "inactive") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Store is offline
        </p>
        <p style={{ color: "var(--dim)" }}>
          This store is currently not accepting orders.
        </p>
      </div>
    );
  }

  const language = config.language.code || "en";
  const translations = await getTranslations(language);

  // Providers (ThemeProvider/CountryProvider) live in StoreLayoutClient,
  // which wraps this page via layout.tsx.
  return (
    <StoreContent
      storeData={storeData}
      translations={translations}
      config={config}
    />
  );
}
