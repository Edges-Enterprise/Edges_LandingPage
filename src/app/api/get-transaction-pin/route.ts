import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("transaction_pin")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Failed to fetch PIN" }, { status: 500 });
  }

  return NextResponse.json({ pin: profile.transaction_pin });
}
