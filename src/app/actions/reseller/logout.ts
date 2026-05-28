// app/actions/reseller/logout.ts

"use server";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logoutReseller() {
  const supabase = await createServerClient();

  // Get the reseller's store slug before signing out
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const storeSlug = user?.user_metadata?.store_name;

  await supabase.auth.signOut();

  redirect(storeSlug ? `/${storeSlug}` : "/reseller");
}

export async function logoutCustomer(storeName: string) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect(`/${storeName}`);
}
