// src/config/countries/bf.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_BF: CountryConfig = {
  code: "bf",
  name: "Burkina Faso",
  nativeName: "Burkina Faso",
  flag: flags.BurkinaFaso,
  flagEmoji: "🇧🇫",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+226",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-BF",
  timezone: "Africa/Ouagadougou",
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
  applyUrl: "/bf/apply",
  stats: {
    activeResellers: 150,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 50,000 – CFA 80,000",
  },
};
