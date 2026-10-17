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
  return <div className={inter.className}>{children}</div>;
}
