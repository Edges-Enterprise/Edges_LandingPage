// src/app/[countryCode]/dashboard/StatsCards.tsx
"use client";

import { Users, ShoppingBag, TrendingUp, Wallet } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total_customers: number;
    total_orders: number;
    total_revenue: number;
    total_profit: number;
    orders_last_30_days: number;
    customers_last_30_days: number;
  };
  currencySymbol: string;
  translations: any;
}

export default function StatsCards({
  stats,
  currencySymbol,
  translations,
}: StatsCardsProps) {
  const t = translations;

  const cards = [
    {
      icon: Users,
      label: t?.totalCustomers || "Total Customers",
      value: stats.total_customers || 0,
      change: stats.customers_last_30_days || 0,
      changeLabel: t?.last30Days || "last 30 days",
      color: "#3B82F6",
    },
    {
      icon: ShoppingBag,
      label: t?.totalOrders || "Total Orders",
      value: stats.total_orders || 0,
      change: stats.orders_last_30_days || 0,
      changeLabel: t?.last30Days || "last 30 days",
      color: "#8B5CF6",
    },
    {
      icon: TrendingUp,
      label: t?.totalRevenue || "Total Revenue",
      value: `${currencySymbol} ${(stats.total_revenue || 0).toLocaleString()}`,
      change: stats.total_profit || 0,
      changeLabel: t?.profit || "profit",
      color: "#10B981",
    },
    {
      icon: Wallet,
      label: t?.totalProfit || "Total Profit",
      value: `${currencySymbol} ${(stats.total_profit || 0).toLocaleString()}`,
      change: stats.total_profit
        ? Math.round((stats.total_profit / (stats.total_revenue || 1)) * 100)
        : 0,
      changeLabel: t?.margin || "margin",
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
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.25rem",
            transition: "transform 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.borderColor = "rgba(201,138,84,0.2)";
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
              marginBottom: "0.25rem",
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                color:
                  card.change > 0
                    ? "#10B981"
                    : card.change === 0
                      ? "var(--muted)"
                      : "#EF4444",
              }}
            >
              {card.change > 0 ? "+" : ""}
              {card.change}
            </span>
            <span>{card.changeLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
