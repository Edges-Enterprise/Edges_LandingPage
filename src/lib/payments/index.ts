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
  const provider = config.providers.payment[0] as PaymentGatewayType;
  return getPaymentGateway(provider);
}
