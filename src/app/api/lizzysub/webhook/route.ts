// app/api/lizzysub/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log("Lizzysub webhook received:", payload);

    const { status, "request-id": requestId, response } = payload;

    if (!requestId) {
      return NextResponse.json({ error: "Missing request-id" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Update transaction status
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: status === "success" ? "completed" : "failed",
        metadata: {
          ...((await supabase
            .from("transactions")
            .select("metadata")
            .eq("reference", requestId)
            .single()).data?.metadata || {}),
          webhook_response: response,
          webhook_status: status,
        },
      })
      .eq("reference", requestId);

    if (updateError) {
      console.error("Update transaction error:", updateError);
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
