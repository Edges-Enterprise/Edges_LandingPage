// app/actions/reseller/getStoreAsset.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getStoreAsset(resellerId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("reseller_assets")
    .select("url, file_name, mime_type")
    .eq("reseller_id", resellerId)
    .eq("type", "icon")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
