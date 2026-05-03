// types/index.ts

export interface ResellerFormData {
  storeName: string;
  email: string;
  theme: "light" | "dark" | "custom";
  androidApp: boolean;
}

export interface Reseller {
  id: string;
  auth_user_id: string | null;
  email: string;
  store_name: string;
  theme: "light" | "dark" | "custom";
  android_app: boolean;
  status: "pending" | "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface ResellerWallet {
  id: string;
  reseller_id: string;
  balance: number;
  total_sales: number;
  total_profit: number;
}

export interface StoreNameCheckResult {
  available: boolean;
  error?: string;
}

export interface CreateResellerResult {
  success?: boolean;
  error?: string;
  resellerId?: string;
  storeUrl?: string;
  message?: string;
}
