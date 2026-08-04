// src/config/countries/ne.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_NE: CountryConfig = {
  code: "ne",
  name: "Niger",
  nativeName: "Niger",
  flag: flags.Niger,
  flagEmoji: "🇳🇪",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+227",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-NE",
  timezone: "Africa/Niamey",
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
  applyUrl: "/ne/apply",
  stats: {
    activeResellers: 80,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 40,000 – CFA 60,000",
  },
};
