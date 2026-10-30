// src/types/storefront/index.ts

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  category: string;
  network?: string;
  price: number;
  base_price: number;
  profit: number;
  markup_percent: number;
  validity?: string;
  data_amount?: string;
  is_active: boolean;
  is_featured: boolean;
  /**
   * Provider-facing plan id (global_base_plans.provider_plan_id). This is
   * what the purchase edge functions expect as `planId`; optional so
   * existing rows that predate the storefront catalog (and the cart flow
   * being deleted) still type-check.
   */
  plan_id?: string;
}

export interface StoreData {
  application: {
    id: string;
    store_name: string;
    store_slug: string;
    brand_color: string;
    logo_url?: string;
    country_code: string;
    phone?: string;
  };
  products: StoreProduct[];
  categories: string[];
  networks: string[];
  settings: {
    welcome_message?: string;
    store_subtext?: string;
    contact_email?: string;
    contact_phone?: string;
    store_status: "active" | "inactive" | "maintenance";
    theme: "light" | "dark";
  };
}

