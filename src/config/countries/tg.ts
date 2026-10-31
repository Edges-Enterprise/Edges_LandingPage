// src/config/countries/tg.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_TG: CountryConfig = {
  code: "tg",
  name: "Togo",
  nativeName: "Togo",
  flag: flags.Togo,
  flagEmoji: "🇹🇬",
  currency: "XOF",
  currencySymbol: "₣",
  phoneCode: "+228",
  phoneNumber: { minDigits: 8, maxDigits: 8 },
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-TG",
  timezone: "Africa/Lome",
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
  applyUrl: "/tg/apply",
  stats: {
    activeResellers: 400,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₣50,000 – ₣80,000",
  }, 
  telecoms: [
  { id: "moov", name: "Moov", code: "MOOV" },
  { id: "togocel", name: "Togocel", code: "TOGOCEL" },
],
};
