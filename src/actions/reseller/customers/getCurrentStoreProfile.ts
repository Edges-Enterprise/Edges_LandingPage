// src/actions/reseller/customers/getCurrentStoreProfile.ts
//
// Resolves the signed-in storefront visitor (store owner or customer) from
// their Supabase Auth session and returns the profile fields the storefront
// profile page renders. Mirrors getCurrentCustomerWallet's resolution: the
// session client proves who is calling, then the service-role client reads
// the row, because `global_customers` SELECT is owner-only under RLS and the
// owner has no `global_customers` row at all.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StoreProfile {
  id: string;
  accountType: "owner" | "customer";
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  memberSince: string | null;
}

export async function getCurrentStoreProfile(
  resellerId: string,
): Promise<{ data?: StoreProfile; error?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Not signed in" };
  }

  const admin = createAdminClient();

  const { data: application } = await admin
    .from("global_reseller_applications")
    .select(
      "id, first_name, last_name, store_name, email, phone, created_at, auth_user_id",
    )
    .eq("id", resellerId)
    .maybeSingle();

  if (!application) return { error: "Store not found" };

  // The owner is the reseller application's own auth user; the metadata
  // check the storefront uses elsewhere is not needed here because the
  // application row carries auth_user_id directly.
  if (application.auth_user_id === user.id) {
    return {
      data: {
        id: resellerId,
        accountType: "owner",
        firstName: application.first_name || application.store_name || "",
        lastName: application.last_name || "",
        email: application.email || user.email || "",
        phone: application.phone || null,
        status: "active",
        memberSince: application.created_at || null,
      },
    };
  }

  const { data: customer, error: customerError } = await admin
    .from("global_customers")
    .select("id, first_name, last_name, email, phone, status, created_at")
    .eq("reseller_id", resellerId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerError) return { error: customerError.message };
  if (!customer) return { error: "Customer record not found" };

  return {
    data: {
      id: customer.id,
      accountType: "customer",
      firstName: customer.first_name || "",
      lastName: customer.last_name || "",
      email: customer.email || user.email || "",
      phone: customer.phone || null,
      status: customer.status || "active",
      memberSince: customer.created_at || null,
    },
  };
}
