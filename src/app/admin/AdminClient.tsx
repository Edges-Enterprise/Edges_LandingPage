"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addPlanToSectionAction,
  adjustBalanceAction,
  bulkPriceAction,
  exportTransactionsCsvAction,
  getAuditAction,
  getCablePlansAdminAction,
  getCustomerHistoryAction,
  getEducationPlansAdminAction,
  getFailedPurchasesAction,
  getOverviewAction,
  getProviderSnapshotAction,
  getServiceSettingsAction,
  getTransactionsAction,
  refundTransactionAction,
  resetCustomerPinAction,
  searchCustomersAction,
  setCableActiveAction,
  setCablePriceAction,
  setCustomerSuspendedAction,
  setEducationActiveAction,
  setEducationPriceAction,
  setFlashStockAction,
  setPlanActiveAction,
  setPlanMarginAction,
  setPlanPriceAction,
  setServiceSettingAction,
  type AdminPlan,
  type AdminSections,
  type AuditEntry,
  type CablePlan,
  type CustomerRow,
  type EducationPlan,
  type FailedPurchase,
  type Section,
  type ServiceSetting,
} from "@/app/actions/admin";

type Tab =
  | "overview"
  | Section
  | "transactions"
  | "customers"
  | "services"
  | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "hot", label: "Hot" },
  { key: "flash", label: "Flash sale" },
  { key: "data", label: "Data bundles" },
  { key: "transactions", label: "Transactions" },
  { key: "customers", label: "Customers" },
  { key: "services", label: "Services" },
  { key: "audit", label: "Audit" },
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
    ? `₦${n.toLocaleString("en-NG", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
      })}`
    : "—";

const round2 = (n: number) => Math.round(n * 100) / 100;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

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
  const router = useRouter();
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

  useEffect(() => {
    setData(sections);
  }, [sections]);

  const patchPlan = useCallback(
    (section: Section, id: number, patch: Partial<AdminPlan>) => {
      setData((prev) => {
        const bucket = prev[section];
        const apply = (list: AdminPlan[]) =>
          list.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan));
        return {
          ...prev,
          [section]: {
            listed: apply(bucket.listed),
            available: apply(bucket.available),
          },
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
      pending:
        data.hot.available.length +
        data.flash.available.length +
        data.data.available.length,
    }),
    [data],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-[#0f0f0f]">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-3.5 py-3.5 md:px-6 md:py-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold md:text-lg">Admin</h1>
            <p className="truncate text-[11px] text-white/50 md:text-xs">
              {adminEmail} · {totals.hot} hot · {totals.flash} flash · {totals.data} data ·{" "}
              {totals.pending} unlisted
            </p>
          </div>
          <Link
            href="/home"
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            Back to app
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-1 px-3.5 pb-2 md:px-6">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition md:px-3 md:py-2 md:text-sm ${
                tab === item.key
                  ? "bg-[#744925] text-white"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {loadErrors.length > 0 && (
        <div className="mx-auto mt-3 max-w-7xl px-3.5 md:mt-4 md:px-6">
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {loadErrors.join(" · ")}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3.5 py-5 md:px-6 md:py-6">
        {tab === "overview" && <OverviewPanel notify={notify} />}
        {tab === "transactions" && <TransactionsPanel notify={notify} />}
        {tab === "customers" && <CustomersPanel notify={notify} />}
        {tab === "services" && <ServicesPanel notify={notify} />}
        {tab === "audit" && <AuditPanel notify={notify} />}
        {(tab === "hot" || tab === "flash" || tab === "data") && (
          <SectionPanel
            key={tab}
            section={tab}
            bucket={data[tab]}
            notify={notify}
            patchPlan={patchPlan}
            movePlan={movePlan}
            onBulkApplied={() => router.refresh()}
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
  onBulkApplied,
}: {
  section: Section;
  bucket: { listed: AdminPlan[]; available: AdminPlan[] };
  notify: (text: string, bad?: boolean) => void;
  patchPlan: (section: Section, id: number, patch: Partial<AdminPlan>) => void;
  movePlan: (section: Section, id: number, patch: Partial<AdminPlan>) => void;
  onBulkApplied: () => void;
}) {
  const [network, setNetwork] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showAvailable, setShowAvailable] = useState(false);
  const [adding, setAdding] = useState<AdminPlan | null>(null);
  const [bulkMode, setBulkMode] = useState<"margin_pct" | "price_pct">("margin_pct");
  const [bulkPercent, setBulkPercent] = useState("10");
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const commitStock = async (plan: AdminPlan, stock: number) => {
    const result = await setFlashStockAction({ id: plan.id, stockAvailable: stock });
    if (result.error) {
      notify(result.error, true);
      return false;
    }
    patchPlan(section, plan.id, {
      stockAvailable: result.stockAvailable,
      stockLeft: result.stockLeft,
    });
    notify(`${plan.network} ${plan.name} stock set to ${result.stockAvailable}`);
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

  const applyBulk = async () => {
    const percent = Number(bulkPercent);
    if (!Number.isFinite(percent) || percent === 0) {
      notify("Enter a percentage other than zero", true);
      return;
    }
    const scope = network === "ALL" ? "every network" : network;
    const verb = bulkMode === "margin_pct" ? "cost plus" : "the current price plus";
    if (
      !window.confirm(
        `Reprice ${scope} in ${SECTION_LABEL[section]} to ${verb} ${percent}%? Sales below cost are floored at cost.`,
      )
    ) {
      return;
    }

    setBulkBusy(true);
    const result = await bulkPriceAction({ section, network, mode: bulkMode, percent });
    setBulkBusy(false);

    if (result.error) {
      notify(result.error, true);
      return;
    }
    notify(`${result.updated} plans repriced`);
    onBulkApplied();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="-mx-3.5 flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-[#111] p-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {["ALL", ...NETWORKS].map((item) => (
            <button
              key={item}
              onClick={() => setNetwork(item)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
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
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm outline-none focus:border-[#744925]"
        />
        <span className="hidden text-xs text-white/40 lg:inline">
          price writes to{" "}
          <code className="text-white/60">{SECTION_PRICE_COLUMN[section]}</code>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0f0f0f] p-3">
        <span className="text-xs uppercase tracking-wide text-white/40">Bulk</span>
        <select
          value={bulkMode}
          onChange={(event) =>
            setBulkMode(event.target.value as "margin_pct" | "price_pct")
          }
          className="rounded-lg border border-white/10 bg-[#111] px-2 py-1.5 text-xs"
        >
          <option value="margin_pct">cost + %</option>
          <option value="price_pct">current price %</option>
        </select>
        <input
          value={bulkPercent}
          onChange={(event) => setBulkPercent(event.target.value)}
          className="w-20 rounded-lg border border-white/10 bg-[#111] px-2 py-1.5 text-xs"
        />
        <span className="text-xs text-white/40">%</span>
        <button
          onClick={applyBulk}
          disabled={bulkBusy}
          className="w-full rounded-lg bg-[#744925] px-3 py-1.5 text-xs font-medium disabled:opacity-50 sm:w-auto"
        >
          {bulkBusy ? "Applying…" : `Apply to ${network === "ALL" ? "all networks" : network}`}
        </button>
        <span className="text-xs text-white/40">listed plans only, never below cost</span>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">Network</th>
              <th className="px-3 py-2">Bundle</th>
              <th className="px-3 py-2">Validity</th>
              <th className="px-3 py-2">Plan type</th>
              <th className="px-3 py-2 text-right">Cost (Lizzysub)</th>
              <th className="px-3 py-2 text-right">Selling price</th>
              <th className="px-3 py-2 text-right">Margin</th>
              {section === "flash" && (
                <th className="px-3 py-2 text-right">Stock</th>
              )}
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
                  <td className="px-3 py-2 text-right">
                    <NumberInput
                      value={plan.stockAvailable ?? 0}
                      onCommit={(value) => commitStock(plan, value)}
                      hint={`left ${plan.stockLeft ?? 0}`}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-center">
                  <Toggle on={plan.active} onClick={() => toggleActive(plan)} />
                </td>
              </tr>
            ))}
            {listed.length === 0 && (
              <tr>
                <td
                  colSpan={section === "flash" ? 9 : 8}
                  className="px-3 py-6 text-center text-white/40"
                >
                  Nothing listed here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {listed.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            section={section}
            onPrice={(value) => commitPrice(plan, value)}
            onMargin={(value) => commitMargin(plan, value)}
            onStock={(value) => commitStock(plan, value)}
            onToggle={() => toggleActive(plan)}
          />
        ))}
        {listed.length === 0 && (
          <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-xs text-white/40">
            Nothing listed here yet.
          </p>
        )}
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
            <table className="hidden w-full min-w-[720px] text-sm lg:table">
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
            <div className="divide-y divide-white/5 lg:hidden">
              {available.map((plan) => (
                <div key={plan.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {plan.network} · {plan.name}
                    </p>
                    <p className="truncate text-[11px] text-white/40">
                      {plan.validity} · {plan.planType} · cost {ngn(plan.cost)}
                    </p>
                  </div>
                  <button
                    onClick={() => setAdding(plan)}
                    className="shrink-0 rounded-lg bg-[#744925] px-2.5 py-1 text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
              ))}
              {available.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-white/40">
                  Nothing left to add.
                </p>
              )}
            </div>
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

function PlanCard({
  plan,
  section,
  onPrice,
  onMargin,
  onStock,
  onToggle,
}: {
  plan: AdminPlan;
  section: Section;
  onPrice: (value: number) => Promise<boolean>;
  onMargin: (value: number) => Promise<boolean>;
  onStock: (value: number) => Promise<boolean>;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const belowCost = plan.price < plan.cost;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f0f0f]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
            {plan.network}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{plan.name}</span>
            <span className="block truncate text-[11px] text-white/40">
              {plan.validity} · {plan.planType}
            </span>
          </span>
          <span
            className={`shrink-0 text-sm font-semibold ${
              belowCost ? "text-red-300" : "text-white/80"
            }`}
          >
            {ngn(plan.price)}
          </span>
          <Chevron open={open} />
        </button>
        <Toggle on={plan.active} onClick={onToggle} />
      </div>

      {open && (
        <div className="space-y-2 border-t border-white/10 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/40">Cost (Lizzysub)</span>
            <span className="text-sm text-white/70">{ngn(plan.cost)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/40">Selling price</span>
            <MoneyInput value={plan.price} onCommit={onPrice} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/40">Margin</span>
            <MoneyInput
              value={round2(plan.price - plan.cost)}
              onCommit={onMargin}
              tone={belowCost ? "bad" : "ok"}
            />
          </div>
          {section === "flash" && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/40">Stock</span>
              <NumberInput
                value={plan.stockAvailable ?? 0}
                onCommit={onStock}
                hint={`left ${plan.stockLeft ?? 0}`}
              />
            </div>
          )}
          {belowCost && (
            <p className="text-[11px] text-red-300">
              Sells below the Lizzysub cost — every sale loses money.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  const [margin, setMargin] = useState(
    String(round2((plan.price || plan.cost) - plan.cost)),
  );
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111] p-5 sm:max-w-sm sm:rounded-2xl">
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

function NumberInput({
  value,
  onCommit,
  hint,
}: {
  value: number;
  onCommit: (value: number) => Promise<boolean>;
  hint?: string;
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

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        inputMode="numeric"
        className="w-16 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1 text-right text-sm outline-none focus:border-[#744925]"
      />
      {hint && <span className="text-[11px] text-white/40">{hint}</span>}
    </div>
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

function Stat({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "bad";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "bad" ? "border-red-500/40 bg-red-500/5" : "border-white/10 bg-[#111]"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function OverviewPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [preset, setPreset] = useState<Preset>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<{
    providerBalance: number | null;
    providerBalanceAt: string | null;
    lastSync: Record<string, unknown> | null;
  } | null>(null);

  useEffect(() => {
    getProviderSnapshotAction().then((result) => {
      if (result.error) return;
      setProvider({
        providerBalance: result.providerBalance ?? null,
        providerBalanceAt: result.providerBalanceAt ?? null,
        lastSync: (result.lastSync as Record<string, unknown> | null) ?? null,
      });
    });
  }, []);

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

  const lowProviderBalance =
    provider?.providerBalance !== null &&
    provider?.providerBalance !== undefined &&
    provider.providerBalance < 5000;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            onClick={() => setPreset(item.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              preset === item.key
                ? "bg-[#744925] text-white"
                : "border border-white/10 text-white/60"
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <Stat
          label="Lizzysub balance"
          value={
            provider
              ? provider.providerBalance === null
                ? "—"
                : ngn(provider.providerBalance)
              : "—"
          }
          hint={
            provider?.providerBalanceAt
              ? `as of ${when(provider.providerBalanceAt)}`
              : "no balance seen yet"
          }
          tone={lowProviderBalance ? "bad" : "plain"}
        />
        <Stat
          label="Last catalogue sync"
          value={provider?.lastSync ? String(provider.lastSync.status ?? "—") : "—"}
          hint={
            provider?.lastSync
              ? `${String(provider.lastSync.started_at).slice(0, 16).replace("T", " ")} · ${provider.lastSync.lizzy_upserted ?? 0} plans`
              : ""
          }
        />
      </div>

      {lowProviderBalance && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Lizzysub balance is under ₦5,000. Data purchases fail with &ldquo;Insufficient
          Account&rdquo; below the cost of the plan being bought — top up the provider
          wallet.
        </p>
      )}
      {loading && <p className="text-xs text-white/40">Loading…</p>}
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

const TX_STATUSES = ["all", "completed", "failed", "pending"];

const statusTone = (status: string) =>
  status === "completed" || status === "success"
    ? "bg-emerald-500/15 text-emerald-300"
    : status === "failed"
      ? "bg-red-500/15 text-red-300"
      : "bg-white/10 text-white/60";

function TransactionsPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [failedOnly, setFailedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [failedRows, setFailedRows] = useState<FailedPurchase[]>([]);
  const [totals, setTotals] = useState({ total: 0, perPage: 25 });
  const [refunding, setRefunding] = useState<FailedPurchase | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (preset === "custom" && (!from || !to)) return;
    const range = isoRange(preset, from, to);

    if (failedOnly) {
      getFailedPurchasesAction({ ...range, page, search: debounced }).then((result) => {
        if (result.error) {
          notify(result.error, true);
          return;
        }
        setFailedRows((result.rows ?? []) as FailedPurchase[]);
        setTotals({ total: result.total ?? 0, perPage: result.perPage ?? 25 });
      });
      return;
    }

    getTransactionsAction({
      ...range,
      page,
      search: debounced,
      status,
    }).then((result) => {
      if (result.error) {
        notify(result.error, true);
        return;
      }
      setRows((result.rows ?? []) as TransactionRow[]);
      setFailedRows([]);
      setTotals({ total: result.total ?? 0, perPage: result.perPage ?? 25 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, from, to, page, debounced, status, failedOnly, refreshKey, notify]);

  const pages = Math.max(1, Math.ceil(totals.total / totals.perPage));

  const exportCsv = async () => {
    setBusy(true);
    const result = await exportTransactionsCsvAction(isoRange(preset, from, to));
    setBusy(false);
    if (result.error) {
      notify(result.error, true);
      return;
    }
    const blob = new Blob([result.csv ?? ""], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`${result.rows} rows exported`);
  };

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
              preset === item.key
                ? "bg-[#744925] text-white"
                : "border border-white/10 text-white/60"
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
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-sm outline-none focus:border-[#744925]"
        />
        <button
          onClick={exportCsv}
          disabled={busy || (preset === "custom" && (!from || !to))}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-50"
        >
          {busy ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TX_STATUSES.map((item) => (
          <button
            key={item}
            onClick={() => {
              setStatus(item);
              setFailedOnly(false);
              setPage(0);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs ${
              !failedOnly && status === item ? "bg-white/10 text-white" : "text-white/50"
            }`}
          >
            {item}
          </button>
        ))}
        <button
          onClick={() => {
            setFailedOnly(true);
            setPage(0);
          }}
          className={`rounded-lg px-2.5 py-1 text-xs ${
            failedOnly ? "bg-red-500/20 text-red-200" : "text-white/50"
          }`}
        >
          failed purchases (refundable)
        </button>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
              {failedOnly && <th className="px-3 py-2">Reason / action</th>}
            </tr>
          </thead>
          <tbody>
            {failedOnly
              ? failedRows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/60">{when(row.created_at)}</td>
                    <td className="px-3 py-2">{row.user_email}</td>
                    <td className="px-3 py-2 text-white/60">{row.type ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-white/40">
                      {row.reference}
                    </td>
                    <td className="px-3 py-2 text-right">{ngn(row.amount)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="max-w-[220px] truncate text-[11px] text-white/40">
                          {row.reason ?? "—"}
                        </span>
                        {row.refunded_at ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">
                            refunded
                          </span>
                        ) : (
                          <button
                            onClick={() => setRefunding(row)}
                            className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/5"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/60">{when(row.created_at)}</td>
                    <td className="px-3 py-2">{row.user_email}</td>
                    <td className="px-3 py-2 text-white/60">{row.type ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-white/40">
                      {row.reference}
                    </td>
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
            {((failedOnly && failedRows.length === 0) || (!failedOnly && rows.length === 0)) && (
              <tr>
                <td colSpan={failedOnly ? 7 : 6} className="px-3 py-6 text-center text-white/40">
                  Nothing in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {failedOnly
          ? failedRows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{row.user_email}</p>
                    <p className="truncate text-[11px] text-white/40">
                      {when(row.created_at)} · {row.type ?? "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{ngn(row.amount)}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${statusTone(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
                {row.reason && (
                  <p className="mt-1 text-[11px] text-white/40">{row.reason}</p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-white/30">
                    {row.reference}
                  </span>
                  {row.refunded_at ? (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      refunded
                    </span>
                  ) : (
                    <button
                      onClick={() => setRefunding(row)}
                      className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            ))
          : rows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{row.user_email}</p>
                    <p className="truncate text-[11px] text-white/40">
                      {when(row.created_at)} · {row.type ?? "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{ngn(Number(row.amount))}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${statusTone(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-white/30">
                  {row.reference}
                </p>
              </div>
            ))}
        {((failedOnly && failedRows.length === 0) ||
          (!failedOnly && rows.length === 0)) && (
          <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-xs text-white/40">
            Nothing in this range.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {totals.total.toLocaleString()} rows · page {page + 1} of {pages}
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

      {refunding && (
        <RefundModal
          purchase={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            setRefreshKey((value) => value + 1);
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

function RefundModal({
  purchase,
  onClose,
  onDone,
  notify,
}: {
  purchase: FailedPurchase;
  onClose: () => void;
  onDone: () => void;
  notify: (text: string, bad?: boolean) => void;
}) {
  const [amount, setAmount] = useState(String(purchase.amount));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await refundTransactionAction({
      id: purchase.id,
      amount: Number(amount),
      reason,
    });
    setBusy(false);

    if (result.error) {
      notify(result.error, true);
      return;
    }
    notify(`Refunded ${ngn(Number(amount))} to ${purchase.user_email}`);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111] p-5 sm:max-w-md sm:rounded-2xl">
        <h3 className="text-base font-semibold">Refund a failed purchase</h3>
        <p className="mt-1 text-xs text-white/50">
          {purchase.user_email} · {purchase.reference}
        </p>
        <p className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
          Most failed purchases never debited the wallet, because the debit happens after
          the provider confirms. Check the customer&apos;s history before refunding.
        </p>

        <label className="mt-4 block text-xs text-white/60">
          Amount to credit
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925]"
          />
        </label>

        <label className="mt-3 block text-xs text-white/60">
          Reason (required, logged)
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925]"
          />
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
            disabled={busy || !reason.trim()}
            className="rounded-lg bg-[#744925] px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Refunding…" : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

type CustomerTx = {
  id: string;
  type: string | null;
  status: string;
  amount: number;
  reference: string;
  created_at: string;
};

function CustomersPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [history, setHistory] = useState<CustomerTx[]>([]);
  const [balance, setBalance] = useState(0);
  const [adjust, setAdjust] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (term.trim().length < 2) {
      notify("Type at least two characters", true);
      return;
    }
    const result = await searchCustomersAction({ term });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setRows((result.rows ?? []) as CustomerRow[]);
    setSelected(null);
    setSearched(true);
  };

  const open = async (row: CustomerRow) => {
    setSelected(row);
    setHistory([]);
    setBalance(row.balance);
    setAdjust("");
    setReason("");
    const result = await getCustomerHistoryAction({ email: row.email });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setBalance(result.balance ?? 0);
    setHistory((result.rows ?? []) as CustomerTx[]);
  };

  const resetPin = async () => {
    if (!selected) return;
    if (!window.confirm(`Clear ${selected.email}'s transaction PIN?`)) return;
    const result = await resetCustomerPinAction({ email: selected.email });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    notify("PIN cleared — the customer sets a new one in the app");
  };

  const suspend = async () => {
    if (!selected) return;
    const next = !selected.is_suspended;
    if (!window.confirm(`${next ? "Suspend" : "Restore"} ${selected.email}?`)) return;
    const result = await setCustomerSuspendedAction({
      email: selected.email,
      suspended: next,
    });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setSelected({ ...selected, is_suspended: next });
    setRows((prev) =>
      prev.map((row) =>
        row.email === selected.email ? { ...row, is_suspended: next } : row,
      ),
    );
    notify(`${next ? "Suspended" : "Restored"} ${selected.email}`);
  };

  const submitAdjust = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await adjustBalanceAction({
      email: selected.email,
      amount: Number(adjust),
      reason,
    });
    setBusy(false);
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setBalance(result.balance ?? balance);
    setAdjust("");
    setReason("");
    notify(`Balance is now ${ngn(result.balance ?? 0)}`);
    const refreshed = await getCustomerHistoryAction({ email: selected.email });
    if (!refreshed.error) setHistory((refreshed.rows ?? []) as CustomerTx[]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") search();
          }}
          placeholder="Search by email or username"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm outline-none focus:border-[#744925]"
        />
        <button
          onClick={search}
          className="rounded-lg bg-[#744925] px-4 py-2 text-sm font-medium"
        >
          Search
        </button>
      </div>

      {rows.length === 0 && !searched && (
        <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Search an email or username to pull up a customer&apos;s wallet, PIN and
          purchase history.
        </p>
      )}
      {rows.length === 0 && searched && (
        <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-xs text-white/40">
          No customer matched &ldquo;{term.trim()}&rdquo;.
        </p>
      )}

      {rows.length > 0 && (
        <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <p>{row.email}</p>
                    <p className="text-[11px] text-white/40">{row.username ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {new Date(row.created_at).toLocaleDateString("en-NG")}
                  </td>
                  <td className="px-3 py-2 text-right">{ngn(row.balance)}</td>
                  <td className="px-3 py-2">
                    {row.is_suspended ? (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-300">
                        suspended
                      </span>
                    ) : row.is_admin ? (
                      <span className="rounded bg-[#744925]/40 px-1.5 py-0.5 text-[11px] text-white/80">
                        admin
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/40">active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => open(row)}
                      className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{row.email}</p>
                  <p className="truncate text-[11px] text-white/40">
                    {row.username ?? "—"} · joined{" "}
                    {new Date(row.created_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{ngn(row.balance)}</p>
                  {row.is_suspended ? (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                      suspended
                    </span>
                  ) : row.is_admin ? (
                    <span className="rounded bg-[#744925]/40 px-1.5 py-0.5 text-[10px] text-white/80">
                      admin
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40">active</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => open(row)}
                className="mt-2 w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/70"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-white/10 bg-[#0f0f0f] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{selected.email}</h3>
              <p className="text-xs text-white/50">
                {selected.username ?? "—"} · joined{" "}
                {new Date(selected.created_at).toLocaleDateString("en-NG")} · balance{" "}
                {ngn(balance)}
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                onClick={resetPin}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
              >
                Reset PIN
              </button>
              <button
                onClick={suspend}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  selected.is_suspended
                    ? "bg-emerald-600/80 text-white"
                    : "bg-red-600/80 text-white"
                }`}
              >
                {selected.is_suspended ? "Restore" : "Suspend"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-end">
            <label className="text-xs text-white/60">
              Adjust balance (+/−)
              <input
                type="number"
                value={adjust}
                onChange={(event) => setAdjust(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925] sm:w-32"
              />
            </label>
            <label className="text-xs text-white/60">
              Reason
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-sm text-white outline-none focus:border-[#744925] sm:w-56"
              />
            </label>
            <button
              onClick={submitAdjust}
              disabled={busy || !reason.trim() || !adjust}
              className="rounded-lg bg-[#744925] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "Saving…" : "Apply"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/60">{when(row.created_at)}</td>
                    <td className="px-3 py-2 text-white/60">{row.type ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-white/40">
                      {row.reference}
                    </td>
                    <td className="px-3 py-2 text-right">{ngn(Number(row.amount))}</td>
                    <td className="px-3 py-2 text-white/60">{row.status}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/40">
                      No transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [settings, setSettings] = useState<ServiceSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cable, setCable] = useState<CablePlan[]>([]);
  const [education, setEducation] = useState<EducationPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getServiceSettingsAction(),
      getCablePlansAdminAction(),
      getEducationPlansAdminAction(),
    ]).then(([settingsResult, cableResult, examResult]) => {
      setLoading(false);
      if (settingsResult.success && settingsResult.settings) {
        setSettings(settingsResult.settings);
        setDrafts(
          Object.fromEntries(
            settingsResult.settings.map((row) => [row.key, String(row.value)]),
          ),
        );
      }
      if (cableResult.success && cableResult.plans) setCable(cableResult.plans);
      if (examResult.success && examResult.plans) setEducation(examResult.plans);
      if (settingsResult.error) notify(settingsResult.error, true);
      if (cableResult.error) notify(cableResult.error, true);
      if (examResult.error) notify(examResult.error, true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSetting = async (key: string) => {
    const result = await setServiceSettingAction({ key, value: Number(drafts[key]) });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setSettings((prev) =>
      prev.map((row) => (row.key === key ? { ...row, value: result.value! } : row)),
    );
    notify(`${key} set to ${result.value}`);
  };

  const saveCablePrice = async (plan: CablePlan, price: number) => {
    const result = await setCablePriceAction({ id: plan.id, price });
    if (result.error) {
      notify(result.error, true);
      return false;
    }
    setCable((prev) =>
      prev.map((row) => (row.id === plan.id ? { ...row, price: result.price! } : row)),
    );
    notify(`${plan.name} set to ${ngn(result.price!)}`);
    return true;
  };

  const toggleCable = async (plan: CablePlan) => {
    const next = !plan.is_active;
    const result = await setCableActiveAction({ id: plan.id, active: next });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setCable((prev) =>
      prev.map((row) => (row.id === plan.id ? { ...row, is_active: next } : row)),
    );
    notify(`${plan.name} ${next ? "listed" : "hidden"}`);
  };

  const saveExamPrice = async (plan: EducationPlan, price: number) => {
    const result = await setEducationPriceAction({ planId: plan.planId, price });
    if (result.error) {
      notify(result.error, true);
      return false;
    }
    setEducation((prev) =>
      prev.map((row) => (row.planId === plan.planId ? { ...row, price: result.price! } : row)),
    );
    notify(`${plan.name} pin set to ${ngn(result.price!)}`);
    return true;
  };

  const toggleExam = async (plan: EducationPlan) => {
    const next = !plan.active;
    const result = await setEducationActiveAction({ planId: plan.planId, active: next });
    if (result.error) {
      notify(result.error, true);
      return;
    }
    setEducation((prev) =>
      prev.map((row) => (row.planId === plan.planId ? { ...row, active: next } : row)),
    );
    notify(`${plan.name} ${next ? "listed" : "hidden"}`);
  };

  const listed = cable.filter((row) => row.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Airtime and electricity</h3>
        <p className="mt-1 text-xs text-white/40">
          Lizzysub bills airtime below face value — a ₦100 topup moves their balance by
          about ₦98, and ₦200 by ₦196 — so the customer discount here is paid out of that
          spread, not out of your margin. Keep it at or under the provider discount.
          Electricity adds a flat fee on top of the amount the customer enters.
        </p>
        <div className="mt-3 space-y-2">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#111] p-3"
            >
              <div className="min-w-[240px] flex-1">
                <p className="text-sm">{setting.label ?? setting.key}</p>
                <p className="text-[11px] text-white/40">
                  {setting.note ?? setting.key} · now {setting.value}
                </p>
              </div>
              <input
                type="number"
                value={drafts[setting.key] ?? ""}
                onChange={(event) =>
                  setDrafts((prev) => ({ ...prev, [setting.key]: event.target.value }))
                }
                className="w-24 rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-1.5 text-right text-sm outline-none focus:border-[#744925]"
              />
              <button
                onClick={() => saveSetting(setting.key)}
                className="rounded-lg bg-[#744925] px-3 py-1.5 text-xs font-medium"
              >
                Save
              </button>
            </div>
          ))}
          {settings.length === 0 && !loading && (
            <p className="text-xs text-white/40">No service settings found.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Result checkers</h3>
        <p className="mt-1 text-xs text-white/40">
          Lizzysub charges ₦3,500 for WAEC, ₦1,300 for NECO and ₦850 for NABTEB. The
          server charges the price below times the quantity; the browser no longer sends
          the amount.
        </p>
        <div className="mt-3 hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Selling price</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2 text-center">Listed</th>
              </tr>
            </thead>
            <tbody>
              {education.map((plan) => (
                <tr key={plan.planId} className="border-t border-white/5">
                  <td className="px-3 py-2 font-medium">{plan.name}</td>
                  <td className="px-3 py-2 text-right text-white/60">{ngn(plan.cost)}</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyInput
                      value={plan.price}
                      onCommit={(value) => saveExamPrice(plan, value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyInput
                      value={round2(plan.price - plan.cost)}
                      onCommit={(value) => saveExamPrice(plan, round2(plan.cost + value))}
                      tone={plan.price < plan.cost ? "bad" : "ok"}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle on={plan.active} onClick={() => toggleExam(plan)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2 lg:hidden">
          {education.map((plan) => (
            <div
              key={plan.planId}
              className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{plan.name}</p>
                  <p className="text-[11px] text-white/40">cost {ngn(plan.cost)}</p>
                </div>
                <Toggle on={plan.active} onClick={() => toggleExam(plan)} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-white/40">Price</span>
                <MoneyInput
                  value={plan.price}
                  onCommit={(value) => saveExamPrice(plan, value)}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-xs text-white/40">Margin</span>
                <MoneyInput
                  value={round2(plan.price - plan.cost)}
                  onCommit={(value) => saveExamPrice(plan, round2(plan.cost + value))}
                  tone={plan.price < plan.cost ? "bad" : "ok"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Cable packages</h3>
        <p className="mt-1 text-xs text-white/40">
          {listed} of {cable.length} listed. Cost is Lizzysub&apos;s price for the package;
          anything unlisted has never been sold and waits for a price.
        </p>
        <div className="mt-3 hidden max-h-[520px] overflow-auto rounded-xl border border-white/10 lg:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Selling price</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2 text-center">Listed</th>
              </tr>
            </thead>
            <tbody>
              {cable.map((plan) => (
                <tr key={plan.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-medium">{plan.provider}</td>
                  <td className="px-3 py-2">{plan.name}</td>
                  <td className="px-3 py-2 text-right text-white/60">
                    {ngn(plan.providerCost)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyInput
                      value={plan.price}
                      onCommit={(value) => saveCablePrice(plan, value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyInput
                      value={round2(plan.price - plan.providerCost)}
                      onCommit={(value) =>
                        saveCablePrice(plan, round2(plan.providerCost + value))
                      }
                      tone={plan.price < plan.providerCost ? "bad" : "ok"}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Toggle on={plan.is_active} onClick={() => toggleCable(plan)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2 lg:hidden">
          {cable.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{plan.name}</p>
                  <p className="truncate text-[11px] text-white/40">
                    {plan.provider} · cost {ngn(plan.providerCost)}
                  </p>
                </div>
                <Toggle on={plan.is_active} onClick={() => toggleCable(plan)} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-white/40">Price</span>
                <MoneyInput
                  value={plan.price}
                  onCommit={(value) => saveCablePrice(plan, value)}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-xs text-white/40">Margin</span>
                <MoneyInput
                  value={round2(plan.price - plan.providerCost)}
                  onCommit={(value) =>
                    saveCablePrice(plan, round2(plan.providerCost + value))
                  }
                  tone={plan.price < plan.providerCost ? "bad" : "ok"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditPanel({ notify }: { notify: (text: string, bad?: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [totals, setTotals] = useState({ total: 0, perPage: 25 });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getAuditAction({ page, search: debounced }).then((result) => {
      if (result.error) {
        notify(result.error, true);
        return;
      }
      setRows((result.rows ?? []) as AuditEntry[]);
      setTotals({ total: result.total ?? 0, perPage: result.perPage ?? 25 });
    });
  }, [page, debounced, notify]);

  const pages = Math.max(1, Math.ceil(totals.total / totals.perPage));

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search admin, action or target"
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm outline-none focus:border-[#744925]"
      />

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#141414] text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-3 py-2 text-white/60">{when(row.created_at)}</td>
                <td className="px-3 py-2">{row.admin_email}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/70">
                    {row.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-white/50">{row.section ?? "—"}</td>
                <td className="max-w-[220px] truncate px-3 py-2 font-mono text-[11px] text-white/50">
                  {row.target ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.amount === null ? "—" : ngn(Number(row.amount))}
                </td>
                <td className="max-w-[260px] truncate px-3 py-2 text-[11px] text-white/40">
                  {row.note ?? "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-white/40">
                  Nothing logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-white/10 bg-[#0f0f0f] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">
                {row.action}
              </span>
              {row.amount !== null && (
                <span className="shrink-0 text-sm font-semibold">
                  {ngn(Number(row.amount))}
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-white/50">
              {row.target ?? "—"}
            </p>
            {row.note && (
              <p className="mt-1 text-[11px] text-white/40">{row.note}</p>
            )}
            <p className="mt-1 truncate text-[10px] text-white/30">
              {when(row.created_at)} · {row.admin_email}
              {row.section ? ` · ${row.section}` : ""}
            </p>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-white/10 px-3 py-6 text-center text-xs text-white/40">
            Nothing logged yet.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          {totals.total.toLocaleString()} entries · page {page + 1} of {pages}
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


