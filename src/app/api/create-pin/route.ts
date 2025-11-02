// app/api/create-pin/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.length < 4 || pin.length > 6) {
      return NextResponse.json(
        { error: "PIN must be between 4 and 6 digits" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Update user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        transaction_pin: pin,
        transaction_pin_created: true,
      },
    });

    if (authError) {
      console.error("Auth update error:", authError);
      throw authError;
    }

    // Update profile in database
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ transaction_pin: pin })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw profileError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create PIN error:", error);
    return NextResponse.json(
      { error: "Failed to create PIN" },
      { status: 500 }
    );
  }
}
