// src/app/[countryCode]/dashboard/customers/page.tsx
import { CustomersClient } from "./CustomersClient";

interface CustomersPageProps {
  params: {
    countryCode: string;
  };
}

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <CustomersClient countryCode={countryCode} />
    </div>
  );
}
