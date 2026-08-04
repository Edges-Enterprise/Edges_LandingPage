// src/config/countries/gn.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_GN: CountryConfig = {
  code: "gn",
  name: "Guinea",
  nativeName: "Guinée",
  flag: flags.Guinea,
  flagEmoji: "🇬🇳",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+224",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-GN",
  timezone: "Africa/Conakry",
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
    currency: "XOF",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "xof",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/gn/apply",
  stats: {
    activeResellers: 120,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 50,000 – CFA 70,000",
  },
};
