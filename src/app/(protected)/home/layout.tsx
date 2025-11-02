// app/(protected)/home/layout.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IoBonfire,
  IoWalletOutline,
  IoCellularOutline,
  IoTimeOutline,
  IoSettingsOutline,
} from "react-icons/io5";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 pt-4 pb-20 px-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4 flex justify-around z-10">
        <Link
          href="/wallet"
          className="text-center flex flex-col items-center text-gray-400 hover:text-[#d7a77f] transition-colors"
        >
          <IoWalletOutline className="text-xl mb-1" />
          <span className="text-xs">Wallet</span>
        </Link>
        <Link
          href="data"
          className="text-center flex flex-col items-center text-gray-400 hover:text-[#d7a77f] transition-colors"
        >
          <IoCellularOutline className="text-xl mb-1" />
          <span className="text-xs">Buy Data</span>
        </Link>
        <Link
          href="/home"
          className="text-center flex flex-col items-center text-[#d7a77f]"
        >
          <IoBonfire className="text-xl mb-1" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href="/history"
          className="text-center flex flex-col items-center text-gray-400 hover:text-[#d7a77f] transition-colors"
        >
          <IoTimeOutline className="text-xl mb-1" />
          <span className="text-xs">History</span>
        </Link>
        <Link
          href="/settings"
          className="text-center flex flex-col items-center text-gray-400 hover:text-[#d7a77f] transition-colors"
        >
          <IoSettingsOutline className="text-xl mb-1" />
          <span className="text-xs">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
