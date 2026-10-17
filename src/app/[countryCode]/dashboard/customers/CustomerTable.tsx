// src/app/[countryCode]/dashboard/customers/CustomerTable.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Eye, Edit2, Trash2, Users, MoreVertical, Mail, Phone } from "lucide-react";
import { Customer } from "@/types/reseller/customers";
import { CountryConfig } from "@/config/countries";

interface CustomerTableProps {
  customers: Customer[];
  config: CountryConfig;
  translations: any;
  onView: (customer: Customer) => void;
  onUpdate: () => void;
  onDelete: () => void;
  getStatusColor: (status: string) => string;
}

export default function CustomerTable({
  customers,
  config,
  translations,
  onView,
  onUpdate,
  onDelete,
  getStatusColor,
}: CustomerTableProps) {
  const t = translations;
  const supabase = createClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );

  const formatDate = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFullName = (customer: Customer): string => {
    if (customer.first_name && customer.last_name) {
      return `${customer.first_name} ${customer.last_name}`;
    }
    return (
      customer.first_name || customer.last_name || customer.email || "Unknown"
    );
  };

  const handleDelete = async (customerId: string): Promise<void> => {
    setDeletingId(customerId);
    try {
      const { error } = await supabase
        .from("global_customers")
        .delete()
        .eq("id", customerId);

      if (!error) {
        onDelete();
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (customers.length === 0) {
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
          <Users size={24} style={{ color: "var(--brand-color)" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: "1rem", margin: 0 }}>
          {t?.noCustomers || "No customers yet"}
        </p>
        <p
          style={{
            color: "var(--dim)",
            fontSize: "0.85rem",
            marginTop: "0.25rem",
          }}
        >
          {t?.startAdding || "Add your first customer to start selling"}
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
                {t?.name || "Name"}
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
                {t?.email || "Email"}
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
                {t?.phone || "Phone"}
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
                {t?.joined || "Joined"}
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
            {customers.map((customer) => (
              <tr
                key={customer.id}
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
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {getFullName(customer)}
                </td>
                <td
                  style={{
                    padding: "0.75rem 1rem",
                    color: "var(--muted)",
                  }}
                >
                  {customer.email || "—"}
                </td>
                <td
                  style={{
                    padding: "0.75rem 1rem",
                    color: "var(--muted)",
                  }}
                >
                  {customer.phone || "—"}
                </td>
                <td
                  style={{
                    padding: "0.75rem 1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: getStatusColor(customer.status),
                      background: `${getStatusColor(customer.status)}15`,
                      padding: "2px 10px",
                      borderRadius: 100,
                      textTransform: "capitalize",
                    }}
                  >
                    {customer.status || "active"}
                  </span>
                </td>
                <td
                  style={{
                    padding: "0.75rem 1rem",
                    color: "var(--muted)",
                    fontSize: "0.8rem",
                  }}
                >
                  {formatDate(customer.created_at)}
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
                      onClick={() => onView(customer)}
                      style={{
                        padding: "0.3rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--brand-color)";
                        e.currentTarget.style.background =
                          "rgba(var(--brand-color-rgb), 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title={t?.view || "View"}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onView(customer)}
                      style={{
                        padding: "0.3rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#F59E0B";
                        e.currentTarget.style.background =
                          "rgba(245,158,11,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title={t?.edit || "Edit"}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(customer.id)}
                      style={{
                        padding: "0.3rem",
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        borderRadius: 4,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#EF4444";
                        e.currentTarget.style.background =
                          "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title={t?.delete || "Delete"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(null);
            }
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              maxWidth: 400,
              width: "100%",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: "var(--text)",
              }}
            >
              {t?.deleteConfirm || "Are you sure?"}
            </h3>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              {t?.deleteWarning || "This action cannot be undone."}
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(null)}
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
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  cursor:
                    deletingId === showDeleteConfirm
                      ? "not-allowed"
                      : "pointer",
                  opacity: deletingId === showDeleteConfirm ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (deletingId !== showDeleteConfirm) {
                    e.currentTarget.style.background = "#DC2626";
                  }
                }}
              >
                {deletingId === showDeleteConfirm
                  ? t?.deleting || "Deleting..."
                  : t?.confirmDelete || "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
