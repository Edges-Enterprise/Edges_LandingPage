// app/admin/page.tsx

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminPlan, AdminSections } from "@/app/actions/admin";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

type LizzyRow = {
  plan_id: number;
  network: string;
  plan: string;
  plan_type: string;
  validity: string;
  sell_price: number | null;
  provider_cost: number | null;
  is_active: boolean;
};

type HotRow = {
  id: number;
  plan_type: string;
  data: string;
  validity: string;
  price: number;
  provider_cost: number | null;
  is_active: boolean;
};

type FlashRow = {
  planid: number;
  network: string;
  plantype: string;
  planname: string;
  validate: string;
  newprice: number | null;
  provider_cost: number | null;
  isflashsale: boolean;
  stock_available: number | null;
  stock_sold: number | null;
};

export default async function AdminPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/home");

  const db = createAdminClient();
  const [lizzyRes, hotRes, flashRes] = await Promise.all([
    db
      .from("lizzy")
      .select(
        "plan_id,network,plan,plan_type,validity,sell_price,provider_cost,is_active",
      )
      .order("network")
      .order("plan_amount", { ascending: true }),
    db
      .from("hot_deals")
      .select("id,plan_type,data,validity,price,provider_cost,is_active")
      .order("plan_type")
      .order("price"),
    db
      .from("lizzy_flashsale")
      .select(
        "planid,network,plantype,planname,validate,newprice,provider_cost,isflashsale,stock_available,stock_sold",
      )
      .order("network")
      .order("amount", { ascending: true }),
  ]);

  const lizzy = (lizzyRes.data ?? []) as LizzyRow[];
  const hot = (hotRes.data ?? []) as HotRow[];
  const flash = (flashRes.data ?? []) as FlashRow[];

  const byPlanId = new Map(lizzy.map((row) => [row.plan_id, row]));

  const toAdminPlan = (
    row: {
      id: number;
      cost: number | null;
      price: number | null;
      active: boolean;
      stockLeft?: number | null;
    },
    source: { network: string; name: string; validity: string; planType: string },
  ): AdminPlan => ({
    id: row.id,
    network: source.network,
    name: source.name,
    validity: source.validity,
    planType: source.planType,
    cost: Number(row.cost ?? 0),
    price: Number(row.price ?? 0),
    active: row.active,
    stockLeft: row.stockLeft ?? null,
  });

  const dataPlans = lizzy.map((row) =>
    toAdminPlan(
      {
        id: row.plan_id,
        cost: row.provider_cost,
        price: row.sell_price,
        active: row.is_active,
      },
      {
        network: row.network,
        name: row.plan,
        validity: row.validity,
        planType: row.plan_type,
      },
    ),
  );

  const flashPlans = flash.map((row) =>
    toAdminPlan(
      {
        id: row.planid,
        cost: row.provider_cost,
        price: row.newprice,
        active: row.isflashsale,
        stockLeft: (row.stock_available ?? 0) - (row.stock_sold ?? 0),
      },
      {
        network: row.network,
        name: row.planname,
        validity: row.validate,
        planType: row.plantype,
      },
    ),
  );

  const hotPlans = hot.map((row) => {
    const plan = byPlanId.get(row.id);
    return toAdminPlan(
      {
        id: row.id,
        cost: row.provider_cost,
        price: row.price,
        active: row.is_active,
      },
      {
        network: row.plan_type,
        name: row.data,
        validity: row.validity,
        planType: plan?.plan_type ?? "—",
      },
    );
  });

  const hotIds = new Set(hot.map((row) => row.id));

  const sections: AdminSections = {
    hot: {
      listed: hotPlans,
      available: dataPlans
        .filter((plan) => !hotIds.has(plan.id))
        .map((plan) => ({ ...plan, active: false })),
    },
    flash: {
      listed: flashPlans.filter((plan) => plan.active),
      available: flashPlans.filter((plan) => !plan.active),
    },
    data: {
      listed: dataPlans.filter((plan) => plan.active),
      available: dataPlans.filter((plan) => !plan.active),
    },
  };

  return (
    <AdminClient
      sections={sections}
      adminEmail={profile.email ?? ""}
      loadErrors={
        [
          lizzyRes.error?.message,
          hotRes.error?.message,
          flashRes.error?.message,
        ].filter(Boolean) as string[]
      }
    />
  );
}
