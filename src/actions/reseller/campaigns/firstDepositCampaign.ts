// src/actions/reseller/campaigns/firstDepositCampaign.ts
//
// State for the reseller-dashboard "first deposit through the app" campaign
// card. The card stays visible until the reseller's first *app-initiated*
// deposit is made. Two independent signals retire it, and either one is
// enough:
//
//   1. global_wallets.app_bonus_claimed flips to true when
//      award_app_first_deposit_bonus() awards the USD 10 — the normal path.
//   2. A completed global_transactions row carrying metadata.source = 'app'.
//      This covers the case where the award was skipped because no fresh FX
//      rate existed (the RPC returns reason 'no_rate' and leaves the flag
//      false), so the deposit still hides the card even though the bonus was
//      not credited.
//
// A deposit made on the web dashboard carries source 'web' and does NOT
// satisfy either signal, so the card correctly persists.
//
// The reward is a fixed USD 10; the card shows that base figure and, directly
// beneath it, the equivalent in the reseller's own currency. The conversion
// uses the same live FX helper the publishing/plans surfaces already use
// (src/lib/currency/exchangeRate.ts), so there is one rate source, not two.
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsdToLocalRate } from "@/lib/currency/exchangeRate";

// A "use server" module may only export async functions, so this stays
// module-private.
const USD_REWARD = 10;

export interface FirstDepositCampaignState {
  /** True when the reseller may still claim the bonus. */
  eligible: boolean;
  /** USD 10 expressed in the wallet currency, or null when no rate exists. */
  localAmount: number | null;
  /** The wallet's currency code (e.g. NGN, GHS, USD). */
  currency: string;
  /** True when an active virtual account exists — the prerequisite. */
  hasVirtualAccount: boolean;
  /** The built app's APK, for the download fallback when the app is absent. */
  apkUrl: string | null;
  /** The app's Android package id, for the intent:// deep link. */
  packageName: string | null;
  /** The app's URL scheme, e.g. "edges-network". */
  appScheme: string | null;
}

const DEFAULT_STATE: FirstDepositCampaignState = {
  eligible: false,
  localAmount: null,
  currency: "USD",
  hasVirtualAccount: false,
  apkUrl: null,
  packageName: null,
  appScheme: null,
};

/** The scheme the reseller app registers for deep links (see /redirect). */
const APP_SCHEME = "edges-network";

export async function getFirstDepositCampaignState(): Promise<FirstDepositCampaignState> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return DEFAULT_STATE;

    // Ownership is established by this RLS-scoped read (auth_user_id).
    const { data: application } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!application) return DEFAULT_STATE;

    const admin = createAdminClient();

    const [
      { data: wallet },
      { data: virtualAccount },
      { data: appBuild },
      { data: appConfig },
      { data: appDeposit },
    ] = await Promise.all([
      admin
        .from("global_wallets")
        .select("app_bonus_claimed, currency")
        .eq("reseller_id", application.id)
        .maybeSingle(),
      admin
        .from("global_virtual_accounts")
        .select("id")
        .eq("reseller_id", application.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      admin
        .from("global_app_builds")
        .select("apk_url")
        .eq("application_id", application.id)
        .not("apk_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("global_reseller_app_configs")
        .select("config")
        .eq("application_id", application.id)
        .maybeSingle(),
      // The ad is for the FIRST app deposit only, so any completed deposit
      // that came from the app retires it. Checked separately from
      // `app_bonus_claimed` because the award is skipped when no fresh FX
      // rate exists (reason 'no_rate'), which would otherwise leave the card
      // visible after the deposit it was advertising had already happened.
      admin
        .from("global_transactions")
        .select("id")
        .eq("reseller_id", application.id)
        .eq("status", "completed")
        .eq("metadata->>source", "app")
        .limit(1)
        .maybeSingle(),
    ]);

    if (!wallet) return DEFAULT_STATE;

    const currency = (wallet.currency || "USD").toUpperCase();
    const eligible = !wallet.app_bonus_claimed && !appDeposit;

    // Only fetch a conversion while the offer is live; it costs a network
    // call (cached for an hour upstream).
    let localAmount: number | null = null;
    if (eligible) {
      const rate = await getUsdToLocalRate(currency);
      if (rate !== null) localAmount = Number((USD_REWARD * rate).toFixed(2));
    }

    // The CTA opens the reseller app when installed and falls back to the
    // APK download when it is not, so it needs both the package id (intent://)
    // and the APK url.
    const config = (appConfig?.config ?? {}) as {
      androidPackageName?: string;
      config?: { androidPackageName?: string; packageName?: string };
    };
    const packageName =
      config.androidPackageName ||
      config.config?.androidPackageName ||
      config.config?.packageName ||
      null;

    return {
      eligible,
      localAmount,
      currency,
      hasVirtualAccount: !!virtualAccount,
      apkUrl: appBuild?.apk_url || null,
      packageName,
      appScheme: APP_SCHEME,
    };
  } catch (error) {
    console.error("First deposit campaign state error:", error);
    return DEFAULT_STATE;
  }
}
