// src/app/[countryCode]/dashboard/orders/UpdateStatusModal.tsx
"use client";

import { useState } from "react";
import { X, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types/reseller/orders";
import { CountryConfig } from "@/config/countries";

interface UpdateStatusModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
  config: CountryConfig;
  translations: any;
}

export default function UpdateStatusModal({
  order,
  onClose,
  onSuccess,
  config,
  translations,
}: UpdateStatusModalProps) {
  const t = translations;
  const supabase = createClient();
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const statusOptions = [
    {
      value: "pending",
      label: t?.pending || "Pending",
      icon: Clock,
      color: "#F59E0B",
    },
    {
      value: "processing",
      label: t?.processing || "Processing",
      icon: RefreshCw,
      color: "#3B82F6",
    },
    {
      value: "completed",
      label: t?.completed || "Completed",
      icon: CheckCircle,
      color: "#6EBD8A",
    },
    {
      value: "failed",
      label: t?.failed || "Failed",
      icon: XCircle,
      color: "#EF4444",
    },
    {
      value: "refunded",
      label: t?.refunded || "Refunded",
      icon: XCircle,
      color: "#8B5CF6",
    },
  ];

  const handleSubmit = async () => {
    if (selectedStatus === order.status) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updates: any = {
        status: selectedStatus,
        updated_at: new Date().toISOString(),
      };

      if (selectedStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("global_orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      setError(t?.errorUpdating || "Failed to update order status");
      console.error("Status update error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const option = statusOptions.find((s) => s.value === status);
    return option?.icon || Clock;
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find((s) => s.value === status);
    return option?.color || "var(--muted)";
  };

  const currentStatusOption = statusOptions.find(
    (s) => s.value === order.status,
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
          maxWidth: 400,
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

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.2rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          {t?.updateStatus || "Update Order Status"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.orderNumber || "Order #"}
          {order.order_number || order.id.slice(0, 8)}
        </p>

        {/* Current Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "var(--bg2)",
            borderRadius: 8,
            marginBottom: "1.5rem",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {t?.currentStatus || "Current Status"}:
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: getStatusColor(order.status),
              background: `${getStatusColor(order.status)}15`,
              padding: "2px 10px",
              borderRadius: 100,
            }}
          >
            {currentStatusOption && <currentStatusOption.icon size={14} />}
            {order.status}
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              color: "#EF4444",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Status Options */}
        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedStatus === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 1rem",
                  background: isSelected ? `${option.color}15` : "transparent",
                  border: isSelected
                    ? `1px solid ${option.color}`
                    : "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = option.color;
                    e.currentTarget.style.background = `${option.color}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={18} style={{ color: option.color }} />
                <span
                  style={{
                    color: isSelected ? option.color : "var(--text)",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <span style={{ marginLeft: "auto", color: option.color }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.6rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {t?.cancel || "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "0.6rem",
              background:
                selectedStatus === order.status
                  ? "var(--bg2)"
                  : "var(--brand-color)",
              color: selectedStatus === order.status ? "var(--dim)" : "#FDF8F3",
              border: "none",
              borderRadius: 8,
              fontSize: "0.9rem",
              cursor:
                isLoading || selectedStatus === order.status
                  ? "not-allowed"
                  : "pointer",
              opacity: isLoading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {isLoading
              ? t?.updating || "Updating..."
              : t?.updateStatus || "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}
