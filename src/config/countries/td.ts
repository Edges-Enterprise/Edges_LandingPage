// src/config/countries/td.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_TD: CountryConfig = {
  code: "td",
  name: "Chad",
  nativeName: "Tchad",
  flag: flags.Chad,
  flagEmoji: "🇹🇩",
  currency: "XAF",
  currencySymbol: "₣",
  phoneCode: "+235",
  phoneNumber: { minDigits: 8, maxDigits: 8 },
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-TD",
  timezone: "Africa/Ndjamena",
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
  applyUrl: "/td/apply",
  stats: {
    activeResellers: 80,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₣40,000 – ₣60,000",
  },
    telecoms: [
    { id: "mtn", name: "MTN", code: "MTN" },
    { id: "orange", name: "Orange", code: "ORANGE" },
  ],
};
