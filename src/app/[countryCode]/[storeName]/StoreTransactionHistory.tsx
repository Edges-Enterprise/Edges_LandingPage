// src/app/[countryCode]/[storeName]/StoreTransactionHistory.tsx
//
// Customer-facing transaction history for the storefront. Mirrors the
// reseller dashboard's TransactionHistory (dashboard/wallet) but reads
// `global_customer_transactions`, whose `type` is already the
// deposit/purchase vocabulary so no reference-based classification is
// needed. Shown inside the fund-wallet modal, which is what the header's
// wallet button opens.
"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatStorePrice } from "@/lib/currency/formatStorePrice";
import type { CountryConfig } from "@/config/countries";
import {
  getCurrentCustomerTransactions,
  type CustomerTransaction,
} from "@/actions/reseller/customers/getCurrentCustomerTransactions";

interface StoreTransactionHistoryProps {
  resellerId: string;
  config: CountryConfig;
  loggedIn: boolean;
  isStoreOwner: boolean;
  /** Bumping this re-fetches — the caller passes the wallet balance so a
   *  deposit credited while the modal is open refreshes the list too. */
  refreshKey?: number;
}

const ICONS = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  purchase: ShoppingBag,
  refund: RefreshCw,
} as const;

const LABELS: Record<CustomerTransaction["type"], string> = {
  deposit: "Wallet funding",
  withdrawal: "Withdrawal",
  purchase: "Purchase",
  refund: "Refund",
};

export default function StoreTransactionHistory({
  resellerId,
  config,
  loggedIn,
  isStoreOwner,
  refreshKey,
}: StoreTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The store owner has no `global_customers` row, so the customer history
    // does not apply — the dashboard has its own wallet page.
    if (!loggedIn || isStoreOwner) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const result = await getCurrentCustomerTransactions(resellerId);
      if (cancelled) return;
      if (result.data) {
        setTransactions(result.data);
        setError(null);
      } else {
        setTransactions([]);
        setError(result.error ?? "Could not load history");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [resellerId, loggedIn, isStoreOwner, refreshKey]);

  if (!loggedIn || isStoreOwner) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h3
        style={{
          fontSize: "0.9rem",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "0.75rem",
        }}
      >
        Transaction history
      </h3>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--muted)",
            fontSize: "0.85rem",
            padding: "0.75rem 0",
          }}
        >
          <Loader2 size={15} className="animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p style={{ color: "#EF4444", fontSize: "0.82rem" }}>{error}</p>
      ) : transactions.length === 0 ? (
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.85rem",
            padding: "0.75rem 0",
          }}
        >
          No transactions yet. Fund your wallet to get started.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {transactions.map((tx) => {
            const Icon = ICONS[tx.type];
            const isIncoming = tx.type === "deposit" || tx.type === "refund";
            const failed = tx.status === "failed";
            const pending = tx.status === "pending";
            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0.65rem 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isIncoming
                      ? "rgba(110,189,138,0.12)"
                      : "var(--bg-muted, #F3F4F6)",
                    color: isIncoming ? "#6EBD8A" : "var(--muted)",
                  }}
                >
                  <Icon size={15} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.83rem",
                      fontWeight: 600,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.description || LABELS[tx.type]}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      marginTop: 1,
                    }}
                  >
                    {new Date(tx.createdAt).toLocaleString(config.locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {pending ? " · Pending" : failed ? " · Failed" : ""}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.83rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: failed
                      ? "var(--muted)"
                      : isIncoming
                        ? "#6EBD8A"
                        : "var(--text)",
                    textDecoration: failed ? "line-through" : "none",
                  }}
                >
                  {isIncoming ? "+" : "−"}
                  {formatStorePrice(tx.netAmount, config)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
