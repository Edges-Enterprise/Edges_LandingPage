// src/app/[countryCode]/dashboard/wallet/WithdrawModal.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Wallet, Banknote, AlertCircle } from "lucide-react";

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
  wallet: any;
  config: any;
  translations: any;
}

interface Eligibility {
  allowed: boolean;
  reason: string | null;
  next_withdrawal_day: string | null;
  balance: number;
  withdrawable: number;
  float_owed: number;
}

const FEE_RATE = 0.02;

export default function WithdrawModal({
  onClose,
  onSuccess,
  wallet,
  config,
  translations,
}: WithdrawModalProps) {
  const t = translations;
  const [amount, setAmount] = useState<string>("");
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  const currencySymbol = config?.currencySymbol || "₦";

  const loadEligibility = useCallback(async () => {
    try {
      const response = await fetch("/api/reseller/wallet/withdraw", {
        method: "GET",
      });
      const data = await response.json();
      if (data?.success) {
        setEligibility({
          allowed: data.allowed,
          reason: data.reason ?? null,
          next_withdrawal_day: data.next_withdrawal_day ?? null,
          balance: Number(data.balance ?? 0),
          withdrawable: Number(data.withdrawable ?? 0),
          float_owed: Number(data.float_owed ?? 0),
        });
      } else {
        setError(data?.error || "Could not check withdrawal availability");
      }
    } catch {
      setError("Could not check withdrawal availability");
    }
  }, []);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const fee = Math.round(parsedAmount * FEE_RATE);
  const netAmount = parsedAmount - fee;
  const maxAmount = eligibility?.withdrawable ?? Number(wallet?.balance ?? 0);
  const dayBlocked = eligibility !== null && !eligibility.allowed;

  const handleSubmit = async () => {
    setError(null);

    if (dayBlocked) {
      setError(eligibility?.reason || "Withdrawals are not available today");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount");
      return;
    }

    if (parsedAmount > maxAmount) {
      setError("Amount exceeds your available balance");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reseller/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          bankCode,
          accountNumber,
          accountName,
        }),
      });

      const data = await response.json();

      // Previously this closed on any 2xx and swallowed every failure, so a
      // refused withdrawal looked like a success.
      if (!response.ok || data?.success === false) {
        setError(data?.error || "Withdrawal failed. Please try again.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Withdrawal failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [0.25, 0.5, 0.75, 1]
    .map((fraction) => Math.floor(maxAmount * fraction))
    .filter((value) => value > 0);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: "0.9rem",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: "0.35rem",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
          background: "var(--surface)",
          borderRadius: "1rem",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Banknote size={18} />
            {t?.withdraw || "Withdraw Funds"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "0.25rem",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Balance breakdown. Customer float is shown so the figure is never a
            surprise, but it does not reduce what can be withdrawn: the
            reseller owns the store and its customers. */}
        <div
          style={{
            background: "var(--background)",
            borderRadius: "0.5rem",
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "var(--text)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.35rem",
            }}
          >
            <span style={{ color: "var(--muted)" }}>
              {t?.availableBalance || "Available balance"}
            </span>
            <span style={{ fontWeight: 700 }}>
              {currencySymbol}
              {maxAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {eligibility && eligibility.float_owed > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.78rem",
              }}
            >
              <span style={{ color: "var(--muted)" }}>
                {t?.includesCustomerFunds || "Includes customer funds"}
              </span>
              <span style={{ color: "var(--muted)" }}>
                {currencySymbol}
                {eligibility.float_owed.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {dayBlocked && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid #f59e0b",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "var(--text)",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              {eligibility?.reason ||
                `Your next withdrawal day is ${eligibility?.next_withdrawal_day}`}
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              background: "rgba(239,68,68,0.12)",
              border: "1px solid #ef4444",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "var(--text)",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle} htmlFor="withdraw-amount">
            {t?.amount || "Amount"} ({currencySymbol})
          </label>
          <input
            id="withdraw-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={dayBlocked || isLoading}
            style={inputStyle}
          />
          {quickAmounts.length > 0 && !dayBlocked && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginTop: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  onClick={() => setAmount(String(value))}
                  disabled={isLoading}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "0.35rem",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--text)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {currencySymbol}
                  {value.toLocaleString()}
                </button>
              ))}
            </div>
          )}
          {parsedAmount > 0 && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.78rem",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              <div>
                {t?.fee || "Fee"} (2%): {currencySymbol}
                {fee.toLocaleString()}
              </div>
              <div>
                {t?.youReceive || "You receive"}: {currencySymbol}
                {netAmount.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle} htmlFor="withdraw-bank-code">
            {t?.bankCode || "Bank code"}
          </label>
          <input
            id="withdraw-bank-code"
            type="text"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            placeholder="e.g. 058"
            disabled={dayBlocked || isLoading}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle} htmlFor="withdraw-account-number">
            {t?.accountNumber || "Account number"}
          </label>
          <input
            id="withdraw-account-number"
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="0123456789"
            disabled={dayBlocked || isLoading}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={labelStyle} htmlFor="withdraw-account-name">
            {t?.accountName || "Account name"}
          </label>
          <input
            id="withdraw-account-name"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on the account"
            disabled={dayBlocked || isLoading}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || dayBlocked}
          style={{
            width: "100%",
            padding: "0.85rem",
            borderRadius: "0.5rem",
            border: "none",
            background: dayBlocked ? "var(--muted)" : "var(--primary, #2563eb)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: isLoading || dayBlocked ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Wallet size={16} />
          {isLoading
            ? t?.processing || "Processing..."
            : t?.withdraw || "Withdraw"}
        </button>
      </div>
    </div>
  );
}
