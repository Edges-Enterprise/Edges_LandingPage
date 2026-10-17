// src/app/[countryCode]/dashboard/orders/layout.tsx
import React from "react";

interface OrdersLayoutProps {
  children: React.ReactNode;
}

export default function OrdersLayout({ children }: OrdersLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
