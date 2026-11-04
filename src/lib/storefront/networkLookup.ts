// src/lib/storefront/networkLookup.ts
//
// Phase 2, step 7. The storefront's phone-number detection.
//
// This calls the `global-network-lookup` edge function, which asks Zendit's
// lookup and falls back to a small prefix map only when that is unavailable.
// It is used to show the customer which carrier/country their number resolves
// to as they type. It is a display aid: the authoritative check happens at
// purchase, in the orchestrator, against the same lookup.

import { createClient } from "@/lib/supabase/client";

export interface NetworkDetection {
  country: string;
  brand: string;
  /** "lookup" (from Zendit), "prefix" (local fallback) or "unknown". */
  method: "lookup" | "prefix" | "unknown";
  network: string | null;
  /** True when the answer came from the fallback rather than the provider. */
  fallback: boolean;
}

/**
 * Look up the carrier/country for a phone number. Returns null when the
 * lookup could not run (no session, network error) so the caller can simply
 * not show a badge rather than show a wrong one.
 */
export async function lookupNetwork(
  phoneNumber: string,
): Promise<NetworkDetection | null> {
  const trimmed = phoneNumber.replace(/\s/g, "");
  if (trimmed.length < 6) return null;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/global-network-lookup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${session?.access_token ?? anonKey}`,
        },
        body: JSON.stringify({ phoneNumber: trimmed }),
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data.country !== "string") return null;
    return {
      country: data.country,
      brand: data.brand ?? "",
      method: data.method ?? "unknown",
      network: data.network ?? null,
      fallback: Boolean(data.fallback),
    };
  } catch {
    return null;
  }
}
