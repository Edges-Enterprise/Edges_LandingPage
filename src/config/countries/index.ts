// src/config/countries/index.ts
import { COUNTRY_NG } from "./ng";
import { COUNTRY_GH } from "./gh";
import { COUNTRY_ZM } from "./zm";
import { COUNTRY_EG } from "./eg";
import { COUNTRY_MA } from "./ma";
import { COUNTRY_CD } from "./cd";
import { COUNTRY_CM } from "./cm";
import { COUNTRY_TG } from "./tg";
import { ReactNode } from "react";

export interface CountryConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: ReactNode; // ✅ Changed from string to ReactNode
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
  "ng",
  "gh",
  "zm",
  "eg",
  "ma",
  "cd",
  "cm",
  "tg",
] as const;

export const COUNTRIES: Record<string, CountryConfig> = {
  ng: COUNTRY_NG,
  gh: COUNTRY_GH,
  zm: COUNTRY_ZM,
  eg: COUNTRY_EG,
  ma: COUNTRY_MA,
  cd: COUNTRY_CD,
  cm: COUNTRY_CM,
  tg: COUNTRY_TG,
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
