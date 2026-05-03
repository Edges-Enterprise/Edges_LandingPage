// app/(reseller-dashboard)/r-dashboard/orders/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersClient } from "./OrdersClient";
import { getOrders } from "@/app/actions/reseller/orders/getOrders";

export default async function OrdersPage() {
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

  const orders = await getOrders(reseller.id);

  return <OrdersClient orders={orders} />;
}
