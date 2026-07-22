// src/app/[countryCode]/dashboard/layout.tsx
import { DashboardShell } from "./DashboardShell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    countryCode: string;
  }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  // ✅ Await the params Promise (Next.js 16)
  const { countryCode } = await params;

  return <DashboardShell countryCode={countryCode}>{children}</DashboardShell>;
}