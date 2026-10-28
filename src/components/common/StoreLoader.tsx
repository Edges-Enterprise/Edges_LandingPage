// src/components/common/StoreLoader.tsx

/** Platform name, used where no store is in context (auth, admin, redirects). */
export const PLATFORM_LABEL = "Edges Network";

/**
 * Builds the label shown above the loading bar: "<store name> Store".
 *
 * Prefers the store's display name and falls back to title-casing the slug
 * (`toms-sub` -> "Toms Sub"), so a route-level loader that only knows the
 * URL still reads as the store. Names that already end in "Store" are left
 * alone rather than doubled.
 */
export function storeLabel(
  name?: string | null,
  slug?: string | null,
): string {
  const base =
    name?.trim() ||
    (slug
      ? slug
          .split("-")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "");

  if (!base) return PLATFORM_LABEL;
  return /store$/i.test(base) ? base : `${base} Store`;
}

interface StoreLoaderProps {
  /**
   * What to show above the bar. A store name ("Simi Store") or a platform
   * name ("Edges Network") — see the call sites for which is which.
   */
  label: string;
  /**
   * Fill the viewport (route-level loads) instead of the default 60vh
   * block used inside a page.
   */
  fullScreen?: boolean;
  /**
   * Render on an always-dark surface regardless of the active theme. Used
   * by surfaces that are always dark (the deep-link redirect, the legacy
   * reseller shell).
   */
  dark?: boolean;
  /** Minimum height, overriding the `fullScreen`/default choice. */
  minHeight?: string;
}

/**
 * The shared loading indicator: the store (or platform) name with a
 * horizontal bar underneath that sweeps back and forth.
 *
 * The bar is pure CSS, so it animates identically before hydration and
 * inside a `<Suspense>` fallback. Colors come from the same CSS custom
 * properties the surrounding surface already sets (`--text`, `--brand-color`,
 * `--accent`), with literals as fallbacks so a surface that sets none still
 * renders something legible.
 */
export default function StoreLoader({
  label,
  fullScreen = false,
  dark = false,
  minHeight,
}: StoreLoaderProps) {
  const textColor = dark ? "#F5F0EB" : "var(--text, #1A1A1A)";
  const trackColor = dark
    ? "rgba(255,255,255,0.12)"
    : "var(--border2, rgba(0,0,0,0.12))";
  const barColor = dark
    ? "var(--brand-color, #C98A54)"
    : "var(--accent, var(--brand-color, #C98A54))";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: minHeight ?? (fullScreen ? "100vh" : "60vh"),
        gap: "0.75rem",
        padding: "2rem",
      }}
    >
      <p
        style={{
          margin: 0,
          color: textColor,
          fontSize: "1.05rem",
          fontWeight: 600,
          letterSpacing: "0.01em",
          textAlign: "center",
        }}
      >
        {label}
      </p>
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: 160,
          maxWidth: "60vw",
          height: 4,
          borderRadius: 999,
          background: trackColor,
          overflow: "hidden",
        }}
      >
        <span
          className="store-loader-bar"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "40%",
            borderRadius: 999,
            background: barColor,
          }}
        />
      </div>
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          borderWidth: 0,
        }}
      >
        Loading
      </span>
    </div>
  );
}
