// src/config/countries/ga.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_GA: CountryConfig = {
  code: "ga",
  name: "Gabon",
  nativeName: "Gabon",
  flag: flags.Gabon,
  flagEmoji: "🇬🇦",
  currency: "XAF",
  currencySymbol: "FCFA",
  phoneCode: "+241",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-GA",
  timezone: "Africa/Libreville",
  defaultMarkup: 0,
  features: {
    data: true,
    airtime: true,
    electricity: false,
    cableTV: false,
    betting: false,
  },
  providers: {
    data: ["zendit"],
    airtime: ["zendit"],
    payment: ["korapay"],
  },
  paymentGateway: {
    provider: "korapay",
    currency: "XAF",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "xaf",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/ga/apply",
  stats: {
    activeResellers: 120,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FCFA 50,000 – FCFA 80,000",
  },
};
