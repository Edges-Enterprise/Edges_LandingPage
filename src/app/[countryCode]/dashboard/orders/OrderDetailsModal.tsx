// src/app/[countryCode]/dashboard/orders/OrderDetailsModal.tsx
"use client";

import {
  X,
  User,
  Package,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Order } from "@/types/reseller/orders";
import { CountryConfig } from "@/config/countries";

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  config: CountryConfig;
  translations: any;
}

export default function OrderDetailsModal({
  order,
  onClose,
  config,
  translations,
}: OrderDetailsModalProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number): string => {
    return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: "#6EBD8A",
      pending: "#F59E0B",
      processing: "#3B82F6",
      failed: "#EF4444",
      refunded: "#8B5CF6",
    };
    return colors[status] || "var(--muted)";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      completed: CheckCircle,
      pending: Clock,
      processing: Clock,
      failed: XCircle,
      refunded: XCircle,
    };
    return icons[status] || Clock;
  };

  const StatusIcon = getStatusIcon(order.status);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.25rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.2rem",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t?.orderDetails || "Order Details"}
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--dim)",
                fontFamily: "monospace",
                margin: "0.25rem 0 0 0",
              }}
            >
              {t?.orderNumber || "Order #"}
              {order.order_number || order.id.slice(0, 8)}
            </p>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: getStatusColor(order.status),
              background: `${getStatusColor(order.status)}15`,
              padding: "4px 12px",
              borderRadius: 100,
            }}
          >
            <StatusIcon size={14} />
            {order.status}
          </span>
        </div>

        {/* Order Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.75rem",
            padding: "1rem",
            background: "var(--bg2)",
            borderRadius: 10,
            marginBottom: "1rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.6rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {t?.total || "Total"}
            </p>
            <p
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {formatPrice(order.amount)}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.6rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {t?.profit || "Profit"}
            </p>
            <p
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: order.profit > 0 ? "#6EBD8A" : "var(--dim)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {order.profit > 0 ? "+" : ""}
              {formatPrice(order.profit)}
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "0.6rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {t?.placedOn || "Placed On"}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        {/* Order Info */}
        <div style={{ marginBottom: "1rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            {t?.orderInfo || "Order Information"}
          </h3>
          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Package size={14} style={{ color: "var(--dim)" }} />
              <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                {order.plan_name || "Unknown Plan"}
                {order.plan_category && (
                  <span style={{ color: "var(--dim)", marginLeft: "0.5rem" }}>
                    · {order.plan_category}
                    {order.network && ` · ${order.network}`}
                  </span>
                )}
              </span>
            </div>
            {order.delivery_details && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Hash size={14} style={{ color: "var(--dim)" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {t?.deliveryDetails || "Delivery"}: {order.delivery_details}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div style={{ marginBottom: "1rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            {t?.customerInfo || "Customer Information"}
          </h3>
          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <User size={14} style={{ color: "var(--dim)" }} />
              <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                {order.customer_name || "Unknown Customer"}
              </span>
            </div>
            {order.customer_email && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Mail size={14} style={{ color: "var(--dim)" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {order.customer_email}
                </span>
              </div>
            )}
            {order.customer_phone && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <Phone size={14} style={{ color: "var(--dim)" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {order.customer_phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Reference Info */}
        {(order.provider_reference || order.request_id) && (
          <div style={{ marginBottom: "1rem" }}>
            <h3
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              {t?.paymentInfo || "Payment Information"}
            </h3>
            <div
              style={{
                display: "grid",
                gap: "0.5rem",
                padding: "0.75rem",
                background: "var(--bg2)",
                borderRadius: 8,
              }}
            >
              {order.provider_reference && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Hash size={14} style={{ color: "var(--dim)" }} />
                  <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                    {t?.providerReference || "Provider Ref"}:{" "}
                    {order.provider_reference}
                  </span>
                </div>
              )}
              {order.request_id && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Hash size={14} style={{ color: "var(--dim)" }} />
                  <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                    {t?.requestId || "Request ID"}: {order.request_id}
                  </span>
                </div>
              )}
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <DollarSign size={14} style={{ color: "var(--dim)" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {t?.paymentStatus || "Payment Status"}:{" "}
                  <span
                    style={{
                      color:
                        order.payment_status === "paid"
                          ? "#6EBD8A"
                          : order.payment_status === "pending"
                            ? "#F59E0B"
                            : "#EF4444",
                      fontWeight: 600,
                    }}
                  >
                    {order.payment_status || "pending"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h3
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            {t?.orderTimeline || "Order Timeline"}
          </h3>
          <div
            style={{
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Clock size={14} style={{ color: "var(--dim)" }} />
              <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                {t?.created || "Created"}: {formatDate(order.created_at)}
              </span>
            </div>
            {order.completed_at && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <CheckCircle size={14} style={{ color: "#6EBD8A" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {t?.completed || "Completed"}:{" "}
                  {formatDate(order.completed_at)}
                </span>
              </div>
            )}
            {order.updated_at && order.updated_at !== order.created_at && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <RefreshCw size={14} style={{ color: "var(--dim)" }} />
                <span style={{ color: "var(--text)", fontSize: "0.85rem" }}>
                  {t?.updated || "Updated"}: {formatDate(order.updated_at)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
