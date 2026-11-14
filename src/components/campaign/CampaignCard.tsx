// src/components/campaign/CampaignCard.tsx
//
// The reusable mascot-morph campaign card. There is no card "top": the
// mascot's neck and shoulders ARE the top edge, and the glass panel below is
// the mascot's body, so the head breaks out and the torso dissolves into the
// copy area. The CTA straddles the bottom border line like a badge pinned to
// the rim. Content comes from a config object; the visual identity lives
// entirely in campaign-card.css.
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
  /**
   * Accent headline line. May contain the token `{amount}`; when `amount` is
   * also supplied, the token is rendered as the big flared hero figure
   * (e.g. "GET {amount} FREE." -> GET [ $10 ] FREE.).
   */
  headlineAccent?: string;
  /** The reward figure to feature as the hero (e.g. "$10"). */
  amount?: string;
  /**
   * The local-currency equivalent of the reward, shown directly beneath it.
   * `value` is the converted figure (e.g. "₦16,400"); `caption` is a short
   * note (e.g. "at today's rate"). Omitted when already in the user's currency.
   */
  conversion?: { value: string; caption?: string };
  /** Up to three short benefit labels. */
  benefits?: string[];
  /** CTA label. */
  cta: string;
  /** Called when the CTA is activated. */
  onCta?: () => void;
  /** When set, a close (X) control is shown at the card's top-right. */
  onClose?: () => void;
  /** Optional href; when set the CTA renders as a link. */
  ctaHref?: string;
  /** Colour identity. "brand" derives from the store's --brand-color. */
  theme?: CampaignTheme;
  /** Mascot image src. */
  mascotSrc?: string;
  /** Mascot alt text. */
  mascotAlt?: string;
}

const AMOUNT_TOKEN = "{amount}";

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
    amount,
    conversion,
    benefits = [],
    cta,
    onCta,
    onClose,
    ctaHref,
    theme = "brand",
    mascotSrc = "/campaign/goat-mascot.webp",
    mascotAlt = "Campaign mascot",
  } = config;

  const themeClass = theme === "brand" ? "" : ` campaign-theme--${theme}`;

  const ctaContent = (
    <>
      <span className="campaign-cta__label">{cta}</span>
      <span className="campaign-cta__arrow" aria-hidden="true">
        →
      </span>
    </>
  );

  // Split "GET {amount} FREE." around the token so the figure can be the hero.
  const hasHero = !!amount && !!headlineAccent?.includes(AMOUNT_TOKEN);
  const [heroPre, heroPost] = hasHero
    ? (headlineAccent as string).split(AMOUNT_TOKEN).map((s) => s.trim())
    : ["", ""];
  const amountClass =
    amount && amount.length > 4
      ? "campaign-amount campaign-amount--long"
      : "campaign-amount";

  return (
    <article
      className={`goat-campaign-card${themeClass}${className ? ` ${className}` : ""}`}
    >
      {onClose && (
        <button
          type="button"
          className="campaign-close"
          aria-label="Dismiss"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}

      {/* The mascot's body: a glass dome with no top edge or top border. */}
      <div className="campaign-panel" aria-hidden="true">
        <div className="campaign-atmosphere" />
        <div className="campaign-orb campaign-orb--one" />
        <div className="campaign-orb campaign-orb--two" />
      </div>

      {/* The mascot: head above the card, neck/shoulders on the top line, torso
          fading into the panel. */}
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
          <span className="campaign-title__line">{headline}</span>

          {hasHero ? (
            <span className="campaign-hero">
              {heroPre && <span className="campaign-hero__word">{heroPre}</span>}
              <span className="campaign-amount-wrap">
                <span className="campaign-flare" aria-hidden="true" />
                <span className={amountClass}>{amount}</span>
                <i className="campaign-spark campaign-spark--a" aria-hidden="true" />
                <i className="campaign-spark campaign-spark--b" aria-hidden="true" />
                <i className="campaign-spark campaign-spark--c" aria-hidden="true" />
              </span>
              {heroPost && (
                <span className="campaign-hero__word">{heroPost}</span>
              )}
            </span>
          ) : (
            headlineAccent && (
              <span className="campaign-title__accent">{headlineAccent}</span>
            )
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

        {/* Absolutely positioned: straddles the card's bottom border line. */}
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
