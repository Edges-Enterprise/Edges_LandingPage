// src/config/countries/usd.ts
//
// The fallback config for a country outside SUPPORTED_COUNTRIES.
//
// A country with no config is NOT an error and is NOT Nigeria. The pricing
// engine already treats such a country as a USD store
// (`_shared/currency/storePrice.ts` → `currencyIsFallback`), and the wallet
// side mirrors it (`_shared/countryCurrency.ts`). This config is the display
// half of that same policy, so the two agree: a storefront for an unmapped
// country shows USD, not a borrowed NGN symbol on a USD price.
//
// It is deliberately minimal — no telecoms, no local payment rails. A store
// here is priced in USD and sells Zendit's global catalogue; USD is charged
// through Flutterwave, which is the one gateway that takes a USD card/ACH
// charge (`korapay` has no USD channel — TASK-8-BOARD Blocker 11).

import { CountryConfig } from "./index";
import { flags } from "@/constants/flags";

export const COUNTRY_USD: CountryConfig = {
  // Not a real country code. `us` is absent from COUNTRIES on purpose, so a
  // lookup that lands here is always the fallback and never a supported
  // store; the empty code makes that visible if it is ever used in a URL.
  code: "",
  name: "International",
  nativeName: "International",
  flag: flags.UnitedStates,
  flagEmoji: "🇺🇸",
  currency: "USD",
  currencySymbol: "$",
  phoneCode: "",
  // No national numbering plan: any 4–15 digits are accepted, which is the
  // E.164 range. The per-country configs carry the tight bounds.
  phoneNumber: { minDigits: 4, maxDigits: 15 },
  language: {
    code: "en",
    name: "English",
    direction: "ltr",
  },
  locale: "en-US",
  timezone: "UTC",
  defaultMarkup: 0,
  features: {
    data: true,
    airtime: false,
    electricity: false,
    cableTV: false,
    betting: false,
  },
  providers: {
    data: ["zendit"],
    airtime: [],
    payment: ["flutterwave"],
  },
  paymentGateway: {
    provider: "flutterwave",
    currency: "USD",
    methods: ["card", "bank_transfer"],
  },
  serviceProvider: "zendit",
  kyc: {
    requiredDocuments: ["government_id"],
    optionalDocuments: [],
  },
  applyUrl: "/apply",
  stats: {
    activeResellers: 0,
    apkDeliveryDays: "3–5",
    storeGoesLive: "Instant",
    monthlyProfit: "",
  },
};
