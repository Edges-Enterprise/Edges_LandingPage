// src/actions/reseller/settings/sessionActions.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Session } from "@/types/reseller/settings";

// `user_agent` is free text from the client, so it is parsed into a label
// rather than rendered raw.
function describeUserAgent(userAgent: string | null): {
  device_name: string;
  device_type: string;
} {
  if (!userAgent) {
    return { device_name: "Unknown device", device_type: "unknown" };
  }

  const browser = /Edg\/[\d.]+/.test(userAgent)
    ? "Edges App"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Edg\//.test(userAgent)
        ? "Edge"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : /Firefox\//.test(userAgent)
              ? "Firefox"
              : "Browser";

  const os = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";

  return {
    device_name: os ? `${browser} on ${os}` : browser,
    device_type: /Android|iPhone|iPad|iPod|Mobile/.test(userAgent)
      ? "mobile"
      : "desktop",
  };
}

export async function getActiveSessions(): Promise<{
  success: boolean;
  sessions?: Session[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // The function is SECURITY DEFINER and pins every row to auth.uid(), so
    // the session client can call it without a table grant on auth.sessions.
    const { data, error } = await supabase.rpc("get_my_active_sessions");

    if (error) {
      console.error("getActiveSessions error:", error);
      return { success: false, error: error.message };
    }

    const sessions: Session[] = (data || []).map((row: any) => {
      const { device_name, device_type } = describeUserAgent(row.user_agent);
      return {
        id: row.id,
        device_name,
        device_type,
        ip_address: row.ip || "Unknown",
        location: undefined,
        last_active: row.last_active,
        is_current: row.is_current === true,
      };
    });

    return { success: true, sessions };
  } catch (error) {
    console.error("getActiveSessions threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function revokeSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase.rpc("revoke_my_session", {
      p_session_id: sessionId,
    });

    if (error) {
      console.error("revokeSession error:", error);
      return { success: false, error: error.message };
    }

    if (data !== true) {
      return {
        success: false,
        error: "That session could not be signed out.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("revokeSession threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Only the *presence* of a verified factor is surfaced, so the caller's JWT
// can stay at aal1 while the UI still reports the account as protected. That
// is deliberate: forcing aal2 here would sign the reseller out of the
// dashboard and they could not reach the tab to turn it off again.
export async function getTwoFactorStatus(): Promise<{
  success: boolean;
  enabled?: boolean;
  verifiedAt?: string | null;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // auth.mfa_factors is not exposed through PostgREST, so the factors are
    // read through the GoTrue admin API instead.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.mfa.listFactors({
      userId: user.id,
    });

    if (error) {
      console.error("getTwoFactorStatus error:", error);
      return { success: false, error: error.message };
    }

    const verified = (data?.factors ?? []).find(
      (factor) => factor.factor_type === "totp" && factor.status === "verified",
    );

    return {
      success: true,
      enabled: !!verified,
      verifiedAt: verified?.created_at ?? null,
    };
  } catch (error) {
    console.error("getTwoFactorStatus threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
