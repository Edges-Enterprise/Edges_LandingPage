// supabase/functions/_shared/catalog/lizzysubClient.ts
//
// Thin HTTP client for the Lizzysub catalogue (Nigeria only).
//
// Lizzysub has no public "list plans" API; the dashboard calls its own
// endpoints, and those are what this client uses:
//
//   POST https://lizzysub.com/api/login/verify/user
//        { username, password } -> { status: "success", token }
//   POST https://lizzysub.com/api/get/data/plans/{token}/adex
//        { network: "1".."4", network_type } ->
//        { status: "success", plan: [{ plan_id, name, amount }] }
//
// Verified 2026-11-26. Notes that are part of the contract:
//
//   * The endpoints live on the apex host; `app.lizzysub.com` only serves the
//     SPA. A request without a browser-like User-Agent plus Origin/Referer and
//     X-Requested-With is answered with a 302 to /500.
//   * Network ids: 1 MTN, 2 AIRTEL, 3 GLO, 4 9MOBILE — the same numbering the
//     purchase call uses.
//   * The login token is short-lived, so every sync logs in again rather than
//     storing one. The account's apikey is NOT accepted by this endpoint.
//   * plan ids are unique across networks and types (225 plans on 2026-11-26),
//     which is what makes (provider, provider_plan_id) a safe upsert key.

const BASE_URL = "https://lizzysub.com";

const NETWORKS = [
  { id: "1", name: "MTN" },
  { id: "2", name: "AIRTEL" },
  { id: "3", name: "GLO" },
  { id: "4", name: "9MOBILE" },
] as const;

const NETWORK_TYPES = ["GIFTING", "SME", "COOPERATE GIFTING"] as const;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Origin: "https://app.lizzysub.com",
  Referer: "https://app.lizzysub.com/",
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/json",
};

export interface LizzysubPlan {
  plan_id: string;
  name: string;
  amount: number;
  network: string;
  plan_type: string;
}

export async function loginLizzysub(): Promise<string> {
  const username = Deno.env.get("LIZZYSUB_USERNAME");
  const password = Deno.env.get("LIZZYSUB_PASSWORD");
  if (!username || !password) {
    throw new Error("LIZZYSUB_USERNAME / LIZZYSUB_PASSWORD are not set");
  }

  const res = await fetch(`${BASE_URL}/api/login/verify/user`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => null);
  const token = data?.token;
  if (!res.ok || !token) {
    throw new Error(`lizzysub login failed (HTTP ${res.status})`);
  }
  return String(token);
}

/**
 * Read every (network, network_type) bucket. A single failed bucket throws:
 * a partial crawl must never be mistaken for "these plans disappeared".
 */
export async function fetchLizzysubPlans(token: string): Promise<LizzysubPlan[]> {
  const plans: LizzysubPlan[] = [];

  for (const network of NETWORKS) {
    for (const planType of NETWORK_TYPES) {
      const res = await fetch(`${BASE_URL}/api/get/data/plans/${token}/adex`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          network: network.id,
          network_type: planType,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.status !== "success" || !Array.isArray(data.plan)) {
        throw new Error(
          `lizzysub plans ${network.name}/${planType} failed (HTTP ${res.status})`,
        );
      }

      for (const plan of data.plan) {
        plans.push({
          plan_id: String(plan.plan_id),
          name: String(plan.name ?? ""),
          amount: Number(plan.amount),
          network: network.name,
          plan_type: planType,
        });
      }
    }
  }

  return plans;
}
