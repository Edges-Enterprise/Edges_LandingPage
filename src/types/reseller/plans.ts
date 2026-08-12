// src/types/reseller/plans.ts

export interface BasePlan {
  id: string;
  provider: string;
  provider_plan_id: string;
  country_code: string;
  network?: string;
  name: string;
  description?: string;
  category: string;
  data_amount?: string;
  validity?: string;
  duration_days?: number;
  base_price: number;
  currency: string;
  send_value?: number;
  send_currency?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResellerPlanConfig {
  id: string;
  reseller_id: string;
  plan_id: string;
  enabled: boolean;
  markup_type: "percentage" | "fixed";
  markup_value: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
}

export interface PlanWithConfig extends BasePlan {
  config: ResellerPlanConfig | null;
  profit?: number;
  profit_percent?: number;
}
