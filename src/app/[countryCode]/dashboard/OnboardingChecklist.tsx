// src/app/[countryCode]/dashboard/OnboardingChecklist.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  Circle,
  CreditCard,
  Rocket,
  Settings2,
  Store,
  Wallet,
  X,
} from "lucide-react";
import type { CountryConfig } from "@/config/countries";
import {
  buildOnboardingSteps,
  isOnboardingComplete,
  type OnboardingSignals,
  type OnboardingStepKey,
} from "@/lib/onboarding/steps";
import {
  completeOnboarding,
  dismissOnboarding,
  markStorefrontVisited,
} from "@/app/actions/reseller/onboarding/onboarding";

/** The payload get_reseller_onboarding() returns. */
export interface OnboardingStatus {
  reseller_id: string;
  country_code: string | null;
  store_slug: string | null;
  dismissed_at: string | null;
  visited_storefront: boolean;
  completed_at: string | null;
  signals: OnboardingSignals;
  error?: string;
}

interface OnboardingChecklistProps {
  countryCode: string;
  config: CountryConfig;
  status: OnboardingStatus | null;
  translations: any;
}

const STEP_ICONS: Record<OnboardingStepKey, typeof Wallet> = {
  virtual_account: CreditCard,
  fund_wallet: Wallet,
  set_markup: Settings2,
  publish: Rocket,
  visit_storefront: Store,
};

/**
 * Task 9 — the in-dashboard guided setup checklist.
 *
 * Rendered above Quick Actions on the Overview. It shows the reseller's
 * remaining setup steps (deep-linking to the existing pages), a progress
 * counter, and a dismiss control; once every applicable step is done it
 * becomes the congratulation banner and stamps completed_at once.
 */
export default function OnboardingChecklist({
  countryCode,
  config,
  status,
  translations,
}: OnboardingChecklistProps) {
  const t = translations?.onboarding;
  const router = useRouter();

  // Decision 2: a dismissal hides the guide for the rest of THIS session
  // (surviving a reload) but the guide returns on the next login while any
  // step is unfinished. sessionStorage is exactly session-scoped, so it holds
  // the "already dismissed" flag without hiding the guide forever.
  const dismissKey = status?.reseller_id
    ? `onboarding-dismissed:${status.reseller_id}`
    : null;
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const completedRef = useRef(false);

  const steps =
    status && !status.error
      ? buildOnboardingSteps(
          config,
          countryCode,
          status.store_slug,
          status.signals,
        )
      : [];
  const complete = isOnboardingComplete(steps);
  const doneCount = steps.filter((s) => s.done).length;

  // Honour a dismissal from earlier in this session (after mount, so the
  // server and first client render agree — no hydration mismatch).
  useEffect(() => {
    if (dismissKey && sessionStorage.getItem(dismissKey) === "1") {
      setHidden(true);
    }
  }, [dismissKey]);

  // Stamp completion once, then refresh so the dashboard reflects it. A ref
  // guards against a re-render firing it twice.
  useEffect(() => {
    if (!complete || status?.completed_at || completedRef.current) return;
    completedRef.current = true;
    completeOnboarding().finally(() => router.refresh());
  }, [complete, status?.completed_at, router]);

  if (!status || status.error || steps.length === 0) return null;
  if (hidden && !complete) return null;

  async function handleDismiss() {
    setBusy(true);
    if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    setHidden(true);
    await dismissOnboarding();
    setBusy(false);
    router.refresh();
  }

  function handleVisitStorefront() {
    // Decision 3: opening the storefront is the completion signal. Fire the
    // RPC (fire-and-forget) then let the link open the public page.
    void markStorefrontVisited().then(() => router.refresh());
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.25rem 1.5rem",
    marginBottom: "1.5rem",
  };

  if (complete) {
    return (
      <div
        style={{
          ...cardStyle,
          borderColor: "rgba(16,185,129,0.4)",
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.10), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <BadgeCheck size={22} style={{ color: "#10B981" }} />
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.05rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.complete?.title || "Store setup complete"}
          </h3>
        </div>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.85rem",
            margin: "0.5rem 0 1rem",
          }}
        >
          {t?.complete?.body ||
            "You're all set — share your store and make your first sale."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          {status.store_slug && (
            <a
              href={`/${countryCode}/${status.store_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={ctaStyle(true)}
            >
              <Store size={15} />
              {t?.complete?.viewStore || "View your store"}
            </a>
          )}
          <a
            href={`/${countryCode}/dashboard/orders`}
            style={ctaStyle(false)}
          >
            {t?.complete?.viewOrders || "See your orders"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.title || "Finish setting up your store"}
          </h3>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.8rem",
              margin: "0.25rem 0 0",
            }}
          >
            {t?.progress
              ? t.progress.replace("{done}", String(doneCount)).replace(
                  "{total}",
                  String(steps.length),
                )
              : `${doneCount} of ${steps.length} steps complete`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={busy}
          aria-label={t?.dismiss || "Dismiss"}
          title={t?.dismiss || "Dismiss"}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: busy ? "default" : "pointer",
            padding: 4,
            lineHeight: 0,
          }}
        >
          <X size={18} />
        </button>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "1rem 0 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.key];
          const copy = t?.steps?.[step.key];
          const title = copy?.title || step.key;
          const blurb = copy?.blurb || "";
          const rowInner = (
            <>
              <span
                style={{
                  display: "inline-flex",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: step.done
                    ? "rgba(16,185,129,0.15)"
                    : "var(--bg2)",
                  color: step.done ? "#10B981" : "var(--muted)",
                }}
              >
                {step.done ? <Check size={16} /> : <Icon size={15} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    textDecoration: step.done ? "line-through" : "none",
                    color: step.done ? "var(--muted)" : "var(--text)",
                  }}
                >
                  {title}
                </span>
                {blurb && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.76rem",
                      color: "var(--muted)",
                    }}
                  >
                    {blurb}
                  </span>
                )}
              </span>
            </>
          );

          const rowStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.5rem 0.6rem",
            borderRadius: 8,
            background: "var(--bg2)",
            textDecoration: "none",
            color: "inherit",
          };

          if (step.done) {
            return (
              <li key={step.key} style={rowStyle}>
                {rowInner}
              </li>
            );
          }

          return (
            <li key={step.key} style={{ listStyle: "none" }}>
              <a
                href={step.href}
                style={rowStyle}
                {...(step.external
                  ? {
                      target: "_blank",
                      rel: "noopener noreferrer",
                      onClick: handleVisitStorefront,
                    }
                  : {})}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg2)";
                }}
              >
                {rowInner}
                <Circle
                  size={16}
                  style={{ marginInlineStart: "auto", color: "var(--muted)" }}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ctaStyle(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.5rem 1rem",
    borderRadius: 8,
    fontSize: "0.83rem",
    fontWeight: 600,
    textDecoration: "none",
    background: primary ? "#10B981" : "var(--bg2)",
    color: primary ? "#fff" : "var(--text)",
    border: primary ? "1px solid #10B981" : "1px solid var(--border)",
  };
}
