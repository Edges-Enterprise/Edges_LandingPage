// src/config/countries/cd.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_CD: CountryConfig = {
  code: "cd",
  name: "DRC",
  nativeName: "République Démocratique du Congo",
  flag: flags.DRC as unknown as string, // ✅ SVG flag
  flagEmoji: "🇨🇩",
  currency: "CDF",
  currencySymbol: "FC",
  phoneCode: "+243",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-CD",
  timezone: "Africa/Kinshasa",
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
  applyUrl: "/cd/apply",
  stats: {
    activeResellers: 500,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FC 100,000 – FC 150,000",
  },
};
