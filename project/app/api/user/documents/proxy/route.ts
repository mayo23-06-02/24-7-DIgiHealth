import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/user/documents/proxy?url=<encoded_url>
 *
 * Streams allowed document URLs for PDF.js (CORS bypass).
 * Allows: legacy Cloudinary, Supabase storage hosts, app-relative media proxy (resolved server-side).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url encoding" }, { status: 400 });
  }

  // App media proxy path — resolve to signed URL needs cookies; for PDF worker
  // prefer client uses /api/media/file/:id directly when possible.
  if (decodedUrl.startsWith("/api/media/file/")) {
    const origin = new URL(req.url).origin;
    decodedUrl = `${origin}${decodedUrl}`;
  }

  let allowed = false;
  try {
    const u = new URL(decodedUrl);
    const host = u.hostname;
    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME ||
      "dmvgc1ktj";

    if (host === "res.cloudinary.com" && u.pathname.includes(`/${cloudName}/`)) {
      allowed = true;
    }
    if (host.endsWith(".supabase.co") && u.pathname.includes("/storage/")) {
      allowed = true;
    }
    if (host.includes("firebasestorage.googleapis.com")) {
      allowed = true;
    }
    // Same-origin app media file proxy
    if (u.origin === new URL(req.url).origin && u.pathname.startsWith("/api/media/file/")) {
      allowed = true;
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "URL not from an allowed media host" },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "DigiHealth-Server/1.0",
        // Forward cookies for same-origin media proxy redirects
        Cookie: req.headers.get("cookie") || "",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: any) {
    console.error("[documents/proxy]", err);
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
}
