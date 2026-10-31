// src/app/[countryCode]/dashboard/ActivityDetailsModal.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, X } from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { Order, OrderStatusHistoryEntry } from "@/types/reseller/orders";
import { Customer } from "@/types/reseller/customers";
import { Build } from "@/types/reseller/publishing";
import OrderDetailsModal from "./orders/OrderDetailsModal";
import CustomerDetailsModal from "./customers/CustomerDetailsModal";
import BuildDetailsModal from "./publishing/BuildDetailsModal";

/** The shape the dashboard's activity RPC returns for one row. */
export interface ActivityItem {
  type: "order" | "customer" | "build" | "transaction";
  entity_id: string;
  created_at: string;
  data?: Record<string, any>;
}

interface ActivityDetailsModalProps {
  item: ActivityItem;
  config: CountryConfig;
  /** dashboard.json, for the loading/fallback copy this shell owns. */
  translations: any;
  /** The list pages' own translations, so each reused modal reads its keys. */
  ordersTranslations: any;
  customersTranslations: any;
  publishingTranslations: any;
  onClose: () => void;
}

/**
 * Opens one Recent Activity row's details on the overview page itself, so the
 * person never leaves the dashboard. The row only carries a summary, so the
 * full record is read here by id; the detail view is then the very same modal
 * the orders/customers pages use, for one consistent look.
 */
export default function ActivityDetailsModal({
  item,
  config,
  translations,
  ordersTranslations,
  customersTranslations,
  publishingTranslations,
  onClose,
}: ActivityDetailsModalProps) {
  const t = translations;
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<
    OrderStatusHistoryEntry[]
  >([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [build, setBuild] = useState<Build | null>(null);

  const loadCustomer = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("global_customers")
      .select("*")
      .eq("id", item.entity_id)
      .maybeSingle();
    setCustomer((data as Customer) || null);
  }, [item.entity_id]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const load = async () => {
      setIsLoading(true);
      try {
        if (item.type === "order") {
          const { data } = await supabase
            .from("global_orders")
            .select("*")
            .eq("id", item.entity_id)
            .maybeSingle();
          const { data: history } = await supabase
            .from("global_order_status_history")
            .select("*")
            .eq("order_id", item.entity_id)
            .order("created_at", { ascending: false });
          if (!active) return;
          setOrder((data as Order) || null);
          setStatusHistory((history as OrderStatusHistoryEntry[]) || []);
        } else if (item.type === "customer") {
          const { data } = await supabase
            .from("global_customers")
            .select("*")
            .eq("id", item.entity_id)
            .maybeSingle();
          if (!active) return;
          setCustomer((data as Customer) || null);
        } else if (item.type === "build") {
          const { data } = await supabase
            .from("global_app_builds")
            .select("*")
            .eq("id", item.entity_id)
            .maybeSingle();
          if (!active) return;
          setBuild((data as Build) || null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [item]);

  // The reused modals already own the overlay and the close button; this shell
  // only supplies one while the record is still being read.
  if (!isLoading) {
    if (item.type === "order" && order) {
      return (
        <OrderDetailsModal
          order={order}
          statusHistory={statusHistory}
          onClose={onClose}
          config={config}
          translations={ordersTranslations}
        />
      );
    }
    if (item.type === "customer" && customer) {
      return (
        <CustomerDetailsModal
          customer={customer}
          onClose={onClose}
          onUpdate={loadCustomer}
          config={config}
          translations={customersTranslations}
        />
      );
    }
    if (item.type === "build" && build) {
      return (
        <BuildDetailsModal
          build={build}
          config={config}
          translations={publishingTranslations}
          onClose={onClose}
        />
      );
    }
  }

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
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 420,
          width: "100%",
          padding: "1.5rem",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={onClose}
          aria-label={ordersTranslations?.close || "Close"}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.25rem",
          }}
        >
          <X size={20} />
        </button>

        {isLoading ? (
          <>
            <Loader2
              size={28}
              style={{
                color: "var(--brand-color)",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
              {t?.loadingDetails || "Loading details…"}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
            {t?.noDetails || "Details are not available for this item."}
          </p>
        )}
      </div>
    </div>
  );
}
