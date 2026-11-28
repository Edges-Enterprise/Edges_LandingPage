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
};

export type AdminSections = Record<
  Section,
  { listed: AdminPlan[]; available: AdminPlan[] }
>;

const round2 = (n: number) => Math.round(n * 100) / 100;

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: "Not an admin" as const };
  return { user };
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
    .update(discount ? { newprice: price, discount_percentage: discount } : { newprice: price })
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

  const { error } = await writePrice(input.section, input.id, price);
  if (error) return { error: error.message };

  revalidatePath("/admin");
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
  const { error } = await writePrice(input.section, input.id, price);
  if (error) return { error: error.message };

  revalidatePath("/admin");
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

  revalidatePath("/admin");
  return { success: true, active: input.active };
}

/**
 * Put a catalogue plan into a section. Price is optional; without one the plan
 * keeps the price it already carries (catalogue price for hot, current
 * newprice for flash, sell_price for data).
 */
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

    revalidatePath("/admin");
    revalidatePath("/data");
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

  revalidatePath("/admin");
  revalidatePath("/data");
  return { success: true };
}

export async function getOverviewAction(input: {
  from: string;
  to: string;
}) {
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

export async function getTransactionsAction(input: {
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
    .select(
      "id,user_email,amount,type,status,reference,created_at,metadata",
      { count: "exact" },
    )
    .gte("created_at", input.from)
    .lt("created_at", input.to)
    .order("created_at", { ascending: false })
    .range(input.page * perPage, input.page * perPage + perPage - 1);

  if (input.search?.trim()) {
    // PostgREST splits .or() on commas and parentheses.
    const term = input.search.trim().replace(/[,()]/g, "");
    if (term) query = query.or(`user_email.ilike.%${term}%,reference.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  return { success: true, rows: data ?? [], total: count ?? 0, perPage };
}
