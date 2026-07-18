// src/config/countries/cm.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_CM: CountryConfig = {
  code: "cm",
  name: "Cameroon",
  nativeName: "Cameroun",
  flag: flags.Cameroon, // ✅ Updated
  flagEmoji: "🇨🇲",
  currency: "XAF",
  currencySymbol: "FCFA",
  phoneCode: "+237",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-CM",
  timezone: "Africa/Douala",
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
  applyUrl: "/cm/apply",
  stats: {
    activeResellers: 700,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FCFA 70,000 – FCFA 100,000",
  },
};
