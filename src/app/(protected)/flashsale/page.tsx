// app/(protected)/flashsale/page.tsx

import { redirect } from "next/navigation";
import { FlashSaleClient } from "./FlashSaleClient";
import { createServerClient } from "@/lib/supabase/server";
import {
  getFlashSalePlansAction,
  isFlashSaleActiveAction,
  getWalletBalanceForFlashSaleAction,
} from "@/app/actions/flashsale";

export default async function FlashSalePage() {
  // Check authentication
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Fetch data in parallel
  const [plansResult, walletResult, profileResult, saleStatusResult] =
    await Promise.all([
      getFlashSalePlansAction(),
      getWalletBalanceForFlashSaleAction(),
      supabase
        .from("profiles")
        .select("transaction_pin")
        .eq("id", user.id)
        .single(),
      isFlashSaleActiveAction(),
    ]);

  const plans = plansResult.plans || [];
  // const walletBalance = walletResult.balance || 0;
  const hasPin = !!(
    profileResult.data?.transaction_pin &&
    profileResult.data.transaction_pin.trim() !== ""
  );
  const isActive = saleStatusResult.isActive || false;

  return (
    <FlashSaleClient
      initialPlans={plans}
      // initialWalletBalance={walletBalance}
      initialHasPin={hasPin}
      initialIsActive={isActive}
    />
  );
}
