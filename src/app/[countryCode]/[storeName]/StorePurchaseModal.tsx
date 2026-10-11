// src/app/[countryCode]/[storeName]/StorePurchaseModal.tsx
//
// Task 4, pointer 3.a.v.zi.x. Confirm-purchase modal (legacy
// ~1941-2470): shows the chosen plan, takes a phone number and the
// 4-digit transaction PIN, and (for a first-time customer) creates the
// PIN. Styling reuses the storefront's `--brand-color` tokens instead
// of the legacy inline palette, same as StoreAuthModal.

"use client";

import { useState } from "react";
import {
  X,
  Phone,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { formatStorePrice } from "@/lib/currency/formatStorePrice";
import type { CountryConfig } from "@/config/countries";
import type { StoreProduct } from "@/types/reseller/storefront";

interface StorePurchaseModalProps {
  open: boolean;
  onClose: () => void;
  plan: StoreProduct | null;
  config: CountryConfig;
  isCreatingPin: boolean;
  phone: string;
  setPhone: (value: string) => void;
  pin: string;
  setPin: (value: string) => void;
  loading: boolean;
  error: string;
  success: string;
  onSubmit: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function StorePurchaseModal({
  open,
  onClose,
  plan,
  config,
  isCreatingPin,
  phone,
  setPhone,
  pin,
  setPin,
  loading,
  error,
  success,
  onSubmit,
}: StorePurchaseModalProps) {
  const [showPin, setShowPin] = useState(false);
  const [showPinInfo, setShowPinInfo] = useState(false);

  if (!open || !plan) return null;

  const digitsOnly = (value: string, max: number) =>
    value.replace(/[^0-9]/g, "").slice(0, max);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card, var(--bg))",
          borderRadius: 20,
          padding: "2rem",
          width: "100%",
          maxWidth: 420,
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            borderRadius: "20px 20px 0 0",
            background: "var(--brand-color)",
          }}
        />
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--bg-muted, #F3F4F6)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            color: "var(--text-muted)",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={17} />
        </button>

        <h2
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.25rem",
          }}
        >
          Confirm Purchase
        </h2>

        <div
          style={{
            background: "var(--bg-muted, #F9FAFB)",
            borderRadius: 12,
            padding: "1rem",
            marginBottom: "1.25rem",
            marginTop: "1rem",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {plan.name}
            </span>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--brand-color)",
              }}
            >
              {formatStorePrice(plan.price, config)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                background: "var(--bg-muted, #F3F4F6)",
                padding: "2px 8px",
                borderRadius: 100,
              }}
            >
              {plan.category}
            </span>
            {plan.validity && (
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  background: "var(--bg-muted, #F3F4F6)",
                  padding: "2px 8px",
                  borderRadius: 100,
                }}
              >
                {plan.validity}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "0.4rem",
            }}
          >
            <Phone size={13} style={{ color: "var(--brand-color)" }} /> Phone
            Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={phone}
            onChange={(e) =>
              setPhone(digitsOnly(e.target.value, config.phoneNumber.maxDigits + 1))
            }
            placeholder="Phone number"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "0.4rem",
            }}
          >
            <Shield size={13} style={{ color: "var(--brand-color)" }} />{" "}
            {isCreatingPin ? "Create PIN" : "Transaction PIN"}
            {isCreatingPin && (
              <button
                type="button"
                onClick={() => setShowPinInfo(true)}
                aria-label="PIN information"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  color: "var(--brand-color)",
                }}
              >
                <Info size={14} />
              </button>
            )}
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(digitsOnly(e.target.value, 4))}
              placeholder={
                isCreatingPin ? "Choose a 4-digit PIN" : "Enter your 4-digit PIN"
              }
              maxLength={4}
              style={{ ...inputStyle, letterSpacing: "0.3em", paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                padding: 0,
              }}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {isCreatingPin && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              You'll use this PIN to authorise every purchase
            </p>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 10,
              marginBottom: "1rem",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", color: "#EF4444" }}>
              {error}
            </span>
          </div>
        )}
        {success && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 10,
              marginBottom: "1rem",
              background: "rgba(110,189,138,0.08)",
              border: "1px solid rgba(110,189,138,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={16} style={{ color: "#6EBD8A", flexShrink: 0 }} />
            <span style={{ fontSize: "0.85rem", color: "#6EBD8A" }}>
              {success}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !!success}
          style={{
            width: "100%",
            padding: "0.85rem",
            background: success ? "#6EBD8A" : "var(--brand-color)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontSize: "0.95rem",
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: loading || success ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />{" "}
              Processing…
            </>
          ) : success ? (
            <>
              <CheckCircle size={17} /> Purchased
            </>
          ) : (
            <>{isCreatingPin ? "Create PIN & Buy" : "Confirm Purchase"}</>
          )}
        </button>

        {showPinInfo && (
          <div
            onClick={() => setShowPinInfo(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-card, var(--bg))",
                borderRadius: 16,
                padding: "1.5rem",
                maxWidth: 320,
                width: "100%",
                position: "relative",
              }}
            >
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "0.5rem",
                }}
              >
                Transaction PIN
              </h3>
              <ul
                style={{
                  margin: "0 0 1rem 0",
                  paddingLeft: "1.2rem",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                <li>Keep your PIN safe and never share it</li>
                <li>You'll use this PIN for every purchase</li>
                <li>Choose a number you'll remember easily</li>
              </ul>
              <button
                type="button"
                onClick={() => setShowPinInfo(false)}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  background: "var(--brand-color)",
                  border: "none",
                  borderRadius: 10,
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
