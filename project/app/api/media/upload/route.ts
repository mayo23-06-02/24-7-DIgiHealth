import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  uploadBuffer,
  type MediaPurpose,
} from "@/lib/supabase/media";

/**
 * Server multipart upload (fallback for chat/prescriptions/small files).
 * Prefer client sign-upload for large video/audio.
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[POST /api/media/upload] Request received");
    console.log("[POST /api/media/upload] Content-Type:", req.headers.get("content-type"));

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Media storage is not configured" },
        { status: 503 },
      );
    }

    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    console.log("[POST /api/media/upload] FormData parsed successfully");

    const file = form.get("file");
    console.log("[POST /api/media/upload] File:", file, "size:", file instanceof File ? file.size : "not a file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const purpose = (String(form.get("purpose") || "document") as MediaPurpose);
    const conversationId = form.get("conversationId")
      ? String(form.get("conversationId"))
      : undefined;
    const relatedType = form.get("relatedType")
      ? String(form.get("relatedType"))
      : undefined;
    const relatedId = form.get("relatedId")
      ? String(form.get("relatedId"))
      : undefined;
    const patientId = form.get("patientId")
      ? String(form.get("patientId"))
      : undefined;
    const isPublic = form.get("isPublic") === "true";

    console.log("[POST /api/media/upload] Uploading to Supabase:", file.name, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await uploadBuffer({
      buffer,
      fileName: file.name || "upload",
      mimeType: file.type || "application/octet-stream",
      userId: user.userId,
      purpose,
      conversationId,
      relatedType,
      relatedId,
      patientId,
      isPublic,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        url: durableUrl(asset),
        // Back-compat with chat upload response
        publicId: asset.id,
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/media/upload]", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status },
    );
  }
}
