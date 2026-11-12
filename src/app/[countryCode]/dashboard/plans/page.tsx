// src/app/[countryCode]/dashboard/plans/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import PlansClient from "./PlansClient";
import "@/app/reseller.css";
import { getPlans } from "@/actions/reseller/plans/getPlans";
import { getGlobalPlans } from "@/actions/reseller/plans/getGlobalPlans";
import { getGlobalPlanFacetsCached } from "@/actions/reseller/plans/globalPlanFacets";
import type { PlanWithConfig } from "@/types/reseller/plans";
import type { GlobalPlanFacets } from "@/actions/reseller/plans/globalPlansTypes";

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

/**
 * The world view's first page and the country/network pickers, read on the
 * server so the globe opens with content already in the HTML. The facets come
 * from a cached catalog scan; the page is one page of rows plus the true total.
 * A failure here must not blank the page — the client falls back to fetching.
 */
async function getInitialGlobal(): Promise<{
  plans: PlanWithConfig[];
  total: number;
  facets: GlobalPlanFacets | null;
}> {
  try {
    const [plansRes, facets] = await Promise.all([
      getGlobalPlans({}),
      getGlobalPlanFacetsCached(),
    ]);
    return {
      plans: plansRes.success && plansRes.data ? plansRes.data.plans : [],
      total: plansRes.success && plansRes.data ? plansRes.data.total : 0,
      facets,
    };
  } catch {
    return { plans: [], total: 0, facets: null };
  }
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
        bulkPricing: "Bulk Update",
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
  const [initialData, initialGlobal] = await Promise.all([
    getInitialData(countryCode),
    getInitialGlobal(),
  ]);

  return (
    <CountryProvider config={config}>
      <PlansClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        initialData={initialData}
        initialGlobalPlans={initialGlobal.plans}
        initialGlobalTotal={initialGlobal.total}
        initialGlobalFacets={initialGlobal.facets}
      />
    </CountryProvider>
  );
}
