// src/app/[countryCode]/dashboard/customers/layout.tsx
import React from "react";

interface CustomersLayoutProps {
  children: React.ReactNode;
}

export default function CustomersLayout({ children }: CustomersLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
