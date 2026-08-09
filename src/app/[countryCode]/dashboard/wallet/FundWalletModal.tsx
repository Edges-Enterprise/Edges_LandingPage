// src/app/[countryCode]/dashboard/wallet/FundWalletModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, CreditCard, Building2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FundWalletModalProps {
  onClose: () => void;
  onSuccess: () => void;
  wallet: any;
  virtualAccount: any;
  config: any;
  translations: any;
  countryCode: string;
}

export default function FundWalletModal({
  onClose,
  onSuccess,
  wallet,
  virtualAccount,
  config,
  translations,
  countryCode,
}: FundWalletModalProps) {
  const t = translations;
  const supabase = createClient();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("mobile_money");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [useDirectApi, setUseDirectApi] = useState<boolean>(false);

  const isKorapay = config.paymentGateway?.provider === "korapay";
  const isFlutterwave = config.paymentGateway?.provider === "flutterwave";
  const isXixapay = config.paymentGateway?.provider === "xixapay";

  // ✅ If Xixapay, this modal should not be shown
  if (isXixapay) {
    return null;
  }

  // ✅ Check if Direct API is available (Korapay only)
  useEffect(() => {
    if (isKorapay) {
      const checkDirectApi = async () => {
        try {
          const response = await fetch("/api/config/korapay");
          const data = await response.json();
          setUseDirectApi(data.useDirectApi || false);
        } catch {
          setUseDirectApi(false);
        }
      };
      checkDirectApi();
    }
  }, [isKorapay]);

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

  const getPhonePlaceholder = (countryCode: string): string => {
    const placeholders: Record<string, string> = {
      gh: "e.g. 233241234567",
      ke: "e.g. 254712345678",
      cm: "e.g. 237671234567",
      rw: "e.g. 250788123456",
      ug: "e.g. 256771234567",
    };
    return placeholders[countryCode] || "e.g. 233241234567";
  };

  const getPhoneHint = (countryCode: string): string => {
    const hints: Record<string, string> = {
      gh: "Enter your MTN, AirtelTigo, or Vodafone mobile money number with country code (233)",
      ke: "Enter your M-Pesa, Airtel, or Equitel number with country code (254)",
      cm: "Enter your MTN or Orange mobile money number with country code (237)",
      rw: "Enter your MTN or Airtel mobile money number with country code (250)",
      ug: "Enter your MTN or Airtel mobile money number with country code (256)",
    };
    return (
      hints[countryCode] || "Enter your mobile money number with country code"
    );
  };

  // ✅ Determine if we need mobile money input
  const needsMobileInput = (isKorapay && useDirectApi) || isFlutterwave;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // ✅ For Flutterwave and Korapay Direct API, we need mobile number
    if (needsMobileInput) {
      if (!mobileNumber || mobileNumber.length < 10) {
        setError("Please enter a valid mobile money number with country code");
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/reseller/${countryCode}/wallet/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          countryCode: countryCode,
          source: "web",
          // ✅ Include mobileMoney for Flutterwave and Korapay Direct API
          mobileMoney: needsMobileInput ? { number: mobileNumber } : undefined,
        }),
      });

      const data = await response.json();

      // ✅ FIX: Access redirectUrl from data.data (nested)
      if (data.success && data.data?.redirectUrl) {
        // ✅ For STK_PROMPT (Korapay Direct API)
        if (data.data?.authModel === "STK_PROMPT") {
          alert(
            "Please check your phone for the STK prompt to complete the payment.",
          );
          onSuccess();
          onClose();
        } else {
          // For Flutterwave and Korapay Checkout Redirect
          window.location.href = data.data.redirectUrl;
        }
        return;
      }

      if (data.success && data.data?.reference) {
        onSuccess();
        onClose();
        return;
      }

      if (!data.success) {
        setError(data.error || "Payment initiation failed");
      }
    } catch (error) {
      console.error("Fund wallet error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currencySymbol = config.currencySymbol || "₦";

  // ✅ Determine what to show to the user
  const isRedirectFlow = (isKorapay && !useDirectApi) || isFlutterwave;

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
          {isFlutterwave
            ? "Fund your wallet using mobile money via Flutterwave"
            : isRedirectFlow
              ? "You will be redirected to complete your payment via mobile money"
              : t?.fundWalletDescription ||
                "Add funds to your wallet to start selling."}
        </p>

        {/* ✅ Mobile Money Input - For Flutterwave and Korapay Direct API */}
        {needsMobileInput && (
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
              Mobile Money Number
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder={getPhonePlaceholder(countryCode)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-color)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                marginTop: "0.25rem",
              }}
            >
              {getPhoneHint(countryCode)}
            </p>
          </div>
        )}

        {/* ✅ Redirect Info Message */}
        {isRedirectFlow && (
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
                fontSize: "0.85rem",
                color: "var(--text)",
                margin: 0,
              }}
            >
              💳 You will be redirected to complete your payment securely.
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--dim)",
                margin: "0.5rem 0 0 0",
              }}
            >
              {isFlutterwave
                ? "Supported: MTN, Airtel (Rwanda, Uganda)"
                : "Supported: Mobile Money"}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #EF4444",
              borderRadius: 8,
              padding: "0.75rem",
              marginBottom: "1rem",
              color: "#EF4444",
              fontSize: "0.85rem",
            }}
          >
            {error}
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
            {t?.amount || "Amount to Fund"}
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
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            isLoading ||
            (needsMobileInput && !mobileNumber)
          }
          style={{
            width: "100%",
            padding: "0.75rem",
            background:
              !amount ||
              parseFloat(amount) <= 0 ||
              isLoading ||
              (needsMobileInput && !mobileNumber)
                ? "var(--bg2)"
                : "var(--brand-color)",
            color:
              !amount ||
              parseFloat(amount) <= 0 ||
              isLoading ||
              (needsMobileInput && !mobileNumber)
                ? "var(--dim)"
                : "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor:
              !amount ||
              parseFloat(amount) <= 0 ||
              isLoading ||
              (needsMobileInput && !mobileNumber)
                ? "not-allowed"
                : "pointer",
            transition: "all 0.2s",
          }}
        >
          {isLoading
            ? t?.processing || "Processing..."
            : t?.fundWallet || "Fund Wallet"}
        </button>

        {isRedirectFlow && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--dim)",
              textAlign: "center",
              marginTop: "1rem",
            }}
          >
            You will be redirected to complete your payment securely.
          </p>
        )}
      </div>
    </div>
  );
}