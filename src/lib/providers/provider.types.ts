// src/lib/providers/provider.types.ts

export type ServiceProviderType = "lizzysub" | "accragh" | "zendit";

export interface PurchaseDataParams {
  resellerId: string;
  planId: string;
  phoneNumber: string;
  amount: number;
  network?: string;
  countryCode: string;
  metadata?: Record<string, any>;
}

export interface PurchaseDataResult {
  success: boolean;
  reference: string;
  providerReference?: string;
  status: "pending" | "completed" | "failed";
  error?: string;
  metadata?: Record<string, any>;
}

export interface GetPlansParams {
  resellerId: string;
  countryCode: string;
  category?: string;
  network?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  profit: number;
  category: string;
  network?: string;
  dataAmount?: string;
  validity?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ServiceProvider {
  // Purchase data/airtime
  purchaseData(params: PurchaseDataParams): Promise<PurchaseDataResult>;

  // Get available plans from provider
  getPlans(params: GetPlansParams): Promise<{
    success: boolean;
    data?: Plan[];
    error?: string;
  }>;

  // Get transaction status
  getTransactionStatus(reference: string): Promise<{
    status: "pending" | "completed" | "failed";
    providerReference?: string;
    error?: string;
  }>;

  // Verify phone number (if supported)
  verifyPhoneNumber?(
    phoneNumber: string,
    countryCode: string,
  ): Promise<{
    success: boolean;
    network?: string;
    error?: string;
  }>;

  // Get balance (if supported)
  getBalance?(): Promise<{
    balance: number;
    currency: string;
  }>;
}
