import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public image proxy for card images. Serves images from private
 * Supabase storage via short URLs that eBay (and other marketplaces)
 * can fetch without exceeding URL length limits.
 *
 * Usage: /api/images/proxy?path=<storage_path>
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from("card-images")
      .download(path);

    if (error || !data) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const ext = path.split(".").pop()?.toLowerCase() || "jpeg";
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
