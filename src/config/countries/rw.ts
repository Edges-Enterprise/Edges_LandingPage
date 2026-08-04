// src/config/countries/rw.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_RW: CountryConfig = {
  code: "rw",
  name: "Rwanda",
  nativeName: "Rwanda",
  flag: flags.Rwanda,
  flagEmoji: "🇷🇼",
  currency: "RWF",
  currencySymbol: "FRw",
  phoneCode: "+250",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-RW",
  timezone: "Africa/Kigali",
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
    payment: ["flutterwave"],
  },
  paymentGateway: {
    provider: "flutterwave",
    currency: "RWF",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "east_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/rw/apply",
  stats: {
    activeResellers: 200,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FRw 10,000 – FRw 20,000",
  },
};
