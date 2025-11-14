// app/(protected)/history/page.tsx

import { redirect } from "next/navigation";
import { createServerClient, getUser } from "@/lib/supabase/server";
import ClientHistory from "./ClientHistory";

interface TransactionMetadata {
  payment_date?: string;
  payment_method?: string;
  phone_number?: string;
  fees?: {
    transfer_fee: number;
    wallet_management_fee: number;
    api_network_fee: number;
    vat: number;
    total_fee: number;
    net_amount: number;
  };
  provider?: string;
  plan?: string;
  purchase?: string;
  validity?: string;
  actual_cost?: number;
  plan_id?: number;
  network_id?: number;
  sold_at?: number;
  bought_at?: number;
  profit?: number;
  gross_amount?: number;
  error_message?: string;
  service?: string; // Added for data/service extraction
}

interface HistoryItem {
  id: string;
  provider: string;
  data: string;
  price: number;
  date: string;
  status: "Success" | "Failed" | "Pending" | "Unknown";
  phoneNumber: string;
  reference: string;
  metadata: TransactionMetadata | null;
  type: string;
}

export default async function HistoryPage() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. FETCH TRANSACTION HISTORY
  // ============================================
  const supabase = await createServerClient();
  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select(
      "id, user_email, amount, reference, status, metadata, created_at, type"
    )
    .eq("user_email", user.email) // Fixed: Filter by user_email (text) instead of user_id
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Transactions fetch error:", fetchError);
    // Proceed with empty array
  }

  // ============================================
  // 3. TRANSFORM DATA FOR CLIENT
  // ============================================
  const transformedHistory: HistoryItem[] = (transactions || []).map(
    (tx: any) => {
      const meta = tx.metadata || {};
      // Normalize status to title case for consistency with filter and colors
      const rawStatus = tx.status || "Unknown";
      const normalizedStatus = (rawStatus.charAt(0).toUpperCase() +
        rawStatus.slice(1).toLowerCase()) as HistoryItem["status"];
      return {
        id: tx.id,
        provider: meta.provider || "Unknown",
        data: meta.service || meta.plan || meta.purchase || "Transaction", // Extract from metadata
        price: tx.amount || 0,
        date: tx.created_at,
        status: normalizedStatus,
        phoneNumber: meta.phone_number || "N/A",
        reference: tx.reference || "N/A",
        metadata: meta,
        type: tx.type || "unknown",
      };
    }
  );

  return (
    <ClientHistory
      initialHistory={transformedHistory}
      userEmail={user.email || ""}
    />
  );
}

