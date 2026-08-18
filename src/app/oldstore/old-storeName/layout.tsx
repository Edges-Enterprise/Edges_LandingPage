// app/(store)/[storeName]/layout.tsx

import type { Metadata } from "next";
import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
import { getStoreAsset } from "@/app/actions/reseller/getStoreAsset";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeName: string }>;
}): Promise<Metadata> {
  const { storeName } = await params;

  const reseller = await getResellerByStoreName(storeName);

  let iconUrl = "/favicon.ico";

  if (reseller) {
    const asset = await getStoreAsset(reseller.id);
    if (asset?.url) iconUrl = asset.url;
  }

  const title = storeName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title,
    description: `Welcome to ${title}`,

    icons: {
      icon: [
        {
          url: iconUrl,
          sizes: "32x32",
          type: "image/png",
        },
      ],
    },
  };
}
