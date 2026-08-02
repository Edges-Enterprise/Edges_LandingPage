// src/types/storefront/index.ts

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  category: string;
  network?: string;
  price: number;
  base_price: number;
  profit: number;
  markup_percent: number;
  validity?: string;
  data_amount?: string;
  is_active: boolean;
  is_featured: boolean;
}

export interface StoreData {
  application: {
    id: string;
    store_name: string;
    store_slug: string;
    brand_color: string;
    logo_url?: string;
    country_code: string;
    phone?: string;
  };
  products: StoreProduct[];
  categories: string[];
  networks: string[];
  settings: {
    welcome_message?: string;
    contact_email?: string;
    contact_phone?: string;
    store_status: "active" | "inactive" | "maintenance";
    theme: "light" | "dark";
  };
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  network?: string;
  category: string;
  delivery_details?: string;
}

export interface CheckoutData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: CartItem[];
  total: number;
}
