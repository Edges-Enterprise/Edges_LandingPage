// src/app/api/reseller/[countryCode]/config/[configId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { countryCode: string; configId: string } },
) {
  try {
    const { countryCode, configId } = params;

    if (!configId) {
      return NextResponse.json(
        { error: "configId is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerClient();

    // ✅ Fetch from global_reseller_app_configs
    const { data: config, error } = await supabase
      .from("global_reseller_app_configs")
      .select(
        "config, application_id, build_status, error_message, apk_url, aab_url",
      )
      .eq("id", configId)
      .single();

    if (error) {
      console.error("Config fetch error:", error);
      return NextResponse.json(
        { error: `Config not found: ${configId}` },
        { status: 404 },
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: `Config not found: ${configId}` },
        { status: 404 },
      );
    }

    // Extract the config object
    const configData = config.config;

    // Build the full response that the GitHub script expects
    const fullConfig = {
      // Top-level fields
      id: configData?.id || `reseller-global-${config.application_id}`,
      resellerId: configData?.resellerId || config.application_id,
      storeName: configData?.storeName || configData?.appName || "reseller",
      appName: configData?.appName || configData?.storeName || "Reseller App",
      slug: configData?.slug || `edges-${configData?.storeName || "app"}`,
      countryCode: configData?.countryCode || countryCode,
    
      // Android package name
      androidPackageName:
        configData?.config?.androidPackageName ||
        configData?.androidPackageName ||
        `com.edges.${(configData?.storeName || "app").replace(/-/g, "")}`,

      // Nested config
      config: {
        androidPackageName:
          configData?.config?.androidPackageName ||
          configData?.androidPackageName ||
          `com.edges.${(configData?.storeName || "app").replace(/-/g, "")}`,
        packageName:
          configData?.config?.packageName ||
          configData?.packageName ||
          `com.edges.${(configData?.storeName || "app").replace(/-/g, "")}`,
        version: configData?.config?.version || "1.0.0",
        buildNumber: configData?.config?.buildNumber || 1,
        apiBaseUrl:
          configData?.config?.apiBaseUrl ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://edges-landing-page.vercel.app",
        storeUrl: configData?.config?.storeUrl || "",
      },

      // Assets
      assets: {
        icon: configData?.assets?.icon || "",
        splash: configData?.assets?.splash || "",
        logo: configData?.assets?.logo || "",
        adaptiveIcon: configData?.assets?.adaptiveIcon || "",
        notificationIcon: configData?.assets?.notificationIcon || "",
      },

      // Theme
      theme: {
        primary: configData?.theme?.primary || "#379114",
        secondary: configData?.theme?.secondary || "#2a7510",
        background: configData?.theme?.background || "#FFFFFF",
        text: configData?.theme?.text || "#111827",
        accent: configData?.theme?.accent || "#379114",
        statusBar: configData?.theme?.statusBar || "dark",
      },

      // Build metadata
      build_status: config.build_status,
      error_message: config.error_message,
      apk_url: config.apk_url,
      aab_url: config.aab_url,
      application_id: config.application_id,
    };

    console.log(`📦 Config fetched for: ${configId}`);
    console.log(`📱 Store: ${fullConfig.storeName}`);
    console.log(`📦 Package: ${fullConfig.androidPackageName}`);

    return NextResponse.json(fullConfig);
  } catch (error) {
    console.error("Build config API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch build config" },
      { status: 500 },
    );
  }
}
