// src/config/countries/ma.ts
import { CountryConfig } from "./index";

export const COUNTRY_MA: CountryConfig = {
  code: "ma",
  name: "Morocco",
  nativeName: "المغرب",
  flag: "🇲🇦",
  currency: "MAD",
  currencySymbol: "DH",
  phoneCode: "+212",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-MA",
  timezone: "Africa/Casablanca",
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
  applyUrl: "/ma/apply",
  stats: {
    activeResellers: 900,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "DH 1,500 – DH 2,500",
  },
};
