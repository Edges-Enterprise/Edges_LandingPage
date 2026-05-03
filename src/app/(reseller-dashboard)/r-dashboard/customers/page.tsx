// app/(reseller-dashboard)/r-dashboard/customers/page.tsx

import { getCustomers } from "@/app/actions/reseller/customers/getCustomers";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
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

  const customers = await getCustomers(reseller.id);

  return <CustomersClient customers={customers} />;
}
