// src/app/[countryCode]/dashboard/settings/page.tsx
import { SettingsClient } from "./SettingsClient";

interface SettingsPageProps {
  params: {
    countryCode: string;
  };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <SettingsClient countryCode={countryCode} />
    </div>
  );
}
