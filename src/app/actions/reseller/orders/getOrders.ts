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

  const { data, error } = await supabase
    .from("reseller_orders")
    .select(
      `
      *,
      plan:plan_id (id, name, category, base_price)
    `,
    )
    .eq("reseller_id", resellerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  return data || [];
}

/**
 * Get recent orders (last 5)
 */
export async function getRecentOrders(resellerId: string): Promise<Order[]> {
  return getOrders(resellerId, 5);
}