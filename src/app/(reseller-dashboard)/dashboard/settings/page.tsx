// app/(reseller-dashboard)/settings/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/reseller");

  const { data: reseller } = await supabase
    .from("resellers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!reseller) redirect("/reseller");

  return <SettingsClient reseller={reseller} />;
}
