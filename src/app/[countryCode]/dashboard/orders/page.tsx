// src/app/[countryCode]/dashboard/orders/page.tsx
import { OrdersClient } from "./OrdersClient";

interface OrdersPageProps {
  params: {
    countryCode: string;
  };
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <OrdersClient countryCode={countryCode} />
    </div>
  );
}
