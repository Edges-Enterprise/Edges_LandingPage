// app/(reseller-dashboard)/r-dashboard/wallet/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WalletClient } from "./WalletClient";
import { getTransactions } from "@/app/actions/reseller/wallet/getTransactions";
import { getWallet } from "@/app/actions/reseller/wallet/getWallet";

export default async function WalletPage() {
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

  const wallet = await getWallet(reseller.id);
  const transactions = await getTransactions(reseller.id);

  return (
    <WalletClient
      resellerId={reseller.id}
      wallet={wallet}
      transactions={transactions}
    />
  );
}
