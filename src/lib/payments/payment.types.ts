// src/lib/payments/payment.types.ts

export type PaymentGatewayType = "xixapay" | "korapay" | "flutterwave";

export interface PaymentInitiateParams {
  resellerId: string;
  amount: number;
  currency: string;
  countryCode: string;
  source?: "web" | "app";
  metadata?: Record<string, any>;
}

export interface PaymentInitiateResult {
  success: boolean;
  reference: string;
  providerReference?: string;
  paymentUrl?: string;
  redirectUrl?: string;
  error?: string;
}

export interface PaymentWebhookData {
  reference: string;
  status: "completed" | "failed" | "pending";
  providerReference: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentGateway {
  // Initiate a payment
  initiatePayment(
    params: PaymentInitiateParams,
  ): Promise<PaymentInitiateResult>;

  // Verify webhook signature
  verifyWebhook(body: any, headers: Headers): Promise<boolean>;

  // Parse webhook data
  parseWebhook(body: any): PaymentWebhookData;

  // Get transaction status
  getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }>;

  // For virtual account (Xixapay specific)
  createVirtualAccount?(
    resellerId: string,
    countryCode: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }>;
}
