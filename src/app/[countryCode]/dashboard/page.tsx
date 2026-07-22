// src/app/[countryCode]/dashboard/page.tsx
import { DashboardClient } from "./DashboardClient";

interface DashboardPageProps {
  params: Promise<{
    countryCode: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  // ✅ Await params in Next.js 16
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardClient countryCode={countryCode} />
    </div>
  );
}
