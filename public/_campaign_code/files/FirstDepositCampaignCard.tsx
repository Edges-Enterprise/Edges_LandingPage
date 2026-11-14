// src/components/campaign/FirstDepositCampaignCard.tsx
//
// The live campaign card shown at the top of the reseller dashboard. The card
// headline always states the base reward in USD ($10) as the big flared hero;
// the reseller's own currency equivalent sits directly beneath it, converted
// at the live FX rate. The card renders only while the reseller is still
// eligible (i.e. has not yet made an app-initiated deposit).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CampaignCard, { CampaignTheme } from "./CampaignCard";
import { getFirstDepositCampaignState } from "@/actions/reseller/campaigns/firstDepositCampaign";
import { formatCurrency } from "@/lib/utils/helpers";
import { openAppOrInstall } from "@/lib/utils/deepLink";

interface FirstDepositCampaignCardProps {
  /** The reseller's brand colour, so the card carries their identity. */
  brandColor?: string;
  /**
   * Optional campaign theme. Defaults to "brand", which derives the palette
   * from the store's own --brand-color.
   */
  theme?: CampaignTheme;
  /** In-app route the CTA should land on, e.g. "deposit" (default: app home). */
  deepLinkPath?: string;
  /** App Store / TestFlight page, used when the app is missing on iOS. */
  iosStoreUrl?: string;
  /** Play Store page; used on Android only if there is no APK build. */
  androidStoreUrl?: string;
  /** Translation strings; falls back to English. */
  translations?: {
    eyebrow?: string;
    headline?: string;
    /** May contain {amount}, which becomes the big flared figure. */
    headlineAccent?: string;
    benefit1?: string;
    benefit2?: string;
    benefit3?: string;
    cta?: string;
    /** Caption under the converted figure, e.g. "at today's rate". */
    conversionCaption?: string;
  };
}

/** The base reward, always shown as USD. */
const USD_REWARD = 10;

/** Remembers that the reseller dismissed the card, so it stays closed. */
const DISMISS_KEY = "edges:first-deposit-campaign:dismissed";

export default function FirstDepositCampaignCard({
  brandColor,
  theme = "brand",
  deepLinkPath,
  iosStoreUrl,
  androidStoreUrl,
  translations,
}: FirstDepositCampaignCardProps) {
  const [state, setState] = useState<{
    eligible: boolean;
    localAmount: number | null;
    currency: string;
    hasVirtualAccount: boolean;
    apkUrl: string | null;
    packageName: string | null;
    appScheme: string | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    getFirstDepositCampaignState().then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
  }, []);

  // Honour a previous dismissal (this browser only).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* localStorage can throw in private mode — treat as not dismissed. */
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // A tap anywhere outside the card also dismisses it.
  useEffect(() => {
    if (dismissed) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dismissed, dismiss]);

  // Render nothing until we know eligibility, and nothing once claimed or
  // dismissed.
  if (!state || !state.eligible || dismissed) return null;

  const t = translations || {};

  /** One tap: open the app if it is installed, otherwise send them to install. */
  const openApp = () => {
    const androidFallback = state.apkUrl || androidStoreUrl || null;
    openAppOrInstall({
      scheme: state.appScheme || "edges-network",
      path: deepLinkPath,
      androidPackage: state.packageName,
      androidFallbackUrl: androidFallback,
      iosFallbackUrl: iosStoreUrl || null,
      desktopFallbackUrl: androidFallback,
    });
  };

  // The hero states the base reward in USD; the reseller's own currency
  // conversion is shown directly beneath it. When the wallet is already USD
  // the conversion is redundant, so it is omitted. "$10.00" -> "$10".
  const usdText = formatCurrency(USD_REWARD, "USD").replace(/[.,]00$/, "");
  const isLocalCurrency =
    state.currency.toUpperCase() !== "USD" && state.localAmount !== null;
  const localText =
    state.localAmount !== null
      ? formatCurrency(state.localAmount, state.currency)
      : null;

  const conversion =
    isLocalCurrency && localText
      ? {
          value: localText,
          caption: t.conversionCaption || `at today's rate · ${state.currency}`,
        }
      : undefined;

  return (
    <div
      ref={rootRef}
      className="first-deposit-campaign"
      style={
        brandColor
          ? ({ "--brand-color": brandColor } as React.CSSProperties)
          : undefined
      }
    >
      <CampaignCard
        config={{
          theme,
          eyebrow: t.eyebrow || "LIMITED-TIME OFFER",
          headline: t.headline || "DEPOSIT IN THE APP.",
          headlineAccent: t.headlineAccent || "GET {amount} FREE.",
          amount: usdText,
          conversion,
          benefits: [
            t.benefit1 || "⚡ Instant top-up",
            t.benefit2 || "🎁 Bonus credit",
            t.benefit3 || "🔒 Secure deposit",
          ],
          cta: t.cta || "Deposit now",
          onCta: openApp,
          onClose: dismiss,
        }}
      />
    </div>
  );
}
