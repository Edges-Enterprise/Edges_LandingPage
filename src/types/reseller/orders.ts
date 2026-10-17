// src/types/reseller/orders.ts

export interface Order {
  id: string;
  reseller_id: string;
  customer_id?: string;
  order_number?: string;
  plan_id?: string;
  plan_name?: string;
  plan_category?: string;
  network?: string;
  amount: number;
  cost: number;
  profit: number;
  markup_percent: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_details?: string;
  status: string;
  payment_status: string;
  transaction_id?: string;
  provider_reference?: string;
  request_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface OrderStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  failed_orders: number;
  total_revenue: number;
  total_profit: number;
  average_order_value: number;
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
}
