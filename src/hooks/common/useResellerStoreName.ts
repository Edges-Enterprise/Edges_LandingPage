// src/hooks/common/useResellerStoreName.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Resolves the signed-in reseller's store display name for a loading
 * indicator. Mirrors the dashboard layout's resolution (the
 * `get_global_reseller_dashboard_context` RPC, then a slug title-case
 * fallback) so a nested page can name its store without threading the
 * name down as a prop.
 *
 * Returns null until it resolves, or when nobody is signed in — callers
 * fall back to the platform label in that window.
 */
export function useResellerStoreName(countryCode?: string) {
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Seed from the session's store slug so the name is available
        // before the slower dashboard-context RPC resolves.
        const metaSlug = user.user_metadata?.store_slug;
        if (metaSlug && !cancelled) {
          setStoreName(
            String(metaSlug)
              .split("-")
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
          );
        }

        const { data } = await supabase.rpc(
          "get_global_reseller_dashboard_context",
          { p_user_id: user.id },
        );

        if (cancelled || !data) return;

        if (data.store_name) {
          setStoreName(data.store_name);
        } else if (data.store_slug) {
          setStoreName(
            data.store_slug
              .split("-")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
          );
        }
      } catch (error) {
        console.error("Error resolving store name:", error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  return storeName;
}
