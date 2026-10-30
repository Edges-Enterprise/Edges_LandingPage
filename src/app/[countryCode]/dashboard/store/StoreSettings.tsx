// src/app/[countryCode]/dashboard/store/StoreSettings.tsx
"use client";

import { useState } from "react";
import { Store, Mail, Phone, Lock } from "lucide-react";
import { saveStoreProfile } from "@/actions/reseller/store/saveStoreProfile";
import { CountryConfig } from "@/config/countries";
import { StoreSettings as StoreSettingsType } from "@/types/reseller/store";

interface StoreSettingsProps {
  application: {
    id: string;
    store_name: string;
    store_slug: string;
    country_code: string;
  };
  settings: StoreSettingsType;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
  onUpdate: (data: any) => void;
}

export default function StoreSettings({
  application,
  settings,
  config,
  translations,
  onSave,
  onUpdate,
}: StoreSettingsProps) {
  const t = translations;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_status: settings.store_status || "active",
    welcome_message: settings.welcome_message || "",
    contact_phone: settings.contact_phone || "",
  });
  const [error, setError] = useState<string | null>(null);

  // Store name and contact email identify the reseller account, so they are
  // shown read-only. The store URL is derived from the store name and is no
  // longer surfaced here.
  const readOnlyName = settings.store_name || application.store_name || "";
  const readOnlyEmail = settings.contact_email || "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await saveStoreProfile({
        applicationId: application.id,
        welcomeMessage: formData.welcome_message,
        storeStatus: formData.store_status as
          | "active"
          | "inactive"
          | "maintenance",
        contactPhone: formData.contact_phone,
      });

      if (!result.success) throw new Error(result.error);

      onUpdate({
        ...settings,
        store_status: formData.store_status,
        welcome_message: formData.welcome_message,
        contact_phone: formData.contact_phone,
      });

      onSave();
    } catch (err) {
      setError(t?.error || "Failed to save changes");
      console.error("Store settings error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const readOnlyFieldStyle: React.CSSProperties = {
    flex: 1,
    padding: "0.6rem 0.75rem",
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: "0.9rem",
    outline: "none",
    cursor: "not-allowed",
  };

  const statusOptions = [
    { value: "active", label: t?.active || "Active" },
    { value: "inactive", label: t?.inactive || "Inactive" },
    { value: "maintenance", label: t?.maintenance || "Maintenance" },
  ];

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {t?.storeSettings || "Store Settings"}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {t?.configureStore || "Configure your store's basic settings"}
      </p>

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

      <div style={{ display: "grid", gap: "1rem", maxWidth: 500 }}>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.storeName || "Store Name"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Store size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
            <input
              type="text"
              name="store_name"
              value={readOnlyName}
              readOnly
              disabled
              aria-readonly="true"
              style={readOnlyFieldStyle}
            />
            <Lock size={13} style={{ color: "var(--dim)", marginRight: "0.75rem" }} />
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.storeStatus || "Store Status"}
          </label>
          <select
            name="store_status"
            value={formData.store_status}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: "0.9rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.welcomeMessage || "Welcome Message"}
          </label>
          <textarea
            name="welcome_message"
            value={formData.welcome_message}
            onChange={handleChange}
            rows={2}
            placeholder={t?.welcomeMessagePlaceholder || "Welcome to our store!"}
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: "0.9rem",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.contactEmail || "Contact Email"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Mail size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
            <input
              type="email"
              name="contact_email"
              value={readOnlyEmail}
              readOnly
              disabled
              aria-readonly="true"
              placeholder="contact@store.com"
              style={readOnlyFieldStyle}
            />
            <Lock size={13} style={{ color: "var(--dim)", marginRight: "0.75rem" }} />
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.35rem",
            }}
          >
            {t?.contactPhone || "Contact Phone"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Phone size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              placeholder="+1234567890"
              style={{
                flex: 1,
                padding: "0.6rem 0.75rem",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            padding: "0.75rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
            marginTop: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading ? t?.saving || "Saving..." : t?.saveChanges || "Save Changes"}
        </button>
      </div>
    </div>
  );
}