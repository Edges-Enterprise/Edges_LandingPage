// src/app/[countryCode]/[storeName]/StoreLayoutClient.tsx
"use client";

import { useEffect, useState } from "react";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import StoreLoader, { storeLabel } from "@/components/common/StoreLoader";
import "./store-theme.css";

interface StoreLayoutClientProps {
  children: React.ReactNode;
  countryCode: string;
  storeName: string;
}

export default function StoreLayoutClient({
  children,
  countryCode,
  storeName,
}: StoreLayoutClientProps) {
  const [config, setConfig] = useState<any>(null);
  const [brandColor, setBrandColor] = useState<string>("#C98A54");
  const [storeDisplayName, setStoreDisplayName] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // One-time mount setup. This effect used to depend on [countryCode,
  // brandColor, theme, storeName] and call setBrandColor/setTheme itself, so
  // every run changed its own dependencies and React re-ran it forever
  // ("Maximum update depth exceeded") - the storefront never left its loading
  // state. The async store fetch below owns brandColor, and the DOM sync
  // effect owns theme, so this can run once.
  useEffect(() => {
    setConfig(getCountryConfig(countryCode));

    const savedBrandColor = localStorage.getItem("brandColor");
    if (savedBrandColor) {
      setBrandColor(savedBrandColor);
    }

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    setTheme(savedTheme || systemTheme);

    document.body.classList.add("storefront-theme");

    const fetchStoreData = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("global_reseller_applications")
          .select("id, store_name, logo_url, brand_color")
          .eq("store_slug", storeName)
          .eq("application_status", "active")
          .single();

        if (!error && data) {
          if (data.brand_color) setBrandColor(data.brand_color);
          if (data.store_name) setStoreDisplayName(data.store_name);
        }
      } catch (error) {
        console.error("Error fetching store data:", error);
      }
    };

    fetchStoreData();

    return () => {
      document.body.classList.remove("storefront-theme");
      document.body.removeAttribute("data-theme");
    };
  }, [countryCode, storeName]);

  // DOM sync, separate from the fetch above so neither can retrigger the
  // other through its own state writes.
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    document.documentElement.style.setProperty("--brand-color", brandColor);
    document.documentElement.style.setProperty(
      "--brand-color-rgb",
      hexToRgb(brandColor),
    );
  }, [theme, brandColor]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "201, 138, 84";
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  };

  if (!config) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <StoreLoader
          label={storeLabel(storeDisplayName, storeName)}
          fullScreen
        />
      </div>
    );
  }

  return (
    <ThemeProvider brandColor={brandColor}>
      <CountryProvider config={config}>
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
          {children}
        </div>
      </CountryProvider>
    </ThemeProvider>
  );
}
