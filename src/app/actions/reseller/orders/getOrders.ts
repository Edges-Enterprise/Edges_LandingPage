// app/actions/reseller/orders/getOrders.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Order } from "@/types";

/**
 * Get all orders for a reseller
 * Maps auth_email back to original email for display
 * Fetches plan details separately
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

  // 1. Get plan details separately
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

  // 2. Map auth_email to original email
  const authEmails = orders
    .filter((o) => o.customer_email)
    .map((o) => o.customer_email);

  let emailMap: Record<string, string> = {};
  if (authEmails.length > 0) {
    const { data: customers } = await supabase
      .from("reseller_customers")
      .select("auth_email, email")
      .eq("reseller_id", resellerId)
      .in("auth_email", authEmails);

    if (customers) {
      for (const customer of customers) {
        if (customer.auth_email) {
          emailMap[customer.auth_email] = customer.email;
        }
      }
      // Also map original email to itself for fallback
      for (const customer of customers) {
        emailMap[customer.email] = customer.email;
      }
    }
  }

  // 3. Combine everything
  return orders.map((order) => ({
    ...order,
    plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
    customer_email: emailMap[order.customer_email] || order.customer_email,
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

//   // Get orders first without join
//   const { data: orders, error } = await supabase
//     .from("reseller_orders")
//     .select("*")
//     .eq("reseller_id", resellerId)
//     .order("created_at", { ascending: false })
//     .limit(limit);

//   if (error) {
//     console.error("Error fetching orders:", error);
//     return [];
//   }

//   if (!orders || orders.length === 0) return [];

//   // Get plan details separately
//   const planIds = orders.filter((o) => o.plan_id).map((o) => o.plan_id);

//   let planMap = new Map();

//   if (planIds.length > 0) {
//     const { data: plans } = await supabase
//       .from("reseller_base_plans")
//       .select("id, plan_id, plan_name, plan_type, network, amount")
//       .in("id", planIds);

//     if (plans) {
//       planMap = new Map(plans.map((p) => [p.id, p]));
//     }
//   }

//   // Attach plan data to orders
//   return orders.map((order) => ({
//     ...order,
//     plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
//   }));
// }

// /**
//  * Get recent orders (last 5)
//  */
// export async function getRecentOrders(resellerId: string): Promise<Order[]> {
//   return getOrders(resellerId, 5);
// }

// // // app/actions/reseller/orders/getOrders.ts

// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import type { Order } from "@/types";

// // /**
// //  * Get all orders for a reseller
// //  */
// // export async function getOrders(
// //   resellerId: string,
// //   limit = 50,
// // ): Promise<Order[]> {
// //   const supabase = await createServerClient();

// //   const { data, error } = await supabase
// //     .from("reseller_orders")
// //     .select(
// //       `
// //       *,
// //       plan:plan_id (id, name, category, base_price)
// //     `,
// //     )
// //     .eq("reseller_id", resellerId)
// //     .order("created_at", { ascending: false })
// //     .limit(limit);

// //   if (error) {
// //     console.error("Error fetching orders:", error);
// //     return [];
// //   }

// //   return data || [];
// // }

// // /**
// //  * Get recent orders (last 5)
// //  */
// // export async function getRecentOrders(resellerId: string): Promise<Order[]> {
// //   return getOrders(resellerId, 5);
// // }
