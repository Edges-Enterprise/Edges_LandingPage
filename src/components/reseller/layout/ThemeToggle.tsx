// src/components/reseller/layout/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: "var(--bg2, #16110D)",
        border: "1px solid var(--border, rgba(201,138,84,0.12))",
        borderRadius: 8,
        padding: "0.4rem 0.6rem",
        color: "var(--muted, #A0958A)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        transition: "all 0.2s",
        fontSize: "0.8rem",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--brand-color, #C98A54)";
        e.currentTarget.style.color = "var(--text, #F5F0EB)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border, rgba(201,138,84,0.12))";
        e.currentTarget.style.color = "var(--muted, #A0958A)";
      }}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      <span style={{ fontWeight: 500 }}>
        {theme === "light" ? "Dark" : "Light"}
      </span>
    </button>
  );
}