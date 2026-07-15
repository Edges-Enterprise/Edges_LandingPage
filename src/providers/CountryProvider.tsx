// src/providers/CountryProvider.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { CountryConfig } from "@/config/countries";

const CountryContext = createContext<CountryConfig | null>(null);

export function CountryProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: CountryConfig;
}) {
  return (
    <CountryContext.Provider value={config}>{children}</CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
