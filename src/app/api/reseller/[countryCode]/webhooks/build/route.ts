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

    // Build-complete email. Sent by the `send-global-app-ready` edge function
    // over the Telcos SMTP account (store name as the From display name), so
    // the countryCode/global flow owns its own mail sender and does not share
    // the legacy Edges Network mailer. Best-effort: the APK is published and
    // the status row is written, so a mail failure must not fail the webhook —
    // bound the wait so a slow send can never hang the callback.
    if (status === "completed" && apkUrl && build?.application_id) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-global-app-ready`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              applicationId: build.application_id,
              apkUrl,
            }),
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (!res.ok) {
          console.error(
            "Build notification email failed:",
            res.status,
            await res.text().catch(() => ""),
          );
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
