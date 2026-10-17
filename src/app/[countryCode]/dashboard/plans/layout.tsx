// src/app/[countryCode]/dashboard/plans/layout.tsx
import React from "react";

interface PlansLayoutProps {
  children: React.ReactNode;
}

export default function PlansLayout({ children }: PlansLayoutProps) {
  return <div className="container mx-auto px-4 py-8">{children}</div>;
}
