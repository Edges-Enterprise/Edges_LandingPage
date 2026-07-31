// src/app/[countryCode]/dashboard/wallet/WalletSummary.tsx
"use client";

import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";

interface WalletSummaryProps {
  wallet: {
    balance: number;
    currency: string;
    status: string;
  };
  currencySymbol: string;
  translations: any;
}

export default function WalletSummary({
  wallet,
  currencySymbol,
  translations,
}: WalletSummaryProps) {
  const t = translations;

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate some mock stats (will be replaced with real data later)
  const stats = {
    total_deposits: 0,
    total_withdrawals: 0,
    total_spent: 0,
  };

  const summaryCards = [
    {
      icon: Wallet,
      label: t?.availableBalance || "Available Balance",
      value: formatCurrency(wallet.balance),
      color: "var(--brand-color)",
    },
    {
      icon: TrendingUp,
      label: t?.totalDeposits || "Total Deposits",
      value: formatCurrency(stats.total_deposits),
      color: "#6EBD8A",
    },
    {
      icon: TrendingDown,
      label: t?.totalWithdrawals || "Total Withdrawals",
      value: formatCurrency(stats.total_withdrawals),
      color: "#EF4444",
    },
    {
      icon: CreditCard,
      label: t?.totalSpent || "Total Spent",
      value: formatCurrency(stats.total_spent),
      color: "#F59E0B",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      {summaryCards.map((card, index) => (
        <div
          key={index}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.25rem",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.borderColor =
              "rgba(var(--brand-color-rgb), 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {card.label}
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${card.color}15`,
              }}
            >
              <card.icon size={16} style={{ color: card.color }} />
            </div>
          </div>

          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {card.value}
          </div>

          {index === 0 && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginTop: "0.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    wallet.status === "active" ? "#6EBD8A" : "#EF4444",
                  display: "inline-block",
                }}
              />
              {wallet.status === "active"
                ? t?.active || "Active"
                : t?.inactive || "Inactive"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
