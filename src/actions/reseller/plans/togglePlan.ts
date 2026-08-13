// src/actions/reseller/plans/togglePlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";

export async function togglePlan(planId: string): Promise<{
  success: boolean;
  data?: { enabled: boolean };
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

    const { data: application, error: appError } = await adminClient
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const countryCodeLower = application.country_code.toLowerCase();
    const countryConfig = getCountryConfig(countryCodeLower);
    const serviceProvider = countryConfig.serviceProvider;

    // Check if config exists
    const { data: existingConfig, error: configError } = await adminClient
      .from("global_reseller_plan_configs")
      .select("enabled, markup_type, markup_value, selling_price")
      .eq("plan_id", planId)
      .eq("reseller_id", application.id)
      .single();

    let newEnabled: boolean;

    if (existingConfig) {
      // Config exists - toggle it
      newEnabled = !existingConfig.enabled;

      const { error: updateError } = await adminClient
        .from("global_reseller_plan_configs")
        .update({
          enabled: newEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("plan_id", planId)
        .eq("reseller_id", application.id);

      if (updateError) {
        console.error("Toggle plan error:", updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // No config exists - create one with default values
      newEnabled = false;

      // Get base plan price (also verify it's from the correct provider)
      const { data: plan, error: planError } = await adminClient
        .from("global_base_plans")
        .select("base_price")
        .eq("id", planId)
        .eq("provider", serviceProvider) // 🔥 VERIFY CORRECT PROVIDER
        .single();

      if (planError || !plan) {
        return { success: false, error: "Plan not found" };
      }

      // Create config with disabled state
      const { error: insertError } = await adminClient
        .from("global_reseller_plan_configs")
        .insert({
          reseller_id: application.id,
          plan_id: planId,
          enabled: false,
          markup_type: "percentage",
          markup_value: 0,
          selling_price: plan.base_price,
        });

      if (insertError) {
        console.error("Create config error:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    return {
      success: true,
      data: { enabled: newEnabled },
    };
  } catch (error) {
    console.error("TogglePlan Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// // src/actions/reseller/plans/togglePlan.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";

// export async function togglePlan(planId: string): Promise<{
//   success: boolean;
//   data?: { enabled: boolean };
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

//     const { data: application, error: appError } = await adminClient
//       .from("global_reseller_applications")
//       .select("id")
//       .eq("auth_user_id", user.id)
//       .single();

//     if (appError || !application) {
//       return { success: false, error: "Reseller not found" };
//     }

//     // Check if config exists
//     const { data: existingConfig, error: configError } = await adminClient
//       .from("global_reseller_plan_configs")
//       .select("enabled, markup_type, markup_value, selling_price")
//       .eq("plan_id", planId)
//       .eq("reseller_id", application.id)
//       .single();

//     let newEnabled: boolean;

//     if (existingConfig) {
//       // Config exists - toggle it
//       newEnabled = !existingConfig.enabled;

//       const { error: updateError } = await adminClient
//         .from("global_reseller_plan_configs")
//         .update({
//           enabled: newEnabled,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("plan_id", planId)
//         .eq("reseller_id", application.id);

//       if (updateError) {
//         console.error("Toggle plan error:", updateError);
//         return { success: false, error: updateError.message };
//       }
//     } else {
//       // No config exists - create one with default values
//       newEnabled = false; // Toggling from virtual "enabled" (true) to disabled

//       // Get base plan price
//       const { data: plan } = await adminClient
//         .from("global_base_plans")
//         .select("base_price")
//         .eq("id", planId)
//         .single();

//       if (!plan) {
//         return { success: false, error: "Plan not found" };
//       }

//       // Create config with disabled state
//       const { error: insertError } = await adminClient
//         .from("global_reseller_plan_configs")
//         .insert({
//           reseller_id: application.id,
//           plan_id: planId,
//           enabled: false,
//           markup_type: "percentage",
//           markup_value: 0,
//           selling_price: plan.base_price,
//         });

//       if (insertError) {
//         console.error("Create config error:", insertError);
//         return { success: false, error: insertError.message };
//       }
//     }

//     return {
//       success: true,
//       data: { enabled: newEnabled },
//     };
//   } catch (error) {
//     console.error("TogglePlan Error:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }
