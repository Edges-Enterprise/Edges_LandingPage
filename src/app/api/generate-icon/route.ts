// app/api/generate-icon/route.ts
import { NextResponse } from "next/server";
import { generateIconPng } from "@/app/reseller/generateIcon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeName = searchParams.get("name");
  const brandColor = searchParams.get("color") || "#2563EB";

  if (!storeName) {
    return NextResponse.json({ error: "Store name required" }, { status: 400 });
  }

  try {
    // Generate icon as blob
    const blob = await generateIconPng(storeName, brandColor);

    // Convert blob to buffer
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Return as PNG
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${storeName}-icon.png"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate icon" },
      { status: 500 },
    );
  }
}
