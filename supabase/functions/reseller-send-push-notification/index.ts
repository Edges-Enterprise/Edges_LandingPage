// supabase/functions/reseller-send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Reseller Push Notification Function initialized");

// Firebase service account from secret. Read lazily and tolerate it being
// absent or malformed: a module-level JSON.parse of an undefined secret throws
// during isolate boot, which would crash the whole function — including the
// Expo path below that never needs Firebase.
type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cachedServiceAccount: FirebaseServiceAccount | null | undefined;

function getServiceAccount(): FirebaseServiceAccount | null {
  if (cachedServiceAccount !== undefined) return cachedServiceAccount;
  const raw =
    Deno.env.get("FIREBASE_ADMIN_SDK_JSON") ??
    Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    console.error(
      "Firebase service account not configured (FIREBASE_ADMIN_SDK_JSON / FIREBASE_SERVICE_ACCOUNT)",
    );
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

// Cache for access token
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Helper function to properly format PEM key
function getFormattedPrivateKey(privateKey: string): string {
  // Remove any surrounding quotes or whitespace
  let cleanKey = privateKey.trim();
  
  // Handle escaped newlines (Firebase often provides them as \n)
  cleanKey = cleanKey.replace(/\\n/g, '\n');
  
  // Ensure proper PEM formatting
  if (!cleanKey.includes('-----BEGIN PRIVATE KEY-----')) {
    // If the key doesn't have PEM headers, try to add them
    const pemBody = cleanKey.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
    cleanKey = `-----BEGIN PRIVATE KEY-----\n${pemBody.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  
  return cleanKey;
}

async function getFCMAccessToken(): Promise<string> {
  // Check if cached token is still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error("Firebase service account is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  
  // Base64URL encode helper
  const base64UrlEncode = (str: string): string => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;
  
  // Format and import the private key
  const privateKey = getFormattedPrivateKey(serviceAccount.private_key);
  const encoder = new TextEncoder();
  
  // Remove PEM headers and decode the base64 content
  const pemContents = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      encoder.encode(toSign)
    );
    
    const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${toSign}.${encodedSignature}`;
    
    // Exchange JWT for access token
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
      console.error("Token exchange error:", tokenData);
      throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
    }
    
    cachedToken = tokenData.access_token;
    tokenExpiry = Date.now() + 3500 * 1000; // Cache for 3500 seconds
    
    return cachedToken;
  } catch (error) {
    console.error("Error importing key or signing:", error);
    throw error;
  }
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const { record, table } = payload;

    if (!record || !table) {
      throw new Error("Invalid payload: missing record or table");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let pushToken: string | null = null;
    let fcmToken: string | null = null;
    let notificationId: string = record.id;
    let userId: string | null = null;
    let userType: "reseller" | "customer" | null = null;

    // ─── Determine user type & fetch tokens ─────────────────
    if (table === "reseller_notifications") {
      const { data: reseller } = await supabase
        .from("resellers")
        .select("fcm_token, push_token, notifications_enabled, auth_user_id")
        .eq("id", record.reseller_id)
        .single();

      if (reseller?.notifications_enabled) {
        fcmToken = reseller.fcm_token;
        pushToken = reseller.push_token;
        userId = reseller.auth_user_id;
        userType = "reseller";
      }
    } else if (table === "reseller_customer_notifications") {
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("fcm_token, push_token, notifications_enabled, auth_user_id")
        .eq("id", record.customer_id)
        .single();

      if (customer?.notifications_enabled) {
        fcmToken = customer.fcm_token;
        pushToken = customer.push_token;
        userId = customer.auth_user_id;
        userType = "customer";
      }
    }

    // Choose which token to use. Direct FCM requires a configured Firebase
    // service account; when it is absent, fall back to the Expo push service
    // (which needs no Firebase credentials) rather than crashing or 500ing.
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
      console.log(`No token found for ${userType}`);
      return new Response(
        JSON.stringify({ success: true, message: "No token found" }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Extract raw token if it's in Expo format
    let rawToken = tokenToUse;
    const expoMatch = tokenToUse.match(/ExponentPushToken\[(.+)\]/);
    if (expoMatch) {
      rawToken = expoMatch[1];
    }

    const title = record.metadata?.title || "New Notification";
    const body = record.message || "";

    console.log(`Sending to ${userType} using ${isDirectFCM ? "DIRECT FCM" : "Expo API"}:`, { title, body });

    let result;
    
    if (isDirectFCM) {
      // ─── Send via Direct FCM ───
      const accessToken = await getFCMAccessToken();
      
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount!.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: rawToken,
              notification: {
                title: title,
                body: body,
              },
              data: {
                notificationId: notificationId,
                type: record.notification_type,
                route: record.metadata?.route || "/(app)/(protected)/notifications",
                userType: userType || "",
              },
              android: {
                priority: "high",
                notification: {
                  channel_id: "default",
                  sound: "default",
                },
              },
            },
          }),
        }
      );
      
      result = await fcmResponse.json();
      
      if (!fcmResponse.ok) {
        console.error("FCM API error:", result);
        throw new Error(`FCM API error: ${JSON.stringify(result)}`);
      }
      
      console.log(`✅ Direct FCM notification sent to ${userType}`);
    } else {
      // ─── Fallback to Expo API ─────────────────────────────
      const notificationPayload = {
        to: tokenToUse,
        sound: "default",
        title,
        body,
        data: {
          notificationId: notificationId,
          type: record.notification_type,
          route: record.metadata?.route || "/(app)/(protected)/notifications",
          userType: userType,
        },
        priority: "high",
        channelId: "default",
      };

      const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationPayload),
      });

      result = await expoRes.json();

      if (!expoRes.ok) {
        console.error("Expo API error:", result);
        throw new Error(`Expo API error: ${JSON.stringify(result)}`);
      }

      console.log(`✅ Expo notification sent to ${userType}`);
    }

    return new Response(JSON.stringify({ success: true, result, method: isDirectFCM ? "fcm" : "expo" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    );
  }
});
