// app/(store)/[storeName]/StoreContent.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import type { StorePlan } from "@/types";
import {
  createCustomerVirtualAccount,
  getCustomerVirtualAccounts,
  customerHasVirtualAccount,
} from "@/app/actions/reseller/wallet/customerVirtualAccount";
import { getResellerVirtualAccounts } from "@/app/actions/reseller/wallet/resellerCustomerWallet";

import { createResellerVirtualAccount } from "@/app/actions/reseller/wallet/resellerCustomerWallet";

import { logoutReseller, logoutCustomer } from "@/app/actions/reseller/logout";
import {
  Wifi,
  Zap,
  MessageCircle,
  Download,
  ShoppingCart,
  X,
  Mail,
  Lock,
  Loader2,
  LogIn,
  LogOut,
  ChevronRight,
  Signal,
} from "lucide-react";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"] as const;

/** Network brand colours for the tab pills */
const NETWORK_COLORS: Record<string, string> = {
  MTN: "#FFCC00",
  AIRTEL: "#EF2B2D",
  GLO: "#007B40",
  "9MOBILE": "#00A859",
};

/** Derive a slightly darkened version of a hex for gradients */
function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Returns a low-opacity tint of the brand colour for card backgrounds */
function tint(hex: string, opacity = 0.08): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Decide whether to put white or dark text on a given bg colour */
function contrastText(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#FFFFFF";
}

export function StoreContent({
  storeName,
  displayName,
  colors,
  featuredPlans,
  allPlans,
}: {
  storeName: string;
  displayName: string;
  colors: { primary: string; from: string; to: string; bg: string };
  featuredPlans: StorePlan[];
  allPlans: StorePlan[];
}) {
  const router = useRouter();
  const primary = colors.primary;
  const gradFrom = colors.from ?? primary;
  const gradTo = colors.to ?? darken(primary, 30);
  const onPrimary = contrastText(primary);

  const [activeTab, setActiveTab] = useState<(typeof NETWORKS)[number]>("MTN");
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [storeStatus, setStoreStatus] = useState<{
    canSell: boolean;
    hasVirtualAccount: boolean;
    hasBalance: boolean;
    balance: number;
    reason: string | null;
  } | null>(null);
  const [storeStatusLoading, setStoreStatusLoading] = useState(true);

  // Add these states:
  const [customerVirtualAccounts, setCustomerVirtualAccounts] = useState<any[]>(
    [],
  );
  const [showCustomerVirtualForm, setShowCustomerVirtualForm] = useState(false);
  const [customerVirtualForm, setCustomerVirtualFormState] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
  });
  const [customerVirtualLoading, setCustomerVirtualLoading] = useState(false);
  const [customerVirtualMessage, setCustomerVirtualMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Add this state to track if the logged-in user is the store owner:
  const [isStoreOwner, setIsStoreOwner] = useState(false);

  // useEffect(() => {
  //   const supabase = createClient();
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setLoggedIn(!!session);
  //   });
  //   const {
  //     data: { subscription },
  //   } = supabase.auth.onAuthStateChange((_event, session) =>
  //     setLoggedIn(!!session),
  //   );
  //   return () => subscription.unsubscribe();
  // }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      // Check if the logged-in user is the store owner
      if (session?.user) {
        const isOwner = session.user.user_metadata?.store_name === storeName;
        setIsStoreOwner(isOwner);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) {
        const isOwner = session.user.user_metadata?.store_name === storeName;
        setIsStoreOwner(isOwner);
      } else {
        setIsStoreOwner(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [storeName]);

  // Add this effect after the auth effect:
  useEffect(() => {
    async function fetchStoreStatus() {
      try {
        const response = await fetch(`/api/store-status?store=${storeName}`);
        if (response.ok) {
          const data = await response.json();
          setStoreStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch store status:", error);
      } finally {
        setStoreStatusLoading(false);
      }
    }
    fetchStoreStatus();
  }, [storeName]);

  // Helper to get reseller ID
  async function getResellerId(storeName: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeName)
      .eq("status", "active")
      .single();
    return data?.id || null;
  }

  // Fetch customer virtual accounts when logged in
  // useEffect(() => {
  //   if (loggedIn) {
  //     async function fetchCustomerAccounts() {
  //       const supabase = createClient();
  //       const {
  //         data: { user },
  //       } = await supabase.auth.getUser();
  //       if (!user) return;

  //       // Get reseller ID
  //       const resellerId = await getResellerId(storeName); // You'll need this helper
  //       if (!resellerId) return;

  //       const accounts = await getCustomerVirtualAccounts(user.id, resellerId);
  //       setCustomerVirtualAccounts(accounts || []);
  //     }
  //     fetchCustomerAccounts();
  //   }
  // }, [loggedIn, storeName]);

  // Update the fetch customer virtual accounts effect to handle both:
  useEffect(() => {
    if (loggedIn) {
      async function fetchAccounts() {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const resellerId = await getResellerId(storeName);
        if (!resellerId) return;

        // Check if user is the reseller
        const isOwner = user.user_metadata?.store_name === storeName;
        setIsStoreOwner(isOwner);

        if (isOwner) {
          // Fetch RESELLER virtual accounts
          const accounts = await getResellerVirtualAccounts(resellerId);
          setCustomerVirtualAccounts(accounts || []);
        } else {
          // Fetch CUSTOMER virtual accounts
          const accounts = await getCustomerVirtualAccounts(
            user.id,
            resellerId,
          );
          setCustomerVirtualAccounts(accounts || []);
        }
      }
      fetchAccounts();
    }
  }, [loggedIn, storeName]);

  // Handler for creating customer virtual account
  // const handleCreateCustomerVirtualAccount = async () => {
  //   if (
  //     !customerVirtualForm.fullName ||
  //     !customerVirtualForm.phoneNumber ||
  //     !customerVirtualForm.email
  //   ) {
  //     setCustomerVirtualMessage({
  //       type: "error",
  //       text: "All fields are required",
  //     });
  //     return;
  //   }

  //   setCustomerVirtualLoading(true);
  //   setCustomerVirtualMessage(null);

  //   const supabase = createClient();
  //   const {
  //     data: { user },
  //   } = await supabase.auth.getUser();
  //   if (!user) {
  //     setCustomerVirtualMessage({
  //       type: "error",
  //       text: "Please sign in first",
  //     });
  //     setCustomerVirtualLoading(false);
  //     return;
  //   }

  //   const resellerId = await getResellerId(storeName);
  //   if (!resellerId) {
  //     setCustomerVirtualMessage({ type: "error", text: "Store not found" });
  //     setCustomerVirtualLoading(false);
  //     return;
  //   }

  //   const result = await createCustomerVirtualAccount({
  //     ...customerVirtualForm,
  //     resellerId,
  //     customerId: user.id,
  //     storeSlug: storeName,
  //   });

  //   if (result.error) {
  //     setCustomerVirtualMessage({ type: "error", text: result.error });
  //   } else {
  //     setCustomerVirtualMessage({
  //       type: "success",
  //       text: result.message || "Virtual account created!",
  //     });
  //     setShowCustomerVirtualForm(false);
  //     // Refresh accounts
  //     const accounts = await getCustomerVirtualAccounts(user.id, resellerId);
  //     setCustomerVirtualAccounts(accounts || []);
  //   }
  //   setCustomerVirtualLoading(false);
  // };

  const handleCreateCustomerVirtualAccount = async () => {
    if (
      !customerVirtualForm.fullName ||
      !customerVirtualForm.phoneNumber ||
      !customerVirtualForm.email
    ) {
      setCustomerVirtualMessage({
        type: "error",
        text: "All fields are required",
      });
      return;
    }

    setCustomerVirtualLoading(true);
    setCustomerVirtualMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCustomerVirtualMessage({
        type: "error",
        text: "Please sign in first",
      });
      setCustomerVirtualLoading(false);
      return;
    }

    const resellerId = await getResellerId(storeName);
    if (!resellerId) {
      setCustomerVirtualMessage({ type: "error", text: "Store not found" });
      setCustomerVirtualLoading(false);
      return;
    }

    // If user is the reseller, use the reseller virtual account action
    if (isStoreOwner) {
      const result = await createResellerVirtualAccount({
        ...customerVirtualForm,
        resellerId,
      });

      if (result.error) {
        setCustomerVirtualMessage({ type: "error", text: result.error });
      } else {
        setCustomerVirtualMessage({
          type: "success",
          text: result.message || "Virtual account created!",
        });
        setShowCustomerVirtualForm(false);
        const accounts = await getResellerVirtualAccounts(resellerId);
        setCustomerVirtualAccounts(accounts || []);
      }
    } else {
      // Customer virtual account
      const result = await createCustomerVirtualAccount({
        ...customerVirtualForm,
        resellerId,
        customerId: user.id,
        storeSlug: storeName,
      });

      if (result.error) {
        setCustomerVirtualMessage({ type: "error", text: result.error });
      } else {
        setCustomerVirtualMessage({
          type: "success",
          text: result.message || "Virtual account created!",
        });
        setShowCustomerVirtualForm(false);
        const accounts = await getCustomerVirtualAccounts(user.id, resellerId);
        setCustomerVirtualAccounts(accounts || []);
      }
    }
    setCustomerVirtualLoading(false);
  };

  const displayPlans = useMemo(
    () => allPlans.filter((p) => p.network === activeTab),
    [allPlans, activeTab],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !user) {
      setLoginError("Invalid email or password.");
      setLoginLoading(false);
      return;
    }
    const isOwner = user.user_metadata?.store_name === storeName;
    if (isOwner) {
      router.push("/dashboard");
    } else {
      setLoginOpen(false);
      setEmail("");
      setPassword("");
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isReseller = user?.user_metadata?.store_name === storeName;
    if (isReseller) {
      await logoutReseller();
    } else {
      await logoutCustomer(storeName);
    }
    setLogoutLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      {/* ─── Login Modal ──────────────────────────────────── */}
      {loginOpen && (
        <div
          onClick={() => setLoginOpen(false)}
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
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "2.5rem 2rem",
              width: "100%",
              maxWidth: 400,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Top accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                borderRadius: "20px 20px 0 0",
                background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
              }}
            />
            <button
              onClick={() => setLoginOpen(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#F3F4F6",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
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
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "0.25rem",
              }}
            >
              Sign In
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                marginBottom: "1.5rem",
              }}
            >
              Store owners are redirected to their dashboard
            </p>
            <form onSubmit={handleLogin}>
              {(["Email", "Password"] as const).map((field) => (
                <div key={field} style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {field === "Email" ? (
                      <Mail size={13} style={{ color: primary }} />
                    ) : (
                      <Lock size={13} style={{ color: primary }} />
                    )}
                    {field}
                  </label>
                  <input
                    type={field === "Email" ? "email" : "password"}
                    value={field === "Email" ? email : password}
                    onChange={(e) =>
                      field === "Email"
                        ? setEmail(e.target.value)
                        : setPassword(e.target.value)
                    }
                    placeholder={
                      field === "Email" ? "you@example.com" : "••••••••"
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 10,
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#111827",
                    }}
                  />
                </div>
              ))}
              {loginError && (
                <p
                  style={{
                    color: "#EF4444",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  {loginError}
                </p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                  color: onPrimary,
                  border: "none",
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: loginLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loginLoading ? 0.75 : 1,
                }}
              >
                {loginLoading ? (
                  <>
                    <Loader2
                      size={17}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={17} /> Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Header ───────────────────────────────────────── */}
      <header
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
          color: onPrimary,
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 2px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0.9rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo area */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <Signal size={20} style={{ color: onPrimary }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h1>
              <p style={{ fontSize: "0.72rem", opacity: 0.8, marginTop: 1 }}>
                Data & Airtime Store
              </p>
            </div>
          </div>

          {/* Nav actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              style={navBtnStyle(onPrimary)}
              onClick={() => alert("WhatsApp support coming soon!")}
            >
              <MessageCircle size={15} />
              <span style={{ display: "none" }} className="sm-show">
                Support
              </span>
            </button>
            {loggedIn ? (
              <button
                style={{
                  ...navBtnStyle(onPrimary),
                  opacity: logoutLoading ? 0.7 : 1,
                }}
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <Loader2
                    size={15}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <LogOut size={15} />
                )}
                <span>Log out</span>
              </button>
            ) : (
              <button
                style={{
                  ...navBtnStyle(onPrimary),
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  fontWeight: 700,
                }}
                onClick={() => setLoginOpen(true)}
              >
                <LogIn size={15} /> <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Store Status Banner ──────────────────────────── */}
      {!storeStatusLoading && storeStatus && !storeStatus.canSell && (
        <div
          style={{
            background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
            borderBottom: "2px solid #F59E0B",
            padding: "0.85rem 1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <span
              style={{
                fontWeight: 600,
                color: "#92400E",
                fontSize: "0.9rem",
              }}
            >
              {storeStatus.reason}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#A16207",
              margin: "4px 0 0",
            }}
          >
            {!storeStatus.hasVirtualAccount
              ? "The store owner is still setting up their payment system."
              : "The store owner needs to fund their wallet to start accepting orders."}
          </p>
        </div>
      )}

      {/* ─── Hero strip ───────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(180deg, ${tint(primary, 0.12)}, transparent)`,
          borderBottom: `1px solid ${tint(primary, 0.15)}`,
          padding: "1.5rem 1.5rem 1rem",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 500 }}>
            👋 Welcome to
          </p>
          <h2
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.2,
              marginTop: 2,
            }}
          >
            {displayName}
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#6B7280", marginTop: 4 }}>
            Fast, affordable data & airtime — pick a network below to get
            started
          </p>
        </div>
      </div>

      {loggedIn && (
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 1.5rem 1.5rem",
          }}
        >
          {customerVirtualAccounts.length > 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E5E7EB",
                borderRadius: 14,
                padding: "1.5rem",
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  color: "#111827",
                  fontSize: "1rem",
                  marginBottom: "0.75rem",
                }}
              >
                💳 Your Funding Account
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#6B7280",
                  marginBottom: "1rem",
                }}
              >
                Transfer money to this account to fund your wallet instantly
              </p>
              {customerVirtualAccounts.map((account: any) => (
                <div
                  key={account.id}
                  style={{
                    background: "#F9FAFB",
                    borderRadius: 10,
                    padding: "1rem",
                    border: "1px solid #E5E7EB",
                    marginBottom: "0.5rem",
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
                    <p style={{ fontWeight: 600, color: "#111827" }}>
                      {account.bank_name}
                    </p>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "#9CA3AF",
                        background: "#F3F4F6",
                        padding: "2px 8px",
                        borderRadius: 100,
                      }}
                    >
                      Active
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: primary,
                      marginBottom: 2,
                    }}
                  >
                    {account.account_number}
                  </p>
                  <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                    {account.account_name}
                  </p>
                </div>
              ))}
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "#9CA3AF",
                  marginTop: "0.5rem",
                  textAlign: "center",
                }}
              >
                💡 Save this account number in your bank app for quick transfers
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E5E7EB",
                borderRadius: 14,
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              {!showCustomerVirtualForm ? (
                <>
                  <h3
                    style={{
                      fontWeight: 700,
                      color: "#111827",
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    💰 Fund Your Wallet
                  </h3>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "#6B7280",
                      marginBottom: "1rem",
                    }}
                  >
                    Create a virtual account to fund your wallet instantly via
                    bank transfer
                  </p>
                  <button
                    onClick={() => setShowCustomerVirtualForm(true)}
                    style={{
                      padding: "0.6rem 1.5rem",
                      background: primary,
                      border: "none",
                      borderRadius: 10,
                      color: contrastText(primary),
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Create Virtual Account
                  </button>
                </>
              ) : (
                <div
                  style={{ textAlign: "left", maxWidth: 400, margin: "0 auto" }}
                >
                  <h3
                    style={{
                      fontWeight: 700,
                      color: "#111827",
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    Create Virtual Account
                  </h3>

                  {customerVirtualMessage && (
                    <div
                      style={{
                        padding: "0.6rem 1rem",
                        borderRadius: 8,
                        marginBottom: "1rem",
                        background:
                          customerVirtualMessage.type === "success"
                            ? "rgba(110,189,138,0.1)"
                            : "rgba(239,68,68,0.1)",
                        color:
                          customerVirtualMessage.type === "success"
                            ? "#6EBD8A"
                            : "#F87171",
                        fontSize: "0.85rem",
                      }}
                    >
                      {customerVirtualMessage.text}
                    </div>
                  )}

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 4,
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerVirtualForm.fullName}
                      onChange={(e) =>
                        setCustomerVirtualFormState({
                          ...customerVirtualForm,
                          fullName: e.target.value,
                        })
                      }
                      placeholder="John Doe"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 4,
                      }}
                    >
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={customerVirtualForm.phoneNumber}
                      onChange={(e) =>
                        setCustomerVirtualFormState({
                          ...customerVirtualForm,
                          phoneNumber: e.target.value,
                        })
                      }
                      placeholder="08012345678"
                      maxLength={11}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 4,
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerVirtualForm.email}
                      onChange={(e) =>
                        setCustomerVirtualFormState({
                          ...customerVirtualForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="you@example.com"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={handleCreateCustomerVirtualAccount}
                      disabled={customerVirtualLoading}
                      style={{
                        flex: 1,
                        padding: "0.6rem",
                        background: primary,
                        border: "none",
                        borderRadius: 8,
                        color: contrastText(primary),
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        opacity: customerVirtualLoading ? 0.7 : 1,
                      }}
                    >
                      {customerVirtualLoading ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomerVirtualForm(false);
                        setCustomerVirtualMessage(null);
                      }}
                      style={{
                        padding: "0.6rem 1rem",
                        background: "#F3F4F6",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        color: "#6B7280",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
        {/* ─── Featured Plans ─────────────────────────────── */}
        {featuredPlans.length > 0 && activeTab === "MTN" && (
          <section style={{ marginBottom: "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.9rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: tint(primary, 0.15),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap size={14} style={{ color: primary }} />
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  Popular Plans
                </h3>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#9CA3AF",
                  fontWeight: 500,
                }}
              >
                MTN
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {featuredPlans.map((plan, i) => (
                <div
                  key={plan.id}
                  style={{
                    background:
                      i === 0
                        ? `linear-gradient(135deg, ${gradFrom}, ${gradTo})`
                        : "#FFFFFF",
                    border:
                      i === 0 ? "none" : `1.5px solid ${tint(primary, 0.2)}`,
                    borderRadius: 16,
                    padding: "1.4rem",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow:
                      i === 0
                        ? `0 8px 24px ${tint(primary, 0.35)}`
                        : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {i === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "rgba(255,255,255,0.25)",
                        color: onPrimary,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 100,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Best Deal
                    </span>
                  )}
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: i === 0 ? onPrimary : "#111827",
                      marginBottom: 2,
                    }}
                  >
                    {plan.plan_name}
                  </p>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color:
                        i === 0
                          ? `rgba(${hexToRgb(onPrimary)},0.7)`
                          : "#9CA3AF",
                      marginBottom: plan.validity ? 2 : 10,
                    }}
                  >
                    {plan.plan_type}
                  </p>
                  {plan.validity && (
                    <p
                      style={{
                        fontSize: "0.72rem",
                        color:
                          i === 0
                            ? `rgba(${hexToRgb(onPrimary)},0.8)`
                            : "#6B7280",
                        marginBottom: 10,
                      }}
                    >
                      Valid {plan.validity}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 800,
                      color: i === 0 ? onPrimary : primary,
                      marginBottom: 14,
                      lineHeight: 1,
                    }}
                  >
                    {formatNaira(plan.price)}
                  </p>
                  <button
                    style={{
                      width: "100%",
                      padding: "0.65rem",
                      background: i === 0 ? "rgba(255,255,255,0.25)" : primary,
                      border:
                        i === 0 ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                      borderRadius: 10,
                      color: i === 0 ? onPrimary : contrastText(primary),
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <ShoppingCart size={14} /> Buy Now
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Network Tabs ───────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          {NETWORKS.map((net) => {
            const isActive = activeTab === net;
            const netColor = NETWORK_COLORS[net] ?? primary;
            return (
              <button
                key={net}
                onClick={() => setActiveTab(net)}
                style={{
                  padding: "0.55rem 1.1rem",
                  borderRadius: 10,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                  transition: "all 0.15s",
                  background: isActive ? primary : "#FFFFFF",
                  color: isActive ? contrastText(primary) : "#374151",
                  border: isActive ? "none" : "1.5px solid #E5E7EB",
                  boxShadow: isActive
                    ? `0 4px 12px ${tint(primary, 0.4)}`
                    : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: netColor,
                    border: "1.5px solid rgba(0,0,0,0.15)",
                    flexShrink: 0,
                    boxShadow: isActive
                      ? `0 0 0 2px rgba(255,255,255,0.4)`
                      : "none",
                  }}
                />
                {net}
              </button>
            );
          })}
        </div>

        {/* ─── Plans List ─────────────────────────────────── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: tint(NETWORK_COLORS[activeTab] ?? primary, 0.18),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wifi
                size={14}
                style={{ color: NETWORK_COLORS[activeTab] ?? primary }}
              />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
              {activeTab} Plans
            </h3>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "#9CA3AF",
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
                padding: "2px 9px",
                borderRadius: 100,
                fontWeight: 500,
              }}
            >
              {displayPlans.length} available
            </span>
          </div>

          {displayPlans.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3.5rem 2rem",
                color: "#9CA3AF",
                background: "#FFFFFF",
                borderRadius: 16,
                border: "1.5px dashed #E5E7EB",
              }}
            >
              <Zap
                size={36}
                style={{ margin: "0 auto 0.75rem", opacity: 0.25 }}
              />
              <p style={{ fontWeight: 600, color: "#6B7280" }}>
                No {activeTab} plans right now
              </p>
              <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
                Check back soon
              </p>
            </div>
          ) : (
            // Replace with:
            <PlanGrid
              key={activeTab}
              plans={displayPlans}
              primary={primary}
              canSell={storeStatus?.canSell !== false}
              storeReason={storeStatus?.reason}
            />
          )}
        </section>

        {/* ─── App Banner ─────────────────────────────────── */}
        <div
          style={{
            marginTop: "2.5rem",
            background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
            borderRadius: 20,
            padding: "2rem 1.75rem",
            color: onPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: "absolute",
              right: -30,
              top: -30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 60,
              bottom: -40,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              pointerEvents: "none",
            }}
          />

          <div>
            <p
              style={{ fontWeight: 800, fontSize: "1.15rem", marginBottom: 4 }}
            >
              📱 Get the {displayName} App
            </p>
            <p style={{ opacity: 0.85, fontSize: "0.85rem" }}>
              Buy data and airtime faster from your phone
            </p>
          </div>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0.75rem 1.5rem",
              background: "rgba(255,255,255,0.22)",
              border: `1.5px solid rgba(255,255,255,0.4)`,
              borderRadius: 12,
              color: onPrimary,
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              fontFamily: "inherit",
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
              position: "relative",
              zIndex: 1,
            }}
            onClick={() => alert("Android app download coming soon!")}
          >
            <Download size={16} /> Download Android App
          </button>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer
        style={{
          marginTop: "3rem",
          borderTop: "1px solid #E5E7EB",
          padding: "1.75rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.8rem",
            color: "#9CA3AF",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
            }}
          />
          · {displayName} ·
        </div>
      </footer>
    </div>
  );
}

const PLANS_PER_PAGE = 15;

function PlanGrid({
  plans,
  primary,
  canSell = true,
  storeReason,
}: {
  plans: StorePlan[];
  primary: string;
  canSell?: boolean;
  storeReason?: string | null;
}) {
  const [page, setPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const totalPages = Math.ceil(plans.length / PLANS_PER_PAGE);
  const pagePlans = plans.slice(
    page * PLANS_PER_PAGE,
    (page + 1) * PLANS_PER_PAGE,
  );

  const goTo = (next: number, dir: "left" | "right") => {
    if (next === page || animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setPage(next);
      setAnimating(false);
    }, 220);
  };

  const slideStyle: React.CSSProperties = {
    display: "grid",
    // gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.65rem",
    transition: "opacity 0.22s ease, transform 0.22s ease",
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === "right" ? "-24px" : "24px"})`
      : "translateX(0)",
  };

  return (
    <div>
      {/* Grid */}
      <div style={slideStyle} className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {pagePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            primary={primary}
            canSell={canSell}
            storeReason={storeReason}
          />
        ))}
      </div>

      {/* Dot indicators — only show if more than one page */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "1.25rem",
          }}
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > page ? "right" : "left")}
              style={{
                width: i === page ? 24 : 8,
                height: 8,
                borderRadius: 100,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background: i === page ? primary : "#D1D5DB",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  primary,
  canSell = true,
  storeReason,
}: {
  plan: StorePlan;
  primary: string;
  canSell?: boolean;
  storeReason?: string | null;
}) {
  return (
    <div
      className="flex flex-col gap-3 md:gap-6"
      style={{
        background: "#FFFFFF",
        border: `1.5px solid #F3F4F6`,
        borderRadius: 14,
        padding: "1rem 0.6rem",
        transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = tint(
          primary,
          0.4,
        );
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 2px 12px ${tint(primary, 0.12)}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#F3F4F6";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Icon + name */}
      <div
        style={{
          display: "flex",
          placeItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div className="flex gap-2">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: tint(primary, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Wifi size={14} style={{ color: primary }} />
          </div>
          <div className="flex-col gap-1" style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                color: "#111827",
                fontSize: "0.82rem",
                lineHeight: 1.3,
                marginTop: 2,
              }}
            >
              {plan.plan_name}
            </p>
            {plan.validity && (
              <span
                style={{
                  fontSize: "0.62rem",
                  color: "#9CA3AF",
                  background: "#F9FAFB",
                  padding: "1px 6px",
                  borderRadius: 100,
                  border: "1px solid #E5E7EB",
                  fontWeight: 500,
                }}
              >
                {plan.validity}
              </span>
            )}
          </div>
        </div>
        <div>
          <p
            className="hidden md:block"
            style={{
              fontWeight: 800,
              color: primary,
              fontSize: "1.1rem",
              letterSpacing: "-0.02em",
              marginTop: 2,
            }}
          >
            {formatNaira(plan.price)}
          </p>
        </div>
      </div>

      {/* Price */}
      <p
        className=" md:hidden"
        style={{
          alignItems: "center",
          fontWeight: 800,
          color: primary,
          fontSize: "1.1rem",
          letterSpacing: "-0.02em",
          marginTop: 2,
        }}
      >
        {formatNaira(plan.price)}
      </p>

      {/* Buy button */}
      <button
        style={{
          width: "100%",
          padding: "0.55rem",
          background: canSell ? primary : "#D1D5DB",
          border: "none",
          borderRadius: 9,
          color: canSell ? contrastText(primary) : "#9CA3AF",
          fontWeight: 700,
          fontSize: "0.78rem",
          cursor: canSell ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          marginTop: "auto",
        }}
        disabled={!canSell}
        title={!canSell && storeReason ? storeReason : undefined}
      >
        {canSell ? "Buy" : "Unavailable"}
      </button>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.8rem",
  background: "#F9FAFB",
  border: "1.5px solid #E5E7EB",
  borderRadius: 8,
  color: "#111827",
  fontSize: "0.88rem",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function navBtnStyle(onPrimary: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0.4rem 0.85rem",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8,
    color: onPrimary,
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s",
  };
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`;
}
