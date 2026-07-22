// src/actions/reseller/store/uploadLogo.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadLogo(formData: FormData): Promise<{
  success: boolean;
  data?: {
    logo_url: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the reseller's application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return { success: false, error: "Reseller not found" };
    }

    // Get the file from formData
    const file = formData.get("logo") as File;

    if (!file) {
      return { success: false, error: "No file uploaded" };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: "File must be less than 2MB" };
    }

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `reseller-${application.id}-logo-${Date.now()}.png`;
    const filePath = `${application.id}/${fileName}`;

    const { error: uploadError } = await admin.storage
      .from("reseller-assets")
      .upload(filePath, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload logo error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("reseller-assets")
      .getPublicUrl(filePath);

    const logoUrl = urlData.publicUrl;

    // Update application with logo URL
    const { error: updateError } = await supabase
      .from("global_reseller_applications")
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("Update logo URL error:", updateError);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      data: { logo_url: logoUrl },
    };
  } catch (error) {
    console.error("UploadLogo Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
