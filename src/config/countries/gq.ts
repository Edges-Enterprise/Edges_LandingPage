// src/config/countries/gq.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_GQ: CountryConfig = {
  code: "gq",
  name: "Equatorial Guinea",
  nativeName: "Guinea Ecuatorial",
  flag: flags.EquatorialGuinea,
  flagEmoji: "🇬🇶",
  currency: "XAF",
  currencySymbol: "FCFA",
  phoneCode: "+240",
  language: {
    code: "es",
    name: "Spanish",
    direction: "ltr",
  },
  locale: "es-GQ",
  timezone: "Africa/Malabo",
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
    currency: "XAF",
    methods: ["mobile_money"],
  },
  serviceProvider: "zendit",
  region: "xaf",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg"],
  },
  applyUrl: "/gq/apply",
  stats: {
    activeResellers: 60,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "FCFA 40,000 – FCFA 60,000",
  },
};
