// app/actions/reseller/notifyBuildComplete.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail } from "@/lib/email/email";

export async function notifyBuildComplete(
  configId: string,
  resellerId: string,
  status: string,
) {
  const admin = createAdminClient();

  // Update build status
  await admin
    .from("reseller_app_configs")
    .update({
      build_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", configId)
    .eq("reseller_id", resellerId);

  // If completed, get reseller and send email
  if (status === "completed") {
    const { data: reseller } = await admin
      .from("resellers")
      .select("email, store_name")
      .eq("id", resellerId)
      .single();

    if (reseller) {
      const displayName = reseller.store_name
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const { data: config } = await admin
        .from("reseller_app_configs")
        .select("apk_url")
        .eq("id", configId)
        .single();

      await sendAdminEmail({
        to: reseller.email,
        subject: `📱 Your ${displayName} App is Ready!`,
        message: `
Your branded Android app for ${displayName} has been built successfully!

📱 Download your APK from your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/app

Or access it directly from the GitHub Actions artifacts.

⚠️ The download link expires in 7 days.

- Edges Network Team
        `,
        recipientName: displayName,
        isHtml: false,
      });
    }
  }

  return { success: true };
}