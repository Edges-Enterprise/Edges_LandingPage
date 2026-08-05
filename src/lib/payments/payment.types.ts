// src/lib/payments/payment.types.ts

export type PaymentGatewayType = "xixapay" | "korapay" | "flutterwave";

export interface PaymentInitiateParams {
  resellerId: string;
  amount: number;
  currency: string;
  countryCode: string;
  source?: "web" | "app";
  metadata?: Record<string, any>;
  // Korapay specific
  customer?: {
    name?: string;
    email: string;
  };
  mobileMoney?: {
    number: string;
    network?: string;
  };
  // Xixapay specific
  bankCode?: string;
  accountType?: "static" | "dynamic";
  id_type?: "nin" | "bvn";
  id_number?: string;
}

export interface PaymentInitiateResult {
  success: boolean;
  reference: string;
  providerReference?: string;
  paymentUrl?: string;
  redirectUrl?: string;
  authModel?: "OTP" | "STK_PROMPT" | "REDIRECT";
  error?: string;
}

export interface PaymentWebhookData {
  reference: string;
  status: "completed" | "failed" | "pending";
  providerReference: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  customer?: {
    name?: string;
    email?: string;
    customer_id?: string;
  };
  sender?: {
    name: string;
    account_number: string;
    bank: string;
  };
  receiver?: {
    name: string;
    account_number: string;
    bank: string;
  };
}

export interface PaymentGateway {
  initiatePayment(
    params: PaymentInitiateParams,
  ): Promise<PaymentInitiateResult>;
  verifyWebhook(body: any, headers: Headers): Promise<boolean>;
  parseWebhook(body: any): PaymentWebhookData;
  getTransactionStatus(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }>;

  // Optional methods that gateways may implement
  createVirtualAccount?(
    resellerId: string,
    countryCode: string,
  ): Promise<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }>;

  // Xixapay-specific optional methods
  getBanks?(): Promise<Array<{ bankName: string; bankCode: string }>>;
  verifyBankAccount?(
    bankCode: string,
    accountNumber: string,
    currency?: string,
  ): Promise<{ success: boolean; accountName?: string; error?: string }>;
  processPayout?(params: {
    resellerId: string;
    amount: number;
    currency: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    narration?: string;
  }): Promise<{ success: boolean; reference?: string; error?: string }>;

  // Korapay-specific optional methods
  getPayoutStatus?(reference: string): Promise<{
    status: "completed" | "failed" | "pending";
    amount?: number;
    currency?: string;
    providerReference?: string;
  }>;
  processBulkPayout?(params: {
    resellerId: string;
    batchReference: string;
    currency: string;
    payouts: Array<{
      reference: string;
      amount: number;
      bankCode: string;
      accountNumber: string;
      customerName: string;
      customerEmail: string;
      narration?: string;
    }>;
  }): Promise<{ success: boolean; reference?: string; error?: string }>;
  getMobileMoneyNetworks?(countryCode: string): string[];
  supportsMobileMoney?(countryCode: string): boolean;
  supportsBankTransfer?(countryCode: string): boolean;
}

// // src/lib/payments/payment.types.ts

// export type PaymentGatewayType = "xixapay" | "korapay" | "flutterwave";

// export interface PaymentInitiateParams {
//   resellerId: string;
//   amount: number;
//   currency: string;
//   countryCode: string;
//   source?: "web" | "app";
//   metadata?: Record<string, any>;
//   // Korapay specific
//   customer?: {
//     name?: string;
//     email: string;
//   };
//   mobileMoney?: {
//     number: string;
//     network?: string;
//   };
//   // Xixapay specific
//   bankCode?: string;
//   accountType?: "static" | "dynamic";
//   id_type?: "nin" | "bvn";
//   id_number?: string;
// }

// export interface PaymentInitiateResult {
//   success: boolean;
//   reference: string;
//   providerReference?: string;
//   paymentUrl?: string;
//   redirectUrl?: string;
//   authModel?: "OTP" | "STK_PROMPT" | "REDIRECT";
//   error?: string;
// }

// export interface PaymentWebhookData {
//   reference: string;
//   status: "completed" | "failed" | "pending";
//   providerReference: string;
//   amount?: number;
//   currency?: string;
//   metadata?: Record<string, any>;
//   customer?: {
//     name?: string;
//     email?: string;
//     customer_id?: string;
//   };
//   sender?: {
//     name: string;
//     account_number: string;
//     bank: string;
//   };
//   receiver?: {
//     name: string;
//     account_number: string;
//     bank: string;
//   };
// }

// export interface PaymentGateway {
//   initiatePayment(
//     params: PaymentInitiateParams,
//   ): Promise<PaymentInitiateResult>;
//   verifyWebhook(body: any, headers: Headers): Promise<boolean>;
//   parseWebhook(body: any): PaymentWebhookData;
//   getTransactionStatus(reference: string): Promise<{
//     status: "completed" | "failed" | "pending";
//     amount?: number;
//     currency?: string;
//     providerReference?: string;
//   }>;
//   createVirtualAccount?(
//     resellerId: string,
//     countryCode: string,
//   ): Promise<{
//     accountNumber: string;
//     accountName: string;
//     bankName: string;
//   }>;
//   // Optional Xixapay-specific methods
//   getBanks?(): Promise<Array<{ bankName: string; bankCode: string }>>;
//   verifyBankAccount?(
//     bankCode: string,
//     accountNumber: string,
//   ): Promise<{ success: boolean; accountName?: string; error?: string }>;
//   processPayout?(params: {
//     resellerId: string;
//     amount: number;
//     bankCode: string;
//     accountNumber: string;
//     narration?: string;
//   }): Promise<{ success: boolean; reference?: string; error?: string }>;
// }

// // // src/lib/payments/payment.types.ts

// // export type PaymentGatewayType = "xixapay" | "korapay" | "flutterwave";

// // export interface PaymentInitiateParams {
// //   resellerId: string;
// //   amount: number;
// //   currency: string;
// //   countryCode: string;
// //   source?: "web" | "app";
// //   metadata?: Record<string, any>;
// //   // Korapay specific
// //   customer?: {
// //     name?: string;
// //     email: string;
// //   };
// //   mobileMoney?: {
// //     number: string;
// //     network?: string;
// //   };
// //   // Xixapay specific
// //   bankCode?: string;
// //   accountType?: "static" | "dynamic";
// //   id_type?: "nin" | "bvn";
// //   id_number?: string;
// // }

// // export interface PaymentInitiateResult {
// //   success: boolean;
// //   reference: string;
// //   providerReference?: string;
// //   paymentUrl?: string;
// //   redirectUrl?: string;
// //   authModel?: "OTP" | "STK_PROMPT" | "REDIRECT";
// //   error?: string;
// // }

// // export interface PaymentWebhookData {
// //   reference: string;
// //   status: "completed" | "failed" | "pending";
// //   providerReference: string;
// //   amount?: number;
// //   currency?: string;
// //   metadata?: Record<string, any>;
// //   customer?: {
// //     name?: string;
// //     email?: string;
// //     customer_id?: string;
// //   };
// //   sender?: {
// //     name: string;
// //     account_number: string;
// //     bank: string;
// //   };
// //   receiver?: {
// //     name: string;
// //     account_number: string;
// //     bank: string;
// //   };
// // }

// // export interface PaymentGateway {
// //   initiatePayment(
// //     params: PaymentInitiateParams,
// //   ): Promise<PaymentInitiateResult>;
// //   verifyWebhook(body: any, headers: Headers): Promise<boolean>;
// //   parseWebhook(body: any): PaymentWebhookData;
// //   getTransactionStatus(reference: string): Promise<{
// //     status: "completed" | "failed" | "pending";
// //     amount?: number;
// //     currency?: string;
// //     providerReference?: string;
// //   }>;
// //   createVirtualAccount?(
// //     resellerId: string,
// //     countryCode: string,
// //   ): Promise<{
// //     accountNumber: string;
// //     accountName: string;
// //     bankName: string;
// //   }>;
// // }

// // export interface XixapayGateway extends PaymentGateway {
// //   getBanks(): Promise<Array<{ bankName: string; bankCode: string }>>;
// //   verifyBankAccount(
// //     bankCode: string,
// //     accountNumber: string,
// //   ): Promise<{ success: boolean; accountName?: string; error?: string }>;
// //   processPayout(params: {
// //     resellerId: string;
// //     amount: number;
// //     bankCode: string;
// //     accountNumber: string;
// //     narration?: string;
// //   }): Promise<{ success: boolean; reference?: string; error?: string }>;
// // }

// // // // src/lib/payments/payment.types.ts

// // // export type PaymentGatewayType = "xixapay" | "korapay" | "flutterwave";

// // // export interface PaymentInitiateParams {
// // //   resellerId: string;
// // //   amount: number;
// // //   currency: string;
// // //   countryCode: string;
// // //   source?: "web" | "app";
// // //   metadata?: Record<string, any>;
// // // }

// // // export interface PaymentInitiateResult {
// // //   success: boolean;
// // //   reference: string;
// // //   providerReference?: string;
// // //   paymentUrl?: string;
// // //   redirectUrl?: string;
// // //   error?: string;
// // // }

// // // export interface PaymentWebhookData {
// // //   reference: string;
// // //   status: "completed" | "failed" | "pending";
// // //   providerReference: string;
// // //   amount?: number;
// // //   currency?: string;
// // //   metadata?: Record<string, any>;
// // // }

// // // export interface PaymentGateway {
// // //   // Initiate a payment
// // //   initiatePayment(
// // //     params: PaymentInitiateParams,
// // //   ): Promise<PaymentInitiateResult>;

// // //   // Verify webhook signature
// // //   verifyWebhook(body: any, headers: Headers): Promise<boolean>;

// // //   // Parse webhook data
// // //   parseWebhook(body: any): PaymentWebhookData;

// // //   // Get transaction status
// // //   getTransactionStatus(reference: string): Promise<{
// // //     status: "completed" | "failed" | "pending";
// // //     amount?: number;
// // //     currency?: string;
// // //     providerReference?: string;
// // //   }>;

// // //   // For virtual account (Xixapay specific)
// // //   createVirtualAccount?(
// // //     resellerId: string,
// // //     countryCode: string,
// // //   ): Promise<{
// // //     accountNumber: string;
// // //     accountName: string;
// // //     bankName: string;
// // //   }>;
// // // }
