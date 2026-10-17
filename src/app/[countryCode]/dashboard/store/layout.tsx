// src/app/[countryCode]/dashboard/store/layout.tsx
import React from "react";

interface StoreLayoutProps {
  children: React.ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
