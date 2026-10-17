// src/app/[countryCode]/dashboard/wallet/WalletClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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

  const applicationIdRef = useRef(walletData.application?.id);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [wallet, setWallet] = useState(walletData.wallet);
  const [transactions, setTransactions] = useState(walletData.transactions);
  const [virtualAccount, setVirtualAccount] = useState(
    walletData.virtualAccount,
  );
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isXixapay = config.paymentGateway?.provider === "xixapay";

  const fetchVirtualAccount = async () => {
    if (!applicationIdRef.current) return;

    const { data, error } = await supabase
      .from("global_virtual_accounts")
      .select("*")
      .eq("reseller_id", applicationIdRef.current)
      .maybeSingle();

    if (error) {
      console.error("❌ Error fetching virtual account:", error);
      return null;
    }

    return data;
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const resellerId = applicationIdRef.current;

      if (!resellerId) {
        console.error("❌ No reseller_id available");
        return;
      }

      const { data: freshWallet } = await supabase
        .from("global_wallets")
        .select("*")
        .eq("reseller_id", resellerId)
        .maybeSingle();

      if (freshWallet) {
        setWallet(freshWallet);
      }

      const { data: freshTransactions } = await supabase
        .from("global_transactions")
        .select("*")
        .eq("reseller_id", resellerId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (freshTransactions) {
        setTransactions(freshTransactions);
      }

      if (isXixapay) {
        const va = await fetchVirtualAccount();
        if (va) {
          setVirtualAccount(va);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ Fetch virtual account on initial load (client-side)
  useEffect(() => {
    if (isInitialLoad && isXixapay && applicationIdRef.current) {
      fetchVirtualAccount().then((va) => {
        if (va) {
          setVirtualAccount(va);
        }
        setIsInitialLoad(false);
      });
    }
  }, [isInitialLoad, isXixapay]);

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
          filter: `reseller_id=eq.${applicationIdRef.current}`,
        },
        () => {
          refreshData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_virtual_accounts",
          filter: `reseller_id=eq.${applicationIdRef.current}`,
        },
        () => {
          // ✅ When a new virtual account is inserted, fetch it immediately
          fetchVirtualAccount().then((va) => {
            if (va) {
              setVirtualAccount(va);
            }
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "global_wallets",
          filter: `reseller_id=eq.${applicationIdRef.current}`,
        },
        () => {
          refreshData();
        },
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
          {isXixapay ? (
            <button
              onClick={() => {
                const virtualAccountElement = document.querySelector(
                  '[data-virtual-account="true"]',
                );
                if (virtualAccountElement) {
                  virtualAccountElement.scrollIntoView({ behavior: "smooth" });
                }
              }}
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
          ) : (
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
          )}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={wallet.balance <= 0}
            style={{
              padding: "0.6rem 1.5rem",
              background: wallet.balance <= 0 ? "var(--bg2)" : "transparent",
              color: wallet.balance <= 0 ? "var(--dim)" : "var(--text)",
              border:
                wallet.balance <= 0
                  ? "1px solid var(--border)"
                  : "1px solid var(--border2)",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: wallet.balance <= 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (wallet.balance > 0) {
                e.currentTarget.style.borderColor = "var(--brand-color)";
                e.currentTarget.style.background =
                  "rgba(var(--brand-color-rgb), 0.05)";
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

      <WalletSummary
        wallet={wallet}
        currencySymbol={currencySymbol}
        translations={t}
      />

      {/* ✅ Virtual Account - Only for Xixapay (Nigeria) */}
      {isXixapay && (
        <div data-virtual-account="true">
          <VirtualAccount
            key={virtualAccount?.id || "no-account"}
            virtualAccount={virtualAccount}
            applicationId={applicationIdRef.current}
            countryCode={countryCode}
            translations={t}
            onCreated={refreshData}
          />
        </div>
      )}

      <TransactionHistory
        transactions={transactions}
        currencySymbol={currencySymbol}
        translations={t}
      />

      {showFundModal && !isXixapay && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onSuccess={refreshData}
          wallet={wallet}
          virtualAccount={virtualAccount}
          config={config}
          translations={t}
          countryCode={countryCode}
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

// // src/app/[countryCode]/dashboard/wallet/WalletClient.tsx
// "use client";

// import { useState, useEffect, useRef } from "react";
// import { createClient } from "@/lib/supabase/client";
// import WalletSummary from "./WalletSummary";
// import TransactionHistory from "./TransactionHistory";
// import FundWalletModal from "./FundWalletModal";
// import WithdrawModal from "./WithdrawModal";
// import VirtualAccount from "./VirtualAccount";
// import { CountryConfig } from "@/config/countries";

// interface WalletClientProps {
//   countryCode: string;
//   config: CountryConfig;
//   translations: any;
//   walletData: any;
// }

// export default function WalletClient({
//   countryCode,
//   config,
//   translations,
//   walletData,
// }: WalletClientProps) {
//    console.log("📦 WalletClient - walletData:", walletData);
//    console.log(
//      "📦 WalletClient - walletData.application:",
//      walletData.application,
//    );
//    console.log(
//      "📦 WalletClient - walletData.virtualAccount:",
//      walletData.virtualAccount,
//    );
//   const t = translations;
//   const supabase = createClient();

//  // ✅ Store applicationId in a ref to prevent it from changing
//   const applicationIdRef = useRef(walletData.application.id);

//   const [wallet, setWallet] = useState(walletData.wallet);
//   const [transactions, setTransactions] = useState(walletData.transactions);
//   const [virtualAccount, setVirtualAccount] = useState(
//     walletData.virtualAccount,
//   );
//   const [showFundModal, setShowFundModal] = useState(false);
//   const [showWithdrawModal, setShowWithdrawModal] = useState(false);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // ✅ Check if gateway is Xixapay (Nigeria)
//   const isXixapay = config.paymentGateway?.provider === "xixapay";
//   const isKorapay = config.paymentGateway?.provider === "korapay";
//   const isFlutterwave = config.paymentGateway?.provider === "flutterwave";

//   const refreshData = async () => {
//     setIsRefreshing(true);
//     try {
//       const resellerId = applicationIdRef.current;

//       console.log("🔄 Refreshing data for reseller_id:", resellerId);

//       const { data: freshWallet } = await supabase
//         .from("global_wallets")
//         .select("*")
//         .eq("reseller_id", resellerId)
//         .maybeSingle();

//       if (freshWallet) {
//         setWallet(freshWallet);
//       }

//       const { data: freshTransactions } = await supabase
//         .from("global_transactions")
//         .select("*")
//         .eq("reseller_id", resellerId)
//         .order("created_at", { ascending: false })
//         .limit(50);

//       if (freshTransactions) {
//         setTransactions(freshTransactions);
//       }

//       if (isXixapay) {
//         console.log("🔍 Fetching virtual account for reseller_id:", resellerId);

//         const { data: freshVirtualAccount, error } = await supabase
//           .from("global_virtual_accounts")
//           .select("*")
//           .eq("reseller_id", resellerId)
//           .maybeSingle();

//         if (error) {
//           console.error("❌ Error fetching virtual account:", error);
//         }

//         console.log("🔄 Refresh - freshVirtualAccount:", freshVirtualAccount);

//         if (freshVirtualAccount) {
//           setVirtualAccount(freshVirtualAccount);
//           console.log("✅ setVirtualAccount called with data");
//         } else {
//           console.log(
//             "⚠️ No virtual account found for reseller_id:",
//             resellerId,
//           );
//         }
//       }
//     } catch (error) {
//       console.error("Refresh error:", error);
//     } finally {
//       setIsRefreshing(false);
//     }
//   };

//   // Listen for real-time updates
//   useEffect(() => {
//     const channel = supabase
//       .channel("wallet-updates")
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "global_transactions",
//           filter: `reseller_id=eq.${walletData.application.id}`,
//         },
//         () => {
//           refreshData();
//         },
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "UPDATE",
//           schema: "public",
//           table: "global_wallets",
//           filter: `reseller_id=eq.${walletData.application.id}`,
//         },
//         () => {
//           refreshData();
//         },
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, []);

//   const currencySymbol = config.currencySymbol || "₦";

//   return (
//     <div>
//       {/* Page Header */}
//       <div
//         style={{
//           marginBottom: "1.5rem",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           flexWrap: "wrap",
//           gap: "1rem",
//         }}
//       >
//         <div>
//           <h1
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "1.5rem",
//               fontWeight: 700,
//               margin: 0,
//             }}
//           >
//             {t?.title || "Wallet"}
//           </h1>
//           <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
//             {t?.manageYourFunds || "Manage your funds and transactions"}
//           </p>
//         </div>
//         <div style={{ display: "flex", gap: "0.75rem" }}>
//           {/* ✅ For Xixapay, "Fund Wallet" opens VirtualAccount, not modal */}
//           {isXixapay ? (
//             <button
//               onClick={() => {
//                 // Scroll to VirtualAccount or trigger creation
//                 const virtualAccountElement = document.querySelector(
//                   '[data-virtual-account="true"]',
//                 );
//                 if (virtualAccountElement) {
//                   virtualAccountElement.scrollIntoView({ behavior: "smooth" });
//                 }
//               }}
//               style={{
//                 padding: "0.6rem 1.5rem",
//                 background: "var(--brand-color)",
//                 color: "#FDF8F3",
//                 border: "none",
//                 borderRadius: 8,
//                 fontWeight: 600,
//                 fontSize: "0.9rem",
//                 cursor: "pointer",
//                 transition: "all 0.2s",
//               }}
//               onMouseEnter={(e) => {
//                 e.currentTarget.style.opacity = "0.85";
//                 e.currentTarget.style.transform = "translateY(-1px)";
//               }}
//               onMouseLeave={(e) => {
//                 e.currentTarget.style.opacity = "1";
//                 e.currentTarget.style.transform = "translateY(0)";
//               }}
//             >
//               {t?.fundWallet || "Fund Wallet"}
//             </button>
//           ) : (
//             <button
//               onClick={() => setShowFundModal(true)}
//               style={{
//                 padding: "0.6rem 1.5rem",
//                 background: "var(--brand-color)",
//                 color: "#FDF8F3",
//                 border: "none",
//                 borderRadius: 8,
//                 fontWeight: 600,
//                 fontSize: "0.9rem",
//                 cursor: "pointer",
//                 transition: "all 0.2s",
//               }}
//               onMouseEnter={(e) => {
//                 e.currentTarget.style.opacity = "0.85";
//                 e.currentTarget.style.transform = "translateY(-1px)";
//               }}
//               onMouseLeave={(e) => {
//                 e.currentTarget.style.opacity = "1";
//                 e.currentTarget.style.transform = "translateY(0)";
//               }}
//             >
//               {t?.fundWallet || "Fund Wallet"}
//             </button>
//           )}
//           <button
//             onClick={() => setShowWithdrawModal(true)}
//             disabled={wallet.balance <= 0}
//             style={{
//               padding: "0.6rem 1.5rem",
//               background: wallet.balance <= 0 ? "var(--bg2)" : "transparent",
//               color: wallet.balance <= 0 ? "var(--dim)" : "var(--text)",
//               border:
//                 wallet.balance <= 0
//                   ? "1px solid var(--border)"
//                   : "1px solid var(--border2)",
//               borderRadius: 8,
//               fontWeight: 600,
//               fontSize: "0.9rem",
//               cursor: wallet.balance <= 0 ? "not-allowed" : "pointer",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               if (wallet.balance > 0) {
//                 e.currentTarget.style.borderColor = "var(--brand-color)";
//                 e.currentTarget.style.background =
//                   "rgba(var(--brand-color-rgb), 0.05)";
//               }
//             }}
//             onMouseLeave={(e) => {
//               if (wallet.balance > 0) {
//                 e.currentTarget.style.borderColor = "var(--border2)";
//                 e.currentTarget.style.background = "transparent";
//               }
//             }}
//           >
//             {t?.withdraw || "Withdraw"}
//           </button>
//           <button
//             onClick={refreshData}
//             disabled={isRefreshing}
//             style={{
//               padding: "0.6rem 1rem",
//               background: "transparent",
//               border: "1px solid var(--border)",
//               borderRadius: 8,
//               color: "var(--muted)",
//               cursor: "pointer",
//               transition: "all 0.2s",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.borderColor = "var(--brand-color)";
//               e.currentTarget.style.color = "var(--text)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.borderColor = "var(--border)";
//               e.currentTarget.style.color = "var(--muted)";
//             }}
//           >
//             {isRefreshing ? "⟳" : "⟳"}
//           </button>
//         </div>
//       </div>

//       {/* Wallet Summary */}
//       <WalletSummary
//         wallet={wallet}
//         currencySymbol={currencySymbol}
//         translations={t}
//       />

//       {/* ✅ Virtual Account - Only for Xixapay (Nigeria) */}
//       {isXixapay && (
//         <div data-virtual-account="true">
//           <VirtualAccount
//             key={virtualAccount?.id || "no-account"} // ✅ Force re-render when data changes
//             virtualAccount={virtualAccount}
//             applicationId={walletData.application.id}
//             countryCode={countryCode}
//             translations={t}
//             onCreated={refreshData}
//           />
//         </div>
//       )}

//       {/* Transaction History */}
//       <TransactionHistory
//         transactions={transactions}
//         currencySymbol={currencySymbol}
//         translations={t}
//       />

//       {/* ✅ Modals - Only show FundWalletModal for non-Xixapay users */}
//       {showFundModal && !isXixapay && (
//         <FundWalletModal
//           onClose={() => setShowFundModal(false)}
//           onSuccess={refreshData}
//           wallet={wallet}
//           virtualAccount={virtualAccount}
//           config={config}
//           translations={t}
//           countryCode={countryCode}
//         />
//       )}

//       {showWithdrawModal && (
//         <WithdrawModal
//           onClose={() => setShowWithdrawModal(false)}
//           onSuccess={refreshData}
//           wallet={wallet}
//           config={config}
//           translations={t}
//         />
//       )}
//     </div>
//   );
// }
