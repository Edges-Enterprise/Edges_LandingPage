// src/types/reseller/customers.ts

export interface Customer {
  id: string;
  reseller_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  customer_type: string;
  status: string;
  auth_user_id?: string;
  customer_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  new_customers_30d: number;
  top_customers?: Customer[]; // Made optional with ?
}

export interface CustomersData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
    country_code: string;
  };
  customers: Customer[];
  stats: CustomerStats;
}
