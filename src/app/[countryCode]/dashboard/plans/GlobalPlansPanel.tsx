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
import type {
  GlobalPlanCountry,
  GlobalPlanFacets,
} from "@/actions/reseller/plans/globalPlansTypes";
import { togglePlan } from "@/actions/reseller/plans/togglePlan";
import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
import { getCatalogSettings } from "@/actions/reseller/plans/catalogMode";
import { CountryConfig } from "@/config/countries";
import { PlanWithConfig } from "@/types/reseller/plans";
import { formatPrice } from "@/lib/currency/currency";
import { countryFlag } from "@/lib/storefront/countryLabel";
import ThemeSelect from "../ThemeSelect";

/** Rows per page — must match the action's page size. */
const PAGE_SIZE = 32;

interface GlobalPlansPanelProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  /** First page, server-rendered so the globe opens with no spinner. */
  initialPlans?: PlanWithConfig[];
  /** True total behind the first page (the "over 10k" figure). */
  initialTotal?: number;
  /** Country list + network list, from one cached catalog scan. */
  initialFacets?: GlobalPlanFacets | null;
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
  initialPlans,
  initialTotal,
  initialFacets,
  onChanged,
}: GlobalPlansPanelProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "";
  const localCurrency = config.currency;

  // The first page and the facets are server-rendered, so the globe opens with
  // content already there — no "Loading plans..." on the happy path.
  const seeded = (initialPlans?.length ?? 0) > 0;

  const [plans, setPlans] = useState<PlanWithConfig[]>(initialPlans ?? []);
  const [total, setTotal] = useState<number>(
    initialTotal ?? initialPlans?.length ?? 0,
  );
  const [countries] = useState<GlobalPlanCountry[]>(
    initialFacets?.countries ?? [],
  );
  const [facets] = useState<GlobalPlanFacets | null>(initialFacets ?? null);
  const [loading, setLoading] = useState(!seeded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string>("all");
  const [activeNetwork, setActiveNetwork] = useState<string>("all");
  // The search box updates immediately; the query behind it is debounced.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // Countries are shown 20 at a time behind Back/Next. The whole (small) list is
  // already in memory, so paging is instant — no fetch, no spinner.
  const [countryPage, setCountryPage] = useState(0);
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
  // A destructive store-wide apply asks for confirmation in an in-app modal
  // rather than window.confirm, so the prompt reads as part of the product
  // ("Are you sure?") instead of the browser's "<host> says" chrome.
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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

  // One in-flight page request at a time; a scroll tick that fires while a page
  // is loading is dropped rather than queued (the sentinel re-fires).
  const inFlight = useRef(false);
  const reqSeq = useRef(0);

  /**
   * Fetch one page of plans. `replace` resets the list (a scope change or a
   * refresh); otherwise the page is appended (infinite scroll).
   *
   * A `replace` is never dropped: switching country while a fetch is in flight
   * must not leave the previous country's rows on screen. Each call takes a
   * sequence number and only the newest applies its result, so a slow response
   * cannot overwrite a newer scope.
   */
  const fetchPage = useCallback(
    async (opts: {
      offset: number;
      replace: boolean;
      country: string;
      network: string;
      term: string;
    }) => {
      if (!opts.replace) {
        if (inFlight.current) return;
        inFlight.current = true;
      }
      const seq = ++reqSeq.current;
      if (opts.replace) setLoading(true);
      else setLoadingMore(true);

      const res = await getGlobalPlans({
        country: opts.country,
        network: opts.network,
        search: opts.term,
        offset: opts.offset,
        limit: PAGE_SIZE,
      });

      if (seq === reqSeq.current) {
        if (res.success && res.data) {
          const page = res.data;
          setTotal(page.total);
          setPlans((prev) =>
            opts.replace ? page.plans : [...prev, ...page.plans],
          );
        } else {
          flash("error", res.error || "Unable to load global plans");
        }
      }

      if (opts.replace) {
        setLoading(false);
      } else {
        setLoadingMore(false);
        inFlight.current = false;
      }
    },
    [flash],
  );

  // Debounce the search box so each keystroke does not hit the server.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // A scope change (country / network / search) reloads from the first page.
  // The very first run is skipped when the default scope was already seeded
  // server-side, so the globe does not refetch page 1 on open.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (seeded && activeCountry === "all" && activeNetwork === "all" && search === "") {
        return;
      }
    }
    setCountryPage(0);
    void fetchPage({
      offset: 0,
      replace: true,
      country: activeCountry,
      network: activeNetwork,
      term: search,
    });
  }, [activeCountry, activeNetwork, search, seeded, fetchPage]);

  // Infinite scroll: pull the next page as the sentinel nears the viewport, so
  // it is already loaded by the time the user reaches the bottom.
  const hasMore = plans.length < total;
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void fetchPage({
            offset: plans.length,
            replace: false,
            country: activeCountry,
            network: activeNetwork,
            term: search,
          });
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    hasMore,
    loading,
    plans.length,
    activeCountry,
    activeNetwork,
    search,
    fetchPage,
  ]);

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
  };

  // Networks offered by the filter: for one country, that country's own
  // networks; for "all countries", every network in the catalog. Both come from
  // the cached facets, so the picker never waits on the plan list.
  const networks = useMemo(() => {
    if (!facets) return [];
    if (activeCountry === "all") return facets.networks;
    return facets.countryNetworks[activeCountry] ?? [];
  }, [facets, activeCountry]);

  // The server already filtered and paged `plans`, so it IS the visible list —
  // no client-side country/network/search filtering over a partial set.
  const visiblePlans = plans;

  const costBasis = (plan: PlanWithConfig) => plan.cost_local ?? plan.base_price;
  const fmt = (amount: number, currency?: string) =>
    formatPrice(amount, currency || localCurrency);

  // ---- Countries: 20 per page behind Back / Next --------------------------
  // The full (small) country list is in memory from the facets, so paging is a
  // plain slice — no fetch, no spinner.
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

  // ---- Bulk scope: the markup already applied to the card's own scope ------
  // Mirrors the local card. "All Countries + All Networks" reads the store
  // default (one field); any narrower scope reads the per-plan configs of the
  // plans currently loaded for that scope.
  const bulkIsStoreWide = bulkCountry === "all" && bulkNetwork === "all";
  const bulkNetworks = useMemo(() => {
    if (!facets) return [];
    if (bulkCountry === "all") return facets.networks;
    return facets.countryNetworks[bulkCountry] ?? [];
  }, [facets, bulkCountry]);
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

  // Runs the write itself. Kept separate from handleBulkUpdate so the in-app
  // confirmation modal can call it after the user presses Confirm.
  const applyBulkUpdate = async (value: number, pretty: string) => {
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
      // Re-read the first page of the current scope so the cards reflect the
      // new markup. The write itself was server-side; only the loaded page is
      // refreshed, not the whole catalog.
      await fetchPage({
        offset: 0,
        replace: true,
        country: activeCountry,
        network: activeNetwork,
        term: search,
      });
      flash("success", `${result.count || 0} plans updated to ${pretty} markup`);
      onChanged?.();
    } else {
      setPlans(previous);
      flash("error", result.error || "Failed to update plans");
    }
    setBulkSaving(false);
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
    // the card's own country + network, ignoring the search box. It is a server
    // count: the loaded list is only a page or two, so counting it would report
    // 32 for a scope that is really thousands.
    let scopeCount = total;
    if (!bulkIsStoreWide) {
      const countRes = await getGlobalPlans({
        country: bulkCountry,
        network: bulkNetwork,
        offset: 0,
        limit: 1,
      });
      scopeCount = countRes.success && countRes.data ? countRes.data.total : 0;
    }

    if (scopeCount === 0 && !bulkIsStoreWide) {
      flash("error", t?.noPlans || "No plans available");
      return;
    }

    const pretty = bulkType === "percentage" ? `${value}%` : fmt(value);
    const scopeLabel =
      `${bulkCountry === "all" ? (t?.allCountries || "all countries") : bulkCountry.toUpperCase()}` +
      ` / ${bulkNetwork === "all" ? (t?.allNetworks || "all networks") : bulkNetwork}`;
    const confirmMessage = bulkIsStoreWide
      ? `Apply a ${pretty} markup to every plan in every country and network? This sets your store-wide default markup.`
      : `Apply a ${pretty} markup to ${scopeCount} plan${scopeCount === 1 ? "" : "s"} in ${scopeLabel}?`;

    // In-app confirmation instead of window.confirm, so the prompt is styled
    // and titled "Are you sure?" rather than the browser's "<host> says".
    setPendingConfirm({
      message: confirmMessage,
      onConfirm: () => {
        setPendingConfirm(null);
        void applyBulkUpdate(value, pretty);
      },
    });
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
          {total.toLocaleString()} {t?.plansCount || "plans"}
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

      {/* Country picker: 20 options per page, behind Previous / Next */}
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
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {countryPageItems.map((cc) => {
            const isAll = cc === "all";
            const count = isAll
              ? countries.reduce((sum, c) => sum + c.count, 0)
              : countries.find((c) => c.country === cc)?.count ?? 0;
            const isActive = activeCountry === cc;
            return (
              <button
                key={cc}
                onClick={() => onSelectCountry(cc)}
                style={{
                  ...tabStyle,
                  background: isActive ? "var(--brand-color)" : "var(--bg2)",
                  color: isActive ? "#FDF8F3" : "var(--muted)",
                  border: isActive ? "none" : "1px solid var(--border)",
                }}
              >
                {isAll ? (
                  t?.allCountries || "All Countries"
                ) : (
                  <>
                    <span aria-hidden style={{ marginRight: 6 }}>
                      {countryFlag(cc)}
                    </span>
                    {cc.toUpperCase()}
                  </>
                )}
                <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: 4 }}>
                  ({count})
                </span>
              </button>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
        <div
          className="global-bulk-row"
          style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}
        >
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
          <div
            className="global-bulk-group"
            style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
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
            className="global-bulk-apply"
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
            <span className="global-bulk-apply-label">{t?.apply || "Apply"}</span>
          </button>
          </div>
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
          visiblePlans.map((plan) => {
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
        {!loading && !hasMore && visiblePlans.length > 0 && (
          <p
            style={{
              textAlign: "center",
              color: "var(--dim)",
              fontSize: "0.78rem",
              padding: "0.5rem",
            }}
          >
            {t?.allPlansShown || "All plans shown"}
          </p>
        )}
      </div>

      {/* In-app confirmation for a bulk apply (replaces window.confirm). */}
      {pendingConfirm && (
        <div className="global-confirm-overlay" role="presentation">
          <div
            className="global-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-confirm-title"
          >
            <div className="global-confirm-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 id="global-confirm-title" className="global-confirm-title">
              {t?.areYouSure || "Are you sure?"}
            </h3>
            <p className="global-confirm-message">{pendingConfirm.message}</p>
            <div className="global-confirm-actions">
              <button
                type="button"
                className="global-confirm-cancel"
                onClick={() => setPendingConfirm(null)}
                disabled={bulkSaving}
              >
                {t?.cancel || "Cancel"}
              </button>
              <button
                type="button"
                className="global-confirm-ok"
                onClick={pendingConfirm.onConfirm}
                disabled={bulkSaving}
              >
                {bulkSaving ? (
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                ) : null}
                {t?.apply || "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

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
        /* In-app confirm dialog for a bulk apply. The overlay only dims and
           blurs; the card itself is translucent glass, so the page behind it
           stays visible through the panel rather than being covered by a solid
           fill. */
        .global-confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.22);
          -webkit-backdrop-filter: blur(4px) saturate(130%);
          backdrop-filter: blur(4px) saturate(130%);
        }
        .global-confirm-card {
          width: 100%;
          max-width: 26rem;
          background: color-mix(in srgb, var(--bg2) 46%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          border-radius: 14px;
          padding: 1.4rem;
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          -webkit-backdrop-filter: blur(12px) saturate(150%);
          backdrop-filter: blur(12px) saturate(150%);
          text-align: center;
        }
        .global-confirm-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          background: color-mix(in srgb, #ef4444 16%, transparent);
          color: #ef4444;
        }
        .global-confirm-title {
          margin: 0 0 0.5rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text);
        }
        .global-confirm-message {
          margin: 0 0 1.25rem;
          font-size: 0.86rem;
          line-height: 1.5;
          color: var(--muted);
        }
        .global-confirm-actions {
          display: flex;
          gap: 0.6rem;
        }
        .global-confirm-actions button {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.6rem 0.9rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .global-confirm-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .global-confirm-cancel {
          background: color-mix(in srgb, var(--bg) 55%, transparent);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          color: var(--text);
        }
        .global-confirm-ok {
          background: var(--brand-color);
          border: none;
          color: #FDF8F3;
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
          /* Bulk row on mobile: Apply To + Network share the first line, and
             Markup Type + Value + Apply share the second. The controls are given
             one height so each line reads as a single row, the Value field is
             kept narrow, and a wider gap sets the icon-only Apply apart from the
             Markup Type / Value fields.
             ThemeSelect renders its trigger in another component, so styled-jsx
             never scopes it — the trigger needs :global to be targeted here. */
          .global-bulk-row {
            row-gap: 0.7rem;
          }
          .global-bulk-row :global(.theme-select-trigger) {
            width: 100%;
            height: 34px;
            /* The trigger's inline min-width would stop it shrinking to half a
               narrow phone; the label already ellipsises. */
            min-width: 0 !important;
          }
          /* First line: the two scope selects split the width. */
          .global-bulk-row > div:not(.global-bulk-group) {
            flex: 1 1 calc(50% - 0.3rem);
            min-width: 0;
          }
          /* Second line: Markup Type grows, Value stays narrow, Apply is compact. */
          .global-bulk-group {
            flex: 1 1 100%;
            /* The group's gap is inline, so it needs !important; the wider gap
               sets the fields apart, in particular Value from Apply. */
            gap: 1rem !important;
          }
          .global-bulk-group > div {
            flex: 1 1 0;
            min-width: 0;
          }
          .global-bulk-group > div:last-of-type {
            flex: 0 0 66px;
          }
          .global-bulk-group > div > input {
            width: 100% !important;
            height: 34px;
          }
          /* Icon-only apply button; the label is desktop-only. The padding and
             gap are set inline on the button, so the compact overrides here
             need !important to win. */
          .global-bulk-apply {
            flex: 0 0 auto;
            /* The field boxes are taller than the button because of their labels,
               so bottom-align the button with the select/input row. */
            align-self: flex-end !important;
            height: 34px;
            padding: 0.55rem 0.7rem !important;
            gap: 0 !important;
          }
          .global-bulk-apply-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const tabStyle: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 10,
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "0.02em",
  transition: "all 0.15s",
};

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
