// src/app/[countryCode]/[storeName]/StoreFundWalletModal.tsx
//
// Task 4, pointer 3.c.ii.zi.x. Customer fund-wallet flow, mirroring the
// legacy storefront's two modals (legacy ~1395-1712): a list of the
// customer's virtual accounts to transfer into, and a one-click
// "create virtual account" form.
//
// Gateway branch (finding #5): only xixapay implements
// createVirtualAccount today; korapay/flutterwave fund the *reseller*
// wallet via mobile money in the dashboard's FundWalletModal, but the
// customer-side equivalent is a separate leaf. So here `isXixapay`
// drives the virtual-account UI and a non-xixapay store shows a
// contact-support fallback rather than a dead form.

"use client";

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
  balance: number;
  virtualAccounts: GlobalCustomerVirtualAccount[];
  loading: boolean;
  message: StoreFundMessage | null;
  copiedAccount: string | null;
  onCopy: (text: string, key: string) => void;
  onCreateVirtualAccount: () => void;
}

export default function StoreFundWalletModal({
  open,
  mode,
  onClose,
  config,
  balance,
  virtualAccounts,
  loading,
  message,
  copiedAccount,
  onCopy,
  onCreateVirtualAccount,
}: StoreFundWalletModalProps) {
  if (!open) return null;

  const isXixapay = config.paymentGateway?.provider === "xixapay";

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
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              Transfer money to any of these accounts to fund your wallet
              instantly. Balance: {formatStorePrice(balance, config)}
            </p>

            {virtualAccounts.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
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
                        color: "var(--text-muted)",
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
                      color: "var(--text-muted)",
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
                      color: "var(--text-muted)",
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
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              {isXixapay
                ? "One-click setup to fund your wallet instantly"
                : "Mobile-money funding for this country is coming soon — contact the store owner to top up."}
            </p>

            {banner}

            {isXixapay && (
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
                {loading ? "Creating…" : "Create Virtual Account →"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
