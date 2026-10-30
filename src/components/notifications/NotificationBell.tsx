// src/components/notifications/NotificationBell.tsx
//
// The header bell and its popover, shared by the reseller dashboard header and
// the storefront header. Both previously rendered a button with no handler
// (the dashboard's carried a hardcoded red dot; the storefront's was labelled
// "(placeholder)").
//
// The badge is the real unread count from the caller's own inbox; the panel
// itself lives in NotificationPanel, which the storefront's mobile drawer also
// renders (as a modal).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import NotificationPanel from "./NotificationPanel";
import { getStoreUnreadCount } from "@/actions/reseller/notifications/storeNotifications";

interface NotificationBellProps {
  /**
   * global_reseller_applications.id — which store's inbox to open. Omitted on
   * the dashboard, where the caller is the owner and the store is resolved
   * from their own session; the storefront always passes it.
   */
  resellerId?: string;
  /** "light" for the storefront's brand-coloured header, "dark" elsewhere. */
  variant?: "dark" | "light";
  iconSize?: number;
  translations?: any;
}

export default function NotificationBell({
  resellerId,
  variant = "dark",
  iconSize = 20,
  translations,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const light = variant === "light";

  const loadCount = useCallback(async () => {
    const { count } = await getStoreUnreadCount(resellerId);
    setUnread(count);
  }, [resellerId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // Keep the badge honest without a page reload: refresh when the tab is
  // brought back to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadCount]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={translations?.notifications || "Notifications"}
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          color: light ? "rgba(255,255,255,0.9)" : "var(--accent)",
          cursor: "pointer",
          padding: "0.5rem",
          borderRadius: "50%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = light
            ? "rgba(255,255,255,0.12)"
            : "var(--bg2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Bell size={iconSize} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              background: "#EF4444",
              color: "#FFFFFF",
              borderRadius: 100,
              border: `2px solid ${light ? "transparent" : "var(--bg)"}`,
              fontSize: "0.6rem",
              fontWeight: 700,
              lineHeight: "12px",
              textAlign: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          resellerId={resellerId}
          presentation="popover"
          translations={translations}
          onUnreadChange={setUnread}
        />
      )}
    </div>
  );
}
