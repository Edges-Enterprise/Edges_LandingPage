// app/actions/reseller/getReseller.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Reseller } from "@/types";

/**
 * Get a reseller by store name
 */
export async function getResellerByStoreName(
  storeName: string,
): Promise<Reseller | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("resellers")
    .select("*")
    .eq("store_name", storeName)
    .eq("status", "active")
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get a reseller by their auth user ID
 */
export async function getResellerByAuthId(): Promise<Reseller | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("resellers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get the current logged-in reseller (throws if not found)
 */
export async function getCurrentReseller(): Promise<Reseller> {
  const reseller = await getResellerByAuthId();
  if (!reseller) {
    throw new Error("Reseller not found");
  }
  return reseller;
}