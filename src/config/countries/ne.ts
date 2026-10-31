// src/config/countries/ne.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_NE: CountryConfig = {
  code: "ne",
  name: "Niger",
  nativeName: "Niger",
  flag: flags.Niger,
  flagEmoji: "🇳🇪",
  currency: "XOF",
  currencySymbol: "₣",
  phoneCode: "+227",
  phoneNumber: { minDigits: 8, maxDigits: 8 },
  language: {
    code: "fr",
    name: "French",
    direction: "ltr",
  },
  locale: "fr-NE",
  timezone: "Africa/Niamey",
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
  applyUrl: "/ne/apply",
  stats: {
    activeResellers: 80,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₣40,000 – ₣60,000",
  },
  telecoms: [
    { id: "airtel", name: "Airtel", code: "AIRTEL" },
    { id: "moov", name: "Moov", code: "MOOV" },
    { id: "orange", name: "Orange", code: "ORANGE" },
  ],
};
