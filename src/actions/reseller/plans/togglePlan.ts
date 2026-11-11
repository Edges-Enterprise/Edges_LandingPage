// src/actions/reseller/plans/togglePlan.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { resolveStoredSellingPrice } from "@/lib/pricing/resellerPlanPrice";
import { toStoreCatalogSettings } from "../../../../supabase/functions/_shared/catalog/catalogResolution.ts";

export async function togglePlan(
  planId: string,
  enabled?: boolean,
): Promise<{
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
      .select("id, country_code, catalog_mode, default_markup_type, default_markup_value")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    const countryCodeLower = application.country_code.toLowerCase();
    const countryConfig = getCountryConfig(countryCodeLower);

    // The markup a NEW config row is seeded with. In `all` mode the store's
    // default is the live price, so a first-time enable or an opt-out row must
    // carry it (a country-config default would price the plan differently from
    // the rest of the store). In `selected` mode the country default is the
    // long-standing behaviour.
    const settings = toStoreCatalogSettings(application);
    const seedMarkupType = settings.catalogMode === "all"
      ? settings.defaultMarkupType
      : "percentage";
    const seedMarkupValue = settings.catalogMode === "all"
      ? settings.defaultMarkupValue
      : (countryConfig.defaultMarkup || 0);

    // Check if config exists
    const { data: existingConfig, error: configError } = await adminClient
      .from("global_reseller_plan_configs")
      .select("enabled, markup_type, markup_value, selling_price")
      .eq("plan_id", planId)
      .eq("reseller_id", application.id)
      .single();

    let newEnabled: boolean;

    if (existingConfig) {
      // Config exists - toggle it (or apply the explicit target the
      // caller asked for). The UI computes the target as `!isEnabled`,
      // which is more reliable than inverting the stored value.
      newEnabled = enabled ?? !existingConfig.enabled;

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
      // No config exists - create one with default values. Honour the
      // explicit target if one was passed (turning a plan ON for the
      // first time must persist enabled=true); otherwise default OFF.
      newEnabled = enabled ?? false;

      // Get the base plan. The plan id is authoritative and unique across
      // countries/providers, so it is not re-scoped to the country's
      // service provider — a reseller may enable any provider's plan
      // (e.g. a Zendit plan from the global/world view).
      const { data: plan, error: planError } = await adminClient
        .from("global_base_plans")
        .select(
          "id, provider, provider_plan_id, country_code, network, name, category, base_price, currency, send_value, send_currency, price_type, range_min, range_max, range_increment, zendit_fx",
        )
        .eq("id", planId)
        .eq("is_active", true)
        .single();

      if (planError || !plan) {
        return { success: false, error: "Plan not found" };
      }

      // Create config with the requested enabled state, seeded with the
      // store's (or country's) default markup. The stored selling price is the
      // pipeline's converted customer price, not `base_price + markup`.
      const sellingPrice = await resolveStoredSellingPrice({
        countryCode: countryCodeLower,
        plan,
        config: {
          markup_type: seedMarkupType,
          markup_value: seedMarkupValue,
          selling_price: null,
        },
      });

      const { error: insertError } = await adminClient
        .from("global_reseller_plan_configs")
        .insert({
          reseller_id: application.id,
          plan_id: planId,
          enabled: newEnabled,
          markup_type: seedMarkupType,
          markup_value: seedMarkupValue,
          selling_price: sellingPrice,
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
