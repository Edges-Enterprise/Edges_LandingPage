// src/config/countries/ng.ts
import { CountryConfig } from "./index";

export const COUNTRY_NG: CountryConfig = {
  code: "ng",
  name: "Nigeria",
  nativeName: "Nigeria",
  flag: "🇳🇬",
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
  defaultMarkup: 20,
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
};
