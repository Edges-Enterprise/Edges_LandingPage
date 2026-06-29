// app/actions/reseller/analytics/getDashboardStats.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/types";

/**
 * Get aggregated dashboard stats for a reseller
 * Maps auth_email back to original email for display
 * Fetches plan details for recent orders
 */
export async function getDashboardStats(
  resellerId: string,
): Promise<DashboardStats> {
  const supabase = await createServerClient();

  // Get wallet
  const { data: wallet } = await supabase
    .from("reseller_wallets")
    .select("balance, total_sales, total_profit")
    .eq("reseller_id", resellerId)
    .single();

  // Get order counts
  const { count: totalOrders } = await supabase
    .from("reseller_orders")
    .select("*", { count: "exact", head: true })
    .eq("reseller_id", resellerId);

  // Get active customers count
  const { count: activeCustomers } = await supabase
    .from("reseller_customers")
    .select("*", { count: "exact", head: true })
    .eq("reseller_id", resellerId);

  // Get recent 5 orders
  const { data: recentOrders } = await supabase
    .from("reseller_orders")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(5);

  let ordersWithPlans = recentOrders || [];

  if (recentOrders && recentOrders.length > 0) {
    // 1. Get plan details for recent orders
    const planIds = recentOrders.filter((o) => o.plan_id).map((o) => o.plan_id);

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

    // 2. Map auth_email to original email for display
    const authEmails = recentOrders
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
    ordersWithPlans = recentOrders.map((order) => ({
      ...order,
      plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
      customer_email: emailMap[order.customer_email] || order.customer_email,
    }));
  }

  return {
    totalSales: wallet?.total_sales || 0,
    totalProfit: wallet?.total_profit || 0,
    totalOrders: totalOrders || 0,
    activeCustomers: activeCustomers || 0,
    walletBalance: wallet?.balance || 0,
    recentOrders: ordersWithPlans,
  };
}

// // app/actions/reseller/analytics/getDashboardStats.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import type { DashboardStats } from "@/types";

// export async function getDashboardStats(
//   resellerId: string,
// ): Promise<DashboardStats> {
//   const supabase = await createServerClient();

//   // Get wallet
//   const { data: wallet } = await supabase
//     .from("reseller_wallets")
//     .select("balance, total_sales, total_profit")
//     .eq("reseller_id", resellerId)
//     .single();

//   // Get order counts
//   const { count: totalOrders } = await supabase
//     .from("reseller_orders")
//     .select("*", { count: "exact", head: true })
//     .eq("reseller_id", resellerId);

//   // Get active customers count
//   const { count: activeCustomers } = await supabase
//     .from("reseller_customers")
//     .select("*", { count: "exact", head: true })
//     .eq("reseller_id", resellerId);

//   // Get recent 5 orders
//   const { data: recentOrders } = await supabase
//     .from("reseller_orders")
//     .select("*")
//     .eq("reseller_id", resellerId)
//     .order("created_at", { ascending: false })
//     .limit(5);

//   // Get plan details for recent orders
//   let ordersWithPlans = recentOrders || [];

//   if (recentOrders && recentOrders.length > 0) {
//     const planIds = recentOrders.filter((o) => o.plan_id).map((o) => o.plan_id);

//     if (planIds.length > 0) {
//       const { data: plans } = await supabase
//         .from("reseller_base_plans")
//         .select("id, plan_id, plan_name, plan_type, network, amount")
//         .in("id", planIds);

//       if (plans) {
//         const planMap = new Map(plans.map((p) => [p.id, p]));
//         ordersWithPlans = recentOrders.map((order) => ({
//           ...order,
//           plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
//         }));
//       }
//     }

//     // Get original emails for each order's customer_email (auth_email)
//     const authEmails = recentOrders
//       .filter((o) => o.customer_email)
//       .map((o) => o.customer_email);

//     if (authEmails.length > 0) {
//       const { data: customers } = await supabase
//         .from("reseller_customers")
//         .select("auth_email, email")
//         .eq("reseller_id", resellerId)
//         .in("auth_email", authEmails);

//       if (customers) {
//         const emailMap: Record<string, string> = {};
//         for (const customer of customers) {
//           if (customer.auth_email) {
//             emailMap[customer.auth_email] = customer.email;
//           }
//         }
//         // Also map original email to itself for fallback
//         for (const customer of customers) {
//           emailMap[customer.email] = customer.email;
//         }

//         // Replace customer_email with original email for display
//         ordersWithPlans = ordersWithPlans.map((order) => ({
//           ...order,
//           customer_email:
//             emailMap[order.customer_email] || order.customer_email,
//         }));
//       }
//     }
//   }

//   return {
//     totalSales: wallet?.total_sales || 0,
//     totalProfit: wallet?.total_profit || 0,
//     totalOrders: totalOrders || 0,
//     activeCustomers: activeCustomers || 0,
//     walletBalance: wallet?.balance || 0,
//     recentOrders: ordersWithPlans,
//   };
// }

// // // app/actions/reseller/analytics/getDashboardStats.ts

// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import type { DashboardStats } from "@/types";

// // export async function getDashboardStats(
// //   resellerId: string,
// // ): Promise<DashboardStats> {
// //   const supabase = await createServerClient();

// //   // Get wallet
// //   const { data: wallet } = await supabase
// //     .from("reseller_wallets")
// //     .select("balance, total_sales, total_profit")
// //     .eq("reseller_id", resellerId)
// //     .single();

// //   // Get order counts
// //   const { count: totalOrders } = await supabase
// //     .from("reseller_orders")
// //     .select("*", { count: "exact", head: true })
// //     .eq("reseller_id", resellerId);

// //   // Get active customers count
// //   const { count: activeCustomers } = await supabase
// //     .from("reseller_customers")
// //     .select("*", { count: "exact", head: true })
// //     .eq("reseller_id", resellerId);

// //   // Get recent 5 orders
// //   const { data: recentOrders } = await supabase
// //     .from("reseller_orders")
// //     .select("*")
// //     .eq("reseller_id", resellerId)
// //     .order("created_at", { ascending: false })
// //     .limit(5);

// //   // Get plan details for recent orders
// //   let ordersWithPlans = recentOrders || [];

// //   if (recentOrders && recentOrders.length > 0) {
// //     const planIds = recentOrders
// //       .filter((o) => o.plan_id)
// //       .map((o) => o.plan_id);

// //     if (planIds.length > 0) {
// //       const { data: plans } = await supabase
// //         .from("reseller_base_plans")
// //         .select("id, plan_id, plan_name, plan_type, network, amount")
// //         .in("id", planIds);

// //       if (plans) {
// //         const planMap = new Map(plans.map((p) => [p.id, p]));
// //         ordersWithPlans = recentOrders.map((order) => ({
// //           ...order,
// //           plan: order.plan_id ? planMap.get(order.plan_id) || null : null,
// //         }));
// //       }
// //     }
// //   }

// //   return {
// //     totalSales: wallet?.total_sales || 0,
// //     totalProfit: wallet?.total_profit || 0,
// //     totalOrders: totalOrders || 0,
// //     activeCustomers: activeCustomers || 0,
// //     walletBalance: wallet?.balance || 0,
// //     recentOrders: ordersWithPlans,
// //   };
// // }

// // // // app/actions/reseller/analytics/getDashboardStats.ts

// // // "use server";

// // // import { createServerClient } from "@/lib/supabase/server";
// // // import type { DashboardStats } from "@/types";

// // // /**
// // //  * Get aggregated dashboard stats for a reseller
// // //  */
// // // export async function getDashboardStats(
// // //   resellerId: string,
// // // ): Promise<DashboardStats> {
// // //   const supabase = await createServerClient();

// // //   // Get wallet
// // //   const { data: wallet } = await supabase
// // //     .from("reseller_wallets")
// // //     .select("balance, total_sales, total_profit")
// // //     .eq("reseller_id", resellerId)
// // //     .single();

// // //   // Get order counts
// // //   const { count: totalOrders, error: ordersError } = await supabase
// // //     .from("reseller_orders")
// // //     .select("*", { count: "exact", head: true })
// // //     .eq("reseller_id", resellerId);

// // //   if (ordersError) {
// // //     console.error("Error counting orders:", ordersError);
// // //   }

// // //   // Get active customers count
// // //   const { count: activeCustomers, error: customersError } = await supabase
// // //     .from("reseller_customers")
// // //     .select("*", { count: "exact", head: true })
// // //     .eq("reseller_id", resellerId);

// // //   if (customersError) {
// // //     console.error("Error counting customers:", customersError);
// // //   }

// // //   // Get recent 5 orders
// // //   const { data: recentOrders } = await supabase
// // //     .from("reseller_orders")
// // //     .select(
// // //       `
// // //       *,
// // //       plan:plan_id (id, name, category, base_price)
// // //     `,
// // //     )
// // //     .eq("reseller_id", resellerId)
// // //     .order("created_at", { ascending: false })
// // //     .limit(5);

// // //   return {
// // //     totalSales: wallet?.total_sales || 0,
// // //     totalProfit: wallet?.total_profit || 0,
// // //     totalOrders: totalOrders || 0,
// // //     activeCustomers: activeCustomers || 0,
// // //     walletBalance: wallet?.balance || 0,
// // //     recentOrders: recentOrders || [],
// // //   };
// // // }
