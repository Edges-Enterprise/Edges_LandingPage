// app/actions/admin-emails.ts
"use server";

import { sendAdminEmail } from "@/lib/email/email"; // adjust path if needed
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function checkAdminAccess() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { isAdmin: false, error: "Admin access required" };
  }

  return { isAdmin: true, user };
}

export async function sendAdminEmailAction(formData: FormData) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { error: adminCheck.error };
    }

    const rawTo = ((formData.get("to") as string) ?? "").trim();
    const rawNames = ((formData.get("names") as string) ?? "").trim(); // ← we expect this from the form
    const subject = ((formData.get("subject") as string) ?? "").trim();
    const message = ((formData.get("message") as string) ?? "").trim();
    const sendAsHtml = formData.get("sendAsHtml") === "on";

    if (!rawTo || !subject || !message) {
      return { error: "Email addresses, subject and message are required" };
    }

    // Parse emails
    const emails = rawTo
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return { error: "No valid email addresses provided" };
    }

    // Parse names (optional)
    const names = rawNames
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    // Pair emails with names (best effort — if fewer names than emails → undefined for the rest)
    const recipients = emails.map((email, index) => ({
      email,
      name: names[index] || undefined,
    }));

    let sentCount = 0;
    const errors: string[] = [];

    // If we have names → send individually (personalized greeting)
    // If no names → send as one email to all (faster, but generic)
    if (names.length > 0) {
      // Individual sends
      for (const { email, name } of recipients) {
        const result = await sendAdminEmail({
          to: email,
          subject,
          message,
          recipientName: name,
          isHtml: sendAsHtml,
        });

        if (result.success) {
          sentCount++;
        } else {
          errors.push(`Failed for ${email}: ${result.error}`);
        }
      }
    } else {
      // Bulk send (all in one email)
      const result = await sendAdminEmail({
        to: emails, // array = multiple To: recipients
        subject,
        message,
        recipientName: undefined,
        isHtml: sendAsHtml,
      });

      if (result.success) {
        sentCount = emails.length;
      } else {
        errors.push(result.error || "Failed to send bulk email");
      }
    }

    if (sentCount === 0) {
      return { error: errors.join(" | ") || "Failed to send any emails" };
    }

    revalidatePath("/(admin)/send-mail");

    return {
      success: true,
      message: `Successfully sent to ${sentCount} recipient${sentCount === 1 ? "" : "s"}${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("sendAdminEmailAction error:", error);
    return { error: "Server error while sending email" };
  }
}

// // app/actions/admin-emails.ts
// "use server";

// import { sendAdminEmail } from "@/lib/email/email";
// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// async function checkAdminAccess() {
//   const supabase = await createServerClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) return { isAdmin: false, error: "Unauthorized" };

//   const { data: profile } = await supabase
//     .from("profiles")
//     .select("is_admin")
//     .eq("id", user.id)
//     .single();

//   if (!profile?.is_admin) {
//     return { isAdmin: false, error: "Admin access required" };
//   }

//   return { isAdmin: true, user };
// }

// export async function sendAdminEmailAction(formData: FormData) {
//     try {
//       let recipientName: string | undefined;
//     const adminCheck = await checkAdminAccess();
//     if (!adminCheck.isAdmin) {
//       return { error: adminCheck.error };
//     }

//     const to = (formData.get("to") as string)?.trim();
//     const subject = (formData.get("subject") as string)?.trim();
//     const message = (formData.get("message") as string)?.trim();
//     const sendAsHtml = formData.get("sendAsHtml") === "on";

//     if (!to || !subject || !message) {
//       return { error: "All fields are required" };
//     }

//     // Support comma-separated emails
//     const recipients = to
//       .split(",")
//       .map((email) => email.trim())
//       .filter(Boolean);

//     if (recipients.length === 0) {
//       return { error: "No valid email addresses" };
//     }

//     const result = await sendAdminEmail({
//       to: recipients,
//       subject,
//       message,
//       recipientName,
//       isHtml: sendAsHtml,
//     });

//     if (!result.success) {
//       return { error: result.error || "Failed to send email" };
//     }

//     // Optional: log to DB (recommended)
//     // const supabase = await createServerClient();
//     // await supabase.from("sent_emails").insert({ ... });

//     revalidatePath("/(admin)/send-mail");

//     return {
//       success: true,
//       message: `Email sent successfully to ${recipients.length} recipient(s)`,
//     };
//   } catch (error: any) {
//     console.error("sendAdminEmailAction error:", error);
//     return { error: "Something went wrong" };
//   }
// }
