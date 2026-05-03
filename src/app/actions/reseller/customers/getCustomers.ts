// app/actions/reseller/customers/getCustomers.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Customer } from "@/types";

/**
 * Get all customers for a reseller with their order stats
 */
export async function getCustomers(resellerId: string): Promise<Customer[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_customers")
    .select("*")
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get order stats for each customer
  const customersWithStats = await Promise.all(
    data.map(async (customer) => {
      const { data: orders, error: orderError } = await supabase
        .from("reseller_orders")
        .select("amount, created_at")
        .eq("reseller_id", resellerId)
        .eq("customer_email", customer.email)
        .order("created_at", { ascending: false });

      if (orderError) {
        return {
          ...customer,
          total_orders: 0,
          total_spent: 0,
          last_order: undefined,
        };
      }

      return {
        ...customer,
        total_orders: orders?.length || 0,
        total_spent: orders?.reduce((sum, o) => sum + o.amount, 0) || 0,
        last_order: orders?.[0]?.created_at || undefined,
      };
    }),
  );

  return customersWithStats;
}