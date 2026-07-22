// src/app/[countryCode]/dashboard/store/page.tsx
import { StoreClient } from "./StoreClient";

interface StorePageProps {
  params: {
    countryCode: string;
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <StoreClient countryCode={countryCode} />
    </div>
  );
}
