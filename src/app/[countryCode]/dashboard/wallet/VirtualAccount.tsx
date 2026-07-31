// src/app/[countryCode]/dashboard/wallet/VirtualAccount.tsx
"use client";

import { useState } from "react";
import { Copy, Check, Building2, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VirtualAccountProps {
  virtualAccount: any;
  applicationId: string;
  countryCode: string;
  translations: any;
  onCreated: () => void;
}

export default function VirtualAccount({
  virtualAccount,
  applicationId,
  countryCode,
  translations,
  onCreated,
}: VirtualAccountProps) {
  const t = translations;
  const supabase = createClient();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createVirtualAccount = async () => {
    setIsCreating(true);
    try {
      // Call the Edge Function or RPC to create virtual account
      const { data, error } = await supabase.functions.invoke(
        "create-virtual-account",
        {
          body: {
            applicationId,
            countryCode,
          },
        },
      );

      if (error) throw error;

      onCreated();
    } catch (error) {
      console.error("Error creating virtual account:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!virtualAccount) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
          marginBottom: "1.5rem",
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
          <Banknote size={24} style={{ color: "var(--brand-color)" }} />
        </div>
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          {t?.virtualAccount || "Virtual Account"}
        </h3>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {t?.virtualAccountDescription ||
            "Create a virtual account to easily fund your wallet. Any transfer to this account will be automatically credited."}
        </p>
        <button
          onClick={createVirtualAccount}
          disabled={isCreating}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: isCreating ? "not-allowed" : "pointer",
            opacity: isCreating ? 0.6 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isCreating) {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {isCreating
            ? t?.creating || "Creating..."
            : t?.createVirtualAccount || "Create Virtual Account"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <Building2 size={20} style={{ color: "var(--brand-color)" }} />
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            fontWeight: 700,
            margin: 0,
          }}
        >
          {t?.virtualAccount || "Virtual Account"}
        </h3>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "#6EBD8A",
            background: "rgba(110,189,138,0.12)",
            padding: "2px 10px",
            borderRadius: 100,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t?.active || "Active"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.25rem",
            }}
          >
            {t?.accountName || "Account Name"}
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {virtualAccount.account_name || "—"}
          </p>
        </div>

        <div>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.25rem",
            }}
          >
            {t?.accountNumber || "Account Number"}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--text)",
                fontFamily: "monospace",
              }}
            >
              {virtualAccount.account_number || "—"}
            </p>
            {virtualAccount.account_number && (
              <button
                onClick={() => copyToClipboard(virtualAccount.account_number)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--brand-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>

        <div>
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.25rem",
            }}
          >
            {t?.bankName || "Bank Name"}
          </p>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {virtualAccount.bank_name || "—"}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--dim)",
          marginTop: "1rem",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.75rem",
        }}
      >
        💡{" "}
        {t?.virtualAccountHint ||
          "Transfer money to this account and it will be automatically credited to your wallet."}
      </p>
    </div>
  );
}
