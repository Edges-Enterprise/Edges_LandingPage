// src/app/[countryCode]/[storeName]/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "./store-theme.css";
import "@/app/reseller.css";

interface StoreLayoutProps {
  children: React.ReactNode;
  params: { countryCode: string; storeName: string };
}

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const { countryCode } = params;
  const [config, setConfig] = useState<any>(null);
  const [brandColor, setBrandColor] = useState<string>("#C98A54");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const config = getCountryConfig(countryCode);
    setConfig(config);

    // Load brand color from localStorage
    const savedBrandColor = localStorage.getItem("brandColor");
    if (savedBrandColor) {
      setBrandColor(savedBrandColor);
    }

    // Load theme preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(savedTheme || systemTheme);

    // Apply storefront theme class to body
    document.body.classList.add("storefront-theme");
    document.body.setAttribute("data-theme", theme);

    // Set brand color on root
    document.documentElement.style.setProperty("--brand-color", brandColor);
    document.documentElement.style.setProperty("--brand-color-rgb", hexToRgb(brandColor));

    return () => {
      document.body.classList.remove("storefront-theme");
      document.body.removeAttribute("data-theme");
    };
  }, [countryCode, brandColor, theme]);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "4px solid var(--border)",
            borderTop: "4px solid var(--brand-color)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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