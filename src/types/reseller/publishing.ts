// src/types/reseller/publishing.ts

export interface Build {
  id: string;
  application_id: string;
  config_id?: string;
  build_status: "queued" | "building" | "completed" | "failed";
  queued_at: string;
  building_at?: string;
  completed_at?: string;
  apk_url?: string;
  aab_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  id: string;
  application_id: string;
  config: {
    id: string;
    slug: string;
    appName: string;
    storeName: string;
    firstName: string;
    email: string;
    countryCode: string;
    androidPackageName: string;
    theme: {
      primary: string;
      accent: string;
      secondary: string;
      text: string;
      background: string;
      statusBar: string;
    };
    assets: {
      icon: string;
      logo: string;
      splash: string;
      adaptiveIcon: string;
      notificationIcon: string;
    };
    config: {
      version: string;
      buildNumber: number;
      storeUrl: string;
      apiBaseUrl: string;
    };
  };
  build_status: string;
  created_at: string;
  updated_at: string;
}

export interface PublishingPlan {
  id: "local" | "regional" | "worldwide";
  name: string;
  price: number;
  description: string;
  features: string[];
  icon: string;
}

export interface PublishingData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
    country_code: string;
    android_app: boolean;
    logo_url?: string;
    notification_icon_url?: string;
  };
  builds: Build[];
  appConfig?: AppConfig;
  currentBuild?: Build | null; // Allow null
  publishingPlan?: string | null; // Allow null
}
