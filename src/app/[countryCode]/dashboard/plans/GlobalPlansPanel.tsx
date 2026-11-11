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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, AlertTriangle, Globe, Search } from "lucide-react";
import { getGlobalPlans } from "@/actions/reseller/plans/getGlobalPlans";
import {
  getGlobalPlanCountries,
  type GlobalPlanCountry,
} from "@/actions/reseller/plans/getGlobalPlanCountries";
import { togglePlan } from "@/actions/reseller/plans/togglePlan";
import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
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
  // "All Countries" is the whole Zendit catalog (~1000 plans); render a page
  // at a time so the first paint stays fast.
  const [limit, setLimit] = useState(60);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editType, setEditType] = useState<"percentage" | "fixed">("percentage");
  const [editValue, setEditValue] = useState<number | "">(0);
  const [saving, setSaving] = useState(false);

  const [bulkType, setBulkType] = useState<"percentage" | "fixed">("percentage");
  const [bulkValue, setBulkValue] = useState<number | "">(0);
  const [bulkSaving, setBulkSaving] = useState(false);

  const flash = useCallback(
    (type: "success" | "error", text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
    },
    [],
  );

  const load = useCallback(
    async (country?: string) => {
      setLoading(true);
      const [plansRes, countriesRes] = await Promise.all([
        getGlobalPlans(country && country !== "all" ? { country } : {}),
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

  const onSelectCountry = (country: string) => {
    setActiveCountry(country);
    setEditingPlan(null);
    setActiveNetwork("all");
    setLimit(60);
    void load(country);
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

  const handleToggle = async (plan: PlanWithConfig, enabled: boolean) => {
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

    // How many plans this scope will touch, for the confirmation. The scope
    // is country + network, ignoring the search box.
    const scopeCount = plans.filter(
      (p) =>
        (activeCountry === "all" ||
          (p.country_code || "").toLowerCase() === activeCountry) &&
        (activeNetwork === "all" || p.network === activeNetwork),
    ).length;

    if (scopeCount === 0) {
      flash("error", t?.noPlans || "No plans available");
      return;
    }

    const pretty =
      bulkType === "percentage" ? `${value}%` : fmt(value);
    const scopeLabel =
      `${activeCountry === "all" ? (t?.allCountries || "all countries") : activeCountry.toUpperCase()}` +
      ` / ${activeNetwork === "all" ? (t?.allNetworks || "all networks") : activeNetwork}`;
    if (
      !window.confirm(
        `Apply a ${pretty} markup to ${scopeCount} plan${scopeCount === 1 ? "" : "s"} in ${scopeLabel}?`,
      )
    ) {
      return;
    }

    setBulkSaving(true);

    // Optimistic: reflect the new markup (and enablement) on the cards at once.
    const previous = plans;
    const now = new Date().toISOString();
    setPlans((prev) =>
      prev.map((p) => {
        const inScope =
          (activeCountry === "all" ||
            (p.country_code || "").toLowerCase() === activeCountry) &&
          (activeNetwork === "all" || p.network === activeNetwork);
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
      network: activeNetwork === "all" ? undefined : activeNetwork,
      markupType: bulkType,
      markupValue: value,
      global: true,
      provider: "zendit",
      country: activeCountry === "all" ? undefined : activeCountry,
    });

    if (result.success) {
      await load(activeCountry);
      flash(
        "success",
        `${result.count || 0} plans updated to ${pretty} markup`,
      );
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
                : "rgba(239,68,68,0.1)",
            border:
              message.type === "success"
                ? "1px solid rgba(110,189,138,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
            color: message.type === "success" ? "#6EBD8A" : "#F87171",
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

      {/* Country picker */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => onSelectCountry("all")}
          style={{
            ...tabStyle,
            background: activeCountry === "all" ? "var(--brand-color)" : "var(--bg2)",
            color: activeCountry === "all" ? "#FDF8F3" : "var(--muted)",
            border: activeCountry === "all" ? "none" : "1px solid var(--border)",
          }}
        >
          {t?.allCountries || "All Countries"}
        </button>
        {countries.map((c) => (
          <button
            key={c.country}
            onClick={() => onSelectCountry(c.country)}
            style={{
              ...tabStyle,
              background:
                activeCountry === c.country ? "var(--brand-color)" : "var(--bg2)",
              color: activeCountry === c.country ? "#FDF8F3" : "var(--muted)",
              border:
                activeCountry === c.country ? "none" : "1px solid var(--border)",
            }}
          >
            {c.country.toUpperCase()}
            <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: 4 }}>
              ({c.count})
            </span>
          </button>
        ))}
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

      {/* Bulk update (global scope) */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1rem 1.1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
          {t?.bulkPricing || "Bulk Update"}
        </h3>
        <ThemeSelect
          value={bulkType}
          onChange={(v) => setBulkType(v as "percentage" | "fixed")}
          ariaLabel={t?.markupType || "Markup Type"}
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text)",
            padding: "0.4rem 0.55rem",
            fontSize: "0.82rem",
            fontFamily: "inherit",
            minWidth: 130,
          }}
          options={[
            { value: "percentage", label: t?.percentage || "Percentage" },
            { value: "fixed", label: t?.fixed || "Fixed Amount" },
          ]}
        />
        <input
          type="number"
          value={bulkValue}
          onBlur={() => {
            if (bulkValue === "") setBulkValue(0);
          }}
          onChange={(e) =>
            setBulkValue(e.target.value === "" ? "" : Number(e.target.value))
          }
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
        <button
          onClick={handleBulkUpdate}
          disabled={bulkSaving}
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
          visiblePlans.slice(0, limit).map((plan) => {
            const isEnabled = plan.config?.enabled === true;
            const isEditing = editingPlan === plan.id;
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
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0.9rem 1.1rem",
                  opacity: isEnabled ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.9rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
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
                  </div>
                  <p style={{ fontSize: "0.76rem", color: "var(--dim)", marginTop: 3 }}>
                    {t?.wholesalePrice || "Cost Price"}:{" "}
                    <strong style={{ color: "var(--text)" }}>{fmt(basis)}</strong>
                  </p>
                </div>

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
                        onClick={() => startEdit(plan)}
                        style={btnIconStyle}
                        title={t?.edit || "Edit markup"}
                        aria-label={t?.edit || "Edit markup"}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(plan, !isEnabled)}
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
                        background: isEnabled ? "#6EBD8A" : "var(--dim)",
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
                  </div>
                )}
              </div>
            );
          })
        )}
        {!loading && visiblePlans.length > limit && (
          <button
            onClick={() => setLimit((l) => l + 60)}
            style={{
              alignSelf: "center",
              marginTop: "0.5rem",
              padding: "0.6rem 1.4rem",
              borderRadius: 10,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t?.loadMore || "Load more"} ({visiblePlans.length - limit})
          </button>
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
