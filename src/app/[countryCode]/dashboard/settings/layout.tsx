// src/app/[countryCode]/dashboard/settings/layout.tsx
import React from "react";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
