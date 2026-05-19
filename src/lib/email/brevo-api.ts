// lib/email/brevo-api.ts
"use server";

export async function sendAdminEmailWithBrevo({
  to,
  subject,
  message,
  recipientName,
}: {
  to: string | string[];
  subject: string;
  message: string;
  recipientName?: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "edgesnetwork@gmail.com";

  if (!apiKey) {
    console.error("BREVO_API_KEY not set - email not sent");
    return { success: false, error: "Email service not configured" };
  }

  const recipients = Array.isArray(to) ? to : [to];
  
  const greeting = recipientName ? `Hello ${recipientName},\n\n` : "Hello,\n\n";
  const footer = "\n\n— Edges Network Team\n\nEdges Network • Data • Airtime • Utilities";
  
  const emailContent = greeting + message + footer;

  const requestBody = {
    sender: {
      name: "Edges Network",
      email: senderEmail,
    },
    to: recipients.map(email => ({ email })),
    subject: subject,
    textContent: emailContent,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Brevo email sent: ${data.messageId}`);
      return { success: true, messageId: data.messageId };
    } else {
      console.error("Brevo API error:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }
  } catch (error: any) {
    console.error("Brevo fetch error:", error.message);
    return { success: false, error: error.message };
  }
    }
