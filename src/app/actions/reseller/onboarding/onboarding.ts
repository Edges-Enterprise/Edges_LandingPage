// src/app/actions/reseller/onboarding/onboarding.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Task 9 — first-time reseller setup guide.
 *
 * The RPCs are SECURITY DEFINER and resolve the caller from auth.uid(), so
 * no reseller id is passed from the client. The client refreshes its own
 * state from the returned payload rather than trusting a local mutation.
 */

interface OnboardingActionResult {
  success?: boolean;
  error?: string;
}

/** The fields of get_reseller_onboarding() the walkthrough still needs. */
export interface OnboardingStatus {
  reseller_id: string;
  country_code: string | null;
  store_slug: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
  error?: string;
}

/**
 * Read the caller's onboarding status (whether the tour was already finished
 * or dismissed). The RPC resolves the reseller from auth.uid().
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_reseller_onboarding");

  if (error) {
    console.error("get_reseller_onboarding error:", error);
    return null;
  }
  return data as OnboardingStatus;
}

/** Hide the guide (decision 2: it returns on the next load while incomplete). */
export async function dismissOnboarding(): Promise<OnboardingActionResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("dismiss_onboarding");

  if (error) {
    console.error("dismiss_onboarding error:", error);
    return { error: "Failed to dismiss the setup guide" };
  }
  if (data && data.error) {
    return { error: data.error };
  }
  return { success: true };
}

/** Stamp completed_at once, when the reseller finishes or skips the tour. */
export async function completeOnboarding(): Promise<OnboardingActionResult> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("complete_onboarding");

  if (error) {
    console.error("complete_onboarding error:", error);
    return { error: "Failed to complete the setup guide" };
  }
  if (data && data.error) {
    return { error: data.error };
  }
  return { success: true };
}
