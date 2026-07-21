// src/app/[countryCode]/dashboard/wallet/page.tsx
import { WalletClient } from "./WalletClient";

interface WalletPageProps {
  params: {
    countryCode: string;
  };
}

export default async function WalletPage({ params }: WalletPageProps) {
  const { countryCode } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <WalletClient countryCode={countryCode} />
    </div>
  );
}
