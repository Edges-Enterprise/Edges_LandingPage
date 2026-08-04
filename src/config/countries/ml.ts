// src/config/countries/ml.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_ML: CountryConfig = {
  code: "ml",
  name: "Mali",
  nativeName: "Mali",
  flag: flags.Mali,
  flagEmoji: "🇲🇱",
  currency: "XOF",
  currencySymbol: "CFA",
  phoneCode: "+223",
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-ML",
  timezone: "Africa/Bamako",
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
  applyUrl: "/ml/apply",
  stats: {
    activeResellers: 100,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "CFA 40,000 – CFA 60,000",
  },
};
