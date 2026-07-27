// app/(protected)/settings/page.tsx

import { redirect } from "next/navigation";
import { createServerClient, getUser } from "@/lib/supabase/server";
import SettingsClient from "./settingsclient";
import { sections } from "@/constants/helper";

interface Profile {
  id: string;
  username: string | null;
  email: string;
  notifications_enabled: boolean;
}

export default async function SettingsPage() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. FETCH PROFILE
  // ============================================
  const supabase = await createServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, email, notifications_enabled")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
    // Optionally handle error, but proceed with defaults
  }

  return (
    <SettingsClient
      initialUser={user}
      initialProfile={profile || null}
      sections={sections}
    />
  );
}