// src/app/[countryCode]/dashboard/plans/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import PlansClient from "./PlansClient";
import "@/app/reseller.css";

interface PlansPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getPlansData(userId: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application - remove default_markup
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get all plans for this reseller
    const { data: plans, error: plansError } = await supabase
      .from("global_plans")
      .select("*")
      .eq("reseller_id", application.id)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (plansError) throw plansError;

    // Get categories from plans
    const categories = plans ? [...new Set(plans.map((p) => p.category))] : [];

    // Get networks from plans
    const networks = plans
      ? [...new Set(plans.map((p) => p.network).filter(Boolean))]
      : [];

    return {
      application,
      plans: plans || [],
      categories,
      networks,
    };
  } catch (error) {
    console.error("Plans data error:", error);
    return null;
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
        title: "Plans & Pricing",
        subtitle: "Manage your products and set your prices",
        allPlans: "All Plans",
        dataPlans: "Data Plans",
        airtimePlans: "Airtime Plans",
        electricityPlans: "Electricity Plans",
        cablePlans: "Cable Plans",
        noPlans: "No plans available",
        addPlans: "Add plans to start selling",
        planName: "Plan Name",
        network: "Network",
        category: "Category",
        basePrice: "Base Price",
        yourPrice: "Your Price",
        profit: "Profit",
        markup: "Markup",
        status: "Status",
        active: "Active",
        inactive: "Inactive",
        edit: "Edit",
        enable: "Enable",
        disable: "Disable",
        bulkPricing: "Bulk Pricing",
        applyMarkup: "Apply Markup",
        markupType: "Markup Type",
        percentage: "Percentage",
        fixed: "Fixed Amount",
        markupValue: "Markup Value",
        applyToAll: "Apply to All",
        applyToCategory: "Apply to Category",
        applyToNetwork: "Apply to Network",
        saving: "Saving...",
        save: "Save Changes",
        cancel: "Cancel",
        loading: "Loading plans...",
        error: "Unable to load plans",
        retry: "Retry",
        noData: "No plans data available",
        profitMargin: "Profit Margin",
        wholesalePrice: "Wholesale Price",
        retailPrice: "Retail Price",
        planDetails: "Plan Details",
        editPlan: "Edit Plan",
        markupDescription:
          "Set your markup to determine your profit on each sale.",
        bulkPricingDescription:
          "Apply pricing changes to multiple plans at once.",
        markupPercentage: "Markup Percentage",
        markupAmount: "Markup Amount",
        data: "Data",
        airtime: "Airtime",
        electricity: "Electricity",
        cable: "Cable TV",
        plansAffected: "Plans Affected",
        selectCategory: "Select Category",
        selectNetwork: "Select Network",
        preview: "Preview",
        noPlansSelected: "No plans selected",
        applyTo: "Apply To",
        totalPlans: "Total Plans",
        categories: "Categories",
        networks: "Networks",
        activePlans: "Active Plans",
        searchPlans: "Search plans...",
        allCategories: "All Categories",
        allNetworks: "All Networks",
        noResults: "No plans match your filters",
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
  const plansData = await getPlansData(user.id);

  if (!plansData) {
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
          {translations?.error || "Unable to load plans. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <PlansClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        plansData={plansData}
      />
    </CountryProvider>
  );
}
