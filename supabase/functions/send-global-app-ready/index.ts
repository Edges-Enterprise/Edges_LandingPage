// supabase/functions/send-global-app-ready/index.ts
//
// Emails a store owner that their branded Android app has finished building.
// Sent over SMTP as the Telcos account, with the store name as the From display
// name — so the countryCode (global) flow has its own mail sender and does not
// share the legacy Edges Network mailer (`src/lib/email/email.ts`) that the
// admin bulk-mail page still uses.
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

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildAppReadyEmail({
  storeName,
  recipientName,
  apkUrl,
  dashboardUrl,
}: {
  storeName: string;
  recipientName: string;
  apkUrl: string;
  dashboardUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your ${storeName} app is ready</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { width: 100%; max-width: 580px; margin: 0 auto; }
    .header { background: #ffffff; padding: 32px 40px 24px; border-bottom: 1px solid #e8e8e8; text-align: center; }
    .body { background: #ffffff; padding: 32px 40px; }
    .title { font-size: 22px; font-weight: 600; color: #111; line-height: 1.3; margin-bottom: 12px; }
    .lead { font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 28px; }
    .note { font-size: 13px; color: #666; background: #fffbf0; border: 1px solid #f0e6c0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; line-height: 1.6; }
    .cta-wrap { margin: 28px 0; text-align: center; }
    .cta { display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #fff; background: #C98A54; border-radius: 12px; text-decoration: none; letter-spacing: 0.2px; }
    .link { font-size: 12px; color: #999; word-break: break-all; line-height: 1.6; margin-top: 18px; }
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
    <div class="title">Your ${storeName} app is ready 🎉</div>
    <div class="lead">
      Hello ${recipientName}, your branded Android app for
      <strong>${storeName}</strong> has been built successfully. Download it and
      start sharing it with your customers.
    </div>

    <div class="cta-wrap">
      <a href="${apkUrl}" class="cta">Download your app</a>
    </div>

    <div class="note">
      You can re-download it any time from your dashboard:
      <a href="${dashboardUrl}" style="color:#C98A54;">${dashboardUrl}</a>
    </div>

    <div class="link">Direct link: ${apkUrl}</div>
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

  // Only the build webhook (holding the service-role key) may trigger a send.
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
    const { applicationId, apkUrl } = body;

    if (!applicationId || !apkUrl) {
      return new Response(
        JSON.stringify({ error: "applicationId and apkUrl are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const { data: app, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("email, first_name, store_name, store_slug")
      .eq("id", applicationId)
      .single();

    if (appError || !app?.email) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const storeName = app.store_name || app.store_slug || "Your store";
    const recipientName = app.first_name || titleCase(storeName);
    const appUrl =
      Deno.env.get("APP_URL") || "https://edges-landing-page.vercel.app";
    const dashboardUrl = `${appUrl}/dashboard/app`;

    await sendSmtpEmail({
      to: app.email,
      subject: `📱 Your ${titleCase(storeName)} App is Ready!`,
      html: buildAppReadyEmail({
        storeName,
        recipientName,
        apkUrl,
        dashboardUrl,
      }),
      fromName: storeName,
    });

    await supabase.from("global_email_logs").insert({
      application_id: applicationId,
      email_type: "app_ready",
      subject: `Your ${titleCase(storeName)} App is Ready!`,
      sent_at: new Date().toISOString(),
    });

    console.log(
      `App-ready email sent to ${app.email} for store ${storeName} (apk ${apkUrl})`,
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending app-ready email:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
