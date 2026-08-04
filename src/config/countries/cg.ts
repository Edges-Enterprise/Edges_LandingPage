// src/config/countries/cg.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_CG: CountryConfig = {
  code: "cg",
  name: "Congo",
  nativeName: "Congo",
  flag: flags.Congo,
  flagEmoji: "🇨🇬",
  currency: "XAF",
  currencySymbol: "FCFA",
  phoneCode: "+242",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-CG",
  timezone: "Africa/Brazzaville",
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
  applyUrl: "/cg/apply",
  stats: {
    activeResellers: 150,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FCFA 50,000 – FCFA 70,000",
  },
};
