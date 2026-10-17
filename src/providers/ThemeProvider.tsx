// src/providers/ThemeProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  brandColor: string;
  setBrandColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  brandColor: initialBrandColor = "#C98A54",
}: {
  children: ReactNode;
  brandColor?: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [brandColor, setBrandColor] = useState(initialBrandColor);
  const [mounted, setMounted] = useState(false);

  // If the parent (e.g. dashboard layout) fetches a saved brand color async
  // after this provider first mounts, pick up the new value automatically.
  useEffect(() => {
    setBrandColor(initialBrandColor);
  }, [initialBrandColor]);

  // One-time setup: add the class dashboard-theme.css is scoped to, load any
  // saved theme/brand color, and clean up the class on unmount.
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    setMounted(true);

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    setTheme(savedTheme || systemTheme);

    const savedBrandColor = localStorage.getItem("brandColor");
    if (savedBrandColor) {
      setBrandColor(savedBrandColor);
    }

    return () => {
      document.body.classList.remove("dashboard-theme");
      document.body.removeAttribute("data-theme");
    };
  }, []);

  // Keep the DOM in sync whenever theme or brand color changes.
  // IMPORTANT: data-theme must be set on the same element (<body>) as the
  // "dashboard-theme" class, since dashboard-theme.css matches on
  // `body.dashboard-theme[data-theme="light"]`. Setting it on
  // document.documentElement (<html>) instead is why toggling did nothing.
  useEffect(() => {
    if (!mounted) return;

    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    document.documentElement.style.setProperty("--brand-color", brandColor);
    document.documentElement.style.setProperty(
      "--brand-color-rgb",
      hexToRgb(brandColor),
    );
    localStorage.setItem("brandColor", brandColor);
  }, [theme, brandColor, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "201, 138, 84";
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, brandColor, setBrandColor }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
