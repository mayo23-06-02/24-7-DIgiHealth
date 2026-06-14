import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/user/documents/proxy?url=<encoded_cloudinary_url>
 *
 * Fetches a Cloudinary asset server-side and streams it back to the browser.
 * This avoids the 401/CORS errors that occur when react-pdf tries to load
 * Cloudinary URLs directly from the client side.
 *
 * Security: restricted to URLs from our specific Cloudinary cloud account only.
 * No auth gate — PDF.js fetches this from a web worker context which doesn't
 * reliably forward browser cookies. The domain allowlist is the access control.
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

  // Only allow Cloudinary URLs from our specific cloud account
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    "dmvgc1ktj";

  const allowedOrigin = `https://res.cloudinary.com/${cloudName}`;
  if (!decodedUrl.startsWith(allowedOrigin)) {
    return NextResponse.json(
      { error: "URL not from allowed Cloudinary account" },
      { status: 403 }
    );
  }

  try {
    const upstream = await fetch(decodedUrl, {
      headers: { "User-Agent": "DigiHealth-Server/1.0" },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (err: any) {
    console.error("[PDF Proxy] Failed to fetch:", err);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 502 }
    );
  }
}

