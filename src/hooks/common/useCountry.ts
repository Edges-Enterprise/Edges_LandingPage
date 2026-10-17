// src/hooks/common/useCountry.ts
"use client";

import { useCountry as useCountryProvider } from "@/providers/CountryProvider";

export function useCountry() {
  return useCountryProvider();
}
