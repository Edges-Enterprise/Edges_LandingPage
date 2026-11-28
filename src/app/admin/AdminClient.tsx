"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addPlanToSectionAction,
  getOverviewAction,
  getTransactionsAction,
  setPlanActiveAction,
  setPlanMarginAction,
  setPlanPriceAction,
  type AdminPlan,
  type AdminSections,
  type Section,
} from "@/app/actions/admin";

type Tab = "overview" | Section | "transactions";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "hot", label: "Hot" },
  { key: "flash", label: "Flash sale" },
  { key: "data", label: "Data bundles" },
  { key: "transactions", label: "Transactions" },
];

const SECTION_LABEL: Record<Section, string> = {
  hot: "Hot",
  flash: "Flash sale",
  data: "Data bundles",
};

const SECTION_PRICE_COLUMN: Record<Section, string> = {
  hot: "hot_deals.price",
  flash: "lizzy_flashsale.newprice",
  data: "lizzy.sell_price",
};

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

const ngn = (n: number) =>
  Number.isFinite(n)
    ? `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`
    : "—";

const round2 = (n: number) => Math.round(n * 100) / 100;

type Toast = { text: string; bad?: boolean };

export default function AdminClient({
  sections,
  adminEmail,
  loadErrors,
}: {
  sections: AdminSections;
  adminEmail: string;
  loadErrors: string[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<AdminSections>(sections);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const patchPlan = useCallback(
    (section: Section, id: number, patch: Partial<AdminPlan>) => {
      setData((prev) => {
        const bucket = prev[section];
        const apply = (list: AdminPlan[]) =>
          list.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan));
        return {
          ...prev,
          [section]: { listed: apply(bucket.listed), available: apply(bucket.available) },
        };
      });
    },
    [],
  );

  const movePlan = useCallback(
    (section: Section, id: number, patch: Partial<AdminPlan>) => {
      setData((prev) => {
        const bucket = prev[section];
        const moving = bucket.available.find((plan) => plan.id === id);
        if (!moving) return prev;
        const updated = { ...moving, ...patch };
        return {
          ...prev,
          [section]: {
            listed: [...bucket.listed, updated].sort(
              (a, b) => a.network.localeCompare(b.network) || a.price - b.price,
            ),
            available: bucket.available.filter((plan) => plan.id !== id),
          },
        };
      });
    },
    [],
  );

  const totals = useMemo(
    () => ({
      hot: data.hot.listed.length,
      flash: data.flash.listed.length,
      data: data.data.listed.length,
      pending: data.hot.available.length + data.flash.available.length + data.data.available.length,
    }),
    [data],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-[#0f0f0f]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Admin</h1>
            <p className="text-xs text-white/50">
              {adminEmail} · {totals.hot} hot · {totals.flash} flash · {totals.data} data ·{" "}
              {totals.pending} unlisted
            </p>
          </div>
          <Link
            href="/home"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            Back to app
          </Link>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === item.key
                  ? "bg-[#744925] text-white"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {loadErrors.length > 0 && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {loadErrors.join(" · ")}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "overview" && <OverviewPanel notify={notify} />}
        {tab === "transactions" && <TransactionsPanel notify={notify} />}
        {(tab === "hot" || tab === "flash" || tab === "data") && (
          <SectionPanel
            key={tab}
            section={tab}
            bucket={data[tab]}
            notify={notify}
            patchPlan={patchPlan}
            movePlan={movePlan}
          />
        )}
      </main>

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ${
            toast.bad ? "bg-red-600 text-white" : "bg-[#744925] text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function SectionPanel({
  section,
  bucket,
  notify,
  patchPlan,
  movePlan,
}: {
  section: Section;
  bucket: { listed: AdminPlan[]; available: AdminPlan[] };
  notify: (text: string, bad?: boolean) => void;
  patchPlan: (section: Section, id: number, patch: Partial<AdminPlan>) => void;
  movePlan: (section: Section, id: number, patch: Partial<AdminPlan>) => void;
}) {
  const [network, setNetwork] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showAvailable, setShowAvailable] = useState(false);
  const [adding, setAdding] = useState<AdminPlan | null>(null);

  const filter = (plans: AdminPlan[]) =>
    plans.filter((plan) => {
      if (network !== "ALL" && plan.network.toUpperCase() !== network) return false;
      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      return (
        plan.name.toLowerCase().includes(term) ||
        plan.planType.toLowerCase().includes(term) ||
        plan.validity.toLowerCase().includes(term)
      );
    });

  const listed = filter(bucket.listed);
  const available = filter(bucket.available);

  const commitPrice = async (plan: AdminPlan, price: number) => {
    const result = await setPlanPriceAction({ section, id: plan.id, price });
    if (result.error) {
      notify(result.error, true);
      return false;
    }
    patchPlan(section, plan.id, { price: result.price });
    notify(`${plan.network} ${plan.name} set to ${ngn(result.price!)}`);
    return true;
  };

  const commitMargin = async (plan: AdminPlan, margin: number) => {
    const result = await setPlanMarginAction({ section, id: plan.id, margin });
    if (result.error) {
      notify(result.error, true);
      return false;
    }
    patchPlan(section, plan.id, { price: result.price });
    notify(`${plan.network} ${plan.name} now sells at ${ngn(result.price!)}`);
    return true;
  };

  const toggleActive = async (plan: AdminPlan) => {
    const next = !plan.active;
    const result = await setPlanActiveAction({ section, id: plan.id, active: next });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    patchPlan(section, plan.id, { active: next });
    notify(`${plan.network} ${plan.name} ${next ? "activated" : "deactivated"}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-[#111] p-1">
          {["ALL", ...NETWORKS].map((item) => (
            <button
              key={item}
              onClick={() => setNetwork(item)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                network === item ? "bg-[#744925] text-white" : "text-white/60"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search bundle, validity, plan type"
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm outline-none focus:border-[#744925]"
        />
        <span className="text-xs text-white/40">
          price writes to <code className="text-white/60">{SECTION_PRICE_COLUMN[section]}</code>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">Network</th>
              <th className="px-3 py-2">Bundle</th>
              <th className="px-3 py-2">Validity</th>
              <th className="px-3 py-2">Plan type</th>
              <th className="px-3 py-2 text-right">Cost (Lizzysub)</th>
              <th className="px-3 py-2 text-right">Selling price</th>
              <th className="px-3 py-2 text-right">Margin</th>
              {section === "flash" && <th className="px-3 py-2 text-right">Stock</th>}
              <th className="px-3 py-2 text-center">Live</th>
            </tr>
          </thead>
          <tbody>
            {listed.map((plan) => (
              <tr key={plan.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium">{plan.network}</td>
                <td className="px-3 py-2">{plan.name}</td>
                <td className="px-3 py-2 text-white/60">{plan.validity}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/60">
                    {plan.planType}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-white/60">{ngn(plan.cost)}</td>
                <td className="px-3 py-2 text-right">
                  <MoneyInput
                    value={plan.price}
                    onCommit={(value) => commitPrice(plan, value)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <MoneyInput
                    value={round2(plan.price - plan.cost)}
                    onCommit={(value) => commitMargin(plan, value)}
                    tone={plan.price < plan.cost ? "bad" : "ok"}
                  />
                </td>
                {section === "flash" && (
                  <td className="px-3 py-2 text-right text-white/60">{plan.stockLeft ?? "—"}</td>
                )}
                <td className="px-3 py-2 text-center">
                  <Toggle on={plan.active} onClick={() => toggleActive(plan)} />
                </td>
              </tr>
            ))}
            {listed.length === 0 && (
              <tr>
                <td colSpan={section === "flash" ? 9 : 8} className="px-3 py-6 text-center text-white/40">
                  Nothing listed here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0f0f0f]">
        <button
          onClick={() => setShowAvailable((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
        >
          <span>
            Not in {SECTION_LABEL[section]} yet
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white/60">
              {bucket.available.length}
            </span>
          </span>
          <span className="text-white/40">{showAvailable ? "Hide" : "Show"}</span>
        </button>

        {showAvailable && (
          <div className="max-h-[420px] overflow-y-auto border-t border-white/10">
            <table className="w-full min-w-[720px] text-sm">
              <tbody>
                {available.map((plan) => (
                  <tr key={plan.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 font-medium">{plan.network}</td>
                    <td className="px-3 py-2">{plan.name}</td>
                    <td className="px-3 py-2 text-white/60">{plan.validity}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/60">
                        {plan.planType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-white/60">
                      cost {ngn(plan.cost)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setAdding(plan)}
                        className="rounded-lg bg-[#744925] px-3 py-1 text-xs font-medium"
                      >
                        Add to {SECTION_LABEL[section]}
                      </button>
                    </td>
                  </tr>
                ))}
                {available.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-white/40" colSpan={6}>
                      Nothing left to add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <AddPlanModal
          section={section}
          plan={adding}
          onClose={() => setAdding(null)}
          onAdded={(patch) => {
            movePlan(section, adding.id, patch);
            setAdding(null);
            notify(
              `${adding.network} ${adding.name} added to ${SECTION_LABEL[section]}${
                patch.active ? " and activated" : ""
              }`,
            );
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function AddPlanModal({
  section,
  plan,
  onClose,
  onAdded,
  notify,
}: {
  section: Section;
  plan: AdminPlan;
  onClose: () => void;
  onAdded: (patch: Partial<AdminPlan>) => void;
  notify: (text: string, bad?: boolean) => void;
}) {
  const [price, setPrice] = useState(String(plan.price || plan.cost));
  const [margin, setMargin] = useState(String(round2((plan.price || plan.cost) - plan.cost)));
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  const setFromPrice = (value: string) => {
    setPrice(value);
    const n = Number(value);
    if (Number.isFinite(n)) setMargin(String(round2(n - plan.cost)));
  };

  const setFromMargin = (value: string) => {
    setMargin(value);
    const n = Number(value);
    if (Number.isFinite(n)) setPrice(String(round2(plan.cost + n)));
  };

  const submit = async () => {
    setBusy(true);
    const result = await addPlanToSectionAction({
      section,
      id: plan.id,
      price: Number(price),
      active,
    });
    setBusy(false);

    if (result.error) {
      notify(result.error, true);
      return;
    }
    onAdded({ price: Number(price), active });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111] p-5">
        <h3 className="text-base font-semibold">
          Add {plan.network} {plan.name} to {SECTION_LABEL[section]}
        </h3>
        <p className="mt-1 text-xs text-white/50">
          {plan.validity} · {plan.planType} · cost {ngn(plan.cost)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-white/60">
            Selling price
            <input
              type="number"
              value={price}
              onChange={(event) => setFromPrice(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925]"
            />
          </label>
          <label className="text-xs text-white/60">
            Margin
            <input
              type="number"
              value={margin}
              onChange={(event) => setFromMargin(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925]"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 accent-[#744925]"
          />
          Show to users now
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-[#744925] px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoneyInput({
  value,
  onCommit,
  tone = "plain",
}: {
  value: number;
  onCommit: (value: number) => Promise<boolean>;
  tone?: "plain" | "ok" | "bad";
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next === value) {
      setDraft(String(value));
      return;
    }
    const ok = await onCommit(next);
    if (!ok) setDraft(String(value));
  };

  const colour =
    tone === "bad"
      ? "border-red-500/40 text-red-300"
      : "border-white/10 text-white focus:border-[#744925]";

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
      inputMode="decimal"
      className={`w-24 rounded-lg border bg-[#0a0a0a] px-2 py-1 text-right text-sm outline-none ${colour}`}
    />
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-5 w-9 rounded-full transition ${on ? "bg-[#744925]" : "bg-white/15"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

type Overview = {
  purchases_count: number;
  purchases_value: number;
  purchases_failed: number;
  deposits_count: number;
  deposits_value: number;
  new_customers: number;
  customers_total: number;
  wallet_float: number;
  gross_margin: number;
};

const PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
] as const;

type Preset = (typeof PRESETS)[number]["key"];

function isoRange(preset: Preset, from: string, to: string) {
  if (preset === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const now = new Date();
  const start = new Date(now);
  if (preset === "all") start.setFullYear(2020, 0, 1);
  else start.setDate(start.getDate() - (preset === "30d" ? 30 : 7));
  return { from: start.toISOString(), to: now.toISOString() };
}

function OverviewPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    const range = isoRange(preset, from, to);
    if (preset === "custom" && (!from || !to)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getOverviewAction(range).then((result) => {
      if (!live) return;
      setLoading(false);
      if (result.error) {
        notify(result.error, true);
        return;
      }
      setOverview(result.overview as unknown as Overview);
    });

    return () => {
      live = false;
    };
  }, [preset, from, to, notify]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            onClick={() => setPreset(item.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              preset === item.key ? "bg-[#744925] text-white" : "border border-white/10 text-white/60"
            }`}
          >
            {item.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#111] px-2 py-1"
            />
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#111] px-2 py-1"
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Purchases"
          value={overview ? String(overview.purchases_count) : "—"}
          hint={overview ? `${ngn(overview.purchases_value)} sold` : ""}
        />
        <Stat
          label="Deposits"
          value={overview ? ngn(overview.deposits_value) : "—"}
          hint={overview ? `${overview.deposits_count} payments` : ""}
        />
        <Stat
          label="New customers"
          value={overview ? String(overview.new_customers) : "—"}
          hint={overview ? `${overview.customers_total} total` : ""}
        />
        <Stat
          label="Gross margin"
          value={overview ? ngn(overview.gross_margin) : "—"}
          hint="data + flash, at provider cost"
        />
        <Stat
          label="Failed purchases"
          value={overview ? String(overview.purchases_failed) : "—"}
          hint="in range"
        />
        <Stat
          label="Wallet float"
          value={overview ? ngn(overview.wallet_float) : "—"}
          hint="customer balances held"
        />
      </div>
      {loading && <p className="text-xs text-white/40">Loading…</p>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

type TransactionRow = {
  id: string;
  user_email: string;
  amount: number;
  type: string | null;
  status: string;
  reference: string;
  created_at: string;
};

function TransactionsPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let live = true;
    const range = isoRange(preset, from, to);
    if (preset === "custom" && (!from || !to)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getTransactionsAction({ ...range, page, search: debounced }).then((result) => {
      if (!live) return;
      setLoading(false);
      if (result.error) {
        notify(result.error, true);
        return;
      }
      setRows((result.rows ?? []) as TransactionRow[]);
      setTotal(result.total ?? 0);
      setPerPage(result.perPage ?? 25);
    });

    return () => {
      live = false;
    };
  }, [preset, from, to, page, debounced, notify]);

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setPreset(item.key);
              setPage(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              preset === item.key ? "bg-[#744925] text-white" : "border border-white/10 text-white/60"
            }`}
          >
            {item.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-white/10 bg-[#111] px-2 py-1"
            />
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-white/10 bg-[#111] px-2 py-1"
            />
          </div>
        )}
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder="Search email or reference"
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-sm outline-none focus:border-[#744925]"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-3 py-2 text-white/60">
                  {new Date(row.created_at).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-3 py-2">{row.user_email}</td>
                <td className="px-3 py-2 text-white/60">{row.type ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-white/40">{row.reference}</td>
                <td className="px-3 py-2 text-right">{ngn(Number(row.amount))}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] ${
                      row.status === "completed" || row.status === "success"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : row.status === "failed"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                  No transactions in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {total.toLocaleString()} transactions · page {page + 1} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={page === 0}
            className="rounded-lg border border-white/10 px-2.5 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}
            disabled={page >= pages - 1}
            className="rounded-lg border border-white/10 px-2.5 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
