import { NextRequest, NextResponse } from "next/server";
import { triggerAppBuild } from "@/app/actions/reseller/triggerAppBuild";

export async function GET(request: NextRequest) {
  const resellerId = request.nextUrl.searchParams.get("resellerId");

  if (!resellerId) {
    return NextResponse.json({ error: "resellerId required" }, { status: 400 });
  }

  try {
    const result = await triggerAppBuild(resellerId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
