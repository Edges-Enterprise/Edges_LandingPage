// src/config/countries/index.ts
import { COUNTRY_NG } from "./ng";
import { COUNTRY_GH } from "./gh";
import { COUNTRY_KE } from "./ke";
import { COUNTRY_ZA } from "./za";
import { COUNTRY_CM } from "./cm";
import { COUNTRY_CF } from "./cf";
import { COUNTRY_TD } from "./td";
import { COUNTRY_CG } from "./cg";
import { COUNTRY_GQ } from "./gq";
import { COUNTRY_GA } from "./ga";
import { COUNTRY_CI } from "./ci";
import { COUNTRY_SN } from "./sn";
import { COUNTRY_BF } from "./bf";
import { COUNTRY_BJ } from "./bj";
import { COUNTRY_TG } from "./tg";
import { COUNTRY_NE } from "./ne";
import { COUNTRY_ML } from "./ml";
import { COUNTRY_GN } from "./gn";
import { COUNTRY_RW } from "./rw";
import { COUNTRY_UG } from "./ug";
import { ReactNode } from "react";

export type PaymentProvider = "xixapay" | "korapay" | "flutterwave";
export type ServiceProvider = "lizzysub" | "accragh" | "zendit";
export type PaymentMethod =
  | "virtual_account"
  | "mobile_money"
  | "card"
  | "bank_transfer";

export interface CountryConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: ReactNode;
  flagEmoji: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  language: {
    code: string;
    name: string;
    direction: "ltr" | "rtl";
  };
  locale: string;
  timezone: string;
  defaultMarkup: number;
  features: {
    data: boolean;
    airtime: boolean;
    electricity: boolean;
    cableTV: boolean;
    betting: boolean;
  };
  providers: {
    data: string[];
    airtime: string[];
    payment: string[];
  };
  paymentGateway: {
    provider: PaymentProvider;
    currency: string;
    methods: PaymentMethod[];
  };
  serviceProvider: ServiceProvider;
  region?: "xaf" | "xof" | "east_africa" | "southern_africa" | "west_africa";
  kyc: {
    requiredDocuments: string[];
    optionalDocuments: string[];
  };
  applyUrl: string;
  stats: {
    activeResellers: number;
    apkDeliveryDays: string;
    storeGoesLive: string;
    monthlyProfit: string;
  };
}

export const SUPPORTED_COUNTRIES = [
  "ng", // Nigeria
  "gh", // Ghana
  "ke", // Kenya
  "za", // South Africa
  "cm", // Cameroon
  "cf", // Central African Republic
  "td", // Chad
  "cg", // Congo
  "gq", // Equatorial Guinea
  "ga", // Gabon
  "ci", // Ivory Coast
  "sn", // Senegal
  "bf", // Burkina Faso
  "bj", // Benin
  "tg", // Togo
  "ne", // Niger
  "ml", // Mali
  "gn", // Guinea
  "rw", // Rwanda
  "ug", // Uganda
] as const;

export const COUNTRIES: Record<string, CountryConfig> = {
  ng: COUNTRY_NG,
  gh: COUNTRY_GH,
  ke: COUNTRY_KE,
  za: COUNTRY_ZA,
  cm: COUNTRY_CM,
  cf: COUNTRY_CF,
  td: COUNTRY_TD,
  cg: COUNTRY_CG,
  gq: COUNTRY_GQ,
  ga: COUNTRY_GA,
  ci: COUNTRY_CI,
  sn: COUNTRY_SN,
  bf: COUNTRY_BF,
  bj: COUNTRY_BJ,
  tg: COUNTRY_TG,
  ne: COUNTRY_NE,
  ml: COUNTRY_ML,
  gn: COUNTRY_GN,
  rw: COUNTRY_RW,
  ug: COUNTRY_UG,
};

export const getCountryConfig = (code: string): CountryConfig => {
  return COUNTRIES[code] || COUNTRIES.ng;
};

export const getDefaultCountry = (): string => "ng";

export const getSupportedCountries = () => {
  return SUPPORTED_COUNTRIES.map((code) => COUNTRIES[code]);
};

export const getCountryByLanguage = (
  languageCode: string,
): CountryConfig | undefined => {
  return Object.values(COUNTRIES).find((c) => c.language.code === languageCode);
};

export const getCountriesByRegion = (region: string): CountryConfig[] => {
  return Object.values(COUNTRIES).filter((c) => c.region === region);
};

export const getCountriesByCurrency = (currency: string): CountryConfig[] => {
  return Object.values(COUNTRIES).filter((c) => c.currency === currency);
};

// // src/config/countries/index.ts
// import { COUNTRY_NG } from "./ng";
// import { COUNTRY_GH } from "./gh";
// import { COUNTRY_ZM } from "./zm";
// import { COUNTRY_EG } from "./eg";
// import { COUNTRY_MA } from "./ma";
// import { COUNTRY_CD } from "./cd";
// import { COUNTRY_CM } from "./cm";
// import { COUNTRY_TG } from "./tg";
// import { ReactNode } from "react";

// export interface CountryConfig {
//   code: string;
//   name: string;
//   nativeName: string;
//   flag: ReactNode; // ✅ Changed from string to ReactNode
//   flagEmoji: string;
//   currency: string;
//   currencySymbol: string;
//   phoneCode: string;
//   language: {
//     code: string;
//     name: string;
//     direction: "ltr" | "rtl";
//   };
//   locale: string;
//   timezone: string;
//   defaultMarkup: number;
//   features: {
//     data: boolean;
//     airtime: boolean;
//     electricity: boolean;
//     cableTV: boolean;
//     betting: boolean;
//   };
//   providers: {
//     data: string[];
//     airtime: string[];
//     payment: string[];
//   };
//   kyc: {
//     requiredDocuments: string[];
//     optionalDocuments: string[];
//   };
//   applyUrl: string;
//   stats: {
//     activeResellers: number;
//     apkDeliveryDays: string;
//     storeGoesLive: string;
//     monthlyProfit: string;
//   };
// }

// export const SUPPORTED_COUNTRIES = [
//   "ng",
//   "gh",
//   "zm",
//   "eg",
//   "ma",
//   "cd",
//   "cm",
//   "tg",
// ] as const;

// export const COUNTRIES: Record<string, CountryConfig> = {
//   ng: COUNTRY_NG,
//   gh: COUNTRY_GH,
//   zm: COUNTRY_ZM,
//   eg: COUNTRY_EG,
//   ma: COUNTRY_MA,
//   cd: COUNTRY_CD,
//   cm: COUNTRY_CM,
//   tg: COUNTRY_TG,
// };

// export const getCountryConfig = (code: string): CountryConfig => {
//   return COUNTRIES[code] || COUNTRIES.ng;
// };

// export const getDefaultCountry = (): string => "ng";

// export const getSupportedCountries = () => {
//   return SUPPORTED_COUNTRIES.map((code) => COUNTRIES[code]);
// };

// export const getCountryByLanguage = (
//   languageCode: string,
// ): CountryConfig | undefined => {
//   return Object.values(COUNTRIES).find((c) => c.language.code === languageCode);
// };
