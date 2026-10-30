// src/actions/reseller/store/applyBrandingChange.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerAppBuild } from "@/actions/reseller/build/triggerAppBuild";
import {
  BRANDING_COOLDOWN_DAYS,
  BRANDING_FIELDS,
  computeBrandingLock,
  type BrandingField,
} from "@/lib/store/brandingCooldown";

// Brand colour, logo and notification icon are baked into the customer APK at
// build time (triggerAppBuild maps them to theme.primary and the icon/splash/
// adaptive/notification assets), so a change is only visible in the app after
// a rebuild. Rebuilds are therefore rate limited: one change per 90 days.

interface ApplyBrandingChangeParams {
  applicationId: string;
  field: BrandingField;
  value: string | null;
}

export async function applyBrandingChange(params: ApplyBrandingChangeParams) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    if (!BRANDING_FIELDS.includes(params.field)) {
      return { success: false, error: "Invalid branding field" };
    }

    const { data: application } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, store_name, store_slug, country_code, brand_color, logo_url, notification_icon_url, android_app, branding_updated_at",
      )
      .eq("id", params.applicationId)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!application) {
      return { success: false, error: "Reseller not found" };
    }

    // Re-check the cooldown server side: the client also disables the
    // controls, but the lock must hold against a direct call.
    const lock = computeBrandingLock(application.branding_updated_at);
    if (lock.locked) {
      return {
        success: false,
        locked: true,
        lockedUntil: lock.lockedUntil,
        daysRemaining: lock.daysRemaining,
        error: `Branding can only change once every ${BRANDING_COOLDOWN_DAYS} days. Try again in ${lock.daysRemaining} day${lock.daysRemaining === 1 ? "" : "s"}.`,
      };
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();

    // Persist the new value plus the cooldown stamp in one write.
    const { error: updateError } = await admin
      .from("global_reseller_applications")
      .update({
        [params.field]: params.value,
        branding_updated_at: now,
        updated_at: now,
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("applyBrandingChange update error:", updateError);
      return { success: false, error: updateError.message };
    }

    const next = {
      ...application,
      [params.field]: params.value,
      branding_updated_at: now,
    };

    const lockedUntil = new Date(
      Date.now() + BRANDING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Only stores with the Android app enabled have anything to rebuild.
    if (!application.android_app) {
      return {
        success: true,
        buildTriggered: false,
        lockedUntil,
        message: "Branding saved. No app rebuild needed for this store.",
      };
    }

    const { data: build, error: buildError } = await admin
      .from("global_app_builds")
      .insert({
        application_id: application.id,
        build_status: "queued",
        queued_at: now,
      })
      .select("id")
      .single();

    if (buildError || !build) {
      console.error("applyBrandingChange queue error:", buildError);
      // The branding change is saved; only the rebuild failed to queue.
      return {
        success: true,
        buildTriggered: false,
        lockedUntil,
        error: "Branding saved, but the app rebuild could not be queued.",
      };
    }

    const result = await triggerAppBuild({
      applicationId: application.id,
      buildId: build.id,
      storeName: application.store_name,
      storeSlug: application.store_slug,
      brandColor: next.brand_color,
      logoUrl: next.logo_url,
      notificationIconUrl: next.notification_icon_url,
      countryCode: application.country_code,
    });

    if (result.success) {
      await admin
        .from("global_app_builds")
        .update({ build_status: "building", building_at: now })
        .eq("id", build.id);
      return {
        success: true,
        buildTriggered: true,
        lockedUntil,
        message:
          "Branding saved. A new app build is on the way — it usually finishes in 5–10 minutes.",
      };
    }

    // No GitHub credentials in this environment: the build row stays queued,
    // which is the same graceful path the rest of the build flow uses.
    return {
      success: true,
      buildTriggered: false,
      buildQueued: true,
      lockedUntil,
      error: result.error,
      message:
        "Branding saved and the app rebuild is queued. It usually finishes in 5–10 minutes.",
    };
  } catch (error) {
    console.error("applyBrandingChange threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
