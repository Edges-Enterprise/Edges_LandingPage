"use client";

// src/app/[countryCode]/admin/platform-plans/PlatformPlansClient.tsx
//
// Platform-admin UI. Two panels:
//
//   1. Platform markup — set the platform's own cut at default / country /
//      provider / plan. Levels REPLACE, they do not stack (see
//      `_shared/currency/markup.ts`). At HOME (plan cost currency == store
//      currency) only the plan and provider rows apply; cross-border uses
//      country then default.
//   2. Plan catalog — search, then enable/disable a plan (`is_active`).
//
// Adding a new plan is deliberately NOT here (deferred item 9): Lizzysub and
// Accragh plans are seeded by SQL.

import { useState, useTransition } from "react";
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

const SCOPE_LABEL: Record<MarkupScope, string> = {
  default: "Default (every plan)",
  country: "Country",
  provider: "Provider",
  plan: "Plan",
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

  // Markup form
  const [scope, setScope] = useState<MarkupScope>("default");
  const [scopeKey, setScopeKey] = useState("*");
  const [markupType, setMarkupType] = useState<MarkupType>("percentage");
  const [markupValue, setMarkupValue] = useState("12");

  // Plan search
  const [provider, setProvider] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

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
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
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
          Levels replace each other; they do not stack. At home (a plan whose
          cost currency equals the store&apos;s) only the plan and provider
          rows apply. Cross-border uses the country row, then the default.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Scope
            <ThemeSelect
              value={scope}
              onChange={(v) => {
                const next = v as MarkupScope;
                setScope(next);
                if (next === "default") setScopeKey("*");
                else setScopeKey("");
              }}
              options={(["default", "country", "provider", "plan"] as MarkupScope[]).map(
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
                  : scope === "plan"
                  ? "plan id (uuid)"
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
                <td style={{ padding: "8px 4px", textAlign: "right" }}>
                  <button
                    style={{ ...ghostBtnStyle, marginRight: 6 }}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------- Plan catalog ---------- */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>
          Plan catalog
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 14 }}>
          Search and enable or disable a plan. Disabling hides it from every
          store. Adding a new plan is done by SQL for now.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
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
              <th style={{ padding: "6px 4px" }}>Country</th>
              <th style={{ padding: "6px 4px" }}>Cost</th>
              <th style={{ padding: "6px 4px" }}>Status</th>
              <th style={{ padding: "6px 4px" }} />
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 10, color: "var(--dim)" }}>
                  No plans match.
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 4px" }}>{plan.provider}</td>
                <td style={{ padding: "8px 4px" }}>
                  <div>{plan.name}</div>
                  <div style={{ color: "var(--dim)", fontSize: "0.72rem" }}>
                    {plan.provider_plan_id}
                  </div>
                </td>
                <td style={{ padding: "8px 4px" }}>
                  {plan.country_code.toUpperCase()}
                </td>
                <td style={{ padding: "8px 4px" }}>
                  {plan.base_price} {plan.currency}
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <span
                    style={{
                      color: plan.is_active ? "var(--green)" : "var(--dim)",
                    }}
                  >
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>
                  <button
                    style={ghostBtnStyle}
                    onClick={() => onTogglePlan(plan)}
                    disabled={pending}
                  >
                    {plan.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
