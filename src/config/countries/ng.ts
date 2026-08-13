// src/config/countries/ng.ts
import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_NG: CountryConfig = {
  code: "ng",
  name: "Nigeria",
  nativeName: "Nigeria",
  flag: flags.Nigeria,
  flagEmoji: "🇳🇬",
  currency: "NGN",
  currencySymbol: "₦",
  phoneCode: "+234",
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-NG",
  timezone: "Africa/Lagos",
  defaultMarkup: 0,
  features: {
    data: true,
    airtime: true,
    electricity: true,
    cableTV: true,
    betting: true,
  },
  providers: {
    data: ["lizzysub"],
    airtime: ["lizzysub"],
    payment: ["xixapay"],
  },
  paymentGateway: {
    provider: "xixapay",
    currency: "NGN",
    methods: ["virtual_account", "card"],
  },
  serviceProvider: "lizzysub",
  region: "west_africa",
  kyc: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["business_reg", "utility_bill", "cac_certificate"],
  },
  applyUrl: "/ng/apply",
  stats: {
    activeResellers: 2400,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "₦150,000 – ₦240,000",
  },
  telecoms: [
    { id: "9mobile", name: "9MOBILE", code: "9MOBILE" },
    { id: "airtel", name: "Airtel", code: "AIRTEL" },
    { id: "glo", name: "GLO", code: "GLO" },
    { id: "mtn", name: "MTN", code: "MTN" },
    { id: "ninemobile", name: "NineMobile", code: "NINEMOBILE" },
  ],
};

