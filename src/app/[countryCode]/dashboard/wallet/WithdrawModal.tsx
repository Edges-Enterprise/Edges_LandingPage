// src/app/[countryCode]/dashboard/wallet/WithdrawModal.tsx
"use client";

import { useState } from "react";
import { X, Wallet, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
  wallet: any;
  config: any;
  translations: any;
}

export default function WithdrawModal({
  onClose,
  onSuccess,
  wallet,
  config,
  translations,
}: WithdrawModalProps) {
  const t = translations;
  const supabase = createClient();
  const [amount, setAmount] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > wallet.balance) return;

    setIsLoading(true);
    try {
      // This would call your withdrawal API
      const response = await fetch("/api/reseller/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bankAccount,
          bankName,
          accountName,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Withdraw error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currencySymbol = config.currencySymbol || "₦";
  const maxAmount = wallet.balance || 0;

  // Quick amount buttons
  const quickAmounts = [
    Math.floor(maxAmount * 0.25),
    Math.floor(maxAmount * 0.5),
    Math.floor(maxAmount * 0.75),
    Math.floor(maxAmount),
  ].filter((amount) => amount > 0);

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
          {t?.withdraw || "Withdraw Funds"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.withdrawDescription ||
            "Withdraw your earnings to your bank account."}
        </p>

        {/* Balance Display */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t?.availableBalance || "Available Balance"}
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {currencySymbol} {maxAmount.toLocaleString()}
            </p>
          </div>
          <Wallet
            size={32}
            style={{ color: "var(--brand-color)", opacity: 0.5 }}
          />
        </div>

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
              max={maxAmount}
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

          {/* Quick Amounts */}
          {quickAmounts.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  style={{
                    padding: "0.25rem 0.75rem",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-color)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--muted)";
                  }}
                >
                  {currencySymbol} {amt.toLocaleString()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {t?.bankDetails || "Bank Details"}
          </p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={t?.bankNamePlaceholder || "Bank Name"}
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-color)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t?.accountNamePlaceholder || "Account Name"}
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-color)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder={t?.accountNumberPlaceholder || "Account Number"}
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-color)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > maxAmount ||
            !bankName ||
            !accountName ||
            !bankAccount ||
            isLoading
          }
          style={{
            width: "100%",
            padding: "0.75rem",
            background:
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > maxAmount ||
              isLoading
                ? "var(--bg2)"
                : "var(--brand-color)",
            color:
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > maxAmount ||
              isLoading
                ? "var(--dim)"
                : "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor:
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > maxAmount ||
              isLoading
                ? "not-allowed"
                : "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (
              amount &&
              parseFloat(amount) > 0 &&
              parseFloat(amount) <= maxAmount &&
              !isLoading
            ) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading
            ? t?.processing || "Processing..."
            : parseFloat(amount) > maxAmount
              ? t?.insufficientBalance || "Insufficient Balance"
              : t?.withdraw || "Withdraw"}
        </button>
      </div>
    </div>
  );
}
