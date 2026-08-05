// src/lib/payments/index.ts
import { xixapay } from "./xixapay";
import { korapay } from "./korapay";
import { flutterwave } from "./flutterwave";
import { PaymentGateway, PaymentGatewayType } from "./payment.types";
import { getCountryConfig } from "@/config/countries";

const gateways: Record<PaymentGatewayType, PaymentGateway> = {
  xixapay,
  korapay,
  flutterwave,
};

export function getPaymentGateway(type: PaymentGatewayType): PaymentGateway {
  const gateway = gateways[type];
  if (!gateway) {
    throw new Error(`Payment gateway ${type} not found`);
  }
  return gateway;
}

export function getPaymentGatewayByCountry(
  countryCode: string,
): PaymentGateway {
  const config = getCountryConfig(countryCode);
  const provider = config.paymentGateway.provider as PaymentGatewayType;
  return getPaymentGateway(provider);
}

// Helper to check if gateway is Xixapay (has extra methods)
export function isXixapayGateway(
  gateway: PaymentGateway,
): gateway is PaymentGateway & {
  getBanks(): Promise<Array<{ bankName: string; bankCode: string }>>;
  verifyBankAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<{ success: boolean; accountName?: string; error?: string }>;
  processPayout(params: {
    resellerId: string;
    amount: number;
    bankCode: string;
    accountNumber: string;
    narration?: string;
  }): Promise<{ success: boolean; reference?: string; error?: string }>;
} {
  return gateway === xixapay;
}

export * from "./payment.types";
export { xixapay, korapay, flutterwave };

// // src/lib/payments/index.ts
// import { xixapay } from "./xixapay";
// import { korapay } from "./korapay";
// import { flutterwave } from "./flutterwave";
// import {
//   PaymentGateway,
//   PaymentGatewayType,
//   XixapayGateway,
// } from "./payment.types";
// import { getCountryConfig } from "@/config/countries";

// const gateways: Record<PaymentGatewayType, PaymentGateway> = {
//   xixapay,
//   korapay,
//   flutterwave,
// };

// export function getPaymentGateway(type: PaymentGatewayType): PaymentGateway {
//   const gateway = gateways[type];
//   if (!gateway) {
//     throw new Error(`Payment gateway ${type} not found`);
//   }
//   return gateway;
// }

// export function getPaymentGatewayByCountry(
//   countryCode: string,
// ): PaymentGateway {
//   const config = getCountryConfig(countryCode);
//   const provider = config.paymentGateway.provider as PaymentGatewayType;
//   return getPaymentGateway(provider);
// }

// // Helper to check if gateway is Xixapay (has extra methods)
// export function isXixapayGateway(
//   gateway: PaymentGateway,
// ): gateway is PaymentGateway & {
//   getBanks(): Promise<Array<{ bankName: string; bankCode: string }>>;
//   verifyBankAccount(
//     bankCode: string,
//     accountNumber: string,
//   ): Promise<{ success: boolean; accountName?: string; error?: string }>;
//   processPayout(params: {
//     resellerId: string;
//     amount: number;
//     bankCode: string;
//     accountNumber: string;
//     narration?: string;
//   }): Promise<{ success: boolean; reference?: string; error?: string }>;
// } {
//   return gateway === xixapay;
// }

// export * from "./payment.types";
// export { xixapay, korapay, flutterwave };

// // // src/lib/payments/index.ts
// // import { xixapay } from "./xixapay";
// // import { korapay } from "./korapay";
// // import { flutterwave } from "./flutterwave";
// // import { PaymentGateway, PaymentGatewayType } from "./payment.types";
// // import { getCountryConfig } from "@/config/countries";

// // const gateways: Record<PaymentGatewayType, PaymentGateway> = {
// //   xixapay,
// //   korapay,
// //   flutterwave,
// // };

// // export function getPaymentGateway(type: PaymentGatewayType): PaymentGateway {
// //   const gateway = gateways[type];
// //   if (!gateway) {
// //     throw new Error(`Payment gateway ${type} not found`);
// //   }
// //   return gateway;
// // }

// // export function getPaymentGatewayByCountry(
// //   countryCode: string,
// // ): PaymentGateway {
// //   const config = getCountryConfig(countryCode);
// //   const provider = config.paymentGateway.provider as PaymentGatewayType;
// //   return getPaymentGateway(provider);
// // }

// // export * from "./payment.types";
// // export { xixapay, korapay, flutterwave };

// // // // src/lib/payments/index.ts
// // // import { xixapay } from "./xixapay";
// // // import { korapay } from "./korapay";
// // // import { flutterwave } from "./flutterwave";
// // // import { PaymentGateway, PaymentGatewayType } from "./payment.types";
// // // import { getCountryConfig } from "@/config/countries";

// // // const gateways: Record<PaymentGatewayType, PaymentGateway> = {
// // //   xixapay,
// // //   korapay,
// // //   flutterwave,
// // // };

// // // export function getPaymentGateway(type: PaymentGatewayType): PaymentGateway {
// // //   const gateway = gateways[type];
// // //   if (!gateway) {
// // //     throw new Error(`Payment gateway ${type} not found`);
// // //   }
// // //   return gateway;
// // // }

// // // export function getPaymentGatewayByCountry(
// // //   countryCode: string,
// // // ): PaymentGateway {
// // //   const config = getCountryConfig(countryCode);
// // //   const provider = config.providers.payment[0] as PaymentGatewayType;
// // //   return getPaymentGateway(provider);
// // // }
