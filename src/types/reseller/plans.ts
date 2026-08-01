// src/types/reseller/plans.ts

export interface Plan {
  id: string;
  reseller_id: string;
  name: string;
  description?: string;
  category: string;
  network?: string;
  base_price: number;
  selling_price: number;
  markup_type: "percentage" | "fixed";
  markup_value: number;
  validity?: string;
  data_amount?: string;
  plan_code?: string;
  provider_plan_id?: string;
  is_active: boolean;
  is_featured: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  label: string;
  icon: string;
  color: string;
}

export interface Network {
  id: string;
  name: string;
  code: string;
  country: string;
}

export interface PlansData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
    country_code: string;
    default_markup?: number;
  };
  plans: Plan[];
  categories: string[];
  networks: string[];
}
