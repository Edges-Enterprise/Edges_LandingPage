// src/app/[countryCode]/[storeName]/StoreSupportModal.tsx
//
// Task 4, pointer 3.c.iv.zi.x. Support modal (legacy ~1717-1905): opens
// a WhatsApp conversation with the store owner via toWhatsAppLink, or a
// "support coming soon" state when the store has no phone. Owner gets a
// shortcut to dashboard settings to add one.

"use client";

import { MessageCircle, MessageCircleCheck, X } from "lucide-react";
import { toWhatsAppLink } from "@/lib/phone/toWhatsAppLink";
import type { CountryConfig } from "@/config/countries";

interface StoreSupportModalProps {
  open: boolean;
  onClose: () => void;
  resellerWhatsApp: string | null;
  isStoreOwner: boolean;
  config: CountryConfig;
  onGoToSettings: () => void;
}

export default function StoreSupportModal({
  open,
  onClose,
  resellerWhatsApp,
  isStoreOwner,
  config,
  onGoToSettings,
}: StoreSupportModalProps) {
  if (!open) return null;

  const openWhatsApp = () => {
    if (!resellerWhatsApp) return;
    const link = toWhatsAppLink(resellerWhatsApp, config);
    if (link) window.open(link, "_blank");
  };

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
          maxWidth: 400,
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          textAlign: "center",
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
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--bg-muted, #F3F4F6)",
            border: "none",
            cursor: "pointer",
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

        {resellerWhatsApp ? (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--brand-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <MessageCircleCheck size={32} color="#FFFFFF" />
            </div>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.5rem",
              }}
            >
              Chat with Support
            </h2>
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              Click the button below to start a WhatsApp conversation with the
              store owner.
            </p>
            <button
              onClick={openWhatsApp}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: "var(--brand-color)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 12,
                fontSize: "0.95rem",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <MessageCircle size={18} />
              Open WhatsApp
            </button>
            <p
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginTop: "1rem",
              }}
            >
              You'll be redirected to WhatsApp. Message the store owner
              directly.
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--bg-muted, #F3F4F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <MessageCircle size={32} color="#9CA3AF" />
            </div>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.5rem",
              }}
            >
              Support Coming Soon
            </h2>
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              The store owner hasn't set up WhatsApp support yet. Please check
              back later.
            </p>
            {isStoreOwner && (
              <button
                onClick={onGoToSettings}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background: "var(--bg-muted, #F3F4F6)",
                  color: "var(--text)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Add WhatsApp Number in Settings
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
