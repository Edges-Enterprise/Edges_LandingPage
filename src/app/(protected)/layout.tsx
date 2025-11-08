"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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

// pages where the layout should NOT be applied
const excludedPaths = ["/settings"];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if current route should skip the layout (like settings)
  const shouldExclude = excludedPaths.some((path) => pathname.startsWith(path));

  // If excluded, just render the page directly
  if (shouldExclude) return <>{children}</>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 pt-4 pb-20 px-4">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4 flex justify-around z-10">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
        
          return (
            <Link
              key={href}
              href={href}
              className={`text-center flex flex-col items-center transition-colors ${
                isActive ? "text-[#d7a77f]" : "text-gray-400"
              } hover:text-[#d7a77f]`}
            >
              <Icon className="text-xl mb-1" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
