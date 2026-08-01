// src/app/[countryCode]/dashboard/orders/OrdersTable.tsx
"use client";

import { Order } from "@/types/reseller/orders";
import { CountryConfig } from "@/config/countries";
import { Eye, Package, RefreshCw } from "lucide-react";

interface OrdersTableProps {
  orders: Order[];
  config: CountryConfig;
  translations: any;
  onView: (order: Order) => void;
  onUpdateStatus: (order: Order) => void;
  onUpdate: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => any;
}

export default function OrdersTable({
  orders,
  config,
  translations,
  onView,
  onUpdateStatus,
  onUpdate,
  getStatusColor,
  getStatusIcon,
}: OrdersTableProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number): string => {
    return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: t?.completed || "Completed",
      pending: t?.pending || "Pending",
      processing: t?.processing || "Processing",
      failed: t?.failed || "Failed",
      refunded: t?.refunded || "Refunded",
    };
    return labels[status] || status;
  };

  if (orders.length === 0) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(var(--brand-color-rgb), 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <Package size={24} style={{ color: "var(--brand-color)" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: "1rem", margin: 0 }}>
          {t?.noOrders || "No orders yet"}
        </p>
        <p
          style={{
            color: "var(--dim)",
            fontSize: "0.85rem",
            marginTop: "0.25rem",
          }}
        >
          {t?.startSelling || "Start selling to see your orders here"}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                background: "var(--bg2)",
              }}
            >
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.orderId || "Order ID"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.customer || "Customer"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.plan || "Plan"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "right",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.amount || "Amount"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "right",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.profit || "Profit"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.status || "Status"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "left",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.date || "Date"}
              </th>
              <th
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "right",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.actions || "Actions"}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              const statusColor = getStatusColor(order.status);

              return (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontWeight: 600,
                      color: "var(--text)",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                    }}
                  >
                    {order.order_number || order.id.slice(0, 8)}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: "var(--text)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>
                        {order.customer_name || "Unknown"}
                      </span>
                      {order.customer_email && (
                        <span
                          style={{ fontSize: "0.7rem", color: "var(--dim)" }}
                        >
                          {order.customer_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: "var(--muted)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "var(--text)" }}>
                        {order.plan_name || "Unknown Plan"}
                      </span>
                      {order.plan_category && (
                        <span
                          style={{ fontSize: "0.7rem", color: "var(--dim)" }}
                        >
                          {order.plan_category}
                          {order.network && ` · ${order.network}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {formatPrice(order.amount)}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "right",
                      fontWeight: 600,
                      color: order.profit > 0 ? "#6EBD8A" : "var(--dim)",
                    }}
                  >
                    {order.profit > 0 ? "+" : ""}
                    {formatPrice(order.profit)}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: statusColor,
                        background: `${statusColor}15`,
                        padding: "2px 10px",
                        borderRadius: 100,
                      }}
                    >
                      <StatusIcon size={12} />
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: "var(--muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{formatDate(order.created_at)}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--dim)" }}>
                        {formatTime(order.created_at)}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => onView(order)}
                        style={{
                          padding: "0.3rem 0.6rem",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          color: "var(--muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          fontSize: "0.75rem",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--brand-color)";
                          e.currentTarget.style.color = "var(--text)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.color = "var(--muted)";
                        }}
                      >
                        <Eye size={14} />
                        {t?.view || "View"}
                      </button>
                      {(order.status === "pending" ||
                        order.status === "processing") && (
                        <button
                          onClick={() => onUpdateStatus(order)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            color: "var(--muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontSize: "0.75rem",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#F59E0B";
                            e.currentTarget.style.color = "#F59E0B";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.color = "var(--muted)";
                          }}
                        >
                          <RefreshCw size={14} />
                          {t?.updateStatus || "Update"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
