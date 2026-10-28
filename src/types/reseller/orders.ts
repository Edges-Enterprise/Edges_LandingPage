// src/types/reseller/orders.ts

export interface Order {
  id: string;
  reseller_id: string;
  customer_id?: string;
  customer_name: string;
  plan_id?: string;
  plan_name: string;
  amount: number;
  profit: number;
  status: string;
  payment_method?: string;
  transaction_reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// The order statuses the database accepts (global_orders_status_check).
export const ORDER_STATUSES = [
  "pending",
  "completed",
  "failed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  failed_orders: number;
  total_revenue: number;
  total_profit: number;
  average_order_value: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  reseller_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
}

export interface OrdersData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
    country_code: string;
  };
  orders: Order[];
  stats: OrderStats;
  statusHistory: Record<string, OrderStatusHistoryEntry[]>;
}
