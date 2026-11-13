// src/app/[countryCode]/dashboard/plans/PlansClient.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Check,
  X,
  Loader2,
  Pencil,
  AlertTriangle,
  ChevronDown,
  Globe,
  LayoutList,
} from "lucide-react";
import { getPlans } from "@/actions/reseller/plans/getPlans";
import { togglePlan } from "@/actions/reseller/plans/togglePlan";
import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
import { CountryConfig } from "@/config/countries";
import { PlanWithConfig } from "@/types/reseller/plans";
import { formatPrice } from "@/lib/currency/currency";
import ThemeSelect from "../ThemeSelect";
import GlobalPlansPanel from "./GlobalPlansPanel";
import type { GlobalPlanFacets } from "@/actions/reseller/plans/globalPlansTypes";

interface PlansClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  initialData: {
    plans: PlanWithConfig[];
    networks: string[];
  };
  /** World view's first page, server-rendered so the globe opens instantly. */
  initialGlobalPlans?: PlanWithConfig[];
  initialGlobalTotal?: number;
  initialGlobalFacets?: GlobalPlanFacets | null;
}

export default function PlansClient({
  countryCode,
  config,
  translations,
  initialData,
  initialGlobalPlans,
  initialGlobalTotal,
  initialGlobalFacets,
}: PlansClientProps) {
  const t = translations;
  const [plansData, setPlansData] = useState<PlanWithConfig[]>(
    initialData.plans,
  );
  const [activeNetwork, setActiveNetwork] = useState<string>(
    initialData.networks.length > 0 ? initialData.networks[0] : "",
  );
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editType, setEditType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  // Same resting-0/empty-on-focus behaviour as the bulk value field, but the
  // resting value is the plan's current markup, so the field is cleared on
  // focus and restored from the ref on blur when the user types nothing.
  const [editValue, setEditValue] = useState<number | "">(0);
  const [editValueFocused, setEditValueFocused] = useState(false);
  const editValueBeforeFocus = useRef<number | "">(0);
  const [saving, setSaving] = useState(false);
  const [bulkType, setBulkType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  // The bulk field reflects the markup already applied to the selected
  // "Apply To" network (see the effect below), so a network the reseller
  // has bulk-updated shows its markup instead of a permanent resting 0.
  const [bulkValue, setBulkValue] = useState<number | "">(0);
  const [bulkSaving, setBulkSaving] = useState(false);
  // Which network the bulk update applies to: a specific network name, or
  // "all". Replaces the old {network|all} scope + implicit activeNetwork,
  // so the Apply To select can list every network the store offers.
  const [bulkNetwork, setBulkNetwork] = useState<string>(
    initialData.networks.length > 0 ? initialData.networks[0] : "all",
  );
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Only the mobile layout collapses a plan to name + toggle; the desktop
  // card always shows every detail inline.
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // The plans page has two views: the store's own (local) plans, and the
  // global/world view of every Zendit destination. The globe icon next to
  // the title switches between them.
  const [showGlobal, setShowGlobal] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const localCurrency = config.currency;
  const currencySymbol = config.currencySymbol || "₦";

  const formatLocalPrice = (amount: number) => {
    return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
  };

  const networks = initialData.networks || [];

  // Filter plans by active network
  const plans = useMemo(
    () => plansData.filter((p) => p.network === activeNetwork),
    [plansData, activeNetwork],
  );

  // The markup currently applied to the selected bulk scope, or null when the
  // scope has no configs (nothing applied) or mixed markups (nothing uniform
  // to show). "All Networks" only shows a value when every configured plan
  // across the store agrees on one.
  const bulkScopeMarkup = useMemo<{
    type: "percentage" | "fixed";
    value: number;
  } | null>(() => {
    const scoped =
      bulkNetwork === "all"
        ? plansData
        : plansData.filter((p) => p.network === bulkNetwork);
    const configs = scoped.filter((p) => p.config);
    if (configs.length === 0) return null;
    const first = configs[0].config!;
    const uniform = configs.every(
      (p) =>
        (p.config!.markup_type || "percentage") ===
          (first.markup_type || "percentage") &&
        Number(p.config!.markup_value || 0) === Number(first.markup_value || 0),
    );
    if (!uniform) return null;
    return {
      type: first.markup_type === "fixed" ? "fixed" : "percentage",
      value: Number(first.markup_value || 0),
    };
  }, [plansData, bulkNetwork]);

  // Mirror the selected scope's applied markup into the fields. Runs when the
  // "Apply To" scope changes and whenever the underlying configs change (e.g.
  // a plan edit), but not while a bulk apply is in flight — that path sets the
  // fields optimistically itself.
  useEffect(() => {
    if (bulkSaving) return;
    setBulkType(bulkScopeMarkup?.type ?? "percentage");
    setBulkValue(bulkScopeMarkup ? bulkScopeMarkup.value : 0);
  }, [bulkScopeMarkup, bulkSaving]);

  // True only when the whole scope is already exactly what an apply would
  // write: every plan carries a config, every config is enabled, and they all
  // share one markup. A bulk apply also ENABLES the plans it touches, so a
  // scope with a disabled plan is not "already applied" — clicking Apply would
  // still change something. This keeps the message from blocking real work.
  const bulkScopeFullyApplied = useMemo(() => {
    const scoped =
      bulkNetwork === "all"
        ? plansData
        : plansData.filter((p) => p.network === bulkNetwork);
    return (
      scoped.length > 0 &&
      scoped.every((p) => !!p.config && p.config.enabled === true)
    );
  }, [plansData, bulkNetwork]);

  // True when the current field values already match the markup applied to the
  // selected scope, across the whole scope. Re-applying that exact markup would
  // be a no-op write, so a click on Apply is answered with an informational
  // message instead of re-running the update, and the button's label/tooltip
  // says so up front.
  const bulkValueNumber = bulkValue === "" ? 0 : bulkValue;
  const bulkAlreadyApplied =
    bulkScopeMarkup !== null &&
    bulkScopeFullyApplied &&
    bulkScopeMarkup.type === bulkType &&
    bulkScopeMarkup.value === bulkValueNumber;

  // Refresh one network (merge into the cached set) or the whole catalog when
  // called with `null` (an "All Networks" / global change touches many).
  const refreshPlans = async (network?: string | null) => {
    const all = network === null;
    const target = all ? null : network ?? activeNetwork;
    setIsLoading(true);
    try {
      const result = await getPlans(target ? { network: target } : {});
      if (result.success && result.data) {
        if (target) {
          const otherPlans = plansData.filter((p) => p.network !== target);
          setPlansData([...otherPlans, ...(result.data || [])]);
        } else {
          setPlansData(result.data || []);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (planId: string, enabled: boolean) => {
    // A plan with no config row is treated as disabled everywhere (the
    // storefront catalog is strictly opt-in), so the toggle reads
    // `config?.enabled === true` and writes `config: null` for such a plan
    // — which is why flipping one appeared to do nothing until a reload.
    // Build the row `togglePlan` is about to create (same default markup
    // and selling price) so the optimistic state has a real `config`.
    const seedConfig = (plan: PlanWithConfig) => {
      const markup = plan.config?.markup_value ?? config.defaultMarkup ?? 0;
      // `getPlans` already priced this plan through the pipeline, so seed
      // from that value rather than re-deriving it from a USD base_price.
      const sellingPrice =
        plan.config?.selling_price ??
        plan.selling_price_local ??
        plan.base_price;
      return {
        id: plan.config?.id ?? `pending-${plan.id}`,
        reseller_id: plan.config?.reseller_id ?? "",
        plan_id: plan.id,
        enabled,
        markup_type: plan.config?.markup_type ?? ("percentage" as const),
        markup_value: markup,
        selling_price: sellingPrice,
        created_at: plan.config?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    };

    const previousConfig = plansData.find((p) => p.id === planId)?.config ?? null;

    setPlansData((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, config: seedConfig(p) } : p)),
    );

    const result = await togglePlan(planId, enabled);
    if (result.success) {
      // Adopt the authoritative state the server persisted.
      const persisted = result.data?.enabled ?? enabled;
      setPlansData((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, config: p.config ? { ...p.config, enabled: persisted } : null }
            : p,
        ),
      );
    } else {
      // Roll back to exactly what was there before, so a failed first
      // toggle does not leave a phantom config behind.
      setPlansData((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, config: previousConfig } : p)),
      );
      setMessage({
        type: "error",
        text: result.error || "Failed to toggle plan",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEdit = (plan: PlanWithConfig) => {
    setEditingPlan(plan.id);
    setEditType(plan.config?.markup_type || "percentage");
    setEditValue(plan.config?.markup_value || 0);
    setEditValueFocused(false);
  };

  const cancelEdit = () => {
    setEditingPlan(null);
    setEditValueFocused(false);
  };

  // An untouched (empty) field means a zero markup, same as the bulk field.
  const editValueNumber = editValue === "" ? 0 : editValue;

  const saveEdit = async (planId: string) => {
    setSaving(true);
    const result = await updatePlanConfig({
      planId,
      markupType: editType,
      markupValue: editValueNumber,
    });

    if (result.success) {
      setPlansData((prev) =>
        prev.map((p) => {
          if (p.id === planId) {
            // Markup is ALWAYS entered and applied in local currency, on the
            // PLATFORM price — `cost_local` from the pipeline (raw cost +
            // platform markup + FX buffer). Never `base_price`, which is a
            // USD wholesale cost for Zendit and a raw local cost for the
            // others; either way it is not the reseller's cost basis.
            const costBasis = p.cost_local ?? p.base_price;

            const sellingPrice =
              editType === "percentage"
                ? Math.round(costBasis * (1 + editValueNumber / 100))
                : Math.round(costBasis + editValueNumber);
            const profit = sellingPrice - costBasis;
            const profitPercent =
              costBasis > 0 ? (profit / costBasis) * 100 : 0;

            const updates: any = {
              ...p,
              config: p.config
                ? {
                    ...p.config,
                    markup_type: editType,
                    markup_value: editValueNumber,
                    selling_price: sellingPrice,
                  }
                : null,
              profit,
              profit_percent: profitPercent,
            };

            // Keep the local-currency fields in sync too
            if (p.cost_local !== undefined && p.cost_local !== null) {
              updates.selling_price_local = sellingPrice;
              updates.profit_local = profit;
            }

            return updates;
          }
          return p;
        }),
      );
      setEditingPlan(null);
      setMessage({
        type: "success",
        text: t?.saveSuccess || "Plan updated successfully",
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update plan",
      });
    }
    setSaving(false);
  };

  const handleBulkUpdate = async () => {
    setMessage(null);

    // The exact markup is already applied to this scope — re-applying would
    // only rewrite the same rows. Tell the user instead of running it again.
    if (bulkAlreadyApplied) {
      setMessage({
        type: "info",
        text: t?.bulkAlreadyApplied || "This markup has already been applied",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setBulkSaving(true);

    const value = bulkValueNumber;
    const scopeNetwork = bulkNetwork === "all" ? undefined : bulkNetwork;

    // Snapshot for rollback, then apply optimistically so the cards, toggles
    // and the value field read as updated the instant the user clicks Apply.
    const previousPlans = plansData;
    const now = new Date().toISOString();
    setPlansData((prev) =>
      prev.map((p) => {
        if (scopeNetwork && p.network !== scopeNetwork) return p;
        const selling = p.config?.selling_price ?? p.selling_price_local ?? p.base_price;
        return {
          ...p,
          config: {
            id: p.config?.id ?? `pending-${p.id}`,
            reseller_id: p.config?.reseller_id ?? "",
            plan_id: p.id,
            enabled: true,
            markup_type: bulkType,
            markup_value: value,
            selling_price: selling,
            created_at: p.config?.created_at ?? now,
            updated_at: now,
          },
        };
      }),
    );

    const result = await bulkUpdatePlans({
      network: scopeNetwork,
      markupType: bulkType,
      markupValue: value,
    });

    if (result.success) {
      setMessage({
        type: "success",
        text: `${result.count || 0} plans updated to ${
          bulkType === "percentage" ? `${value}%` : formatLocalPrice(value)
        } markup`,
      });
      setTimeout(() => setMessage(null), 3000);
      // Reconcile every affected network from the server (an "All Networks"
      // apply touches more than the visible tab), without blocking the UI.
      await refreshPlans(scopeNetwork ?? null);
    } else {
      setPlansData(previousPlans);
      setMessage({
        type: "error",
        text: result.error || "Failed to update plans",
      });
    }
    setBulkSaving(false);
  };

  const getNetworkCount = (network: string) => {
    return plansData.filter((p) => p.network === network).length;
  };

  useEffect(() => {
    if (!activeNetwork && networks.length > 0) {
      setActiveNetwork(networks[0]);
    }
  }, [networks, activeNetwork]);

  const totalPlans = plansData.length;
  const enabledPlans = plansData.filter(
    (p) => p.config?.enabled === true,
  ).length;

  // ============================================
  // KEY FIX: getCostPriceSafe - Shows Wholesale Price
  // ============================================
  const getCostPriceSafe = (plan: PlanWithConfig) => {
    // The cost basis is the platform price the purchase path deducts — the
    // pipeline's `cost_local` (raw cost + platform markup + FX buffer), in the
    // store currency. `base_price` is only a fallback for a plan the action
    // could not price; it is a raw wholesale cost, not the number the
    // reseller's markup is applied to, so showing it understates cost and
    // overstates profit.
    if (plan.cost_local !== undefined && plan.cost_local !== null) {
      const currency = plan.display_currency || plan.currency || localCurrency;
      return {
        amount: plan.cost_local,
        currency: currency,
        formatted: formatPrice(plan.cost_local, currency),
      };
    }
    // Fallback: the raw wholesale cost.
    const currency = plan.currency || localCurrency;
    return {
      amount: plan.base_price,
      currency: currency,
      formatted: formatPrice(plan.base_price, currency),
    };
  };

  // ============================================
  // KEY FIX: getCustomerReceivesSafe - Shows what customer gets
  // ============================================
  const getCustomerReceivesSafe = (plan: PlanWithConfig) => {
    // For Zendit plans, show what customer receives
    if (
      plan.provider === "zendit" &&
      plan.display_send_currency &&
      plan.display_send_amount
    ) {
      return {
        amount: plan.display_send_amount,
        currency: plan.display_send_currency,
        formatted: formatPrice(
          plan.display_send_amount,
          plan.display_send_currency,
        ),
      };
    }
    // For non-Zendit plans, customer receives the same as the plan value
    const currency = plan.currency || localCurrency;
    return {
      amount: plan.base_price,
      currency: currency,
      formatted: formatPrice(plan.base_price, currency),
    };
  };

  // ============================================
  // KEY FIX: getYourPriceSafe - Shows wholesale OR marked-up price
  // ============================================
  const getYourPriceSafe = (plan: PlanWithConfig) => {
    // The cost basis is the pipeline's `cost_local` (platform price), the same
    // number the purchase path deducts and the reseller's markup is applied to.
    // `base_price` is only a fallback for an unpriceable plan.
    const hasCostLocal =
      plan.cost_local !== undefined && plan.cost_local !== null;
    const costBasis = hasCostLocal ? plan.cost_local! : plan.base_price;
    const currency = hasCostLocal
      ? (plan.display_currency || plan.currency || localCurrency)
      : (plan.currency || localCurrency);

    // Check if markup is applied
    const hasMarkup = plan.config && plan.config.markup_value > 0;

    // If markup is added, show the pipeline's customer price (what the customer
    // is actually charged) — never a re-derived `cost + markup`, which drifts
    // from the charged price once the platform markup or FX rate changes.
    const sellingPrice = hasMarkup
      ? (plan.config?.selling_price ?? plan.selling_price_local ?? costBasis)
      : costBasis;

    return {
      amount: sellingPrice,
      currency: currency,
      formatted: formatPrice(sellingPrice, currency),
      hasMarkup: hasMarkup,
    };
  };

  // ============================================
  // KEY FIX: getProfitSafe - Shows 0 if no markup
  // ============================================
  const getProfitSafe = (plan: PlanWithConfig) => {
    // Profit is charged price minus the cost basis the purchase path deducts
    // (`cost_local`, the platform price). Using `base_price` here understated
    // the basis and overstated profit by the platform markup + FX buffer.
    const hasCostLocal =
      plan.cost_local !== undefined && plan.cost_local !== null;
    const costLocal = hasCostLocal ? plan.cost_local! : plan.base_price;
    const currency = hasCostLocal
      ? (plan.display_currency || plan.currency || localCurrency)
      : (plan.currency || localCurrency);

    const hasMarkup = plan.config && plan.config.markup_value > 0;
    const sellingPrice = hasMarkup
      ? (plan.config?.selling_price ?? plan.selling_price_local ?? costLocal)
      : costLocal; // No markup = no profit
    const profit = sellingPrice - costLocal;
    const profitPercent = costLocal > 0 ? (profit / costLocal) * 100 : 0;

    return {
      amount: profit,
      currency: currency,
      formatted: formatPrice(profit, currency),
      percent: profitPercent,
      hasMarkup: hasMarkup,
    };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header. The title stays on one line; on narrow screens it shrinks
          rather than wrapping, and the globe icon sits to its right. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <h1
          className="plans-title"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {t?.title || "Plan Management"}
        </h1>
        <button
          className="plans-globe"
          onClick={() => setShowGlobal((v) => !v)}
          aria-pressed={showGlobal}
          aria-label={
            showGlobal
              ? t?.localPlans || "Your store plans"
              : t?.globalPlans || "Global plans"
          }
          title={showGlobal ? t?.localPlans || "Your store plans" : t?.globalPlans || "Global plans"}
        >
          {showGlobal ? <LayoutList size={18} /> : <Globe size={18} />}
        </button>
      </div>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginTop: "-1rem",
        }}
      >
        {showGlobal
          ? t?.globalPlansSubtitle ||
            "Enable and price plans for any destination — sold in your store currency"
          : t?.subtitle ||
            "Toggle plans on/off and set your markup for each network"}
      </p>

      {/* Both views stay mounted. Toggling the globe then costs nothing, and
          the global catalog preloads on first render instead of refetching
          every time the reseller opens it. */}
      <div style={{ display: showGlobal ? "none" : "contents" }}>
        <>
      {/* Stats */}
      <style>{`
        .plans-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        @media (max-width: 767px) {
          .plans-stats-grid {
            gap: 0.5rem;
          }
          .plans-stats-grid > div {
            padding: 0.6rem 0.35rem !important;
          }
          .plans-stats-grid > div > p:first-child {
            font-size: 0.6rem !important;
          }
          .plans-stats-grid > div > p:last-child {
            font-size: 1.2rem !important;
          }
        }
      `}</style>
      <div className="plans-stats-grid">
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.totalPlans || "Total Plans"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {totalPlans}
          </p>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.networks || "Networks"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {networks.length}
          </p>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.activePlans || "Active Plans"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#6EBD8A",
            }}
          >
            {enabledPlans}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderRadius: 10,
            background:
              message.type === "success"
                ? "rgba(110,189,138,0.1)"
                : message.type === "info"
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(239,68,68,0.1)",
            border:
              message.type === "success"
                ? "1px solid rgba(110,189,138,0.25)"
                : message.type === "info"
                  ? "1px solid rgba(245,158,11,0.25)"
                  : "1px solid rgba(239,68,68,0.25)",
            color:
              message.type === "success"
                ? "#6EBD8A"
                : message.type === "info"
                  ? "#F59E0B"
                  : "#F87171",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {message.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* Bulk Update */}
      <div
        className="bulk-card"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div className="bulk-head">
          <h3
            style={{
              fontWeight: 600,
              color: "var(--text)",
              fontSize: "0.95rem",
            }}
          >
            {t?.bulkPricing || "Bulk Update"}
          </h3>
          {/* Markup type: on mobile it sits to the right of the title with a
              "Markup Type" label; on desktop it sits there too, labelled
              "Markup". */}
          <div className="bulk-type-inline">
            <label className="bulk-type-label" style={labelStyle}>
              <span className="bulk-type-label-mobile">
                {t?.markupType || "Markup Type"}
              </span>
              <span className="bulk-type-label-desktop">
                {t?.markup || "Markup"}
              </span>
            </label>
            <ThemeSelect
              value={bulkType}
              onChange={(v) => setBulkType(v as "percentage" | "fixed")}
              style={selectStyle}
              ariaLabel={t?.markupType || "Markup Type"}
              menuMinWidth={140}
              options={[
                { value: "percentage", label: t?.percentage || "Percentage (%)" },
                {
                  value: "fixed",
                  label: t?.fixed || `Fixed Amount (${currencySymbol})`,
                },
              ]}
            />
          </div>
        </div>
        <div className="bulk-row">
          <div className="bulk-field bulk-field--apply">
            <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
            <ThemeSelect
              value={bulkNetwork}
              onChange={setBulkNetwork}
              style={selectStyle}
              ariaLabel={t?.applyTo || "Apply To"}
              options={[
                ...networks.map((net) => ({
                  value: net,
                  label: t?.onlyNetwork
                    ? t.onlyNetwork.replace("{network}", net)
                    : `Only ${net}`,
                })),
                { value: "all", label: t?.allNetworks || "All Networks" },
              ]}
            />
          </div>
          <div className="bulk-field bulk-field--value">
            <label style={labelStyle}>{t?.markupValue || "Value"}</label>
            <input
              type="number"
              value={bulkValue}
              onChange={(e) =>
                setBulkValue(e.target.value === "" ? "" : Number(e.target.value))
              }
              onBlur={() => {
                if (bulkValue === "") setBulkValue(0);
              }}
              style={inputStyle}
              min="0"
              step={bulkType === "percentage" ? "1" : "10"}
            />
          </div>
          <button
            onClick={handleBulkUpdate}
            disabled={bulkSaving}
            data-tour="set_markup"
            style={btnPrimaryStyle}
            className="bulk-apply"
            aria-label={
              bulkAlreadyApplied
                ? t?.bulkAlreadyApplied || "This markup has already been applied"
                : t?.apply || "Apply"
            }
            title={
              bulkAlreadyApplied
                ? t?.bulkAlreadyApplied || "This markup has already been applied"
                : t?.apply || "Apply"
            }
          >
            {bulkSaving ? (
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Check size={16} />
            )}
            <span className="bulk-apply-label">{t?.apply || "Apply"}</span>
          </button>
        </div>

        {/* Network tabs live inside the bulk card on every viewport. */}
        <div className="bulk-networks">
          {networks.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {networks.map((net) => (
                <button
                  key={net}
                  onClick={() => {
                    // Plans for every network are already in `plansData`
                    // (the page loads them unfiltered), so switching the
                    // active tab only re-filters — no refetch, no reload.
                    setActiveNetwork(net);
                    setEditingPlan(null);
                  }}
                  style={{
                    ...tabStyle,
                    background:
                      activeNetwork === net ? "var(--brand-color)" : "var(--bg2)",
                    color: activeNetwork === net ? "#FDF8F3" : "var(--muted)",
                    border:
                      activeNetwork === net ? "none" : "1px solid var(--border)",
                  }}
                >
                  {net}
                  <span
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.7,
                      marginLeft: 4,
                    }}
                  >
                    ({getNetworkCount(net)})
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Network tabs render inside the bulk card on every viewport; the only
          thing left here is the empty state when the store has no networks. */}
      {networks.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "var(--dim)",
            background: "var(--bg2)",
            borderRadius: 12,
          }}
        >
          <p>{t?.noPlans || "No networks available"}</p>
        </div>
      )}

      {/* Plans List */}
      <div
        data-tour="plans_list"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--dim)",
            }}
          >
            <Loader2
              size={24}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "0.5rem" }}>
              {t?.loading || "Loading plans..."}
            </p>
          </div>
        ) : plans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--dim)",
            }}
          >
            <p>{t?.noPlans || `No ${activeNetwork} plans available`}</p>
          </div>
        ) : (
          plans.map((plan) => {
            const isEditing = editingPlan === plan.id;
            const isEnabled = plan.config?.enabled === true;
            const isExpanded = expandedPlanId === plan.id;

            // Get display values using type-safe helpers
            const costPrice = getCostPriceSafe(plan);
            const customerReceives = getCustomerReceivesSafe(plan);
            const yourPrice = getYourPriceSafe(plan);
            const profit = getProfitSafe(plan);

            // Markup is entered and applied in LOCAL currency, on the cost
            // basis the purchase path deducts — the pipeline's `cost_local`
            // (platform price = raw cost + platform markup + FX buffer).
            // `base_price` is a raw wholesale cost (USD for Zendit, provider
            // currency otherwise) and is only a fallback when the plan could
            // not be priced, so using it for non-Zendit plans understated the
            // basis and made the edit preview disagree with the saved price.
            const hasCostLocal =
              plan.cost_local !== undefined && plan.cost_local !== null;
            const editCostBasis = hasCostLocal
              ? (plan.cost_local as number)
              : plan.base_price;

            const editSellingPriceLocal = isEditing
              ? editType === "percentage"
                ? Math.round(editCostBasis * (1 + editValueNumber / 100))
                : Math.round(editCostBasis + editValueNumber)
              : yourPrice.amount;

            const editProfitLocal = isEditing
              ? editSellingPriceLocal - editCostBasis
              : profit.amount;

            const editCurrency = hasCostLocal
              ? (plan.display_currency || plan.currency || localCurrency)
              : (plan.currency || localCurrency);

            // Label for "Your Price" - shows "Wholesale" if no markup
            const priceLabel = yourPrice.hasMarkup
              ? t?.yourPrice || "Your Price"
              : t?.wholesalePrice || "Wholesale";

            return (
              <div
                key={plan.id}
                className={`plan-card${isExpanded ? " plan-card--expanded" : ""}`}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem",
                  opacity: isEnabled ? 1 : 0.55,
                  transition: "all 0.2s",
                }}
              >
                <div
                  className="plan-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {/* Plan Info */}
                  <div className="plan-info" style={{ flex: 1, minWidth: 180 }}>
                    <div
                      className="plan-title"
                      role={isMobile ? "button" : undefined}
                      tabIndex={isMobile ? 0 : undefined}
                      aria-expanded={isMobile ? isExpanded : undefined}
                      onClick={() => {
                        if (!isMobile) return;
                        setExpandedPlanId(isExpanded ? null : plan.id);
                      }}
                      onKeyDown={(e) => {
                        if (!isMobile) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedPlanId(isExpanded ? null : plan.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontWeight: 600,
                          color: "var(--text)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {plan.name}
                      </h3>
                      {/* {plan.data_amount && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--dim)",
                            background: "var(--bg2)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                          }}
                        >
                          {plan.data_amount}
                        </span>
                      )} */}
                      {plan.validity && (
                        <span
                          className="plan-validity"
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--dim)",
                            background: "var(--bg2)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                          }}
                        >
                          {plan.validity}
                        </span>
                      )}
                      {plan.price_type === "RANGE" && (
                        <span
                          className="plan-validity"
                          title={`Customer chooses an amount${
                            plan.range_max
                              ? ` up to ${formatPrice(plan.range_max, plan.display_currency || localCurrency)}`
                              : ""
                          }`}
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--brand-color)",
                            background: "var(--bg2)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          {t?.range || "Range"}
                        </span>
                      )}
                      {/* Toggle */}
                      <button
                        className={`plan-toggle ${isEnabled ? "is-on" : "is-off"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggling a plan opens its details panel on mobile.
                          if (isMobile) setExpandedPlanId(plan.id);
                          handleToggle(plan.id, !isEnabled);
                        }}
                        aria-label={
                          isEnabled
                            ? t?.disablePlan || "Disable plan"
                            : t?.enablePlan || "Enable plan"
                        }
                        aria-pressed={isEnabled}
                        style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          border: "none",
                          position: "relative",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 2,
                            left: isEnabled ? 20 : 2,
                            transition: "left 0.15s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                      <span className="plan-chevron" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </div>
                    <div className="plan-cost-line">
                      <p className="plan-wholesale" style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
                        {t?.wholesalePrice || "Wholesale"}:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {costPrice.formatted}
                        </strong>
                      </p>
                      {/* Mobile: the edit icon sits to the right of the cost
                          price, and only while the dropdown is open. Desktop
                          keeps its own copy in the details row (hidden here). */}
                      {isEnabled && !isEditing && isExpanded && (
                        <button
                          className="plan-edit-inline"
                          onClick={() => startEdit(plan)}
                          style={btnIconStyle}
                          title={t?.edit || "Edit markup"}
                          aria-label={t?.edit || "Edit markup"}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Editing or Display */}
                  <div className="plan-details">
                  {isEditing ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        background: "var(--bg2)",
                        padding: "0.4rem 0.75rem",
                        borderRadius: 8,
                      }}
                    >
                      <ThemeSelect
                        value={editType}
                        onChange={(v) => setEditType(v as "percentage" | "fixed")}
                        style={{ ...smallSelectStyle, width: 72 }}
                        ariaLabel={t?.markupType || "Markup Type"}
                        menuMinWidth={90}
                        options={[
                          { value: "percentage", label: "%" },
                          { value: "fixed", label: currencySymbol },
                        ]}
                      />
                      <input
                        className="plan-edit-value"
                        type="number"
                        value={
                          editValueFocused
                            ? editValue
                            : editValue === ""
                              ? 0
                              : editValue
                        }
                        onChange={(e) =>
                          setEditValue(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        onFocus={() => {
                          // Empty the field so the first keystroke replaces the
                          // existing markup; remember it to restore on blur.
                          editValueBeforeFocus.current = editValue;
                          setEditValueFocused(true);
                          setEditValue("");
                        }}
                        onBlur={() => {
                          setEditValueFocused(false);
                          if (editValue === "") {
                            setEditValue(editValueBeforeFocus.current);
                          }
                        }}
                        style={{ ...smallInputStyle, width: 70 }}
                        min="0"
                        step={editType === "percentage" ? "1" : "10"}
                      />
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--dim)",
                          minWidth: 80,
                          textAlign: "center",
                        }}
                      >
                        <div>
                          {t?.yourPrice || "Your Price"}:{" "}
                          <strong style={{ color: "var(--brand-color)" }}>
                            {formatPrice(editSellingPriceLocal, editCurrency)}
                          </strong>
                        </div>
                        <div>
                          {t?.profit || "Profit"}:{" "}
                          <strong style={{ color: "#6EBD8A" }}>
                            {formatPrice(editProfitLocal, editCurrency)}
                          </strong>
                        </div>
                      </div>
                      <button
                        onClick={() => saveEdit(plan.id)}
                        disabled={saving}
                        style={btnSaveStyle}
                      >
                        {saving ? (
                          <Loader2
                            size={14}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                        ) : (
                          <Check size={14} />
                        )}
                        {t?.save || "Save"}
                      </button>
                      <button onClick={cancelEdit} style={btnCancelStyle}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {t?.markup || "Markup"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {plan.config?.markup_type === "percentage"
                            ? `${plan.config?.markup_value || 0}%`
                            : formatPrice(
                                plan.config?.markup_value || 0,
                                plan.display_currency ||
                                  plan.currency ||
                                  localCurrency,
                              )}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 80 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {priceLabel}
                        </p>
                        <p
                          style={{
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: yourPrice.hasMarkup
                              ? "var(--brand-color)"
                              : "var(--text)",
                          }}
                        >
                          {yourPrice.formatted}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {t?.profit || "Profit"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: profit.amount > 0 ? "#6EBD8A" : "var(--dim)",
                          }}
                        >
                          {profit.formatted}
                          {/* <span
                            style={{
                              fontSize: "0.6rem",
                              fontWeight: 400,
                              color: "var(--dim)",
                              marginLeft: 2,
                            }}
                          >
                            ({Math.round(profit.percent)}%)
                          </span> */}
                        </p>
                      </div>
                      {isEnabled && (
                        <button
                          className="plan-edit-desktop"
                          onClick={() => startEdit(plan)}
                          style={btnIconStyle}
                          title={t?.edit || "Edit markup"}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      </div>

      <div style={{ display: showGlobal ? "contents" : "none" }}>
        <GlobalPlansPanel
          countryCode={countryCode}
          config={config}
          translations={t}
          initialPlans={initialGlobalPlans}
          initialTotal={initialGlobalTotal}
          initialFacets={initialGlobalFacets}
          onChanged={() => refreshPlans(null)}
        />
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        /* The globe toggle sits to the right of the title on every viewport. */
        .plans-globe {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--brand-color);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .plans-globe:hover {
          background: color-mix(in srgb, var(--brand-color) 12%, transparent);
        }
        .plans-globe[aria-pressed="true"] {
          background: var(--brand-color);
          color: #FDF8F3;
          border-color: transparent;
        }
        /* The title stays on one line; on small screens it shrinks rather
           than wrapping, so it and the icon always share the row. */
        @media (max-width: 767px) {
          .plans-title {
            font-size: 1.25rem !important;
          }
          .plans-globe {
            width: 34px;
            height: 34px;
          }
        }
        /* Desktop: the details wrapper is transparent, so the card keeps its
           original single-row layout (wholesale + markup/price/profit inline)
           and no chevron is shown. */
        .plan-details {
          display: contents;
        }
        .plan-chevron {
          display: none;
        }
        /* Toggle: desktop keeps the original green / dim appearance. */
        .plan-toggle.is-on {
          background: #6EBD8A;
        }
        .plan-toggle.is-off {
          background: var(--dim);
        }
        /* The inline edit icon (right of cost price) is a mobile-only control;
           it is additionally gated on the dropdown being open. */
        .plan-edit-inline {
          display: none;
        }
        .plan-edit-desktop {
          display: inline-flex;
        }
        .plan-cost-line {
          display: block;
        }
        /* The per-plan markup input empties on focus too; its spinner would
           otherwise eat taps on the 70px field. */
        .plan-edit-value::-webkit-outer-spin-button,
        .plan-edit-value::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .plan-edit-value {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        /* Bulk card: title on the left, markup type on the right. */
        .bulk-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .bulk-head h3 {
          margin: 0;
        }
        /* Desktop labels the markup type "Markup"; the mobile copy reads
           "Markup Type". */
        .bulk-type-label-mobile {
          display: none;
        }
        .bulk-type-label-desktop {
          display: inline;
        }
        /* Apply To + Value + apply button on one horizontal line. */
        .bulk-row {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        /* The value field is deliberately compact. */
        .bulk-field--value input {
          width: 72px;
        }
        /* No spinner arrows: on a narrow field they occupy most of the tap
           target and increment the resting 0 instead of focusing the text. */
        .bulk-field--value input::-webkit-outer-spin-button,
        .bulk-field--value input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .bulk-field--value input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        /* Network tabs live inside the bulk card on every viewport. */
        .bulk-networks {
          display: block;
          margin-top: 1rem;
        }
        /* Mobile: the row is plan name + toggle; everything else lives in a
           panel that opens on tap and also opens when the toggle is used. */
        @media (max-width: 767px) {
          .plan-wholesale {
            display: none;
          }
          .plan-details {
            display: none;
          }
          .plan-card--expanded .plan-wholesale {
            display: block;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border);
          }
          /* Cost price + the edit icon share one line. */
          .plan-cost-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .plan-cost-line .plan-wholesale {
            margin: 0;
            border-top: none;
            padding-top: 0;
          }
          .plan-edit-inline {
            display: inline-flex;
          }
          .plan-edit-desktop {
            display: none;
          }
          /* Mobile: inactive is red, active is green. */
          .plan-toggle.is-off {
            background: #EF4444;
          }
          .plan-card--expanded .plan-details {
            display: block;
            flex-basis: 100%;
          }
          .plan-title {
            flex-wrap: nowrap;
          }
          .plan-title h3 {
            flex: 1 1 auto;
            min-width: 0;
          }
          .plan-chevron {
            display: inline-flex;
            align-items: center;
            color: var(--dim);
            transition: transform 0.2s;
          }
          .plan-card--expanded .plan-chevron {
            transform: rotate(180deg);
          }
          .plan-details > div {
            flex-wrap: wrap;
            row-gap: 0.6rem;
          }
          /* Bulk card: title + markup type share the header line. */
          .bulk-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          .bulk-head h3 {
            margin: 0;
          }
          .bulk-type-inline {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .bulk-type-label-mobile {
            display: inline;
          }
          .bulk-type-label-desktop {
            display: none;
          }
          /* Apply To + Value + apply icon on one line. */
          .bulk-row {
            display: flex;
            align-items: flex-end;
            gap: 0.5rem;
            flex-wrap: nowrap;
          }
          .bulk-field {
            flex: 0 0 auto;
          }
          .bulk-field--apply {
            flex: 1 1 auto;
            min-width: 0;
          }
          .bulk-field--apply select {
            width: 100%;
          }
          /* The value field is deliberately small and starts empty. */
          .bulk-field--value input {
            width: 56px;
          }
          /* Icon-only apply button; the label is desktop-only. Padding and gap
             are set inline on the button, so the compact overrides need
             !important to win. */
          .bulk-apply {
            padding: 0.55rem 0.7rem !important;
            gap: 0 !important;
          }
          .bulk-apply-label {
            display: none;
          }
          /* Network tabs stay inside the bulk card. */
          .bulk-networks {
            display: block;
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: "0.85rem",
  outline: "none",
  fontFamily: "inherit",
};

const smallInputStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.8rem",
  outline: "none",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  width: "auto",
};

const smallSelectStyle: React.CSSProperties = {
  ...smallInputStyle,
  cursor: "pointer",
  width: 50,
};

const tabStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 8,
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
  transition: "all 0.15s",
  display: "inline-flex",
  alignItems: "center",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.55rem 1.2rem",
  background: "var(--brand-color)",
  border: "none",
  borderRadius: 8,
  color: "#FDF8F3",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSaveStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "0.3rem 0.7rem",
  background: "#6EBD8A",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnCancelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.3rem",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  color: "var(--dim)",
  cursor: "pointer",
};

const btnIconStyle: React.CSSProperties = {
  alignItems: "center",
  padding: "0.4rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--muted)",
  cursor: "pointer",
};

// // src/app/[countryCode]/dashboard/plans/PlansClient.tsx
// "use client";

// import { useState, useEffect, useMemo } from "react";
// import {
//   Check,
//   X,
//   Loader2,
//   Pencil,
//   RotateCcw,
//   AlertTriangle,
// } from "lucide-react";
// import { getPlans } from "@/actions/reseller/plans/getPlans";
// import { togglePlan } from "@/actions/reseller/plans/togglePlan";
// import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
// import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
// import { CountryConfig } from "@/config/countries";
// import { PlanWithConfig } from "@/types/reseller/plans";
// import { formatPrice } from "@/lib/currency/currency";

// interface PlansClientProps {
//   countryCode: string;
//   config: CountryConfig;
//   translations: any;
//   initialData: {
//     plans: PlanWithConfig[];
//     networks: string[];
//   };
// }

// export default function PlansClient({
//   countryCode,
//   config,
//   translations,
//   initialData,
// }: PlansClientProps) {
//   const t = translations;
//   const [plansData, setPlansData] = useState<PlanWithConfig[]>(
//     initialData.plans,
//   );
//   const [activeNetwork, setActiveNetwork] = useState<string>(
//     initialData.networks.length > 0 ? initialData.networks[0] : "",
//   );
//   const [editingPlan, setEditingPlan] = useState<string | null>(null);
//   const [editType, setEditType] = useState<"percentage" | "fixed">(
//     "percentage",
//   );
//   const [editValue, setEditValue] = useState(0);
//   const [saving, setSaving] = useState(false);
//   const [bulkType, setBulkType] = useState<"percentage" | "fixed">(
//     "percentage",
//   );
//   const [bulkValue, setBulkValue] = useState(0);
//   const [bulkSaving, setBulkSaving] = useState(false);
//   const [bulkScope, setBulkScope] = useState<"network" | "all">("network");
//   const [message, setMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const localCurrency = config.currency;
//   const currencySymbol = config.currencySymbol || "₦";

//   const formatLocalPrice = (amount: number) => {
//     return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
//   };

//   const networks = initialData.networks || [];

//   // Filter plans by active network
//   const plans = useMemo(
//     () => plansData.filter((p) => p.network === activeNetwork),
//     [plansData, activeNetwork],
//   );

//   const refreshPlans = async () => {
//     setIsLoading(true);
//     try {
//       const result = await getPlans({ network: activeNetwork });
//       if (result.success && result.data) {
//         const otherPlans = plansData.filter((p) => p.network !== activeNetwork);
//         setPlansData([...otherPlans, ...(result.data || [])]);
//       }
//     } catch (error) {
//       console.error("Refresh error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleToggle = async (planId: string, enabled: boolean) => {
//     setPlansData((prev) =>
//       prev.map((p) =>
//         p.id === planId
//           ? { ...p, config: p.config ? { ...p.config, enabled } : null }
//           : p,
//       ),
//     );

//     const result = await togglePlan(planId);
//     if (!result.success) {
//       setPlansData((prev) =>
//         prev.map((p) =>
//           p.id === planId
//             ? {
//                 ...p,
//                 config: p.config ? { ...p.config, enabled: !enabled } : null,
//               }
//             : p,
//         ),
//       );
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to toggle plan",
//       });
//       setTimeout(() => setMessage(null), 3000);
//     }
//   };

//   const startEdit = (plan: PlanWithConfig) => {
//     setEditingPlan(plan.id);
//     setEditType(plan.config?.markup_type || "percentage");
//     setEditValue(plan.config?.markup_value || 0);
//   };

//   const cancelEdit = () => {
//     setEditingPlan(null);
//   };

//   const saveEdit = async (planId: string) => {
//     setSaving(true);
//     const result = await updatePlanConfig({
//       planId,
//       markupType: editType,
//       markupValue: editValue,
//     });

//     if (result.success) {
//       setPlansData((prev) =>
//         prev.map((p) => {
//           if (p.id === planId) {
//             const basePrice = p.base_price;
//             const sellingPrice =
//               editType === "percentage"
//                 ? Math.round(basePrice * (1 + editValue / 100))
//                 : Math.round(basePrice + editValue);
//             const profit = sellingPrice - basePrice;
//             const profitPercent =
//               basePrice > 0 ? (profit / basePrice) * 100 : 0;

//             const updates: any = {
//               ...p,
//               config: p.config
//                 ? {
//                     ...p.config,
//                     markup_type: editType,
//                     markup_value: editValue,
//                     selling_price: sellingPrice,
//                   }
//                 : null,
//               profit,
//               profit_percent: profitPercent,
//             };

//             // If Zendit plan, update local values
//             if (p.provider === "zendit" && p.exchange_rate) {
//               const costLocal = Math.round(basePrice * p.exchange_rate);
//               const sellingPriceLocal = Math.round(
//                 sellingPrice * p.exchange_rate,
//               );
//               const profitLocal = sellingPriceLocal - costLocal;
//               const profitPercentLocal =
//                 costLocal > 0 ? (profitLocal / costLocal) * 100 : 0;

//               updates.cost_local = costLocal;
//               updates.selling_price_local = sellingPriceLocal;
//               updates.profit_local = profitLocal;
//               updates.profit_percent = profitPercentLocal;
//               updates.display_amount = costLocal;
//             }

//             return updates;
//           }
//           return p;
//         }),
//       );
//       setEditingPlan(null);
//       setMessage({
//         type: "success",
//         text: t?.saveSuccess || "Plan updated successfully",
//       });
//       setTimeout(() => setMessage(null), 3000);
//     } else {
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to update plan",
//       });
//     }
//     setSaving(false);
//   };

//   const handleBulkUpdate = async () => {
//     setBulkSaving(true);
//     setMessage(null);

//     const result = await bulkUpdatePlans({
//       network: bulkScope === "network" ? activeNetwork : undefined,
//       markupType: bulkType,
//       markupValue: bulkValue,
//     });

//     if (result.success) {
//       await refreshPlans();
//       setMessage({
//         type: "success",
//         text: `${result.count || 0} plans updated to ${
//           bulkType === "percentage"
//             ? `${bulkValue}%`
//             : formatLocalPrice(bulkValue)
//         } markup`,
//       });
//       setTimeout(() => setMessage(null), 3000);
//     } else {
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to update plans",
//       });
//     }
//     setBulkSaving(false);
//   };

//   const getNetworkCount = (network: string) => {
//     return plansData.filter((p) => p.network === network).length;
//   };

//   useEffect(() => {
//     if (!activeNetwork && networks.length > 0) {
//       setActiveNetwork(networks[0]);
//     }
//   }, [networks, activeNetwork]);

//   const totalPlans = plansData.length;
//   const enabledPlans = plansData.filter(
//     (p) => p.config?.enabled !== false,
//   ).length;

//   // ============================================
//   // KEY FIX: getCostPriceSafe - Shows Wholesale Price
//   // ============================================
//   const getCostPriceSafe = (plan: PlanWithConfig) => {
//     // For Zendit plans, show cost in local currency
//     if (
//       plan.provider === "zendit" &&
//       plan.cost_local !== undefined &&
//       plan.cost_local !== null
//     ) {
//       const currency = plan.display_currency || plan.currency || localCurrency;
//       return {
//         amount: plan.cost_local,
//         currency: currency,
//         formatted: formatPrice(plan.cost_local, currency),
//       };
//     }
//     // For all plans, show base price
//     const currency = plan.currency || localCurrency;
//     return {
//       amount: plan.base_price,
//       currency: currency,
//       formatted: formatPrice(plan.base_price, currency),
//     };
//   };

//   // ============================================
//   // KEY FIX: getCustomerReceivesSafe - Shows what customer gets
//   // ============================================
//   const getCustomerReceivesSafe = (plan: PlanWithConfig) => {
//     // For Zendit plans, show what customer receives
//     if (
//       plan.provider === "zendit" &&
//       plan.display_send_currency &&
//       plan.display_send_amount
//     ) {
//       return {
//         amount: plan.display_send_amount,
//         currency: plan.display_send_currency,
//         formatted: formatPrice(
//           plan.display_send_amount,
//           plan.display_send_currency,
//         ),
//       };
//     }
//     // For non-Zendit plans, customer receives the same as the plan value
//     const currency = plan.currency || localCurrency;
//     return {
//       amount: plan.base_price,
//       currency: currency,
//       formatted: formatPrice(plan.base_price, currency),
//     };
//   };

//   // ============================================
//   // KEY FIX: getYourPriceSafe - Shows wholesale OR marked-up price
//   // ============================================
//   const getYourPriceSafe = (plan: PlanWithConfig) => {
//     // Get the wholesale price (cost to reseller)
//     let wholesaleAmount: number;
//     let wholesaleCurrency: string;

//     if (plan.provider === "zendit" && plan.cost_local !== undefined) {
//       wholesaleAmount = plan.cost_local;
//       wholesaleCurrency =
//         plan.display_currency || plan.currency || localCurrency;
//     } else {
//       wholesaleAmount = plan.base_price;
//       wholesaleCurrency = plan.currency || localCurrency;
//     }

//     // Check if markup is applied
//     const hasMarkup = plan.config && plan.config.markup_value > 0;

//     // If markup is added, show marked-up price; otherwise show wholesale
//     const sellingPrice = hasMarkup
//       ? plan.provider === "zendit" && plan.selling_price_local !== undefined
//         ? plan.selling_price_local
//         : (plan.config?.selling_price ?? wholesaleAmount)
//       : wholesaleAmount;

//     return {
//       amount: sellingPrice,
//       currency: wholesaleCurrency,
//       formatted: formatPrice(sellingPrice, wholesaleCurrency),
//       hasMarkup: hasMarkup,
//     };
//   };

//   // ============================================
//   // KEY FIX: getProfitSafe - Shows 0 if no markup
//   // ============================================
//   const getProfitSafe = (plan: PlanWithConfig) => {
//     // For Zendit plans, show profit in local currency
//     if (plan.provider === "zendit" && plan.cost_local !== undefined) {
//       const costLocal = plan.cost_local;
//       const hasMarkup = plan.config && plan.config.markup_value > 0;
//       const sellingPriceLocal = hasMarkup
//         ? (plan.selling_price_local ?? costLocal)
//         : costLocal; // No markup = no profit
//       const profit = sellingPriceLocal - costLocal;
//       const profitPercent = costLocal > 0 ? (profit / costLocal) * 100 : 0;
//       const currency = plan.display_currency || plan.currency || localCurrency;

//       return {
//         amount: profit,
//         currency: currency,
//         formatted: formatPrice(profit, currency),
//         percent: profitPercent,
//         hasMarkup: hasMarkup,
//       };
//     }

//     // For all plans
//     const cost = plan.base_price;
//     const hasMarkup = plan.config && plan.config.markup_value > 0;
//     const sellingPrice = hasMarkup
//       ? (plan.config?.selling_price ?? cost)
//       : cost; // No markup = no profit
//     const profit = sellingPrice - cost;
//     const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
//     const currency = plan.currency || localCurrency;

//     return {
//       amount: profit,
//       currency: currency,
//       formatted: formatPrice(profit, currency),
//       percent: profitPercent,
//       hasMarkup: hasMarkup,
//     };
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//       {/* Header */}
//       <div>
//         <h1
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.8rem",
//             fontWeight: 700,
//             color: "var(--text)",
//             marginBottom: "0.3rem",
//           }}
//         >
//           {t?.title || "Plan Management"}
//         </h1>
//         <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
//           {t?.subtitle ||
//             "Toggle plans on/off and set your markup for each network"}
//         </p>
//       </div>

//       {/* Stats */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
//           gap: "1rem",
//         }}
//       >
//         <div
//           style={{
//             background: "var(--card)",
//             border: "1px solid var(--border)",
//             borderRadius: 10,
//             padding: "1rem",
//             textAlign: "center",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "0.7rem",
//               color: "var(--dim)",
//               textTransform: "uppercase",
//             }}
//           >
//             {t?.totalPlans || "Total Plans"}
//           </p>
//           <p
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "1.5rem",
//               fontWeight: 700,
//               color: "var(--text)",
//             }}
//           >
//             {totalPlans}
//           </p>
//         </div>
//         <div
//           style={{
//             background: "var(--card)",
//             border: "1px solid var(--border)",
//             borderRadius: 10,
//             padding: "1rem",
//             textAlign: "center",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "0.7rem",
//               color: "var(--dim)",
//               textTransform: "uppercase",
//             }}
//           >
//             {t?.networks || "Networks"}
//           </p>
//           <p
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "1.5rem",
//               fontWeight: 700,
//               color: "var(--text)",
//             }}
//           >
//             {networks.length}
//           </p>
//         </div>
//         <div
//           style={{
//             background: "var(--card)",
//             border: "1px solid var(--border)",
//             borderRadius: 10,
//             padding: "1rem",
//             textAlign: "center",
//           }}
//         >
//           <p
//             style={{
//               fontSize: "0.7rem",
//               color: "var(--dim)",
//               textTransform: "uppercase",
//             }}
//           >
//             {t?.activePlans || "Active Plans"}
//           </p>
//           <p
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "1.5rem",
//               fontWeight: 700,
//               color: "#6EBD8A",
//             }}
//           >
//             {enabledPlans}
//           </p>
//         </div>
//       </div>

//       {/* Message */}
//       {message && (
//         <div
//           style={{
//             padding: "0.9rem 1.2rem",
//             borderRadius: 10,
//             background:
//               message.type === "success"
//                 ? "rgba(110,189,138,0.1)"
//                 : "rgba(239,68,68,0.1)",
//             border:
//               message.type === "success"
//                 ? "1px solid rgba(110,189,138,0.25)"
//                 : "1px solid rgba(239,68,68,0.25)",
//             color: message.type === "success" ? "#6EBD8A" : "#F87171",
//             fontSize: "0.88rem",
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//           }}
//         >
//           {message.type === "success" ? (
//             <Check size={16} />
//           ) : (
//             <AlertTriangle size={16} />
//           )}
//           {message.text}
//         </div>
//       )}

//       {/* Bulk Update */}
//       <div
//         style={{
//           background: "var(--card)",
//           border: "1px solid var(--border)",
//           borderRadius: 12,
//           padding: "1.25rem",
//         }}
//       >
//         <h3
//           style={{
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "1rem",
//             fontSize: "0.95rem",
//           }}
//         >
//           {t?.bulkPricing || "Bulk Update Markup"}
//         </h3>
//         <div
//           style={{
//             display: "flex",
//             gap: "0.75rem",
//             alignItems: "flex-end",
//             flexWrap: "wrap",
//           }}
//         >
//           <div>
//             <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
//             <select
//               value={bulkScope}
//               onChange={(e) =>
//                 setBulkScope(e.target.value as "network" | "all")
//               }
//               style={selectStyle}
//             >
//               <option value="network">
//                 {t?.onlyNetwork
//                   ? t.onlyNetwork.replace("{network}", activeNetwork)
//                   : `Only ${activeNetwork}`}
//               </option>
//               <option value="all">{t?.allNetworks || "All Networks"}</option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>{t?.markupType || "Markup Type"}</label>
//             <select
//               value={bulkType}
//               onChange={(e) =>
//                 setBulkType(e.target.value as "percentage" | "fixed")
//               }
//               style={selectStyle}
//             >
//               <option value="percentage">
//                 {t?.percentage || "Percentage (%)"}
//               </option>
//               <option value="fixed">
//                 {t?.fixed || `Fixed Amount (${currencySymbol})`}
//               </option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>{t?.markupValue || "Value"}</label>
//             <input
//               type="number"
//               value={bulkValue}
//               onChange={(e) => setBulkValue(Number(e.target.value))}
//               style={inputStyle}
//               min="0"
//               step={bulkType === "percentage" ? "1" : "10"}
//             />
//           </div>
//           <button
//             onClick={handleBulkUpdate}
//             disabled={bulkSaving}
//             style={btnPrimaryStyle}
//           >
//             {bulkSaving ? (
//               <Loader2
//                 size={16}
//                 style={{ animation: "spin 1s linear infinite" }}
//               />
//             ) : (
//               <RotateCcw size={16} />
//             )}
//             {t?.apply || "Apply"}
//           </button>
//         </div>
//       </div>

//       {/* Network Tabs */}
//       {networks.length > 0 ? (
//         <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
//           {networks.map((net) => (
//             <button
//               key={net}
//               onClick={() => {
//                 setActiveNetwork(net);
//                 setEditingPlan(null);
//                 refreshPlans();
//               }}
//               style={{
//                 ...tabStyle,
//                 background:
//                   activeNetwork === net ? "var(--brand-color)" : "var(--bg2)",
//                 color: activeNetwork === net ? "#FDF8F3" : "var(--muted)",
//                 border:
//                   activeNetwork === net ? "none" : "1px solid var(--border)",
//               }}
//             >
//               {net}
//               <span
//                 style={{
//                   fontSize: "0.7rem",
//                   opacity: 0.7,
//                   marginLeft: 4,
//                 }}
//               >
//                 ({getNetworkCount(net)})
//               </span>
//             </button>
//           ))}
//         </div>
//       ) : (
//         <div
//           style={{
//             textAlign: "center",
//             padding: "2rem",
//             color: "var(--dim)",
//             background: "var(--bg2)",
//             borderRadius: 12,
//           }}
//         >
//           <p>{t?.noPlans || "No networks available"}</p>
//         </div>
//       )}

//       {/* Plans List */}
//       <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
//         {isLoading ? (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "2rem",
//               color: "var(--dim)",
//             }}
//           >
//             <Loader2
//               size={24}
//               style={{ animation: "spin 1s linear infinite" }}
//             />
//             <p style={{ marginTop: "0.5rem" }}>
//               {t?.loading || "Loading plans..."}
//             </p>
//           </div>
//         ) : plans.length === 0 ? (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "3rem",
//               background: "var(--card)",
//               border: "1px solid var(--border)",
//               borderRadius: 12,
//               color: "var(--dim)",
//             }}
//           >
//             <p>{t?.noPlans || `No ${activeNetwork} plans available`}</p>
//           </div>
//         ) : (
//           plans.map((plan) => {
//             const isEditing = editingPlan === plan.id;
//             const isEnabled = plan.config?.enabled !== false;

//             // Get display values using type-safe helpers
//             const costPrice = getCostPriceSafe(plan);
//             const customerReceives = getCustomerReceivesSafe(plan);
//             const yourPrice = getYourPriceSafe(plan);
//             const profit = getProfitSafe(plan);

//             // Calculate edit values
//             const editSellingPrice = isEditing
//               ? editType === "percentage"
//                 ? Math.round(plan.base_price * (1 + editValue / 100))
//                 : Math.round(plan.base_price + editValue)
//               : yourPrice.amount;

//             const editProfit = isEditing
//               ? editSellingPrice - (plan.cost_local ?? plan.base_price)
//               : profit.amount;

//             // For Zendit plans, show local edit values
//             const editSellingPriceLocal =
//               isEditing && plan.provider === "zendit" && plan.exchange_rate
//                 ? Math.round(editSellingPrice * plan.exchange_rate)
//                 : editSellingPrice;

//             const editProfitLocal =
//               isEditing && plan.provider === "zendit" && plan.exchange_rate
//                 ? Math.round(editProfit * plan.exchange_rate)
//                 : editProfit;

//             const editCurrency =
//               plan.provider === "zendit" && plan.display_currency
//                 ? plan.display_currency
//                 : plan.currency || localCurrency;

//             // Label for "Your Price" - shows "Wholesale" if no markup
//             const priceLabel = yourPrice.hasMarkup
//               ? t?.yourPrice || "Your Price"
//               : t?.wholesalePrice || "Wholesale";

//             return (
//               <div
//                 key={plan.id}
//                 style={{
//                   background: "var(--card)",
//                   border: "1px solid var(--border)",
//                   borderRadius: 12,
//                   padding: "1rem 1.25rem",
//                   opacity: isEnabled ? 1 : 0.55,
//                   transition: "all 0.2s",
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     flexWrap: "wrap",
//                     gap: "0.75rem",
//                   }}
//                 >
//                   {/* Plan Info */}
//                   <div style={{ flex: 1, minWidth: 180 }}>
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "0.75rem",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <h3
//                         style={{
//                           fontWeight: 600,
//                           color: "var(--text)",
//                           fontSize: "0.95rem",
//                         }}
//                       >
//                         {plan.name}
//                       </h3>
//                       {/* {plan.data_amount && (
//                         <span
//                           style={{
//                             fontSize: "0.7rem",
//                             color: "var(--dim)",
//                             background: "var(--bg2)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {plan.data_amount}
//                         </span>
//                       )} */}
//                       {plan.validity && (
//                         <span
//                           style={{
//                             fontSize: "0.7rem",
//                             color: "var(--dim)",
//                             background: "var(--bg2)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {plan.validity}
//                         </span>
//                       )}
//                       {/* Toggle */}
//                       <button
//                         onClick={() => handleToggle(plan.id, !isEnabled)}
//                         style={{
//                           width: 40,
//                           height: 22,
//                           borderRadius: 11,
//                           border: "none",
//                           background: isEnabled ? "#6EBD8A" : "var(--dim)",
//                           position: "relative",
//                           cursor: "pointer",
//                           flexShrink: 0,
//                           transition: "background 0.15s",
//                         }}
//                       >
//                         <div
//                           style={{
//                             width: 18,
//                             height: 18,
//                             borderRadius: "50%",
//                             background: "#fff",
//                             position: "absolute",
//                             top: 2,
//                             left: isEnabled ? 20 : 2,
//                             transition: "left 0.15s",
//                             boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
//                           }}
//                         />
//                       </button>
//                       {!isEnabled && (
//                         <span
//                           style={{
//                             fontSize: "0.65rem",
//                             color: "#F87171",
//                             background: "rgba(239,68,68,0.1)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {t?.inactive || "Hidden"}
//                         </span>
//                       )}
//                     </div>
//                     <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
//                       {t?.wholesalePrice || "Wholesale"}:{" "}
//                       <strong style={{ color: "var(--text)" }}>
//                         {costPrice.formatted}
//                       </strong>
//                       {/* {plan.provider && ` • ${plan.provider}`} */}
//                       {/* {plan.provider === "zendit" &&
//                         plan.display_send_currency &&
//                         plan.display_send_amount && (
//                           <span
//                             style={{
//                               marginLeft: "0.5rem",
//                               color: "var(--muted)",
//                             }}
//                           >
//                             • {t?.customerReceives || "Customer Receives"}:{" "}
//                             <strong style={{ color: "var(--text)" }}>
//                               {formatPrice(
//                                 plan.display_send_amount,
//                                 plan.display_send_currency,
//                               )}
//                             </strong>
//                           </span>
//                         )} */}
//                     </p>
//                   </div>

//                   {/* Editing or Display */}
//                   {isEditing ? (
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "0.5rem",
//                         flexWrap: "wrap",
//                         background: "var(--bg2)",
//                         padding: "0.4rem 0.75rem",
//                         borderRadius: 8,
//                       }}
//                     >
//                       <select
//                         value={editType}
//                         onChange={(e) =>
//                           setEditType(e.target.value as "percentage" | "fixed")
//                         }
//                         style={smallSelectStyle}
//                       >
//                         <option value="percentage">%</option>
//                         <option value="fixed">{currencySymbol}</option>
//                       </select>
//                       <input
//                         type="number"
//                         value={editValue}
//                         onChange={(e) => setEditValue(Number(e.target.value))}
//                         style={{ ...smallInputStyle, width: 70 }}
//                         min="0"
//                         step={editType === "percentage" ? "1" : "10"}
//                       />
//                       <div
//                         style={{
//                           fontSize: "0.75rem",
//                           color: "var(--dim)",
//                           minWidth: 80,
//                           textAlign: "center",
//                         }}
//                       >
//                         <div>
//                           {t?.yourPrice || "Your Price"}:{" "}
//                           <strong style={{ color: "var(--brand-color)" }}>
//                             {plan.provider === "zendit" && plan.exchange_rate
//                               ? formatPrice(editSellingPriceLocal, editCurrency)
//                               : formatPrice(editSellingPrice, editCurrency)}
//                           </strong>
//                         </div>
//                         <div>
//                           {t?.profit || "Profit"}:{" "}
//                           <strong style={{ color: "#6EBD8A" }}>
//                             {plan.provider === "zendit" && plan.exchange_rate
//                               ? formatPrice(editProfitLocal, editCurrency)
//                               : formatPrice(editProfit, editCurrency)}
//                           </strong>
//                         </div>
//                       </div>
//                       <button
//                         onClick={() => saveEdit(plan.id)}
//                         disabled={saving}
//                         style={btnSaveStyle}
//                       >
//                         {saving ? (
//                           <Loader2
//                             size={14}
//                             style={{ animation: "spin 1s linear infinite" }}
//                           />
//                         ) : (
//                           <Check size={14} />
//                         )}
//                         {t?.save || "Save"}
//                       </button>
//                       <button onClick={cancelEdit} style={btnCancelStyle}>
//                         <X size={14} />
//                       </button>
//                     </div>
//                   ) : (
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "1.5rem",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <div style={{ textAlign: "center", minWidth: 60 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {t?.markup || "Markup"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "0.85rem",
//                             fontWeight: 600,
//                             color: "var(--text)",
//                           }}
//                         >
//                           {plan.config?.markup_type === "percentage"
//                             ? `${plan.config?.markup_value || 0}%`
//                             : formatPrice(
//                                 plan.config?.markup_value || 0,
//                                 plan.display_currency ||
//                                   plan.currency ||
//                                   localCurrency,
//                               )}
//                         </p>
//                       </div>
//                       <div style={{ textAlign: "center", minWidth: 80 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {priceLabel}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "1rem",
//                             fontWeight: 700,
//                             color: yourPrice.hasMarkup
//                               ? "var(--brand-color)"
//                               : "var(--text)",
//                           }}
//                         >
//                           {yourPrice.formatted}
//                         </p>
//                       </div>
//                       <div style={{ textAlign: "center", minWidth: 60 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {t?.profit || "Profit"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "0.85rem",
//                             fontWeight: 600,
//                             color: profit.amount > 0 ? "#6EBD8A" : "var(--dim)",
//                           }}
//                         >
//                           {profit.formatted}
//                           <span
//                             style={{
//                               fontSize: "0.6rem",
//                               fontWeight: 400,
//                               color: "var(--dim)",
//                               marginLeft: 2,
//                             }}
//                           >
//                             ({Math.round(profit.percent)}%)
//                           </span>
//                         </p>
//                       </div>
//                       {isEnabled && (
//                         <button
//                           onClick={() => startEdit(plan)}
//                           style={btnIconStyle}
//                           title={t?.edit || "Edit markup"}
//                         >
//                           <Pencil size={15} />
//                         </button>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       <style jsx>{`
//         @keyframes spin {
//           from {
//             transform: rotate(0deg);
//           }
//           to {
//             transform: rotate(360deg);
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// // Styles
// const labelStyle: React.CSSProperties = {
//   display: "block",
//   fontSize: "0.75rem",
//   fontWeight: 600,
//   color: "var(--muted)",
//   marginBottom: 4,
// };

// const inputStyle: React.CSSProperties = {
//   padding: "0.5rem 0.75rem",
//   background: "var(--bg2)",
//   border: "1px solid var(--border)",
//   borderRadius: 8,
//   color: "var(--text)",
//   fontSize: "0.85rem",
//   outline: "none",
//   fontFamily: "inherit",
//   width: 100,
// };

// const smallInputStyle: React.CSSProperties = {
//   padding: "0.35rem 0.5rem",
//   background: "var(--bg2)",
//   border: "1px solid var(--border)",
//   borderRadius: 6,
//   color: "var(--text)",
//   fontSize: "0.8rem",
//   outline: "none",
//   fontFamily: "inherit",
// };

// const selectStyle: React.CSSProperties = {
//   ...inputStyle,
//   cursor: "pointer",
//   width: "auto",
// };

// const smallSelectStyle: React.CSSProperties = {
//   ...smallInputStyle,
//   cursor: "pointer",
//   width: 50,
// };

// const tabStyle: React.CSSProperties = {
//   padding: "0.5rem 1rem",
//   borderRadius: 8,
//   fontSize: "0.85rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   border: "none",
//   fontFamily: "inherit",
//   transition: "all 0.15s",
//   display: "inline-flex",
//   alignItems: "center",
// };

// const btnPrimaryStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   gap: 6,
//   padding: "0.55rem 1.2rem",
//   background: "var(--brand-color)",
//   border: "none",
//   borderRadius: 8,
//   color: "#FDF8F3",
//   fontSize: "0.85rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   fontFamily: "inherit",
// };

// const btnSaveStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   gap: 4,
//   padding: "0.3rem 0.7rem",
//   background: "#6EBD8A",
//   border: "none",
//   borderRadius: 6,
//   color: "#fff",
//   fontSize: "0.75rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   fontFamily: "inherit",
// };

// const btnCancelStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   padding: "0.3rem",
//   background: "transparent",
//   border: "none",
//   borderRadius: 6,
//   color: "var(--dim)",
//   cursor: "pointer",
// };

// const btnIconStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   padding: "0.4rem",
//   background: "transparent",
//   border: "1px solid var(--border)",
//   borderRadius: 6,
//   color: "var(--muted)",
//   cursor: "pointer",
// };

