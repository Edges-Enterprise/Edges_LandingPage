// src/components/reseller/application/StoreConfigStep.tsx
"use client";

import { useState, useRef } from "react";
import { ChevronRight, ChevronLeft, Upload, X } from "lucide-react";
import Image from "next/image";

interface StoreConfigStepProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  config: any;
  countryCode: string;
}

const THEMES = [
  { id: "modern", name: "Modern", color: "#C98A54" },
  { id: "classic", name: "Classic", color: "#2563EB" },
  { id: "minimal", name: "Minimal", color: "#111827" },
  { id: "elegant", name: "Elegant", color: "#7C3AED" },
];

export default function StoreConfigStep({
  data,
  onChange,
  onNext,
  onPrevious,
  config,
  countryCode,
}: StoreConfigStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(
    data.logo || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    storeName: data.storeName || "",
    storeSlug: data.storeSlug || "",
    logo: data.logo || "",
    theme: data.theme || "modern",
    brandColor: data.brandColor || config.defaultColor || "#C98A54",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
        setFormData({ ...formData, logo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName = "Store name is required";
    }
    if (!formData.storeSlug.trim()) {
      newErrors.storeSlug = "Store URL is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.storeSlug)) {
      newErrors.storeSlug =
        "Only lowercase letters, numbers, and hyphens allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onChange(formData);
      onNext();
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: "100%",
    padding: "0.75rem 1rem",
    background: "var(--bg2)",
    border: `1px solid ${hasError ? "#EF4444" : "var(--border)"}`,
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
  });

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Store Configuration
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        Set up your branded storefront. This is what your customers will see.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Store Name */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Store Name
            </label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              placeholder="My Data Store"
              style={inputStyle(!!errors.storeName)}
            />
            {errors.storeName && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.storeName}
              </p>
            )}
          </div>

          {/* Store URL/Slug */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Store URL
            </label>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {typeof window !== "undefined" ? window.location.origin : ""}/
                {countryCode}/
              </span>
              <input
                type="text"
                name="storeSlug"
                value={formData.storeSlug}
                onChange={handleChange}
                placeholder="my-store"
                style={{
                  ...inputStyle(!!errors.storeSlug),
                  flex: 1,
                }}
              />
            </div>
            {errors.storeSlug && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.storeSlug}
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Store Logo
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.6rem 1.2rem",
                  background: "var(--bg2)",
                  border: "1px dashed var(--border2)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(201,138,84,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border2)";
                }}
              >
                <Upload size={16} /> Upload Logo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: "none" }}
              />
              {logoPreview && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={48}
                      height={48}
                      style={{
                        objectFit: "contain",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeLogo}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--dim)",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Theme
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, theme: theme.id })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.5rem 1rem",
                    background:
                      formData.theme === theme.id
                        ? "rgba(201,138,84,0.15)"
                        : "var(--bg2)",
                    border: `1px solid ${formData.theme === theme.id ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: theme.color,
                    }}
                  />
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Color */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Brand Color
            </label>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <input
                type="color"
                name="brandColor"
                value={formData.brandColor}
                onChange={handleChange}
                style={{
                  width: 48,
                  height: 48,
                  padding: 0,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "none",
                }}
              />
              <input
                type="text"
                name="brandColor"
                value={formData.brandColor}
                onChange={handleChange}
                style={{
                  ...inputStyle(false),
                  flex: 1,
                  fontFamily: "monospace",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "2rem",
          }}
        >
          <button
            type="button"
            onClick={onPrevious}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,138,84,0.4)";
              e.currentTarget.style.background = "rgba(201,138,84,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChevronLeft size={18} /> Back
          </button>
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "var(--accent)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.2s, transform 0.2s",
              flex: 1,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
