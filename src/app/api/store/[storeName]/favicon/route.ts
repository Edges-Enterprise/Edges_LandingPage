// app/api/store/[storeName]/favicon/route.ts (without sharp)

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeName: string }> },
) {
  const { storeName } = await params;

  const supabase = await createServerClient();

  // Get the reseller by store name
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeName)
    .single();

  if (!reseller) {
    const defaultIcon = await fetch(new URL("/favicon.ico", request.url));
    return new Response(defaultIcon.body, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Get the store icon from reseller_assets
  const { data: asset } = await supabase
    .from("reseller_assets")
    .select("url")
    .eq("reseller_id", reseller.id)
    .eq("type", "icon")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (asset?.url) {
    try {
      // Fetch the icon from storage
      const iconResponse = await fetch(asset.url);
      const iconBuffer = await iconResponse.arrayBuffer();

      // Return the original icon but with correct headers
      // Browsers will try to use it, but it might not work well with 1024x1024
      return new Response(iconBuffer, {
        headers: {
          "Content-Type": asset.url.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      console.error("Error fetching icon:", error);
    }
  }

  // Return default favicon
  const defaultIcon = await fetch(new URL("/favicon.ico", request.url));
  return new Response(defaultIcon.body, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
