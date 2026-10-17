// src/app/[countryCode]/dashboard/app/page.tsx
import { AppBuildClient } from "./AppBuildClient";

interface AppBuildPageProps {
  params: Promise<{
    countryCode: string;
  }>;
}

export default async function AppBuildPage({ params }: AppBuildPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <AppBuildClient countryCode={countryCode} />
    </div>
  );
}
