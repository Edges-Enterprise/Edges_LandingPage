// src/config/countries/ci.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_CI: CountryConfig = {
  code: "ci",
  name: "Ivory Coast",
  nativeName: "Côte d'Ivoire",
  flag: flags.IvoryCoast,
  flagEmoji: "🇨🇮",
  currency: "XOF",
  currencySymbol: "₣",
  phoneCode: "+225",
  phoneNumber: { minDigits: 10, maxDigits: 10 },
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-CI",
  timezone: "Africa/Abidjan",
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
  applyUrl: "/ci/apply",
  stats: {
    activeResellers: 400,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₣80,000 – ₣120,000",
  },
  telecoms: [
    { id: "moov", name: "Moov", code: "MOOV" },
    { id: "mtn", name: "MTN", code: "MTN" },
    { id: "orange", name: "Orange", code: "ORANGE" },
  ],
};
