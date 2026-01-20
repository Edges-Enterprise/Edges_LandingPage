// app/(protected)/education/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EducationPurchase from "@/components/education-client";

export default async function EducationPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch real balance (mirrors data.ts pattern)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  let balance = 0;
  if (profile) {
    const { data: wallet } = await supabase
      .from("wallet")
      .select("balance")
      .eq("user_email", profile.email)
      .single();
    balance = parseFloat(wallet?.balance || "0");
  }

  return <EducationPurchase initialBalance={balance} userId={user.id} />;
}

