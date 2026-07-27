// app/api/v1/auth/register/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
// ✅ Fix: Use bcrypt and crypto directly
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return `sk_live_${randomBytes}`;
}

export async function POST(req: Request) {
  try {
    const { email, password, firstName, lastName, companyName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if email exists
    const { data: existing } = await supabase
      .from("api_users.users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const apiKey = generateApiKey();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: user, error } = await supabase
      .from("api_users.users")
      .insert({
        email,
        api_key: apiKey,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Registration error:", error);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create API key record
    await supabase.from("api_users.api_keys").insert({
      user_id: user.id,
      key: apiKey,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      message: "API user registered successfully",
      data: {
        id: user.id,
        email: user.email,
        api_key: apiKey,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}