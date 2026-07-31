// src/app/[countryCode]/dashboard/DashboardClient.tsx
"use client";

import { useState } from "react";
import StatsCards from "./StatsCards";
import RevenueChart from "./RevenueChart";
import ActivityFeed from "./ActivityFeed";
import QuickActions from "./QuickActions";
import { CountryConfig } from "@/config/countries";

interface DashboardClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  dashboardData: any;
}

export default function DashboardClient({
  countryCode,
  config,
  translations,
  dashboardData,
}: DashboardClientProps) {
  const [data] = useState(dashboardData);
  const t = translations;

  if (!data || data.error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <p style={{ color: "var(--muted)" }}>
          {t?.error || "Unable to load dashboard. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1.5rem",
            background: "var(--accent)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t?.retry || "Retry"}
        </button>
      </div>
    );
  }

  const stats = data.stats || {
    total_customers: 0,
    total_orders: 0,
    total_revenue: 0,
    total_profit: 0,
    orders_last_30_days: 0,
    customers_last_30_days: 0,
  };

  const currencySymbol = config.currencySymbol || "₦";

  return (
    <div>
      {/* Stats Cards */}
      <StatsCards
        stats={stats}
        currencySymbol={currencySymbol}
        translations={t}
      />

      {/* Quick Actions */}
      <QuickActions
        countryCode={countryCode}
        storeSlug={data.store_slug}
        translations={t}
      />

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <RevenueChart
          revenue={data.revenue || []}
          currencySymbol={currencySymbol}
          translations={t}
        />
        <ActivityFeed activity={data.activity || []} translations={t} />
      </div>

      {/* Top Products */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          {t?.topProducts || "Top Selling Products"}
        </h3>

        {data.top_products && data.top_products.length > 0 ? (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {data.top_products.map((product: any, index: number) => (
              <div
                key={product.plan_id || index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg2)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "var(--accent)",
                      width: 24,
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {product.plan_name || "Unknown Plan"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>
                    {product.total_orders || 0} {t?.orders || "orders"}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {currencySymbol}{" "}
                    {product.total_revenue?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "var(--dim)",
              textAlign: "center",
              padding: "1rem 0",
            }}
          >
            {t?.noProducts ||
              "No products sold yet. Start selling to see your top products!"}
          </p>
        )}
      </div>
    </div>
  );
}
