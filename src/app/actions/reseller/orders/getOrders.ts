// app/actions/reseller/orders/getOrders.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Order } from "@/types";

/**
 * Get all orders for a reseller
 */
export async function getOrders(
  resellerId: string,
  limit = 50,
): Promise<Order[]> {
  const supabase = await createServerClient();

  // Get orders first without join
  const { data: orders, error } = await supabase
    .from("reseller_orders")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  if (!orders || orders.length === 0) return [];

  // Get plan details separately
  const planIds = orders.filter((o) => o.plan_id).map((o) => o.plan_id);

  let planMap = new Map();

  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from("reseller_base_plans")
      .select("id, plan_id, plan_name, plan_type, network, amount")
      .in("id", planIds);

    if (plans) {
      planMap = new Map(plans.map((p) => [p.id, p]));
    }
  }

  // Attach plan data to orders
  return orders.map((order) => ({
    ...order,
    plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
  }));
}

/**
 * Get recent orders (last 5)
 */
export async function getRecentOrders(resellerId: string): Promise<Order[]> {
  return getOrders(resellerId, 5);
}

// // app/actions/reseller/orders/getOrders.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import type { Order } from "@/types";

// /**
//  * Get all orders for a reseller
//  */
// export async function getOrders(
//   resellerId: string,
//   limit = 50,
// ): Promise<Order[]> {
//   const supabase = await createServerClient();

//   const { data, error } = await supabase
//     .from("reseller_orders")
//     .select(
//       `
//       *,
//       plan:plan_id (id, name, category, base_price)
//     `,
//     )
//     .eq("reseller_id", resellerId)
//     .order("created_at", { ascending: false })
//     .limit(limit);

//   if (error) {
//     console.error("Error fetching orders:", error);
//     return [];
//   }

//   return data || [];
// }

// /**
//  * Get recent orders (last 5)
//  */
// export async function getRecentOrders(resellerId: string): Promise<Order[]> {
//   return getOrders(resellerId, 5);
// }
