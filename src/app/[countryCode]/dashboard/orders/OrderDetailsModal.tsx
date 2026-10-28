// src/app/[countryCode]/dashboard/orders/OrderDetailsModal.tsx
"use client";

import {
  X,
  User,
  Package,
  Calendar,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
} from "lucide-react";
import { Order, OrderStatusHistoryEntry } from "@/types/reseller/orders";
import { CountryConfig } from "@/config/countries";
import OrderStatusTimeline from "./OrderStatusTimeline";

interface OrderDetailsModalProps {
  order: Order;
  statusHistory?: OrderStatusHistoryEntry[];
  onClose: () => void;
  config: CountryConfig;
  translations: any;
}

export default function OrderDetailsModal({
  order,
  statusHistory = [],
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
      failed: "#EF4444",
      cancelled: "#8B5CF6",
    };
    return colors[status] || "var(--muted)";
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: t?.completed || "Completed",
      pending: t?.pending || "Pending",
      failed: t?.failed || "Failed",
      cancelled: t?.cancelled || "Cancelled",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      completed: CheckCircle,
      pending: Clock,
      failed: XCircle,
      cancelled: XCircle,
    };
    return icons[status] || Clock;
  };

  const StatusIcon = getStatusIcon(order.status);
  const orderRef =
    order.transaction_reference || `#${order.id.slice(0, 8).toUpperCase()}`;

  const infoRow = (
    icon: React.ReactNode,
    label: string,
    value: React.ReactNode,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      <span style={{ color: "var(--dim)", marginTop: 2 }}>{icon}</span>
      <span
        style={{
          color: "var(--muted)",
          fontSize: "0.85rem",
          minWidth: 96,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text)",
          fontSize: "0.85rem",
          flex: 1,
          textAlign: "end",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );

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
        <button
          onClick={onClose}
          aria-label={t?.close || "Close"}
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
            gap: "0.75rem",
            marginBottom: "1rem",
            paddingRight: "1.5rem",
          }}
        >
          <div style={{ minWidth: 0 }}>
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
                overflowWrap: "anywhere",
              }}
            >
              {t?.orderNumber || "Order #"}
              {orderRef}
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
              whiteSpace: "nowrap",
            }}
          >
            <StatusIcon size={14} />
            {getStatusLabel(order.status)}
          </span>
        </div>

        {/* Summary */}
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
          <div style={{ textAlign: "center", minWidth: 0 }}>
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
                overflowWrap: "anywhere",
              }}
            >
              {formatPrice(order.amount)}
            </p>
          </div>
          <div style={{ textAlign: "center", minWidth: 0 }}>
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
                overflowWrap: "anywhere",
              }}
            >
              {order.profit > 0 ? "+" : ""}
              {formatPrice(order.profit)}
            </p>
          </div>
          <div style={{ textAlign: "center", minWidth: 0 }}>
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

        {/* Order info */}
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
              gap: "0.6rem",
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            {infoRow(
              <Package size={14} />,
              t?.plan || "Plan",
              order.plan_name || "Unknown Plan",
            )}
            {infoRow(
              <CreditCard size={14} />,
              t?.paymentMethod || "Payment",
              order.payment_method || "—",
            )}
            {infoRow(
              <Hash size={14} />,
              t?.reference || "Reference",
              order.transaction_reference || "—",
            )}
          </div>
        </div>

        {/* Customer */}
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
              gap: "0.6rem",
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            {infoRow(
              <User size={14} />,
              t?.customer || "Customer",
              order.customer_name || "Unknown Customer",
            )}
          </div>
        </div>

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
              display: "grid",
              gap: "0.6rem",
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            {infoRow(
              <Calendar size={14} />,
              t?.created || "Created",
              formatDate(order.created_at),
            )}
            {order.updated_at && order.updated_at !== order.created_at &&
              infoRow(
                <Clock size={14} />,
                t?.updated || "Updated",
                formatDate(order.updated_at),
              )}
          </div>
        </div>

        {/* Status audit trail */}
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
            {t?.statusHistory || "Status History"}
          </h3>
          <div
            style={{
              padding: "0.75rem",
              background: "var(--bg2)",
              borderRadius: 8,
            }}
          >
            <OrderStatusTimeline
              entries={statusHistory}
              translations={t}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
