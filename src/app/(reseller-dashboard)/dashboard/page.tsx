// app/(reseller-dashboard)/page.tsx

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { checkResellerStatusById } from "@/app/actions/reseller/wallet/resellerCustomerWallet";
import { getDashboardStats } from "@/app/actions/reseller/analytics/getDashboardStats";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import { Card } from "./Card";
import { Badge } from "./Badge";

export default async function DashboardOverview() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/reseller");

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!reseller) redirect("/reseller");

  const stats = await getDashboardStats(reseller.id);
  const resellerStatus = await checkResellerStatusById(reseller.id);

  const date = new Date();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          Dashboard Overview
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {month} {year} — Your store performance at a glance
        </p>
      </div>
      
      {!resellerStatus.canSell && (
        <div
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 12,
            padding: "1.25rem 1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <AlertTriangle
            size={22}
            style={{ color: "#FBBF24", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <h3
              style={{
                fontWeight: 600,
                color: "#FBBF24",
                marginBottom: 4,
                fontSize: "0.95rem",
              }}
            >
              Complete Your Store Setup
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              {!resellerStatus.hasWhatsApp ? (
                <>
                  You need to add your WhatsApp number so customers can contact
                  you.{" "}
                  <Link
                    href="/dashboard/settings"
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Add WhatsApp number →
                  </Link>
                </>
              ) : !resellerStatus.hasVirtualAccount ? (
                <>
                  You need to create a virtual account before customers can
                  purchase from your store.{" "}
                  <Link
                    href="/dashboard/wallet"
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Set up now →
                  </Link>
                </>
              ) : !resellerStatus.hasBalance ? (
                <>
                  Your wallet balance is empty. Fund your wallet so customers
                  can start purchasing.{" "}
                  <Link
                    href="/dashboard/wallet"
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Fund wallet →
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}
      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                  marginBottom: 4,
                }}
              >
                Wallet Balance
              </p>
              <p
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {formatNaira(stats.walletBalance)}
              </p>
            </div>
            <span style={{ fontSize: "2rem" }}>💰</span>
          </div>
        </Card>

    

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                  marginBottom: 4,
                }}
              >
                Total Profit
              </p>
              <p
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--green)",
                }}
              >
                {formatNaira(stats.totalProfit)}
              </p>
            </div>
            <span style={{ fontSize: "2rem" }}>📈</span>
          </div>
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                  marginBottom: 4,
                }}
              >
                Total Orders
              </p>
              <p
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {stats.totalOrders}
              </p>
            </div>
            <span style={{ fontSize: "2rem" }}>🛒</span>
          </div>
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                  marginBottom: 4,
                }}
              >
                Active Customers
              </p>
              <p
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {stats.activeCustomers}
              </p>
            </div>
            <span style={{ fontSize: "2rem" }}>👥</span>
          </div>
        </Card>
      </div>
      {/* Recent Orders */}
      <Card padding="none">
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{ fontWeight: 600, color: "var(--text)", fontSize: "1rem" }}
          >
            Recent Orders
          </h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--dim)",
            }}
          >
            <p>No orders yet. Share your store link to start selling!</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Profit</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={tdStyle}>{order.customer_email}</td>
                    <td style={tdStyle}>{order.plan?.plan_name || "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {formatNaira(order.amount)}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--green)" }}>
                      {formatNaira(order.profit)}
                    </td>
                    <td style={tdStyle}>
                      <Badge
                        variant={
                          order.status === "completed"
                            ? "success"
                            : order.status === "pending"
                              ? "warning"
                              : "error"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--dim)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.88rem",
  color: "var(--text)",
};
