// src/app/[countryCode]/dashboard/publishing/PublishingPlans.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Globe,
  MapPin,
  Earth,
  Check,
  X,
  CreditCard,
  Package,
  Wallet,
} from "lucide-react";
import { CountryConfig } from "@/config/countries";

interface PublishingPlansProps {
  application: {
    id: string;
    store_name: string;
    android_app: boolean;
  };
  currentPlan: string | null;
  // TODO(wallet): wire this up to wherever wallet balance actually lives
  // (a column, a separate table, an RPC — whatever you land on). Pass the
  // real number in from the parent/page once it's built. Defaults to 0
  // so nothing here breaks before that exists.
  walletBalance?: number;
  config: CountryConfig;
  translations: any;
  onSuccess: () => void;
}

interface Plan {
  id: "free" | "local" | "regional" | "worldwide";
  name: string;
  price: number | null;
  description: string;
  features: string[];
  icon: any;
  color: string;
}

export default function PublishingPlans({
  application,
  currentPlan,
  walletBalance = 0,
  config,
  translations,
  onSuccess,
}: PublishingPlansProps) {
  const t = translations;
  const supabase = createClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const plans: Plan[] = [
    {
      id: "free",
      name: t?.freeAPK || "Free APK",
      price: null,
      description: t?.freeDesc || "Get your branded APK for free",
      features: [
        t?.freeFeatures || "Branded APK",
        "WhatsApp sharing",
        "QR code generation",
        "Direct download link",
      ],
      icon: Package,
      color: "#6EBD8A",
    },
    {
      id: "local",
      name: t?.local || "Local",
      price: 22,
      description: t?.localDesc || "Publish your app in your local country",
      features: [
        t?.localFeatures || "Play Store listing",
        "Local country visibility",
        "Managed submission",
        "Review monitoring",
      ],
      icon: MapPin,
      color: "#3B82F6",
    },
    {
      id: "regional",
      name: t?.regional || "Regional",
      price: 28,
      description: t?.regionalDesc || "Publish your app across your region",
      features: [
        t?.regionalFeatures || "Play Store listing",
        "Regional visibility",
        "Managed submission",
        "Review monitoring",
      ],
      icon: Globe,
      color: "#8B5CF6",
    },
    {
      id: "worldwide",
      name: t?.worldwide || "Worldwide",
      price: 35,
      description: t?.worldwideDesc || "Publish your app globally",
      features: [
        t?.worldwideFeatures || "Play Store listing",
        "Global visibility",
        "Managed submission",
        "Review monitoring",
      ],
      icon: Earth,
      color: "#F59E0B",
    },
  ];

  const selectedPlanDetails = plans.find((p) => p.id === selectedPlan);
  const activePlanDetails = plans.find((p) => p.id === currentPlan);

  const insufficientFunds =
    !!selectedPlanDetails &&
    selectedPlanDetails.price !== null &&
    walletBalance < selectedPlanDetails.price;

  const canPublish =
    !!selectedPlan &&
    selectedPlan !== "free" &&
    selectedPlan !== currentPlan &&
    !insufficientFunds;

  // Card click just selects/deselects a plan — it no longer triggers payment.
  const handleCardClick = (planId: string) => {
    if (planId === "free") return; // free tier isn't something to "select"
    if (planId === currentPlan) return; // already active, nothing to do

    setSelectedPlan((prev) => (prev === planId ? null : planId));
    setPaymentError(null);
  };

  // The single "Publish Now" button below the grid opens the confirmation modal.
  const handlePublishClick = () => {
    if (!canPublish) return;
    setPaymentError(null);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan || selectedPlan === "free") return;

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan || plan.price === null) return;

    setIsLoading(true);
    setPaymentError(null);

    try {
      // TODO(wallet): replace this with the real wallet deduction —
      // e.g. a supabase.rpc('deduct_wallet_balance', { reseller_id, amount })
      // call that atomically checks + debits the balance server-side, so we
      // aren't trusting the client-side `walletBalance` prop for the actual
      // charge. This should throw/return an error on insufficient funds so
      // the catch block below can surface it instead of silently updating
      // the plan.
      //
      // const { error: walletError } = await supabase.rpc(
      //   "deduct_wallet_balance",
      //   { reseller_id: application.id, amount: plan.price },
      // );
      // if (walletError) throw walletError;

      const { error } = await supabase.from("global_reseller_settings").upsert({
        reseller_id: application.id,
        publishing_plan: selectedPlan,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      onSuccess();
      setShowPayment(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(t?.paymentFailed || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // If Android App is not enabled, show a message
  if (!application.android_app) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.5rem",
          
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
           
          }}
        >
          {t?.publishingPlans || "Publishing Plans"}
        </h3>
        <div
          style={{
            padding: "1rem",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 8,
            color: "#F59E0B",
            fontSize: "0.9rem",
          }}
        >
          {t?.androidAppDisabled ||
            "Android App is not enabled. Enable it in your store settings to publish."}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.5rem",
          padding: "1.25rem",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            {t?.publishingPlans || "Publishing Plans"}
          </h3>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              marginBottom: 0,
            }}
          >
            {t?.selectPlan ||
              "Select a plan to publish your app to the Play Store"}
          </p>
        </div>

        {/* <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.75rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 100,
            fontSize: "0.8rem",
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          <Wallet size={14} style={{ color: "var(--brand-color)" }} />
          {t?.walletBalance || "Wallet"}:
          <strong style={{ color: "var(--text)" }}>
            ${walletBalance.toFixed(2)}
          </strong>
        </div> */}
      </div>

      {activePlanDetails && activePlanDetails.id !== "free" && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(var(--brand-color-rgb), 0.08)",
            border: "1px solid rgba(var(--brand-color-rgb), 0.2)",
            borderRadius: 8,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
              }}
            >
              {t?.currentPlan || "Current Plan"}
            </span>
            <p
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--text)",
                margin: 0,
              }}
            >
              {activePlanDetails.name}
            </p>
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#6EBD8A",
              background: "rgba(110,189,138,0.12)",
              padding: "2px 10px",
              borderRadius: 100,
            }}
          >
            {t?.active || "Active"}
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isActive = currentPlan === plan.id;
          const isFree = plan.id === "free";
          const isSelected = selectedPlan === plan.id;
          const isClickable = !isActive && !isFree;

          return (
            <div
              key={plan.id}
              onClick={() => handleCardClick(plan.id)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleCardClick(plan.id);
                }
              }}
              style={{
                background: isActive
                  ? `rgba(var(--brand-color-rgb), 0.05)`
                  : isSelected
                    ? `rgba(var(--brand-color-rgb), 0.08)`
                    : "var(--bg2)",
                border: isActive
                  ? `2px solid var(--brand-color)`
                  : isSelected
                    ? `2px solid var(--brand-color)`
                    : "1px solid var(--border)",
                borderRadius: 10,
                padding: "1.25rem",
                transition: "all 0.2s",
                position: "relative",
                cursor: isClickable ? "pointer" : "default",
                outline: "none",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    background: "var(--brand-color)",
                    color: "#FDF8F3",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 100,
                    textTransform: "uppercase",
                  }}
                >
                  {t?.active || "Active"}
                </div>
              )}

              {!isActive && isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--brand-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={12} style={{ color: "#FDF8F3" }} />
                </div>
              )}

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${plan.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <Icon size={18} style={{ color: plan.color }} />
              </div>

              <h4
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                {plan.name}
              </h4>

              {plan.price !== null ? (
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "var(--brand-color)",
                    margin: "0.25rem 0 0.5rem 0",
                  }}
                >
                  ${plan.price}
                </p>
              ) : (
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#6EBD8A",
                    margin: "0.25rem 0 0.5rem 0",
                  }}
                >
                  {t?.free || "Free"}
                </p>
              )}

              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  marginBottom: "0.5rem",
                }}
              >
                {plan.description}
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0.5rem 0 0 0",
                }}
              >
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      padding: "0.15rem 0",
                    }}
                  >
                    <Check size={12} style={{ color: "#6EBD8A" }} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isActive && !isFree && (
                <div
                  style={{
                    width: "100%",
                    marginTop: "0.75rem",
                    padding: "0.4rem",
                    textAlign: "center",
                    background: "var(--bg3)",
                    color: "var(--dim)",
                    borderRadius: 6,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {t?.active || "Active"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Single Publish Now action, gated on a card being selected */}
      <div
        style={{
          marginTop: "1.25rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            paddingLeft: "0.5rem",
          }}
        >
          {selectedPlanDetails ? (
            <>
              {/* {t?.selected || "Selected"}:{" "} */}
              <strong style={{ color: "var(--text)" }}>
                {selectedPlanDetails.name}
              </strong>{" "}
              —{" "}
              <strong style={{ color: "var(--brand-color)" }}>
                ${selectedPlanDetails.price}
              </strong>
              {insufficientFunds && (
                <span style={{ color: "#EF4444", marginLeft: "0.75rem" }}>
                  {t?.insufficientFunds || "Insufficient wallet balance"}
                </span>
              )}
            </>
          ) : (
            t?.noPlanSelected || "Select a plan above to publish your app"
          )}
        </div>

        <button
          onClick={handlePublishClick}
          disabled={!canPublish}
          style={{
            padding: "0.6rem 1.75rem",
            background: canPublish ? "var(--brand-color)" : "var(--bg3)",
            color: canPublish ? "#FDF8F3" : "var(--dim)",
            border: "none",
            borderRadius: 8,
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: canPublish ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (canPublish) e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {t?.publishNow || "Publish Now"}
        </button>
      </div>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPayment(false);
              setPaymentError(null);
            }
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              maxWidth: 400,
              width: "100%",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              {t?.confirmPublish || "Confirm Publishing"}
            </h3>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                marginBottom: "1.5rem",
              }}
            >
              {t?.confirmPublishDesc ||
                "You are about to publish your app. This action cannot be undone."}
            </p>

            {(() => {
              const plan = plans.find((p) => p.id === selectedPlan);
              return (
                <div
                  style={{
                    background: "var(--bg2)",
                    borderRadius: 8,
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.25rem 0",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>
                      {t?.plan || "Plan"}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>
                      {plan?.name}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.25rem 0",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>
                      {t?.price || "Price"}
                    </span>
                    <span
                      style={{ fontWeight: 700, color: "var(--brand-color)" }}
                    >
                      ${plan?.price}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.25rem 0",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>
                      {t?.walletBalance || "Wallet Balance"}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>
                      ${walletBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {paymentError && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6,
                  color: "#EF4444",
                  fontSize: "0.85rem",
                  marginBottom: "1rem",
                }}
              >
                {paymentError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setPaymentError(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--brand-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {t?.cancel || "Cancel"}
              </button>
              <button
                onClick={handlePayment}
                disabled={isLoading || insufficientFunds}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "var(--brand-color)",
                  color: "#FDF8F3",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  cursor:
                    isLoading || insufficientFunds ? "not-allowed" : "pointer",
                  opacity: isLoading || insufficientFunds ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
              >
                <CreditCard size={16} />
                {isLoading
                  ? t?.processing || "Processing..."
                  : t?.payNow || "Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// // src/app/[countryCode]/dashboard/publishing/PublishingPlans.tsx
// "use client";

// import { useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { Globe, MapPin, Earth, Check, X, CreditCard, Package } from "lucide-react";
// import { CountryConfig } from "@/config/countries";

// interface PublishingPlansProps {
//   application: {
//     id: string;
//     store_name: string;
//     android_app: boolean;
//   };
//   currentPlan: string | null;
//   config: CountryConfig;
//   translations: any;
//   onSuccess: () => void;
// }

// interface Plan {
//   id: "free" | "local" | "regional" | "worldwide";
//   name: string;
//   price: number | null;
//   description: string;
//   features: string[];
//   icon: any;
//   color: string;
// }

// export default function PublishingPlans({
//   application,
//   currentPlan,
//   config,
//   translations,
//   onSuccess,
// }: PublishingPlansProps) {
//   const t = translations;
//   const supabase = createClient();
//   const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPayment, setShowPayment] = useState(false);

//   const plans: Plan[] = [
//     {
//       id: "free",
//       name: t?.freeAPK || "Free APK",
//       price: null,
//       description: t?.freeDesc || "Get your branded APK for free",
//       features: [
//         t?.freeFeatures || "Branded APK",
//         "WhatsApp sharing",
//         "QR code generation",
//         "Direct download link",
//       ],
//       icon: Package,
//       color: "#6EBD8A",
//     },
//     {
//       id: "local",
//       name: t?.local || "Local",
//       price: 22,
//       description: t?.localDesc || "Publish your app in your local country",
//       features: [
//         t?.localFeatures || "Play Store listing",
//         "Local country visibility",
//         "Managed submission",
//         "Review monitoring",
//       ],
//       icon: MapPin,
//       color: "#3B82F6",
//     },
//     {
//       id: "regional",
//       name: t?.regional || "Regional",
//       price: 28,
//       description: t?.regionalDesc || "Publish your app across your region",
//       features: [
//         t?.regionalFeatures || "Play Store listing",
//         "Regional visibility",
//         "Managed submission",
//         "Review monitoring",
//       ],
//       icon: Globe,
//       color: "#8B5CF6",
//     },
//     {
//       id: "worldwide",
//       name: t?.worldwide || "Worldwide",
//       price: 35,
//       description: t?.worldwideDesc || "Publish your app globally",
//       features: [
//         t?.worldwideFeatures || "Play Store listing",
//         "Global visibility",
//         "Managed submission",
//         "Review monitoring",
//       ],
//       icon: Earth,
//       color: "#F59E0B",
//     },
//   ];

//   const handleSelectPlan = async (planId: string) => {
//     if (planId === "free") {
//       // Free APK is already available
//       return;
//     }

//     if (planId === currentPlan) {
//       return;
//     }

//     setSelectedPlan(planId);
//     setShowPayment(true);
//   };

//   const handlePayment = async () => {
//     if (!selectedPlan || selectedPlan === "free") return;

//     setIsLoading(true);
//     try {
//       // Update the publishing plan in settings
//       const { error } = await supabase.from("global_reseller_settings").upsert({
//         reseller_id: application.id,
//         publishing_plan: selectedPlan,
//         updated_at: new Date().toISOString(),
//       });

//       if (error) throw error;

//       onSuccess();
//       setShowPayment(false);
//       setSelectedPlan(null);
//     } catch (error) {
//       console.error("Payment error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const getSelectedPlan = (): Plan | undefined => {
//     return plans.find((p) => p.id === currentPlan);
//   };

//   const selectedPlanDetails = getSelectedPlan();

//   // If Android App is not enabled, show a message
//   if (!application.android_app) {
//     return (
//       <div
//         style={{
//           background: "var(--card)",
//           border: "1px solid var(--border)",
//           borderRadius: 12,
//           padding: "1.5rem",
//           marginBottom: "1.5rem",
//         }}
//       >
//         <h3
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1rem",
//             fontWeight: 700,
//             marginBottom: "0.5rem",
//           }}
//         >
//           {t?.publishingPlans || "Publishing Plans"}
//         </h3>
//         <div
//           style={{
//             padding: "1rem",
//             background: "rgba(245,158,11,0.08)",
//             border: "1px solid rgba(245,158,11,0.2)",
//             borderRadius: 8,
//             color: "#F59E0B",
//             fontSize: "0.9rem",
//           }}
//         >
//           {t?.androidAppDisabled ||
//             "Android App is not enabled. Enable it in your store settings to publish."}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         background: "var(--card)",
//         border: "1px solid var(--border)",
//         borderRadius: 12,
//         padding: "1.5rem",
//         marginBottom: "1.5rem",
//       }}
//     >
//       <h3
//         style={{
//           fontFamily: "'Playfair Display', serif",
//           fontSize: "1rem",
//           fontWeight: 700,
//           marginBottom: "0.5rem",
//         }}
//       >
//         {t?.publishingPlans || "Publishing Plans"}
//       </h3>
//       <p
//         style={{
//           color: "var(--muted)",
//           fontSize: "0.85rem",
//           marginBottom: "1rem",
//         }}
//       >
//         {t?.selectPlan || "Select a plan to publish your app to the Play Store"}
//       </p>

//       {selectedPlanDetails && selectedPlanDetails.id !== "free" && (
//         <div
//           style={{
//             padding: "0.75rem 1rem",
//             background: "rgba(var(--brand-color-rgb), 0.08)",
//             border: "1px solid rgba(var(--brand-color-rgb), 0.2)",
//             borderRadius: 8,
//             marginBottom: "1rem",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//           }}
//         >
//           <div>
//             <span
//               style={{
//                 fontSize: "0.7rem",
//                 color: "var(--dim)",
//                 textTransform: "uppercase",
//               }}
//             >
//               {t?.currentPlan || "Current Plan"}
//             </span>
//             <p
//               style={{
//                 fontSize: "0.9rem",
//                 fontWeight: 600,
//                 color: "var(--text)",
//                 margin: 0,
//               }}
//             >
//               {selectedPlanDetails.name}
//             </p>
//           </div>
//           <span
//             style={{
//               fontSize: "0.7rem",
//               fontWeight: 600,
//               color: "#6EBD8A",
//               background: "rgba(110,189,138,0.12)",
//               padding: "2px 10px",
//               borderRadius: 100,
//             }}
//           >
//             {t?.active || "Active"}
//           </span>
//         </div>
//       )}

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
//           gap: "1rem",
//         }}
//       >
//         {plans.map((plan) => {
//           const Icon = plan.icon;
//           const isActive = currentPlan === plan.id;
//           const isFree = plan.id === "free";

//           return (
//             <div
//               key={plan.id}
//               style={{
//                 background: isActive
//                   ? `rgba(var(--brand-color-rgb), 0.05)`
//                   : "var(--bg2)",
//                 border: isActive
//                   ? `2px solid var(--brand-color)`
//                   : "1px solid var(--border)",
//                 borderRadius: 10,
//                 padding: "1.25rem",
//                 transition: "all 0.2s",
//                 position: "relative",
//               }}
//             >
//               {isActive && (
//                 <div
//                   style={{
//                     position: "absolute",
//                     top: "0.5rem",
//                     right: "0.5rem",
//                     background: "var(--brand-color)",
//                     color: "#FDF8F3",
//                     fontSize: "0.6rem",
//                     fontWeight: 600,
//                     padding: "2px 8px",
//                     borderRadius: 100,
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   {t?.active || "Active"}
//                 </div>
//               )}

//               <div
//                 style={{
//                   width: 36,
//                   height: 36,
//                   borderRadius: 8,
//                   background: `${plan.color}15`,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   marginBottom: "0.5rem",
//                 }}
//               >
//                 <Icon size={18} style={{ color: plan.color }} />
//               </div>

//               <h4
//                 style={{
//                   fontSize: "0.95rem",
//                   fontWeight: 700,
//                   color: "var(--text)",
//                   margin: 0,
//                 }}
//               >
//                 {plan.name}
//               </h4>

//               {plan.price !== null ? (
//                 <p
//                   style={{
//                     fontFamily: "'Playfair Display', serif",
//                     fontSize: "1.2rem",
//                     fontWeight: 700,
//                     color: "var(--brand-color)",
//                     margin: "0.25rem 0 0.5rem 0",
//                   }}
//                 >
//                   ${plan.price}
//                 </p>
//               ) : (
//                 <p
//                   style={{
//                     fontSize: "0.8rem",
//                     fontWeight: 600,
//                     color: "#6EBD8A",
//                     margin: "0.25rem 0 0.5rem 0",
//                   }}
//                 >
//                   {t?.free || "Free"}
//                 </p>
//               )}

//               <p
//                 style={{
//                   fontSize: "0.8rem",
//                   color: "var(--muted)",
//                   marginBottom: "0.5rem",
//                 }}
//               >
//                 {plan.description}
//               </p>

//               <ul
//                 style={{
//                   listStyle: "none",
//                   padding: 0,
//                   margin: "0.5rem 0 0 0",
//                 }}
//               >
//                 {plan.features.slice(0, 3).map((feature, idx) => (
//                   <li
//                     key={idx}
//                     style={{
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "0.5rem",
//                       fontSize: "0.75rem",
//                       color: "var(--muted)",
//                       padding: "0.15rem 0",
//                     }}
//                   >
//                     <Check size={12} style={{ color: "#6EBD8A" }} />
//                     {feature}
//                   </li>
//                 ))}
//               </ul>

//               {!isActive && !isFree && (
//                 <button
//                   onClick={() => handleSelectPlan(plan.id)}
//                   style={{
//                     width: "100%",
//                     marginTop: "0.75rem",
//                     padding: "0.4rem",
//                     background: "var(--brand-color)",
//                     color: "#FDF8F3",
//                     border: "none",
//                     borderRadius: 6,
//                     fontSize: "0.8rem",
//                     fontWeight: 600,
//                     cursor: "pointer",
//                     transition: "all 0.2s",
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.opacity = "0.85";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.opacity = "1";
//                   }}
//                 >
//                   {t?.publishNow || "Publish Now"}
//                 </button>
//               )}

//               {isActive && !isFree && (
//                 <button
//                   disabled
//                   style={{
//                     width: "100%",
//                     marginTop: "0.75rem",
//                     padding: "0.4rem",
//                     background: "var(--bg3)",
//                     color: "var(--dim)",
//                     border: "none",
//                     borderRadius: 6,
//                     fontSize: "0.8rem",
//                     fontWeight: 600,
//                     cursor: "not-allowed",
//                   }}
//                 >
//                   {t?.active || "Active"}
//                 </button>
//               )}
//             </div>
//           );
//         })}
//       </div>

//       {/* Payment Modal */}
//       {showPayment && selectedPlan && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.6)",
//             backdropFilter: "blur(4px)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 1000,
//             padding: "1rem",
//           }}
//           onClick={(e) => {
//             if (e.target === e.currentTarget) {
//               setShowPayment(false);
//               setSelectedPlan(null);
//             }
//           }}
//         >
//           <div
//             style={{
//               background: "var(--card)",
//               border: "1px solid var(--border)",
//               borderRadius: 16,
//               maxWidth: 400,
//               width: "100%",
//               padding: "1.5rem",
//             }}
//           >
//             <h3
//               style={{
//                 fontFamily: "'Playfair Display', serif",
//                 fontSize: "1.1rem",
//                 fontWeight: 700,
//                 marginBottom: "0.25rem",
//               }}
//             >
//               {t?.confirmPublish || "Confirm Publishing"}
//             </h3>
//             <p
//               style={{
//                 color: "var(--muted)",
//                 fontSize: "0.9rem",
//                 marginBottom: "1.5rem",
//               }}
//             >
//               {t?.confirmPublishDesc ||
//                 "You are about to publish your app. This action cannot be undone."}
//             </p>

//             {(() => {
//               const plan = plans.find((p) => p.id === selectedPlan);
//               return (
//                 <div
//                   style={{
//                     background: "var(--bg2)",
//                     borderRadius: 8,
//                     padding: "1rem",
//                     marginBottom: "1.5rem",
//                   }}
//                 >
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       padding: "0.25rem 0",
//                     }}
//                   >
//                     <span style={{ color: "var(--muted)" }}>
//                       {t?.plan || "Plan"}
//                     </span>
//                     <span style={{ fontWeight: 600, color: "var(--text)" }}>
//                       {plan?.name}
//                     </span>
//                   </div>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       padding: "0.25rem 0",
//                       borderTop: "1px solid var(--border)",
//                     }}
//                   >
//                     <span style={{ color: "var(--muted)" }}>
//                       {t?.price || "Price"}
//                     </span>
//                     <span
//                       style={{ fontWeight: 700, color: "var(--brand-color)" }}
//                     >
//                       ${plan?.price}
//                     </span>
//                   </div>
//                 </div>
//               );
//             })()}

//             <div style={{ display: "flex", gap: "0.75rem" }}>
//               <button
//                 onClick={() => {
//                   setShowPayment(false);
//                   setSelectedPlan(null);
//                 }}
//                 style={{
//                   flex: 1,
//                   padding: "0.6rem",
//                   background: "transparent",
//                   border: "1px solid var(--border)",
//                   borderRadius: 8,
//                   color: "var(--text)",
//                   fontSize: "0.9rem",
//                   cursor: "pointer",
//                   transition: "all 0.2s",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.borderColor = "var(--brand-color)";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.borderColor = "var(--border)";
//                 }}
//               >
//                 {t?.cancel || "Cancel"}
//               </button>
//               <button
//                 onClick={handlePayment}
//                 disabled={isLoading}
//                 style={{
//                   flex: 1,
//                   padding: "0.6rem",
//                   background: "var(--brand-color)",
//                   color: "#FDF8F3",
//                   border: "none",
//                   borderRadius: 8,
//                   fontSize: "0.9rem",
//                   cursor: isLoading ? "not-allowed" : "pointer",
//                   opacity: isLoading ? 0.6 : 1,
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "0.5rem",
//                   transition: "all 0.2s",
//                 }}
//               >
//                 <CreditCard size={16} />
//                 {isLoading
//                   ? t?.processing || "Processing..."
//                   : t?.payNow || "Pay Now"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
