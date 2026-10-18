// src/app/api/reseller/[countryCode]/webhooks/build/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ countryCode: string }> },
) {
  try {
    const body = await req.json();
    const { buildId, status, apkUrl, aabUrl, errorMessage, buildLogs } = body;

    if (!buildId) {
      return NextResponse.json(
        { error: "buildId is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerClient();

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(buildId)) {
      return NextResponse.json(
        { error: "buildId must be a UUID" },
        { status: 400 },
      );
    }

    // The build workflow posts the *config* id as `buildId` — it never learns
    // the global_app_builds row id — and global_app_builds.config_id links back
    // to it. Accept either so the endpoint also serves callers that post the
    // build row id directly.
    const { data: buildRow, error: lookupError } = await supabase
      .from("global_app_builds")
      .select("id")
      .or(`config_id.eq.${buildId},id.eq.${buildId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Build lookup error:", lookupError);
      return NextResponse.json(
        { error: "Failed to look up build" },
        { status: 500 },
      );
    }

    if (!buildRow) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    // ✅ Update build status
    const updateData: any = {
      build_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed" && apkUrl) {
      updateData.apk_url = apkUrl;
      updateData.aab_url = aabUrl || null;
      updateData.completed_at = new Date().toISOString();
    }

    if (status === "failed" && errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (buildLogs) {
      updateData.build_logs = buildLogs;
    }

    const { data: build, error: updateError } = await supabase
      .from("global_app_builds")
      .update(updateData)
      .eq("id", buildRow.id)
      .select("application_id")
      .single();

    if (updateError) {
      console.error("Failed to update build status:", updateError);
      return NextResponse.json(
        { error: "Failed to update build status" },
        { status: 500 },
      );
    }

    // ✅ If completed, update the application status
    if (status === "completed" && build?.application_id) {
      await supabase
        .from("global_reseller_applications")
        .update({ android_app_status: "built" })
        .eq("id", build.application_id);
    }

    // ✅ If completed, send notification to reseller
    if (status === "completed" && build?.application_id) {
      try {
        // Get application details
        const { data: app } = await supabase
          .from("global_reseller_applications")
          .select("email, first_name")
          .eq("id", build.application_id)
          .single();

        if (app?.email) {
          // Trigger email notification via Edge Function
          await supabase.functions.invoke("send-app-build-complete", {
            body: {
              email: app.email,
              firstName: app.first_name || "Reseller",
              apkUrl: apkUrl,
              applicationId: build.application_id,
            },
          });
        }
      } catch (notifError) {
        console.error("Failed to send build notification:", notifError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Build webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
