// src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx
"use client";

import { useState } from "react";
import { X, Copy, Check, CreditCard, Building2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FundWalletModalProps {
  onClose: () => void;
  onSuccess: () => void;
  wallet: any;
  virtualAccount: any;
  config: any;
  translations: any;
}

export default function FundWalletModal({
  onClose,
  onSuccess,
  wallet,
  virtualAccount,
  config,
  translations,
}: FundWalletModalProps) {
  const t = translations;
  const supabase = createClient();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("virtual_account");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsLoading(true);
    try {
      // This would call your payment provider API
      // For now, we'll simulate a successful deposit
      const response = await fetch("/api/reseller/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          method: method,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Fund wallet error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currencySymbol = config.currencySymbol || "₦";

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
            marginBottom: "0.5rem",
          }}
        >
          {t?.fundWallet || "Fund Wallet"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.fundWalletDescription ||
            "Add funds to your wallet to start selling."}
        </p>

        {/* Payment Methods */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {t?.paymentMethod || "Payment Method"}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {virtualAccount && (
              <button
                onClick={() => setMethod("virtual_account")}
                style={{
                  padding: "0.5rem 1rem",
                  background:
                    method === "virtual_account"
                      ? "var(--brand-color)"
                      : "var(--bg2)",
                  color:
                    method === "virtual_account" ? "#FDF8F3" : "var(--text)",
                  border:
                    method === "virtual_account"
                      ? "none"
                      : "1px solid var(--border)",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  transition: "all 0.2s",
                }}
              >
                <Building2 size={16} />
                {t?.virtualAccount || "Virtual Account"}
              </button>
            )}
            <button
              onClick={() => setMethod("card")}
              style={{
                padding: "0.5rem 1rem",
                background:
                  method === "card" ? "var(--brand-color)" : "var(--bg2)",
                color: method === "card" ? "#FDF8F3" : "var(--text)",
                border: method === "card" ? "none" : "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                transition: "all 0.2s",
              }}
            >
              <CreditCard size={16} />
              {t?.card || "Card"}
            </button>
            <button
              onClick={() => setMethod("mobile_money")}
              style={{
                padding: "0.5rem 1rem",
                background:
                  method === "mobile_money"
                    ? "var(--brand-color)"
                    : "var(--bg2)",
                color: method === "mobile_money" ? "#FDF8F3" : "var(--text)",
                border:
                  method === "mobile_money"
                    ? "none"
                    : "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                transition: "all 0.2s",
              }}
            >
              <Wallet size={16} />
              {t?.mobileMoney || "Mobile Money"}
            </button>
          </div>
        </div>

        {/* Virtual Account Details */}
        {method === "virtual_account" && virtualAccount && (
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--dim)",
                marginBottom: "0.5rem",
              }}
            >
              {t?.transferToThisAccount || "Transfer to this account:"}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--dim)",
                    textTransform: "uppercase",
                  }}
                >
                  {t?.accountName || "Account Name"}
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {virtualAccount.account_name}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--dim)",
                    textTransform: "uppercase",
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
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "monospace",
                    }}
                  >
                    {virtualAccount.account_number}
                  </p>
                  <button
                    onClick={() =>
                      copyToClipboard(virtualAccount.account_number)
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--dim)",
                    textTransform: "uppercase",
                  }}
                >
                  {t?.bankName || "Bank Name"}
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {virtualAccount.bank_name}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--dim)",
                    textTransform: "uppercase",
                  }}
                >
                  {t?.currency || "Currency"}
                </p>
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {virtualAccount.currency || "USD"}
                </p>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--dim)",
                marginTop: "0.75rem",
                borderTop: "1px solid var(--border)",
                paddingTop: "0.5rem",
              }}
            >
              💡{" "}
              {t?.virtualAccountHint ||
                "Funds will be credited automatically within 5-10 minutes."}
            </p>
          </div>
        )}

        {/* Amount Input */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {t?.amount || "Amount"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                padding: "0.75rem 1rem",
                color: "var(--muted)",
                fontWeight: 600,
                background: "var(--bg3)",
              }}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background:
              !amount || parseFloat(amount) <= 0 || isLoading
                ? "var(--bg2)"
                : "var(--brand-color)",
            color:
              !amount || parseFloat(amount) <= 0 || isLoading
                ? "var(--dim)"
                : "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor:
              !amount || parseFloat(amount) <= 0 || isLoading
                ? "not-allowed"
                : "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (amount && parseFloat(amount) > 0 && !isLoading) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading
            ? t?.processing || "Processing..."
            : t?.fundWallet || "Fund Wallet"}
        </button>
      </div>
    </div>
  );
}
