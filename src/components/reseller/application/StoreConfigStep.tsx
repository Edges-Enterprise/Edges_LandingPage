// src/components/reseller/application/StoreConfigStep.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  Smartphone,
  Palette,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { checkStoreSlug } from "@/actions/reseller/application/checkStoreSlug";

interface StoreConfigStepProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  config: any;
  countryCode: string;
  translations?: any;
}

interface StoreFormData {
  storeName: string;
  storeSlug: string;
  logo: string;
  brandColor: string;
  androidApp: boolean;
}

const SWATCHES = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#DB2777", // Pink
  "#DC2626", // Red
  "#D97706", // Amber
  "#16A34A", // Green
  "#0D9488", // Teal
  "#111827", // Dark
  "#C98A54", // Gold (Edges default)
];

export default function StoreConfigStep({
  data,
  onChange,
  onNext,
  onPrevious,
  config,
  countryCode,
  translations,
}: StoreConfigStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(
    data.logo || null,
  );
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(
    null,
  );
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Store name check states
  const [storeNameStatus, setStoreNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [storeNameMessage, setStoreNameMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const t = translations || {};

  // Auto-generate store URL from store name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const [formData, setFormData] = useState<StoreFormData>({
    storeName: data.storeName || "",
    storeSlug: data.storeSlug || "",
    logo: data.logo || "",
    brandColor: data.brandColor || config.defaultColor || "#C98A54",
    androidApp: data.androidApp || false,
  });

  // Auto-generate slug when store name changes
  useEffect(() => {
    if (formData.storeName) {
      const slug = generateSlug(formData.storeName);
      setFormData((prev) => ({ ...prev, storeSlug: slug }));
      // Reset status when name changes
      setStoreNameStatus("idle");
      setStoreNameMessage("");
    }
  }, [formData.storeName]);

  // Check store name availability with debounce
  useEffect(() => {
    const checkAvailability = async () => {
      const slug = formData.storeSlug;
      if (!slug || slug.length < 3) {
        setStoreNameStatus("idle");
        setStoreNameMessage("");
        return;
      }

      if (!/^[a-z0-9-]+$/.test(slug)) {
        setStoreNameStatus("taken");
        setStoreNameMessage(
          "Only lowercase letters, numbers, and hyphens allowed",
        );
        return;
      }

      setIsChecking(true);
      setStoreNameStatus("checking");

      try {
        const result = await checkStoreSlug(slug);
        if (result.available) {
          setStoreNameStatus("available");
          setStoreNameMessage("This store name is available ✓");
        } else {
          setStoreNameStatus("taken");
          setStoreNameMessage(
            result.error || "This store name is already taken",
          );
        }
      } catch (error) {
        console.error("Error checking store name:", error);
        setStoreNameStatus("idle");
        setStoreNameMessage("");
      } finally {
        setIsChecking(false);
      }
    };

    // Debounce the check
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.storeSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleToggleAndroidApp = () => {
    setFormData({ ...formData, androidApp: !formData.androidApp });
  };

  const handleColorSelect = (color: string) => {
    setFormData({ ...formData, brandColor: color });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors({ ...errors, logo: "Please upload an image file" });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, logo: "Image must be under 5MB" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
        setFormData({ ...formData, logo: result });
        if (errors.logo) {
          setErrors({ ...errors, logo: "" });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo: "" });
    if (fileInputRef) {
      fileInputRef.value = "";
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName =
        t?.errors?.storeNameRequired || "Store name is required";
    }
    if (formData.storeName.trim().length < 2) {
      newErrors.storeName =
        t?.errors?.storeNameMin || "Store name must be at least 2 characters";
    }
    if (storeNameStatus === "taken") {
      newErrors.storeName =
        storeNameMessage || "Please choose a different store name";
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
    paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
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
        {t?.store?.title || "Store Configuration"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.store?.subtitle ||
          "Set up your branded storefront. This is what your customers will see."}
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
              {t?.store?.storeName || "Store Name"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder="Sparkle Data Store"
                style={inputStyle(!!errors.storeName)}
              />
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                {storeNameStatus === "checking" && (
                  <Loader2
                    size={18}
                    style={{
                      color: "var(--accent)",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
                {storeNameStatus === "available" && (
                  <Check size={18} style={{ color: "#6EBD8A" }} />
                )}
                {storeNameStatus === "taken" && (
                  <X size={18} style={{ color: "#EF4444" }} />
                )}
              </div>
            </div>
            {storeNameMessage && !errors.storeName && (
              <p
                style={{
                  fontSize: "0.78rem",
                  marginTop: 6,
                  color:
                    storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
                }}
              >
                {storeNameMessage}
              </p>
            )}
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

          {/* Store URL (auto-generated, read-only) */}
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
              {t?.store?.storeUrl || "Store URL"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "var(--bg3)",
                border: `1px solid ${storeNameStatus === "taken" ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                color: "var(--muted)",
                fontSize: "0.9rem",
              }}
            >
              <span>
                {typeof window !== "undefined" ? window.location.origin : ""}/
                {countryCode}/
              </span>
              <span style={{ color: "var(--text)", fontWeight: 500 }}>
                {formData.storeSlug || "your-store"}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--dim)",
                marginTop: "0.35rem",
              }}
            >
              {t?.store?.storeUrlHint ||
                "Your store URL is automatically generated from your store name."}
            </p>
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
              {t?.store?.logo || "Store Logo"}{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--dim)",
                  fontWeight: 400,
                }}
              >
                (optional)
              </span>
            </label>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--dim)",
                marginBottom: "0.75rem",
              }}
            >
              {t?.store?.logoHint ||
                "Upload a 1024×1024px PNG, or we'll generate one for you."}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                background: "var(--bg2)",
                border: `1.5px dashed ${errors.logo ? "#EF4444" : "var(--border)"}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: logoPreview
                    ? `url(${logoPreview}) center/cover`
                    : `linear-gradient(135deg, ${formData.brandColor}, ${formData.brandColor}dd)`,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                  color: "#fff",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                }}
              >
                {!logoPreview && formData.storeName && (
                  <span>{formData.storeName.charAt(0).toUpperCase()}</span>
                )}
                {!logoPreview && !formData.storeName && (
                  <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                {logoPreview ? (
                  <div>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text)",
                        marginBottom: 6,
                      }}
                    >
                      Logo uploaded ✓
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <label
                        style={{
                          display: "inline-block",
                          padding: "0.4rem 0.8rem",
                          background: "rgba(201,138,84,0.1)",
                          border: "1px solid rgba(201,138,84,0.25)",
                          borderRadius: 8,
                          color: "var(--accent-lt)",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Change
                        <input
                          ref={(el) => setFileInputRef(el)}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={removeLogo}
                        style={{
                          padding: "0.4rem 0.8rem",
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          borderRadius: 8,
                          color: "#EF4444",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      background: "rgba(201,138,84,0.1)",
                      border: "1px solid rgba(201,138,84,0.25)",
                      borderRadius: 8,
                      color: "var(--accent-lt)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Upload
                      size={14}
                      style={{ display: "inline", marginRight: 6 }}
                    />
                    {t?.store?.logo || "Upload Logo"}
                    <input
                      ref={(el) => setFileInputRef(el)}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>
            </div>
            {errors.logo && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.logo}
              </p>
            )}
          </div>

          {/* Brand Color */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.5rem",
                color: "var(--text)",
              }}
            >
              <Palette size={16} style={{ color: "var(--accent)" }} />
              {t?.store?.brandColor || "Brand Color"}
            </label>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                marginBottom: "0.5rem",
              }}
            >
              {SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorSelect(hex)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: hex,
                    border:
                      formData.brandColor === hex
                        ? "2.5px solid #FFFFFF"
                        : "2px solid transparent",
                    outline:
                      formData.brandColor === hex ? `2px solid ${hex}` : "none",
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    transform:
                      formData.brandColor === hex ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--bg3)",
                  border: "2px dashed var(--border)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  color: "var(--dim)",
                }}
              >
                +
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={formData.brandColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                style={{
                  position: "absolute",
                  opacity: 0,
                  pointerEvents: "none",
                  width: 0,
                  height: 0,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.75rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: formData.brandColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                {formData.brandColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Android App Toggle */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.2rem",
                background: "var(--bg2)",
                borderRadius: 12,
                border: `1px solid ${formData.androidApp ? "rgba(201,138,84,0.3)" : "var(--border)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Smartphone size={18} style={{ color: "var(--accent)" }} />
                <div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {t?.store?.androidApp || "Android App"}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--dim)",
                      marginTop: 2,
                    }}
                  >
                    {t?.store?.androidAppHint ||
                      "Get a branded APK in 3–5 business days"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAndroidApp}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 100,
                  background: formData.androidApp
                    ? "var(--accent)"
                    : "var(--bg3)",
                  border: formData.androidApp
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border2)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: formData.androidApp ? 23 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
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
            <ChevronLeft size={18} /> {t?.store?.back || "Back"}
          </button>
          <button
            type="submit"
            disabled={
              storeNameStatus === "checking" || storeNameStatus === "taken"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background:
                storeNameStatus === "checking" || storeNameStatus === "taken"
                  ? "var(--dim)"
                  : "var(--accent)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor:
                storeNameStatus === "checking" || storeNameStatus === "taken"
                  ? "not-allowed"
                  : "pointer",
              opacity:
                storeNameStatus === "checking" || storeNameStatus === "taken"
                  ? 0.6
                  : 1,
              transition: "opacity 0.2s, transform 0.2s",
              flex: 1,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (
                storeNameStatus !== "checking" &&
                storeNameStatus !== "taken"
              ) {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {storeNameStatus === "checking" ? (
              <>
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Checking...
              </>
            ) : (
              <>
                {t?.store?.continue || "Continue"} <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
