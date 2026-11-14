"use client";

// src/app/[countryCode]/admin/platform-plans/PlatformPlansClient.tsx
//
// Platform-admin UI. Two panels:
//
//   1. Platform markup — set the platform's own cut at default / country /
//      provider. Levels REPLACE, they do not stack (see
//      `_shared/currency/markup.ts`). Cross-border plans resolve country then
//      default; at HOME (plan cost currency == store currency) only the
//      provider and plan levels apply, because there is no FX to mark up — and
//      the per-plan row lives in the catalog below, where it is set against a
//      real plan instead of a pasted id.
//   2. Plan catalog — Provider | Plan | Cost as the row; every other field and
//      the per-plan platform markup (the lever that raises a Lizzysub/Accragh
//      cost at home) open in the row's dropdown.
//
// Adding a new plan is deliberately NOT here (deferred item 9): Lizzysub and
// Accragh plans are seeded by SQL.

import { Fragment, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ThemeSelect from "@/app/[countryCode]/dashboard/ThemeSelect";
import {
  deletePlatformMarkup,
  listPlatformMarkups,
  savePlatformMarkup,
  searchPlatformPlans,
  setPlanActive,
  type MarkupRow,
  type MarkupScope,
  type MarkupType,
  type PlatformPlanRow,
} from "@/app/actions/platform-plans";

/** The levels the general markup card sets; per-plan is in the catalog. */
type FormScope = Exclude<MarkupScope, "plan">;

const SCOPE_LABEL: Record<FormScope, string> = {
  default: "Default (every plan)",
  country: "Country",
  provider: "Provider",
};

const PROVIDERS = ["lizzysub", "accragh", "zendit"];

interface Props {
  adminEmail: string | null;
  initialMarkups: MarkupRow[];
  initialPlans: PlatformPlanRow[];
  initialTotal: number;
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "1.25rem",
  marginBottom: "1.25rem",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg2)",
  border: "1px solid var(--border2)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "0.5rem 0.65rem",
  fontSize: "0.85rem",
  width: "100%",
};

const btnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "0.5rem 0.9rem",
  fontWeight: 600,
  fontSize: "0.8rem",
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border2)",
  borderRadius: 8,
  padding: "0.5rem 0.9rem",
  fontSize: "0.8rem",
  cursor: "pointer",
};

/** The raw cost after a percentage markup — the home basis the reseller sees. */
function homePriceAfter(base: number, type: MarkupType, value: number): number {
  if (!Number.isFinite(value) || value <= 0) return base;
  return type === "percentage" ? base * (1 + value / 100) : base;
}

function formatAmount(value: number, currency: string): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * The reseller's home basis for one plan. A percentage markup raises the raw
 * cost in its own currency; a fixed markup is USD, so it cannot be added to a
 * local cost without the rate — it is shown as raw cost plus the USD amount.
 */
function homeBasisLabel(
  plan: PlatformPlanRow,
  markup: MarkupRow | undefined,
): string {
  const raw = formatAmount(plan.base_price, plan.currency);
  if (!markup || !markup.enabled) return raw;
  if (markup.markup_type === "percentage") {
    return `${formatAmount(
      homePriceAfter(plan.base_price, "percentage", markup.markup_value),
      plan.currency,
    )} (raw + ${markup.markup_value}%)`;
  }
  return `${raw} + ${markup.markup_value} USD`;
}

export default function PlatformPlansClient({
  adminEmail,
  initialMarkups,
  initialPlans,
  initialTotal,
}: Props) {
  const [markups, setMarkups] = useState<MarkupRow[]>(initialMarkups);
  const [plans, setPlans] = useState<PlatformPlanRow[]>(initialPlans);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // General markup form (default / country / provider)
  const [scope, setScope] = useState<FormScope>("default");
  const [scopeKey, setScopeKey] = useState("*");
  const [markupType, setMarkupType] = useState<MarkupType>("percentage");
  const [markupValue, setMarkupValue] = useState("12");

  // Plan search
  const [provider, setProvider] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Catalog row dropdown + its per-plan markup editor
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planMarkupType, setPlanMarkupType] = useState<MarkupType>("percentage");
  const [planMarkupValue, setPlanMarkupValue] = useState("");

  const planMarkupFor = (planId: string): MarkupRow | undefined =>
    markups.find((m) => m.scope === "plan" && m.scope_key === planId);

  const refreshMarkups = () => {
    startTransition(async () => {
      setMarkups(await listPlatformMarkups());
    });
  };

  const runSearch = (nextPage: number) => {
    startTransition(async () => {
      const res = await searchPlatformPlans({
        provider: provider || undefined,
        countryCode: countryCode || undefined,
        search: search || undefined,
        page: nextPage,
        pageSize,
      });
      setPlans(res.plans);
      setTotal(res.total);
      setPage(nextPage);
      setExpandedPlanId(null);
    });
  };

  const onSaveMarkup = () => {
    startTransition(async () => {
      const res = await savePlatformMarkup({
        scope,
        scopeKey: scope === "default" ? "*" : scopeKey,
        markupType,
        markupValue: Number(markupValue),
        enabled: true,
      });
      setMessage(res.success ? "Markup saved." : res.error ?? "Failed");
      refreshMarkups();
    });
  };

  const onToggleMarkup = (row: MarkupRow) => {
    startTransition(async () => {
      const res = await savePlatformMarkup({
        scope: row.scope,
        scopeKey: row.scope_key,
        markupType: row.markup_type,
        markupValue: row.markup_value,
        enabled: !row.enabled,
      });
      setMessage(res.success ? "Markup updated." : res.error ?? "Failed");
      refreshMarkups();
    });
  };

  const onDeleteMarkup = (row: MarkupRow) => {
    startTransition(async () => {
      const res = await deletePlatformMarkup(row.id);
      setMessage(res.success ? "Markup removed." : res.error ?? "Failed");
      refreshMarkups();
    });
  };

  const onSavePlanMarkup = (plan: PlatformPlanRow) => {
    if (planMarkupValue.trim() === "") {
      setMessage("Enter a markup value first.");
      return;
    }
    startTransition(async () => {
      const res = await savePlatformMarkup({
        scope: "plan",
        scopeKey: plan.id,
        markupType: planMarkupType,
        markupValue: Number(planMarkupValue),
        enabled: true,
      });
      setMessage(
        res.success
          ? `Platform markup saved for ${plan.name}.`
          : res.error ?? "Failed",
      );
      refreshMarkups();
    });
  };

  const onTogglePlan = (plan: PlatformPlanRow) => {
    startTransition(async () => {
      const res = await setPlanActive(plan.id, !plan.is_active);
      if (!res.success) {
        setMessage(res.error ?? "Failed");
        return;
      }
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, is_active: !p.is_active } : p,
        ),
      );
      setMessage(plan.is_active ? "Plan disabled." : "Plan enabled.");
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pp-page">
      <style>{`
        .pp-page {
          padding: 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        /* The markup table carries six columns. Below the tablet breakpoint it
           scrolls sideways rather than crushing the columns or forcing the page
           wider than the viewport. */
        .pp-table-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .pp-table-wrap table {
          min-width: 520px;
        }
        .pp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .pp-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        /* Catalog: the row is Provider | Plan | Cost; the chevron opens the
           rest, including the per-plan markup editor. */
        .pp-catalog-row {
          cursor: pointer;
        }
        .pp-catalog-row:hover td {
          background: var(--bg2);
        }
        .pp-chevron {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
        }
        .pp-detail-cell {
          background: var(--bg2);
          border-top: 1px solid var(--border);
          padding: 0 !important;
        }
        .pp-detail {
          padding: 0.9rem 1rem 1.1rem;
          display: grid;
          gap: 1rem;
        }
        .pp-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px 18px;
          font-size: 0.8rem;
        }
        .pp-detail-label {
          color: var(--muted);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 2px;
        }
        .pp-markup-box {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.85rem;
          background: var(--card);
        }
        .pp-markup-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          align-items: end;
        }
        .pp-inline-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        @media (max-width: 767px) {
          .pp-page {
            padding: 1rem 0.85rem;
          }
          .pp-grid {
            grid-template-columns: 1fr;
          }
          .pp-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 4 }}>
        Platform plans
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 4 }}>
        Platform-admin only. Sets the platform&apos;s own markup and turns
        plans on or off.
      </p>
      <p style={{ color: "var(--dim)", fontSize: "0.75rem", marginBottom: 16 }}>
        Signed in as {adminEmail ?? "admin"}
      </p>

      {message && (
        <div
          style={{
            ...cardStyle,
            padding: "0.6rem 0.9rem",
            color: "var(--accent-lt)",
            fontSize: "0.85rem",
          }}
        >
          {message}
        </div>
      )}

      {/* ---------- Platform markup ---------- */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>
          Platform markup
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 14 }}>
          The platform&apos;s own cut, added on top of the raw provider cost.
          Levels replace each other; they do not stack. Cross-border plans
          resolve the country row, then the default. At home (a plan whose cost
          currency equals the store&apos;s, e.g. a Lizzysub NGN plan in an NG
          store) only the Provider and Plan levels apply, because there is no
          FX to mark up. So this is the lever that raises the Lizzysub or
          Accragh cost: set Provider = lizzysub (or accragh) to lift every plan
          from that provider, or open a single plan in the catalog below and
          set its per-plan markup.
        </p>

        <div className="pp-grid">
          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Scope
            <ThemeSelect
              value={scope}
              onChange={(v) => {
                const next = v as FormScope;
                setScope(next);
                if (next === "default") setScopeKey("*");
                else setScopeKey("");
              }}
              options={(["default", "country", "provider"] as FormScope[]).map(
                (s) => ({ value: s, label: SCOPE_LABEL[s] }),
              )}
              ariaLabel="Markup scope"
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </label>

          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Scope key
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              value={scope === "default" ? "*" : scopeKey}
              disabled={scope === "default"}
              placeholder={
                scope === "country"
                  ? "ng"
                  : scope === "provider"
                  ? "lizzysub"
                  : "*"
              }
              onChange={(e) => setScopeKey(e.target.value)}
            />
          </label>

          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Type
            <ThemeSelect
              value={markupType}
              onChange={(v) => setMarkupType(v as MarkupType)}
              options={[
                { value: "percentage", label: "Percentage" },
                { value: "fixed", label: "Fixed amount" },
              ]}
              ariaLabel="Markup type"
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </label>

          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Value
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              inputMode="decimal"
              value={markupValue}
              onChange={(e) => setMarkupValue(e.target.value)}
            />
          </label>
        </div>

        <button style={btnStyle} onClick={onSaveMarkup} disabled={pending}>
          {pending ? "Saving…" : "Save markup"}
        </button>

        <div className="pp-table-wrap">
          <table
            style={{
              width: "100%",
              marginTop: 18,
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px" }}>Scope</th>
                <th style={{ padding: "6px 4px" }}>Key</th>
                <th style={{ padding: "6px 4px" }}>Type</th>
                <th style={{ padding: "6px 4px" }}>Value</th>
                <th style={{ padding: "6px 4px" }}>Status</th>
                <th style={{ padding: "6px 4px" }} />
              </tr>
            </thead>
            <tbody>
              {markups.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 10, color: "var(--dim)" }}>
                    No markup rows.
                  </td>
                </tr>
              )}
              {markups.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "8px 4px" }}>{row.scope}</td>
                  <td style={{ padding: "8px 4px" }}>{row.scope_key}</td>
                  <td style={{ padding: "8px 4px" }}>{row.markup_type}</td>
                  <td style={{ padding: "8px 4px" }}>{row.markup_value}</td>
                  <td style={{ padding: "8px 4px" }}>
                    <span
                      style={{
                        color: row.enabled ? "var(--green)" : "var(--dim)",
                      }}
                    >
                      {row.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 4px" }}>
                    <div className="pp-actions">
                      <button
                        style={ghostBtnStyle}
                        onClick={() => onToggleMarkup(row)}
                        disabled={pending}
                      >
                        {row.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        style={ghostBtnStyle}
                        onClick={() => onDeleteMarkup(row)}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Plan catalog ---------- */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>
          Plan catalog
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 14 }}>
          Each row is just the provider, the plan and its raw cost. Open a row
          for the rest of its details, to enable or disable it, and to set the
          platform markup that raises its cost for the reseller. Disabling hides
          a plan from every store. Adding a new plan is done by SQL for now.
        </p>

        <div className="pp-grid" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Provider
            <ThemeSelect
              value={provider}
              onChange={setProvider}
              options={[
                { value: "", label: "All providers" },
                ...PROVIDERS.map((p) => ({ value: p, label: p })),
              ]}
              ariaLabel="Provider"
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Country
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              value={countryCode}
              placeholder="ng"
              onChange={(e) => setCountryCode(e.target.value)}
            />
          </label>
          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Search
            <input
              style={{ ...inputStyle, marginTop: 4 }}
              value={search}
              placeholder="name or plan id"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <button style={btnStyle} onClick={() => runSearch(0)} disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </button>

        <div
          style={{
            marginTop: 14,
            color: "var(--muted)",
            fontSize: "0.78rem",
          }}
        >
          {total} plan{total === 1 ? "" : "s"} — page {page + 1} of {totalPages}
        </div>

        <div className="pp-table-wrap">
          <table
            style={{
              width: "100%",
              marginTop: 8,
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <thead>
              <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px" }}>Provider</th>
                <th style={{ padding: "6px 4px" }}>Plan</th>
                <th style={{ padding: "6px 4px" }}>Cost</th>
                <th style={{ padding: "6px 4px", width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 10, color: "var(--dim)" }}>
                    No plans match.
                  </td>
                </tr>
              )}
              {plans.map((plan) => {
                const isExpanded = expandedPlanId === plan.id;
                const planMarkup = planMarkupFor(plan.id);
                return (
                  <Fragment key={plan.id}>
                    <tr
                      className="pp-catalog-row"
                      onClick={() =>
                        setExpandedPlanId(isExpanded ? null : plan.id)
                      }
                      aria-expanded={isExpanded}
                    >
                      <td style={{ padding: "8px 4px" }}>{plan.provider}</td>
                      <td style={{ padding: "8px 4px" }}>{plan.name}</td>
                      <td style={{ padding: "8px 4px" }}>
                        {formatAmount(plan.base_price, plan.currency)}
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <span className="pp-chevron" aria-hidden="true">
                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="pp-detail-cell">
                          <div className="pp-detail">
                            <div className="pp-detail-grid">
                              <div>
                                <span className="pp-detail-label">
                                  Provider plan ID
                                </span>
                                {plan.provider_plan_id}
                              </div>
                              <div>
                                <span className="pp-detail-label">Country</span>
                                {plan.country_code.toUpperCase()}
                              </div>
                              <div>
                                <span className="pp-detail-label">Network</span>
                                {plan.network ?? "—"}
                              </div>
                              <div>
                                <span className="pp-detail-label">Category</span>
                                {plan.category}
                              </div>
                              <div>
                                <span className="pp-detail-label">
                                  Price type
                                </span>
                                {plan.price_type ?? "fixed"}
                              </div>
                              <div>
                                <span className="pp-detail-label">Currency</span>
                                {plan.currency}
                              </div>
                              <div>
                                <span className="pp-detail-label">Status</span>
                                <span
                                  style={{
                                    color: plan.is_active
                                      ? "var(--green)"
                                      : "var(--dim)",
                                  }}
                                >
                                  {plan.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div>
                                <span className="pp-detail-label">
                                  Reseller sees (home)
                                </span>
                                {homeBasisLabel(plan, planMarkup)}
                              </div>
                            </div>

                            <div className="pp-markup-box">
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "0.82rem",
                                  marginBottom: 2,
                                }}
                              >
                                Platform markup (this plan)
                              </div>
                              <p
                                style={{
                                  color: "var(--muted)",
                                  fontSize: "0.75rem",
                                  marginBottom: 10,
                                }}
                              >
                                Raises this plan&apos;s cost for the reseller at
                                home. Percentage is applied to the raw cost
                                (Lizzysub NGN, Accragh GHS); a fixed amount is
                                applied in USD. Leave it clear to sell at raw
                                cost.
                              </p>
                              <div className="pp-markup-controls">
                                <label
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Type
                                  <ThemeSelect
                                    value={planMarkupType}
                                    onChange={(v) =>
                                      setPlanMarkupType(v as MarkupType)
                                    }
                                    options={[
                                      {
                                        value: "percentage",
                                        label: "Percentage",
                                      },
                                      { value: "fixed", label: "Fixed amount" },
                                    ]}
                                    ariaLabel="Plan markup type"
                                    style={{ ...inputStyle, marginTop: 4 }}
                                  />
                                </label>
                                <label
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Value
                                  <input
                                    style={{ ...inputStyle, marginTop: 4 }}
                                    inputMode="decimal"
                                    placeholder={
                                      planMarkup
                                        ? String(planMarkup.markup_value)
                                        : "0"
                                    }
                                    value={planMarkupValue}
                                    onChange={(e) =>
                                      setPlanMarkupValue(e.target.value)
                                    }
                                  />
                                </label>
                              </div>
                              <div className="pp-inline-actions">
                                <button
                                  style={btnStyle}
                                  onClick={() => onSavePlanMarkup(plan)}
                                  disabled={pending}
                                >
                                  Save markup
                                </button>
                                {planMarkup && (
                                  <button
                                    style={ghostBtnStyle}
                                    onClick={() => onDeleteMarkup(planMarkup)}
                                    disabled={pending}
                                  >
                                    Clear markup
                                  </button>
                                )}
                                <button
                                  style={ghostBtnStyle}
                                  onClick={() => onTogglePlan(plan)}
                                  disabled={pending}
                                >
                                  {plan.is_active
                                    ? "Disable plan"
                                    : "Enable plan"}
                                </button>
                              </div>
                              {planMarkup && (
                                <p
                                  style={{
                                    marginTop: 8,
                                    fontSize: "0.72rem",
                                    color: planMarkup.enabled
                                      ? "var(--muted)"
                                      : "var(--dim)",
                                  }}
                                >
                                  Current: {planMarkup.markup_type}{" "}
                                  {planMarkup.markup_value}
                                  {planMarkup.enabled ? "" : " (disabled)"}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            style={ghostBtnStyle}
            onClick={() => runSearch(Math.max(0, page - 1))}
            disabled={pending || page === 0}
          >
            Previous
          </button>
          <button
            style={ghostBtnStyle}
            onClick={() => runSearch(page + 1)}
            disabled={pending || page + 1 >= totalPages}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
