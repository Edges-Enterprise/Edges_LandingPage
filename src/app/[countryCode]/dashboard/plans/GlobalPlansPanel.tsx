// src/app/[countryCode]/dashboard/plans/GlobalPlansPanel.tsx
//
// The dashboard's GLOBAL (world) plan view, opened from the globe icon next
// to "Plan Management". Lists every active Zendit plan across every
// destination country, priced in the STORE's currency through the one
// pipeline, so the reseller can enable a foreign plan and set its markup —
// which is what makes a Rwandan store able to sell a Ugandan bundle.
//
// Writes go through the same actions as the local view (togglePlan,
// updatePlanConfig, bulkUpdatePlans); the plan id is unique across
// countries, so no new write path is needed.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  AlertTriangle,
  Globe,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getGlobalPlans } from "@/actions/reseller/plans/getGlobalPlans";
import {
  getGlobalPlanCountries,
  type GlobalPlanCountry,
} from "@/actions/reseller/plans/getGlobalPlanCountries";
import { togglePlan } from "@/actions/reseller/plans/togglePlan";
import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
import { getCatalogSettings } from "@/actions/reseller/plans/catalogMode";
import { CountryConfig } from "@/config/countries";
import { PlanWithConfig } from "@/types/reseller/plans";
import { formatPrice } from "@/lib/currency/currency";
import ThemeSelect from "../ThemeSelect";

interface GlobalPlansPanelProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  /** Called after any change that alters what the local view should show. */
  onChanged?: () => void;
}

const btnIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg2)",
  color: "var(--muted)",
  cursor: "pointer",
  flexShrink: 0,
};

export default function GlobalPlansPanel({
  countryCode,
  config,
  translations,
  onChanged,
}: GlobalPlansPanelProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "";
  const localCurrency = config.currency;

  const [plans, setPlans] = useState<PlanWithConfig[]>([]);
  const [countries, setCountries] = useState<GlobalPlanCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCountry, setActiveCountry] = useState<string>("all");
  const [activeNetwork, setActiveNetwork] = useState<string>("all");
  const [search, setSearch] = useState("");
  // Countries are shown 20 at a time behind Back/Next, so the picker does not
  // render ~120 buttons at once.
  const [countryPage, setCountryPage] = useState(0);
  // The plan list reveals 16 at a time and appends the next 16 as the sentinel
  // nears the viewport.
  const [visibleCount, setVisibleCount] = useState(16);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Mobile collapses a plan to name + toggle; the rest opens in a panel.
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editType, setEditType] = useState<"percentage" | "fixed">("percentage");
  const [editValue, setEditValue] = useState<number | "">(0);
  const [saving, setSaving] = useState(false);

  const [bulkType, setBulkType] = useState<"percentage" | "fixed">("percentage");
  const [bulkValue, setBulkValue] = useState<number | "">(0);
  // The bulk card's own scope, decoupled from the country picker and the
  // network filter above it. "all" + "all" is the store-wide default.
  const [bulkCountry, setBulkCountry] = useState<string>("all");
  const [bulkNetwork, setBulkNetwork] = useState<string>("all");
  const [bulkSaving, setBulkSaving] = useState(false);

  // The store-wide default markup and catalog mode, read so the "All Countries
  // + All Networks" scope can show what it already set. The Catalog card that
  // used to edit these is gone; the bulk card's all+all scope owns them now.
  const [catalogMode, setCatalogModeState] = useState<"selected" | "all">(
    "selected",
  );
  const [defaultMarkupType, setDefaultMarkupType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [defaultMarkupValue, setDefaultMarkupValue] = useState<number | "">(0);

  const flash = useCallback(
    (type: "success" | "error" | "info", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
    },
    [],
  );

  const load = useCallback(
    async () => {
      setLoading(true);
      const [plansRes, countriesRes] = await Promise.all([
        // The whole world catalog once; country/network/search are filters over
        // the loaded set, so scrolling and switching countries never refetch.
        getGlobalPlans({}),
        getGlobalPlanCountries(),
      ]);
      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      } else {
        flash("error", plansRes.error || "Unable to load global plans");
      }
      if (countriesRes.success && countriesRes.data) {
        setCountries(countriesRes.data);
      }
      setLoading(false);
    },
    [flash],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loadCatalogSettings = useCallback(async () => {
    const res = await getCatalogSettings();
    if (res.success && res.data) {
      setCatalogModeState(res.data.catalogMode);
      setDefaultMarkupType(res.data.defaultMarkupType);
      setDefaultMarkupValue(res.data.defaultMarkupValue);
    }
  }, []);

  useEffect(() => {
    void loadCatalogSettings();
  }, [loadCatalogSettings]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onSelectCountry = (country: string) => {
    setActiveCountry(country);
    setEditingPlan(null);
    setExpandedPlanId(null);
    setActiveNetwork("all");
    setVisibleCount(16);
  };

  const networks = useMemo(
    () =>
      [
        ...new Set(
          plans
            .filter((p) => activeCountry === "all" || (p.country_code || "").toLowerCase() === activeCountry)
            .map((p) => p.network)
            .filter((n): n is string => !!n),
        ),
      ].sort(),
    [plans, activeCountry],
  );

  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (
        activeCountry !== "all" &&
        (p.country_code || "").toLowerCase() !== activeCountry
      ) {
        return false;
      }
      if (activeNetwork !== "all" && p.network !== activeNetwork) return false;
      if (q) {
        const hay = `${p.name} ${p.network ?? ""} ${p.country_code ?? ""} ${p.provider_plan_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [plans, activeCountry, activeNetwork, search]);

  const enabledCount = useMemo(
    () => plans.filter((p) => p.config?.enabled === true).length,
    [plans],
  );

  const costBasis = (plan: PlanWithConfig) => plan.cost_local ?? plan.base_price;
  const fmt = (amount: number, currency?: string) =>
    formatPrice(amount, currency || localCurrency);

  // ---- Countries: 20 per page behind Back / Next --------------------------
  // "All Countries" is the first option, then the countries, so pagination is
  // a plain slice over one combined list.
  const COUNTRY_PAGE_SIZE = 20;
  const countryOptions = useMemo(
    () => ["all", ...countries.map((c) => c.country)],
    [countries],
  );
  const countryPageCount = Math.max(
    1,
    Math.ceil(countryOptions.length / COUNTRY_PAGE_SIZE),
  );
  const countryPageItems = countryOptions.slice(
    countryPage * COUNTRY_PAGE_SIZE,
    countryPage * COUNTRY_PAGE_SIZE + COUNTRY_PAGE_SIZE,
  );

  // ---- Plans: reveal 16 at a time, appending as the sentinel nears ---------
  const revealed = visiblePlans.slice(0, visibleCount);
  const hasMore = visibleCount < visiblePlans.length;

  useEffect(() => {
    setVisibleCount(16);
  }, [activeCountry, activeNetwork, search]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + 16);
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, revealed.length]);

  // ---- Bulk scope: the markup already applied to the card's own scope ------
  // Mirrors the local card. "All Countries + All Networks" reads the store
  // default (one field); any narrower scope reads the per-plan configs.
  const bulkIsStoreWide = bulkCountry === "all" && bulkNetwork === "all";
  const bulkNetworks = useMemo(
    () =>
      [
        ...new Set(
          plans
            .filter(
              (p) =>
                bulkCountry === "all" ||
                (p.country_code || "").toLowerCase() === bulkCountry,
            )
            .map((p) => p.network)
            .filter((n): n is string => !!n),
        ),
      ].sort(),
    [plans, bulkCountry],
  );
  const bulkScopeMarkup = useMemo<{
    type: "percentage" | "fixed";
    value: number;
  } | null>(() => {
    if (bulkIsStoreWide) {
      if (catalogMode !== "all") return null;
      return {
        type: defaultMarkupType,
        value: Number(defaultMarkupValue || 0),
      };
    }
    const scoped = plans.filter(
      (p) =>
        (bulkCountry === "all" ||
          (p.country_code || "").toLowerCase() === bulkCountry) &&
        (bulkNetwork === "all" || p.network === bulkNetwork),
    );
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
  }, [
    bulkIsStoreWide,
    catalogMode,
    defaultMarkupType,
    defaultMarkupValue,
    plans,
    bulkCountry,
    bulkNetwork,
  ]);

  // Persist the scope's applied markup into the fields, so the user sees what
  // they set. Not while a bulk apply is in flight (that path sets it itself).
  useEffect(() => {
    if (bulkSaving) return;
    setBulkType(bulkScopeMarkup?.type ?? "percentage");
    setBulkValue(bulkScopeMarkup ? bulkScopeMarkup.value : 0);
  }, [bulkScopeMarkup, bulkSaving]);

  const bulkValueNumber = bulkValue === "" ? 0 : bulkValue;
  const bulkAlreadyApplied =
    bulkScopeMarkup !== null &&
    bulkScopeMarkup.type === bulkType &&
    bulkScopeMarkup.value === bulkValueNumber;

  const handleToggle = async (plan: PlanWithConfig, enabled: boolean) => {
    // Toggling a plan opens its details panel on mobile.
    if (isMobile) setExpandedPlanId(plan.id);
    const previous = plan.config ?? null;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id
          ? {
              ...p,
              config: {
                id: p.config?.id ?? `pending-${p.id}`,
                reseller_id: p.config?.reseller_id ?? "",
                plan_id: p.id,
                enabled,
                markup_type: p.config?.markup_type ?? "percentage",
                markup_value: p.config?.markup_value ?? config.defaultMarkup ?? 0,
                selling_price:
                  p.config?.selling_price ?? p.selling_price_local ?? p.base_price,
                created_at: p.config?.created_at ?? new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          : p,
      ),
    );

    const result = await togglePlan(plan.id, enabled);
    if (result.success) {
      onChanged?.();
    } else {
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, config: previous } : p)),
      );
      flash("error", result.error || "Failed to toggle plan");
    }
  };

  const startEdit = (plan: PlanWithConfig) => {
    setEditingPlan(plan.id);
    setEditType(plan.config?.markup_type || "percentage");
    setEditValue(plan.config?.markup_value || 0);
  };

  const saveEdit = async (plan: PlanWithConfig) => {
    setSaving(true);
    const value = editValue === "" ? 0 : editValue;
    const result = await updatePlanConfig({
      planId: plan.id,
      markupType: editType,
      markupValue: value,
    });
    if (result.success) {
      const basis = costBasis(plan);
      const selling =
        editType === "percentage"
          ? Math.round(basis * (1 + value / 100))
          : Math.round(basis + value);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id
            ? {
                ...p,
                config: p.config
                  ? {
                      ...p.config,
                      markup_type: editType,
                      markup_value: value,
                      selling_price: selling,
                    }
                  : null,
                selling_price_local: selling,
                profit_local: selling - basis,
                profit: selling - basis,
              }
            : p,
        ),
      );
      setEditingPlan(null);
      flash("success", t?.saveSuccess || "Plan updated successfully");
      onChanged?.();
    } else {
      flash("error", result.error || "Failed to update plan");
    }
    setSaving(false);
  };

  const handleBulkUpdate = async () => {
    const value = bulkValue === "" ? 0 : bulkValue;

    // The exact markup is already applied to this scope — re-applying would
    // only rewrite the same rows. Tell the user instead of running it again.
    if (bulkAlreadyApplied) {
      flash("info", t?.bulkAlreadyApplied || "This markup has already been applied");
      return;
    }

    // How many plans this scope will touch, for the confirmation. The scope is
    // the card's own country + network, ignoring the search box.
    const scopeCount = plans.filter(
      (p) =>
        (bulkCountry === "all" ||
          (p.country_code || "").toLowerCase() === bulkCountry) &&
        (bulkNetwork === "all" || p.network === bulkNetwork),
    ).length;

    if (scopeCount === 0 && !bulkIsStoreWide) {
      flash("error", t?.noPlans || "No plans available");
      return;
    }

    const pretty = bulkType === "percentage" ? `${value}%` : fmt(value);
    const scopeLabel =
      `${bulkCountry === "all" ? (t?.allCountries || "all countries") : bulkCountry.toUpperCase()}` +
      ` / ${bulkNetwork === "all" ? (t?.allNetworks || "all networks") : bulkNetwork}`;
    const confirmText = bulkIsStoreWide
      ? `Apply a ${pretty} markup to every plan in every country and network? This sets your store-wide default markup.`
      : `Apply a ${pretty} markup to ${scopeCount} plan${scopeCount === 1 ? "" : "s"} in ${scopeLabel}?`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setBulkSaving(true);

    // Optimistic: reflect the new markup (and enablement) on the cards at once.
    const previous = plans;
    const now = new Date().toISOString();
    setPlans((prev) =>
      prev.map((p) => {
        const inScope =
          bulkIsStoreWide ||
          ((bulkCountry === "all" ||
            (p.country_code || "").toLowerCase() === bulkCountry) &&
            (bulkNetwork === "all" || p.network === bulkNetwork));
        if (!inScope) return p;
        return {
          ...p,
          config: {
            id: p.config?.id ?? `pending-${p.id}`,
            reseller_id: p.config?.reseller_id ?? "",
            plan_id: p.id,
            enabled: true,
            markup_type: bulkType,
            markup_value: value,
            selling_price:
              p.config?.selling_price ?? p.selling_price_local ?? p.base_price,
            created_at: p.config?.created_at ?? now,
            updated_at: now,
          },
        };
      }),
    );

    const result = await bulkUpdatePlans({
      network: bulkNetwork === "all" ? undefined : bulkNetwork,
      markupType: bulkType,
      markupValue: value,
      global: true,
      provider: "zendit",
      country: bulkCountry === "all" ? undefined : bulkCountry,
      // "All Countries + All Networks" is the store-wide default: one field on
      // the application, not a row per plan.
      storeWide: bulkIsStoreWide,
    });

    if (result.success) {
      if (bulkIsStoreWide) {
        setCatalogModeState("all");
        setDefaultMarkupType(bulkType);
        setDefaultMarkupValue(value);
      }
      await load();
      flash("success", `${result.count || 0} plans updated to ${pretty} markup`);
      onChanged?.();
    } else {
      setPlans(previous);
      flash("error", result.error || "Failed to update plans");
    }
    setBulkSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "color-mix(in srgb, var(--brand-color) 16%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Globe size={18} style={{ color: "var(--brand-color)" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
            {t?.globalPlansTitle || "Global Plans"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
            {t?.globalPlansSubtitle ||
              "Enable and price plans for any destination — sold in your store currency"}
          </p>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.72rem",
            color: "var(--muted)",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            padding: "3px 10px",
            borderRadius: 100,
            whiteSpace: "nowrap",
          }}
        >
          {enabledCount} {t?.enabled || "enabled"}
        </span>
      </div>

      {message && (
        <div
          style={{
            padding: "0.8rem 1rem",
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
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {message.type === "success" ? (
            <Check size={15} />
          ) : (
            <AlertTriangle size={15} />
          )}
          {message.text}
        </div>
      )}

      {/* Country picker: 20 options per page, radios, behind Back / Next */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "0.9rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
            {t?.countries || "Countries"}
          </h3>
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>
            {countryPage + 1} / {countryPageCount}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.4rem 0.75rem",
          }}
        >
          {countryPageItems.map((cc) => {
            const isAll = cc === "all";
            const count = isAll
              ? countries.reduce((sum, c) => sum + c.count, 0)
              : countries.find((c) => c.country === cc)?.count ?? 0;
            return (
              <label
                key={cc}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: "var(--text)",
                  cursor: "pointer",
                  minWidth: 0,
                }}
              >
                <input
                  type="radio"
                  name="global-country"
                  checked={activeCountry === cc}
                  onChange={() => onSelectCountry(cc)}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isAll ? t?.allCountries || "All Countries" : cc.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  ({count})
                </span>
              </label>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setCountryPage((p) => Math.max(0, p - 1))}
            disabled={countryPage === 0}
            aria-label={t?.previous || "Previous"}
            style={{
              ...countryPagerBtn,
              opacity: countryPage === 0 ? 0.4 : 1,
              cursor: countryPage === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} />
            {t?.previous || "Previous"}
          </button>
          <button
            onClick={() =>
              setCountryPage((p) => Math.min(countryPageCount - 1, p + 1))
            }
            disabled={countryPage >= countryPageCount - 1}
            aria-label={t?.next || "Next"}
            style={{
              ...countryPagerBtn,
              marginLeft: "auto",
              opacity: countryPage >= countryPageCount - 1 ? 0.4 : 1,
              cursor:
                countryPage >= countryPageCount - 1 ? "not-allowed" : "pointer",
            }}
          >
            {t?.next || "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Search + network filter */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0 0.6rem",
            flex: "1 1 220px",
          }}
        >
          <Search size={15} style={{ color: "var(--muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t?.searchPlans || "Search plans"}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text)",
              padding: "0.55rem 0",
              fontSize: "0.85rem",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
        </div>
        <ThemeSelect
          value={activeNetwork}
          onChange={setActiveNetwork}
          ariaLabel={t?.allNetworks || "Networks"}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text)",
            padding: "0.55rem 0.7rem",
            fontSize: "0.85rem",
            fontFamily: "inherit",
            minWidth: 150,
          }}
          options={[
            { value: "all", label: t?.allNetworks || "All Networks" },
            ...networks.map((n) => ({ value: n, label: n })),
          ]}
        />
      </div>

      {/* Bulk update — the card owns its own scope. "All Countries + All
          Networks" is the store-wide default markup. */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1rem 1.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.7rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <h3 style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
            {t?.bulkPricing || "Bulk Update"}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "auto" }}>
            {bulkIsStoreWide
              ? t?.storeWideHint ||
                "All countries + all networks sets your store-wide default markup"
              : `${bulkCountry === "all" ? t?.allCountries || "All Countries" : bulkCountry.toUpperCase()} / ${
                  bulkNetwork === "all" ? t?.allNetworks || "All Networks" : bulkNetwork
                }`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
            <ThemeSelect
              value={bulkCountry}
              onChange={(v) => {
                setBulkCountry(v);
                setBulkNetwork("all");
              }}
              ariaLabel={t?.applyTo || "Apply To"}
              style={selectStyle}
              options={[
                { value: "all", label: t?.allCountries || "All Countries" },
                ...countries.map((c) => ({
                  value: c.country,
                  label: c.country.toUpperCase(),
                })),
              ]}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>{t?.networks || "Network"}</label>
            <ThemeSelect
              value={bulkNetwork}
              onChange={setBulkNetwork}
              ariaLabel={t?.networks || "Network"}
              style={selectStyle}
              options={[
                { value: "all", label: t?.allNetworks || "All Networks" },
                ...bulkNetworks.map((n) => ({ value: n, label: n })),
              ]}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>{t?.markupType || "Markup Type"}</label>
            <ThemeSelect
              value={bulkType}
              onChange={(v) => setBulkType(v as "percentage" | "fixed")}
              ariaLabel={t?.markupType || "Markup Type"}
              style={selectStyle}
              options={[
                { value: "percentage", label: t?.percentage || "Percentage" },
                { value: "fixed", label: t?.fixed || "Fixed Amount" },
              ]}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>{t?.markupValue || "Value"}</label>
            <input
              type="number"
              value={bulkValue}
              min="0"
              step={bulkType === "percentage" ? "1" : "10"}
              onBlur={() => {
                if (bulkValue === "") setBulkValue(0);
              }}
              onChange={(e) =>
                setBulkValue(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="bulk-value-input"
              style={{
                width: 90,
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                padding: "0.4rem 0.55rem",
                fontSize: "0.82rem",
                fontFamily: "inherit",
              }}
            />
          </div>
          <button
            onClick={handleBulkUpdate}
            disabled={bulkSaving}
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--brand-color)",
              border: "none",
              borderRadius: 8,
              color: "#FDF8F3",
              padding: "0.5rem 0.9rem",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: bulkSaving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: bulkSaving ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
          >
            {bulkSaving ? (
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Check size={15} />
            )}
            {t?.apply || "Apply"}
          </button>
        </div>
      </div>

      {/* Plan list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--dim)" }}>
            <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: "0.5rem" }}>{t?.loading || "Loading plans..."}</p>
          </div>
        ) : visiblePlans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--dim)",
            }}
          >
            <p>{t?.noPlans || "No plans available"}</p>
          </div>
        ) : (
          revealed.map((plan) => {
            const isEnabled = plan.config?.enabled === true;
            const isEditing = editingPlan === plan.id;
            const isExpanded = expandedPlanId === plan.id;
            const basis = costBasis(plan);
            const selling = plan.selling_price_local ?? basis;
            const profit = selling - basis;
            const editSelling = isEditing
              ? editType === "percentage"
                ? Math.round(basis * (1 + (editValue === "" ? 0 : editValue) / 100))
                : Math.round(basis + (editValue === "" ? 0 : editValue))
              : selling;

            return (
              <div
                key={plan.id}
                className={`global-plan-card${isExpanded ? " global-plan-card--expanded" : ""}`}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0.9rem 1.1rem",
                  opacity: isEnabled ? 1 : 0.6,
                }}
              >
                <div className="global-plan-row">
                  <div className="global-plan-info">
                    <div
                      className="global-plan-title"
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
                    >
                      <h3 style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.92rem" }}>
                        {plan.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: "var(--brand-color)",
                          background: "color-mix(in srgb, var(--brand-color) 14%, transparent)",
                          padding: "1px 7px",
                          borderRadius: 100,
                        }}
                      >
                        {(plan.country_code || "").toUpperCase()}
                      </span>
                      {plan.network && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--muted)",
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            padding: "1px 7px",
                            borderRadius: 100,
                          }}
                        >
                          {plan.network}
                        </span>
                      )}
                      {plan.price_type === "RANGE" && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: "var(--brand-color)",
                            background: "var(--bg2)",
                            padding: "1px 7px",
                            borderRadius: 4,
                          }}
                        >
                          {t?.range || "Range"}
                        </span>
                      )}
                      <button
                        className={`global-plan-toggle ${isEnabled ? "is-on" : "is-off"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(plan, !isEnabled);
                        }}
                        aria-pressed={isEnabled}
                        aria-label={
                          isEnabled
                            ? t?.disablePlan || "Disable plan"
                            : t?.enablePlan || "Enable plan"
                        }
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
                      <span className="global-plan-chevron" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </div>
                    <div className="global-plan-cost-line">
                      <p
                        className="global-plan-wholesale"
                        style={{ fontSize: "0.76rem", color: "var(--dim)", marginTop: 3 }}
                      >
                        {t?.wholesalePrice || "Cost Price"}:{" "}
                        <strong style={{ color: "var(--text)" }}>{fmt(basis)}</strong>
                      </p>
                      {/* Mobile: the edit icon sits right of the cost price and
                          only while the dropdown is open. */}
                      {isEnabled && !isEditing && isExpanded && (
                        <button
                          className="global-plan-edit-inline"
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

                  <div className="global-plan-details">
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <select
                          value={editType}
                          onChange={(e) =>
                            setEditType(e.target.value as "percentage" | "fixed")
                          }
                          style={{
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                            padding: "0.35rem 0.5rem",
                            fontSize: "0.8rem",
                            fontFamily: "inherit",
                          }}
                        >
                          <option value="percentage">{t?.percentage || "Percentage"}</option>
                          <option value="fixed">{t?.fixed || "Fixed Amount"}</option>
                        </select>
                        <input
                          type="number"
                          value={editValue}
                          autoFocus
                          onChange={(e) =>
                            setEditValue(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          style={{
                            width: 78,
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                            padding: "0.35rem 0.5rem",
                            fontSize: "0.8rem",
                            fontFamily: "inherit",
                          }}
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {t?.yourPrice || "Your Price"}:{" "}
                          <strong style={{ color: "var(--text)" }}>{fmt(editSelling)}</strong>
                        </span>
                        <button
                          onClick={() => saveEdit(plan)}
                          disabled={saving}
                          style={{ ...btnIconStyle, color: "#6EBD8A" }}
                          title={t?.save || "Save"}
                        >
                          {saving ? (
                            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Check size={15} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.9rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "0.66rem", color: "var(--dim)" }}>
                            {t?.markup || "Markup"}
                          </p>
                          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 600 }}>
                            {plan.config?.markup_type === "fixed"
                              ? fmt(plan.config?.markup_value || 0)
                              : `${plan.config?.markup_value ?? 0}%`}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "0.66rem", color: "var(--dim)" }}>
                            {t?.yourPrice || "Your Price"}
                          </p>
                          <p style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 700 }}>
                            {fmt(selling)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "0.66rem", color: "var(--dim)" }}>
                            {t?.profit || "Profit"}
                          </p>
                          <p style={{ fontSize: "0.82rem", color: "#6EBD8A", fontWeight: 700 }}>
                            {fmt(profit)}
                          </p>
                        </div>
                        {isEnabled && (
                          <button
                            className="global-plan-edit-desktop"
                            onClick={() => startEdit(plan)}
                            style={btnIconStyle}
                            title={t?.edit || "Edit markup"}
                            aria-label={t?.edit || "Edit markup"}
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
        {!loading && hasMore && (
          <div
            ref={sentinelRef}
            style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--dim)" }} />
          </div>
        )}
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
        /* Desktop: the card is a single row — info on the left, the details
           wrapper (display: contents) laid out inline beside it, no chevron. */
        .global-plan-row {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .global-plan-info {
          flex: 1;
          min-width: 200px;
        }
        .global-plan-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .global-plan-details {
          display: contents;
        }
        .global-plan-chevron {
          display: none;
        }
        .global-plan-edit-inline {
          display: none;
        }
        .global-plan-edit-desktop {
          display: inline-flex;
        }
        .global-plan-cost-line {
          display: block;
        }
        /* Toggle: desktop keeps the original green / dim appearance. */
        .global-plan-toggle.is-on {
          background: #6ebd8a;
        }
        .global-plan-toggle.is-off {
          background: var(--dim);
        }
        /* The value field is compact; hide the native spinner so the whole box
           focuses the text instead of incrementing on a centre tap. */
        .bulk-value-input::-webkit-outer-spin-button,
        .bulk-value-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .bulk-value-input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        /* Mobile: name + toggle + chevron; the rest opens in the panel. */
        @media (max-width: 767px) {
          .global-plan-wholesale {
            display: none;
          }
          .global-plan-details {
            display: none;
          }
          .global-plan-card--expanded .global-plan-details {
            display: block;
            flex-basis: 100%;
          }
          .global-plan-card--expanded .global-plan-wholesale {
            display: block;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border);
          }
          .global-plan-cost-line {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
          }
          .global-plan-cost-line .global-plan-wholesale {
            margin: 0;
            border-top: none;
            padding-top: 0;
          }
          .global-plan-edit-inline {
            display: inline-flex;
          }
          .global-plan-edit-desktop {
            display: none;
          }
          .global-plan-title {
            flex-wrap: nowrap;
          }
          .global-plan-title h3 {
            flex: 1 1 auto;
            min-width: 0;
          }
          .global-plan-chevron {
            display: inline-flex;
            align-items: center;
            color: var(--dim);
            transition: transform 0.2s;
          }
          .global-plan-card--expanded .global-plan-chevron {
            transform: rotate(180deg);
          }
          /* Mobile: inactive is red, active is green. */
          .global-plan-toggle.is-off {
            background: #ef4444;
          }
          .global-plan-details > div {
            flex-wrap: wrap;
            row-gap: 0.6rem;
          }
        }
      `}</style>
    </div>
  );
}

const countryPagerBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.45rem 0.9rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg2)",
  color: "var(--text)",
  fontSize: "0.78rem",
  fontWeight: 700,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "var(--dim)",
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "0.4rem 0.55rem",
  fontSize: "0.82rem",
  fontFamily: "inherit",
  minWidth: 130,
};
