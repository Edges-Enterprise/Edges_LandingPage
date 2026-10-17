// src/types/reseller/store.ts

export interface StoreSettings {
  store_name: string;
  store_slug: string;
  brand_color: string;
  logo_url?: string;
  notification_icon_url?: string;
  theme: "light" | "dark";
  store_status: "active" | "inactive" | "maintenance";
  welcome_message?: string;
  contact_email?: string;
  contact_phone?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  business_hours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  created_at: string;
  updated_at: string;
}

export interface StoreData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
      country_code: string;
      email: string;
      phone:string;
    logo_url?: string;
    notification_icon_url?: string;
  };
  settings: StoreSettings;
}
