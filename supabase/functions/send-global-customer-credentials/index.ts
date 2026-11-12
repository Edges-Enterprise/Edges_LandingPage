// supabase/functions/send-global-customer-credentials/index.ts
//
// Emails a customer the login details a reseller just created for them from the
// dashboard "Add customer" flow. Sent over SMTP as the Telcos account, with the
// store name as the From display name so the customer sees their store, and the
// generated password is delivered here (never returned to the reseller).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSmtpEmail } from "../_shared/smtpEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function buildCredentialsEmail({
  firstName,
  storeName,
  email,
  password,
  signInUrl,
}: {
  firstName: string;
  storeName: string;
  email: string;
  password: string;
  signInUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your ${storeName} account</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { width: 100%; max-width: 580px; margin: 0 auto; }
    .header { background: #ffffff; padding: 32px 40px 24px; border-bottom: 1px solid #e8e8e8; text-align: center; }
    .body { background: #ffffff; padding: 32px 40px; }
    .title { font-size: 22px; font-weight: 600; color: #111; line-height: 1.3; margin-bottom: 12px; }
    .lead { font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 28px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #999; margin-bottom: 12px; }
    .info-box { background: #f9f9f9; border: 1px solid #e8e8e8; border-radius: 6px; padding: 20px 24px; margin-bottom: 20px; }
    .cred-row { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid #efefef; font-size: 14px; }
    .cred-row:last-child { border-bottom: none; padding-bottom: 0; }
    .cred-key { color: #999; min-width: 80px; flex-shrink: 0; }
    .cred-val { color: #111; font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all; }
    .note { font-size: 13px; color: #666; background: #fffbf0; border: 1px solid #f0e6c0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; line-height: 1.6; }
    .cta-wrap { margin: 28px 0; text-align: center; }
    .cta { display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #fff; background: #C98A54; border-radius: 12px; text-decoration: none; letter-spacing: 0.2px; }
    .footer { background: #f5f5f5; padding: 24px 40px; }
    .footer-text { font-size: 12px; color: #aaa; line-height: 1.8; text-align: center; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div style="font-size: 22px; font-weight: 700; color: #C98A54;">${storeName}</div>
  </div>
  <div class="body">
    <div class="title">Welcome, ${firstName}! 🎉</div>
    <div class="lead">
      An account has been created for you at <strong>${storeName}</strong>. Use the
      details below to sign in and start buying data, airtime and more.
    </div>

    <div class="label">Login Credentials</div>
    <div class="info-box">
      <div class="cred-row">
        <div class="cred-key">Email</div>
        <div class="cred-val">${email}</div>
      </div>
      <div class="cred-row">
        <div class="cred-key">Password</div>
        <div class="cred-val">${password}</div>
      </div>
    </div>

    <div class="note">
      🔐 <strong>Important:</strong> Keep your password private. You can change it
      from your account settings after signing in.
    </div>

    <div class="cta-wrap">
      <a href="${signInUrl}" class="cta">Sign in to ${storeName}</a>
    </div>
  </div>
  <div class="footer">
    <div class="footer-text">
      © ${new Date().getFullYear()} ${storeName}. All rights reserved.
    </div>
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Only the server action (holding the service-role key) may trigger a send.
  // `verify_jwt: true` alone is not enough: the public anon key is a valid JWT.
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || bearer !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { resellerId, customerId, firstName, email, password } = body;

    if (!resellerId || !email || !firstName || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: reseller, error: resellerError } = await supabase
      .from("global_reseller_applications")
      .select("store_name, store_slug, country_code")
      .eq("id", resellerId)
      .single();

    if (resellerError || !reseller) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const appUrl =
      Deno.env.get("APP_URL") || "https://edges-landing-page.vercel.app";
    const signInUrl = `${appUrl}/${reseller.country_code}/${reseller.store_slug}`;

    const html = buildCredentialsEmail({
      firstName,
      storeName: reseller.store_name,
      email,
      password,
      signInUrl,
    });

    await sendSmtpEmail({
      to: email,
      subject: `Your ${reseller.store_name} account is ready`,
      html,
      fromName: reseller.store_name,
    });

    // Record the send so a failure is visible later, mirroring the welcome flow.
    await supabase.from("global_email_logs").insert({
      application_id: resellerId,
      email_type: "customer_credentials",
      subject: `Your ${reseller.store_name} account is ready`,
      sent_at: new Date().toISOString(),
    });

    console.log(
      `Customer credentials email sent to ${email} for store ${reseller.store_slug} (customer ${customerId ?? "n/a"})`,
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending customer credentials email:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
