"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Section = "hot" | "flash" | "data";

export type AdminPlan = {
  id: number;
  network: string;
  name: string;
  validity: string;
  planType: string;
  cost: number;
  price: number;
  active: boolean;
  stockLeft?: number | null;
  stockAvailable?: number | null;
};

export type AdminSections = Record<
  Section,
  { listed: AdminPlan[]; available: AdminPlan[] }
>;

export type AuditEntry = {
  id: number;
  admin_email: string;
  action: string;
  section: string | null;
  target: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
};

export type FailedPurchase = {
  id: string;
  user_email: string;
  amount: number;
  type: string | null;
  status: string;
  reference: string;
  created_at: string;
  reason: string | null;
  refunded_at: string | null;
};

export type CustomerRow = {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  is_admin: boolean | null;
  is_suspended: boolean;
  balance: number;
};

export type ServiceSetting = {
  key: string;
  value: number;
  label: string | null;
  note: string | null;
};

export type CablePlan = {
  id: string;
  provider: string;
  name: string;
  price: number;
  providerCost: number;
  duration: string | null;
  is_active: boolean;
};

export type EducationPlan = {
  planId: number;
  name: string;
  cost: number;
  price: number;
  active: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Not an admin" as const };
  return { user, email: profile.email as string };
}

async function audit(entry: {
  adminEmail: string;
  action: string;
  section?: string;
  target?: string;
  amount?: number;
  before?: unknown;
  after?: unknown;
  note?: string;
}) {
  const db = createAdminClient();
  await db.from("admin_audit_log").insert({
    admin_email: entry.adminEmail,
    action: entry.action,
    section: entry.section ?? null,
    target: entry.target ?? null,
    amount: entry.amount ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    note: entry.note ?? null,
  });
}

/** Cost is read server-side; the browser never gets to declare it. */
async function costOf(section: Section, id: number): Promise<number | null> {
  const db = createAdminClient();

  if (section === "data") {
    const { data } = await db
      .from("lizzy")
      .select("provider_cost")
      .eq("plan_id", id)
      .single();
    const cost = Number(data?.provider_cost);
    return Number.isFinite(cost) ? cost : null;
  }

  if (section === "flash") {
    const { data } = await db
      .from("lizzy_flashsale")
      .select("provider_cost")
      .eq("planid", id)
      .single();
    const cost = Number(data?.provider_cost);
    return Number.isFinite(cost) ? cost : null;
  }

  const { data } = await db
    .from("hot_deals")
    .select("provider_cost")
    .eq("id", id)
    .single();
  const cost = Number(data?.provider_cost);
  return Number.isFinite(cost) ? cost : null;
}

async function currentPrice(section: Section, id: number): Promise<number | null> {
  const db = createAdminClient();

  if (section === "data") {
    const { data } = await db.from("lizzy").select("sell_price").eq("plan_id", id).single();
    return data ? Number(data.sell_price) : null;
  }
  if (section === "flash") {
    const { data } = await db
      .from("lizzy_flashsale")
      .select("newprice")
      .eq("planid", id)
      .single();
    return data ? Number(data.newprice) : null;
  }
  const { data } = await db.from("hot_deals").select("price").eq("id", id).single();
  return data ? Number(data.price) : null;
}

async function writePrice(section: Section, id: number, price: number) {
  const db = createAdminClient();

  if (section === "data") {
    return db.from("lizzy").update({ sell_price: price }).eq("plan_id", id);
  }

  if (section === "hot") {
    return db.from("hot_deals").update({ price }).eq("id", id);
  }

  const { data: row } = await db
    .from("lizzy_flashsale")
    .select("oldprice")
    .eq("planid", id)
    .single();

  const anchor = Number(row?.oldprice ?? 0);
  const discount =
    anchor > 0 ? `${Math.round(((anchor - price) / anchor) * 100)}%` : null;

  return db
    .from("lizzy_flashsale")
    .update(
      discount
        ? { newprice: price, discount_percentage: discount }
        : { newprice: price },
    )
    .eq("planid", id);
}

async function writeActive(section: Section, id: number, active: boolean) {
  const db = createAdminClient();

  if (section === "data") {
    return db.from("lizzy").update({ is_active: active }).eq("plan_id", id);
  }
  if (section === "flash") {
    return db.from("lizzy_flashsale").update({ isflashsale: active }).eq("planid", id);
  }
  return db.from("hot_deals").update({ is_active: active }).eq("id", id);
}

function refresh(section: Section) {
  revalidatePath("/admin");
  revalidatePath("/data");
  if (section !== "data") revalidatePath("/flashsale");
}

// ---------------------------------------------------------------- pricing

export async function setPlanPriceAction(input: {
  section: Section;
  id: number;
  price: number;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const cost = await costOf(input.section, input.id);
  if (cost === null) return { error: "Plan not found" };

  const price = round2(Number(input.price));
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a price above zero" };
  }
  if (price < cost) {
    return { error: `Selling below cost (₦${cost.toLocaleString()}) would lose money` };
  }

  const before = await currentPrice(input.section, input.id);
  const { error } = await writePrice(input.section, input.id, price);
  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "price",
    section: input.section,
    target: String(input.id),
    amount: price,
    before: { price: before, cost },
    after: { price, margin: round2(price - cost) },
  });

  refresh(input.section);
  return { success: true, price, margin: round2(price - cost) };
}

export async function setPlanMarginAction(input: {
  section: Section;
  id: number;
  margin: number;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const cost = await costOf(input.section, input.id);
  if (cost === null) return { error: "Plan not found" };

  const margin = Number(input.margin);
  if (!Number.isFinite(margin) || margin < 0) {
    return { error: "Margin cannot be negative" };
  }

  const price = round2(cost + margin);
  const before = await currentPrice(input.section, input.id);
  const { error } = await writePrice(input.section, input.id, price);
  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "margin",
    section: input.section,
    target: String(input.id),
    amount: price,
    before: { price: before, margin: before === null ? null : round2(before - cost) },
    after: { price, margin: round2(price - cost) },
  });

  refresh(input.section);
  return { success: true, price, margin: round2(price - cost) };
}

export async function setPlanActiveAction(input: {
  section: Section;
  id: number;
  active: boolean;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const { error } = await writeActive(input.section, input.id, input.active);
  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: input.active ? "activate" : "deactivate",
    section: input.section,
    target: String(input.id),
    after: { active: input.active },
  });

  refresh(input.section);
  return { success: true, active: input.active };
}

export async function setFlashStockAction(input: { id: number; stockAvailable: number }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data: row } = await db
    .from("lizzy_flashsale")
    .select("stock_available,stock_sold")
    .eq("planid", input.id)
    .single();

  if (!row) return { error: "Plan not found" };

  const stock = Math.floor(Number(input.stockAvailable));
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "Stock must be zero or more" };
  }
  if (stock < (row.stock_sold ?? 0)) {
    return { error: `Already sold ${row.stock_sold}; stock cannot go below that` };
  }

  const { error } = await db
    .from("lizzy_flashsale")
    .update({ stock_available: stock })
    .eq("planid", input.id);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "stock",
    section: "flash",
    target: String(input.id),
    amount: stock,
    before: { stock_available: row.stock_available, stock_sold: row.stock_sold },
    after: { stock_available: stock },
  });

  revalidatePath("/admin");
  revalidatePath("/flashsale");
  return { success: true, stockAvailable: stock, stockLeft: stock - (row.stock_sold ?? 0) };
}

/**
 * Apply a percentage across a section. "margin_pct" prices every plan at
 * cost + percent; "price_pct" moves each existing price by percent. Both are
 * floored at cost, so a negative percentage cannot create a loss.
 */
export async function bulkPriceAction(input: {
  section: Section;
  network?: string;
  mode: "margin_pct" | "price_pct";
  percent: number;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const percent = Number(input.percent);
  if (!Number.isFinite(percent) || percent === 0) {
    return { error: "Enter a percentage other than zero" };
  }
  if (input.mode === "margin_pct" && percent < 0) {
    return { error: "A cost-based margin cannot be negative" };
  }

  const db = createAdminClient();
  const table =
    input.section === "data" ? "lizzy" : input.section === "flash" ? "lizzy_flashsale" : "hot_deals";
  const key = input.section === "data" ? "plan_id" : input.section === "flash" ? "planid" : "id";
  const priceColumn =
    input.section === "data" ? "sell_price" : input.section === "flash" ? "newprice" : "price";
  const activeColumn =
    input.section === "data" ? "is_active" : input.section === "flash" ? "isflashsale" : "is_active";
  const networkColumn = input.section === "hot" ? "plan_type" : "network";

  let query = db
    .from(table)
    .select(`${key},${priceColumn},provider_cost,${networkColumn}`)
    .eq(activeColumn, true);

  if (input.network && input.network !== "ALL") {
    query = query.eq(networkColumn, input.network);
  }

  const { data: rows, error } = await query;
  if (error) return { error: error.message };
  if (!rows?.length) return { error: "Nothing to reprice in that selection" };

  let updated = 0;
  for (const row of rows as Record<string, unknown>[]) {
    const cost = Number(row.provider_cost ?? 0);
    const current = Number(row[priceColumn] ?? 0);
    const next =
      input.mode === "margin_pct"
        ? round2(cost * (1 + percent / 100))
        : round2(current * (1 + percent / 100));

    const price = Math.max(next, cost);
    if (!Number.isFinite(price) || price <= 0) continue;

    const written = await writePrice(input.section, Number(row[key]), price);
    if (!written.error) updated += 1;
  }

  await audit({
    adminEmail: auth.email,
    action: "bulk_price",
    section: input.section,
    target: input.network ?? "ALL",
    amount: percent,
    after: { mode: input.mode, percent, updated },
  });

  refresh(input.section);
  return { success: true, updated };
}

export async function addPlanToSectionAction(input: {
  section: Section;
  id: number;
  price?: number;
  active: boolean;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();

  if (input.section === "hot") {
    const { data: plan } = await db
      .from("lizzy")
      .select("plan_id,network,plan,validity,sell_price,provider_cost")
      .eq("plan_id", input.id)
      .single();

    if (!plan) return { error: "Plan not found" };

    const cost = Number(plan.provider_cost ?? 0);
    const price = round2(Number(input.price ?? plan.sell_price ?? cost));
    if (!(price >= cost)) {
      return { error: `Selling below cost (₦${cost.toLocaleString()}) would lose money` };
    }

    const { error } = await db.from("hot_deals").upsert(
      {
        id: plan.plan_id,
        data: plan.plan,
        price,
        validity: plan.validity,
        category: "Hot",
        description: `${plan.plan} Hot Deal for ${plan.validity}`,
        plan_type: plan.network,
        provider_cost: cost,
        is_active: input.active,
      },
      { onConflict: "id" },
    );
    if (error) return { error: error.message };

    await audit({
      adminEmail: auth.email,
      action: "add",
      section: "hot",
      target: String(input.id),
      amount: price,
      after: { price, active: input.active },
    });

    refresh("hot");
    return { success: true };
  }

  if (input.price !== undefined) {
    const cost = await costOf(input.section, input.id);
    if (cost === null) return { error: "Plan not found" };

    const price = round2(Number(input.price));
    if (!Number.isFinite(price) || price < cost) {
      return { error: `Selling below cost (₦${cost.toLocaleString()}) would lose money` };
    }

    const written = await writePrice(input.section, input.id, price);
    if (written.error) return { error: written.error.message };
  }

  const { error } = await writeActive(input.section, input.id, input.active);
  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "add",
    section: input.section,
    target: String(input.id),
    amount: input.price,
    after: { active: input.active },
  });

  refresh(input.section);
  return { success: true };
}

// --------------------------------------------------------------- overview

export async function getOverviewAction(input: { from: string; to: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_overview", {
    p_from: input.from,
    p_to: input.to,
  });

  if (error) return { error: error.message };
  return { success: true, overview: data as Record<string, number | string> };
}

export async function getProviderSnapshotAction() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();

  const { data: recent } = await db
    .from("transactions")
    .select("created_at,metadata")
    .in("type", ["data_purchase", "flash_sale_purchase"])
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  let providerBalance: number | null = null;
  let providerBalanceAt: string | null = null;
  for (const row of recent ?? []) {
    const raw = (row.metadata as Record<string, unknown> | null)?.newbal;
    const value = Number(raw);
    if (Number.isFinite(value)) {
      providerBalance = value;
      providerBalanceAt = row.created_at as string;
      break;
    }
  }

  const { data: sync } = await db
    .from("lizzy_catalog_syncs")
    .select("started_at,finished_at,status,plans_seen,lizzy_upserted,hot_deals_priced,errors")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    success: true,
    providerBalance,
    providerBalanceAt,
    lastSync: sync ?? null,
  };
}

// ----------------------------------------------------------- transactions

export async function getTransactionsAction(input: {
  from: string;
  to: string;
  page: number;
  search?: string;
  status?: string;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const perPage = 25;
  let query = db
    .from("transactions")
    .select("id,user_email,amount,type,status,reference,created_at,metadata", {
      count: "exact",
    })
    .gte("created_at", input.from)
    .lt("created_at", input.to)
    .order("created_at", { ascending: false })
    .range(input.page * perPage, input.page * perPage + perPage - 1);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  if (input.search?.trim()) {
    // PostgREST splits .or() on commas and parentheses.
    const term = input.search.trim().replace(/[,()]/g, "");
    if (term) query = query.or(`user_email.ilike.%${term}%,reference.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  return { success: true, rows: data ?? [], total: count ?? 0, perPage };
}

export async function getFailedPurchasesAction(input: {
  from: string;
  to: string;
  page: number;
  search?: string;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const perPage = 25;
  let query = db
    .from("transactions")
    .select("id,user_email,amount,type,status,reference,created_at,metadata", {
      count: "exact",
    })
    .gte("created_at", input.from)
    .lt("created_at", input.to)
    .in("status", ["failed", "pending"])
    .not("type", "is", null)
    .neq("type", "deposit")
    .order("created_at", { ascending: false })
    .range(input.page * perPage, input.page * perPage + perPage - 1);

  if (input.search?.trim()) {
    const term = input.search.trim().replace(/[,()]/g, "");
    if (term) query = query.or(`user_email.ilike.%${term}%,reference.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  const rows: FailedPurchase[] = (data ?? []).map((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      user_email: row.user_email as string,
      amount: Number(row.amount),
      type: (row.type as string) ?? null,
      status: row.status as string,
      reference: row.reference as string,
      created_at: row.created_at as string,
      reason: (meta.error_message as string) ?? (meta.api_message as string) ?? null,
      refunded_at: (meta.refunded_at as string) ?? null,
    };
  });

  return { success: true, rows, total: count ?? 0, perPage };
}

/**
 * Credit a customer's wallet for a purchase that failed. The admin states the
 * amount: most failures never debited the wallet, so a blanket refund would
 * hand out money.
 */
export async function refundTransactionAction(input: {
  id: string;
  amount: number;
  reason: string;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount above zero" };
  }
  if (!input.reason.trim()) return { error: "A reason is required" };

  const db = createAdminClient();

  const { data: original } = await db
    .from("transactions")
    .select("id,user_email,amount,status,reference,metadata")
    .eq("id", input.id)
    .single();

  if (!original) return { error: "Transaction not found" };
  if (original.status === "completed") {
    return { error: "That transaction completed, so there is nothing to refund" };
  }

  const meta = (original.metadata ?? {}) as Record<string, unknown>;
  if (meta.refunded_at) {
    return { error: `Already refunded on ${String(meta.refunded_at).slice(0, 10)}` };
  }

  const { data: wallet } = await db
    .from("wallet")
    .select("balance")
    .eq("user_email", original.user_email)
    .maybeSingle();

  if (!wallet) return { error: `${original.user_email} has no wallet` };

  const balance = parseFloat(String(wallet.balance ?? "0"));
  const newBalance = round2(balance + amount);

  const { error: walletError } = await db
    .from("wallet")
    .update({ balance: newBalance })
    .eq("user_email", original.user_email);

  if (walletError) return { error: walletError.message };

  const refundReference = `REFUND_${original.reference}`;

  await db.from("transactions").insert({
    user_email: original.user_email,
    amount,
    type: "refund",
    reference: refundReference,
    status: "completed",
    env: "live",
    metadata: {
      original_reference: original.reference,
      original_amount: Number(original.amount),
      reason: input.reason,
      refunded_by: auth.email,
    },
  });

  await db.from("wallet_ledger").insert({
    user_email: original.user_email,
    reference: refundReference,
    kind: "refund",
    amount,
  });

  await db
    .from("transactions")
    .update({
      metadata: {
        ...meta,
        refunded_at: new Date().toISOString(),
        refunded_by: auth.email,
        refund_amount: amount,
        refund_reason: input.reason,
      },
    })
    .eq("id", input.id);

  await audit({
    adminEmail: auth.email,
    action: "refund",
    section: "transactions",
    target: original.reference,
    amount,
    before: { balance },
    after: { balance: newBalance },
    note: input.reason,
  });

  revalidatePath("/admin");
  revalidatePath("/wallet");
  revalidatePath("/history");
  return { success: true, newBalance };
}

export async function exportTransactionsCsvAction(input: { from: string; to: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data, error } = await db
    .from("transactions")
    .select("created_at,user_email,type,status,amount,reference,env,metadata")
    .gte("created_at", input.from)
    .lt("created_at", input.to)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return { error: error.message };

  const header = [
    "created_at",
    "user_email",
    "type",
    "status",
    "amount",
    "reference",
    "env",
    "plan",
    "network",
  ];
  const lines = [header.join(",")];
  for (const row of data ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const cells = [
      row.created_at,
      row.user_email,
      row.type ?? "",
      row.status,
      row.amount,
      row.reference,
      row.env ?? "",
      (meta.plan_name as string) ?? "",
      (meta.network as string) ?? "",
    ].map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  }

  await audit({
    adminEmail: auth.email,
    action: "export",
    section: "transactions",
    target: `${input.from} → ${input.to}`,
    amount: (data ?? []).length,
  });

  return { success: true, csv: lines.join("\n"), rows: (data ?? []).length };
}

// -------------------------------------------------------------- customers

export async function searchCustomersAction(input: { term: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const term = input.term.trim().replace(/[,()]/g, "");
  if (term.length < 2) return { success: true, rows: [] as CustomerRow[] };

  const db = createAdminClient();
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id,email,username,created_at,is_admin,is_suspended")
    .or(`email.ilike.%${term}%,username.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) return { error: error.message };
  if (!profiles?.length) return { success: true, rows: [] as CustomerRow[] };

  const emails = profiles.map((row) => row.email as string);
  const { data: wallets } = await db
    .from("wallet")
    .select("user_email,balance")
    .in("user_email", emails);

  const balances = new Map(
    (wallets ?? []).map((row) => [row.user_email as string, Number(row.balance ?? 0)]),
  );

  const rows: CustomerRow[] = profiles.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    username: (row.username as string) ?? null,
    created_at: row.created_at as string,
    is_admin: (row.is_admin as boolean) ?? false,
    is_suspended: Boolean(row.is_suspended),
    balance: balances.get(row.email as string) ?? 0,
  }));

  return { success: true, rows };
}

export async function getCustomerHistoryAction(input: { email: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const [tx, wallet] = await Promise.all([
    db
      .from("transactions")
      .select("id,type,status,amount,reference,created_at,metadata")
      .eq("user_email", input.email)
      .order("created_at", { ascending: false })
      .limit(25),
    db.from("wallet").select("balance").eq("user_email", input.email).maybeSingle(),
  ]);

  if (tx.error) return { error: tx.error.message };

  return {
    success: true,
    balance: Number(wallet.data?.balance ?? 0),
    rows: tx.data ?? [],
  };
}

export async function resetCustomerPinAction(input: { email: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("transaction_pin")
    .eq("email", input.email)
    .maybeSingle();

  if (!profile) return { error: "Customer not found" };

  const { error } = await db
    .from("profiles")
    .update({ transaction_pin: "" })
    .eq("email", input.email);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "pin_reset",
    section: "customers",
    target: input.email,
    before: { had_pin: Boolean(profile.transaction_pin) },
  });

  return { success: true };
}

export async function setCustomerSuspendedAction(input: {
  email: string;
  suspended: boolean;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ is_suspended: input.suspended })
    .eq("email", input.email);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: input.suspended ? "suspend" : "unsuspend",
    section: "customers",
    target: input.email,
  });

  return { success: true, suspended: input.suspended };
}

export async function adjustBalanceAction(input: {
  email: string;
  amount: number;
  reason: string;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount === 0) {
    return { error: "Enter an amount other than zero" };
  }
  if (!input.reason.trim()) return { error: "A reason is required" };

  const db = createAdminClient();
  const { data: wallet } = await db
    .from("wallet")
    .select("balance")
    .eq("user_email", input.email)
    .maybeSingle();

  if (!wallet) return { error: "Customer has no wallet" };

  const balance = parseFloat(String(wallet.balance ?? "0"));
  const newBalance = round2(balance + amount);
  if (newBalance < 0) {
    return { error: `That would take the balance to ₦${newBalance.toLocaleString()}` };
  }

  const { error } = await db
    .from("wallet")
    .update({ balance: newBalance })
    .eq("user_email", input.email);

  if (error) return { error: error.message };

  const reference = `ADJ_${Date.now()}`;
  await db.from("transactions").insert({
    user_email: input.email,
    amount,
    type: "admin_adjustment",
    reference,
    status: "completed",
    env: "live",
    metadata: { reason: input.reason, adjusted_by: auth.email },
  });
  await db.from("wallet_ledger").insert({
    user_email: input.email,
    reference,
    kind: "admin_adjustment",
    amount,
  });

  await audit({
    adminEmail: auth.email,
    action: "balance",
    section: "customers",
    target: input.email,
    amount,
    before: { balance },
    after: { balance: newBalance },
    note: input.reason,
  });

  revalidatePath("/wallet");
  return { success: true, balance: newBalance };
}

// --------------------------------------------------------------- services

export async function getServiceSettingsAction() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data, error } = await db
    .from("service_settings")
    .select("key,value,label,note")
    .order("key");

  if (error) return { error: error.message };

  const settings: ServiceSetting[] = (data ?? []).map((row) => ({
    key: row.key as string,
    value: Number(row.value),
    label: (row.label as string) ?? null,
    note: (row.note as string) ?? null,
  }));

  return { success: true, settings };
}

export async function setServiceSettingAction(input: { key: string; value: number }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const value = Number(input.value);
  if (!Number.isFinite(value)) return { error: "Enter a number" };
  if (value < 0) return { error: "Cannot be negative" };
  if (input.key === "airtime_discount_percent" && value > 20) {
    return { error: "An airtime discount above 20% cannot be profitable" };
  }

  const db = createAdminClient();
  const { data: before } = await db
    .from("service_settings")
    .select("value")
    .eq("key", input.key)
    .maybeSingle();

  const { error } = await db
    .from("service_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", input.key);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "service_setting",
    section: "services",
    target: input.key,
    amount: value,
    before: { value: before?.value ?? null },
    after: { value },
  });

  revalidatePath("/airtime");
  revalidatePath("/electric");
  return { success: true, value };
}

export async function getCablePlansAdminAction() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data, error } = await db
    .from("cable_plans")
    .select("id,provider,name,price,provider_cost,duration,is_active")
    .order("provider")
    .order("price");

  if (error) return { error: error.message };

  const plans: CablePlan[] = (data ?? []).map((row) => ({
    id: row.id as string,
    provider: row.provider as string,
    name: row.name as string,
    price: Number(row.price ?? 0),
    providerCost: Number(row.provider_cost ?? 0),
    duration: (row.duration as string) ?? null,
    is_active: Boolean(row.is_active),
  }));

  return { success: true, plans };
}

export async function setCablePriceAction(input: { id: string; price: number }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const price = round2(Number(input.price));
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a price above zero" };

  const db = createAdminClient();
  const { data: before } = await db
    .from("cable_plans")
    .select("price,name,provider_cost")
    .eq("id", input.id)
    .maybeSingle();

  const cost = Number(before?.provider_cost ?? 0);
  if (price < cost) {
    return { error: `Selling below cost (₦${cost.toLocaleString()}) would lose money` };
  }

  const { error } = await db
    .from("cable_plans")
    .update({ price, updated_at: new Date().toISOString() })
    .eq("id", input.id);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "cable_price",
    section: "cable",
    target: before?.name ?? input.id,
    amount: price,
    before: { price: before?.price ?? null },
    after: { price },
  });

  revalidatePath("/cable");
  return { success: true, price };
}

export async function setCableActiveAction(input: { id: string; active: boolean }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data: before } = await db
    .from("cable_plans")
    .select("name")
    .eq("id", input.id)
    .maybeSingle();

  const { error } = await db
    .from("cable_plans")
    .update({ is_active: input.active, updated_at: new Date().toISOString() })
    .eq("id", input.id);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: input.active ? "cable_activate" : "cable_deactivate",
    section: "cable",
    target: before?.name ?? input.id,
  });

  revalidatePath("/cable");
  return { success: true, active: input.active };
}

// ------------------------------------------------------------- education

export async function getEducationPlansAdminAction() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { data, error } = await db
    .from("education_plans")
    .select("plan_id,name,provider_cost,price,is_active")
    .order("plan_id");

  if (error) return { error: error.message };

  const plans: EducationPlan[] = (data ?? []).map((row) => ({
    planId: Number(row.plan_id),
    name: row.name as string,
    cost: Number(row.provider_cost ?? 0),
    price: Number(row.price ?? 0),
    active: Boolean(row.is_active),
  }));

  return { success: true, plans };
}

export async function setEducationPriceAction(input: { planId: number; price: number }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const price = round2(Number(input.price));
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a price above zero" };

  const db = createAdminClient();
  const { data: before } = await db
    .from("education_plans")
    .select("price,provider_cost,name")
    .eq("plan_id", input.planId)
    .maybeSingle();

  if (!before) return { error: "Plan not found" };

  const cost = Number(before.provider_cost ?? 0);
  if (price < cost) {
    return { error: `Selling below cost (₦${cost.toLocaleString()}) would lose money` };
  }

  const { error } = await db
    .from("education_plans")
    .update({ price, updated_at: new Date().toISOString() })
    .eq("plan_id", input.planId);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: "exam_price",
    section: "education",
    target: before.name as string,
    amount: price,
    before: { price: before.price ?? null },
    after: { price },
  });

  revalidatePath("/education");
  return { success: true, price };
}

export async function setEducationActiveAction(input: {
  planId: number;
  active: boolean;
}) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const { error } = await db
    .from("education_plans")
    .update({ is_active: input.active, updated_at: new Date().toISOString() })
    .eq("plan_id", input.planId);

  if (error) return { error: error.message };

  await audit({
    adminEmail: auth.email,
    action: input.active ? "exam_activate" : "exam_deactivate",
    section: "education",
    target: String(input.planId),
  });

  revalidatePath("/education");
  return { success: true, active: input.active };
}

// ------------------------------------------------------------------ audit

export async function getAuditAction(input: { page: number; search?: string }) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const db = createAdminClient();
  const perPage = 25;
  let query = db
    .from("admin_audit_log")
    .select("id,admin_email,action,section,target,amount,note,created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(input.page * perPage, input.page * perPage + perPage - 1);

  if (input.search?.trim()) {
    const term = input.search.trim().replace(/[,()]/g, "");
    if (term) {
      query = query.or(
        `admin_email.ilike.%${term}%,target.ilike.%${term}%,action.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  return {
    success: true,
    rows: (data ?? []) as AuditEntry[],
    total: count ?? 0,
    perPage,
  };
}
