// src/actions/reseller/plans/getPlans.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanWithConfig } from "@/types/reseller/plans";
import { getCountryConfig } from "@/config/countries";

export interface GetPlansParams {
  network?: string;
  enabled?: boolean;
}

export async function getPlans(params: GetPlansParams = {}): Promise<{
  success: boolean;
  data?: PlanWithConfig[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const adminClient = createAdminClient();

    // Get the reseller's application
    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const countryCodeUpper = application.country_code.toUpperCase();
    const countryCodeLower = application.country_code.toLowerCase();

    // Get the country config to determine which service provider to use
    const countryConfig = getCountryConfig(countryCodeLower);
    const serviceProvider = countryConfig.serviceProvider;

    // Get default markup from country config (or use 0)
    const defaultMarkup = countryConfig.defaultMarkup || 0;

    // Build the query - Get ALL plans for the country with their configs (if any)
    let query = adminClient
      .from("global_base_plans")
      .select(
        `
        *,
        config:global_reseller_plan_configs!plan_id (
          id,
          reseller_id,
          plan_id,
          enabled,
          markup_type,
          markup_value,
          selling_price
        )
      `,
      )
      .eq("country_code", countryCodeUpper)
      .eq("is_active", true)
      .eq("provider", serviceProvider); // 🔥 FILTER BY SERVICE PROVIDER

    // Apply network filter if specified
    if (params.network) {
      query = query.eq("network", params.network);
    }

    // Order by base_price ascending (lowest to highest)
    query = query.order("base_price", { ascending: true });

    const { data: plans, error: plansError } = await query;

    if (plansError) {
      console.error("Get plans error:", plansError);
      return { success: false, error: plansError.message };
    }

    // Process plans - create virtual configs where none exist
    const processedPlans = (plans || []).map((plan: any) => {
      // Find config for this reseller
      const configs = plan.config || [];
      const existingConfig = configs.find(
        (c: any) => c.reseller_id === application.id,
      );

      // If config exists, use it
      if (existingConfig) {
        const sellingPrice = existingConfig.selling_price || plan.base_price;
        const profit = sellingPrice - plan.base_price;
        const profitPercent =
          plan.base_price > 0 ? (profit / plan.base_price) * 100 : 0;

        return {
          ...plan,
          config: existingConfig,
          profit,
          profit_percent: profitPercent,
        };
      }

      // No config exists - create virtual config with defaults
      const virtualConfig = {
        id: null,
        reseller_id: application.id,
        plan_id: plan.id,
        enabled: true,
        markup_type: "percentage" as const,
        markup_value: defaultMarkup,
        selling_price: plan.base_price,
      };

      return {
        ...plan,
        config: virtualConfig,
        profit: 0,
        profit_percent: 0,
      };
    });

    return {
      success: true,
      data: processedPlans as PlanWithConfig[],
    };
  } catch (error) {
    console.error("GetPlans Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// // src/actions/reseller/plans/getPlans.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { PlanWithConfig } from "@/types/reseller/plans";

// export interface GetPlansParams {
//   network?: string;
//   enabled?: boolean;
// }

// export async function getPlans(params: GetPlansParams = {}): Promise<{
//   success: boolean;
//   data?: PlanWithConfig[];
//   error?: string;
// }> {
//   try {
//     const supabase = await createServerClient();

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser();

//     if (userError || !user) {
//       return { success: false, error: "Unauthorized" };
//     }

//     const adminClient = createAdminClient();

//     // Get the reseller's application
//     const { data: application, error: appError } = await adminClient
//       .from("global_reseller_applications")
//       .select("id, brand_color, store_name, store_slug, country_code")
//       .eq("auth_user_id", user.id)
//       .single();

//     if (appError || !application) {
//       return { success: false, error: "Reseller not found" };
//     }

//     const countryCodeUpper = application.country_code.toUpperCase();

//     // Get default markup from country config (or use 0)
//     const defaultMarkup = 0;

//     // Build the query - Get ALL plans for the country with their configs (if any)
//     let query = adminClient
//       .from("global_base_plans")
//       .select(
//         `
//         *,
//         config:global_reseller_plan_configs!plan_id (
//           id,
//           reseller_id,
//           plan_id,
//           enabled,
//           markup_type,
//           markup_value,
//           selling_price
//         )
//       `,
//       )
//       .eq("country_code", countryCodeUpper)
//       .eq("is_active", true);

//     // Apply network filter if specified
//     if (params.network) {
//       query = query.eq("network", params.network);
//     }

//     // Order by base_price ascending (lowest to highest)
//     query = query.order("base_price", { ascending: true });

//     const { data: plans, error: plansError } = await query;

//     if (plansError) {
//       console.error("Get plans error:", plansError);
//       return { success: false, error: plansError.message };
//     }

//     // Process plans - create virtual configs where none exist
//     const processedPlans = (plans || []).map((plan: any) => {
//       // Find config for this reseller
//       const configs = plan.config || [];
//       const existingConfig = configs.find(
//         (c: any) => c.reseller_id === application.id,
//       );

//       // If config exists, use it
//       if (existingConfig) {
//         const sellingPrice = existingConfig.selling_price || plan.base_price;
//         const profit = sellingPrice - plan.base_price;
//         const profitPercent =
//           plan.base_price > 0 ? (profit / plan.base_price) * 100 : 0;

//         return {
//           ...plan,
//           config: existingConfig,
//           profit,
//           profit_percent: profitPercent,
//         };
//       }

//       // No config exists - create virtual config with defaults
//       const virtualConfig = {
//         id: null,
//         reseller_id: application.id,
//         plan_id: plan.id,
//         enabled: true,
//         markup_type: "percentage" as const,
//         markup_value: defaultMarkup,
//         selling_price: plan.base_price,
//       };

//       return {
//         ...plan,
//         config: virtualConfig,
//         profit: 0,
//         profit_percent: 0,
//       };
//     });

//     return {
//       success: true,
//       data: processedPlans as PlanWithConfig[],
//     };
//   } catch (error) {
//     console.error("GetPlans Error:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }
