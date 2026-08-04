// src/config/countries/ug.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_UG: CountryConfig = {
  code: "ug",
  name: "Uganda",
  nativeName: "Uganda",
  flag: flags.Uganda,
  flagEmoji: "🇺🇬",
  currency: "UGX",
  currencySymbol: "USh",
  phoneCode: "+256",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-UG",
  timezone: "Africa/Kampala",
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
    payment: ["flutterwave"],
  },
  paymentGateway: {
    provider: "flutterwave",
    currency: "UGX",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "east_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/ug/apply",
  stats: {
    activeResellers: 180,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "USh 20,000 – USh 35,000",
  },
};
