// app/reseller/ResellerFormClient.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Mail,
  Palette,
  Smartphone,
  Check,
  X,
  Loader2,
  ArrowRight,
  Pipette,
  Image as ImageIcon,
  Sparkles,
  Phone,
} from "lucide-react";
import { checkStoreName } from "../actions/reseller/checkStoreName";
import { createReseller } from "../actions/reseller/createReseller";
import { generateIconPng } from "./generateIcon";

// Curated palette of 8 swatches resellers can pick from
const SWATCHES = [
  "#2563EB", // Blue
  "#7C3AED", // Purple
  "#DB2777", // Pink
  "#DC2626", // Red
  "#D97706", // Amber
  "#16A34A", // Green
  "#0D9488", // Teal
  "#111827", // Dark
];

export function ResellerFormClient() {
  const router = useRouter();

  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [brandColor, setBrandColor] = useState("#2563EB");
  const [androidApp, setAndroidApp] = useState(false);
  const [appIcon, setAppIcon] = useState<File | null>(null);
  const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState("");
  const [useGeneratedIcon, setUseGeneratedIcon] = useState(true);
  const [generatedIconPreview, setGeneratedIconPreview] = useState<
    string | null
  >(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

  const [storeNameStatus, setStoreNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [storeNameMessage, setStoreNameMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTelco, setSelectedTelco] = useState<string | null>(null);

  const colorInputRef = useRef<HTMLInputElement>(null);

  // ── Generate icon preview when store name or color changes ──
  useEffect(() => {
    if (storeName.trim() && useGeneratedIcon && androidApp) {
      setIsGeneratingIcon(true);
      const timeout = setTimeout(() => {
        generateIconPng(storeName.trim(), brandColor).then((blob) => {
          const url = URL.createObjectURL(blob);
          setGeneratedIconPreview(url);
          setIsGeneratingIcon(false);
        });
      }, 400); // Debounce
      return () => {
        clearTimeout(timeout);
        if (generatedIconPreview) URL.revokeObjectURL(generatedIconPreview);
      };
    }
  }, [storeName, brandColor, useGeneratedIcon, androidApp]);

  // ── Check store name on blur ─────────────────────
  const handleStoreNameBlur = async () => {
    const name = storeName.toLowerCase().trim();
    if (name.length < 3) {
      setStoreNameStatus("idle");
      setStoreNameMessage("");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      setStoreNameStatus("taken");
      setStoreNameMessage(
        "Only lowercase letters, numbers, and hyphens allowed",
      );
      return;
    }

    const normalized = name.replace(/[^a-z0-9]/g, "").toLowerCase();
    if (/^edge/.test(normalized)) {
      setStoreNameStatus("taken");
      setStoreNameMessage("That store name is not available.");
      return;
    }

    setStoreNameStatus("checking");
    const result = await checkStoreName(name);
    if (result.available) {
      setStoreNameStatus("available");
      setStoreNameMessage("This store name is available");
    } else {
      setStoreNameStatus("taken");
      setStoreNameMessage(result.error || "This store name is already taken");
    }
  };

  // ── Validate ─────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!storeName.trim()) errs.storeName = "Store name is required";
    else if (storeName.trim().length < 3)
      errs.storeName = "At least 3 characters";
    else if (!/^[a-z0-9-]+$/.test(storeName.trim()))
      errs.storeName = "Only letters, numbers, hyphens";
    else if (/^edge/.test(storeName.trim().replace(/[^a-z0-9]/g, "")))
      errs.storeName = "That store name is not available.";

    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email";

    if (!whatsapp.trim()) errs.whatsapp = "WhatsApp number is required";
    else if (!/^\+?[0-9\s\-()]{7,15}$/.test(whatsapp.trim()))
      errs.whatsapp = "Enter a valid phone number";

    if (storeNameStatus === "taken")
      errs.storeName = "Please choose a different store name";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Icon upload handler ──────────────────────────
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIconError("");

    if (!file) {
      setAppIcon(null);
      setAppIconPreview(null);
      setUseGeneratedIcon(true);
      return;
    }

    if (file.size > 1024 * 1024) {
      setIconError("Image must be under 1MB");
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.width !== 1024 || img.height !== 1024) {
        setIconError("Image must be exactly 1024×1024px");
        return;
      }
      setAppIcon(file);
      setAppIconPreview(URL.createObjectURL(file));
      setUseGeneratedIcon(false);
    };
    img.src = URL.createObjectURL(file);
  };

  const removeCustomIcon = () => {
    setAppIcon(null);
    setAppIconPreview(null);
    setUseGeneratedIcon(true);
  };

  // ── Submit ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const fd = new FormData();
    fd.append("storeName", storeName.trim());
    fd.append("email", email.trim());
    fd.append("whatsapp", whatsapp.trim());
    fd.append("brandColor", brandColor);
    fd.append("androidApp", androidApp.toString());

    // Handle icon
    if (appIcon) {
      fd.append("appIcon", appIcon);
    } else if (androidApp && useGeneratedIcon) {
      try {
        const iconBlob = await generateIconPng(storeName.trim(), brandColor);
        const iconFile = new File([iconBlob], `${storeName.trim()}-icon.png`, {
          type: "image/png",
        });
        fd.append("appIcon", iconFile);
      } catch (err) {
        console.error("Failed to generate icon:", err);
      }
    }

    try {
      const result = await createReseller(fd);
      if (result.error) {
        setErrors({ form: result.error });
      } else if (result.success) {
        router.push(
          `/reseller/success?store=${storeName.trim().toLowerCase()}`,
        );
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (
    hasError: boolean,
    isSuccess: boolean,
  ): React.CSSProperties => ({
    width: "100%",
    padding: "0.85rem 1rem",
    background: "var(--bg2)",
    border: `1.5px solid ${hasError ? "#EF4444" : isSuccess ? "#6EBD8A" : "var(--border)"}`,
    borderRadius: 12,
    color: "var(--text)",
    fontSize: "0.95rem",
    fontFamily: "'Instrument Sans', system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
    paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
  });

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
    // Prevent Enter from submitting ANY form field
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 20,
        padding: "2.5rem 2rem",
      }}
    >
      {/* ── Store Name ─────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          <Store size={16} style={{ color: "var(--accent)" }} />
          Store Name
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value.toLowerCase());
              setStoreNameStatus("idle");
              setStoreNameMessage("");
            }}
            onBlur={handleStoreNameBlur}
            placeholder="my-store"
            style={inputStyle(
              !!errors.storeName,
              storeNameStatus === "available",
            )}
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
              color: storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
            }}
          >
            {storeNameMessage}
          </p>
        )}
        {errors.storeName && (
          <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
            {errors.storeName}
          </p>
        )}
      </div>

      {/* ── Telco Provider ─────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.7rem",
          }}
        >
          <Store size={16} style={{ color: "var(--accent)" }} />
          Telco Provider
        </label>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--dim)",
            marginBottom: "0.75rem",
          }}
        >
          Select the telco provider powering your store.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {(["Telcos."] as const).map((telco) => {
            const isSelected = selectedTelco === telco;
            return (
              <div
                key={telco}
                onClick={() => setSelectedTelco(isSelected ? null : telco)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "rgba(201,138,84,0.08)",
                  border: isSelected
                    ? "1px solid var(--accent)"
                    : "1px solid rgba(201,138,84,0.2)",
                  color: isSelected ? "#fff" : "var(--accent)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "lowercase",
                  padding: "6px 18px",
                  borderRadius: 100,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  userSelect: "none",
                }}
              >
                🌍 {telco}
              </div>
            );
          })}
        </div>
        {/* ── Store URL preview ──────────────────── */}
        <div style={{ marginTop: "0.5rem" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
            {/* {process.env.NEXT_PUBLIC_STORE_URL}/{storeName || "storename"} */}
            https://telcos.govt.hu/{storeName || "storename"}
          </p>
        </div>
      </div>

      {/* ── Email ──────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          <Mail size={16} style={{ color: "var(--accent)" }} />
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle(!!errors.email, false)}
        />
        {errors.email && (
          <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
            {errors.email}
          </p>
        )}
      </div>

      {/* ── WhatsApp ───────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          <Phone size={16} style={{ color: "var(--accent)" }} />
          WhatsApp Number
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.85rem 0.9rem",
              background: "var(--bg2)",
              border: "1.5px solid var(--border)",
              borderRadius: 12,
              color: "var(--dim)",
              fontSize: "0.9rem",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              flexShrink: 0,
              gap: 6,
            }}
          >
            <span style={{ fontSize: "1rem" }}>🇳🇬</span>
            <span>+234</span>
          </div>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) =>
              setWhatsapp(e.target.value.replace(/[^0-9\s\-()]/g, ""))
            }
            placeholder="080 0000 0000"
            style={{
              ...inputStyle(!!errors.whatsapp, false),
              paddingRight: "1rem",
            }}
          />
        </div>
        {errors.whatsapp && (
          <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
            {errors.whatsapp}
          </p>
        )}
        <p style={{ fontSize: "0.78rem", color: "var(--dim)", marginTop: 6 }}>
          We'll send store updates and support messages here.
        </p>
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.88rem",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "0.7rem",
          }}
        >
          <Palette size={16} style={{ color: "var(--accent)" }} />
          Brand Color
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: "0.45rem",
            marginBottom: "0.75rem",
          }}
        >
          {SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setBrandColor(hex)}
              title={hex}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 8,
                background: hex,
                border:
                  brandColor === hex
                    ? "2.5px solid #FFFFFF"
                    : "2px solid transparent",
                outline: brandColor === hex ? `2px solid ${hex}` : "none",
                cursor: "pointer",
                transition: "transform 0.15s",
                transform: brandColor === hex ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: brandColor,
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.9rem",
              color: "var(--accent-lt)",
              flex: 1,
            }}
          >
            {brandColor.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.45rem 0.9rem",
              background: "rgba(201,138,84,0.1)",
              border: "1px solid rgba(201,138,84,0.25)",
              borderRadius: 8,
              color: "var(--accent-lt)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <Pipette size={13} /> Custom
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              width: 0,
              height: 0,
            }}
          />
        </div>

        {/* Mini store preview */}
        <div
          style={{
            marginTop: "0.75rem",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${brandColor}, ${adjustHex(brandColor, -20)})`,
              padding: "0.6rem 0.9rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.7)",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#fff",
                opacity: 0.9,
              }}
            >
              {storeName || "your-store"} · Data & Airtime Store
            </span>
          </div>
          <div
            style={{
              background: "var(--bg3)",
              padding: "0.5rem 0.9rem",
              display: "flex",
              gap: 6,
            }}
          >
            {["MTN", "AIRTEL", "GLO"].map((n, i) => (
              <div
                key={n}
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: 6,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  background: i === 0 ? brandColor : "transparent",
                  color: i === 0 ? "#fff" : "var(--dim)",
                  border: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--dim)",
            marginTop: "0.5rem",
          }}
        >
          This colour is used for buttons, tabs, and highlights on your store.
        </p>
      </div>

      {/* ── Android App ────────────────────────── */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.2rem",
            background: "var(--bg2)",
            borderRadius: 12,
            border: "1px solid var(--border)",
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
                Android App
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--dim)",
                  marginTop: 2,
                }}
              >
                Get a branded APK in 3–5 business days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAndroidApp(!androidApp)}
            style={{
              width: 48,
              height: 28,
              borderRadius: 100,
              background: androidApp ? "var(--accent)" : "var(--bg3)",
              border: androidApp
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
                left: androidApp ? 23 : 3,
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

      {/* ── App Icon (shown when APK selected) ── */}
      {androidApp && (
        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "0.7rem",
            }}
          >
            <ImageIcon size={16} style={{ color: "var(--accent)" }} />
            App Icon{" "}
            <span
              style={{
                fontWeight: 400,
                color: "var(--dim)",
                fontSize: "0.8rem",
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
            Upload a 1024×1024px PNG, or we'll generate a premium one from your
            store name.
          </p>

          {/* Generated Icon Preview */}
          {useGeneratedIcon && storeName.trim() && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                background: "var(--bg2)",
                border: "1.5px solid var(--border)",
                borderRadius: 12,
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  flexShrink: 0,
                  background: brandColor,
                }}
              >
                {isGeneratingIcon ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Loader2
                      size={20}
                      style={{
                        color: "#fff",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  </div>
                ) : generatedIconPreview ? (
                  <img
                    src={generatedIconPreview}
                    alt="Generated icon"
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : null}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 4,
                  }}
                >
                  <Sparkles
                    size={14}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Auto-generated Icon
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--dim)" }}>
                  A premium icon with your store's initial and brand color.
                </p>
              </div>
            </div>
          )}

          {/* Custom Upload */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              background: "var(--bg2)",
              border: `1.5px dashed ${iconError ? "#EF4444" : "var(--border)"}`,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: appIconPreview
                  ? `url(${appIconPreview}) center/cover`
                  : "var(--bg3)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {!appIconPreview && (
                <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {appIcon ? (
                <div>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    {appIcon.name}
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
                        type="file"
                        accept="image/png"
                        onChange={handleIconChange}
                        style={{ display: "none" }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeCustomIcon}
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
                      Use Generated
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
                  Upload Custom Icon
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleIconChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>
          </div>
          {iconError && (
            <p style={{ fontSize: "0.78rem", color: "#EF4444", marginTop: 6 }}>
              {iconError}
            </p>
          )}
        </div>
      )}

      {/* ── Form error ─────────────────────────── */}
      {errors.form && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "#EF4444",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          {errors.form}
        </p>
      )}

      {/* ── Submit ─────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "1rem",
          background: isSubmitting
            ? "var(--bg3)"
            : "linear-gradient(135deg, var(--accent), var(--edges-500))",
          border: "none",
          borderRadius: 14,
          color: isSubmitting ? "var(--dim)" : "var(--edges-50)",
          fontSize: "1rem",
          fontWeight: 700,
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.2s",
          letterSpacing: "0.01em",
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2
              size={18}
              style={{ animation: "spin 1s linear infinite" }}
            />
            Creating your store…
          </>
        ) : (
          <>
            Create My Store <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}

/** Slightly darken/lighten a hex colour */
function adjustHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// // app/reseller/ResellerFormClient.tsx

// "use client";

// import { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import {
//   Store,
//   Mail,
//   Palette,
//   Smartphone,
//   Check,
//   X,
//   Loader2,
//   ArrowRight,
//   Pipette,
//   Image as ImageIcon,
//   Sparkles,
// } from "lucide-react";
// import { checkStoreName } from "../actions/reseller/checkStoreName";
// import { createReseller } from "../actions/reseller/createReseller";
// import { generateIconPng } from "./generateIcon";

// // Curated palette of 8 swatches resellers can pick from
// const SWATCHES = [
//   "#2563EB", // Blue
//   "#7C3AED", // Purple
//   "#DB2777", // Pink
//   "#DC2626", // Red
//   "#D97706", // Amber
//   "#16A34A", // Green
//   "#0D9488", // Teal
//   "#111827", // Dark
// ];

// export function ResellerFormClient() {
//   const router = useRouter();

//   const [storeName, setStoreName] = useState("");
//   const [email, setEmail] = useState("");
//   const [brandColor, setBrandColor] = useState("#2563EB");
//   const [androidApp, setAndroidApp] = useState(false);
//   const [appIcon, setAppIcon] = useState<File | null>(null);
//   const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
//   const [iconError, setIconError] = useState("");
//   const [useGeneratedIcon, setUseGeneratedIcon] = useState(true);
//   const [generatedIconPreview, setGeneratedIconPreview] = useState<
//     string | null
//   >(null);
//   const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

//   const [storeNameStatus, setStoreNameStatus] = useState<
//     "idle" | "checking" | "available" | "taken"
//   >("idle");
//   const [storeNameMessage, setStoreNameMessage] = useState("");

//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [selectedTelco, setSelectedTelco] = useState<string | null>(null);

//   const colorInputRef = useRef<HTMLInputElement>(null);

//   // ── Generate icon preview when store name or color changes ──
//   useEffect(() => {
//     if (storeName.trim() && useGeneratedIcon && androidApp) {
//       setIsGeneratingIcon(true);
//       const timeout = setTimeout(() => {
//         generateIconPng(storeName.trim(), brandColor).then((blob) => {
//           const url = URL.createObjectURL(blob);
//           setGeneratedIconPreview(url);
//           setIsGeneratingIcon(false);
//         });
//       }, 400); // Debounce
//       return () => {
//         clearTimeout(timeout);
//         if (generatedIconPreview) URL.revokeObjectURL(generatedIconPreview);
//       };
//     }
//   }, [storeName, brandColor, useGeneratedIcon, androidApp]);

//   // ── Check store name on blur ─────────────────────
//   const handleStoreNameBlur = async () => {
//     const name = storeName.toLowerCase().trim();
//     if (name.length < 3) {
//       setStoreNameStatus("idle");
//       setStoreNameMessage("");
//       return;
//     }
//     if (!/^[a-z0-9-]+$/.test(name)) {
//       setStoreNameStatus("taken");
//       setStoreNameMessage(
//         "Only lowercase letters, numbers, and hyphens allowed",
//       );
//       return;
//     }

//     const normalized = name.replace(/[^a-z0-9]/g, "").toLowerCase();
//     if (/^edge/.test(normalized)) {
//       setStoreNameStatus("taken");
//       setStoreNameMessage("That store name is not available.");
//       return;
//     }

//     setStoreNameStatus("checking");
//     const result = await checkStoreName(name);
//     if (result.available) {
//       setStoreNameStatus("available");
//       setStoreNameMessage("This store name is available");
//     } else {
//       setStoreNameStatus("taken");
//       setStoreNameMessage(result.error || "This store name is already taken");
//     }
//   };

//   // ── Validate ─────────────────────────────────────
//   const validate = (): boolean => {
//     const errs: Record<string, string> = {};

//     if (!storeName.trim()) errs.storeName = "Store name is required";
//     else if (storeName.trim().length < 3)
//       errs.storeName = "At least 3 characters";
//     else if (!/^[a-z0-9-]+$/.test(storeName.trim()))
//       errs.storeName = "Only letters, numbers, hyphens";
//     else if (/^edge/.test(storeName.trim().replace(/[^a-z0-9]/g, "")))
//       errs.storeName = "That store name is not available.";

//     if (!email.trim()) errs.email = "Email is required";
//     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
//       errs.email = "Enter a valid email";

//     if (storeNameStatus === "taken")
//       errs.storeName = "Please choose a different store name";

//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   // ── Icon upload handler ──────────────────────────
//   const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     setIconError("");

//     if (!file) {
//       setAppIcon(null);
//       setAppIconPreview(null);
//       setUseGeneratedIcon(true);
//       return;
//     }

//     if (file.size > 1024 * 1024) {
//       setIconError("Image must be under 1MB");
//       return;
//     }

//     const img = new Image();
//     img.onload = () => {
//       if (img.width !== 1024 || img.height !== 1024) {
//         setIconError("Image must be exactly 1024×1024px");
//         return;
//       }
//       setAppIcon(file);
//       setAppIconPreview(URL.createObjectURL(file));
//       setUseGeneratedIcon(false);
//     };
//     img.src = URL.createObjectURL(file);
//   };

//   const removeCustomIcon = () => {
//     setAppIcon(null);
//     setAppIconPreview(null);
//     setUseGeneratedIcon(true);
//   };

//   // ── Submit ───────────────────────────────────────
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!validate()) return;

//     setIsSubmitting(true);

//     const fd = new FormData();
//     fd.append("storeName", storeName.trim());
//     fd.append("email", email.trim());
//     fd.append("brandColor", brandColor);
//     fd.append("androidApp", androidApp.toString());

//     // Handle icon
//     if (appIcon) {
//       fd.append("appIcon", appIcon);
//     } else if (androidApp && useGeneratedIcon) {
//       try {
//         const iconBlob = await generateIconPng(storeName.trim(), brandColor);
//         const iconFile = new File([iconBlob], `${storeName.trim()}-icon.png`, {
//           type: "image/png",
//         });
//         fd.append("appIcon", iconFile);
//       } catch (err) {
//         console.error("Failed to generate icon:", err);
//       }
//     }

//     try {
//       const result = await createReseller(fd);
//       if (result.error) {
//         setErrors({ form: result.error });
//       } else if (result.success) {
//         router.push(
//           `/reseller/success?store=${storeName.trim().toLowerCase()}`,
//         );
//       }
//     } catch {
//       setErrors({ form: "Something went wrong. Please try again." });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const inputStyle = (
//     hasError: boolean,
//     isSuccess: boolean,
//   ): React.CSSProperties => ({
//     width: "100%",
//     padding: "0.85rem 1rem",
//     background: "var(--bg2)",
//     border: `1.5px solid ${hasError ? "#EF4444" : isSuccess ? "#6EBD8A" : "var(--border)"}`,
//     borderRadius: 12,
//     color: "var(--text)",
//     fontSize: "0.95rem",
//     fontFamily: "'Instrument Sans', system-ui, sans-serif",
//     outline: "none",
//     transition: "border-color 0.2s",
//     paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
//   });

//   return (
//     <form
//       onSubmit={handleSubmit}
//       style={{
//         background: "var(--card)",
//         border: "1px solid var(--border2)",
//         borderRadius: 20,
//         padding: "2.5rem 2rem",
//       }}
//     >
//       {/* ── Store Name ─────────────────────────── */}
//       <div style={{ marginBottom: "1.5rem" }}>
//         <label
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             fontSize: "0.88rem",
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "0.5rem",
//           }}
//         >
//           <Store size={16} style={{ color: "var(--accent)" }} />
//           Store Name
//         </label>
//         <div style={{ position: "relative" }}>
//           <input
//             type="text"
//             value={storeName}
//             onChange={(e) => {
//               setStoreName(e.target.value.toLowerCase());
//               setStoreNameStatus("idle");
//               setStoreNameMessage("");
//             }}
//             onBlur={handleStoreNameBlur}
//             placeholder="my-store"
//             style={inputStyle(
//               !!errors.storeName,
//               storeNameStatus === "available",
//             )}
//           />
//           <div
//             style={{
//               position: "absolute",
//               right: 12,
//               top: "50%",
//               transform: "translateY(-50%)",
//             }}
//           >
//             {storeNameStatus === "checking" && (
//               <Loader2
//                 size={18}
//                 style={{
//                   color: "var(--accent)",
//                   animation: "spin 1s linear infinite",
//                 }}
//               />
//             )}
//             {storeNameStatus === "available" && (
//               <Check size={18} style={{ color: "#6EBD8A" }} />
//             )}
//             {storeNameStatus === "taken" && (
//               <X size={18} style={{ color: "#EF4444" }} />
//             )}
//           </div>
//         </div>
//         {storeNameMessage && !errors.storeName && (
//           <p
//             style={{
//               fontSize: "0.78rem",
//               marginTop: 6,
//               color: storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
//             }}
//           >
//             {storeNameMessage}
//           </p>
//         )}
//         {errors.storeName && (
//           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
//             {errors.storeName}
//           </p>
//         )}
//       </div>

//       {/* ── Telco Provider ─────────────────────── */}
//       <div style={{ marginBottom: "1.5rem" }}>
//         <label
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             fontSize: "0.88rem",
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "0.7rem",
//           }}
//         >
//           <Store size={16} style={{ color: "var(--accent)" }} />
//           Telco Provider
//         </label>
//         <p
//           style={{
//             fontSize: "0.78rem",
//             color: "var(--dim)",
//             marginBottom: "0.75rem",
//           }}
//         >
//           Select the telco provider powering your store.
//         </p>
//   <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
//     {(["Telcos."] as const).map((telco) => {
//       const isSelected = selectedTelco === telco;
//       return (
//         <div
//           key={telco}
//           onClick={() => setSelectedTelco(isSelected ? null : telco)}
//           style={{
//             display: "inline-flex",
//             alignItems: "center",
//             background: "rgba(201,138,84,0.08)",
//             border: isSelected
//               ? "1px solid var(--accent)"
//               : "1px solid rgba(201,138,84,0.2)",
//             color: isSelected ? "#fff" : "var(--accent)",
//             fontSize: "0.75rem",
//             fontWeight: 600,
//             letterSpacing: "0.1em",
//             textTransform: "lowercase",
//             padding: "6px 18px",
//             borderRadius: 100,
//             cursor: "pointer",
//             transition: "all 0.18s ease",
//             userSelect: "none",
//           }}
//         >
//           🌍 {telco}
//         </div>
//       );
//     })}
//   </div>
//   {/* ── Store URL preview ──────────────────── */}
//   <div style={{ marginTop: "0.5rem" }}>
//     <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
//       {process.env.NEXT_PUBLIC_STORE_URL}/{storeName || "storename"}
//     </p>
//   </div>
// </div>

//       {/* ── Email ──────────────────────────────── */}
//       <div style={{ marginBottom: "1.5rem" }}>
//         <label
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             fontSize: "0.88rem",
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "0.5rem",
//           }}
//         >
//           <Mail size={16} style={{ color: "var(--accent)" }} />
//           Email Address
//         </label>
//         <input
//           type="email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           placeholder="you@example.com"
//           style={inputStyle(!!errors.email, false)}
//         />
//         {errors.email && (
//           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
//             {errors.email}
//           </p>
//         )}
//       </div>

//       {/* ── Brand Color ────────────────────────── */}
//       <div style={{ marginBottom: "1.5rem" }}>
//         <label
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//             fontSize: "0.88rem",
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "0.7rem",
//           }}
//         >
//           <Palette size={16} style={{ color: "var(--accent)" }} />
//           Brand Color
//         </label>

//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(8, 1fr)",
//             gap: "0.45rem",
//             marginBottom: "0.75rem",
//           }}
//         >
//           {SWATCHES.map((hex) => (
//             <button
//               key={hex}
//               type="button"
//               onClick={() => setBrandColor(hex)}
//               title={hex}
//               style={{
//                 width: "100%",
//                 aspectRatio: "1",
//                 borderRadius: 8,
//                 background: hex,
//                 border:
//                   brandColor === hex
//                     ? "2.5px solid #FFFFFF"
//                     : "2px solid transparent",
//                 outline: brandColor === hex ? `2px solid ${hex}` : "none",
//                 cursor: "pointer",
//                 transition: "transform 0.15s",
//                 transform: brandColor === hex ? "scale(1.15)" : "scale(1)",
//               }}
//             />
//           ))}
//         </div>

//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "0.75rem",
//             padding: "0.75rem 1rem",
//             background: "var(--bg2)",
//             border: "1px solid var(--border)",
//             borderRadius: 12,
//           }}
//         >
//           <div
//             style={{
//               width: 36,
//               height: 36,
//               borderRadius: 8,
//               background: brandColor,
//               flexShrink: 0,
//               border: "1px solid rgba(255,255,255,0.15)",
//             }}
//           />
//           <span
//             style={{
//               fontFamily: "monospace",
//               fontSize: "0.9rem",
//               color: "var(--accent-lt)",
//               flex: 1,
//             }}
//           >
//             {brandColor.toUpperCase()}
//           </span>
//           <button
//             type="button"
//             onClick={() => colorInputRef.current?.click()}
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 6,
//               padding: "0.45rem 0.9rem",
//               background: "rgba(201,138,84,0.1)",
//               border: "1px solid rgba(201,138,84,0.25)",
//               borderRadius: 8,
//               color: "var(--accent-lt)",
//               fontSize: "0.8rem",
//               fontWeight: 600,
//               cursor: "pointer",
//               fontFamily: "inherit",
//               whiteSpace: "nowrap",
//             }}
//           >
//             <Pipette size={13} /> Custom
//           </button>
//           <input
//             ref={colorInputRef}
//             type="color"
//             value={brandColor}
//             onChange={(e) => setBrandColor(e.target.value)}
//             style={{
//               position: "absolute",
//               opacity: 0,
//               pointerEvents: "none",
//               width: 0,
//               height: 0,
//             }}
//           />
//         </div>

//         {/* Mini store preview */}
//         <div
//           style={{
//             marginTop: "0.75rem",
//             borderRadius: 10,
//             overflow: "hidden",
//             border: "1px solid var(--border)",
//           }}
//         >
//           <div
//             style={{
//               background: `linear-gradient(135deg, ${brandColor}, ${adjustHex(brandColor, -20)})`,
//               padding: "0.6rem 0.9rem",
//               display: "flex",
//               alignItems: "center",
//               gap: 8,
//             }}
//           >
//             <div
//               style={{
//                 width: 8,
//                 height: 8,
//                 borderRadius: "50%",
//                 background: "rgba(255,255,255,0.7)",
//               }}
//             />
//             <span
//               style={{
//                 fontSize: "0.75rem",
//                 fontWeight: 600,
//                 color: "#fff",
//                 opacity: 0.9,
//               }}
//             >
//               {storeName || "your-store"} · Data & Airtime Store
//             </span>
//           </div>
//           <div
//             style={{
//               background: "var(--bg3)",
//               padding: "0.5rem 0.9rem",
//               display: "flex",
//               gap: 6,
//             }}
//           >
//             {["MTN", "AIRTEL", "GLO"].map((n, i) => (
//               <div
//                 key={n}
//                 style={{
//                   padding: "0.2rem 0.6rem",
//                   borderRadius: 6,
//                   fontSize: "0.65rem",
//                   fontWeight: 600,
//                   background: i === 0 ? brandColor : "transparent",
//                   color: i === 0 ? "#fff" : "var(--dim)",
//                   border: i === 0 ? "none" : "1px solid var(--border)",
//                 }}
//               >
//                 {n}
//               </div>
//             ))}
//           </div>
//         </div>
//         <p
//           style={{
//             fontSize: "0.75rem",
//             color: "var(--dim)",
//             marginTop: "0.5rem",
//           }}
//         >
//           This colour is used for buttons, tabs, and highlights on your store.
//         </p>
//       </div>

//       {/* ── Android App ────────────────────────── */}
//       <div style={{ marginBottom: "2rem" }}>
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             padding: "1rem 1.2rem",
//             background: "var(--bg2)",
//             borderRadius: 12,
//             border: "1px solid var(--border)",
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//             <Smartphone size={18} style={{ color: "var(--accent)" }} />
//             <div>
//               <p
//                 style={{
//                   fontSize: "0.9rem",
//                   fontWeight: 600,
//                   color: "var(--text)",
//                 }}
//               >
//                 Android App
//               </p>
//               <p
//                 style={{
//                   fontSize: "0.75rem",
//                   color: "var(--dim)",
//                   marginTop: 2,
//                 }}
//               >
//                 Get a branded APK in 3–5 business days
//               </p>
//             </div>
//           </div>
//           <button
//             type="button"
//             onClick={() => setAndroidApp(!androidApp)}
//             style={{
//               width: 48,
//               height: 28,
//               borderRadius: 100,
//               background: androidApp ? "var(--accent)" : "var(--bg3)",
//               border: androidApp
//                 ? "1px solid var(--accent)"
//                 : "1px solid var(--border2)",
//               cursor: "pointer",
//               position: "relative",
//               transition: "all 0.2s",
//               flexShrink: 0,
//             }}
//           >
//             <div
//               style={{
//                 position: "absolute",
//                 top: 3,
//                 left: androidApp ? 23 : 3,
//                 width: 20,
//                 height: 20,
//                 borderRadius: "50%",
//                 background: "#fff",
//                 transition: "left 0.2s",
//                 boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
//               }}
//             />
//           </button>
//         </div>
//       </div>

//       {/* ── App Icon (shown when APK selected) ── */}
//       {androidApp && (
//         <div style={{ marginBottom: "2rem" }}>
//           <label
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 8,
//               fontSize: "0.88rem",
//               fontWeight: 600,
//               color: "var(--text)",
//               marginBottom: "0.7rem",
//             }}
//           >
//             <ImageIcon size={16} style={{ color: "var(--accent)" }} />
//             App Icon{" "}
//             <span
//               style={{
//                 fontWeight: 400,
//                 color: "var(--dim)",
//                 fontSize: "0.8rem",
//               }}
//             >
//               (optional)
//             </span>
//           </label>
//           <p
//             style={{
//               fontSize: "0.78rem",
//               color: "var(--dim)",
//               marginBottom: "0.75rem",
//             }}
//           >
//             Upload a 1024×1024px PNG, or we'll generate a premium one from your
//             store name.
//           </p>

//           {/* Generated Icon Preview */}
//           {useGeneratedIcon && storeName.trim() && (
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "1rem",
//                 padding: "1rem",
//                 background: "var(--bg2)",
//                 border: "1.5px solid var(--border)",
//                 borderRadius: 12,
//                 marginBottom: "0.75rem",
//               }}
//             >
//               <div
//                 style={{
//                   width: 64,
//                   height: 64,
//                   borderRadius: 14,
//                   border: "1px solid var(--border)",
//                   overflow: "hidden",
//                   flexShrink: 0,
//                   background: brandColor,
//                 }}
//               >
//                 {isGeneratingIcon ? (
//                   <div
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     <Loader2
//                       size={20}
//                       style={{
//                         color: "#fff",
//                         animation: "spin 1s linear infinite",
//                       }}
//                     />
//                   </div>
//                 ) : generatedIconPreview ? (
//                   <img
//                     src={generatedIconPreview}
//                     alt="Generated icon"
//                     style={{ width: "100%", height: "100%" }}
//                   />
//                 ) : null}
//               </div>
//               <div style={{ flex: 1 }}>
//                 <p
//                   style={{
//                     fontSize: "0.82rem",
//                     fontWeight: 600,
//                     color: "var(--text)",
//                     marginBottom: 4,
//                   }}
//                 >
//                   <Sparkles
//                     size={14}
//                     style={{ display: "inline", marginRight: 4 }}
//                   />
//                   Auto-generated Icon
//                 </p>
//                 <p style={{ fontSize: "0.72rem", color: "var(--dim)" }}>
//                   A premium icon with your store's initial and brand color.
//                 </p>
//               </div>
//             </div>
//           )}

//           {/* Custom Upload */}
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "1rem",
//               padding: "1rem",
//               background: "var(--bg2)",
//               border: `1.5px dashed ${iconError ? "#EF4444" : "var(--border)"}`,
//               borderRadius: 12,
//             }}
//           >
//             <div
//               style={{
//                 width: 64,
//                 height: 64,
//                 borderRadius: 14,
//                 background: appIconPreview
//                   ? `url(${appIconPreview}) center/cover`
//                   : "var(--bg3)",
//                 border: "1px solid var(--border)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 flexShrink: 0,
//                 overflow: "hidden",
//               }}
//             >
//               {!appIconPreview && (
//                 <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
//               )}
//             </div>
//             <div style={{ flex: 1 }}>
//               {appIcon ? (
//                 <div>
//                   <p
//                     style={{
//                       fontSize: "0.8rem",
//                       color: "var(--text)",
//                       marginBottom: 6,
//                     }}
//                   >
//                     {appIcon.name}
//                   </p>
//                   <div style={{ display: "flex", gap: 8 }}>
//                     <label
//                       style={{
//                         display: "inline-block",
//                         padding: "0.4rem 0.8rem",
//                         background: "rgba(201,138,84,0.1)",
//                         border: "1px solid rgba(201,138,84,0.25)",
//                         borderRadius: 8,
//                         color: "var(--accent-lt)",
//                         fontSize: "0.78rem",
//                         fontWeight: 600,
//                         cursor: "pointer",
//                         fontFamily: "inherit",
//                       }}
//                     >
//                       Change
//                       <input
//                         type="file"
//                         accept="image/png"
//                         onChange={handleIconChange}
//                         style={{ display: "none" }}
//                       />
//                     </label>
//                     <button
//                       type="button"
//                       onClick={removeCustomIcon}
//                       style={{
//                         padding: "0.4rem 0.8rem",
//                         background: "rgba(239,68,68,0.1)",
//                         border: "1px solid rgba(239,68,68,0.25)",
//                         borderRadius: 8,
//                         color: "#EF4444",
//                         fontSize: "0.78rem",
//                         fontWeight: 600,
//                         cursor: "pointer",
//                         fontFamily: "inherit",
//                       }}
//                     >
//                       Use Generated
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <label
//                   style={{
//                     display: "inline-block",
//                     padding: "0.5rem 1rem",
//                     background: "rgba(201,138,84,0.1)",
//                     border: "1px solid rgba(201,138,84,0.25)",
//                     borderRadius: 8,
//                     color: "var(--accent-lt)",
//                     fontSize: "0.82rem",
//                     fontWeight: 600,
//                     cursor: "pointer",
//                     fontFamily: "inherit",
//                   }}
//                 >
//                   Upload Custom Icon
//                   <input
//                     type="file"
//                     accept="image/png"
//                     onChange={handleIconChange}
//                     style={{ display: "none" }}
//                   />
//                 </label>
//               )}
//             </div>
//           </div>
//           {iconError && (
//             <p style={{ fontSize: "0.78rem", color: "#EF4444", marginTop: 6 }}>
//               {iconError}
//             </p>
//           )}
//         </div>
//       )}

//       {/* ── Form error ─────────────────────────── */}
//       {errors.form && (
//         <p
//           style={{
//             fontSize: "0.85rem",
//             color: "#EF4444",
//             marginBottom: "1rem",
//             textAlign: "center",
//           }}
//         >
//           {errors.form}
//         </p>
//       )}

//       {/* ── Submit ─────────────────────────────── */}
//       <button
//         type="submit"
//         disabled={isSubmitting}
//         style={{
//           width: "100%",
//           padding: "1rem",
//           background: isSubmitting
//             ? "var(--bg3)"
//             : "linear-gradient(135deg, var(--accent), var(--edges-500))",
//           border: "none",
//           borderRadius: 14,
//           color: isSubmitting ? "var(--dim)" : "var(--edges-50)",
//           fontSize: "1rem",
//           fontWeight: 700,
//           fontFamily: "'Instrument Sans', system-ui, sans-serif",
//           cursor: isSubmitting ? "not-allowed" : "pointer",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           gap: 8,
//           transition: "all 0.2s",
//           letterSpacing: "0.01em",
//         }}
//       >
//         {isSubmitting ? (
//           <>
//             <Loader2
//               size={18}
//               style={{ animation: "spin 1s linear infinite" }}
//             />
//             Creating your store…
//           </>
//         ) : (
//           <>
//             Create My Store <ArrowRight size={18} />
//           </>
//         )}
//       </button>
//     </form>
//   );
// }

// /** Slightly darken/lighten a hex colour */
// function adjustHex(hex: string, amount: number): string {
//   const num = parseInt(hex.replace("#", ""), 16);
//   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
//   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
//   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
//   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// }

// // // app/reseller/ResellerFormClient.tsx

// // "use client";

// // import { useState, useRef, useEffect } from "react";
// // import { useRouter } from "next/navigation";
// // import {
// //   Store,
// //   Mail,
// //   Palette,
// //   Smartphone,
// //   Check,
// //   X,
// //   Loader2,
// //   ArrowRight,
// //   Pipette,
// //   Image as ImageIcon,
// //   Sparkles,
// // } from "lucide-react";
// // import { checkStoreName } from "../actions/reseller/checkStoreName";
// // import { createReseller } from "../actions/reseller/createReseller";
// // import { generateIconPng } from "./generateIcon";

// // // Curated palette of 8 swatches resellers can pick from
// // const SWATCHES = [
// //   "#2563EB", // Blue
// //   "#7C3AED", // Purple
// //   "#DB2777", // Pink
// //   "#DC2626", // Red
// //   "#D97706", // Amber
// //   "#16A34A", // Green
// //   "#0D9488", // Teal
// //   "#111827", // Dark
// // ];

// // export function ResellerFormClient() {
// //   const router = useRouter();

// //   const [storeName, setStoreName] = useState("");
// //   const [email, setEmail] = useState("");
// //   const [brandColor, setBrandColor] = useState("#2563EB");
// //   const [androidApp, setAndroidApp] = useState(false);
// //   const [appIcon, setAppIcon] = useState<File | null>(null);
// //   const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
// //   const [iconError, setIconError] = useState("");
// //   const [useGeneratedIcon, setUseGeneratedIcon] = useState(true);
// //   const [generatedIconPreview, setGeneratedIconPreview] = useState<
// //     string | null
// //   >(null);
// //   const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

// //   const [storeNameStatus, setStoreNameStatus] = useState<
// //     "idle" | "checking" | "available" | "taken"
// //   >("idle");
// //   const [storeNameMessage, setStoreNameMessage] = useState("");

// //   const [errors, setErrors] = useState<Record<string, string>>({});
// //   const [isSubmitting, setIsSubmitting] = useState(false);

// //   const colorInputRef = useRef<HTMLInputElement>(null);

// //   // ── Generate icon preview when store name or color changes ──
// //   useEffect(() => {
// //     if (storeName.trim() && useGeneratedIcon && androidApp) {
// //       setIsGeneratingIcon(true);
// //       const timeout = setTimeout(() => {
// //         generateIconPng(storeName.trim(), brandColor).then((blob) => {
// //           const url = URL.createObjectURL(blob);
// //           setGeneratedIconPreview(url);
// //           setIsGeneratingIcon(false);
// //         });
// //       }, 400); // Debounce
// //       return () => {
// //         clearTimeout(timeout);
// //         if (generatedIconPreview) URL.revokeObjectURL(generatedIconPreview);
// //       };
// //     }
// //   }, [storeName, brandColor, useGeneratedIcon, androidApp]);

// //   // ── Check store name on blur ─────────────────────
// //   const handleStoreNameBlur = async () => {
// //     const name = storeName.toLowerCase().trim();
// //     if (name.length < 3) {
// //       setStoreNameStatus("idle");
// //       setStoreNameMessage("");
// //       return;
// //     }
// //     if (!/^[a-z0-9-]+$/.test(name)) {
// //       setStoreNameStatus("taken");
// //       setStoreNameMessage(
// //         "Only lowercase letters, numbers, and hyphens allowed",
// //       );
// //       return;
// //     }

// //     const normalized = name.replace(/[^a-z0-9]/g, "").toLowerCase();
// //     if (/^edge/.test(normalized)) {
// //       setStoreNameStatus("taken");
// //       setStoreNameMessage("That store name is not available.");
// //       return;
// //     }

// //     setStoreNameStatus("checking");
// //     const result = await checkStoreName(name);
// //     if (result.available) {
// //       setStoreNameStatus("available");
// //       setStoreNameMessage("This store name is available");
// //     } else {
// //       setStoreNameStatus("taken");
// //       setStoreNameMessage(result.error || "This store name is already taken");
// //     }
// //   };

// //   // ── Validate ─────────────────────────────────────
// //   const validate = (): boolean => {
// //     const errs: Record<string, string> = {};

// //     if (!storeName.trim()) errs.storeName = "Store name is required";
// //     else if (storeName.trim().length < 3)
// //       errs.storeName = "At least 3 characters";
// //     else if (!/^[a-z0-9-]+$/.test(storeName.trim()))
// //       errs.storeName = "Only letters, numbers, hyphens";
// //     else if (/^edge/.test(storeName.trim().replace(/[^a-z0-9]/g, "")))
// //       errs.storeName = "That store name is not available.";

// //     if (!email.trim()) errs.email = "Email is required";
// //     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
// //       errs.email = "Enter a valid email";

// //     if (storeNameStatus === "taken")
// //       errs.storeName = "Please choose a different store name";

// //     setErrors(errs);
// //     return Object.keys(errs).length === 0;
// //   };

// //   // ── Icon upload handler ──────────────────────────
// //   const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// //     const file = e.target.files?.[0];
// //     setIconError("");

// //     if (!file) {
// //       setAppIcon(null);
// //       setAppIconPreview(null);
// //       setUseGeneratedIcon(true);
// //       return;
// //     }

// //     if (file.size > 1024 * 1024) {
// //       setIconError("Image must be under 1MB");
// //       return;
// //     }

// //     const img = new Image();
// //     img.onload = () => {
// //       if (img.width !== 1024 || img.height !== 1024) {
// //         setIconError("Image must be exactly 1024×1024px");
// //         return;
// //       }
// //       setAppIcon(file);
// //       setAppIconPreview(URL.createObjectURL(file));
// //       setUseGeneratedIcon(false);
// //     };
// //     img.src = URL.createObjectURL(file);
// //   };

// //   const removeCustomIcon = () => {
// //     setAppIcon(null);
// //     setAppIconPreview(null);
// //     setUseGeneratedIcon(true);
// //   };

// //   // ── Submit ───────────────────────────────────────
// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!validate()) return;

// //     setIsSubmitting(true);

// //     const fd = new FormData();
// //     fd.append("storeName", storeName.trim());
// //     fd.append("email", email.trim());
// //     fd.append("brandColor", brandColor);
// //     fd.append("androidApp", androidApp.toString());

// //     // Handle icon
// //     if (appIcon) {
// //       fd.append("appIcon", appIcon);
// //     } else if (androidApp && useGeneratedIcon) {
// //       try {
// //         const iconBlob = await generateIconPng(storeName.trim(), brandColor);
// //         const iconFile = new File([iconBlob], `${storeName.trim()}-icon.png`, {
// //           type: "image/png",
// //         });
// //         fd.append("appIcon", iconFile);
// //       } catch (err) {
// //         console.error("Failed to generate icon:", err);
// //       }
// //     }

// //     try {
// //       const result = await createReseller(fd);
// //       if (result.error) {
// //         setErrors({ form: result.error });
// //       } else if (result.success) {
// //         router.push(
// //           `/reseller/success?store=${storeName.trim().toLowerCase()}`,
// //         );
// //       }
// //     } catch {
// //       setErrors({ form: "Something went wrong. Please try again." });
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   const inputStyle = (
// //     hasError: boolean,
// //     isSuccess: boolean,
// //   ): React.CSSProperties => ({
// //     width: "100%",
// //     padding: "0.85rem 1rem",
// //     background: "var(--bg2)",
// //     border: `1.5px solid ${hasError ? "#EF4444" : isSuccess ? "#6EBD8A" : "var(--border)"}`,
// //     borderRadius: 12,
// //     color: "var(--text)",
// //     fontSize: "0.95rem",
// //     fontFamily: "'Instrument Sans', system-ui, sans-serif",
// //     outline: "none",
// //     transition: "border-color 0.2s",
// //     paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
// //   });

// //   return (
// //     <form
// //       onSubmit={handleSubmit}
// //       style={{
// //         background: "var(--card)",
// //         border: "1px solid var(--border2)",
// //         borderRadius: 20,
// //         padding: "2.5rem 2rem",
// //       }}
// //     >
// //       {/* ── Store Name ─────────────────────────── */}
// //       <div style={{ marginBottom: "1.5rem" }}>
// //         <label
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: 8,
// //             fontSize: "0.88rem",
// //             fontWeight: 600,
// //             color: "var(--text)",
// //             marginBottom: "0.5rem",
// //           }}
// //         >
// //           <Store size={16} style={{ color: "var(--accent)" }} />
// //           Store Name
// //         </label>
// //         <div style={{ position: "relative" }}>
// //           <input
// //             type="text"
// //             value={storeName}
// //             onChange={(e) => {
// //               setStoreName(e.target.value.toLowerCase());
// //               setStoreNameStatus("idle");
// //               setStoreNameMessage("");
// //             }}
// //             onBlur={handleStoreNameBlur}
// //             placeholder="my-store"
// //             style={inputStyle(
// //               !!errors.storeName,
// //               storeNameStatus === "available",
// //             )}
// //           />
// //           <div
// //             style={{
// //               position: "absolute",
// //               right: 12,
// //               top: "50%",
// //               transform: "translateY(-50%)",
// //             }}
// //           >
// //             {storeNameStatus === "checking" && (
// //               <Loader2
// //                 size={18}
// //                 style={{
// //                   color: "var(--accent)",
// //                   animation: "spin 1s linear infinite",
// //                 }}
// //               />
// //             )}
// //             {storeNameStatus === "available" && (
// //               <Check size={18} style={{ color: "#6EBD8A" }} />
// //             )}
// //             {storeNameStatus === "taken" && (
// //               <X size={18} style={{ color: "#EF4444" }} />
// //             )}
// //           </div>
// //         </div>
// //         {storeNameMessage && !errors.storeName && (
// //           <p
// //             style={{
// //               fontSize: "0.78rem",
// //               marginTop: 6,
// //               color: storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
// //             }}
// //           >
// //             {storeNameMessage}
// //           </p>
// //         )}
// //         {errors.storeName && (
// //           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
// //             {errors.storeName}
// //           </p>
// //         )}
// //         <p style={{ fontSize: "0.78rem", color: "var(--dim)", marginTop: 6 }}>
// //           {process.env.NEXT_PUBLIC_STORE_URL}/{storeName || "storename"}
// //         </p>
// //       </div>

// //       {/* ── Email ──────────────────────────────── */}
// //       <div style={{ marginBottom: "1.5rem" }}>
// //         <label
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: 8,
// //             fontSize: "0.88rem",
// //             fontWeight: 600,
// //             color: "var(--text)",
// //             marginBottom: "0.5rem",
// //           }}
// //         >
// //           <Mail size={16} style={{ color: "var(--accent)" }} />
// //           Email Address
// //         </label>
// //         <input
// //           type="email"
// //           value={email}
// //           onChange={(e) => setEmail(e.target.value)}
// //           placeholder="you@example.com"
// //           style={inputStyle(!!errors.email, false)}
// //         />
// //         {errors.email && (
// //           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
// //             {errors.email}
// //           </p>
// //         )}
// //       </div>

// //       {/* ── Brand Color ────────────────────────── */}
// //       <div style={{ marginBottom: "1.5rem" }}>
// //         <label
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: 8,
// //             fontSize: "0.88rem",
// //             fontWeight: 600,
// //             color: "var(--text)",
// //             marginBottom: "0.7rem",
// //           }}
// //         >
// //           <Palette size={16} style={{ color: "var(--accent)" }} />
// //           Brand Color
// //         </label>

// //         <div
// //           style={{
// //             display: "grid",
// //             gridTemplateColumns: "repeat(8, 1fr)",
// //             gap: "0.45rem",
// //             marginBottom: "0.75rem",
// //           }}
// //         >
// //           {SWATCHES.map((hex) => (
// //             <button
// //               key={hex}
// //               type="button"
// //               onClick={() => setBrandColor(hex)}
// //               title={hex}
// //               style={{
// //                 width: "100%",
// //                 aspectRatio: "1",
// //                 borderRadius: 8,
// //                 background: hex,
// //                 border:
// //                   brandColor === hex
// //                     ? "2.5px solid #FFFFFF"
// //                     : "2px solid transparent",
// //                 outline: brandColor === hex ? `2px solid ${hex}` : "none",
// //                 cursor: "pointer",
// //                 transition: "transform 0.15s",
// //                 transform: brandColor === hex ? "scale(1.15)" : "scale(1)",
// //               }}
// //             />
// //           ))}
// //         </div>

// //         <div
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "0.75rem",
// //             padding: "0.75rem 1rem",
// //             background: "var(--bg2)",
// //             border: "1px solid var(--border)",
// //             borderRadius: 12,
// //           }}
// //         >
// //           <div
// //             style={{
// //               width: 36,
// //               height: 36,
// //               borderRadius: 8,
// //               background: brandColor,
// //               flexShrink: 0,
// //               border: "1px solid rgba(255,255,255,0.15)",
// //             }}
// //           />
// //           <span
// //             style={{
// //               fontFamily: "monospace",
// //               fontSize: "0.9rem",
// //               color: "var(--accent-lt)",
// //               flex: 1,
// //             }}
// //           >
// //             {brandColor.toUpperCase()}
// //           </span>
// //           <button
// //             type="button"
// //             onClick={() => colorInputRef.current?.click()}
// //             style={{
// //               display: "inline-flex",
// //               alignItems: "center",
// //               gap: 6,
// //               padding: "0.45rem 0.9rem",
// //               background: "rgba(201,138,84,0.1)",
// //               border: "1px solid rgba(201,138,84,0.25)",
// //               borderRadius: 8,
// //               color: "var(--accent-lt)",
// //               fontSize: "0.8rem",
// //               fontWeight: 600,
// //               cursor: "pointer",
// //               fontFamily: "inherit",
// //               whiteSpace: "nowrap",
// //             }}
// //           >
// //             <Pipette size={13} /> Custom
// //           </button>
// //           <input
// //             ref={colorInputRef}
// //             type="color"
// //             value={brandColor}
// //             onChange={(e) => setBrandColor(e.target.value)}
// //             style={{
// //               position: "absolute",
// //               opacity: 0,
// //               pointerEvents: "none",
// //               width: 0,
// //               height: 0,
// //             }}
// //           />
// //         </div>

// //         {/* Mini store preview */}
// //         <div
// //           style={{
// //             marginTop: "0.75rem",
// //             borderRadius: 10,
// //             overflow: "hidden",
// //             border: "1px solid var(--border)",
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: `linear-gradient(135deg, ${brandColor}, ${adjustHex(brandColor, -20)})`,
// //               padding: "0.6rem 0.9rem",
// //               display: "flex",
// //               alignItems: "center",
// //               gap: 8,
// //             }}
// //           >
// //             <div
// //               style={{
// //                 width: 8,
// //                 height: 8,
// //                 borderRadius: "50%",
// //                 background: "rgba(255,255,255,0.7)",
// //               }}
// //             />
// //             <span
// //               style={{
// //                 fontSize: "0.75rem",
// //                 fontWeight: 600,
// //                 color: "#fff",
// //                 opacity: 0.9,
// //               }}
// //             >
// //               {storeName || "your-store"} · Data & Airtime Store
// //             </span>
// //           </div>
// //           <div
// //             style={{
// //               background: "var(--bg3)",
// //               padding: "0.5rem 0.9rem",
// //               display: "flex",
// //               gap: 6,
// //             }}
// //           >
// //             {["MTN", "AIRTEL", "GLO"].map((n, i) => (
// //               <div
// //                 key={n}
// //                 style={{
// //                   padding: "0.2rem 0.6rem",
// //                   borderRadius: 6,
// //                   fontSize: "0.65rem",
// //                   fontWeight: 600,
// //                   background: i === 0 ? brandColor : "transparent",
// //                   color: i === 0 ? "#fff" : "var(--dim)",
// //                   border: i === 0 ? "none" : "1px solid var(--border)",
// //                 }}
// //               >
// //                 {n}
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //         <p
// //           style={{
// //             fontSize: "0.75rem",
// //             color: "var(--dim)",
// //             marginTop: "0.5rem",
// //           }}
// //         >
// //           This colour is used for buttons, tabs, and highlights on your store.
// //         </p>
// //       </div>

// //       {/* ── Android App ────────────────────────── */}
// //       <div style={{ marginBottom: "2rem" }}>
// //         <div
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "space-between",
// //             padding: "1rem 1.2rem",
// //             background: "var(--bg2)",
// //             borderRadius: 12,
// //             border: "1px solid var(--border)",
// //           }}
// //         >
// //           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
// //             <Smartphone size={18} style={{ color: "var(--accent)" }} />
// //             <div>
// //               <p
// //                 style={{
// //                   fontSize: "0.9rem",
// //                   fontWeight: 600,
// //                   color: "var(--text)",
// //                 }}
// //               >
// //                 Android App
// //               </p>
// //               <p
// //                 style={{
// //                   fontSize: "0.75rem",
// //                   color: "var(--dim)",
// //                   marginTop: 2,
// //                 }}
// //               >
// //                 Get a branded APK in 3–5 business days
// //               </p>
// //             </div>
// //           </div>
// //           <button
// //             type="button"
// //             onClick={() => setAndroidApp(!androidApp)}
// //             style={{
// //               width: 48,
// //               height: 28,
// //               borderRadius: 100,
// //               background: androidApp ? "var(--accent)" : "var(--bg3)",
// //               border: androidApp
// //                 ? "1px solid var(--accent)"
// //                 : "1px solid var(--border2)",
// //               cursor: "pointer",
// //               position: "relative",
// //               transition: "all 0.2s",
// //               flexShrink: 0,
// //             }}
// //           >
// //             <div
// //               style={{
// //                 position: "absolute",
// //                 top: 3,
// //                 left: androidApp ? 23 : 3,
// //                 width: 20,
// //                 height: 20,
// //                 borderRadius: "50%",
// //                 background: "#fff",
// //                 transition: "left 0.2s",
// //                 boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
// //               }}
// //             />
// //           </button>
// //         </div>
// //       </div>

// //       {/* ── App Icon (shown when APK selected) ── */}
// //       {androidApp && (
// //         <div style={{ marginBottom: "2rem" }}>
// //           <label
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: 8,
// //               fontSize: "0.88rem",
// //               fontWeight: 600,
// //               color: "var(--text)",
// //               marginBottom: "0.7rem",
// //             }}
// //           >
// //             <ImageIcon size={16} style={{ color: "var(--accent)" }} />
// //             App Icon{" "}
// //             <span
// //               style={{
// //                 fontWeight: 400,
// //                 color: "var(--dim)",
// //                 fontSize: "0.8rem",
// //               }}
// //             >
// //               (optional)
// //             </span>
// //           </label>
// //           <p
// //             style={{
// //               fontSize: "0.78rem",
// //               color: "var(--dim)",
// //               marginBottom: "0.75rem",
// //             }}
// //           >
// //             Upload a 1024×1024px PNG, or we'll generate a premium one from your
// //             store name.
// //           </p>

// //           {/* Generated Icon Preview */}
// //           {useGeneratedIcon && storeName.trim() && (
// //             <div
// //               style={{
// //                 display: "flex",
// //                 alignItems: "center",
// //                 gap: "1rem",
// //                 padding: "1rem",
// //                 background: "var(--bg2)",
// //                 border: "1.5px solid var(--border)",
// //                 borderRadius: 12,
// //                 marginBottom: "0.75rem",
// //               }}
// //             >
// //               <div
// //                 style={{
// //                   width: 64,
// //                   height: 64,
// //                   borderRadius: 14,
// //                   border: "1px solid var(--border)",
// //                   overflow: "hidden",
// //                   flexShrink: 0,
// //                   background: brandColor,
// //                 }}
// //               >
// //                 {isGeneratingIcon ? (
// //                   <div
// //                     style={{
// //                       width: "100%",
// //                       height: "100%",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                     }}
// //                   >
// //                     <Loader2
// //                       size={20}
// //                       style={{
// //                         color: "#fff",
// //                         animation: "spin 1s linear infinite",
// //                       }}
// //                     />
// //                   </div>
// //                 ) : generatedIconPreview ? (
// //                   <img
// //                     src={generatedIconPreview}
// //                     alt="Generated icon"
// //                     style={{ width: "100%", height: "100%" }}
// //                   />
// //                 ) : null}
// //               </div>
// //               <div style={{ flex: 1 }}>
// //                 <p
// //                   style={{
// //                     fontSize: "0.82rem",
// //                     fontWeight: 600,
// //                     color: "var(--text)",
// //                     marginBottom: 4,
// //                   }}
// //                 >
// //                   <Sparkles
// //                     size={14}
// //                     style={{ display: "inline", marginRight: 4 }}
// //                   />
// //                   Auto-generated Icon
// //                 </p>
// //                 <p style={{ fontSize: "0.72rem", color: "var(--dim)" }}>
// //                   A premium icon with your store's initial and brand color.
// //                 </p>
// //               </div>
// //             </div>
// //           )}

// //           {/* Custom Upload */}
// //           <div
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: "1rem",
// //               padding: "1rem",
// //               background: "var(--bg2)",
// //               border: `1.5px dashed ${iconError ? "#EF4444" : "var(--border)"}`,
// //               borderRadius: 12,
// //             }}
// //           >
// //             <div
// //               style={{
// //                 width: 64,
// //                 height: 64,
// //                 borderRadius: 14,
// //                 background: appIconPreview
// //                   ? `url(${appIconPreview}) center/cover`
// //                   : "var(--bg3)",
// //                 border: "1px solid var(--border)",
// //                 display: "flex",
// //                 alignItems: "center",
// //                 justifyContent: "center",
// //                 flexShrink: 0,
// //                 overflow: "hidden",
// //               }}
// //             >
// //               {!appIconPreview && (
// //                 <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
// //               )}
// //             </div>
// //             <div style={{ flex: 1 }}>
// //               {appIcon ? (
// //                 <div>
// //                   <p
// //                     style={{
// //                       fontSize: "0.8rem",
// //                       color: "var(--text)",
// //                       marginBottom: 6,
// //                     }}
// //                   >
// //                     {appIcon.name}
// //                   </p>
// //                   <div style={{ display: "flex", gap: 8 }}>
// //                     <label
// //                       style={{
// //                         display: "inline-block",
// //                         padding: "0.4rem 0.8rem",
// //                         background: "rgba(201,138,84,0.1)",
// //                         border: "1px solid rgba(201,138,84,0.25)",
// //                         borderRadius: 8,
// //                         color: "var(--accent-lt)",
// //                         fontSize: "0.78rem",
// //                         fontWeight: 600,
// //                         cursor: "pointer",
// //                         fontFamily: "inherit",
// //                       }}
// //                     >
// //                       Change
// //                       <input
// //                         type="file"
// //                         accept="image/png"
// //                         onChange={handleIconChange}
// //                         style={{ display: "none" }}
// //                       />
// //                     </label>
// //                     <button
// //                       type="button"
// //                       onClick={removeCustomIcon}
// //                       style={{
// //                         padding: "0.4rem 0.8rem",
// //                         background: "rgba(239,68,68,0.1)",
// //                         border: "1px solid rgba(239,68,68,0.25)",
// //                         borderRadius: 8,
// //                         color: "#EF4444",
// //                         fontSize: "0.78rem",
// //                         fontWeight: 600,
// //                         cursor: "pointer",
// //                         fontFamily: "inherit",
// //                       }}
// //                     >
// //                       Use Generated
// //                     </button>
// //                   </div>
// //                 </div>
// //               ) : (
// //                 <label
// //                   style={{
// //                     display: "inline-block",
// //                     padding: "0.5rem 1rem",
// //                     background: "rgba(201,138,84,0.1)",
// //                     border: "1px solid rgba(201,138,84,0.25)",
// //                     borderRadius: 8,
// //                     color: "var(--accent-lt)",
// //                     fontSize: "0.82rem",
// //                     fontWeight: 600,
// //                     cursor: "pointer",
// //                     fontFamily: "inherit",
// //                   }}
// //                 >
// //                   Upload Custom Icon
// //                   <input
// //                     type="file"
// //                     accept="image/png"
// //                     onChange={handleIconChange}
// //                     style={{ display: "none" }}
// //                   />
// //                 </label>
// //               )}
// //             </div>
// //           </div>
// //           {iconError && (
// //             <p style={{ fontSize: "0.78rem", color: "#EF4444", marginTop: 6 }}>
// //               {iconError}
// //             </p>
// //           )}
// //         </div>
// //       )}

// //       {/* ── Form error ─────────────────────────── */}
// //       {errors.form && (
// //         <p
// //           style={{
// //             fontSize: "0.85rem",
// //             color: "#EF4444",
// //             marginBottom: "1rem",
// //             textAlign: "center",
// //           }}
// //         >
// //           {errors.form}
// //         </p>
// //       )}

// //       {/* ── Submit ─────────────────────────────── */}
// //       <button
// //         type="submit"
// //         disabled={isSubmitting}
// //         style={{
// //           width: "100%",
// //           padding: "1rem",
// //           background: isSubmitting
// //             ? "var(--bg3)"
// //             : "linear-gradient(135deg, var(--accent), var(--edges-500))",
// //           border: "none",
// //           borderRadius: 14,
// //           color: isSubmitting ? "var(--dim)" : "var(--edges-50)",
// //           fontSize: "1rem",
// //           fontWeight: 700,
// //           fontFamily: "'Instrument Sans', system-ui, sans-serif",
// //           cursor: isSubmitting ? "not-allowed" : "pointer",
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent: "center",
// //           gap: 8,
// //           transition: "all 0.2s",
// //           letterSpacing: "0.01em",
// //         }}
// //       >
// //         {isSubmitting ? (
// //           <>
// //             <Loader2
// //               size={18}
// //               style={{ animation: "spin 1s linear infinite" }}
// //             />
// //             Creating your store…
// //           </>
// //         ) : (
// //           <>
// //             Create My Store <ArrowRight size={18} />
// //           </>
// //         )}
// //       </button>
// //     </form>
// //   );
// // }

// // /** Slightly darken/lighten a hex colour */
// // function adjustHex(hex: string, amount: number): string {
// //   const num = parseInt(hex.replace("#", ""), 16);
// //   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
// //   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
// //   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
// //   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// // }

// // // // app/reseller/ResellerFormClient.tsx

// // // "use client";

// // // import { useState, useRef } from "react";
// // // import { useRouter } from "next/navigation";
// // // import {
// // //   Store,
// // //   Mail,
// // //   Palette,
// // //   Smartphone,
// // //   Check,
// // //   X,
// // //   Loader2,
// // //   ArrowRight,
// // //   Pipette,
// // // } from "lucide-react";
// // // import { checkStoreName } from "../actions/reseller/checkStoreName";
// // // import { createReseller } from "../actions/reseller/createReseller";
// // // import { generateIconPng } from "./generateIcon";

// // // // Curated palette of 16 swatches resellers can pick from
// // // const SWATCHES = [
// // //   "#2563EB", // Blue
// // //   // "#1D4ED8", // Deep Blue
// // //   "#7C3AED", // Purple
// // //   // "#9333EA", // Violet
// // //   "#DB2777", // Pink
// // //   // "#E11D48", // Rose
// // //   "#DC2626", // Red
// // //   // "#EA580C", // Orange
// // //   "#D97706", // Amber
// // //   // "#CA8A04", // Yellow
// // //   "#16A34A", // Green
// // //   // "#059669", // Emerald
// // //   "#0D9488", // Teal
// // //   // "#0284C7", // Sky
// // //   "#111827", // Dark
// // //   // "#1F2937", // Slate
// // // ];

// // // export function ResellerFormClient() {
// // //   const router = useRouter();

// // //   const [storeName, setStoreName] = useState("");
// // //   const [email, setEmail] = useState("");
// // //   const [brandColor, setBrandColor] = useState("#2563EB");
// // //   const [androidApp, setAndroidApp] = useState(false);
// // //   // Add new state at the top:
// // //   const [appIcon, setAppIcon] = useState<File | null>(null);
// // //   const [appIconPreview, setAppIconPreview] = useState<string | null>(null);
// // //   const [iconError, setIconError] = useState("");

// // //   // Inside the component, add this for live preview:
// // //   const [generatedIconPreview, setGeneratedIconPreview] = useState<
// // //     string | null
// // //   >(null);

// // //   const [storeNameStatus, setStoreNameStatus] = useState<
// // //     "idle" | "checking" | "available" | "taken"
// // //   >("idle");
// // //   const [storeNameMessage, setStoreNameMessage] = useState("");

// // //   const [errors, setErrors] = useState<Record<string, string>>({});
// // //   const [isSubmitting, setIsSubmitting] = useState(false);

// // //   const colorInputRef = useRef<HTMLInputElement>(null);

// // //   // ── Check store name on blur ─────────────────────
// // //   const handleStoreNameBlur = async () => {
// // //     const name = storeName.toLowerCase().trim();
// // //     if (name.length < 3) {
// // //       setStoreNameStatus("idle");
// // //       setStoreNameMessage("");
// // //       return;
// // //     }
// // //     if (!/^[a-z0-9-]+$/.test(name)) {
// // //       setStoreNameStatus("taken");
// // //       setStoreNameMessage(
// // //         "Only lowercase letters, numbers, and hyphens allowed",
// // //       );
// // //       return;
// // //     }

// // //     // ── Block reserved "edges" names ─────────
// // //     const normalized = name.replace(/[^a-z0-9]/g, "").toLowerCase();
// // //     if (/^edge/.test(normalized)) {
// // //       setStoreNameStatus("taken");
// // //       setStoreNameMessage("That store name is not available.");
// // //       return;
// // //     }

// // //     setStoreNameStatus("checking");
// // //     const result = await checkStoreName(name);
// // //     if (result.available) {
// // //       setStoreNameStatus("available");
// // //       setStoreNameMessage("This store name is available");
// // //     } else {
// // //       setStoreNameStatus("taken");
// // //       setStoreNameMessage(result.error || "This store name is already taken");
// // //     }
// // //   };

// // //   // ── Validate ─────────────────────────────────────
// // //   const validate = (): boolean => {
// // //     const errs: Record<string, string> = {};

// // //     if (!storeName.trim()) errs.storeName = "Store name is required";
// // //     else if (storeName.trim().length < 3)
// // //       errs.storeName = "At least 3 characters";
// // //     else if (!/^[a-z0-9-]+$/.test(storeName.trim()))
// // //       errs.storeName = "Only letters, numbers, hyphens";
// // //     else if (/^edge/.test(storeName.trim().replace(/[^a-z0-9]/g, "")))
// // //       errs.storeName = "That store name is not available.";

// // //     if (!email.trim()) errs.email = "Email is required";
// // //     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
// // //       errs.email = "Enter a valid email";

// // //     if (storeNameStatus === "taken")
// // //       errs.storeName = "Please choose a different store name";

// // //     setErrors(errs);
// // //     return Object.keys(errs).length === 0;
// // //   };

// // //   // Add this handler:
// // //   const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     const file = e.target.files?.[0];
// // //     setIconError("");

// // //     if (!file) {
// // //       setAppIcon(null);
// // //       setAppIconPreview(null);
// // //       return;
// // //     }

// // //     // Validate size
// // //     if (file.size > 1024 * 1024) {
// // //       setIconError("Image must be under 1MB");
// // //       return;
// // //     }

// // //     // Validate dimensions
// // //     const img = new Image();
// // //     img.onload = () => {
// // //       if (img.width !== 1024 || img.height !== 1024) {
// // //         setIconError("Image must be exactly 1024×1024px");
// // //         return;
// // //       }
// // //       setAppIcon(file);
// // //       setAppIconPreview(URL.createObjectURL(file));
// // //     };
// // //     img.src = URL.createObjectURL(file);
// // //   };

// // //   // ── Submit ───────────────────────────────────────
// // //   const handleSubmit = async (e: React.FormEvent) => {
// // //     e.preventDefault();
// // //     if (!validate()) return;

// // //     setIsSubmitting(true);

// // //     const fd = new FormData();
// // //     fd.append("storeName", storeName.trim());
// // //     fd.append("email", email.trim());
// // //     fd.append("brandColor", brandColor);
// // //     fd.append("androidApp", androidApp.toString());
// // //     if (appIcon) {
// // //       fd.append("appIcon", appIcon);
// // //     }

// // //     try {
// // //       const result = await createReseller(fd);
// // //       if (result.error) {
// // //         setErrors({ form: result.error });
// // //       } else if (result.success) {
// // //         router.push(
// // //           `/reseller/success?store=${storeName.trim().toLowerCase()}`,
// // //         );
// // //       }
// // //     } catch {
// // //       setErrors({ form: "Something went wrong. Please try again." });
// // //     } finally {
// // //       setIsSubmitting(false);
// // //     }
// // //   };

// // //   const inputStyle = (
// // //     hasError: boolean,
// // //     isSuccess: boolean,
// // //   ): React.CSSProperties => ({
// // //     width: "100%",
// // //     padding: "0.85rem 1rem",
// // //     background: "var(--bg2)",
// // //     border: `1.5px solid ${
// // //       hasError ? "#EF4444" : isSuccess ? "#6EBD8A" : "var(--border)"
// // //     }`,
// // //     borderRadius: 12,
// // //     color: "var(--text)",
// // //     fontSize: "0.95rem",
// // //     fontFamily: "'Instrument Sans', system-ui, sans-serif",
// // //     outline: "none",
// // //     transition: "border-color 0.2s",
// // //     paddingRight: storeNameStatus !== "idle" ? "2.5rem" : "1rem",
// // //   });

// // //   return (
// // //     <form
// // //       onSubmit={handleSubmit}
// // //       style={{
// // //         background: "var(--card)",
// // //         border: "1px solid var(--border2)",
// // //         borderRadius: 20,
// // //         padding: "2.5rem 2rem",
// // //       }}
// // //     >
// // //       {/* ── Store Name ─────────────────────────── */}
// // //       <div style={{ marginBottom: "1.5rem" }}>
// // //         <label
// // //           style={{
// // //             display: "flex",
// // //             alignItems: "center",
// // //             gap: 8,
// // //             fontSize: "0.88rem",
// // //             fontWeight: 600,
// // //             color: "var(--text)",
// // //             marginBottom: "0.5rem",
// // //           }}
// // //         >
// // //           <Store size={16} style={{ color: "var(--accent)" }} />
// // //           Store Name
// // //         </label>
// // //         <div style={{ position: "relative" }}>
// // //           <input
// // //             type="text"
// // //             value={storeName}
// // //             onChange={(e) => {
// // //               setStoreName(e.target.value.toLowerCase());
// // //               setStoreNameStatus("idle");
// // //               setStoreNameMessage("");
// // //             }}
// // //             onBlur={handleStoreNameBlur}
// // //             placeholder="my-store"
// // //             style={inputStyle(
// // //               !!errors.storeName,
// // //               storeNameStatus === "available",
// // //             )}
// // //           />
// // //           <div
// // //             style={{
// // //               position: "absolute",
// // //               right: 12,
// // //               top: "50%",
// // //               transform: "translateY(-50%)",
// // //             }}
// // //           >
// // //             {storeNameStatus === "checking" && (
// // //               <Loader2
// // //                 size={18}
// // //                 style={{
// // //                   color: "var(--accent)",
// // //                   animation: "spin 1s linear infinite",
// // //                 }}
// // //               />
// // //             )}
// // //             {storeNameStatus === "available" && (
// // //               <Check size={18} style={{ color: "#6EBD8A" }} />
// // //             )}
// // //             {storeNameStatus === "taken" && (
// // //               <X size={18} style={{ color: "#EF4444" }} />
// // //             )}
// // //           </div>
// // //         </div>
// // //         {storeNameMessage && !errors.storeName && (
// // //           <p
// // //             style={{
// // //               fontSize: "0.78rem",
// // //               marginTop: 6,
// // //               color: storeNameStatus === "available" ? "#6EBD8A" : "#EF4444",
// // //             }}
// // //           >
// // //             {storeNameMessage}
// // //           </p>
// // //         )}
// // //         {errors.storeName && (
// // //           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
// // //             {errors.storeName}
// // //           </p>
// // //         )}
// // //         <p style={{ fontSize: "0.78rem", color: "var(--dim)", marginTop: 6 }}>
// // //           {process.env.NEXT_PUBLIC_STORE_URL}/{storeName || "storename"}
// // //         </p>
// // //       </div>

// // //       {/* ── Email ──────────────────────────────── */}
// // //       <div style={{ marginBottom: "1.5rem" }}>
// // //         <label
// // //           style={{
// // //             display: "flex",
// // //             alignItems: "center",
// // //             gap: 8,
// // //             fontSize: "0.88rem",
// // //             fontWeight: 600,
// // //             color: "var(--text)",
// // //             marginBottom: "0.5rem",
// // //           }}
// // //         >
// // //           <Mail size={16} style={{ color: "var(--accent)" }} />
// // //           Email Address
// // //         </label>
// // //         <input
// // //           type="email"
// // //           value={email}
// // //           onChange={(e) => setEmail(e.target.value)}
// // //           placeholder="you@example.com"
// // //           style={inputStyle(!!errors.email, false)}
// // //         />
// // //         {errors.email && (
// // //           <p style={{ fontSize: "0.78rem", marginTop: 6, color: "#EF4444" }}>
// // //             {errors.email}
// // //           </p>
// // //         )}
// // //       </div>

// // //       {/* ── Brand Color ────────────────────────── */}
// // //       <div style={{ marginBottom: "1.5rem" }}>
// // //         <label
// // //           style={{
// // //             display: "flex",
// // //             alignItems: "center",
// // //             gap: 8,
// // //             fontSize: "0.88rem",
// // //             fontWeight: 600,
// // //             color: "var(--text)",
// // //             marginBottom: "0.7rem",
// // //           }}
// // //         >
// // //           <Palette size={16} style={{ color: "var(--accent)" }} />
// // //           Brand Color
// // //         </label>

// // //         {/* Swatch grid */}
// // //         <div
// // //           style={{
// // //             display: "grid",
// // //             gridTemplateColumns: "repeat(8, 1fr)",
// // //             gap: "0.45rem",
// // //             marginBottom: "0.75rem",
// // //           }}
// // //         >
// // //           {SWATCHES.map((hex) => (
// // //             <button
// // //               key={hex}
// // //               type="button"
// // //               onClick={() => setBrandColor(hex)}
// // //               title={hex}
// // //               style={{
// // //                 width: "100%",
// // //                 aspectRatio: "1",
// // //                 borderRadius: 8,
// // //                 background: hex,
// // //                 border:
// // //                   brandColor === hex
// // //                     ? "2.5px solid #FFFFFF"
// // //                     : "2px solid transparent",
// // //                 outline: brandColor === hex ? `2px solid ${hex}` : "none",
// // //                 cursor: "pointer",
// // //                 transition: "transform 0.15s",
// // //                 transform: brandColor === hex ? "scale(1.15)" : "scale(1)",
// // //               }}
// // //             />
// // //           ))}
// // //         </div>

// // //         {/* Custom colour row */}
// // //         <div
// // //           style={{
// // //             display: "flex",
// // //             alignItems: "center",
// // //             gap: "0.75rem",
// // //             padding: "0.75rem 1rem",
// // //             background: "var(--bg2)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 12,
// // //           }}
// // //         >
// // //           {/* Live preview swatch */}
// // //           <div
// // //             style={{
// // //               width: 36,
// // //               height: 36,
// // //               borderRadius: 8,
// // //               background: brandColor,
// // //               flexShrink: 0,
// // //               border: "1px solid rgba(255,255,255,0.15)",
// // //             }}
// // //           />

// // //           {/* Hex display */}
// // //           <span
// // //             style={{
// // //               fontFamily: "monospace",
// // //               fontSize: "0.9rem",
// // //               color: "var(--accent-lt)",
// // //               flex: 1,
// // //             }}
// // //           >
// // //             {brandColor.toUpperCase()}
// // //           </span>

// // //           {/* Custom picker trigger */}
// // //           <button
// // //             type="button"
// // //             onClick={() => colorInputRef.current?.click()}
// // //             style={{
// // //               display: "inline-flex",
// // //               alignItems: "center",
// // //               gap: 6,
// // //               padding: "0.45rem 0.9rem",
// // //               background: "rgba(201,138,84,0.1)",
// // //               border: "1px solid rgba(201,138,84,0.25)",
// // //               borderRadius: 8,
// // //               color: "var(--accent-lt)",
// // //               fontSize: "0.8rem",
// // //               fontWeight: 600,
// // //               cursor: "pointer",
// // //               fontFamily: "inherit",
// // //               whiteSpace: "nowrap",
// // //             }}
// // //           >
// // //             <Pipette size={13} /> Custom
// // //           </button>

// // //           {/* Hidden native color input */}
// // //           <input
// // //             ref={colorInputRef}
// // //             type="color"
// // //             value={brandColor}
// // //             onChange={(e) => setBrandColor(e.target.value)}
// // //             style={{
// // //               position: "absolute",
// // //               opacity: 0,
// // //               pointerEvents: "none",
// // //               width: 0,
// // //               height: 0,
// // //             }}
// // //           />
// // //         </div>

// // //         {/* Mini store preview */}
// // //         <div
// // //           style={{
// // //             marginTop: "0.75rem",
// // //             borderRadius: 10,
// // //             overflow: "hidden",
// // //             border: "1px solid var(--border)",
// // //           }}
// // //         >
// // //           <div
// // //             style={{
// // //               background: `linear-gradient(135deg, ${brandColor}, ${adjustHex(brandColor, -20)})`,
// // //               padding: "0.6rem 0.9rem",
// // //               display: "flex",
// // //               alignItems: "center",
// // //               gap: 8,
// // //             }}
// // //           >
// // //             <div
// // //               style={{
// // //                 width: 8,
// // //                 height: 8,
// // //                 borderRadius: "50%",
// // //                 background: "rgba(255,255,255,0.7)",
// // //               }}
// // //             />
// // //             <span
// // //               style={{
// // //                 fontSize: "0.75rem",
// // //                 fontWeight: 600,
// // //                 color: "#fff",
// // //                 opacity: 0.9,
// // //               }}
// // //             >
// // //               {storeName || "your-store"} · Data & Airtime Store
// // //             </span>
// // //           </div>
// // //           <div
// // //             style={{
// // //               background: "var(--bg3)",
// // //               padding: "0.5rem 0.9rem",
// // //               display: "flex",
// // //               gap: 6,
// // //             }}
// // //           >
// // //             {["MTN", "AIRTEL", "GLO"].map((n, i) => (
// // //               <div
// // //                 key={n}
// // //                 style={{
// // //                   padding: "0.2rem 0.6rem",
// // //                   borderRadius: 6,
// // //                   fontSize: "0.65rem",
// // //                   fontWeight: 600,
// // //                   background: i === 0 ? brandColor : "transparent",
// // //                   color: i === 0 ? "#fff" : "var(--dim)",
// // //                   border: i === 0 ? "none" : "1px solid var(--border)",
// // //                 }}
// // //               >
// // //                 {n}
// // //               </div>
// // //             ))}
// // //           </div>
// // //         </div>
// // //         <p
// // //           style={{
// // //             fontSize: "0.75rem",
// // //             color: "var(--dim)",
// // //             marginTop: "0.5rem",
// // //           }}
// // //         >
// // //           This colour is used for buttons, tabs, and highlights on your store.
// // //         </p>
// // //       </div>

// // //       {/* ── Android App ────────────────────────── */}
// // //       <div style={{ marginBottom: "2rem" }}>
// // //         <div
// // //           style={{
// // //             display: "flex",
// // //             alignItems: "center",
// // //             justifyContent: "space-between",
// // //             padding: "1rem 1.2rem",
// // //             background: "var(--bg2)",
// // //             borderRadius: 12,
// // //             border: "1px solid var(--border)",
// // //           }}
// // //         >
// // //           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
// // //             <Smartphone size={18} style={{ color: "var(--accent)" }} />
// // //             <div>
// // //               <p
// // //                 style={{
// // //                   fontSize: "0.9rem",
// // //                   fontWeight: 600,
// // //                   color: "var(--text)",
// // //                 }}
// // //               >
// // //                 Android App
// // //               </p>
// // //               <p
// // //                 style={{
// // //                   fontSize: "0.75rem",
// // //                   color: "var(--dim)",
// // //                   marginTop: 2,
// // //                 }}
// // //               >
// // //                 Get a branded APK in 3–5 business days
// // //               </p>
// // //             </div>
// // //           </div>
// // //           <button
// // //             type="button"
// // //             onClick={() => setAndroidApp(!androidApp)}
// // //             style={{
// // //               width: 48,
// // //               height: 28,
// // //               borderRadius: 100,
// // //               background: androidApp ? "var(--accent)" : "var(--bg3)",
// // //               border: androidApp
// // //                 ? "1px solid var(--accent)"
// // //                 : "1px solid var(--border2)",
// // //               cursor: "pointer",
// // //               position: "relative",
// // //               transition: "all 0.2s",
// // //               flexShrink: 0,
// // //             }}
// // //           >
// // //             <div
// // //               style={{
// // //                 position: "absolute",
// // //                 top: 3,
// // //                 left: androidApp ? 23 : 3,
// // //                 width: 20,
// // //                 height: 20,
// // //                 borderRadius: "50%",
// // //                 background: "#fff",
// // //                 transition: "left 0.2s",
// // //                 boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
// // //               }}
// // //             />
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* ── App Icon Upload (shown only when APK is selected) ── */}
// // //       {androidApp && (
// // //         <div style={{ marginBottom: "2rem" }}>
// // //           <label
// // //             style={{
// // //               display: "flex",
// // //               alignItems: "center",
// // //               gap: 8,
// // //               fontSize: "0.88rem",
// // //               fontWeight: 600,
// // //               color: "var(--text)",
// // //               marginBottom: "0.7rem",
// // //             }}
// // //           >
// // //             <Palette size={16} style={{ color: "var(--accent)" }} />
// // //             App Icon
// // //           </label>
// // //           <p
// // //             style={{
// // //               fontSize: "0.78rem",
// // //               color: "var(--dim)",
// // //               marginBottom: "0.75rem",
// // //             }}
// // //           >
// // //             Upload a 1024×1024px transparent PNG. This will be your app icon,
// // //             logo, and splash image.
// // //           </p>

// // //           <div
// // //             style={{
// // //               display: "flex",
// // //               alignItems: "center",
// // //               gap: "1rem",
// // //               padding: "1rem",
// // //               background: "var(--bg2)",
// // //               border: `1.5px dashed ${iconError ? "#EF4444" : "var(--border)"}`,
// // //               borderRadius: 12,
// // //             }}
// // //           >
// // //             {/* Preview or placeholder */}
// // //             <div
// // //               style={{
// // //                 width: 64,
// // //                 height: 64,
// // //                 borderRadius: 14,
// // //                 background: appIconPreview
// // //                   ? `url(${appIconPreview}) center/cover`
// // //                   : "var(--bg3)",
// // //                 border: "1px solid var(--border)",
// // //                 display: "flex",
// // //                 alignItems: "center",
// // //                 justifyContent: "center",
// // //                 flexShrink: 0,
// // //                 overflow: "hidden",
// // //               }}
// // //             >
// // //               {!appIconPreview && (
// // //                 <span style={{ fontSize: "1.5rem", opacity: 0.3 }}>🖼️</span>
// // //               )}
// // //             </div>

// // //             <div style={{ flex: 1 }}>
// // //               <label
// // //                 style={{
// // //                   display: "inline-block",
// // //                   padding: "0.5rem 1rem",
// // //                   background: "rgba(201,138,84,0.1)",
// // //                   border: "1px solid rgba(201,138,84,0.25)",
// // //                   borderRadius: 8,
// // //                   color: "var(--accent-lt)",
// // //                   fontSize: "0.82rem",
// // //                   fontWeight: 600,
// // //                   cursor: "pointer",
// // //                   fontFamily: "inherit",
// // //                 }}
// // //               >
// // //                 {appIcon ? "Change Image" : "Choose Image"}
// // //                 <input
// // //                   type="file"
// // //                   accept="image/png"
// // //                   onChange={handleIconChange}
// // //                   style={{ display: "none" }}
// // //                 />
// // //               </label>
// // //               {appIcon && (
// // //                 <span
// // //                   style={{
// // //                     fontSize: "0.78rem",
// // //                     color: "var(--dim)",
// // //                     marginLeft: "0.75rem",
// // //                   }}
// // //                 >
// // //                   {appIcon.name}
// // //                 </span>
// // //               )}
// // //             </div>
// // //           </div>

// // //           {iconError && (
// // //             <p style={{ fontSize: "0.78rem", color: "#EF4444", marginTop: 6 }}>
// // //               {iconError}
// // //             </p>
// // //           )}
// // //           <p style={{ fontSize: "0.72rem", color: "var(--dim)", marginTop: 6 }}>
// // //             Requirements: PNG format • 1024×1024px • Transparent background •
// // //             Under 1MB
// // //           </p>
// // //         </div>
// // //       )}

// // //       {/* ── Form error ─────────────────────────── */}
// // //       {errors.form && (
// // //         <p
// // //           style={{
// // //             fontSize: "0.85rem",
// // //             color: "#EF4444",
// // //             marginBottom: "1rem",
// // //             textAlign: "center",
// // //           }}
// // //         >
// // //           {errors.form}
// // //         </p>
// // //       )}

// // //       {/* ── Submit ─────────────────────────────── */}
// // //       <button
// // //         type="submit"
// // //         disabled={isSubmitting}
// // //         style={{
// // //           width: "100%",
// // //           padding: "1rem",
// // //           background: isSubmitting
// // //             ? "var(--bg3)"
// // //             : "linear-gradient(135deg, var(--accent), var(--edges-500))",
// // //           border: "none",
// // //           borderRadius: 14,
// // //           color: isSubmitting ? "var(--dim)" : "var(--edges-50)",
// // //           fontSize: "1rem",
// // //           fontWeight: 700,
// // //           fontFamily: "'Instrument Sans', system-ui, sans-serif",
// // //           cursor: isSubmitting ? "not-allowed" : "pointer",
// // //           display: "flex",
// // //           alignItems: "center",
// // //           justifyContent: "center",
// // //           gap: 8,
// // //           transition: "all 0.2s",
// // //           letterSpacing: "0.01em",
// // //         }}
// // //       >
// // //         {isSubmitting ? (
// // //           <>
// // //             <Loader2
// // //               size={18}
// // //               style={{ animation: "spin 1s linear infinite" }}
// // //             />
// // //             Creating your store…
// // //           </>
// // //         ) : (
// // //           <>
// // //             Create My Store <ArrowRight size={18} />
// // //           </>
// // //         )}
// // //       </button>
// // //     </form>
// // //   );
// // // }

// // // /**
// // //  * Slightly darken/lighten a hex colour by `amount` (negative = darker).
// // //  * Used only for the gradient preview — no heavy library needed.
// // //  */
// // // function adjustHex(hex: string, amount: number): string {
// // //   const num = parseInt(hex.replace("#", ""), 16);
// // //   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
// // //   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
// // //   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
// // //   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// // // }
