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
//   2. Plan catalog — the plans-list card UI: each plan is a card whose
//      collapsed row is flag + name + badges + toggle, with the rest of its
//      details and the per-plan platform markup (the lever that raises a
//      Lizzysub/Accragh cost at home) opening in a dropdown on mobile and
//      shown inline on desktop. The list infinite-scrolls.
//
// Adding a new plan is deliberately NOT here (deferred item 9): Lizzysub and
// Accragh plans are seeded by SQL.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, ChevronDown, Loader2, Pencil, X } from "lucide-react";
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

// Card controls, mirroring the local plans list (`PlansClient.tsx`).
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

/** The reseller's home price for a plan: raw cost + the plan's own markup. */
function homePriceValue(
  plan: PlatformPlanRow,
  markup: MarkupRow | undefined,
): number {
  if (!markup || !markup.enabled) return plan.base_price;
  if (markup.markup_type === "percentage") {
    return homePriceAfter(plan.base_price, "percentage", markup.markup_value);
  }
  // A fixed markup is USD and cannot be added to a local cost without the
  // rate; the raw cost is the honest basis.
  return plan.base_price;
}

/** The raw cost after a percentage markup — the home basis the reseller sees. */
function homePriceAfter(base: number, type: MarkupType, value: number): number {
  if (!Number.isFinite(value) || value <= 0) return base;
  return type === "percentage" ? base * (1 + value / 100) : base;
}

function formatAmount(value: number, currency: string): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
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

  // Plan search + infinite scroll
  const [provider, setProvider] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pageSize = 50;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // One in-flight page request at a time; a scroll tick while one is loading is
  // dropped (the sentinel re-fires). A `replace` is never dropped.
  const inFlight = useRef(false);
  const reqSeq = useRef(0);

  // Catalog row dropdown + its per-plan markup editor
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planMarkupType, setPlanMarkupType] = useState<MarkupType>("percentage");
  const [planMarkupValue, setPlanMarkupValue] = useState("");

  const planMarkupFor = (planId: string): MarkupRow | undefined =>
    markups.find((m) => m.scope === "plan" && m.scope_key === planId);

  const refreshMarkups = () => {
    startTransition(async () => {
      setMarkups(await listPlatformMarkups());
    });
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /**
   * Fetch one page of plans. `replace` resets the list (a new filter search);
   * otherwise the page is appended (infinite scroll). Each call takes a
   * sequence number and only the newest applies its result, so a slow response
   * cannot overwrite a newer filter.
   */
  const fetchPage = useCallback(
    async (opts: {
      offset: number;
      replace: boolean;
      provider: string;
      countryCode: string;
      search: string;
    }) => {
      if (!opts.replace) {
        if (inFlight.current) return;
        inFlight.current = true;
      }
      const seq = ++reqSeq.current;
      if (opts.replace) setPendingSearch(true);
      else setLoadingMore(true);

      const res = await searchPlatformPlans({
        provider: opts.provider || undefined,
        countryCode: opts.countryCode || undefined,
        search: opts.search || undefined,
        page: opts.offset / pageSize,
        pageSize,
      });

      if (seq === reqSeq.current) {
        setPlans((prev) =>
          opts.replace ? res.plans : [...prev, ...res.plans],
        );
        setTotal(res.total);
      }

      if (opts.replace) {
        setPendingSearch(false);
        setExpandedPlanId(null);
        setEditingPlanId(null);
      } else {
        setLoadingMore(false);
        inFlight.current = false;
      }
    },
    [],
  );

  // A filter change (provider / country) or a Search click reloads from page 1.
  const runSearch = () => {
    void fetchPage({
      offset: 0,
      replace: true,
      provider,
      countryCode,
      search,
    });
  };

  // Infinite scroll: pull the next page as the sentinel nears the viewport.
  const hasMore = plans.length < total;
  useEffect(() => {
    if (!hasMore || pendingSearch) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void fetchPage({
            offset: plans.length,
            replace: false,
            provider,
            countryCode,
            search,
          });
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, pendingSearch, plans.length, provider, countryCode, search, fetchPage]);

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
      // A cleared plan markup leaves the plan back at raw cost; close the
      // editor so it does not sit open showing a stale value.
      if (res.success && row.scope === "plan") setEditingPlanId(null);
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
      if (res.success) setEditingPlanId(null);
      refreshMarkups();
    });
  };

  /** Open the per-plan editor, seeded from the plan's current markup. */
  const startEditPlanMarkup = (plan: PlatformPlanRow) => {
    const existing = planMarkupFor(plan.id);
    setEditingPlanId(plan.id);
    setPlanMarkupType(existing?.markup_type ?? "percentage");
    setPlanMarkupValue(existing ? String(existing.markup_value) : "");
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

  return (
    <div className="pp-page">
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
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
        /* Catalog: the local plans-list card UI (mirrors PlansClient.tsx).
           Each plan is a card; on desktop the details wrapper is display:
           contents, so the card is a single row — name + badges + toggle on the
           left, the Markup / Your Price stats and the edit pencil inline — and
           no chevron renders. On mobile it collapses to name + toggle + chevron
           and the details open in a dropdown. */
        .pp-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-top: 14px;
        }
        .pp-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          transition: all 0.2s;
        }
        .pp-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .pp-card-info {
          flex: 1;
          min-width: 180px;
        }
        .pp-card-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .pp-card-details {
          display: contents;
        }
        .pp-card-chevron {
          display: none;
        }
        .pp-card-edit-inline {
          display: none !important;
        }
        .pp-card-edit-desktop {
          display: inline-flex !important;
        }
        .pp-card-cost-line {
          display: block;
        }
        .pp-badge {
          font-size: 0.7rem;
          color: var(--dim);
          background: var(--bg2);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
        }
        .pp-toggle {
          width: 40px;
          height: 22px;
          border-radius: 11px;
          border: none;
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .pp-toggle.is-on {
          background: #6EBD8A;
        }
        .pp-toggle.is-off {
          background: var(--dim);
        }
        /* The per-plan markup input empties on focus; its spinner would eat
           taps on the narrow field. */
        .pp-edit-value::-webkit-outer-spin-button,
        .pp-edit-value::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .pp-edit-value {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .pp-stat {
          text-align: center;
          min-width: 60px;
        }
        .pp-stat-label {
          font-size: 0.65rem;
          color: var(--dim);
        }
        .pp-stat-value {
          font-size: 0.85rem;
          color: var(--text);
          font-weight: 600;
        }
        .pp-list-footer {
          display: flex;
          justify-content: center;
          padding: 1rem;
          color: var(--dim);
          font-size: 0.78rem;
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
          /* Mobile: the collapsed row is name + toggle + chevron; the rest
             opens in the dropdown. */
          .pp-card-cost-line {
            display: none;
          }
          .pp-card-details {
            display: none;
          }
          .pp-card--expanded .pp-card-details {
            display: block;
            flex-basis: 100%;
          }
          .pp-card--expanded .pp-card-cost-line {
            display: block;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border);
          }
          .pp-card-edit-inline {
            display: inline-flex !important;
          }
          .pp-card-edit-desktop {
            display: none !important;
          }
          .pp-card-title {
            flex-wrap: nowrap;
          }
          .pp-card-title h3 {
            flex: 1 1 auto;
            min-width: 0;
          }
          .pp-card-chevron {
            display: inline-flex;
            align-items: center;
            color: var(--dim);
            transition: transform 0.2s;
          }
          .pp-card--expanded .pp-card-chevron {
            transform: rotate(180deg);
          }
          .pp-toggle.is-off {
            background: #EF4444;
          }
          .pp-stat {
            min-width: 50px;
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
          Each card shows the plan and its raw cost, with a switch to enable or
          disable it. Open a card for the rest of its details and to set the
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
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </label>
        </div>

        <button style={btnStyle} onClick={runSearch} disabled={pendingSearch}>
          {pendingSearch ? "Searching…" : "Search"}
        </button>

        <div
          style={{
            marginTop: 14,
            color: "var(--muted)",
            fontSize: "0.78rem",
          }}
        >
          {total.toLocaleString()} plan{total === 1 ? "" : "s"} — showing{" "}
          {plans.length.toLocaleString()}
        </div>

        <div className="pp-list">
          {plans.length === 0 && (
            <div
              className="pp-card"
              style={{ textAlign: "center", color: "var(--dim)" }}
            >
              No plans match.
            </div>
          )}
          {plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const isEditing = editingPlanId === plan.id;
            const planMarkup = planMarkupFor(plan.id);
            const editValue = Number(planMarkupValue) || 0;
            const editHomePreview =
              planMarkupType === "percentage"
                ? homePriceAfter(plan.base_price, "percentage", editValue)
                : plan.base_price;
            return (
              <div
                key={plan.id}
                className={`pp-card${isExpanded ? " pp-card--expanded" : ""}`}
                style={{ opacity: plan.is_active ? 1 : 0.6 }}
              >
                <div className="pp-card-row">
                  {/* Plan info */}
                  <div className="pp-card-info">
                    <div
                      className="pp-card-title"
                      role={isMobile ? "button" : undefined}
                      tabIndex={isMobile ? 0 : undefined}
                      aria-expanded={isMobile ? isExpanded : undefined}
                      aria-label={isMobile ? plan.name : undefined}
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
                      <h3
                        className="pp-card-name"
                        style={{
                          fontWeight: 600,
                          color: "var(--text)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {plan.name}
                      </h3>
                      <span className="pp-badge">{plan.provider}</span>
                      <span className="pp-badge">
                        {(plan.country_code || "").toUpperCase()}
                      </span>
                      {plan.network && (
                        <span className="pp-badge">{plan.network}</span>
                      )}
                      {plan.price_type === "RANGE" && (
                        <span
                          className="pp-badge"
                          style={{ color: "var(--brand-color)", fontWeight: 600 }}
                        >
                          Range
                        </span>
                      )}
                      <button
                        className={`pp-toggle ${plan.is_active ? "is-on" : "is-off"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggling a plan opens its details on mobile.
                          if (isMobile) setExpandedPlanId(plan.id);
                          onTogglePlan(plan);
                        }}
                        aria-pressed={plan.is_active}
                        aria-label={plan.is_active ? "Disable plan" : "Enable plan"}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 2,
                            left: plan.is_active ? 20 : 2,
                            transition: "left 0.15s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                      <span className="pp-card-chevron" aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </div>
                    <div className="pp-card-cost-line">
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--dim)",
                          marginTop: 3,
                        }}
                      >
                        Wholesale:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {formatAmount(plan.base_price, plan.currency)}
                        </strong>
                      </p>
                      {/* Mobile: edit the markup while the card is open. */}
                      {plan.is_active && !isEditing && isExpanded && (
                        <button
                          className="pp-card-edit-inline"
                          style={btnIconStyle}
                          onClick={() => startEditPlanMarkup(plan)}
                          title="Edit markup"
                          aria-label="Edit markup"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details — inline on desktop, dropdown on mobile */}
                  <div className="pp-card-details">
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
                          value={planMarkupType}
                          onChange={(v) => setPlanMarkupType(v as MarkupType)}
                          style={{ ...smallInputStyle, width: 72 }}
                          ariaLabel="Plan markup type"
                          menuMinWidth={90}
                          options={[
                            { value: "percentage", label: "%" },
                            { value: "fixed", label: "USD" },
                          ]}
                        />
                        <input
                          className="pp-edit-value"
                          type="number"
                          value={planMarkupValue}
                          onChange={(e) => setPlanMarkupValue(e.target.value)}
                          style={{ ...smallInputStyle, width: 70 }}
                          inputMode="decimal"
                          autoFocus
                          placeholder={planMarkup ? String(planMarkup.markup_value) : "0"}
                          min="0"
                          step={planMarkupType === "percentage" ? "1" : "10"}
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
                            Reseller:{" "}
                            <strong style={{ color: "var(--brand-color)" }}>
                              {formatAmount(editHomePreview, plan.currency)}
                            </strong>
                          </div>
                        </div>
                        <button
                          onClick={() => onSavePlanMarkup(plan)}
                          disabled={pending}
                          style={btnSaveStyle}
                        >
                          {pending ? (
                            <Loader2
                              size={14}
                              style={{ animation: "spin 1s linear infinite" }}
                            />
                          ) : (
                            <Check size={14} />
                          )}
                          Save
                        </button>
                        {planMarkup && (
                          <button
                            onClick={() => onDeleteMarkup(planMarkup)}
                            disabled={pending}
                            style={btnCancelStyle}
                            title="Clear markup"
                            aria-label="Clear markup"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingPlanId(null)}
                          disabled={pending}
                          style={btnCancelStyle}
                          title="Cancel"
                          aria-label="Cancel"
                        >
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
                        <div className="pp-stat">
                          <p className="pp-stat-label">Markup</p>
                          <p
                            className="pp-stat-value"
                            style={{ color: planMarkup ? "var(--text)" : "var(--dim)" }}
                          >
                            {planMarkup
                              ? planMarkup.markup_type === "percentage"
                                ? `${planMarkup.markup_value}%`
                                : formatAmount(planMarkup.markup_value, "USD")
                              : "—"}
                          </p>
                        </div>
                        <div className="pp-stat" style={{ minWidth: 80 }}>
                          <p className="pp-stat-label">Your Price</p>
                          <p
                            className="pp-stat-value"
                            style={{
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: planMarkup ? "var(--brand-color)" : "var(--text)",
                            }}
                          >
                            {formatAmount(
                              homePriceValue(plan, planMarkup),
                              plan.currency,
                            )}
                          </p>
                        </div>
                        {plan.is_active && (
                          <button
                            className="pp-card-edit-desktop"
                            style={btnIconStyle}
                            onClick={() => startEditPlanMarkup(plan)}
                            title="Edit markup"
                            aria-label="Edit markup"
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
          })}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="pp-list-footer">
            {loadingMore ? (
              <Loader2
                size={18}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              "Scroll for more"
            )}
          </div>
        )}
        {!hasMore && plans.length > 0 && (
          <p className="pp-list-footer">All plans shown</p>
        )}
      </section>
    </div>
  );
}
