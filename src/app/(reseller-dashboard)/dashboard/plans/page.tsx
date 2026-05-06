// app/(reseller-dashboard)/plans/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getResellerPlans } from "@/app/actions/reseller/plans/getPlans";
import { PlansClient } from "./PlansClient";

export default async function PlansPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/reseller");

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!reseller) redirect("/reseller");

  const allPlans = await getResellerPlans(reseller.id);

  return <PlansClient resellerId={reseller.id} allPlans={allPlans} />;
}
