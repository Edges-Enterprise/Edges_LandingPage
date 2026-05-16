import { Inter } from "next/font/google";
import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
import { getStoreAsset } from "@/app/actions/reseller/getStoreAsset";

const inter = Inter({ subsets: ["latin"] });

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeName: string }>;
}) {
  const { storeName } = await params;

  const reseller = await getResellerByStoreName(storeName);

  let iconUrl = "/favicon.ico";

  if (reseller) {
    const storeIcon = await getStoreAsset(reseller.id);

    if (storeIcon?.url) {
      iconUrl = storeIcon.url;
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={iconUrl} sizes="32x32" />
        <link rel="shortcut icon" href={iconUrl} />
        <link rel="apple-touch-icon" href={iconUrl} />
      </head>

      <body className={inter.className}>{children}</body>
    </html>
  );
}
