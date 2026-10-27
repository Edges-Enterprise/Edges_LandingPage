// src/app/[countryCode]/[storeName]/profile/StoreProfileClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  User,
  ShieldCheck,
  Calendar,
  Wallet,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import StoreHeader from "../StoreHeader";
import StoreFooter from "../StoreFooter";
import { useStoreCustomerAuth } from "@/hooks/store/useStoreCustomerAuth";
import { useStoreCustomerWallet } from "@/hooks/store/useStoreCustomerWallet";
import { getCurrentStoreProfile } from "@/actions/reseller/customers/getCurrentStoreProfile";
import { updateCurrentStoreProfile } from "@/actions/reseller/customers/updateCurrentStoreProfile";
import { formatStorePrice } from "@/lib/currency/formatStorePrice";
import { CountryConfig } from "@/config/countries";

interface StoreProfileClientProps {
  storeData: any;
  config: CountryConfig;
  translations: any;
}

export default function StoreProfileClient({
  storeData,
  config,
  translations,
}: StoreProfileClientProps) {
  const t = translations;
  const router = useRouter();
  const resellerId = storeData.application.id;

  const auth = useStoreCustomerAuth(
    storeData.application.store_slug,
    resellerId,
  );
  const wallet = useStoreCustomerWallet({
    loggedIn: auth.loggedIn,
    isStoreOwner: auth.isStoreOwner,
    resellerId,
  });

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  // The storefront profile page is a signed-in surface: bounce anonymous
  // visitors back to the store with the sign-in modal open.
  useEffect(() => {
    if (!auth.authReady) return;
    if (!auth.loggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await getCurrentStoreProfile(resellerId);
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error || "Unable to load your profile");
      } else {
        setProfile(result.data);
        setForm({
          firstName: result.data.firstName || "",
          lastName: result.data.lastName || "",
          phone: result.data.phone || "",
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.authReady, auth.loggedIn, resellerId]);

  const openSignIn = () => {
    router.push(
      `/${storeData.application.country_code}/${storeData.application.store_slug}?login=true`,
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await updateCurrentStoreProfile({
      resellerId,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Failed to save changes");
      return;
    }
    setProfile((p: any) => ({
      ...p,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
    }));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.email ||
    "";
  const initial = (profile?.firstName || profile?.email || "U")
    .charAt(0)
    .toUpperCase();

  const memberSince = profile?.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(config.locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const infoRow = (
    icon: React.ReactNode,
    label: string,
    value: string | null,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "var(--accent-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--brand-color)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--dim)",
            margin: 0,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: "0.92rem",
            color: "var(--text)",
            margin: "0.15rem 0 0 0",
            overflowWrap: "anywhere",
          }}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      <StoreHeader
        storeData={storeData}
        translations={t}
        config={config}
        walletBalance={wallet.walletBalance}
        walletLoading={wallet.customerDataLoading}
        onFundClick={() =>
          router.push(
            `/${storeData.application.country_code}/${storeData.application.store_slug}`,
          )
        }
      />

      <main
        style={{
          padding: "2rem 5%",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {auth.authReady && !auth.loggedIn ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              padding: "3rem 1rem",
              textAlign: "center",
            }}
          >
            <User size={40} style={{ color: "var(--muted)" }} />
            <p style={{ color: "var(--text)", fontSize: "1.05rem" }}>
              {t?.signInPrompt || "Sign in to view your profile"}
            </p>
            <button
              onClick={openSignIn}
              style={{
                padding: "0.7rem 1.6rem",
                borderRadius: 10,
                border: "none",
                background: "var(--brand-color)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t?.signIn || "Sign in"}
            </button>
          </div>
        ) : loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem 0",
            }}
          >
            <Loader2
              size={28}
              style={{ color: "var(--brand-color)", animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : (
          <>
            {/* Identity card */}
            <section
              className="profile-card"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "var(--brand-color)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {displayName}
                  </h1>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 6,
                      padding: "0.2rem 0.6rem",
                      borderRadius: 999,
                      background: "var(--accent-bg)",
                      color: "var(--brand-color)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    <ShieldCheck size={12} />
                    {profile?.accountType === "owner"
                      ? t?.storeOwner || "Store Owner"
                      : t?.customer || "Customer"}
                  </span>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.55rem 1rem",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Pencil size={14} />
                    {t?.edit || "Edit"}
                  </button>
                )}
              </div>
            </section>

            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "var(--red)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                {error}
              </div>
            )}

            {saved && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  background: "rgba(110,189,138,0.12)",
                  border: "1px solid rgba(110,189,138,0.25)",
                  color: "var(--green)",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                }}
              >
                <Check size={15} />
                {t?.profileUpdated || "Profile updated"}
              </div>
            )}

            {/* Details / edit form */}
            <section
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: "0 0 1.25rem 0",
                }}
              >
                {t?.profileInfo || "Profile Information"}
              </h2>

              {editing ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--dim)",
                      }}
                    >
                      {t?.firstName || "First Name"}
                    </span>
                    <input
                      className="store-input"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--dim)",
                      }}
                    >
                      {t?.lastName || "Last Name"}
                    </span>
                    <input
                      className="store-input"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                  </label>
                  <label
                    style={{
                      display: "grid",
                      gap: 6,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--dim)",
                      }}
                    >
                      {t?.phoneNumber || "Phone Number"}
                    </span>
                    <input
                      className="store-input"
                      type="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      gridColumn: "1 / -1",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0.65rem 1.4rem",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--brand-color)",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        cursor: saving ? "default" : "pointer",
                        opacity: saving ? 0.7 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {saving ? (
                        <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Check size={15} />
                      )}
                      {t?.save || "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setError(null);
                        setForm({
                          firstName: profile?.firstName || "",
                          lastName: profile?.lastName || "",
                          phone: profile?.phone || "",
                        });
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0.65rem 1.2rem",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <X size={15} />
                      {t?.cancel || "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="profile-info-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  {infoRow(<Mail size={15} />, t?.email || "Email", profile?.email)}
                  {infoRow(
                    <Phone size={15} />,
                    t?.phone || "Phone",
                    profile?.phone,
                  )}
                  {infoRow(
                    <ShieldCheck size={15} />,
                    t?.status || "Status",
                    profile?.status
                      ? profile.status.charAt(0).toUpperCase() +
                          profile.status.slice(1)
                      : null,
                  )}
                  {infoRow(
                    <Calendar size={15} />,
                    t?.memberSince || "Member Since",
                    memberSince,
                  )}
                </div>
              )}
            </section>

            {/* Wallet summary (customers only) */}
            {profile?.accountType === "customer" && (
              <section
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--accent-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--brand-color)",
                    }}
                  >
                    <Wallet size={18} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--dim)",
                        margin: 0,
                      }}
                    >
                      {t?.walletBalance || "Wallet Balance"}
                    </p>
                    <p
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--text)",
                        margin: "0.15rem 0 0 0",
                      }}
                    >
                      {wallet.customerDataLoading
                        ? "..."
                        : formatStorePrice(wallet.walletBalance, config)}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <StoreFooter storeData={storeData} translations={t} config={config} />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .store-input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.9rem;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
        }
        .store-input:focus {
          border-color: var(--brand-color);
        }
        @media (max-width: 480px) {
          .profile-card {
            padding: 1.1rem !important;
          }
          .profile-info-grid {
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
