// src/config/countries/gh.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_GH: CountryConfig = {
  code: "gh",
  name: "Ghana",
  nativeName: "Ghana",
  flag: flags.Ghana,
  flagEmoji: "🇬🇭",
  currency: "GHS",
  currencySymbol: "₵",
  phoneCode: "+233",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-GH",
  timezone: "Africa/Accra",
  defaultMarkup: 0,
  features: {
    data: true,
    airtime: true,
    electricity: false,
    cableTV: false,
    betting: false,
  },
  providers: {
    data: ["accragh"],
    airtime: ["accragh"],
    payment: ["korapay"],
  },
  paymentGateway: {
    provider: "korapay",
    currency: "GHS",
    methods: ["mobile_money", "bank_transfer"],
  },
  serviceProvider: "accragh",
  region: "west_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/gh/apply",
  stats: {
    activeResellers: 1200,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₵1,500 – ₵2,500",
  },
  telecoms: [
    { id: "airtel_tigo", name: "AirtelTigo", code: "AIRTEL_TIGO" },
    { id: "mtn", name: "MTN", code: "MTN" },
    { id: "telecel", name: "Telecel", code: "TELECEL" },
  ],
};

