//  app/(protected)/wallet/page.tsx

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createServerClient } from "@/lib/supabase/server";
import { WalletClient } from "@/components/WalletClient";

export default async function WalletPage() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. GET USER PROFILE
  // ============================================
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, username")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/sign-in");
  }

  // ============================================
  // 3. GET WALLET BALANCE
  // ============================================
  const { data: wallet } = await supabase
    .from("wallet")
    .select("balance")
    .eq("user_email", profile.email)
    .single();

  // Create wallet if doesn't exist
  if (!wallet) {
    await supabase
      .from("wallet")
      .insert({ user_email: profile.email, balance: 0 });
  }

  const balance = parseFloat(wallet?.balance || "0");

  // ============================================
  // 4. GET VIRTUAL ACCOUNTS
  // ============================================
  const { data: virtualAccountsData } = await supabase
    .from("virtual_accounts")
    .select("bank_name, account_number, account_name")
    .eq("user_id", user.id);

  const virtualAccounts = (virtualAccountsData || []).map((acc) => ({
    bank_name: acc.bank_name,
    account_number: acc.account_number,
    account_name: acc.account_name,
  }));

  // ============================================
  // 5. GET RECENT TRANSACTIONS (Last 10)
  // ============================================
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_email", profile.email)
    .order("created_at", { ascending: false })
    .limit(10);

  const formattedTransactions = (transactionsData || []).map((tx) => ({
    type: getTransactionType(tx.type),
    amount: parseFloat(tx.amount || "0"),
    method: tx.metadata?.method || "Wallet",
    date: new Date(tx.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    details: tx.metadata?.details || tx.reference || "Transaction",
    status: tx.status,
  }));

  // ============================================
  // 6. CHECK FOR PRIOR PURCHASES
  // ============================================
  const hasPriorPurchase = transactionsData && transactionsData.length > 0;

  return (
    <WalletClient
      initialBalance={balance}
      initialTransactions={formattedTransactions}
      initialVirtualAccounts={virtualAccounts}
      hasPriorPurchase={hasPriorPurchase}
      userEmail={profile.email}
      userName={profile.username}
    />
  );
}

// Helper to format transaction type
function getTransactionType(type: string): string {
  const types: Record<string, string> = {
    deposit: "Wallet Funding",
    data: "Data Purchase",
    airtime: "Airtime Purchase",
    cable: "Cable Subscription",
    electric: "Electricity Payment",
  };
  return types[type] || type;
}
