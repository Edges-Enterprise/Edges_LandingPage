// src/app/[countryCode]/[storeName]/profile/page.tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import StoreProfileClient from "./StoreProfileClient";

interface StoreProfilePageProps {
  params: Promise<{ countryCode: string; storeName: string }>;
}

async function getStoreApplication(storeSlug: string) {
  // Anonymous-safe read through the service-role client, matching the store
  // page: RLS hides the application row from signed-in customers otherwise.
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("global_reseller_applications")
    .select("id, store_name, store_slug, brand_color, logo_url, country_code")
    .eq("store_slug", storeSlug)
    .eq("application_status", "active")
    .single();

  if (error || !data) return null;
  return data;
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
      return {};
    }
  }
}

export default async function StoreProfilePage({
  params,
}: StoreProfilePageProps) {
  const { countryCode, storeName } = await params;

  const config = getCountryConfig(countryCode);
  const application = await getStoreApplication(storeName);

  if (!application) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Store not found
        </p>
        <p style={{ color: "var(--dim)" }}>
          The store you&apos;re looking for doesn&apos;t exist or is not active.
        </p>
      </div>
    );
  }

  const language = config.language.code || "en";
  const translations = await getTranslations(language);

  return (
    <StoreProfileClient
      storeData={{ application }}
      config={config}
      translations={translations}
    />
  );
}
