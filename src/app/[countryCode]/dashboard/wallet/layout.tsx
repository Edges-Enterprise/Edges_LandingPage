// src/app/[countryCode]/dashboard/wallet/layout.tsx
import React from "react";

interface WalletLayoutProps {
  children: React.ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
