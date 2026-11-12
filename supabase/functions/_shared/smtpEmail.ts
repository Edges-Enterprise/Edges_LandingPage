// supabase/functions/_shared/smtpEmail.ts
//
// Minimal SMTP-over-TLS sender for edge functions, extracted from the proven
// sender in `send-global-reseller-welcome`. The mailbox is always the Telcos
// SMTP account (`SMTP_USER`); `fromName` only sets the display name on the From
// line, so a store's customer email reads as the store while the underlying
// sending account stays Telcos.

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER")!;
const SMTP_PASS = Deno.env.get("SMTP_PASS")!;

export async function sendSmtpEmail({
  to,
  subject,
  html,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}): Promise<{ success: boolean }> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT });

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
  const displayName = (fromName || "Telcos.").replace(/"/g, "'");
  const message = [
    `From: "${displayName}" <${SMTP_USER}>`,
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
