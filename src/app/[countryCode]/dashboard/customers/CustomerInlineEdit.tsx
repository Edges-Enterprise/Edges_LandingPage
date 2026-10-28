// src/app/[countryCode]/dashboard/customers/CustomerInlineEdit.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/types/reseller/customers";
import { CountryConfig } from "@/config/countries";

interface CustomerInlineEditProps {
  customer: Customer;
  config: CountryConfig;
  translations: any;
  onSaved: () => void;
  onCancel: () => void;
}

// Inline editor used by the mobile customer dropdown. It mirrors the update
// path of CustomerDetailsModal so the two stay behaviourally identical, but
// renders inside the list row instead of a modal.
export default function CustomerInlineEdit({
  customer,
  translations,
  onSaved,
  onCancel,
}: CustomerInlineEditProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    status: customer.status || "active",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("global_customers")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email.trim() || "",
          phone: formData.phone.trim() || "",
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customer.id);

      if (updateError) throw updateError;
      onSaved();
    } catch (err) {
      console.error("Update error:", err);
      setError(t?.errorUpdating || "Failed to update customer");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.7rem",
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.85rem",
    outline: "none",
  };

  return (
    <div
      style={{ display: "grid", gap: "0.6rem", marginTop: "0.75rem" }}
      onClick={(e) => e.stopPropagation()}
    >
      {error && (
        <div
          style={{
            padding: "0.5rem 0.7rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            color: "#EF4444",
            fontSize: "0.78rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <input
          type="text"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          placeholder={t?.firstName || "First Name"}
          style={fieldStyle}
        />
        <input
          type="text"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          placeholder={t?.lastName || "Last Name"}
          style={fieldStyle}
        />
      </div>

      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder={t?.email || "Email"}
        style={fieldStyle}
      />

      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder={t?.phone || "Phone"}
        style={fieldStyle}
      />

      <select
        name="status"
        value={formData.status}
        onChange={handleChange}
        style={{ ...fieldStyle, cursor: "pointer" }}
      >
        <option value="active">{t?.active || "Active"}</option>
        <option value="inactive">{t?.inactive || "Inactive"}</option>
      </select>

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.55rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: "0.85rem",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {t?.cancel || "Cancel"}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.55rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? t?.saving || "Saving..." : t?.save || "Save"}
        </button>
      </div>
    </div>
  );
}
