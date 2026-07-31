// src/app/[countryCode]/dashboard/page.tsx
import { use } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import DashboardClient from "./DashboardClient";
import "@/app/reseller.css";

interface DashboardPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getDashboardData(userId: string) {
  const supabase = await createServerClient();

  try {
    const { data, error } = await supabase.rpc(
      "get_global_reseller_dashboard_context",
      { p_user_id: userId },
    );

    if (error) {
      console.error("Dashboard RPC error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Dashboard data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    // Try to load the specific language
    const translations = await import(`@/messages/${language}/dashboard.json`);
    return translations.default;
  } catch {
    // Fallback to English if the language file doesn't exist
    try {
      const translations = await import("@/messages/en/dashboard.json");
      return translations.default;
    } catch {
      // Ultimate fallback - return a basic object
      return {
        title: "Dashboard",
        error: "Unable to load dashboard",
        retry: "Retry",
        totalCustomers: "Total Customers",
        totalOrders: "Total Orders",
        totalRevenue: "Total Revenue",
        totalProfit: "Total Profit",
        last30Days: "last 30 days",
        profit: "profit",
        margin: "margin",
        quickActions: "Quick Actions",
        fundWallet: "Fund Wallet",
        addCustomer: "Add Customer",
        shareStore: "Share Store",
        publishApp: "Publish App",
        recentActivity: "Recent Activity",
        noActivity: "No recent activity yet",
        justNow: "Just now",
        order: "Order",
        customer: "Customer",
        transaction: "Transaction",
        build: "App Build",
        revenueChart: "Revenue Overview",
        noRevenueData: "No revenue data available",
        topProducts: "Top Selling Products",
        orders: "orders",
        noProducts: "No products sold yet",
        noData: "No revenue data yet",
        store: "Store",
        customers: "Customers",
        wallet: "Wallet",
        settings: "Settings",
        plans: "Plans",
        publishing: "Publishing",
        logout: "Logout",
        overview: "Overview",
      };
    }
  }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  // ✅ Unwrap params with use() in Server Component
  const { countryCode } = await params;

  // Get user from session
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect handled by middleware, but just in case
    return null;
  }

  const config = getCountryConfig(countryCode);
  const language = config.language.code || "en";
  const translations = await getTranslations(language);
  const dashboardData = await getDashboardData(user.id);

  return (
    <CountryProvider config={config}>
      <DashboardClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        dashboardData={dashboardData}
      />
    </CountryProvider>
  );
}
