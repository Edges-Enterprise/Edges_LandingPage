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

// ── Reseller ──────────────────────────────────────
export interface ResellerFormData {
  storeName: string
  email: string
  theme: 'light' | 'dark' | 'custom'
  androidApp: boolean
}

export interface Reseller {
  id: string
  auth_user_id: string | null
  email: string
  store_name: string
  theme: 'light' | 'dark' | 'custom'
  android_app: boolean
  status: 'pending' | 'active' | 'suspended'
  created_at: string
  updated_at: string
}

export interface StoreNameCheckResult {
  available: boolean
  error?: string
}

export interface CreateResellerResult {
  success?: boolean
  error?: string
  resellerId?: string
  storeUrl?: string
  message?: string
}

// ── Plans ─────────────────────────────────────────
export interface BasePlan {
  id: string
  name: string
  category: 'data' | 'airtime'
  base_price: number
  description?: string
  validity?: string
  is_active: boolean
  created_at: string
}

export interface ResellerPlanConfig {
  id: string
  reseller_id: string
  plan_id: string
  enabled: boolean
  markup_type: 'fixed' | 'percentage'
  markup_value: number
  plan?: BasePlan
  created_at: string
  updated_at: string
}

export interface PlanWithPricing extends ResellerPlanConfig {
  finalPrice: number
  profit: number
}

export interface StorePlan {
  id: string
  name: string
  category: 'data' | 'airtime'
  price: number
  description?: string
  validity?: string
}

// ── Wallet ────────────────────────────────────────
export interface ResellerWallet {
  id: string
  reseller_id: string
  balance: number
  total_sales: number
  total_profit: number
  created_at: string
  updated_at: string
}

// ── Orders ────────────────────────────────────────
export interface Order {
  id: string
  reseller_id: string
  customer_email: string
  plan_id: string
  amount: number
  profit: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  plan?: BasePlan
}

// ── Transactions ──────────────────────────────────
export interface Transaction {
  id: string
  reseller_id: string
  amount: number
  type: 'deposit' | 'purchase' | 'withdrawal'
  status: 'pending' | 'completed' | 'failed'
  reference?: string
  metadata?: Record<string, any>
  created_at: string
}

// ── Customers ─────────────────────────────────────
export interface Customer {
  id: string
  reseller_id: string
  email: string
  first_name?: string
  last_name?: string
  auth_user_id?: string
  total_orders?: number
  total_spent?: number
  last_order?: string
  created_at: string
}

// ── Dashboard ─────────────────────────────────────
export interface DashboardStats {
  totalSales: number
  totalProfit: number
  totalOrders: number
  activeCustomers: number
  walletBalance: number
  recentOrders: Order[]
}

// ── App Build ─────────────────────────────────────
export interface ResellerAppConfig {
  id: string
  reseller_id: string
  config: AppBuildConfig
  build_status: 'pending' | 'configuring' | 'building' | 'completed' | 'failed'
  build_id?: string
  apk_url?: string
  created_at: string
  updated_at: string
}

export interface AppBuildConfig {
  id: string
  resellerId: string
  storeName: string
  appName: string
  slug: string
  theme: AppTheme
  assets: AppAssets
  config: AppPackageConfig
}

export interface AppTheme {
  primary: string
  secondary: string
  background: string
  text: string
  accent: string
  statusBar: 'light' | 'dark'
}

export interface AppAssets {
  icon: string
  splash: string
  logo: string
  adaptiveIcon: string
}

export interface AppPackageConfig {
  androidPackageName: string
  iosBundleId: string
  version: string
  buildNumber: number
  apiBaseUrl: string
  storeUrl: string
}

// ── API Response Wrappers ─────────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}