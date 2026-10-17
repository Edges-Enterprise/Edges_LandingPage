// src/app/[countryCode]/dashboard/app/layout.tsx
import React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
