// src/app/[countryCode]/[storeName]/StoreFundWalletModal.tsx
//
// Task 4, pointer 3.c.ii.zi.x. Customer fund-wallet flow, mirroring the
// legacy storefront's two modals (legacy ~1395-1712): a list of the
// customer's virtual accounts to transfer into, and a one-click
// "create virtual account" form.
//
// Gateway branch (finding #5): xixapay countries fund by transferring into
// a persistent virtual account; korapay/flutterwave countries fund by
// mobile money, mirroring the reseller dashboard's FundWalletModal. The
// customer-side mobile-money initiate action (fundGlobalCustomerWallet,
// 1.c.iv) already existed but was never wired to a UI; this modal is that
// UI. Task 8, pointer 8.f.i.

"use client";

import { useEffect, useState } from "react";
import { Copy, Wallet, X, CheckCircle, AlertCircle } from "lucide-react";
import { formatStorePrice } from "@/lib/currency/formatStorePrice";
import type { CountryConfig } from "@/config/countries";
import type { GlobalCustomerVirtualAccount } from "@/actions/reseller/customers/getGlobalCustomerWallet";

export interface StoreFundMessage {
  type: "success" | "error";
  text: string;
}

interface StoreFundWalletModalProps {
  open: boolean;
  mode: "accounts" | "create";
  onClose: () => void;
  config: CountryConfig;
  countryCode: string;
  balance: number;
  virtualAccounts: GlobalCustomerVirtualAccount[];
  loading: boolean;
  message: StoreFundMessage | null;
  copiedAccount: string | null;
  onCopy: (text: string, key: string) => void;
  onCreateVirtualAccount: () => void;
  onFundMobileMoney: (params: {
    amount: number;
    mobileNumber: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const MOBILE_PLACEHOLDERS: Record<string, string> = {
  gh: "e.g. 233241234567",
  ke: "e.g. 254712345678",
  cm: "e.g. 237671234567",
  rw: "e.g. 250788123456",
  ug: "e.g. 256771234567",
};

const MOBILE_HINTS: Record<string, string> = {
  gh: "Enter your MTN, AirtelTigo, or Vodafone mobile money number with country code (233)",
  ke: "Enter your M-Pesa, Airtel, or Equitel number with country code (254)",
  cm: "Enter your MTN or Orange mobile money number with country code (237)",
  rw: "Enter your MTN or Airtel mobile money number with country code (250)",
  ug: "Enter your MTN or Airtel mobile money number with country code (256)",
};

export default function StoreFundWalletModal({
  open,
  mode,
  onClose,
  config,
  countryCode,
  balance,
  virtualAccounts,
  loading,
  message,
  copiedAccount,
  onCopy,
  onCreateVirtualAccount,
  onFundMobileMoney,
}: StoreFundWalletModalProps) {
  const isXixapay = config.paymentGateway?.provider === "xixapay";
  const isFlutterwave = config.paymentGateway?.provider === "flutterwave";

  const [amount, setAmount] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [useDirectApi, setUseDirectApi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fundError, setFundError] = useState("");

  // Korapay direct-API mode collects the mobile number inline; checkout
  // redirect mode collects it on Korapay's page instead. Mirrors the
  // dashboard FundWalletModal's /api/config/korapay probe.
  useEffect(() => {
    if (!open || isXixapay || isFlutterwave) return;
    let cancelled = false;
    fetch("/api/config/korapay")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setUseDirectApi(Boolean(d.useDirectApi));
      })
      .catch(() => {
        if (!cancelled) setUseDirectApi(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isXixapay, isFlutterwave]);

  if (!open) return null;

  const needsMobileInput = isFlutterwave || useDirectApi;
  const currencySymbol = config.currencySymbol || "₦";

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setFundError("Please enter a valid amount");
      return;
    }
    if (needsMobileInput && mobileNumber.replace(/\D/g, "").length < 10) {
      setFundError("Please enter a valid mobile money number with country code");
      return;
    }

    setSubmitting(true);
    setFundError("");
    const result = await onFundMobileMoney({
      amount: parsed,
      mobileNumber,
    });
    if (!result.ok) {
      setFundError(result.error || "Payment initiation failed");
      setSubmitting(false);
      return;
    }
    // On success the caller redirects (or shows the STK notice) and closes.
  };

  const banner = message && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0.6rem 1rem",
        borderRadius: 8,
        marginBottom: "1rem",
        background:
          message.type === "success"
            ? "rgba(110,189,138,0.1)"
            : "rgba(239,68,68,0.1)",
        color: message.type === "success" ? "#6EBD8A" : "#EF4444",
        fontSize: "0.85rem",
      }}
    >
      {message.type === "success" ? (
        <CheckCircle size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {message.text}
    </div>
  );

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
          maxWidth: mode === "accounts" ? 480 : 420,
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
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--bg-muted, #F3F4F6)",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
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

        {mode === "accounts" ? (
          <>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Wallet size={20} style={{ color: "var(--brand-color)" }} />
              Fund Your Wallet
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                marginBottom: "1.5rem",
              }}
            >
              Transfer money to any of these accounts to fund your wallet
              instantly. Balance: {formatStorePrice(balance, config)}
            </p>

            {virtualAccounts.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                No funding accounts yet.
              </p>
            ) : (
              virtualAccounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    background: "var(--bg-muted, #F9FAFB)",
                    borderRadius: 12,
                    padding: "1rem",
                    marginBottom: "1rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text)",
                        fontSize: "0.9rem",
                      }}
                    >
                      {account.bank_name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#10B981",
                        background: "rgba(16,185,129,0.1)",
                        padding: "2px 8px",
                        borderRadius: 100,
                      }}
                    >
                      Active
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: "var(--brand-color)",
                        letterSpacing: "0.5px",
                        margin: 0,
                      }}
                    >
                      {account.account_number}
                    </p>
                    <button
                      onClick={() =>
                        onCopy(account.account_number, `${account.id}-number`)
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        padding: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.75rem",
                        fontFamily: "inherit",
                      }}
                    >
                      <Copy size={14} />
                      {copiedAccount === `${account.id}-number`
                        ? "Copied!"
                        : "Copy"}
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      margin: 0,
                    }}
                  >
                    {account.account_name}
                  </p>
                  <button
                    onClick={() =>
                      onCopy(account.account_name, `${account.id}-name`)
                    }
                    style={{
                      marginTop: 8,
                      background: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      color: "var(--muted)",
                      fontFamily: "inherit",
                    }}
                  >
                    {copiedAccount === `${account.id}-name`
                      ? "Copied!"
                      : "Copy Account Name"}
                  </button>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "0.5rem",
                textAlign: "center",
              }}
            >
              Add Money
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              {isXixapay
                ? "One-click setup to fund your wallet instantly"
                : isFlutterwave
                  ? "Fund your wallet using mobile money via Flutterwave"
                  : "Fund your wallet using mobile money. You will be redirected to complete your payment securely."}
            </p>

            {banner}

            {isXixapay ? (
              <button
                onClick={onCreateVirtualAccount}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background: "var(--brand-color)",
                  border: "none",
                  borderRadius: 10,
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Creating\u2026" : "Create Virtual Account \u2192"}
              </button>
            ) : (
              <>
                {needsMobileInput && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "var(--muted)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Mobile Money Number
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg-muted, #F9FAFB)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder={
                          MOBILE_PLACEHOLDERS[countryCode] || "e.g. 233241234567"
                        }
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "0.75rem 1rem",
                          background: "transparent",
                          border: "none",
                          color: "var(--text)",
                          fontSize: "1rem",
                          outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {MOBILE_HINTS[countryCode] ||
                        "Enter your mobile money number with country code"}
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Amount to Fund
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--bg-muted, #F9FAFB)",
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
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>

                {fundError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid #EF4444",
                      borderRadius: 8,
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#EF4444",
                      fontSize: "0.85rem",
                    }}
                  >
                    {fundError}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    (needsMobileInput &&
                      mobileNumber.replace(/\D/g, "").length < 10)
                  }
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    background: "var(--brand-color)",
                    border: "none",
                    borderRadius: 10,
                    color: "#FFFFFF",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Processing\u2026" : "Fund Wallet"}
                </button>

                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    marginTop: "0.85rem",
                  }}
                >
                  \ud83d\udcb3 You will be redirected to complete your payment securely.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
