// src/app/[countryCode]/dashboard/orders/OrdersTable.tsx
"use client";

import { useEffect, useState } from "react";
import { Order } from "@/types/reseller/orders";
import { CountryConfig } from "@/config/countries";
import { Eye, Package, RefreshCw, ChevronDown } from "lucide-react";

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
  // Only the mobile list is collapsible; the desktop table renders every
  // column inline and never uses `expandedId`.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  // There is no order_number column; the provider reference is the closest
  // human-readable identifier, falling back to the id prefix.
  const getOrderRef = (order: Order): string =>
    order.transaction_reference || `#${order.id.slice(0, 8).toUpperCase()}`;

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: t?.completed || "Completed",
      pending: t?.pending || "Pending",
      failed: t?.failed || "Failed",
      cancelled: t?.cancelled || "Cancelled",
    };
    return labels[status] || status;
  };

  const canUpdateStatus = (order: Order): boolean => order.status === "pending";

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
      <style>{`
        .orders-mobile-only { display: none; }
        .order-chevron {
          display: inline-flex;
          align-items: center;
          color: var(--dim);
          transition: transform 0.2s;
        }
        .order-row--expanded .order-chevron { transform: rotate(180deg); }
        .order-details > div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.8rem;
          padding: 0.25rem 0;
        }
        .order-details > div > span:first-child { color: var(--dim); }
        .order-details > div > span:last-child {
          color: var(--text);
          text-align: end;
          overflow-wrap: anywhere;
        }
        @media (max-width: 767px) {
          .orders-desktop-only { display: none; }
          .orders-mobile-only { display: block; }
        }
      `}</style>

      <div className="orders-desktop-only" style={{ overflowX: "auto" }}>
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
              {[
                {
                  key: "orderId",
                  label: t?.orderId || "Order ID",
                  align: "left",
                },
                {
                  key: "customer",
                  label: t?.customer || "Customer",
                  align: "left",
                },
                { key: "plan", label: t?.plan || "Plan", align: "left" },
                { key: "amount", label: t?.amount || "Amount", align: "right" },
                { key: "profit", label: t?.profit || "Profit", align: "right" },
                {
                  key: "status",
                  label: t?.status || "Status",
                  align: "center",
                },
                { key: "date", label: t?.date || "Date", align: "left" },
                {
                  key: "actions",
                  label: t?.actions || "Actions",
                  align: "right",
                },
              ].map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: col.align as React.CSSProperties["textAlign"],
                    color: "var(--muted)",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {col.label}
                </th>
              ))}
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
                    {getOrderRef(order)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text)" }}>
                    {order.customer_name || "Unknown"}
                  </td>
                  <td
                    style={{ padding: "0.75rem 1rem", color: "var(--muted)" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "var(--text)" }}>
                        {order.plan_name || "Unknown Plan"}
                      </span>
                      {order.payment_method && (
                        <span
                          style={{ fontSize: "0.7rem", color: "var(--dim)" }}
                        >
                          {order.payment_method}
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
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
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
                        whiteSpace: "nowrap",
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
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
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
                      {canUpdateStatus(order) && (
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

      {/* Mobile list: plan + customer + amount + status inline, the rest behind a tap */}
      <div className="orders-mobile-only" style={{ padding: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const StatusIcon = getStatusIcon(order.status);
            const statusColor = getStatusColor(order.status);
            const toggle = () => {
              if (!isMobile) return;
              setExpandedId(isExpanded ? null : order.id);
            };

            return (
              <div
                key={order.id}
                className={`order-row${isExpanded ? " order-row--expanded" : ""}`}
                style={{
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "0.75rem",
                }}
              >
                <div
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    cursor: isMobile ? "pointer" : "auto",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: "var(--text)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {order.plan_name || "Unknown Plan"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {order.customer_name || "Unknown"} ·{" "}
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>
                        {formatPrice(order.amount)}
                      </span>
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
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: statusColor,
                        background: `${statusColor}15`,
                        padding: "2px 10px",
                        borderRadius: 100,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <StatusIcon size={12} />
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="order-chevron">
                      <ChevronDown size={16} />
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="order-details"
                    style={{
                      marginTop: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <span>{t?.orderId || "Order ID"}</span>
                      <span style={{ fontFamily: "monospace" }}>
                        {getOrderRef(order)}
                      </span>
                    </div>
                    <div>
                      <span>{t?.profit || "Profit"}</span>
                      <span
                        style={{
                          color: order.profit > 0 ? "#6EBD8A" : "var(--dim)",
                        }}
                      >
                        {order.profit > 0 ? "+" : ""}
                        {formatPrice(order.profit)}
                      </span>
                    </div>
                    <div>
                      <span>{t?.paymentMethod || "Payment"}</span>
                      <span>{order.payment_method || "—"}</span>
                    </div>
                    <div>
                      <span>{t?.date || "Date"}</span>
                      <span>
                        {formatDate(order.created_at)} {formatTime(order.created_at)}
                      </span>
                    </div>

                    {canUpdateStatus(order) && (
                      <button
                        onClick={() => onUpdateStatus(order)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                          padding: "0.55rem",
                          marginTop: "0.75rem",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--text)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <RefreshCw size={15} />
                        {t?.updateStatus || "Update Status"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
