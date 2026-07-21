// src/app/[countryCode]/dashboard/plans/page.tsx
import { PlansClient } from "./PlansClient";

interface PlansPageProps {
  params: {
    countryCode: string;
  };
}

export default async function PlansPage({ params }: PlansPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <PlansClient countryCode={countryCode} />
    </div>
  );
}
