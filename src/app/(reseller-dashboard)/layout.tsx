// app/(reseller-dashboard)/layout.tsx
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import "./../reseller.css";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your store, customers, and orders from your dashboard",
};

export default async function ResellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/reseller");
  }

  // Get reseller info
  const { data: reseller } = await supabase
    .from("resellers")
    .select("store_name, theme")
    .eq("auth_user_id", user.id)
    .single();

  const storeName = reseller?.store_name || "your-store";
  const displayName = storeName
    .split("-")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <DashboardShell storeName={displayName} storeSlug={storeName}>
      {children}
    </DashboardShell>
  );
}