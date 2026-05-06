// app/(protected)/ProtectedLayoutClient.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
// import FCMTokenSync from "@/components/FCMTokenSync";
import {
  IoBonfire,
  IoWalletOutline,
  IoCellularOutline,
  IoTimeOutline,
  IoSettingsOutline,
} from "react-icons/io5";

const navItems = [
  { href: "/wallet", icon: IoWalletOutline, label: "Wallet" },
  { href: "/data", icon: IoCellularOutline, label: "Buy Data" },
  { href: "/home", icon: IoBonfire, label: "Home" },
  { href: "/history", icon: IoTimeOutline, label: "History" },
  { href: "/settings", icon: IoSettingsOutline, label: "Settings" },
];

const excludedPaths = ["/settings"];

export default function ProtectedLayoutClient({
  children,
  // userId,
}: {
  children: React.ReactNode;
  // userId?: string;
}) {
  const pathname = usePathname();
  const shouldExclude = excludedPaths.some((path) => pathname.startsWith(path));

  if (shouldExclude) return <>{children}</>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* FCM Token Sync - only when user is logged in */}
      {/* {userId && <FCMTokenSync userId={userId} />} */}

      <main className="flex-1 pt-4 pb-20 px-4">{children}</main>
    </div>
  );
}
