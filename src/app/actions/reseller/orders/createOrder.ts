// app/actions/reseller/orders/createOrder.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
import { revalidatePath } from "next/cache";

interface CreateOrderInput {
  storeName: string;
  planId: string;
  customerEmail: string;
}

/**
 * Create an order when a customer purchases a plan from a store
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<{ success?: boolean; error?: string; order?: any }> {
  const supabase = await createServerClient();

  // Find the reseller
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", input.storeName)
    .eq("status", "active")
    .single();

  if (resellerError || !reseller) {
    return { error: "Store not found or inactive" };
  }

  // Get the reseller's plan config
  const { data: rawPlanConfig, error: planError } = await supabase
    .from("reseller_plan_configs")
    .select(
      `
      id,
      enabled,
      markup_type,
      markup_value,
      plan:plan_id (id, amount, plan_name, plan_type, network)
    `,
    )
    .eq("reseller_id", reseller.id)
    .eq("plan_id", input.planId)
    .eq("enabled", true)
    .single();

  if (planError || !rawPlanConfig) {
    return { error: "Plan not available" };
  }

  // Cast to work around Supabase join typing
  const planConfig = rawPlanConfig as any;
  const plan = planConfig.plan as {
    id: string;
    amount: number;
    plan_name: string;
    plan_type: string;
    network: string;
  };

  if (!plan || typeof plan.amount !== "number") {
    return { error: "Plan data not found" };
  }

  const finalPrice = calculateResellerPrice(
    plan.amount,
    planConfig.markup_type,
    planConfig.markup_value,
  );
  const profit = finalPrice - plan.amount;

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from("reseller_orders")
    .insert({
      reseller_id: reseller.id,
      customer_email: input.customerEmail,
      plan_id: input.planId,
      amount: finalPrice,
      profit,
      status: "completed",
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    return { error: "Failed to create order" };
  }

  // Record purchase transaction
  await supabase.from("reseller_transactions").insert({
    reseller_id: reseller.id,
    amount: finalPrice,
    type: "purchase",
    status: "completed",
    reference: order.id,
    metadata: {
      order_id: order.id,
      plan_id: input.planId,
      plan_name: plan.plan_name,
      customer_email: input.customerEmail,
    },
  });

  // Update wallet totals
  const { error: walletError } = await supabase.rpc(
    "update_wallet_after_sale",
    {
      p_reseller_id: reseller.id,
      p_amount: finalPrice,
      p_profit: profit,
    },
  );

  if (walletError) {
    console.error("Error updating wallet after sale:", walletError);
  }

  // Track customer
  await supabase.from("reseller_customers").upsert(
    {
      reseller_id: reseller.id,
      email: input.customerEmail,
    },
    {
      onConflict: "reseller_id,email",
      ignoreDuplicates: true,
    },
  );

  revalidatePath(`/${input.storeName}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");

  return {
    success: true,
    order: {
      id: order.id,
      amount: finalPrice,
      planName: plan.plan_name,
      planType: plan.plan_type,
      network: plan.network,
    },
  };
}

// // app/actions/reseller/orders/createOrder.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { calculateResellerPrice } from "@/lib/pricing/calculatePrice";
// import { revalidatePath } from "next/cache";

// interface CreateOrderInput {
//   storeName: string;
//   planId: string;
//   customerEmail: string;
// }

// /**
//  * Create an order when a customer purchases a plan from a store
//  */
// export async function createOrder(
//   input: CreateOrderInput,
// ): Promise<{ success?: boolean; error?: string; order?: any }> {
//   const supabase = await createServerClient();

//   // Find the reseller
//   const { data: reseller, error: resellerError } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", input.storeName)
//     .eq("status", "active")
//     .single();

//   if (resellerError || !reseller) {
//     return { error: "Store not found or inactive" };
//   }

//   // Get the reseller's plan config
//   const { data: planConfig, error: planError } = await supabase
//     .from("reseller_plan_configs")
//     .select(
//       `
//       id,
//       enabled,
//       markup_type,
//       markup_value,
//       plan:plan_id (id, base_price, name, category)
//     `,
//     )
//     .eq("reseller_id", reseller.id)
//     .eq("plan_id", input.planId)
//     .eq("enabled", true)
//     .single();

//   if (planError || !planConfig) {
//     return { error: "Plan not available" };
//   }

//   const finalPrice = calculateResellerPrice(
//     planConfig.plan.base_price,
//     planConfig.markup_type,
//     planConfig.markup_value,
//   );
//   const profit = finalPrice - planConfig.plan.base_price;

//   // Create the order
//   const { data: order, error: orderError } = await supabase
//     .from("reseller_orders")
//     .insert({
//       reseller_id: reseller.id,
//       customer_email: input.customerEmail,
//       plan_id: input.planId,
//       amount: finalPrice,
//       profit,
//       status: "completed",
//     })
//     .select()
//     .single();

//   if (orderError) {
//     console.error("Error creating order:", orderError);
//     return { error: "Failed to create order" };
//   }

//   // Record purchase transaction
//   await supabase.from("reseller_transactions").insert({
//     reseller_id: reseller.id,
//     amount: finalPrice,
//     type: "purchase",
//     status: "completed",
//     reference: order.id,
//     metadata: {
//       order_id: order.id,
//       plan_id: input.planId,
//       plan_name: planConfig.plan.name,
//       customer_email: input.customerEmail,
//     },
//   });

//   // Update wallet totals
//   const { error: walletError } = await supabase.rpc(
//     "update_wallet_after_sale",
//     {
//       p_reseller_id: reseller.id,
//       p_amount: finalPrice,
//       p_profit: profit,
//     },
//   );

//   if (walletError) {
//     console.error("Error updating wallet after sale:", walletError);
//   }

//   // Track customer
//   await supabase.from("reseller_customers").upsert(
//     {
//       reseller_id: reseller.id,
//       email: input.customerEmail,
//     },
//     {
//       onConflict: "reseller_id,email",
//       ignoreDuplicates: true,
//     },
//   );

//   revalidatePath(`/${input.storeName}`);
//   revalidatePath("/dashboard");
//   revalidatePath("/dashboard/orders");

//   return {
//     success: true,
//     order: {
//       id: order.id,
//       amount: finalPrice,
//       planName: planConfig.plan.name,
//       category: planConfig.plan.category,
//     },
//   };
// }
