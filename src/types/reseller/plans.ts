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
  // Currency display fields (all optional)
  display_currency?: string;
  display_amount?: number;
  display_send_currency?: string;
  display_send_amount?: number;
  cost_local?: number;
  selling_price_local?: number;
  markup_local?: number;
  profit_local?: number;
  exchange_rate?: number;
}

// // src/types/reseller/plans.ts

// export interface BasePlan {
//   id: string;
//   provider: string;
//   provider_plan_id: string;
//   country_code: string;
//   network?: string;
//   name: string;
//   description?: string;
//   category: string;
//   data_amount?: string;
//   validity?: string;
//   duration_days?: number;
//   base_price: number;
//   currency: string;
//   send_value?: number;
//   send_currency?: string;
//   metadata?: Record<string, any>;
//   is_active: boolean;
//   created_at: string;
//   updated_at: string;
// }

// export interface ResellerPlanConfig {
//   id: string;
//   reseller_id: string;
//   plan_id: string;
//   enabled: boolean;
//   markup_type: "percentage" | "fixed";
//   markup_value: number;
//   selling_price: number;
//   created_at: string;
//   updated_at: string;
// }

// export interface PlanWithConfig extends BasePlan {
//   config: ResellerPlanConfig | null;
//   profit?: number;
//   profit_percent?: number;
//   // Currency display fields
//   display_currency?: string; // Currency to display to user
//   display_amount?: number; // Amount to display (for Zendit plans)
//   display_send_currency?: string; // What customer receives (Zendit)
//   display_send_amount?: number ; // What customer receives amount
//   cost_local?: number; // Cost in local currency
//   selling_price_local?: number; // Selling price in local currency
//   markup_local?: number; // Markup in local currency
//   profit_local?: number; // Profit in local currency
//   exchange_rate?: number; // Exchange rate used
// }

// // // src/types/reseller/plans.ts

// // export interface BasePlan {
// //   id: string;
// //   provider: string;
// //   provider_plan_id: string;
// //   country_code: string;
// //   network?: string;
// //   name: string;
// //   description?: string;
// //   category: string;
// //   data_amount?: string;
// //   validity?: string;
// //   duration_days?: number;
// //   base_price: number;
// //   currency: string;
// //   send_value?: number;
// //   send_currency?: string;
// //   metadata?: Record<string, any>;
// //   is_active: boolean;
// //   created_at: string;
// //   updated_at: string;
// // }

// // export interface ResellerPlanConfig {
// //   id: string;
// //   reseller_id: string;
// //   plan_id: string;
// //   enabled: boolean;
// //   markup_type: "percentage" | "fixed";
// //   markup_value: number;
// //   selling_price: number;
// //   created_at: string;
// //   updated_at: string;
// // }

// // export interface PlanWithConfig extends BasePlan {
// //   config: ResellerPlanConfig | null;
// //   profit?: number;
// //   profit_percent?: number;
// // }
