// src/config/countries/cf.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_CF: CountryConfig = {
  code: "cf",
  name: "Central African Republic",
  nativeName: "République centrafricaine",
  flag: flags.CAR,
  flagEmoji: "🇨🇫",
  currency: "XAF",
  currencySymbol: "FCFA",
  phoneCode: "+236",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-CF",
  timezone: "Africa/Bangui",
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
  applyUrl: "/cf/apply",
  stats: {
    activeResellers: 100,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FCFA 50,000 – FCFA 80,000",
  },
};
