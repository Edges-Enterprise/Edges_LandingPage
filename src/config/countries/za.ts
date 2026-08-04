// src/config/countries/za.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_ZA: CountryConfig = {
  code: "za",
  name: "South Africa",
  nativeName: "South Africa",
  flag: flags.SouthAfrica,
  flagEmoji: "🇿🇦",
  currency: "ZAR",
  currencySymbol: "R",
  phoneCode: "+27",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-ZA",
  timezone: "Africa/Johannesburg",
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
    currency: "ZAR",
    methods: ["bank_transfer"],
  },
  serviceProvider: "zendit",
  region: "southern_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/za/apply",
  stats: {
    activeResellers: 300,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "R 1,500 – R 2,500",
  },
};
