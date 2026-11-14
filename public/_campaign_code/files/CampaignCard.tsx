// src/components/campaign/CampaignCard.tsx
//
// The reusable mascot-morph campaign card. The mascot's head breaks above the
// top edge and its body dissolves into the square glass panel behind the copy,
// so the mascot reads as the card itself. Content comes from a config object;
// the visual identity lives entirely in campaign-card.css.
"use client";

import "./campaign-card.css";

export type CampaignTheme =
  | "brand"
  | "green"
  | "gold"
  | "blue"
  | "purple"
  | "black";

export interface CampaignConfig {
  /** Short campaign identifier shown in the eyebrow pill. */
  eyebrow: string;
  /** First headline line, rendered in white. */
  headline: string;
  /** Accent headline line, rendered in the theme accent colour. */
  headlineAccent?: string;
  /**
   * The local-currency equivalent of the headline reward, shown directly
   * beneath it. `value` is the converted figure (e.g. "₦16,400"); `caption`
   * is a short note (e.g. "at today's rate"). Omitted when the reward is
   * already in the user's own currency.
   */
  conversion?: { value: string; caption?: string };
  /** Up to three short benefit labels. */
  benefits?: string[];
  /** CTA label. */
  cta: string;
  /** Called when the CTA is activated. */
  onCta?: () => void;
  /** Optional href; when set the CTA renders as a link. */
  ctaHref?: string;
  /** Colour identity. "brand" derives from the store's --brand-color. */
  theme?: CampaignTheme;
  /** Mascot image src. */
  mascotSrc?: string;
  /** Mascot alt text. */
  mascotAlt?: string;
}

export default function CampaignCard({
  config,
  className,
}: {
  config: CampaignConfig;
  className?: string;
}) {
  const {
    eyebrow,
    headline,
    headlineAccent,
    conversion,
    benefits = [],
    cta,
    onCta,
    ctaHref,
    theme = "brand",
    mascotSrc = "/campaign/goat-mascot.webp",
    mascotAlt = "Campaign mascot",
  } = config;

  const themeClass = theme === "brand" ? "" : ` campaign-theme--${theme}`;

  const ctaContent = (
    <>
      {cta} <span aria-hidden="true">→</span>
    </>
  );

  return (
    <article
      className={`goat-campaign-card${themeClass}${className ? ` ${className}` : ""}`}
    >
      <div className="campaign-panel" aria-hidden="true">
        <div className="campaign-atmosphere" />
        <div className="campaign-orb campaign-orb--one" />
        <div className="campaign-orb campaign-orb--two" />
      </div>

      <div
        className="campaign-mascot"
        aria-hidden="true"
        style={{ "--mascot-url": `url(${mascotSrc})` } as React.CSSProperties}
      >
        <div className="campaign-mascot__glow" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="campaign-mascot__image"
          src={mascotSrc}
          alt={mascotAlt}
        />
        {/* Colour-grades the mascot to the reseller's theme hue: masked to the
            mascot's own silhouette, then blended so it keeps its shading. */}
        <span className="campaign-mascot__grade" />
      </div>

      <div className="campaign-content">
        <span className="campaign-eyebrow">{eyebrow}</span>

        <h2 className="campaign-title">
          {headline}
          {headlineAccent && (
            <>
              <br />
              <span>{headlineAccent}</span>
            </>
          )}
        </h2>

        {conversion && (
          <p className="campaign-conversion">
            <span className="campaign-conversion__value">
              {conversion.value}
            </span>
            {conversion.caption && (
              <span className="campaign-conversion__caption">
                {conversion.caption}
              </span>
            )}
          </p>
        )}

        {benefits.length > 0 && (
          <div className="campaign-benefits">
            {benefits.slice(0, 3).map((b) => (
              <div className="campaign-benefit" key={b}>
                {b}
              </div>
            ))}
          </div>
        )}

        {ctaHref ? (
          <a className="campaign-cta" href={ctaHref}>
            {ctaContent}
          </a>
        ) : (
          <button type="button" className="campaign-cta" onClick={onCta}>
            {ctaContent}
          </button>
        )}
      </div>
    </article>
  );
}
