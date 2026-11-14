// src/components/campaign/FirstDepositCampaignCard.tsx
//
// The live campaign card shown at the top of the reseller dashboard. The card
// headline always states the base reward in USD ($10); the reseller's own
// currency equivalent is shown directly beneath it, converted at the live FX
// rate. The card renders only while the reseller is still eligible (i.e. has
// not yet made an app-initiated deposit).
"use client";

import { useEffect, useState } from "react";
import CampaignCard, { CampaignTheme } from "./CampaignCard";
import { getFirstDepositCampaignState } from "@/actions/reseller/campaigns/firstDepositCampaign";
import { formatCurrency } from "@/lib/utils/helpers";

interface FirstDepositCampaignCardProps {
  /** The reseller's brand colour, so the card carries their identity. */
  brandColor?: string;
  /**
   * Optional campaign theme. Defaults to "brand", which derives the palette
   * from the store's own --brand-color.
   */
  theme?: CampaignTheme;
  /** Translation strings; falls back to English. */
  translations?: {
    eyebrow?: string;
    headline?: string;
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

export default function FirstDepositCampaignCard({
  brandColor,
  theme = "brand",
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

  useEffect(() => {
    let active = true;
    getFirstDepositCampaignState().then((s) => {
      if (active) setState(s);
    });
    return () => {
      active = false;
    };
  }, []);

  // Render nothing until we know eligibility, and nothing once claimed.
  if (!state || !state.eligible) return null;

  const t = translations || {};

  /**
   * The CTA opens the reseller app if it is installed and falls back to the
   * APK download when it is not. On Android an `intent://` link with a
   * `browser_fallback_url` does both in one tap. On iOS the custom scheme is
   * tried first, and the APK (Android-only) is the last resort.
   */
  const openApp = () => {
    if (typeof window === "undefined") return;
    const scheme = state.appScheme || "edges-network";
    const ua = window.navigator.userAgent || "";
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid && state.packageName) {
      const fallback = state.apkUrl
        ? `browser_fallback_url=${encodeURIComponent(state.apkUrl)};`
        : "";
      window.location.href = `intent://#Intent;scheme=${scheme};package=${state.packageName};${fallback}end`;
      return;
    }

    if (isIOS) {
      window.location.href = `${scheme}://`;
      // If nothing handled the scheme the page stays put; send the user to the
      // storefront so they can install from there.
      window.setTimeout(() => {
        if (!document.hidden && state.apkUrl) window.location.href = state.apkUrl;
      }, 1800);
      return;
    }

    // Desktop / unknown: there is no app to open, so offer the download.
    if (state.apkUrl) window.open(state.apkUrl, "_blank", "noopener");
  };

  // The headline always states the base reward in USD; the reseller's own
  // currency conversion is shown directly beneath it. When the wallet is
  // already USD the conversion is redundant, so it is omitted.
  const usdText = formatCurrency(USD_REWARD, "USD");
  const isLocalCurrency =
    state.currency.toUpperCase() !== "USD" && state.localAmount !== null;
  const localText =
    state.localAmount !== null
      ? formatCurrency(state.localAmount, state.currency)
      : null;

  const headlineAccent = (t.headlineAccent || "GET {amount} FREE.").replace(
    "{amount}",
    usdText,
  );

  const conversion =
    isLocalCurrency && localText
      ? {
          value: localText,
          caption: t.conversionCaption || `at today's rate · ${state.currency}`,
        }
      : undefined;

  return (
    <div
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
          headlineAccent,
          conversion,
          benefits: [
            t.benefit1 || "⚡ Instant top-up",
            t.benefit2 || "🎁 Bonus credit",
            t.benefit3 || "🔒 Secure deposit",
          ],
          cta: t.cta || "Deposit now",
          onCta: openApp,
        }}
      />
    </div>
  );
}
