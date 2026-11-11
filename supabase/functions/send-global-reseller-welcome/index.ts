// supabase/functions/send-global-reseller-welcome/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER")!;
const SMTP_PASS = Deno.env.get("SMTP_PASS")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── SMTP sender ───────────────────────────────────────────────────────────────
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const readAll = async (): Promise<string> => {
    let response = "";
    while (true) {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      if (!n) break;
      const chunk = decoder.decode(buf.subarray(0, n));
      response += chunk;
      if (/^\d{3} /m.test(chunk)) break;
    }
    return response;
  };

  const write = async (data: string) => {
    await conn.write(encoder.encode(data + "\r\n"));
  };

  const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
  const boundary = `boundary_${Date.now()}`;
  const message = [
    `From: "Telcos." <${SMTP_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    htmlBase64,
    `--${boundary}--`,
  ].join("\r\n");

  try {
    await readAll(); // 220 greeting
    await write("EHLO telcos");
    await readAll();
    await write("AUTH LOGIN");
    await readAll();
    await write(btoa(SMTP_USER));
    await readAll();
    await write(btoa(SMTP_PASS));
    const authRes = await readAll();
    if (!authRes.includes("235")) throw new Error(`SMTP auth failed: ${authRes}`);
    await write(`MAIL FROM:<${SMTP_USER}>`);
    await readAll();
    await write(`RCPT TO:<${to}>`);
    await readAll();
    await write("DATA");
    await readAll();
    await write(message + "\r\n.");
    const dataRes = await readAll();
    if (!dataRes.includes("250")) throw new Error(`SMTP DATA failed: ${dataRes}`);
    await write("QUIT");
    return { success: true };
  } finally {
    conn.close();
  }
}

// ── Build Welcome Email ──────────────────────────────────────────────────────
function buildWelcomeEmail({
  firstName,
  lastName,
  storeName,
  storeSlug,
  countryCode,
  email,
  password,
  androidApp,
  applicationId,
}: {
  firstName: string;
  lastName: string;
  storeName: string;
  storeSlug: string;
  countryCode: string;
  email: string;
  password: string;
  androidApp: boolean;
  applicationId: string;
}): string {
  const APP_URL = Deno.env.get("APP_URL") || "http://localhost:3000";
  const storeUrl = `${APP_URL}/${countryCode}/${storeSlug}`;
  const dashboardUrl = `${APP_URL}/${countryCode}/dashboard`;
  const statusUrl = `${APP_URL}/${countryCode}/status?applicationId=${applicationId}`;
  
  const fullName = `${firstName} ${lastName}`;
  const displayName = storeName
    .split("-")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { width: 100%; max-width: 580px; margin: 0 auto; }
    .header { background: #ffffff; padding: 32px 40px 24px; border-bottom: 1px solid #e8e8e8; text-align: center; }
    .body { background: #ffffff; padding: 32px 40px; }
    .title { font-size: 22px; font-weight: 600; color: #111; line-height: 1.3; margin-bottom: 12px; }
    .lead { font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 28px; }
    .divider { height: 1px; background: #e8e8e8; margin: 28px 0; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #999; margin-bottom: 12px; }
    .info-box { background: #f9f9f9; border: 1px solid #e8e8e8; border-radius: 6px; padding: 20px 24px; margin-bottom: 20px; }
    .cred-row { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid #efefef; font-size: 14px; }
    .cred-row:last-child { border-bottom: none; padding-bottom: 0; }
    .cred-key { color: #999; min-width: 80px; flex-shrink: 0; }
    .cred-val { color: #111; font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all; }
    .steps { margin-bottom: 20px; }
    .step { display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid #efefef; }
    .step:last-child { border-bottom: none; }
    .step-num { font-size: 12px; font-weight: 600; color: #bbb; min-width: 20px; padding-top: 2px; flex-shrink: 0; }
    .step-body { flex: 1; }
    .step-title { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .step-text { font-size: 14px; color: #555; line-height: 1.6; }
    .note { font-size: 13px; color: #666; background: #fffbf0; border: 1px solid #f0e6c0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; line-height: 1.6; }
    .cta-wrap { margin: 28px 0; text-align: center; }
    .cta { display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #fff; background: #C98A54; border-radius: 12px; text-decoration: none; letter-spacing: 0.2px; }
    .cta-secondary { background: #666; }
    .text-link { font-size: 14px; color: #111; text-decoration: underline; }
    .footer { background: #f5f5f5; padding: 24px 40px; }
    .footer-text { font-size: 12px; color: #aaa; line-height: 1.8; text-align: center; }
    .footer-text a { color: #aaa; }
    .badge { display: inline-block; background: #6EBD8A; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome</title>
  <style>${baseStyles}</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div style="font-size: 28px; font-weight: 800; color: #C98A54; font-family: 'Playfair Display', serif;">
      🌐 Telcos
    </div>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Global Reseller Program</p>
  </div>
  <div class="body">
    <div class="title">Welcome, ${firstName}! 🎉</div>
    <div class="lead">
      Congratulations! Your application to become a global reseller has been successfully submitted.
    </div>

    <div style="background: #f0fdf4; border: 1px solid #6EBD8A; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; text-align: center;">
      <span class="badge">✓ Application Submitted</span>
      <p style="margin-top: 8px; font-size: 14px; color: #444;">
        Application ID: <strong>${applicationId}</strong>
      </p>
    </div>

    <div class="label">Store Details</div>
    <div class="info-box">
      <div class="cred-row">
        <div class="cred-key">Store Name</div>
        <div class="cred-val">${displayName}</div>
      </div>
      <div class="cred-row">
        <div class="cred-key">Store URL</div>
        <div class="cred-val" style="font-family: inherit;">
          <a href="${storeUrl}" style="color: #C98A54; text-decoration: none;">${storeUrl}</a>
        </div>
      </div>
      <div class="cred-row">
        <div class="cred-key">Country</div>
        <div class="cred-val" style="font-family: inherit; text-transform: uppercase;">${countryCode}</div>
      </div>
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
      🔐 <strong>Important:</strong> Keep your password private. You can change it from your dashboard settings at any time.
    </div>

    <div class="label">What Happens Next?</div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-title">Review Period</div>
          <div class="step-text">Our team will review your application within 24-48 hours. We'll notify you via email once approved.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-title">Access Dashboard</div>
          <div class="step-text">Once approved, you'll be able to log in and manage your store, view sales, and track earnings.</div>
        </div>
      </div>
      ${androidApp ? `
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <div class="step-title">Android App Build</div>
          <div class="step-text">📱 Your branded Android app is being built. You'll receive an email when it's ready for download.</div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="cta-wrap">
      <a href="${dashboardUrl}" class="cta">📊 Go to Dashboard</a>
    </div>

    <div style="text-align: center; margin-top: 12px;">
      <small style="color: #999; font-size: 12px;">
        You can also track your application status here: 
        <a href="${statusUrl}" style="color: #C98A54; text-decoration: underline;">Check Status</a>
      </small>
    </div>

    ${androidApp ? `
    <div class="divider"></div>
    <div style="background: #f0f7ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px 20px; margin-top: 20px;">
      <p style="font-size: 14px; color: #1e40af; margin: 0;">
        📱 <strong>Android App:</strong> Your branded app is being built. We'll email you the download link as soon as it's ready.
      </p>
    </div>
    ` : ""}
  </div>
  <div class="footer">
    <div class="footer-text">
      © ${new Date().getFullYear()} Edges Network. All rights reserved.<br>
      Questions? <a href="mailto:support@edgesnetwork.com" style="color: #aaa;">support@edgesnetwork.com</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      applicationId,
      firstName,
      lastName,
      email,
      password,
      storeName,
      storeSlug,
      countryCode,
      androidApp,
    } = body;

    if (!applicationId || !email || !firstName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing welcome email for: ${email} (${applicationId})`);

    // Build the email
    const html = buildWelcomeEmail({
      firstName,
      lastName: lastName || "",
      storeName,
      storeSlug,
      countryCode,
      email,
      password,
      androidApp: androidApp || false,
      applicationId,
    });

    // Send the email
    const result = await sendEmail({
      to: email,
      subject: `🎉 Welcome to Edges Network, ${firstName}!`,
      html,
    });

    // Update email log in database
    await supabase
      .from("global_email_logs")
      .update({ sent_at: new Date().toISOString() })
      .eq("application_id", applicationId)
      .eq("email_type", "welcome");

    console.log(`Welcome email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});