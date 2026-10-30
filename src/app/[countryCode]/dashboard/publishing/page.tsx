// src/app/[countryCode]/dashboard/publishing/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { getUsdToLocalRate } from "@/lib/currency/exchangeRate";
import { CountryProvider } from "@/providers/CountryProvider";
import PublishingClient from "./PublishingClient";
import "@/app/reseller.css";

interface PublishingPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getPublishingData(userId: string, localCurrency: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, brand_color, store_name, store_slug, country_code, android_app, logo_url, notification_icon_url",
      )
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get builds
    const { data: builds, error: buildsError } = await supabase
      .from("global_app_builds")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false });

    if (buildsError) throw buildsError;

    // Get app config
    const { data: appConfig, error: configError } = await supabase
      .from("global_reseller_app_configs")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get current build (most recent)
    const currentBuild = builds && builds.length > 0 ? builds[0] : null;

    // Publishing plan and the wallet balance the purchase debits. This used
    // to read global_reseller_settings with a `reseller_id` column that does
    // not exist, so the plan was always null and the wallet never shown.
    const { data: publishingRow } = await supabase
      .from("global_reseller_publishing")
      .select("publishing_plan")
      .eq("application_id", application.id)
      .maybeSingle();

    const { data: wallet } = await supabase
      .from("global_wallets")
      .select("balance, currency")
      .eq("reseller_id", application.id)
      .maybeSingle();

    // The wallet is USD; the publishing cards show the local amount beside
    // the USD price so the reseller sees what will leave the wallet.
    const usdToLocalRate = await getUsdToLocalRate(localCurrency);

    return {
      application,
      builds: builds || [],
      appConfig: appConfig || null,
      currentBuild: currentBuild || null,
      publishingPlan: publishingRow?.publishing_plan || null,
      walletBalance: Number(wallet?.balance || 0),
      walletCurrency: wallet?.currency || "USD",
      usdToLocalRate,
    };
  } catch (error) {
    console.error("Publishing data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/publishing.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/publishing.json");
      return translations.default;
    } catch {
      return {
        title: "App Publishing",
        subtitle: "Manage your mobile app and Play Store presence",
        buildStatus: "Build Status",
        publishingPlans: "Publishing Plans",
        appAssets: "App Assets",
        buildHistory: "Build History",
        noBuilds: "No builds yet",
        startBuilding: "Your app will be built automatically",
        queued: "Queued",
        building: "Building",
        completed: "Completed",
        failed: "Failed",
        version: "Version",
        buildNumber: "Build #",
        queuedAt: "Queued",
        buildingAt: "Building",
        completedAt: "Completed",
        downloadAPK: "Download APK",
        downloadAAB: "Download AAB",
        viewLogs: "View Logs",
        triggerBuild: "Trigger Build",
        publishingPlan: "Publishing Plan",
        freeAPK: "Free APK",
        local: "Local",
        regional: "Regional",
        worldwide: "Worldwide",
        localPrice: "$22",
        regionalPrice: "$28",
        worldwidePrice: "$35",
        localDesc: "Publish your app in your local country",
        regionalDesc: "Publish your app across your region",
        worldwideDesc: "Publish your app globally",
        publishNow: "Publish Now",
        upgradePlan: "Upgrade Plan",
        currentPlan: "Current Plan",
        noPlan: "No publishing plan selected",
        appIcon: "App Icon",
        splashScreen: "Splash Screen",
        notificationIcon: "Notification Icon",
        uploadNew: "Upload New",
        appName: "App Name",
        packageName: "Package Name",
        storeUrl: "Store URL",
        buildInProgress: "Build in progress...",
        buildQueued: "Build queued...",
        buildFailed: "Build failed",
        buildCompleted: "Build completed!",
        error: "Unable to load publishing data",
        retry: "Retry",
        loading: "Loading...",
        triggered: "Build triggered successfully",
        triggerError: "Failed to trigger build",
        publishSuccess: "App published successfully",
        publishError: "Failed to publish app",
        comingSoon: "Coming Soon",
        selectPlan: "Select a plan to publish your app",
        freeFeatures: "Branded APK, WhatsApp sharing, QR code",
        localFeatures: "Play Store listing, Local visibility",
        regionalFeatures: "Play Store listing, Regional visibility",
        worldwideFeatures: "Play Store listing, Global visibility",
      };
    }
  }
}

export default async function PublishingPage({ params }: PublishingPageProps) {
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
  const publishingData = await getPublishingData(
    user.id,
    config.currency,
  );

  if (!publishingData) {
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
          {translations?.error ||
            "Unable to load publishing data. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <PublishingClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        publishingData={publishingData}
      />
    </CountryProvider>
  );
}
