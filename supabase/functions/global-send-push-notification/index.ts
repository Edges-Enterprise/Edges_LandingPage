// supabase/functions/global-send-push-notification/index.ts
//
// Push delivery for the global_* (multi-country, multi-tenant) data model.
// This is the successor to the legacy reseller-send-push-notification, which
// reads the retired `resellers` / `reseller_customers` tables and must not be
// used for new work.
//
// Invoked by the DB triggers `global_reseller_push_trigger` /
// `global_customer_push_trigger` (migration
// 20261110_create_global_push_notifications.sql) via net.http_post, with the
// inserted row as `record`. It resolves the recipient's tokens from
// global_reseller_applications (owner) or global_customers (customer) and
// sends through direct FCM when a Firebase service account is configured,
// falling back to the Expo push service otherwise.
//
// The DB trigger is the only intended caller, so the request is gated on a
// shared secret (x-push-secret) rather than a user JWT; the function is
// deployed with --no-verify-jwt because the trigger presents no JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Global Push Notification Function initialized");

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cachedServiceAccount: FirebaseServiceAccount | null | undefined;

// Read the service account lazily and tolerate it being absent or malformed: a
// module-level JSON.parse of an undefined secret throws during isolate boot and
// would crash the whole function, including the Expo path that never needs
// Firebase.
function getServiceAccount(): FirebaseServiceAccount | null {
  if (cachedServiceAccount !== undefined) return cachedServiceAccount;
  const raw =
    Deno.env.get("FIREBASE_ADMIN_SDK_JSON") ??
    Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    console.error("Firebase service account is not configured");
    cachedServiceAccount = null;
    return null;
  }
  try {
    cachedServiceAccount = JSON.parse(raw) as FirebaseServiceAccount;
  } catch (error) {
    console.error("Invalid Firebase service account JSON:", error);
    cachedServiceAccount = null;
  }
  return cachedServiceAccount;
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getFormattedPrivateKey(privateKey: string): string {
  let cleanKey = privateKey.trim().replace(/\\n/g, "\n");
  if (!cleanKey.includes("-----BEGIN PRIVATE KEY-----")) {
    const pemBody = cleanKey.replace(/\s/g, "");
    cleanKey =
      `-----BEGIN PRIVATE KEY-----\n${pemBody.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----\n`;
  }
  return cleanKey;
}

async function getFCMAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) throw new Error("Firebase service account is not configured");

  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const toSign = `${encodedHeader}.${encodedPayload}`;

  const pemContents = getFormattedPrivateKey(serviceAccount.private_key)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign),
  );
  const jwt = `${toSign}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  cachedToken = tokenData.access_token;
  tokenExpiry = Date.now() + 3500 * 1000;
  return cachedToken!;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("PUSH_TRIGGER_SECRET");
    if (secret && req.headers.get("x-push-secret") !== secret) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const { record, table } = await req.json();
    if (!record || !table) {
      throw new Error("Invalid payload: missing record or table");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let fcmToken: string | null = null;
    let pushToken: string | null = null;
    let userType: "reseller" | "customer" | null = null;

    if (table === "global_notifications") {
      const { data: reseller } = await supabase
        .from("global_reseller_applications")
        .select("fcm_token, push_token, notifications_enabled")
        .eq("id", record.reseller_id)
        .maybeSingle();
      if (reseller?.notifications_enabled) {
        fcmToken = reseller.fcm_token;
        pushToken = reseller.push_token;
        userType = "reseller";
      }
    } else if (table === "global_customer_notifications") {
      const { data: customer } = await supabase
        .from("global_customers")
        .select("fcm_token, push_token, notifications_enabled")
        .eq("id", record.customer_id)
        .maybeSingle();
      if (customer?.notifications_enabled) {
        fcmToken = customer.fcm_token;
        pushToken = customer.push_token;
        userType = "customer";
      }
    } else {
      return jsonResponse({ success: false, error: `Unknown table: ${table}` }, 400);
    }

    // Direct FCM needs a configured service account; without one, fall back to
    // the Expo push service rather than failing.
    const serviceAccount = getServiceAccount();
    let tokenToUse: string | null = null;
    let isDirectFCM = false;
    if (serviceAccount && fcmToken) {
      tokenToUse = fcmToken;
      isDirectFCM = true;
    } else if (pushToken) {
      tokenToUse = pushToken;
    } else {
      tokenToUse = fcmToken;
    }

    if (!tokenToUse) {
      return jsonResponse({ success: true, message: "No token found" });
    }

    const title = record.metadata?.title || "New Notification";
    const body = record.message || "";
    const data = {
      notificationId: record.id,
      type: record.notification_type,
      route: record.metadata?.route || "/(app)/(protected)/notifications",
      userType: userType || "",
    };

    let result;
    if (isDirectFCM) {
      const accessToken = await getFCMAccessToken();
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount!.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: tokenToUse,
              notification: { title, body },
              data,
              android: { priority: "high", notification: { channel_id: "default", sound: "default" } },
            },
          }),
        },
      );
      result = await fcmResponse.json();
      if (!fcmResponse.ok) {
        throw new Error(`FCM API error: ${JSON.stringify(result)}`);
      }
    } else {
      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: tokenToUse,
          sound: "default",
          title,
          body,
          data,
          priority: "high",
          channelId: "default",
        }),
      });
      result = await expoRes.json();
      if (!expoRes.ok) {
        throw new Error(`Expo API error: ${JSON.stringify(result)}`);
      }
    }

    return jsonResponse({
      success: true,
      result,
      method: isDirectFCM ? "fcm" : "expo",
    });
  } catch (error) {
    console.error("Error sending global push notification:", error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});
