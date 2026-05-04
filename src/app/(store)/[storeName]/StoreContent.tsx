"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import type { StorePlan } from "@/types";
import { logoutReseller, logoutCustomer } from "@/app/actions/reseller/logout"; // adjust path
import {
  Smartphone,
  Wifi,
  Zap,
  MessageCircle,
  Download,
  ShoppingCart,
  Menu,
  X,
  Mail,
  Lock,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";

export function StoreContent({
  storeName,
  displayName,
  colors,
  featuredPlans,
  dataPlans,
  airtimePlans,
}: {
  storeName: string;
  displayName: string;
  colors: { primary: string; from: string; to: string; bg: string };
  featuredPlans: StorePlan[];
  dataPlans: StorePlan[];
  airtimePlans: StorePlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"data" | "airtime">("data");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayPlans = activeTab === "data" ? dataPlans : airtimePlans;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({ email, password });

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
    setMobileMenuOpen(false);

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
        background: "#F9FAFB",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      {/* Login Modal */}
      {loginOpen && (
        <div
          onClick={() => setLoginOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
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
              borderRadius: 20,
              padding: "2rem",
              width: "100%",
              maxWidth: 400,
              position: "relative",
            }}
          >
            <button
              onClick={() => setLoginOpen(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              <X size={20} />
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
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "0.4rem",
                  }}
                >
                  <Mail size={14} style={{ color: colors.primary }} /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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

              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "0.4rem",
                  }}
                >
                  <Lock size={14} style={{ color: colors.primary }} /> Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  background: colors.primary,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: loginLoading ? 0.7 : 1,
                }}
              >
                {loginLoading ? (
                  <>
                    <Loader2
                      size={17}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Signing in...
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

      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
          color: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
              {displayName}
            </h1>
            <p style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: 2 }}>
              Data & Airtime Store
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "#fff",
              padding: "0.5rem 0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            Menu
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: "rgba(0,0,0,0.15)",
              padding: "0.75rem 1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              style={mobileBtnStyle}
              onClick={() => {
                alert("App download coming soon!");
                setMobileMenuOpen(false);
              }}
            >
              <Download size={15} /> Get App
            </button>
            <button style={mobileBtnStyle}>
              <MessageCircle size={15} /> WhatsApp
            </button>

            {loggedIn ? (
              <button
                style={{ ...mobileBtnStyle, opacity: logoutLoading ? 0.7 : 1 }}
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <Loader2
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut size={15} /> Logout
                  </>
                )}
              </button>
            ) : (
              <button
                style={mobileBtnStyle}
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLoginOpen(true);
                }}
              >
                <LogIn size={15} /> Login
              </button>
            )}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
        {/* Quick Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={() => setActiveTab("data")}
            style={{
              ...quickActionStyle,
              background: activeTab === "data" ? colors.primary : "#FFFFFF",
              color: activeTab === "data" ? "#FFFFFF" : "#111827",
              border: activeTab === "data" ? "none" : "1px solid #E5E7EB",
            }}
          >
            <Wifi size={20} />
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Buy Data
            </span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              Internet bundles
            </span>
          </button>
          <button
            onClick={() => setActiveTab("airtime")}
            style={{
              ...quickActionStyle,
              background: activeTab === "airtime" ? colors.primary : "#FFFFFF",
              color: activeTab === "airtime" ? "#FFFFFF" : "#111827",
              border: activeTab === "airtime" ? "none" : "1px solid #E5E7EB",
            }}
          >
            <Smartphone size={20} />
            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              Buy Airtime
            </span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              Top up phones
            </span>
          </button>
        </div>

        {featuredPlans.length > 0 && activeTab === "data" && (
          <section style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "1rem",
              }}
            >
              ⚡ Popular Data Plans
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {featuredPlans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: 14,
                    padding: "1.25rem",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 600,
                      color: "#111827",
                      fontSize: "0.95rem",
                      marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </p>
                  {plan.validity && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#6B7280",
                        marginBottom: 8,
                      }}
                    >
                      {plan.validity}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: colors.primary,
                      marginBottom: 12,
                    }}
                  >
                    {formatNaira(plan.price)}
                  </p>
                  <button
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      background: colors.primary,
                      border: "none",
                      borderRadius: 8,
                      color: "#FFFFFF",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <ShoppingCart size={15} /> Buy Now
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "1rem",
            }}
          >
            All {activeTab === "data" ? "Data" : "Airtime"} Plans
          </h2>
          {displayPlans.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#6B7280",
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #E5E7EB",
              }}
            >
              <Zap
                size={32}
                style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
              />
              <p>No {activeTab} plans available right now</p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {displayPlans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                        fontSize: "0.95rem",
                      }}
                    >
                      {plan.name}
                    </p>
                    {plan.validity && (
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        {plan.validity}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 700,
                        color: colors.primary,
                        fontSize: "1.1rem",
                      }}
                    >
                      {formatNaira(plan.price)}
                    </p>
                    <button
                      style={{
                        padding: "0.5rem 1rem",
                        background: colors.primary,
                        border: "none",
                        borderRadius: 8,
                        color: "#FFFFFF",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div
          style={{
            marginTop: "2.5rem",
            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
            borderRadius: 16,
            padding: "2rem 1.5rem",
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            📱 Get the {displayName} App
          </h3>
          <p
            style={{
              opacity: 0.9,
              fontSize: "0.9rem",
              marginBottom: "1.25rem",
            }}
          >
            Buy data and airtime faster on your phone
          </p>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0.75rem 1.5rem",
              background: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              color: colors.primary,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Download size={17} /> Download Android App
          </button>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #E5E7EB",
          padding: "1.5rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#9CA3AF",
          marginTop: "2rem",
        }}
      >
        <p>• {displayName} Store •</p>
      </footer>
    </div>
  );
}

const quickActionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "1.5rem",
  borderRadius: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.2s",
};

const mobileBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.4rem 0.8rem",
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
  color: "#FFFFFF",
  fontSize: "0.8rem",
  cursor: "pointer",
  fontFamily: "inherit",
};

// // app/[storeName]/StoreContent.tsx

// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { createClient } from '@/lib/supabase/client'
// import { formatNaira } from '@/lib/pricing/calculatePrice'
// import type { StorePlan } from '@/types'
// import { Smartphone, Wifi, Zap, MessageCircle, Download, ShoppingCart, Menu, X, Mail, Lock, Loader2, LogIn } from 'lucide-react'

// export function StoreContent({
//   storeName,
//   displayName,
//   colors,
//   featuredPlans,
//   dataPlans,
//   airtimePlans,
// }: {
//   storeName: string
//   displayName: string
//   colors: { primary: string; from: string; to: string; bg: string }
//   featuredPlans: StorePlan[]
//   dataPlans: StorePlan[]
//   airtimePlans: StorePlan[]
// }) {
//   const router = useRouter()
//   const [activeTab, setActiveTab] = useState<'data' | 'airtime'>('data')
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
//   const [loginOpen, setLoginOpen] = useState(false)
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [loginError, setLoginError] = useState('')
//   const [loginLoading, setLoginLoading] = useState(false)

//   const displayPlans = activeTab === 'data' ? dataPlans : airtimePlans

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoginLoading(true)
//     setLoginError('')

//     const supabase = createClient()
//     const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })

//     if (error || !user) {
//       setLoginError('Invalid email or password.')
//       setLoginLoading(false)
//       return
//     }

//     const isOwner = user.user_metadata?.store_name === storeName
//     if (isOwner) {
//       router.push('/dashboard')
//     } else {
//       setLoginOpen(false)
//       setEmail('')
//       setPassword('')
//     }
//     setLoginLoading(false)
//   }

//   return (
//     <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Instrument Sans', system-ui, sans-serif" }}>

//       {/* Login Modal */}
//       {loginOpen && (
//         <div
//           onClick={() => setLoginOpen(false)}
//           style={{
//             position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
//             zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
//             padding: '1rem',
//           }}
//         >
//           <div
//             onClick={(e) => e.stopPropagation()}
//             style={{
//               background: '#FFFFFF', borderRadius: 20, padding: '2rem',
//               width: '100%', maxWidth: 400, position: 'relative',
//             }}
//           >
//             <button
//               onClick={() => setLoginOpen(false)}
//               style={{
//                 position: 'absolute', top: 16, right: 16, background: 'none',
//                 border: 'none', cursor: 'pointer', color: '#6B7280',
//               }}
//             >
//               <X size={20} />
//             </button>

//             <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
//               Sign In
//             </h2>
//             <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.5rem' }}>
//               Store owners are redirected to their dashboard
//             </p>

//             <form onSubmit={handleLogin}>
//               <div style={{ marginBottom: '1rem' }}>
//                 <label style={{ display: 'flex', alignItems: 'center', gap: 6,
//                   fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
//                   <Mail size={14} style={{ color: colors.primary }} /> Email
//                 </label>
//                 <input
//                   type="email" value={email} onChange={(e) => setEmail(e.target.value)}
//                   placeholder="you@example.com" required
//                   style={{
//                     width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #E5E7EB',
//                     borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit',
//                     outline: 'none', boxSizing: 'border-box', color: '#111827',
//                   }}
//                 />
//               </div>

//               <div style={{ marginBottom: '1.25rem' }}>
//                 <label style={{ display: 'flex', alignItems: 'center', gap: 6,
//                   fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
//                   <Lock size={14} style={{ color: colors.primary }} /> Password
//                 </label>
//                 <input
//                   type="password" value={password} onChange={(e) => setPassword(e.target.value)}
//                   placeholder="••••••••" required
//                   style={{
//                     width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #E5E7EB',
//                     borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit',
//                     outline: 'none', boxSizing: 'border-box', color: '#111827',
//                   }}
//                 />
//               </div>

//               {loginError && (
//                 <p style={{ color: '#EF4444', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>
//                   {loginError}
//                 </p>
//               )}

//               <button
//                 type="submit" disabled={loginLoading}
//                 style={{
//                   width: '100%', padding: '0.85rem', background: colors.primary,
//                   color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: '0.95rem',
//                   fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
//                   display: 'flex', alignItems: 'center', justifyContent: 'center',
//                   gap: 8, opacity: loginLoading ? 0.7 : 1,
//                 }}
//               >
//                 {loginLoading
//                   ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
//                   : <><LogIn size={17} /> Sign In</>}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <header style={{
//         background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
//         color: "#FFFFFF", position: "sticky", top: 0, zIndex: 20,
//       }}>
//         <div style={{
//           maxWidth: 1100, margin: "0 auto", padding: "1rem 1.5rem",
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//         }}>
//           <div>
//             <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{displayName}</h1>
//             <p style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: 2 }}>Data & Airtime Store</p>
//           </div>
//           <button
//             onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//             style={{
//               background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
//               borderRadius: 8, color: "#fff", padding: "0.5rem 0.8rem", cursor: "pointer",
//               display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem",
//               fontWeight: 500, fontFamily: "inherit",
//             }}
//           >
//             {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
//             Menu
//           </button>
//         </div>

//         {/* Mobile menu */}
//         {mobileMenuOpen && (
//           <div style={{
//             background: "rgba(0,0,0,0.15)", padding: "0.75rem 1.5rem",
//             borderTop: "1px solid rgba(255,255,255,0.1)",
//             display: "flex", gap: "0.5rem", flexWrap: "wrap",
//           }}>
//             <button style={mobileBtnStyle} onClick={() => { alert("App download coming soon!"); setMobileMenuOpen(false) }}>
//               <Download size={15} /> Get App
//             </button>
//             <button style={mobileBtnStyle}>
//               <MessageCircle size={15} /> WhatsApp
//             </button>
//             <button
//               style={mobileBtnStyle}
//               onClick={() => { setMobileMenuOpen(false); setLoginOpen(true) }}
//             >
//               <LogIn size={15} /> Login
//             </button>
//           </div>
//         )}
//       </header>

//       {/* rest of your JSX unchanged below... */}
//       <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
//         {/* Quick Actions */}
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
//           <button onClick={() => setActiveTab("data")} style={{
//             ...quickActionStyle,
//             background: activeTab === "data" ? colors.primary : "#FFFFFF",
//             color: activeTab === "data" ? "#FFFFFF" : "#111827",
//             border: activeTab === "data" ? "none" : "1px solid #E5E7EB",
//           }}>
//             <Wifi size={20} />
//             <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Buy Data</span>
//             <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Internet bundles</span>
//           </button>
//           <button onClick={() => setActiveTab("airtime")} style={{
//             ...quickActionStyle,
//             background: activeTab === "airtime" ? colors.primary : "#FFFFFF",
//             color: activeTab === "airtime" ? "#FFFFFF" : "#111827",
//             border: activeTab === "airtime" ? "none" : "1px solid #E5E7EB",
//           }}>
//             <Smartphone size={20} />
//             <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Buy Airtime</span>
//             <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Top up phones</span>
//           </button>
//         </div>

//         {featuredPlans.length > 0 && activeTab === "data" && (
//           <section style={{ marginBottom: "2rem" }}>
//             <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "1rem" }}>
//               ⚡ Popular Data Plans
//             </h2>
//             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
//               {featuredPlans.map((plan) => (
//                 <div key={plan.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: "1.25rem", textAlign: "center" }}>
//                   <p style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem", marginBottom: 4 }}>{plan.name}</p>
//                   {plan.validity && <p style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 8 }}>{plan.validity}</p>}
//                   <p style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.primary, marginBottom: 12 }}>{formatNaira(plan.price)}</p>
//                   <button style={{ width: "100%", padding: "0.6rem", background: colors.primary, border: "none", borderRadius: 8, color: "#FFFFFF", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
//                     <ShoppingCart size={15} /> Buy Now
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </section>
//         )}

//         <section>
//           <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "1rem" }}>
//             All {activeTab === "data" ? "Data" : "Airtime"} Plans
//           </h2>
//           {displayPlans.length === 0 ? (
//             <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280", background: "#FFFFFF", borderRadius: 14, border: "1px solid #E5E7EB" }}>
//               <Zap size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.3 }} />
//               <p>No {activeTab} plans available right now</p>
//             </div>
//           ) : (
//             <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
//               {displayPlans.map((plan) => (
//                 <div key={plan.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
//                   <div>
//                     <p style={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>{plan.name}</p>
//                     {plan.validity && <p style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: 2 }}>{plan.validity}</p>}
//                   </div>
//                   <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                     <p style={{ fontWeight: 700, color: colors.primary, fontSize: "1.1rem" }}>{formatNaira(plan.price)}</p>
//                     <button style={{ padding: "0.5rem 1rem", background: colors.primary, border: "none", borderRadius: 8, color: "#FFFFFF", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>
//                       Buy
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </section>

//         <div style={{ marginTop: "2.5rem", background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, borderRadius: 16, padding: "2rem 1.5rem", color: "#FFFFFF", textAlign: "center" }}>
//           <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>📱 Get the {displayName} App</h3>
//           <p style={{ opacity: 0.9, fontSize: "0.9rem", marginBottom: "1.25rem" }}>Buy data and airtime faster on your phone</p>
//           <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.75rem 1.5rem", background: "#FFFFFF", border: "none", borderRadius: 10, color: colors.primary, fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>
//             <Download size={17} /> Download Android App
//           </button>
//         </div>
//       </main>

//       <footer style={{ borderTop: "1px solid #E5E7EB", padding: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "#9CA3AF", marginTop: "2rem" }}>
//         <p>• {displayName} Store •</p>
//       </footer>
//     </div>
//   )
// }

// const quickActionStyle: React.CSSProperties = {
//   display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
//   padding: '1.5rem', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
// }

// const mobileBtnStyle: React.CSSProperties = {
//   display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem',
//   background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
//   borderRadius: 8, color: '#FFFFFF', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
// }

// // 'use client'

// // import { useState } from 'react'
// // import Link from 'next/link'
// // import { formatNaira } from '@/lib/pricing/calculatePrice'
// // import type { StorePlan } from '@/types'
// // import { Smartphone, Wifi, Zap, MessageCircle, Download, ShoppingCart, Menu, X } from 'lucide-react'

// // export function StoreContent({
// //   storeName,
// //   displayName,
// //   colors,
// //   featuredPlans,
// //   dataPlans,
// //   airtimePlans,
// // }: {
// //   storeName: string
// //   displayName: string
// //   colors: { primary: string; from: string; to: string; bg: string }
// //   featuredPlans: StorePlan[]
// //   dataPlans: StorePlan[]
// //   airtimePlans: StorePlan[]
// // }) {
// //   const [activeTab, setActiveTab] = useState<'data' | 'airtime'>('data')
// //   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

// //   const displayPlans = activeTab === 'data' ? dataPlans : airtimePlans

// //   return (
// //     <div
// //       style={{
// //         minHeight: "100vh",
// //         background: "#F9FAFB",
// //         fontFamily: "'Instrument Sans', system-ui, sans-serif",
// //       }}
// //     >
// //       {/* Header */}
// //       <header
// //         style={{
// //           background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
// //           color: "#FFFFFF",
// //           position: "sticky",
// //           top: 0,
// //           zIndex: 20,
// //         }}
// //       >
// //         <div
// //           style={{
// //             maxWidth: 1100,
// //             margin: "0 auto",
// //             padding: "1rem 1.5rem",
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "space-between",
// //           }}
// //         >
// //           <div>
// //             <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
// //               {displayName}
// //             </h1>
// //             <p style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: 2 }}>
// //               Data & Airtime Store
// //             </p>
// //           </div>
// //           <div
// //             style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
// //           >
// //             <button
// //               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
// //               style={{
// //                 background: "rgba(255,255,255,0.15)",
// //                 border: "1px solid rgba(255,255,255,0.2)",
// //                 borderRadius: 8,
// //                 color: "#fff",
// //                 padding: "0.5rem 0.8rem",
// //                 cursor: "pointer",
// //                 display: "flex",
// //                 alignItems: "center",
// //                 gap: 6,
// //                 fontSize: "0.85rem",
// //                 fontWeight: 500,
// //                 fontFamily: "inherit",
// //               }}
// //             >
// //               {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
// //               Menu
// //             </button>
// //           </div>
// //         </div>

// //         {/* Mobile menu */}
// //         {mobileMenuOpen && (
// //           <div
// //             style={{
// //               background: "rgba(0,0,0,0.15)",
// //               padding: "0.75rem 1.5rem",
// //               borderTop: "1px solid rgba(255,255,255,0.1)",
// //               display: "flex",
// //               gap: "0.5rem",
// //               flexWrap: "wrap",
// //             }}
// //           >
// //             <button
// //               style={mobileBtnStyle}
// //               onClick={() => {
// //                 alert("App download coming soon!");
// //                 setMobileMenuOpen(false);
// //               }}
// //             >
// //               <Download size={15} />
// //               Get App
// //             </button>
// //             <button style={mobileBtnStyle}>
// //               <MessageCircle size={15} />
// //               WhatsApp
// //             </button>
// //           </div>
// //         )}
// //       </header>

// //       <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
// //         {/* Quick Actions */}
// //         <div
// //           style={{
// //             display: "grid",
// //             gridTemplateColumns: "1fr 1fr",
// //             gap: "0.75rem",
// //             marginBottom: "2rem",
// //           }}
// //         >
// //           <button
// //             onClick={() => setActiveTab("data")}
// //             style={{
// //               ...quickActionStyle,
// //               background: activeTab === "data" ? colors.primary : "#FFFFFF",
// //               color: activeTab === "data" ? "#FFFFFF" : "#111827",
// //               border: activeTab === "data" ? "none" : "1px solid #E5E7EB",
// //             }}
// //           >
// //             <Wifi size={20} />
// //             <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
// //               Buy Data
// //             </span>
// //             <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
// //               Internet bundles
// //             </span>
// //           </button>
// //           <button
// //             onClick={() => setActiveTab("airtime")}
// //             style={{
// //               ...quickActionStyle,
// //               background: activeTab === "airtime" ? colors.primary : "#FFFFFF",
// //               color: activeTab === "airtime" ? "#FFFFFF" : "#111827",
// //               border: activeTab === "airtime" ? "none" : "1px solid #E5E7EB",
// //             }}
// //           >
// //             <Smartphone size={20} />
// //             <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
// //               Buy Airtime
// //             </span>
// //             <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
// //               Top up phones
// //             </span>
// //           </button>
// //         </div>

// //         {/* Featured Plans */}
// //         {featuredPlans.length > 0 && activeTab === "data" && (
// //           <section style={{ marginBottom: "2rem" }}>
// //             <h2
// //               style={{
// //                 fontSize: "1.1rem",
// //                 fontWeight: 700,
// //                 color: "#111827",
// //                 marginBottom: "1rem",
// //               }}
// //             >
// //               ⚡ Popular Data Plans
// //             </h2>
// //             <div
// //               style={{
// //                 display: "grid",
// //                 gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
// //                 gap: "0.75rem",
// //               }}
// //             >
// //               {featuredPlans.map((plan) => (
// //                 <div
// //                   key={plan.id}
// //                   style={{
// //                     background: "#FFFFFF",
// //                     border: "1px solid #E5E7EB",
// //                     borderRadius: 14,
// //                     padding: "1.25rem",
// //                     textAlign: "center",
// //                   }}
// //                 >
// //                   <p
// //                     style={{
// //                       fontWeight: 600,
// //                       color: "#111827",
// //                       fontSize: "0.95rem",
// //                       marginBottom: 4,
// //                     }}
// //                   >
// //                     {plan.name}
// //                   </p>
// //                   {plan.validity && (
// //                     <p
// //                       style={{
// //                         fontSize: "0.75rem",
// //                         color: "#6B7280",
// //                         marginBottom: 8,
// //                       }}
// //                     >
// //                       {plan.validity}
// //                     </p>
// //                   )}
// //                   <p
// //                     style={{
// //                       fontSize: "1.5rem",
// //                       fontWeight: 700,
// //                       color: colors.primary,
// //                       marginBottom: 12,
// //                     }}
// //                   >
// //                     {formatNaira(plan.price)}
// //                   </p>
// //                   <button
// //                     style={{
// //                       width: "100%",
// //                       padding: "0.6rem",
// //                       background: colors.primary,
// //                       border: "none",
// //                       borderRadius: 8,
// //                       color: "#FFFFFF",
// //                       fontWeight: 600,
// //                       fontSize: "0.85rem",
// //                       cursor: "pointer",
// //                       fontFamily: "inherit",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                       gap: 6,
// //                     }}
// //                   >
// //                     <ShoppingCart size={15} />
// //                     Buy Now
// //                   </button>
// //                 </div>
// //               ))}
// //             </div>
// //           </section>
// //         )}

// //         {/* All Plans */}
// //         <section>
// //           <h2
// //             style={{
// //               fontSize: "1.1rem",
// //               fontWeight: 700,
// //               color: "#111827",
// //               marginBottom: "1rem",
// //             }}
// //           >
// //             All {activeTab === "data" ? "Data" : "Airtime"} Plans
// //           </h2>
// //           {displayPlans.length === 0 ? (
// //             <div
// //               style={{
// //                 textAlign: "center",
// //                 padding: "3rem",
// //                 color: "#6B7280",
// //                 background: "#FFFFFF",
// //                 borderRadius: 14,
// //                 border: "1px solid #E5E7EB",
// //               }}
// //             >
// //               <Zap
// //                 size={32}
// //                 style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
// //               />
// //               <p>No {activeTab} plans available right now</p>
// //             </div>
// //           ) : (
// //             <div
// //               style={{
// //                 display: "flex",
// //                 flexDirection: "column",
// //                 gap: "0.5rem",
// //               }}
// //             >
// //               {displayPlans.map((plan) => (
// //                 <div
// //                   key={plan.id}
// //                   style={{
// //                     background: "#FFFFFF",
// //                     border: "1px solid #E5E7EB",
// //                     borderRadius: 12,
// //                     padding: "1rem 1.25rem",
// //                     display: "flex",
// //                     alignItems: "center",
// //                     justifyContent: "space-between",
// //                     flexWrap: "wrap",
// //                     gap: "0.75rem",
// //                   }}
// //                 >
// //                   <div>
// //                     <p
// //                       style={{
// //                         fontWeight: 600,
// //                         color: "#111827",
// //                         fontSize: "0.95rem",
// //                       }}
// //                     >
// //                       {plan.name}
// //                     </p>
// //                     {plan.validity && (
// //                       <p
// //                         style={{
// //                           fontSize: "0.78rem",
// //                           color: "#6B7280",
// //                           marginTop: 2,
// //                         }}
// //                       >
// //                         {plan.validity}
// //                       </p>
// //                     )}
// //                   </div>
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       alignItems: "center",
// //                       gap: "1rem",
// //                     }}
// //                   >
// //                     <p
// //                       style={{
// //                         fontWeight: 700,
// //                         color: colors.primary,
// //                         fontSize: "1.1rem",
// //                       }}
// //                     >
// //                       {formatNaira(plan.price)}
// //                     </p>
// //                     <button
// //                       style={{
// //                         padding: "0.5rem 1rem",
// //                         background: colors.primary,
// //                         border: "none",
// //                         borderRadius: 8,
// //                         color: "#FFFFFF",
// //                         fontWeight: 600,
// //                         fontSize: "0.82rem",
// //                         cursor: "pointer",
// //                         fontFamily: "inherit",
// //                       }}
// //                     >
// //                       Buy
// //                     </button>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           )}
// //         </section>

// //         {/* App Banner */}
// //         <div
// //           style={{
// //             marginTop: "2.5rem",
// //             background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
// //             borderRadius: 16,
// //             padding: "2rem 1.5rem",
// //             color: "#FFFFFF",
// //             textAlign: "center",
// //           }}
// //         >
// //           <h3
// //             style={{
// //               fontSize: "1.2rem",
// //               fontWeight: 700,
// //               marginBottom: "0.5rem",
// //             }}
// //           >
// //             📱 Get the {displayName} App
// //           </h3>
// //           <p
// //             style={{
// //               opacity: 0.9,
// //               fontSize: "0.9rem",
// //               marginBottom: "1.25rem",
// //             }}
// //           >
// //             Buy data and airtime faster on your phone
// //           </p>
// //           <button
// //             style={{
// //               display: "inline-flex",
// //               alignItems: "center",
// //               gap: 8,
// //               padding: "0.75rem 1.5rem",
// //               background: "#FFFFFF",
// //               border: "none",
// //               borderRadius: 10,
// //               color: colors.primary,
// //               fontWeight: 600,
// //               fontSize: "0.9rem",
// //               cursor: "pointer",
// //               fontFamily: "inherit",
// //             }}
// //           >
// //             <Download size={17} />
// //             Download Android App
// //           </button>
// //         </div>
// //       </main>

// //       {/* Footer */}
// //       <footer
// //         style={{
// //           borderTop: "1px solid #E5E7EB",
// //           padding: "1.5rem",
// //           textAlign: "center",
// //           fontSize: "0.8rem",
// //           color: "#9CA3AF",
// //           marginTop: "2rem",
// //         }}
// //       >
// //         <p>• {displayName} Store •</p>
// //       </footer>
// //     </div>
// //   );
// // }

// // const quickActionStyle: React.CSSProperties = {
// //   display: 'flex',
// //   flexDirection: 'column',
// //   alignItems: 'center',
// //   gap: 6,
// //   padding: '1.5rem',
// //   borderRadius: 14,
// //   cursor: 'pointer',
// //   fontFamily: 'inherit',
// //   transition: 'all 0.2s',
// // }

// // const mobileBtnStyle: React.CSSProperties = {
// //   display: 'inline-flex',
// //   alignItems: 'center',
// //   gap: 6,
// //   padding: '0.4rem 0.8rem',
// //   background: 'rgba(255,255,255,0.15)',
// //   border: '1px solid rgba(255,255,255,0.2)',
// //   borderRadius: 8,
// //   color: '#FFFFFF',
// //   fontSize: '0.8rem',
// //   cursor: 'pointer',
// //   fontFamily: 'inherit',
// // }
