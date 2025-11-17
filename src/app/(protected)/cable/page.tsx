// app/(protected)/cable/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CableTVClient from "./cable-client";

export default async function CablePage() {
  const supabase = await createServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user email and wallet balance
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

  // Fetch all cable plans from Supabase
  const { data: allPlans } = await supabase
    .from("cable_plans")
    .select("*")
    .order("provider", { ascending: true })
    .order("price", { ascending: true });

  // Group plans by provider
  const plansByProvider = (allPlans || []).reduce((acc: any, plan: any) => {
    if (!acc[plan.provider]) {
      acc[plan.provider] = [];
    }
    acc[plan.provider].push({
      id: plan.cableplan_id,
      name: plan.name,
      price: parseFloat(plan.price),
      duration: plan.duration,
    });
    return acc;
  }, {});

  return (
    <CableTVClient
      initialBalance={balance}
      plansByProvider={plansByProvider}
      userId={user.id}
    />
  );
}
