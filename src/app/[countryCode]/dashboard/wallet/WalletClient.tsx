// src/app/[countryCode]/dashboard/wallet/WalletClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import WalletSummary from "./WalletSummary";
import TransactionHistory from "./TransactionHistory";
import FundWalletModal from "./FundWalletModal";
import WithdrawModal from "./WithdrawModal";
import VirtualAccount from "./VirtualAccount";
import { CountryConfig } from "@/config/countries";

interface WalletClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  walletData: any;
}

export default function WalletClient({
  countryCode,
  config,
  translations,
  walletData,
}: WalletClientProps) {
  const t = translations;
  const supabase = createClient();
  const [wallet, setWallet] = useState(walletData.wallet);
  const [transactions, setTransactions] = useState(walletData.transactions);
  const [virtualAccount, setVirtualAccount] = useState(walletData.virtualAccount);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const { data: freshWallet } = await supabase
        .from("global_wallets")
        .select("*")
        .eq("reseller_id", walletData.application.id)
        .single();

      if (freshWallet) {
        setWallet(freshWallet);
      }

      const { data: freshTransactions } = await supabase
        .from("global_transactions")
        .select("*")
        .eq("reseller_id", walletData.application.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (freshTransactions) {
        setTransactions(freshTransactions);
      }

      const { data: freshVirtualAccount } = await supabase
        .from("global_virtual_accounts")
        .select("*")
        .eq("reseller_id", walletData.application.id)
        .single();

      if (freshVirtualAccount) {
        setVirtualAccount(freshVirtualAccount);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("wallet-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_transactions",
          filter: `reseller_id=eq.${walletData.application.id}`,
        },
        () => {
          refreshData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "global_wallets",
          filter: `reseller_id=eq.${walletData.application.id}`,
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currencySymbol = config.currencySymbol || "₦";

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.title || "Wallet"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.manageYourFunds || "Manage your funds and transactions"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setShowFundModal(true)}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--brand-color)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {t?.fundWallet || "Fund Wallet"}
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={wallet.balance <= 0}
            style={{
              padding: "0.6rem 1.5rem",
              background: wallet.balance <= 0 ? "var(--bg2)" : "transparent",
              color: wallet.balance <= 0 ? "var(--dim)" : "var(--text)",
              border: wallet.balance <= 0 ? "1px solid var(--border)" : "1px solid var(--border2)",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: wallet.balance <= 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (wallet.balance > 0) {
                e.currentTarget.style.borderColor = "var(--brand-color)";
                e.currentTarget.style.background = "rgba(var(--brand-color-rgb), 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (wallet.balance > 0) {
                e.currentTarget.style.borderColor = "var(--border2)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {t?.withdraw || "Withdraw"}
          </button>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            style={{
              padding: "0.6rem 1rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted)",
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
            {isRefreshing ? "⟳" : "⟳"}
          </button>
        </div>
      </div>

      {/* Wallet Summary */}
      <WalletSummary
        wallet={wallet}
        currencySymbol={currencySymbol}
        translations={t}
      />

      {/* Virtual Account */}
      <VirtualAccount
        virtualAccount={virtualAccount}
        applicationId={walletData.application.id}
        countryCode={countryCode}
        translations={t}
        onCreated={refreshData}
      />

      {/* Transaction History */}
      <TransactionHistory
        transactions={transactions}
        currencySymbol={currencySymbol}
        translations={t}
      />

      {/* Modals */}
      {showFundModal && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onSuccess={refreshData}
          wallet={wallet}
          virtualAccount={virtualAccount}
          config={config}
          translations={t}
        />
      )}

      {showWithdrawModal && (
        <WithdrawModal
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={refreshData}
          wallet={wallet}
          config={config}
          translations={t}
        />
      )}
    </div>
  );
}