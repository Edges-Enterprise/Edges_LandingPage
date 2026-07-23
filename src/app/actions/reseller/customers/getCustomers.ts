// app/actions/reseller/customers/getCustomers.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Customer } from "@/types";

/**
 * Get all customers for a reseller with their order stats
 * Maps auth_email back to original email for display
 * Uses reseller_customer_transactions for accurate stats
 */
export async function getCustomers(resellerId: string): Promise<Customer[]> {
  const supabase = await createServerClient();

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

  // ✅ Get customer IDs for lookup
  const customerIds = customers.map((c) => c.id);

  // ✅ Get customer transactions (purchases only) for order stats
  const { data: transactions } = await supabase
    .from("reseller_customer_transactions")
    .select("customer_id, type, net_amount, created_at")
    .eq("reseller_id", resellerId)
    .in("customer_id", customerIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  // ✅ Group transactions by customer
  const statsByCustomer: Record<
    string,
    { total_spent: number; order_count: number; last_order: string | null }
  > = {};

  if (transactions) {
    for (const tx of transactions) {
      // Only count purchases for order stats
      if (tx.type === "purchase") {
        if (!statsByCustomer[tx.customer_id]) {
          statsByCustomer[tx.customer_id] = {
            total_spent: 0,
            order_count: 0,
            last_order: null,
          };
        }
        statsByCustomer[tx.customer_id].total_spent += tx.net_amount;
        statsByCustomer[tx.customer_id].order_count += 1;
        if (!statsByCustomer[tx.customer_id].last_order) {
          statsByCustomer[tx.customer_id].last_order = tx.created_at;
        }
      }
    }
  }

  // ✅ Get wallets for total_spent as well (for customers who haven't made purchases)
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

  return customers.map((customer) => {
    const stats = statsByCustomer[customer.id] || {
      total_spent: 0,
      order_count: 0,
      last_order: null,
    };
    const walletTotal = walletMap[customer.id] || 0;

    return {
      ...customer,
      email: customer.email,
      total_orders: stats.order_count,
      total_spent: Math.max(walletTotal, stats.total_spent),
      last_order: stats.last_order || customer.last_purchase_at || undefined,
    };
  });
}
