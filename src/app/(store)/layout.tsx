// app/(store)/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// This layout doesn't have access to params, so we'll handle metadata in the page
export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className={inter.className}>{children}</main>;
}

// //  app/(store)/layout.tsx
// import type { Metadata } from "next";
// import { Inter } from "next/font/google"; // Or your preferred font

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Store",
//   description: "Explore our store and find the perfect solution for your needs",
// };

// export default function StoreLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <main className={inter.className}>
//       {children}
//     </main>
//   );
// }
