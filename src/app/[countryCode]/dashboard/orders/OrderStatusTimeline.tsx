// src/app/[countryCode]/dashboard/orders/OrderStatusTimeline.tsx
"use client";

import { OrderStatusHistoryEntry } from "@/types/reseller/orders";

interface OrderStatusTimelineProps {
  entries: OrderStatusHistoryEntry[];
  translations: any;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

/**
 * Renders the status audit trail for one order: who moved it, from which
 * status to which, and when. Entries arrive newest-first from the server.
 */
export default function OrderStatusTimeline({
  entries,
  translations: t,
  getStatusColor,
  getStatusLabel,
}: OrderStatusTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          color: "var(--dim)",
          fontStyle: "italic",
        }}
      >
        {t?.noStatusChanges || "No status changes recorded yet"}
      </p>
    );
  }

  return (
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              marginTop: 5,
              flexShrink: 0,
              background: getStatusColor(entry.to_status),
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>
              {entry.from_status ? (
                <>
                  <span style={{ color: getStatusColor(entry.from_status) }}>
                    {getStatusLabel(entry.from_status)}
                  </span>
                  {" → "}
                </>
              ) : null}
              <span style={{ fontWeight: 600, color: getStatusColor(entry.to_status) }}>
                {getStatusLabel(entry.to_status)}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
              {entry.changed_by_email || t?.systemActor || "System"} ·{" "}
              {new Date(entry.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
