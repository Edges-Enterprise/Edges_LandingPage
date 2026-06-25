// app/actions/reseller/regenerateDashboardToken.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

function generateDashboardToken(): string {
  const timestamp = Date.now();
  const random = randomBytes(32).toString("hex");
  return `${timestamp}_${random}`;
}

export async function regenerateDashboardToken(resellerId: string) {
  const admin = createAdminClient();

  const newToken = generateDashboardToken();

  const { error } = await admin
    .from("resellers")
    .update({ dashboard_token: newToken })
    .eq("id", resellerId);

  if (error) {
    console.error("Failed to regenerate token:", error);
    return { error: "Failed to regenerate token" };
  }

  revalidatePath("/dashboard/settings");

  return { success: true, token: newToken };
}
