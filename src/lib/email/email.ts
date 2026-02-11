// lib/email.ts
"use server";

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: process.env.EMAIL_SERVER_PORT === "465", // false for 587
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASS,
  },
  // Gmail-specific: helps with connection pooling & debug
  pool: true,
  maxConnections: 1, // Gmail doesn't like many parallel connections
  maxMessages: Infinity,
  rateDelta: 1000,
  logger: process.env.NODE_ENV === "development",
  debug: process.env.NODE_ENV === "development",
});

// Very useful in dev: check if config works
if (process.env.NODE_ENV !== "production") {
  transporter
    .verify()
    .then(() =>
      console.log("✅ Gmail transporter ready (edgesnetwork@gmail.com)"),
    )
    .catch((err) => console.error("❌ Gmail transporter failed:", err.message));
}

export async function sendAdminEmail({
  to,
  subject,
  message,
  recipientName, // ← NEW: optional
  isHtml = true,
}: {
  to: string | string[];
  subject: string;
  message: string;
  recipientName?: string; // e.g. "John" or "John Doe"
  isHtml?: boolean;
}) {
  const from = `"Edges Network" <${process.env.EMAIL_FROM}>`;

  // Personalization
  const greeting = recipientName ? `Hello ${recipientName},` : `Hello,`;

  // Company logo URL – CHANGE THIS to your real hosted logo URL
  const logoUrl = "https://edges-landing-page.vercel.app/edgesnetworkicon.png"; // or your CDN / public URL

  const html = isHtml
    ? `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #f9fafb; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #000000; padding: 28px 20px; text-align: center; }
    .header img { max-width: 180px; height: auto; }
    .content { padding: 28px 20px; line-height: 1.7; }
    .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; }
    .message { font-size: 16px; margin-bottom: 24px; white-space: pre-wrap; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 10px; color: #4b5563; }
    .social a { margin: 0 6px; color: #6b7280; text-decoration: none; font-weight: 500; }
    .social a:hover { color: #374151; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Edges Network Logo" />
    </div>
    
    <div class="content">
      <div class="greeting">${greeting}</div>
      <div class="message">${message.replace(/\n/g, "<br>")}</div>
    </div>
    
    <hr />
    
    <div class="footer">
      <p style="margin: 0 0 12px; font-size: 12px;">Edges Network • Data • Airtime • Utilities </p>
      <div class="social">
        <!-- Replace with your REAL links / handles -->
        <a href="https://tiktok.com/@edgesnetwork113">Tiktok</a> •
        <a href="https://twitter.com/edges_network">Twitter/X</a> •
        <a href="https://instagram.com/official_edgesnetwork">Instagram</a> •
        <a href="https://whatsapp.com/channel/0029VbBMfPHGU3BEpnO42o2a">WhatsApp</a>
      </div>
      <p style="margin: 16px 0 0; font-size: 10px;">
         <a href="https://edges-landing-page.vercel.app" style="color: #6b7280;">edgesnetwork.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim()
    : undefined;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: `${greeting}\n\n${message}\n\n— Edges Network Team`,
      html,
      // Optional: helps a tiny bit with deliverability
      headers: {
        "X-Entity-Ref-ID": "edges-admin-email",
      },
    });

    console.log(
      `Email sent: ${info.messageId} to ${Array.isArray(to) ? to.join(", ") : to}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(
      "Gmail send failed:",
      error.message,
      error.code,
      error.response,
    );
    return {
      success: false,
      error: error.message || "Failed to send email via Gmail",
    };
  }
}
