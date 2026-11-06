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

/**
 * Providers that can take a USD charge. Korapay holds USD but its checkout
 * channel is disabled on the live account — `POST /charges/initialize` with
 * `currency:"USD"` returns `409 AA021 "You don't have any channel enabled
 * for checkout payment"` while NGN/GHS/KES succeed — so USD never routes
 * there. Flutterwave's standard payment endpoint returns a hosted link for
 * USD (and its ACH method is documented for USD/ZAR).
 */
const USD_CAPABLE_PROVIDERS: PaymentGatewayType[] = ["flutterwave"];

/**
 * The gateway to actually charge with, which is not always the country's
 * configured one. A USD charge must go to a USD-capable provider: a country
 * whose configured provider is Korapay would otherwise fail at the gateway
 * with AA021. Every other currency keeps the country's configured provider.
 */
export function resolvePaymentGatewayType(
  countryCode: string,
  currency?: string,
): PaymentGatewayType {
  const config = getCountryConfig(countryCode);
  const configured = config.paymentGateway.provider as PaymentGatewayType;
  if (currency?.toUpperCase() === "USD") {
    return USD_CAPABLE_PROVIDERS.includes(configured)
      ? configured
      : USD_CAPABLE_PROVIDERS[0];
  }
  return configured;
}

export function resolvePaymentGateway(
  countryCode: string,
  currency?: string,
): PaymentGateway {
  return getPaymentGateway(resolvePaymentGatewayType(countryCode, currency));
}

/** True when a charge in this currency must not be sent to `provider`. */
export function providerSupportsCurrency(
  provider: PaymentGatewayType,
  currency: string,
): boolean {
  if (currency.toUpperCase() === "USD") {
    return USD_CAPABLE_PROVIDERS.includes(provider);
  }
  return true;
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
