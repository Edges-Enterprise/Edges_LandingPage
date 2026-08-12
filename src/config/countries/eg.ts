// src/config/countries/eg.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_EG: CountryConfig = {
  code: "eg",
  name: "Egypt",
  nativeName: "مصر",
  flag: flags.Egypt, // ✅ SVG flag
  flagEmoji: "🇪🇬",
  currency: "EGP",
  currencySymbol: "E£",
  phoneCode: "+20",
  language: {
    code: "ar",
    name: "Arabic",
    direction: "rtl",
  },
  locale: "ar-EG",
  timezone: "Africa/Cairo",
  defaultMarkup: 0,
  features: {
    data: true,
    airtime: true,
    electricity: false,
    cableTV: false,
    betting: false,
  },
  paymentGateway: {
    provider: "korapay",
    currency: "EGP",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "north_africa",
  providers: {
    data: ["zendit"],
    airtime: ["zendit"],
    payment: ["korapay"],
  },
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/eg/apply",
  stats: {
    activeResellers: 600,
    apkDeliveryDays: "٣–٥",
    storeGoesLive: "فوري",
    monthlyProfit: "E£ 1,500 – E£ 2,500",
  },
  telecoms: [
    { id: "mtn", name: "MTN", code: "MTN" },
    { id: "orange", name: "Orange", code: "ORANGE" },
    { id: "moov", name: "Moov", code: "MOOV" },
    { id: "wave", name: "Wave", code: "WAVE" },
  ],
};
