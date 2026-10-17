// src/lib/providers/index.ts
import { lizzysub } from "./lizzysub";
import { accragh } from "./accragh";
import { zendit } from "./zendit";
import { ServiceProvider, ServiceProviderType } from "./provider.types";
import { getCountryConfig } from "@/config/countries";

const providers: Record<ServiceProviderType, ServiceProvider> = {
  lizzysub,
  accragh,
  zendit,
};

export function getServiceProvider(type: ServiceProviderType): ServiceProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Service provider ${type} not found`);
  }
  return provider;
}

export function getServiceProviderByCountry(
  countryCode: string,
): ServiceProvider {
  const config = getCountryConfig(countryCode);
  const provider = config.serviceProvider as ServiceProviderType;
  return getServiceProvider(provider);
}

export * from "./provider.types";
export { lizzysub, accragh, zendit };
