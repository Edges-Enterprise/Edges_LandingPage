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
  params?: { storeName?: string };
}): Promise<Metadata> {
  const storeName = params?.storeName ?? "store";

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

// // app/(store)/[storeName]/layout.tsx

// import { Inter } from "next/font/google";
// import { getResellerByStoreName } from "@/app/actions/reseller/getReseller";
// import { getStoreAsset } from "@/app/actions/reseller/getStoreAsset";

// const inter = Inter({ subsets: ["latin"] });

// export default async function StoreLayout({
//   children,
//   params,
// }: {
//   children: React.ReactNode;
//   params: Promise<{ storeName: string }>;
// }) {
//   const { storeName } = await params;

//   const reseller = await getResellerByStoreName(storeName);

//   let iconUrl = "/favicon.ico";

//   if (reseller) {
//     const storeIcon = await getStoreAsset(reseller.id);

//     if (storeIcon?.url) {
//       iconUrl = storeIcon.url;
//     }
//   }

//   return (
//     <html lang="en">
//       <head>
//         <link rel="icon" href={iconUrl} sizes="32x32" />
//         <link rel="shortcut icon" href={iconUrl} />
//         <link rel="apple-touch-icon" href={iconUrl} />
//       </head>

//       <body className={inter.className}>{children}</body>
//     </html>
//   );
// }
