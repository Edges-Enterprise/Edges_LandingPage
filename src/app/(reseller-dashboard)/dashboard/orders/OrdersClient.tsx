"use client";

import { Card } from "../Card";
import { Badge } from "../Badge";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import type { Order } from "@/types";
import { ShoppingCart } from "lucide-react";

export function OrdersClient({ orders }: { orders: Order[] }) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);

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
          Orders
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          View all customer purchases
        </p>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <Card>
          <p
            style={{ fontSize: "0.8rem", color: "var(--dim)", marginBottom: 4 }}
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
            {orders.length}
          </p>
        </Card>
        <Card>
          <p
            style={{ fontSize: "0.8rem", color: "var(--dim)", marginBottom: 4 }}
          >
            Total Revenue
          </p>
          <p
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "var(--accent-lt)",
            }}
          >
            {formatNaira(totalRevenue)}
          </p>
        </Card>
        <Card>
          <p
            style={{ fontSize: "0.8rem", color: "var(--dim)", marginBottom: 4 }}
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
            {formatNaira(totalProfit)}
          </p>
        </Card>
      </div>

      {/* Orders Table */}
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
            All Orders
          </h2>
        </div>
        {orders.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--dim)",
            }}
          >
            <ShoppingCart
              size={40}
              style={{ margin: "0 auto 0.75rem", opacity: 0.3 }}
            />
            <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
              No orders yet
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              Share your store link to start receiving orders
            </p>
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
                  <th style={thStyle}>Order ID</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Profit</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        ...tdStyle,
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {order.id.slice(0, 8)}...
                    </td>
                    <td style={tdStyle}>{order.customer_email}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "0.15rem 0.5rem",
                          borderRadius: 100,
                          fontSize: "0.72rem",
                          background:
                            order.plan?.category === "data"
                              ? "rgba(59,130,246,0.12)"
                              : "rgba(168,85,247,0.12)",
                          color:
                            order.plan?.category === "data"
                              ? "#60A5FA"
                              : "#C084FC",
                        }}
                      >
                        {order.plan?.category === "data" ? "📱" : "📞"}{" "}
                        {order.plan?.name || "—"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {formatNaira(order.amount)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--green)",
                        fontWeight: 600,
                      }}
                    >
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
