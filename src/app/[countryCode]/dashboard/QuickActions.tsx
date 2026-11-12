// src/app/[countryCode]/dashboard/QuickActions.tsx
"use client";

import { Wallet, Users, Smartphone, Share2, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface QuickActionsProps {
  countryCode: string;
  storeSlug: string;
  storeName?: string;
  translations: any;
}

export default function QuickActions({
  countryCode,
  storeSlug,
  storeName,
  translations,
}: QuickActionsProps) {
  const t = translations;
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The storefront path; the absolute URL (for sharing/copying) is derived in
  // the browser so a shared link is usable as-is. Mirrors the store page's
  // Share control.
  const storeUrl = `/${countryCode}/${storeSlug}`;
  const absoluteStoreUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${storeUrl}`
      : `${process.env.NEXT_PUBLIC_APP_URL || ""}${storeUrl}`;

  const storeLabel = storeName || storeSlug;

  const handleShare = async () => {
    const shareText = (
      t?.shareStoreText ||
      "Check out my store on {store} — order data, airtime and more!"
    ).replace("{store}", storeLabel);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t?.shareStoreTitle || "Share your store",
          text: shareText,
          url: absoluteStoreUrl,
        });
        return;
      } catch (err) {
        // AbortError = the user dismissed the sheet; fall through to the
        // copy-link popover so the action still does something useful.
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    setShareOpen((open) => !open);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteStoreUrl);
    } catch {
      const input = document.createElement("input");
      input.value = absoluteStoreUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actions = [
    {
      icon: Wallet,
      label: t?.fundWallet || "Fund Wallet",
      href: `/${countryCode}/dashboard/wallet`,
      color: "#10B981",
    },
    {
      icon: Users,
      label: t?.addCustomer || "Add Customer",
      href: `/${countryCode}/dashboard/customers`,
      color: "#3B82F6",
    },
    {
      icon: Share2,
      label: t?.shareStore || "Share Store",
      onClick: handleShare,
      color: "#8B5CF6",
    },
    {
      icon: Smartphone,
      label: t?.publishApp || "Publish App",
      href: `/${countryCode}/dashboard/publishing`,
      color: "#F59E0B",
    },
  ];

  const actionStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.6rem 1rem",
    background: "var(--bg2)",
    borderRadius: 8,
    color: "var(--text)",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 500,
    transition: "all 0.2s",
    border: "1px solid transparent",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  };

  const hoverIn = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "var(--border)";
    e.currentTarget.style.background = "var(--bg3)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = "transparent";
    e.currentTarget.style.background = "var(--bg2)";
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
        }}
      >
        {t?.quickActions || "Quick Actions"}
      </h3>

      <div
        className="quick-actions-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          padding: "1.5rem",
        }}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;

          // Share Store opens the native share sheet (or a copy-link popover
          // where unsupported) instead of navigating.
          if (action.onClick) {
            return (
              <div
                key={index}
                className="quick-action-share"
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  onClick={action.onClick}
                  aria-haspopup="dialog"
                  aria-expanded={shareOpen}
                  aria-label={action.label}
                  style={actionStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                >
                  <Icon size={16} style={{ color: action.color }} />
                  {action.label}
                </button>

                {shareOpen && (
                  <>
                    <div
                      onClick={() => setShareOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 40 }}
                    />
                    <div
                      role="dialog"
                      aria-label={t?.shareStoreTitle || "Share your store"}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "calc(100% + 0.5rem)",
                        zIndex: 50,
                        width: 300,
                        maxWidth: "90vw",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        padding: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={absoluteStoreUrl}
                          readOnly
                          onFocus={(e) => e.currentTarget.select()}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "0.5rem 0.75rem",
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                            fontSize: "0.8rem",
                            fontFamily: "monospace",
                            outline: "none",
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCopy}
                          title={t?.copyLink || "Copy link"}
                          aria-label={t?.copyLink || "Copy link"}
                          style={{
                            flexShrink: 0,
                            padding: "0.5rem 0.7rem",
                            background: copied
                              ? "rgba(110,189,138,0.15)"
                              : "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: copied ? "#6EBD8A" : "var(--text)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            fontSize: "0.8rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {copied ? <Check size={15} /> : <Share2 size={15} />}
                          {copied ? t?.copied || "Copied" : t?.copyLink || "Copy link"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={index}
              href={action.href}
              style={actionStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <Icon size={16} style={{ color: action.color }} />
              {action.label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .quick-actions-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
            padding: 0.5rem 0 !important;
          }
          .quick-actions-grid > a,
          .quick-actions-grid > .quick-action-share > button {
            padding: 0.6rem 0.65rem !important;
            font-size: 0.78rem !important;
          }
        }
      `}</style>
    </div>
  );
}
