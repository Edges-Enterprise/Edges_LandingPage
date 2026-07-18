// src/config/countries/zm.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_ZM: CountryConfig = {
  code: "zm",
  name: "Zambia",
  nativeName: "Zambia",
  flag: flags.Zambia, // ✅ SVG flag
  flagEmoji: "🇿🇲",
  currency: "ZMW",
  currencySymbol: "ZK",
  phoneCode: "+260",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-ZM",
  timezone: "Africa/Lusaka",
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
    payment: ["flutterwave", "juicyway"],
  },
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/zm/apply",
  stats: {
    activeResellers: 800,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "ZK 1,200 – ZK 2,000",
  },
};
