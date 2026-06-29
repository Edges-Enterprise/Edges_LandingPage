
// app/actions/reseller/customers/getCustomers.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Customer } from "@/types";

/**
 * Get all customers for a reseller with their order stats
 */
export async function getCustomers(resellerId: string): Promise<Customer[]> {
  const supabase = await createServerClient();

  // Get all customers for this reseller
  const { data: customers, error } = await supabase
    .from("reseller_customers")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  if (!customers || customers.length === 0) return [];

  // Get customer IDs for wallet lookup
  const customerIds = customers.map((c) => c.id);

  // Get wallets for all customers at once
  const { data: wallets } = await supabase
    .from("reseller_customer_wallets")
    .select("customer_id, total_spent")
    .eq("reseller_id", resellerId)
    .in("customer_id", customerIds);

  const walletMap: Record<string, number> = {};
  if (wallets) {
    for (const wallet of wallets) {
      walletMap[wallet.customer_id] = wallet.total_spent || 0;
    }
  }

  // Get all orders for this reseller and map by auth_email
  const { data: allOrders } = await supabase
    .from("reseller_orders")
    .select("customer_email, amount, created_at")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false });

  // Group orders by customer_email (which is the auth_email)
  const ordersByAuthEmail: Record<string, { total: number; count: number; lastOrder: string | null }> = {};

  if (allOrders) {
    for (const order of allOrders) {
      const authEmail = order.customer_email;
      if (!ordersByAuthEmail[authEmail]) {
        ordersByAuthEmail[authEmail] = { total: 0, count: 0, lastOrder: null };
      }
      ordersByAuthEmail[authEmail].total += order.amount;
      ordersByAuthEmail[authEmail].count += 1;
      if (!ordersByAuthEmail[authEmail].lastOrder) {
        ordersByAuthEmail[authEmail].lastOrder = order.created_at;
      }
    }
  }

  // Build a map of auth_email -> original email
  const authToOriginalMap: Record<string, string> = {};
  for (const customer of customers) {
    if (customer.auth_email) {
      authToOriginalMap[customer.auth_email] = customer.email;
    }
    // Also map the original email to itself for fallback
    authToOriginalMap[customer.email] = customer.email;
  }

  // Combine customer data with order stats
  return customers.map((customer) => {
    // Try to find orders using auth_email first, then fallback to original email
    let orderStats = ordersByAuthEmail[customer.auth_email || ""] || 
                     ordersByAuthEmail[customer.email] || 
                     { total: 0, count: 0, lastOrder: null };
    
    const walletTotal = walletMap[customer.id] || 0;

    // Determine which email to display - use original email for display
    const displayEmail = customer.email; // This is the original email

    return {
      ...customer,
      // Override email with original email for display
      email: displayEmail,
      total_orders: orderStats.count,
      total_spent: Math.max(walletTotal, orderStats.total),
      last_order: orderStats.lastOrder || customer.last_purchase_at || undefined,
    };
  });
}


// // app/actions/reseller/customers/getCustomers.ts

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import type { Customer } from "@/types";

// /**
//  * Get all customers for a reseller with their order stats
//  */
// export async function getCustomers(resellerId: string): Promise<Customer[]> {
//   const supabase = await createServerClient();

//   // Get all customers for this reseller
//   const { data: customers, error } = await supabase
//     .from("reseller_customers")
//     .select("*")
//     .eq("reseller_id", resellerId)
//     .order("created_at", { ascending: false });

//   if (error) {
//     console.error("Error fetching customers:", error);
//     return [];
//   }

//   if (!customers || customers.length === 0) return [];

//   // Get all orders for this reseller at once
//   const { data: allOrders } = await supabase
//     .from("reseller_orders")
//     .select("customer_email, amount, created_at")
//     .eq("reseller_id", resellerId)
//     .order("created_at", { ascending: false });

//   // Group orders by customer email
//   const ordersByEmail: Record<string, { total: number; count: number; lastOrder: string | null }> = {};

//   if (allOrders) {
//     for (const order of allOrders) {
//       const email = order.customer_email;
//       if (!ordersByEmail[email]) {
//         ordersByEmail[email] = { total: 0, count: 0, lastOrder: null };
//       }
//       ordersByEmail[email].total += order.amount;
//       ordersByEmail[email].count += 1;
//       // First order in the list is the most recent (due to ordering)
//       if (!ordersByEmail[email].lastOrder) {
//         ordersByEmail[email].lastOrder = order.created_at;
//       }
//     }
//   }

//   // Get all customer wallets to get total_spent
//   const { data: wallets } = await supabase
//     .from("reseller_customer_wallets")
//     .select("customer_id, total_spent")
//     .eq("reseller_id", resellerId);

//   const walletMap: Record<string, number> = {};
//   if (wallets) {
//     for (const wallet of wallets) {
//       walletMap[wallet.customer_id] = wallet.total_spent || 0;
//     }
//   }

//   // Combine customer data with order stats
//   return customers.map((customer) => {
//     const orderStats = ordersByEmail[customer.email] || { total: 0, count: 0, lastOrder: null };
//     const walletTotal = walletMap[customer.id] || 0;

//     return {
//       ...customer,
//       total_orders: orderStats.count,
//       total_spent: Math.max(walletTotal, orderStats.total), // Use the larger value
//       last_order: orderStats.lastOrder || customer.last_purchase_at || undefined,
//     };
//   });
// }

// // // app/actions/reseller/customers/getCustomers.ts

// // "use server";

// // import { createServerClient } from "@/lib/supabase/server";
// // import type { Customer } from "@/types";

// // /**
// //  * Get all customers for a reseller with their order stats
// //  */
// // export async function getCustomers(resellerId: string): Promise<Customer[]> {
// //   const supabase = await createServerClient();

// //   const { data, error } = await supabase
// //     .from("reseller_customers")
// //     .select("*")
// //     .eq("reseller_id", resellerId)
// //     .order("created_at", { ascending: false });

// //   if (error) {
// //     console.error("Error fetching customers:", error);
// //     return [];
// //   }

// //   if (!data || data.length === 0) return [];

// //   // Get order stats for each customer
// //   const customersWithStats = await Promise.all(
// //     data.map(async (customer) => {
// //       const { data: orders, error: orderError } = await supabase
// //         .from("reseller_orders")
// //         .select("amount, created_at")
// //         .eq("reseller_id", resellerId)
// //         .eq("customer_email", customer.email)
// //         .order("created_at", { ascending: false });

// //       if (orderError) {
// //         return {
// //           ...customer,
// //           total_orders: 0,
// //           total_spent: 0,
// //           last_order: undefined,
// //         };
// //       }

// //       return {
// //         ...customer,
// //         total_orders: orders?.length || 0,
// //         total_spent: orders?.reduce((sum, o) => sum + o.amount, 0) || 0,
// //         last_order: orders?.[0]?.created_at || undefined,
// //       };
// //     }),
// //   );

// //   return customersWithStats;
// // }