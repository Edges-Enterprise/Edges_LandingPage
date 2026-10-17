// src/app/[countryCode]/dashboard/ActivityFeed.tsx
"use client";

import { ShoppingBag, Users, Wallet, Smartphone, Clock } from "lucide-react";

interface ActivityFeedProps {
  activity: any[];
  translations: any;
}

const activityIcons: Record<string, any> = {
  order: ShoppingBag,
  customer: Users,
  transaction: Wallet,
  build: Smartphone,
};

const activityColors: Record<string, string> = {
  order: "#8B5CF6",
  customer: "#3B82F6",
  transaction: "#10B981",
  build: "#F59E0B",
};

export default function ActivityFeed({
  activity,
  translations,
}: ActivityFeedProps) {
  const t = translations;

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      order: t?.order || "Order",
      customer: t?.customer || "Customer",
      transaction: t?.transaction || "Transaction",
      build: t?.build || "App Build",
    };
    return map[type] || type;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t?.justNow || "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return past.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
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
          fontSize: "1rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
        }}
      >
        {t?.recentActivity || "Recent Activity"}
      </h3>

      {activity && activity.length > 0 ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {activity.slice(0, 5).map((item, index) => {
            const Icon = activityIcons[item.type] || Clock;
            const color = activityColors[item.type] || "var(--muted)";

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  background: "var(--bg2)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: `${color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} style={{ color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    {item.data?.customer_name ||
                      item.data?.plan_name ||
                      item.data?.message ||
                      `${getTypeLabel(item.type)} ${item.entity_id?.slice(0, 8)}`}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--dim)" }}>
                    {getTimeAgo(item.created_at)}
                  </div>
                </div>

                {item.data?.total && (
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    ₦{item.data.total}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p
          style={{
            color: "var(--dim)",
            textAlign: "center",
            padding: "1rem 0",
          }}
        >
          {t?.noActivity || "No recent activity yet"}
        </p>
      )}
    </div>
  );
}
