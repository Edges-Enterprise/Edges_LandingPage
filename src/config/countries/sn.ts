// src/config/countries/sn.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_SN: CountryConfig = {
  code: "sn",
  name: "Senegal",
  nativeName: "Sénégal",
  flag: flags.Senegal,
  flagEmoji: "🇸🇳",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+221",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-SN",
  timezone: "Africa/Dakar",
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
  applyUrl: "/sn/apply",
  stats: {
    activeResellers: 300,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 70,000 – CFA 100,000",
  },
};
