// src/config/countries/gh.ts
import { CountryConfig } from "./index";

export const COUNTRY_GH: CountryConfig = {
  code: "gh",
  name: "Ghana",
  nativeName: "Ghana",
  flag: "🇬🇭",
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
  defaultMarkup: 20,
  features: {
    data: true,
    airtime: true,
    electricity: false,
    cableTV: false,
    betting: false,
  },
  providers: {
    data: ["accrahub"],
    airtime: ["accrahub"],
    payment: ["flutterwave", "korapay"],
  },
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
};
