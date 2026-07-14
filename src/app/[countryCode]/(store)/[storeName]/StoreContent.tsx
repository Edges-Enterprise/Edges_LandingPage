// app/(store)/[storeName]/StoreContent.tsx

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import type { StorePlan } from "@/types";
import {
  createCustomerVirtualAccount,
  getCustomerVirtualAccounts,
  getCustomerWalletWithAccounts,
} from "@/app/actions/reseller/wallet/customerVirtualAccount";
import { registerCustomerToReseller } from "@/app/actions/reseller/registerCustomer";
import { getCustomerAuthEmail } from "@/app/actions/reseller/getCustomerAuthEmail";
import { getResellerVirtualAccounts } from "@/app/actions/reseller/wallet/resellerCustomerWallet";
import { createResellerVirtualAccount } from "@/app/actions/reseller/wallet/resellerCustomerWallet";
import { purchasePlan } from "@/app/actions/reseller/orders/purchasePlan";
import { logoutReseller, logoutCustomer } from "@/app/actions/reseller/logout";
import {
  Wifi,
  Zap,
  MessageCircle,
  MessageCircleCheck,
  Download,
  ShoppingCart,
  X,
  Mail,
  Lock,
  Loader2,
  LogIn,
  LogOut,
  Signal,
  Phone,
  Shield,
  CheckCircle,
  AlertCircle,
  Wallet,
  Plus,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"] as const;

const NETWORK_COLORS: Record<string, string> = {
  MTN: "#FFCC00",
  AIRTEL: "#EF2B2D",
  GLO: "#007B40",
  "9MOBILE": "#00A859",
};

function darken(hex: string, amt = 30): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function tint(hex: string, opacity = 0.08): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${opacity})`;
}

function contrastText(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#FFFFFF";
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff & 0xff},${n & 0xff}`;
}

export function StoreContent({
  storeName,
  displayName,
  colors,
  featuredPlans,
  allPlans,
  storeIcon,
  apkUrl,
}: {
  storeName: string;
  displayName: string;
  colors: { primary: string; from: string; to: string; bg: string };
  featuredPlans: StorePlan[];
  allPlans: StorePlan[];
  storeIcon?: { url: string; file_name: string; mime_type: string } | null;
  apkUrl?: string | null;
}) {
  const router = useRouter();
  const primary = colors.primary;
  const gradFrom = colors.from ?? primary;
  const gradTo = colors.to ?? darken(primary, 30);
  const onPrimary = contrastText(primary);

  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<(typeof NETWORKS)[number]>("MTN");
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [isStoreOwner, setIsStoreOwner] = useState(false);

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const [hasTransactionPin, setHasTransactionPin] = useState<boolean | null>(
    null,
  );
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [showPinInfo, setShowPinInfo] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showCreatePin, setShowCreatePin] = useState(false);

  // Store status
  const [storeStatus, setStoreStatus] = useState<{
    canSell: boolean;
    hasVirtualAccount: boolean;
    hasBalance: boolean;
    hasWhatsApp: boolean;
    balance: number;
    reason: string | null;
  } | null>(null);
  const [storeStatusLoading, setStoreStatusLoading] = useState(true);

  // Wallet and Virtual account states
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [virtualAccounts, setVirtualAccounts] = useState<any[]>([]);
  const [customerDataLoading, setCustomerDataLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showVirtualForm, setShowVirtualForm] = useState(false);
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [virtualMessage, setVirtualMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Purchase modal states
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StorePlan | null>(null);
  const [purchasePhone, setPurchasePhone] = useState("");
  const [purchasePin, setPurchasePin] = useState("");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  const [resellerWhatsApp, setResellerWhatsApp] = useState<string | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // ── Effects ───────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      if (session?.user) {
        setIsStoreOwner(session.user.user_metadata?.store_name === storeName);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) {
        setIsStoreOwner(session.user.user_metadata?.store_name === storeName);
      } else {
        setIsStoreOwner(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [storeName]);

  useEffect(() => {
    fetch(`/api/store-status?store=${storeName}`)
      .then((r) => r.json())
      .then((data) => {
        setStoreStatus(data);
        setStoreStatusLoading(false);
      })
      .catch(() => setStoreStatusLoading(false));
  }, [storeName]);

  // Fetch customer wallet and virtual accounts when logged in
  useEffect(() => {
    async function fetchCustomerData() {
      if (!loggedIn) {
        setCustomerDataLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCustomerDataLoading(false);
        return;
      }

      const { data: resellerData } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeName)
        .eq("status", "active")
        .single();

      if (!resellerData) {
        setCustomerDataLoading(false);
        return;
      }

      const isOwner = user.user_metadata?.store_name === storeName;
      setIsStoreOwner(isOwner);

      if (isOwner) {
        const { data: wallet } = await supabase
          .from("reseller_wallets")
          .select("balance")
          .eq("reseller_id", resellerData.id)
          .single();
        setWalletBalance(wallet?.balance || 0);
        const accounts = await getResellerVirtualAccounts(resellerData.id);
        setVirtualAccounts(accounts || []);
      } else {
        // ✅ FIX: First get the customer's UUID from reseller_customers
        const { data: customerRecord } = await supabase
          .from("reseller_customers")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("reseller_id", resellerData.id)
          .single();

        if (!customerRecord) {
          console.error("Customer record not found for user:", user.id);
          setCustomerDataLoading(false);
          return;
        }
        const { data: wallet } = await supabase
          .from("reseller_customer_wallets")
          .select("balance")
          .eq("reseller_id", resellerData.id)
          .eq("customer_id", customerRecord.id)
          .maybeSingle();
        setWalletBalance(wallet?.balance || 0);
        const accounts = await getCustomerVirtualAccounts(
          customerRecord.id,
          resellerData.id,
        );
        setVirtualAccounts(accounts || []);
      }
      setCustomerDataLoading(false);
    }

    fetchCustomerData();
  }, [loggedIn, storeName]);

  useEffect(() => {
    async function fetchCustomerProfile() {
      if (!loggedIn) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username, email")
          .eq("id", user.id)
          .single();

        const { data: resellerData } = await supabase
          .from("resellers")
          .select("id")
          .eq("store_name", storeName)
          .single();

        if (resellerData) {
          const { data: customer } = await supabase
            .from("reseller_customers")
            .select("full_name, email")
            .eq("reseller_id", resellerData.id)
            .eq("customer_id", user.id)
            .maybeSingle();

          if (customer?.full_name) {
            setCustomerName(customer.full_name);
            setCustomerEmail(customer.email || user.email || "");
          } else if (profile?.full_name) {
            setCustomerName(profile.full_name);
            setCustomerEmail(profile.email || user.email || "");
          } else if (profile?.username) {
            setCustomerName(profile.username);
            setCustomerEmail(user.email || "");
          } else {
            setCustomerName(user.email?.split("@")[0] || "Customer");
            setCustomerEmail(user.email || "");
          }
        }
      }
    }

    fetchCustomerProfile();
  }, [loggedIn, storeName]);

  useEffect(() => {
    async function fetchResellerWhatsApp() {
      const supabase = createClient();
      const { data: resellerData } = await supabase
        .from("resellers")
        .select("phone")
        .eq("store_name", storeName)
        .eq("status", "active")
        .single();
      if (resellerData?.phone) {
        setResellerWhatsApp(resellerData.phone);
      }
    }
    fetchResellerWhatsApp();
  }, [storeName]);

  // ── Handlers ──────────────────────────────────────

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const supabase = createClient();

    if (authMode === "signup") {
      if (password.length < 6) {
        setLoginError("Password must be at least 6 characters");
        setLoginLoading(false);
        return;
      }

      const [localPart, domain] = email.split("@");
      const suffix = Math.floor(Math.random() * 9) + 1;
      const separator = localPart.includes("+") ? "" : "+";
      const storeEmail = `${localPart}${separator}${storeName}${suffix}@${domain}`;
      const username = email.split("@")[0];

      const { data, error } = await supabase.auth.signUp({
        email: storeEmail,
        password,
        options: {
          data: {
            username: username,
            role: "customer",
            original_email: email, // ✅ STORE THE ORIGINAL EMAIL HERE
          },
        },
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      if (data.user) {
        await registerCustomerToReseller(
          storeName,
          data.user.id,
          email,
          storeEmail,
        );
        setLoginOpen(false);
        setEmail("");
        setPassword("");
      }
    } else {
      // LOGIN FLOW - Use the stored auth_email
      setLoginError("");

      // Try to get auth_email from server action (bypasses RLS)
      const authEmail = await getCustomerAuthEmail(email, storeName);

      let loginEmail = email; // Default to provided email

      if (authEmail) {
        // Customer found - use their stored auth email
        loginEmail = authEmail;
      }

      // Attempt login with the correct email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        setLoginError("Invalid email or password.");
        setLoginLoading(false);
        return;
      }

      if (data.user) {
        const isOwner = data.user.user_metadata?.store_name === storeName;
        if (isOwner) {
          router.push("/dashboard");
        } else {
          setLoginOpen(false);
          setEmail("");
          setPassword("");
        }
      }
      setLoginLoading(false);
    }
  };

  const switchAuthMode = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setLoginError("");
    setEmail("");
    setPassword("");
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${storeName}`;
  };

  const refreshWalletData = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: resellerData } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeName)
      .eq("status", "active")
      .single();

    if (!resellerData) return;

    const isOwner = user.user_metadata?.store_name === storeName;

    if (isOwner) {
      const { data: wallet } = await supabase
        .from("reseller_wallets")
        .select("balance")
        .eq("reseller_id", resellerData.id)
        .single();
      setWalletBalance(wallet?.balance || 0);
      const accounts = await getResellerVirtualAccounts(resellerData.id);
      setVirtualAccounts(accounts || []);
    } else {
      // ✅ FIX: Get customer UUID first
      const { data: customerRecord } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("reseller_id", resellerData.id)
        .single();

      if (customerRecord) {
        const { data: wallet } = await supabase
          .from("reseller_customer_wallets")
          .select("balance")
          .eq("reseller_id", resellerData.id)
          .eq("customer_id", customerRecord.id)
          .maybeSingle();
        setWalletBalance(wallet?.balance || 0);

        const accounts = await getCustomerVirtualAccounts(
          customerRecord.id,
          resellerData.id,
        );
        setVirtualAccounts(accounts || []);
      }
    }
  };

  const handleCreateVirtualAccount = async () => {
    setVirtualLoading(true);
    setVirtualMessage(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setVirtualMessage({ type: "error", text: "Please sign in first" });
      setVirtualLoading(false);
      return;
    }

    const { data: resellerData } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeName)
      .eq("status", "active")
      .single();

    if (!resellerData) {
      setVirtualMessage({ type: "error", text: "Store not found" });
      setVirtualLoading(false);
      return;
    }

    const result = await createCustomerVirtualAccount(
      resellerData.id,
      storeName,
    );

    if (result.error) {
      setVirtualMessage({ type: "error", text: result.error });
    } else {
      setVirtualMessage({
        type: "success",
        text: result.message || "Virtual account created successfully!",
      });
      await refreshWalletData();
      setTimeout(() => setShowVirtualForm(false), 2000);
    }
    setVirtualLoading(false);
  };

  const handlePlusClick = () => {
    if (!loggedIn) {
      setLoginOpen(true);
      return;
    }

    if (virtualAccounts.length > 0) {
      setShowFundingModal(true);
    } else {
      setShowVirtualForm(true);
    }
  };

  const copyToClipboard = async (text: string, accountId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAccount(accountId);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleSupportClick = () => {
    setSupportModalOpen(true);
  };

  const openWhatsApp = () => {
    if (resellerWhatsApp) {
      let phone = resellerWhatsApp.replace(/[\s\-()]/g, "");
      phone = phone.replace(/^\+/, "");
      if (phone.startsWith("0")) {
        phone = "234" + phone.slice(1);
      } else if (!phone.startsWith("234") && phone.length === 10) {
        phone = "234" + phone;
      }
      window.open(`https://wa.me/${phone}`, "_blank");
      setSupportModalOpen(false);
    }
  };

  const handleBuyClick = async (plan: StorePlan) => {
    if (!loggedIn) {
      setLoginOpen(true);
      return;
    }
    if (!storeStatus?.canSell) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: resellerData } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeName)
      .eq("status", "active")
      .single();

    if (!resellerData) return;

    let hasPin = false;

    if (isStoreOwner) {
      const { data: resellerRecord } = await supabase
        .from("resellers")
        .select("transaction_pin")
        .eq("auth_user_id", user.id)
        .single();
      hasPin = !!resellerRecord?.transaction_pin;
    } else {
      const { data: customerRecord } = await supabase
        .from("reseller_customers")
        .select("transaction_pin")
        .eq("auth_user_id", user.id)
        .eq("reseller_id", resellerData.id)
        .maybeSingle();
      hasPin = !!customerRecord?.transaction_pin;
    }

    setHasTransactionPin(hasPin);
    setIsCreatingPin(!hasPin);
    setSelectedPlan(plan);
    setPurchasePhone("");
    setPurchasePin("");
    setPurchaseError("");
    setPurchaseSuccess("");
    setPurchaseModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    if (!purchasePhone || purchasePhone.length < 11) {
      setPurchaseError("Please enter a valid 11-digit phone number");
      return;
    }
    if (!purchasePin || purchasePin.length < 4) {
      setPurchaseError(
        isCreatingPin ? "Please create a 4-digit PIN" : "Please enter your PIN",
      );
      return;
    }

    setPurchaseLoading(true);
    setPurchaseError("");
    setPurchaseSuccess("");

    if (isCreatingPin) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPurchaseError("Session expired. Please sign in again.");
        setPurchaseLoading(false);
        return;
      }

      const { data: resellerData } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeName)
        .eq("status", "active")
        .single();

      if (!resellerData) {
        setPurchaseError("Store not found.");
        setPurchaseLoading(false);
        return;
      }

      if (isStoreOwner) {
        const { error: pinError } = await supabase
          .from("resellers")
          .update({ transaction_pin: purchasePin })
          .eq("auth_user_id", user.id);
        if (pinError) {
          setPurchaseError("Failed to save PIN. Please try again.");
          setPurchaseLoading(false);
          return;
        }
      } else {
        const { error: pinError } = await supabase
          .from("reseller_customers")
          .update({ transaction_pin: purchasePin })
          .eq("auth_user_id", user.id)
          .eq("reseller_id", resellerData.id);
        if (pinError) {
          setPurchaseError("Failed to save PIN. Please try again.");
          setPurchaseLoading(false);
          return;
        }
      }
    }

    const result = await purchasePlan({
      storeName,
      planId: selectedPlan.plan_id,
      phoneNumber: purchasePhone,
      transactionPin: purchasePin,
    });

    if (result.error) {
      setPurchaseError(result.error);
    } else {
      setPurchaseSuccess(result.message || "Purchase successful!");
      setHasTransactionPin(true);
      setIsCreatingPin(false);
      await refreshWalletData();
      setTimeout(() => {
        setPurchaseModalOpen(false);
        setPurchasePhone("");
        setPurchasePin("");
        setPurchaseSuccess("");
      }, 2500);
    }
    setPurchaseLoading(false);
  };

  const displayPlans = useMemo(
    () => allPlans.filter((p) => p.network === activeTab),
    [allPlans, activeTab],
  );

  // ─── Return JSX ─────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      {/* ─── Login Modal ──────────────────────────────── */}
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
              maxWidth: 420,
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

            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: "1.5rem",
                background: "#F3F4F6",
                borderRadius: 10,
                padding: 3,
              }}
            >
              <button
                onClick={() => switchAuthMode("signin")}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "none",
                  background: authMode === "signin" ? "#FFFFFF" : "transparent",
                  color: authMode === "signin" ? "#111827" : "#6B7280",
                  fontWeight: authMode === "signin" ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow:
                    authMode === "signin"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  transition: "all 0.15s",
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => switchAuthMode("signup")}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: 8,
                  border: "none",
                  background: authMode === "signup" ? "#FFFFFF" : "transparent",
                  color: authMode === "signup" ? "#111827" : "#6B7280",
                  fontWeight: authMode === "signup" ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow:
                    authMode === "signup"
                      ? "0 1px 3px rgba(0,0,0,0.1)"
                      : "none",
                  transition: "all 0.15s",
                }}
              >
                Sign Up
              </button>
            </div>

            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "0.25rem",
              }}
            >
              {authMode === "signin" ? "Welcome Back" : "Create Account"}
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                marginBottom: "1.5rem",
              }}
            >
              {authMode === "signin"
                ? "Sign in to purchase data and airtime"
                : "Create an account to start purchasing"}
            </p>

            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: "1rem" }}>
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
                  <Mail size={13} style={{ color: primary }} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={modalInputStyle}
                />
              </div>

              <div
                style={{
                  marginBottom: authMode === "signup" ? "0.5rem" : "1rem",
                }}
              >
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
                  <Lock size={13} style={{ color: primary }} />
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={
                      authMode === "signup"
                        ? showSignupPassword
                          ? "text"
                          : "password"
                        : showPassword
                          ? "text"
                          : "password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ ...modalInputStyle, paddingRight: "2.5rem" }}
                  />
                  <button
                    onClick={() => {
                      if (authMode === "signup") {
                        setShowSignupPassword(!showSignupPassword);
                      } else {
                        setShowPassword(!showPassword);
                      }
                    }}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                    type="button"
                  >
                    {authMode === "signup" ? (
                      showSignupPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )
                    ) : showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {authMode === "signup" && (
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "#9CA3AF",
                      marginTop: 4,
                    }}
                  >
                    Minimum 6 characters
                  </p>
                )}
              </div>

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
                    {authMode === "signup"
                      ? "Creating account…"
                      : "Signing in…"}
                  </>
                ) : (
                  <>
                    <LogIn size={17} />{" "}
                    {authMode === "signup" ? "Create Account" : "Sign In"}
                  </>
                )}
              </button>

              {authMode === "signup" && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    background: "rgba(110,189,138,0.06)",
                    borderRadius: 10,
                    border: "1px solid rgba(110,189,138,0.15)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "#6EBD8A",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    ✅ Why create an account?
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.2rem",
                      fontSize: "0.75rem",
                      color: "#6B7280",
                    }}
                  >
                    <li>Fund your wallet via bank transfer</li>
                    <li>Track all your purchases</li>
                    <li>Get receipts via email</li>
                    <li>Access exclusive deals</li>
                  </ul>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ─── Funding Modal ─────────────────────────────── */}
      {showFundingModal && (
        <div
          onClick={() => setShowFundingModal(false)}
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
              padding: "2rem",
              width: "100%",
              maxWidth: 480,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
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
                background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
              }}
            />
            <button
              onClick={() => setShowFundingModal(false)}
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
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Wallet size={20} style={{ color: primary }} />
              Fund Your Wallet
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                marginBottom: "1.5rem",
              }}
            >
              Transfer money to any of these accounts to fund your wallet
              instantly
            </p>

            {virtualAccounts.map((account: any) => (
              <div
                key={account.id}
                style={{
                  background: "#F9FAFB",
                  borderRadius: 12,
                  padding: "1rem",
                  marginBottom: "1rem",
                  border: "1px solid #E5E7EB",
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
                      color: "#111827",
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
                      color: primary,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {account.account_number}
                  </p>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        account.account_number,
                        `${account.id}-number`,
                      )
                    }
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#6B7280",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.75rem",
                    }}
                  >
                    <Copy size={14} />
                    {copiedAccount === `${account.id}-number`
                      ? "Copied!"
                      : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                  {account.account_name}
                </p>
                <button
                  onClick={() =>
                    copyToClipboard(account.account_name, `${account.id}-name`)
                  }
                  style={{
                    marginTop: 8,
                    background: "transparent",
                    border: "1px solid #E5E7EB",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    color: "#6B7280",
                  }}
                >
                  {copiedAccount === `${account.id}-name`
                    ? "Copied!"
                    : "Copy Account Name"}
                </button>
              </div>
            ))}

            {/* <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#FEF3C7",
                borderRadius: 10,
                fontSize: "0.75rem",
                color: "#92400E",
              }}
            >
              <strong>💡 Tip:</strong> Use your registered name as the depositor
              name for faster confirmation.
            </div> */}
          </div>
        </div>
      )}

      {/* ─── Create Virtual Account Modal (One-Click) ─── */}
      {showVirtualForm && (
        <div
          onClick={() => setShowVirtualForm(false)}
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
              padding: "2rem",
              width: "100%",
              maxWidth: 420,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
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
                background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
              }}
            />
            <button
              onClick={() => setShowVirtualForm(false)}
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
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "0.5rem",
                textAlign: "center",
              }}
            >
              Create Virtual Account
            </h2>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#6B7280",
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              One-click setup to fund your wallet instantly
            </p>

            {virtualMessage && (
              <div
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 8,
                  marginBottom: "1rem",
                  background:
                    virtualMessage.type === "success"
                      ? "rgba(110,189,138,0.1)"
                      : "rgba(239,68,68,0.1)",
                  color:
                    virtualMessage.type === "success" ? "#6EBD8A" : "#F87171",
                  fontSize: "0.85rem",
                }}
              >
                {virtualMessage.text}
              </div>
            )}

            <button
              onClick={handleCreateVirtualAccount}
              disabled={virtualLoading}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: primary,
                border: "none",
                borderRadius: 10,
                color: contrastText(primary),
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: virtualLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: virtualLoading ? 0.7 : 1,
                marginBottom: "1rem",
              }}
            >
              {virtualLoading ? "Creating..." : "Create Virtual Account →"}
            </button>

            {/* <button
              onClick={() => setShowVirtualForm(false)}
              style={{
                width: "100%",
                padding: "0.7rem",
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
            </button> */}
          </div>
        </div>
      )}

      {/* ─── Support Modal ─────────────────────────────── */}
      {supportModalOpen && (
        <div
          onClick={() => setSupportModalOpen(false)}
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
              padding: "2rem",
              width: "100%",
              maxWidth: 400,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
              textAlign: "center",
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
                background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
              }}
            />

            <button
              onClick={() => setSupportModalOpen(false)}
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

            {resellerWhatsApp ? (
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem auto",
                  }}
                >
                  <MessageCircleCheck size={32} color="#FFFFFF" />
                </div>

                <h2
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "0.5rem",
                  }}
                >
                  Chat with Support
                </h2>

                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#6B7280",
                    marginBottom: "1.5rem",
                  }}
                >
                  Click the button below to start a WhatsApp conversation with
                  the store owner.
                </p>

                <button
                  onClick={openWhatsApp}
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                    color: onPrimary,
                    border: "none",
                    borderRadius: 12,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <MessageCircle size={18} />
                  Open WhatsApp
                </button>

                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "#9CA3AF",
                    marginTop: "1rem",
                  }}
                >
                  You'll be redirected to WhatsApp. Message the store owner
                  directly.
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#F3F4F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem auto",
                  }}
                >
                  <MessageCircle size={32} color="#9CA3AF" />
                </div>

                <h2
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "0.5rem",
                  }}
                >
                  Support Coming Soon
                </h2>

                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#6B7280",
                    marginBottom: "1.5rem",
                  }}
                >
                  The store owner hasn't set up WhatsApp support yet. Please
                  check back later.
                </p>

                {isStoreOwner && (
                  <button
                    onClick={() => {
                      setSupportModalOpen(false);
                      router.push("/dashboard/settings");
                    }}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: "#F3F4F6",
                      color: "#374151",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: 12,
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    Go to Settings
                  </button>
                )}

                <button
                  onClick={() => setSupportModalOpen(false)}
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    background: "transparent",
                    color: "#6B7280",
                    border: "none",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    marginTop: "0.75rem",
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Purchase Modal ───────────────────────────── */}
      {purchaseModalOpen && selectedPlan && (
        <div
          onClick={() => !purchaseLoading && setPurchaseModalOpen(false)}
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
              padding: "2rem",
              width: "100%",
              maxWidth: 420,
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
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
                background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
              }}
            />
            <button
              onClick={() => !purchaseLoading && setPurchaseModalOpen(false)}
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
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "0.25rem",
              }}
            >
              Confirm Purchase
            </h2>

            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 12,
                padding: "1rem",
                marginBottom: "1.25rem",
                marginTop: "1rem",
                border: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {selectedPlan.plan_name}
                </span>
                <span
                  style={{ fontSize: "1rem", fontWeight: 700, color: primary }}
                >
                  {formatNaira(selectedPlan.price)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#9CA3AF",
                    background: "#F3F4F6",
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  {selectedPlan.plan_type}
                </span>
                {selectedPlan.validity && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "#9CA3AF",
                      background: "#F3F4F6",
                      padding: "2px 8px",
                      borderRadius: 100,
                    }}
                  >
                    {selectedPlan.validity}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
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
                <Phone size={13} style={{ color: primary }} /> Phone Number
              </label>
              <input
                type="text"
                value={purchasePhone}
                onChange={(e) =>
                  setPurchasePhone(
                    e.target.value.replace(/[^0-9]/g, "").slice(0, 11),
                  )
                }
                placeholder="08012345678"
                maxLength={11}
                style={modalInputStyle}
              />
            </div>

            {isCreatingPin ? (
              <>
                {showPinInfo && (
                  <div
                    onClick={() => setShowPinInfo(false)}
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      zIndex: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem",
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 16,
                        padding: "1.5rem",
                        maxWidth: 320,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      <button
                        onClick={() => setShowPinInfo(false)}
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "#F3F4F6",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: 6,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <X size={14} />
                      </button>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: `rgba(${hexToRgb(primary)},0.1)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 1rem auto",
                        }}
                      >
                        <Shield size={24} style={{ color: primary }} />
                      </div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#111827",
                          marginBottom: "0.5rem",
                          textAlign: "center",
                        }}
                      >
                        Transaction PIN
                      </h3>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "#6B7280",
                          marginBottom: "1rem",
                          textAlign: "center",
                          lineHeight: 1.5,
                        }}
                      >
                        Your transaction PIN is a 4-digit code you'll use to
                        authorise every purchase.
                      </p>
                      <div
                        style={{
                          background: "#F9FAFB",
                          borderRadius: 12,
                          padding: "0.75rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "#374151",
                            marginBottom: "0.5rem",
                            fontWeight: 600,
                          }}
                        >
                          Important:
                        </p>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.2rem",
                            fontSize: "0.75rem",
                            color: "#6B7280",
                            lineHeight: 1.5,
                          }}
                        >
                          <li>Keep your PIN safe and never share it</li>
                          <li>You'll use this PIN for every purchase</li>
                          <li>PINs cannot be changed after creation</li>
                          <li>Choose a number you'll remember easily</li>
                        </ul>
                      </div>
                      <button
                        onClick={() => setShowPinInfo(false)}
                        style={{
                          width: "100%",
                          padding: "0.6rem",
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
                        Got it
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
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
                    <Shield size={13} style={{ color: primary }} /> Create PIN{" "}
                    <button
                      onClick={() => setShowPinInfo(true)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: primary,
                        opacity: 0.7,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.7";
                      }}
                      aria-label="PIN information"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="12" x2="12" y2="16" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCreatePin ? "text" : "password"}
                      inputMode="numeric"
                      value={purchasePin}
                      onChange={(e) =>
                        setPurchasePin(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                        )
                      }
                      placeholder="Choose a 4-digit PIN"
                      maxLength={4}
                      style={{
                        ...modalInputStyle,
                        letterSpacing: "0.3em",
                        paddingRight: "2.5rem",
                      }}
                    />
                    <button
                      onClick={() => setShowCreatePin(!showCreatePin)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#9CA3AF",
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                      }}
                      type="button"
                    >
                      {showCreatePin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "#9CA3AF",
                      marginTop: 4,
                    }}
                  >
                    You'll use this PIN to authorise every purchase
                  </p>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: "1rem" }}>
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
                  <Shield size={13} style={{ color: primary }} /> Transaction
                  PIN
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    value={purchasePin}
                    onChange={(e) =>
                      setPurchasePin(
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                      )
                    }
                    placeholder="Enter your 4-digit PIN"
                    maxLength={4}
                    style={{
                      ...modalInputStyle,
                      letterSpacing: "0.3em",
                      paddingRight: "2.5rem",
                    }}
                  />
                  <button
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                    type="button"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {purchaseError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  marginBottom: "1rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle
                  size={16}
                  style={{ color: "#EF4444", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.85rem", color: "#EF4444" }}>
                  {purchaseError}
                </span>
              </div>
            )}
            {purchaseSuccess && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  marginBottom: "1rem",
                  background: "rgba(110,189,138,0.08)",
                  border: "1px solid rgba(110,189,138,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle
                  size={16}
                  style={{ color: "#6EBD8A", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.85rem", color: "#6EBD8A" }}>
                  {purchaseSuccess}
                </span>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={purchaseLoading || !!purchaseSuccess}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: purchaseSuccess
                  ? "#6EBD8A"
                  : `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
                color: onPrimary,
                border: "none",
                borderRadius: 10,
                fontSize: "0.95rem",
                fontWeight: 700,
                fontFamily: "inherit",
                cursor:
                  purchaseLoading || purchaseSuccess
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: purchaseLoading ? 0.75 : 1,
              }}
            >
              {purchaseLoading ? (
                <>
                  <Loader2
                    size={17}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  {isCreatingPin ? "Setting PIN & processing…" : "Processing…"}
                </>
              ) : purchaseSuccess ? (
                <>✅ Purchase Complete</>
              ) : (
                <>
                  {isCreatingPin ? <Shield size={16} /> : null}
                  {isCreatingPin
                    ? `Set PIN & Pay ${formatNaira(selectedPlan.price)}`
                    : `Pay ${formatNaira(selectedPlan.price)}`}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Header ───────────────────────────────────── */}
      <style>{`
        @media (max-width: 480px) {
          .header-customer-name { display: none !important; }
          .header-contact-label { display: none !important; }
          .header-logout-label { display: none !important; }
          .header-store-subtitle { display: none !important; }
          .header-inner { padding: 0.7rem 1rem !important; }
        }
        @media (max-width: 360px) {
          .header-store-name { font-size: 0.95rem !important; }
          .header-icon { width: 34px !important; height: 34px !important; }
        }
      `}</style>
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
          className="header-inner"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0.9rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: "1 1 auto",
            }}
          >
            <div
              className="header-icon"
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.25)",
                overflow: "hidden",
              }}
            >
              {storeIcon?.url ? (
                <img
                  src={storeIcon.url}
                  alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Signal size={20} style={{ color: onPrimary }} />
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <h1
                className="header-store-name"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "clamp(100px, 28vw, 280px)",
                }}
              >
                {displayName}
              </h1>
              <p
                className="header-store-subtitle"
                style={{
                  fontSize: "0.72rem",
                  opacity: 0.8,
                  marginTop: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Data & Airtime Store
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexShrink: 0,
            }}
          >
            {loggedIn ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "0.3rem 0.65rem 0.3rem 0.35rem",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 40,
                    border: "1px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="header-customer-name"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      maxWidth: 90,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {customerName.split(" ")[0]}
                  </span>
                </div>

                <button
                  style={navBtnStyle(onPrimary)}
                  onClick={handleSupportClick}
                  aria-label="Contact support"
                >
                  <MessageCircleCheck size={15} />
                  <span className="header-contact-label">Contact</span>
                </button>

                <button
                  style={{
                    ...navBtnStyle(onPrimary),
                    opacity: logoutLoading ? 0.7 : 1,
                    padding: "0.4rem 0.6rem",
                  }}
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  aria-label="Log out"
                >
                  {logoutLoading ? (
                    <Loader2
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <LogOut size={15} />
                  )}
                  <span className="header-logout-label">Log out</span>
                </button>
              </>
            ) : (
              <button
                style={{
                  ...navBtnStyle(onPrimary),
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
                onClick={() => setLoginOpen(true)}
              >
                <LogIn size={15} />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Store Status Banner ──────────────────────── */}
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
              style={{ fontWeight: 600, color: "#92400E", fontSize: "0.9rem" }}
            >
              {storeStatus.reason}
            </span>
          </div>
          <p
            style={{ fontSize: "0.78rem", color: "#A16207", margin: "4px 0 0" }}
          >
            {!storeStatus.hasWhatsApp ? (
              <>
                The store owner needs to add their WhatsApp number in{" "}
                <a
                  href="/dashboard/settings"
                  style={{
                    color: "#A16207",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Dashboard Settings
                </a>{" "}
                to start accepting orders.
              </>
            ) : !storeStatus.hasVirtualAccount ? (
              "The store owner is still setting up their payment system."
            ) : (
              "The store owner needs to fund their wallet to start accepting orders."
            )}
          </p>
        </div>
      )}

      {/* ─── Wallet Balance Strip ──────────────────────── */}
      {loggedIn && !customerDataLoading && (
        <>
          <style>{`
            @media (max-width: 480px) {
              .wallet-strip { padding: 1rem 1rem 0.85rem !important; }
              .wallet-label { display: none !important; }
              .wallet-fund-label { display: none !important; }
              .wallet-balance { font-size: 1.2rem !important; }
            }
          `}</style>
          <div
            className="wallet-strip"
            style={{
              background: `linear-gradient(180deg, ${tint(primary, 0.12)}, transparent)`,
              padding: "1.5rem 2.5rem 1rem",
              borderBottom: `1px solid ${tint(primary, 0.15)}`,
            }}
          >
            <div
              style={{
                maxWidth: 1100,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  minWidth: 0,
                  flex: "1 1 auto",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    flexShrink: 0,
                  }}
                >
                  <Wallet
                    size={18}
                    style={{ color: "#111827", opacity: 0.8 }}
                  />
                  <span
                    className="wallet-label"
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: "#111827",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Wallet Balance:
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    className="wallet-balance"
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#111827",
                    }}
                  >
                    {showBalance ? formatNaira(walletBalance) : "••••••"}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    style={{
                      background: tint(primary, 0.87),
                      border: "none",
                      borderRadius: 6,
                      padding: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#eef3fd",
                      flexShrink: 0,
                    }}
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
                  >
                    {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={handlePlusClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: tint(primary, 0.87),
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "50%",
                    padding: "0.5rem",
                    cursor: "pointer",
                    color: "#eef3fd",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tint(primary, 0.72);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = tint(primary, 1.5);
                  }}
                  aria-label="Fund wallet"
                >
                  <Plus size={16} />
                </button>
                <span
                  className="wallet-fund-label"
                  style={{
                    fontWeight: 500,
                    fontSize: "0.95rem",
                    color: "#111827",
                    whiteSpace: "nowrap",
                  }}
                >
                  Fund Wallet
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Welcome Message (Not Logged In) ───────────── */}
      {!loggedIn && (
        <div
          style={{
            background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
            padding: "1.5rem 1.5rem",
            color: onPrimary,
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Welcome to {displayName}
              </h2>
              <p style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                Sign in/Sign up to buy data, fund your wallet, and track
                purchases
              </p>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
        {/* ─── Featured Plans ─────────────────────────── */}
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
                    onClick={() => handleBuyClick(plan)}
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
                      cursor:
                        storeStatus?.canSell !== false
                          ? "pointer"
                          : "not-allowed",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: storeStatus?.canSell === false ? 0.5 : 1,
                    }}
                    disabled={storeStatus?.canSell === false}
                  >
                    <ShoppingCart size={14} />{" "}
                    {storeStatus?.canSell !== false ? "Buy Now" : "Unavailable"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Network Tabs ───────────────────────────── */}
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
                    background: NETWORK_COLORS[net] ?? primary,
                    border: "1.5px solid rgba(0,0,0,0.15)",
                    flexShrink: 0,
                  }}
                />
                {net}
              </button>
            );
          })}
        </div>

        {/* ─── Plans List ─────────────────────────────── */}
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
            <PlanGrid
              key={activeTab}
              plans={displayPlans}
              primary={primary}
              canSell={storeStatus?.canSell !== false}
              storeReason={storeStatus?.reason}
              onBuyClick={handleBuyClick}
            />
          )}
        </section>

        {/* ─── App Banner ─────────────────────────────── */}
        {apkUrl && (
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
            <div>
              <p
                style={{
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  marginBottom: 4,
                }}
              >
                📱 Get the {displayName} App
              </p>
              <p style={{ opacity: 0.85, fontSize: "0.85rem" }}>
                Buy data and airtime faster from your phone
              </p>
            </div>
            <a
              href={apkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0.75rem 1.5rem",
                background: "rgba(255,255,255,0.22)",
                border: "1.5px solid rgba(255,255,255,0.4)",
                borderRadius: 12,
                color: onPrimary,
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                fontFamily: "inherit",
                backdropFilter: "blur(4px)",
                position: "relative",
                zIndex: 1,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.32)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.22)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Download size={16} /> Download Android App
            </a>
          </div>
        )}
      </main>

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

// ─── PlanGrid & PlanCard (Outside StoreContent) ─────────
const PLANS_PER_PAGE = 15;

function PlanGrid({
  plans,
  primary,
  canSell,
  storeReason,
  onBuyClick,
}: {
  plans: StorePlan[];
  primary: string;
  canSell?: boolean;
  storeReason?: string | null;
  onBuyClick: (plan: StorePlan) => void;
}) {
  const [page, setPage] = useState(0);
  const [showControls, setShowControls] = useState(false);
  let hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.ceil(plans.length / PLANS_PER_PAGE);
  const pagePlans = plans.slice(
    page * PLANS_PER_PAGE,
    (page + 1) * PLANS_PER_PAGE,
  );

  const resetHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowControls(true);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  const goToNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
      resetHideTimer();
    }
  };

  const goToPrev = () => {
    if (page > 0) {
      setPage(page - 1);
      resetHideTimer();
    }
  };

  const goToPage = (pageIndex: number) => {
    setPage(pageIndex);
    resetHideTimer();
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const gridStyles: React.CSSProperties = {
    display: "grid",
    gap: "0.5rem",
    gridTemplateColumns: "repeat(3, 1fr)",
  };

  useEffect(() => {
    const updateGridColumns = () => {
      const gridElement = document.querySelector(
        ".plan-grid-container",
      ) as HTMLElement;
      if (!gridElement) return;

      const width = window.innerWidth;
      if (width >= 1024) {
        gridElement.style.gridTemplateColumns = "repeat(4, 1fr)";
      } else if (width >= 768) {
        gridElement.style.gridTemplateColumns = "repeat(4, 1fr)";
      } else if (width >= 640) {
        gridElement.style.gridTemplateColumns = "repeat(3, 1fr)";
      } else {
        gridElement.style.gridTemplateColumns = "repeat(3, 1fr)";
      }
    };

    updateGridColumns();
    window.addEventListener("resize", updateGridColumns);
    return () => window.removeEventListener("resize", updateGridColumns);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setShowControls(false);
      }}
      style={{ position: "relative" }}
    >
      <div className="plan-grid-container" style={gridStyles}>
        {pagePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            primary={primary}
            canSell={canSell}
            storeReason={storeReason}
            onBuyClick={onBuyClick}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <>
          <button
            onClick={goToPrev}
            style={{
              display: showControls && page !== 0 ? "flex" : "none",
              position: "absolute",
              left: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid #E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F9FAFB";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            disabled={page === 0}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#6B7280" }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            style={{
              display:
                showControls && page !== totalPages - 1 ? "flex" : "none",
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid #E5E7EB",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F9FAFB";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFFFFF";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            disabled={page === totalPages - 1}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#6B7280" }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={goToPrev}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: page === 0 ? "#9CA3AF" : "#6B7280",
              cursor: page === 0 ? "not-allowed" : "pointer",
              transition: "transform 0.1s ease",
            }}
            disabled={page === 0}
            onTouchStart={(e) => {
              if (page !== 0) {
                e.currentTarget.style.transform = "scale(0.95)";
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Previous
          </button>

          <div
            style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}
          >
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let showDot = false;
              if (totalPages <= 7) {
                showDot = true;
              } else if (i === 0 || i === totalPages - 1) {
                showDot = true;
              } else if (Math.abs(i - page) <= 2) {
                showDot = true;
              } else if (i === page - 3 || i === page + 3) {
                showDot = true;
              }

              if (!showDot) return null;

              if (i === page - 3 && page > 3) {
                return (
                  <span
                    key={`ellipsis-left`}
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      color: "#9CA3AF",
                      fontSize: "0.75rem",
                    }}
                  >
                    ...
                  </span>
                );
              }
              if (i === page + 3 && page < totalPages - 4) {
                return (
                  <span
                    key={`ellipsis-right`}
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      color: "#9CA3AF",
                      fontSize: "0.75rem",
                    }}
                  >
                    ...
                  </span>
                );
              }

              const actualPageIndex = i;
              const isActive = page === actualPageIndex;

              return (
                <button
                  key={i}
                  onClick={() => goToPage(actualPageIndex)}
                  style={{
                    width: isActive ? 12 : 8,
                    height: 8,
                    borderRadius: "100%",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    backgroundColor: isActive ? primary : "#D1D5DB",
                    transition: "all 0.2s ease",
                  }}
                />
              );
            })}
          </div>

          <button
            onClick={goToNext}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: page === totalPages - 1 ? "#9CA3AF" : "#6B7280",
              cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
              transition: "transform 0.1s ease",
            }}
            disabled={page === totalPages - 1}
            onTouchStart={(e) => {
              if (page !== totalPages - 1) {
                e.currentTarget.style.transform = "scale(0.95)";
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Next
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
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
  onBuyClick,
}: {
  plan: StorePlan;
  primary: string;
  canSell?: boolean;
  storeReason?: string | null;
  onBuyClick: (plan: StorePlan) => void;
}) {
  const getShortValidity = (validity: string | null | undefined): string => {
    if (!validity) return "";

    const lowerValidity = validity.toLowerCase();

    const dayMatch = lowerValidity.match(/(\d+)\s*day/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1]);
      return days === 1 ? "1 day" : `${days} days`;
    }

    const weekMatch = lowerValidity.match(/(\d+)\s*week/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1]);
      return weeks === 1 ? "1 week" : `${weeks} weeks`;
    }

    const monthMatch = lowerValidity.match(/(\d+)\s*month/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]);
      return months === 1 ? "1 month" : `${months} months`;
    }

    return validity.split(" ").slice(0, 2).join(" ");
  };

  const shortValidity = getShortValidity(plan.validity);

  return (
    <div
      className="flex flex-col md:gap-6"
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
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#F3F4F6";
      }}
    >
      <div
        style={{
          display: "flex",
          placeItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div className="flex gap-2">
          <div className="flex-col gap-1" style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                color: "#111827",
                fontSize: "0.82rem",
              }}
            >
              {plan.plan_name}
            </p>
            {shortValidity && (
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
                {shortValidity}
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
            }}
          >
            {formatNaira(plan.price)}
          </p>
        </div>
      </div>
      <p
        className="md:hidden"
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
      <button
        onClick={() => onBuyClick(plan)}
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

const modalInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1.5px solid #E5E7EB",
  borderRadius: 10,
  fontSize: "0.9rem",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  color: "#111827",
};
