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
    .limit(5);

  const formattedTransactions = (transactionsData || []).map((tx) => {
    // Extract detailed information from metadata
    const metadata = tx.metadata || {};

    // Detect transaction type from metadata if type is null
    let transactionType = tx.type;
    if (!transactionType || transactionType === null) {
      // Auto-detect type based on metadata
      if (metadata.provider && (metadata.plan || metadata.validity)) {
        transactionType = "data";
      } else if (metadata.provider && metadata.smartcard_number) {
        transactionType = "cable";
      } else if (metadata.disco || metadata.meter_number) {
        transactionType = "electricity";
      } else if (
        metadata.bank_name ||
        (tx.amount > 0 && metadata.payment_method)
      ) {
        transactionType = "deposit";
      } else if (tx.amount < 0 && metadata.type === "airtime") {
        transactionType = "airtime";
      } else {
        transactionType = "transaction";
      }
    }

    // Build comprehensive details string
    let details = "";

    // For different transaction types, show relevant details
    switch (transactionType) {
      case "deposit":
      case "wallet_funding":
        details = metadata.bank_name
          ? `via ${metadata.bank_name}`
          : metadata.payment_method
          ? `via ${metadata.payment_method}`
          : "Wallet Funding";
        break;

      case "data":
        // Handle the actual structure from your logs
        const maskPhone = (phone: string) => {
          if (!phone) return "";
          return `${phone.substring(0, 4)}****${phone.substring(
            phone.length - 3
          )}`;
        };

        details = [
          metadata.provider || metadata.network,
          metadata.plan || metadata.plan_name || metadata.data_plan,
          metadata.validity && `(${metadata.validity})`,
          metadata.phone_number && `- ${maskPhone(metadata.phone_number)}`,
        ]
          .filter(Boolean)
          .join(" ");
        break;

      case "airtime":
        details = [
          metadata.provider || metadata.network,
          metadata.amount && `₦${metadata.amount}`,
          metadata.phone_number &&
            `- ${metadata.phone_number.substring(
              0,
              4
            )}****${metadata.phone_number.substring(
              metadata.phone_number.length - 3
            )}`,
        ]
          .filter(Boolean)
          .join(" ");
        break;

      case "cable":
      case "cable_tv":
        details = [
          metadata.provider || metadata.cable_provider,
          metadata.plan || metadata.plan_name || metadata.package_name,
          metadata.smartcard_number && `- ${metadata.smartcard_number}`,
        ]
          .filter(Boolean)
          .join(" ");
        break;

      case "electric":
      case "electricity":
        details = [
          metadata.provider || metadata.disco,
          metadata.meter_type,
          metadata.meter_number && `- ${metadata.meter_number}`,
        ]
          .filter(Boolean)
          .join(" ");
        break;

      default:
        // Fallback to description or reference
        details =
          metadata.description ||
          tx.description ||
          tx.reference ||
          "Transaction";
    }

    return {
      type: getTransactionType(transactionType),
      amount: parseFloat(tx.amount || "0"),
      method: metadata.method || metadata.payment_method || "Wallet",
      date: new Date(tx.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      details: details,
      status: tx.status,
      reference: tx.reference,
      // Include full metadata for future use if needed
      metadata: metadata,
    };
  });

  // ============================================
  // 6. CHECK FOR PRIOR PURCHASES
  // ============================================
  // const hasPriorPurchase = transactionsData && transactionsData.length > 0;
  const hasPriorPurchase = !!(transactionsData && transactionsData.length);

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
    wallet_funding: "Wallet Funding",
    data: "Data Purchase",
    airtime: "Airtime Purchase",
    cable: "Cable Subscription",
    cable_tv: "Cable Subscription",
    electric: "Electricity Payment",
    electricity: "Electricity Payment",
    transfer: "Transfer",
    refund: "Refund",
  };
  return (
    types[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1)
  );
}

