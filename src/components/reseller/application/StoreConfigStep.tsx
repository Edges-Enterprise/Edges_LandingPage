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
  ImageIcon,
} from "lucide-react";
import { checkStoreSlug } from "@/actions/reseller/application/checkStoreSlug";
import { generateIconPng } from "@/lib/business-generator/logo/generator";
import { SWATCHES } from "@/constants/swatches";

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
  logoFile: File | null; // ✅ File object, not base64
  notificationIconFile: File | null;
  logoPreview: string | null;
  brandColor: string;
  androidApp: boolean;
}

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
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(
    null,
  );
  // ✅ Add notification icon state
  const [notificationIconFile, setNotificationIconFile] = useState<File | null>(
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
    logoFile: null,
    notificationIconFile: null, // ✅ Initialize
    logoPreview: data.logoPreview || null,
    brandColor: data.brandColor || config.defaultColor || "#C98A54",
    androidApp: data.androidApp || false,
  });

  // Auto-generate slug when store name changes
  useEffect(() => {
    if (formData.storeName) {
      const slug = generateSlug(formData.storeName);
      setFormData((prev) => ({ ...prev, storeSlug: slug }));
      setStoreNameStatus("idle");
      setStoreNameMessage("");
    }
  }, [formData.storeName]);

  // ✅ Generate icon preview and store as File
  useEffect(() => {
    const generatePreview = async () => {
      // Skip if user uploaded a custom logo
      if (formData.logoFile) {
        return;
      }

      // Skip if no store name
      if (!formData.storeName || formData.storeName.length < 1) {
        return;
      }

      setIsGeneratingPreview(true);
      try {
        const blob = await generateIconPng(
          formData.storeName,
          formData.brandColor,
        );

        // ✅ Create a File object directly from the blob
        const file = new File(
          [blob],
          `${formData.storeSlug || "store"}-logo.png`,
          {
            type: "image/png",
          },
        );

        // ✅ Create preview URL
        const previewUrl = URL.createObjectURL(blob);

        // ✅ Store both the File and the preview URL
        setFormData((prev) => ({
          ...prev,
          logoFile: file,
          logoPreview: previewUrl,
        }));
        setIsGeneratingPreview(false);
      } catch (error) {
        console.error("Failed to generate icon preview:", error);
        setIsGeneratingPreview(false);
      }
    };

    const timer = setTimeout(generatePreview, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [formData.storeName, formData.brandColor]);

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

  // ✅ Updated logo upload handler - stores as File directly
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, logo: "Please upload an image file" });
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      setErrors({ ...errors, logo: "Image must be under 1MB" });
      return;
    }

    // ✅ Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // ✅ Store the File object and preview URL directly
    setFormData({
      ...formData,
      logoFile: file,
      logoPreview: previewUrl,
    });

    if (errors.logo) {
      setErrors({ ...errors, logo: "" });
    }
  };

  const removeLogo = () => {
    // Clean up preview URL
    if (formData.logoPreview) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setFormData({
      ...formData,
      logoFile: null,
      logoPreview: null,
    });
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

  // ✅ Generate notification icon when Android App is enabled
  useEffect(() => {
    if (!formData.androidApp) {
      setNotificationIconFile(null);
      return;
    }

    if (!formData.storeName || formData.storeName.length < 1) {
      return;
    }

    const generateNotifIcon = async () => {
      try {
        // ✅ Import the client-side generator
        const { generateNotificationIcon } =
          await import("@/app/reseller/generateIcon");
        const blob = await generateNotificationIcon(formData.storeName);
        const file = new File(
          [blob],
          `${formData.storeSlug || "store"}-notification-icon.png`,
          {
            type: "image/png",
          },
        );
        setNotificationIconFile(file);
      } catch (error) {
        console.error("Failed to generate notification icon:", error);
      }
    };

    generateNotifIcon();
  }, [formData.androidApp, formData.storeName, formData.storeSlug]);

  // ✅ Pass notification icon to form data on submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onChange({
        ...formData,
        notificationIconFile: notificationIconFile, // ✅ Add this
      });
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

  // Determine which preview to show
  const displayPreview = formData.logoPreview;

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
                placeholder="Sparkle Store"
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

          {/* Store URL */}
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

          {/* Logo Upload - Show Generated Preview */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              <ImageIcon size={16} style={{ color: "var(--accent)" }} />
              {t?.store?.logo || "Store Logo"}
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
                "Upload any image (we'll resize it to 1024×1024px for you!)"}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "1rem",
                background: "var(--bg2)",
                border: `1.5px dashed ${errors.logo?.startsWith("✓") ? "rgba(110,189,138,0.5)" : errors.logo ? "#EF4444" : "var(--border)"}`,
                borderRadius: 12,
                transition: "border-color 0.3s ease",
              }}
            >
              {/* Preview Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: displayPreview
                      ? `url(${displayPreview}) center/cover`
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
                    position: "relative",
                  }}
                >
                  {!displayPreview && formData.storeName && (
                    <span>{formData.storeName.charAt(0).toUpperCase()}</span>
                  )}
                  {!displayPreview && !formData.storeName && (
                    <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
                  )}
                  {isGeneratingPreview && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <Loader2
                        size={24}
                        style={{
                          color: "#fff",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {formData.logoFile ? (
                    <div>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text)",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        ✅{" "}
                        {formData.logoPreview?.startsWith("blob:")
                          ? "Auto-generated"
                          : "Custom"}{" "}
                        logo ready
                      </p>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--dim)",
                        }}
                      >
                        {formData.logoPreview?.startsWith("blob:")
                          ? "Generated from your store name"
                          : `${Math.round(formData.logoFile.size / 1024)} KB · ${formData.logoFile.type}`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text)",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {t?.store?.noLogoYet || "No logo yet"}
                      </p>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--dim)",
                        }}
                      >
                        {t?.store?.uploadHint ||
                          "Upload an image or one will be generated for you"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                }}
              >
                {/* Upload Button */}
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.5rem 1.2rem",
                    background: formData.logoFile
                      ? "rgba(201,138,84,0.1)"
                      : "var(--accent)",
                    border: `1px solid ${formData.logoFile ? "rgba(201,138,84,0.25)" : "var(--accent)"}`,
                    borderRadius: 8,
                    color: formData.logoFile ? "var(--accent-lt)" : "#FDF8F3",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <Upload size={16} />
                  {formData.logoFile
                    ? t?.store?.changeLogo || "Change Logo"
                    : t?.store?.uploadLogo || "Upload Custom Logo"}
                  <input
                    ref={(el) => setFileInputRef(el)}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: "none" }}
                  />
                </label>

                {/* Remove/Reset Button */}
                {formData.logoFile && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0.5rem 1.2rem",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8,
                      color: "#EF4444",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                    }}
                  >
                    <X size={16} />
                    {t?.store?.resetToGenerated || "Remove Logo"}
                  </button>
                )}
              </div>

              {/* Status Messages */}
              {errors.logo && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: errors.logo.startsWith("✓") ? "#6EBD8A" : "#EF4444",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {errors.logo.startsWith("✓") ? (
                    <Check size={14} style={{ color: "#6EBD8A" }} />
                  ) : (
                    <X size={14} style={{ color: "#EF4444" }} />
                  )}
                  {errors.logo}
                </div>
              )}

              {/* File requirements hint */}
              {!formData.logoFile && !errors.logo && (
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--dim)",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.5rem",
                  }}
                >
                  📐{" "}
                  {t?.store?.fileRequirements ||
                    "Any image size accepted - we'll auto-resize to 1024×1024px"}
                </div>
              )}
            </div>
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
