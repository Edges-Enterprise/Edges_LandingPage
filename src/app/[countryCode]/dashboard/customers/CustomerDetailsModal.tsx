// src/app/[countryCode]/dashboard/customers/CustomerDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Mail,
  Phone,
  Calendar,
  User,
  Building2,
  ShoppingBag,
} from "lucide-react";
import { Customer } from "@/types/reseller/customers";
import { CountryConfig } from "@/config/countries";

interface CustomerDetailsModalProps {
  customer: Customer;
  onClose: () => void;
  onUpdate: () => void;
  config: CountryConfig;
  translations: any;
}

export default function CustomerDetailsModal({
  customer,
  onClose,
  onUpdate,
  config,
  translations,
}: CustomerDetailsModalProps) {
  const t = translations;
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    status: customer.status || "active",
  });

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("global_customers")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (!error) {
        onUpdate();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: "#6EBD8A",
      inactive: "#F59E0B",
      suspended: "#EF4444",
    };
    return colors[status] || "var(--muted)";
  };

  const getFullName = (): string => {
    if (formData.first_name && formData.last_name) {
      return `${formData.first_name} ${formData.last_name}`;
    }
    return formData.first_name || formData.last_name || "Unknown";
  };

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
          maxWidth: 480,
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
            gap: "0.75rem",
            marginBottom: "1rem",
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
              flexShrink: 0,
            }}
          >
            <User size={24} style={{ color: "var(--brand-color)" }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {getFullName()}
            </h2>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: getStatusColor(formData.status),
                background: `${getStatusColor(formData.status)}15`,
                padding: "2px 10px",
                borderRadius: 100,
                textTransform: "capitalize",
              }}
            >
              {formData.status || "active"}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div
          style={{
            background: "var(--bg2)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <Mail size={16} style={{ color: "var(--dim)" }} />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {customer.email || "No email provided"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <Phone size={16} style={{ color: "var(--dim)" }} />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {customer.phone || "No phone provided"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <Calendar size={16} style={{ color: "var(--dim)" }} />
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Joined {formatDate(customer.created_at)}
            </span>
          </div>
        </div>

        {/* Order History Placeholder */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <ShoppingBag size={16} style={{ color: "var(--brand-color)" }} />
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                margin: 0,
                color: "var(--text)",
              }}
            >
              {t?.orderHistory || "Order History"}
            </h3>
          </div>
          <p
            style={{
              color: "var(--dim)",
              fontSize: "0.85rem",
              margin: 0,
              textAlign: "center",
              padding: "1rem 0",
            }}
          >
            {t?.noOrders || "No orders yet"}
          </p>
        </div>

        {/* Edit/Save Buttons */}
        {isEditing ? (
          <div>
            <div
              style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First Name"
                  style={{
                    padding: "0.6rem 0.75rem",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last Name"
                  style={{
                    padding: "0.6rem 0.75rem",
                    background: "var(--bg2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                style={{
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone"
                style={{
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setIsEditing(false)}
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
                onClick={handleSave}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "var(--brand-color)",
                  color: "#FDF8F3",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {isLoading
                  ? t?.saving || "Saving..."
                  : t?.save || "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              width: "100%",
              padding: "0.6rem",
              background: "transparent",
              border: "1px solid var(--border2)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
              e.currentTarget.style.background =
                "rgba(var(--brand-color-rgb), 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {t?.edit || "Edit Customer"}
          </button>
        )}
      </div>
    </div>
  );
}
