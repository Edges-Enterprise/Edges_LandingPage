// src/app/[countryCode]/dashboard/wallet/TransactionHistory.tsx
"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  RefreshCw,
  CreditCard,
  ChevronDown,
} from "lucide-react";

interface TransactionHistoryProps {
  transactions: any[];
  currencySymbol: string;
  translations: any;
}

export default function TransactionHistory({
  transactions,
  currencySymbol,
  translations,
}: TransactionHistoryProps) {
  const t = translations;
  const [filter, setFilter] = useState<string>("all");
  // Only the compact mobile row is collapsible; on >=768px every row is always
  // expanded and no chevron is shown, so `expandedId` is inert there.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      deposit: ArrowDownLeft,
      withdrawal: ArrowUpRight,
      purchase: ShoppingBag,
      refund: RefreshCw,
      commission: CreditCard,
    };
    const Icon = icons[type] || ShoppingBag;
    return Icon;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      deposit: "#6EBD8A",
      withdrawal: "#EF4444",
      purchase: "#F59E0B",
      refund: "#3B82F6",
      commission: "#8B5CF6",
    };
    return colors[type] || "var(--muted)";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "#6EBD8A",
      pending: "#F59E0B",
      failed: "#EF4444",
      processing: "#3B82F6",
    };
    return colors[status] || "var(--muted)";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: t?.deposit || "Deposit",
      withdrawal: t?.withdrawal || "Withdrawal",
      purchase: t?.purchase || "Purchase",
      refund: t?.refund || "Refund",
      commission: t?.commission || "Commission",
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    // "pending" is a status filter, not a type — it must not be compared
    // against tx.type or it would always match nothing.
    if (filter === "pending") return tx.status === "pending";
    return tx.type === filter;
  });

  const filterOptions = [
    { value: "all", label: t?.all || "All" },
    { value: "deposit", label: t?.deposits || "Deposits" },
    { value: "withdrawal", label: t?.withdrawals || "Withdrawals" },
    { value: "purchase", label: t?.purchases || "Purchases" },
    { value: "pending", label: t?.pending || "Pending" },
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t?.transactions || "Transaction History"}
        </h3>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              style={{
                padding: "0.3rem 0.75rem",
                background:
                  filter === option.value
                    ? "var(--brand-color)"
                    : "transparent",
                color: filter === option.value ? "#FDF8F3" : "var(--muted)",
                border:
                  filter === option.value ? "none" : "1px solid var(--border)",
                borderRadius: 6,
                fontSize: "0.75rem",
                fontWeight: filter === option.value ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (filter !== option.value) {
                  e.currentTarget.style.borderColor = "var(--brand-color)";
                  e.currentTarget.style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== option.value) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--muted)";
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTransactions.length > 0 ? (
        <>
          <style>{`
            .tx-details { display: none; }
            .tx-chevron { display: none; }
            .tx-details > div {
              display: flex;
              justify-content: space-between;
              gap: 1rem;
              font-size: 0.72rem;
              padding: 0.2rem 0;
            }
            .tx-details > div > span:first-child { color: var(--dim); }
            .tx-details > div > span:last-child {
              color: var(--text);
              text-align: end;
              word-break: break-word;
            }
            @media (max-width: 767px) {
              .tx-row { cursor: pointer; }
              .tx-row-meta { display: none !important; }
              .tx-chevron {
                display: inline-flex;
                align-items: center;
                color: var(--dim);
                transition: transform 0.2s;
              }
              .tx-row--expanded .tx-chevron { transform: rotate(180deg); }
              .tx-row--expanded .tx-details {
                display: block;
                margin-top: 0.65rem;
                padding-top: 0.65rem;
                border-top: 1px solid var(--border);
              }
            }
          `}</style>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {filteredTransactions.map((tx, index) => {
              const Icon = getTypeIcon(tx.type);
              const typeColor = getTypeColor(tx.type);
              const statusColor = getStatusColor(tx.status);
              const isPositive =
                tx.type === "deposit" || tx.type === "commission";
              const amount = isPositive ? tx.amount : -tx.amount;
              const txKey = tx.id || `tx-${index}`;
              const isExpanded = expandedId === txKey;
              const toggle = () => {
                if (!isMobile) return;
                setExpandedId(isExpanded ? null : txKey);
              };

              return (
                <div
                  key={txKey}
                  className={`tx-row${isExpanded ? " tx-row--expanded" : ""}`}
                  role={isMobile ? "button" : undefined}
                  tabIndex={isMobile ? 0 : undefined}
                  aria-expanded={isMobile ? isExpanded : undefined}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (!isMobile) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "var(--bg2)",
                    borderRadius: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg2)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `${typeColor}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} style={{ color: typeColor }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {tx.description || getTypeLabel(tx.type)}
                        </div>
                        <div
                          className="tx-row-meta"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.7rem",
                            color: "var(--dim)",
                          }}
                        >
                          <span>{formatDate(tx.created_at)}</span>
                          <span>·</span>
                          <span>{formatTime(tx.created_at)}</span>
                          <span>·</span>
                          <span
                            style={{
                              color: statusColor,
                              fontWeight: 500,
                            }}
                          >
                            {tx.status || "completed"}
                          </span>
                          {tx.reference && (
                            <>
                              <span>·</span>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "0.65rem",
                                }}
                              >
                                #{tx.reference.slice(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: isPositive ? "#6EBD8A" : "#EF4444",
                        }}
                      >
                        {isPositive ? "+" : "-"}
                        {currencySymbol} {Math.abs(amount).toLocaleString()}
                      </div>
                      <span className="tx-chevron">
                        <ChevronDown size={16} />
                      </span>
                    </div>
                  </div>

                  <div className="tx-details">
                    <div>
                      <span>{t?.status || "Status"}</span>
                      <span style={{ color: statusColor }}>
                        {tx.status || "completed"}
                      </span>
                    </div>
                    <div>
                      <span>{t?.date || "Date"}</span>
                      <span>{formatDate(tx.created_at)}</span>
                    </div>
                    <div>
                      <span>{t?.time || "Time"}</span>
                      <span>{formatTime(tx.created_at)}</span>
                    </div>
                    {tx.reference && (
                      <div>
                        <span>{t?.reference || "Reference"}</span>
                        <span style={{ fontFamily: "monospace" }}>
                          #{tx.reference.slice(0, 8)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "2rem 0",
            color: "var(--dim)",
          }}
        >
          <p style={{ fontSize: "0.95rem", margin: 0 }}>
            {t?.noTransactions || "No transactions yet"}
          </p>
          <p style={{ fontSize: "0.8rem", margin: "0.25rem 0 0 0" }}>
            {t?.startTransacting || "Fund your wallet to get started"}
          </p>
        </div>
      )}
    </div>
  );
}
