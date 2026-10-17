// src/app/[countryCode]/dashboard/plans/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import PlansClient from "./PlansClient";
import "@/app/reseller.css";
import { getPlans } from "@/actions/reseller/plans/getPlans";

interface PlansPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getInitialData(countryCode: string) {
  const result = await getPlans();

  if (!result.success) {
    return {
      plans: [],
      networks: [] as string[],
    };
  }

  const plans = result.data || [];
  // Filter out undefined values and ensure we have strings
  const networks = plans
    .map((p) => p.network)
    .filter((network): network is string => !!network);

  // Get unique networks
  const uniqueNetworks = [...new Set(networks)].sort();

  return {
    plans,
    networks: uniqueNetworks,
  };
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/plans.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/plans.json");
      return translations.default;
    } catch {
      return {
        title: "Plan Management",
        subtitle: "Toggle plans on/off and set your markup for each network",
        noPlans: "No plans available",
        wholesalePrice: "Wholesale",
        yourPrice: "Your Price",
        profit: "Profit",
        markup: "Markup",
        active: "Active",
        inactive: "Inactive",
        edit: "Edit",
        save: "Save",
        saveSuccess: "Plan updated successfully",
        apply: "Apply",
        applyTo: "Apply To",
        onlyNetwork: "Only {network}",
        allNetworks: "All Networks",
        markupType: "Markup Type",
        percentage: "Percentage",
        fixed: "Fixed Amount",
        markupValue: "Value",
        bulkPricing: "Bulk Update Markup",
        cancel: "Cancel",
        loading: "Loading...",
        error: "Unable to load plans",
      };
    }
  }
}

export default async function PlansPage({ params }: PlansPageProps) {
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
  const initialData = await getInitialData(countryCode);

  return (
    <CountryProvider config={config}>
      <PlansClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        initialData={initialData}
      />
    </CountryProvider>
  );
}
