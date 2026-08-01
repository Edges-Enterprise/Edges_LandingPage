// src/app/[countryCode]/dashboard/customers/AddCustomerModal.tsx
"use client";

import { useState } from "react";
import { X, User, Mail, Phone, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountryConfig } from "@/config/countries";

interface AddCustomerModalProps {
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  config: CountryConfig;
  translations: any;
}

export default function AddCustomerModal({
  onClose,
  onSuccess,
  applicationId,
  config,
  translations,
}: AddCustomerModalProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    customer_type: "individual",
    status: "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = t?.firstNameRequired || "First name is required";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t?.emailInvalid || "Please enter a valid email";
    }

    if (formData.phone && !/^[\d\s+()-]{7,}$/.test(formData.phone)) {
      newErrors.phone = t?.phoneInvalid || "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("global_customers")
        .insert({
          reseller_id: applicationId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          customer_type: formData.customer_type,
          status: formData.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Add customer error:", error);
      setErrors({ submit: t?.errorAdding || "Failed to add customer" });
    } finally {
      setIsLoading(false);
    }
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

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          {t?.addCustomerTitle || "Add New Customer"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.addCustomerDescription ||
            "Enter the customer's details to add them to your store."}
        </p>

        {errors.submit && (
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
            {errors.submit}
          </div>
        )}

        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
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
                {t?.firstName || "First Name"} *
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg2)",
                  border: `1px solid ${errors.first_name ? "#EF4444" : "var(--border)"}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <User
                  size={16}
                  style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
                />
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
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
              {errors.first_name && (
                <p
                  style={{
                    color: "#EF4444",
                    fontSize: "0.75rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {errors.first_name}
                </p>
              )}
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
                {t?.lastName || "Last Name"}
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "var(--bg2)",
                  border: `1px solid ${errors.last_name ? "#EF4444" : "var(--border)"}`,
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
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
              {t?.email || "Email"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg2)",
                border: `1px solid ${errors.email ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Mail
                size={16}
                style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
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
            {errors.email && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.email}
              </p>
            )}
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
              {t?.phoneNumber || "Phone Number"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg2)",
                border: `1px solid ${errors.phone ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Phone
                size={16}
                style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
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
            {errors.phone && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.phone}
              </p>
            )}
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
              {t?.customerType || "Customer Type"}
            </label>
            <select
              name="customer_type"
              value={formData.customer_type}
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
              <option value="individual">
                {t?.individual || "Individual"}
              </option>
              <option value="business">{t?.business || "Business"}</option>
              <option value="enterprise">
                {t?.enterprise || "Enterprise"}
              </option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            marginTop: "1.5rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
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
          {isLoading ? t?.saving || "Saving..." : t?.save || "Save Customer"}
        </button>
      </div>
    </div>
  );
}
