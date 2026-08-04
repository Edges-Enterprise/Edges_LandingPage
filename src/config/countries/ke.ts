// src/config/countries/ke.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_KE: CountryConfig = {
  code: "ke",
  name: "Kenya",
  nativeName: "Kenya",
  flag: flags.Kenya,
  flagEmoji: "🇰🇪",
  currency: "KES",
  currencySymbol: "KSh",
  phoneCode: "+254",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-KE",
  timezone: "Africa/Nairobi",
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
    currency: "KES",
    methods: ["mobile_money", "bank_transfer"],
  },
  serviceProvider: "zendit",
  region: "east_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/ke/apply",
  stats: {
    activeResellers: 500,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "KSh 15,000 – KSh 25,000",
  },
};
