// src/components/notifications/NotificationPanel.tsx
//
// The notification inbox itself: the list, mark-one-read and mark-all-read.
// Shared by the header bell (a popover) and the storefront's mobile drawer
// (a modal), so both present the same inbox.
//
// Reads and writes go through src/actions/reseller/notifications/
// storeNotifications.ts, which resolves the caller from their session - the
// audience is never decided by this component.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import {
  getStoreNotifications,
  markAllStoreNotificationsRead,
  markStoreNotificationRead,
} from "@/actions/reseller/notifications/storeNotifications";
import type { StoreNotification } from "@/lib/notifications/types";

export interface NotificationPanelProps {
  /**
   * global_reseller_applications.id — which store's inbox to open. Omitted on
   * the dashboard, where the caller is the owner and the store is resolved
   * from their own session; the storefront always passes it.
   */
  resellerId?: string;
  /** "popover" is anchored to the bell; "modal" is a centred overlay. */
  presentation?: "popover" | "modal";
  /** Called after mark-all-read and whenever the unread count changes. */
  onUnreadChange?: (count: number) => void;
  onClose?: () => void;
  translations?: any;
}

const TYPE_ACCENT: Record<string, string> = {
  deposit: "#6EBD8A",
  purchase: "#C98A54",
  order: "#C98A54",
  support: "#8B5CF6",
  build: "#3B82F6",
  system: "#F59E0B",
};

function formatRelative(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotificationPanel({
  resellerId,
  presentation = "popover",
  onUnreadChange,
  onClose,
  translations,
}: NotificationPanelProps) {
  const t = translations;
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishUnread = useCallback(
    (count: number) => {
      setUnread(count);
      onUnreadChange?.(count);
    },
    [onUnreadChange],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { notifications: rows, error: readError } =
        await getStoreNotifications(resellerId);
      if (cancelled) return;
      setNotifications(rows);
      publishUnread(rows.filter((n) => !n.is_read).length);
      setError(readError || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [resellerId, publishUnread]);

  const handleMarkOne = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;
    setBusy(true);
    // Optimistic: the row is already on screen, the write is scoped server-side.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    publishUnread(Math.max(0, unread - 1));
    const result = await markStoreNotificationRead(resellerId, id);
    if (!result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
      );
      publishUnread(unread + 1);
      setError(result.error || "Could not mark as read");
    }
    setBusy(false);
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    const previous = notifications;
    setBusy(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    publishUnread(0);
    const result = await markAllStoreNotificationsRead(resellerId);
    if (!result.success) {
      setNotifications(previous);
      publishUnread(previous.filter((n) => !n.is_read).length);
      setError(result.error || "Could not mark all as read");
    }
    setBusy(false);
  };

  const panelBorder = "1px solid var(--border, rgba(201,138,84,0.18))";
  const panelBg = "var(--card, #16120F)";

  const body = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          borderBottom: panelBorder,
          position: "sticky",
          top: 0,
          background: panelBg,
          zIndex: 1,
        }}
      >
        <strong style={{ fontSize: "0.85rem", color: "var(--text, #F5EFE9)" }}>
          {t?.notifications || "Notifications"}
        </strong>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <button
            onClick={handleMarkAll}
            disabled={busy || unread === 0}
            style={{
              background: "transparent",
              border: "none",
              color:
                busy || unread === 0
                  ? "var(--dim, #7A6F66)"
                  : "var(--brand-color, #C98A54)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: busy || unread === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.4rem",
              borderRadius: 6,
            }}
          >
            <Check size={13} />
            {t?.markAllRead || "Mark all read"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label={t?.close || "Close"}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted, #A79A8F)",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: "2rem",
            display: "flex",
            justifyContent: "center",
            color: "var(--muted, #A79A8F)",
          }}
        >
          <Loader2 size={20} className="notification-spin" />
        </div>
      ) : error && notifications.length === 0 ? (
        <p
          style={{
            padding: "1.25rem 1rem",
            margin: 0,
            fontSize: "0.8rem",
            color: "#EF4444",
          }}
        >
          {error}
        </p>
      ) : notifications.length === 0 ? (
        <p
          style={{
            padding: "1.5rem 1rem",
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--muted, #A79A8F)",
            textAlign: "center",
          }}
        >
          {t?.noNotifications || "No notifications yet"}
        </p>
      ) : (
        notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleMarkOne(n.id)}
            style={{
              display: "flex",
              gap: "0.6rem",
              width: "100%",
              textAlign: "left",
              padding: "0.75rem 1rem",
              background: n.is_read ? "transparent" : "rgba(201,138,84,0.06)",
              border: "none",
              borderBottom: panelBorder,
              cursor: n.is_read ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                marginTop: 6,
                flexShrink: 0,
                background:
                  TYPE_ACCENT[n.notification_type] ||
                  "var(--brand-color, #C98A54)",
                opacity: n.is_read ? 0.35 : 1,
              }}
            />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  lineHeight: 1.35,
                  color: n.is_read
                    ? "var(--muted, #A79A8F)"
                    : "var(--text, #F5EFE9)",
                }}
              >
                {n.message}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.68rem",
                  color: "var(--dim, #7A6F66)",
                  marginTop: "0.2rem",
                }}
              >
                {formatRelative(n.created_at)}
              </span>
            </span>
          </button>
        ))
      )}

      <style>{`
        .notification-spin { animation: notification-spin 0.9s linear infinite; }
        @keyframes notification-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );

  if (presentation === "modal") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1300,
          padding: "1rem",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          role="dialog"
          aria-label={t?.notifications || "Notifications"}
          style={{
            width: 380,
            maxWidth: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            background: panelBg,
            border: panelBorder,
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t?.notifications || "Notifications"}
      style={{
        position: "absolute",
        top: "calc(100% + 0.5rem)",
        right: 0,
        width: 340,
        maxWidth: "calc(100vw - 2rem)",
        maxHeight: 420,
        overflowY: "auto",
        background: panelBg,
        border: panelBorder,
        borderRadius: 12,
        boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        zIndex: 1200,
      }}
    >
      {body}
    </div>
  );
}
