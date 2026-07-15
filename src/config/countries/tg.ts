// src/config/countries/tg.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_TG: CountryConfig = {
  code: "tg",
  name: "Togo",
  nativeName: "Togo",
  flag: flags.Togo as unknown as string, // ✅ SVG flag
  flagEmoji: "🇹🇬",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+228",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-TG",
  timezone: "Africa/Lome",
  defaultMarkup: 20,
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
    payment: ["flutterwave", "korapay"],
  },
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/tg/apply",
  stats: {
    activeResellers: 400,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 50,000 – CFA 80,000",
  },
};
