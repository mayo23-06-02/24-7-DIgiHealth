import { NextRequest, NextResponse } from "next/server";
import {
  completeUpload,
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  type MediaPurpose,
} from "@/lib/supabase/media";
import type { MediaFileType } from "@/lib/supabase/media-types";

/** Complete registration/facility pending upload (no JWT). */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Media storage is not configured" },
        { status: 503 },
      );
    }

    const body = await req.json();
    const {
      filePath,
      fileName,
      mimeType,
      fileSize,
      fileType,
      purpose = "registration",
      registrationToken,
      isPublic,
      userId,
    } = body as {
      filePath: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      fileType: MediaFileType;
      purpose?: MediaPurpose;
      registrationToken?: string;
      isPublic?: boolean;
      userId?: string;
    };

    if (!filePath?.startsWith("registration/pending/") && purpose === "registration") {
      return NextResponse.json({ error: "Invalid pending path" }, { status: 400 });
    }
    if (!registrationToken && purpose === "registration") {
      return NextResponse.json(
        { error: "registrationToken required" },
        { status: 400 },
      );
    }

    const pendingUserId = userId || `pending_${registrationToken}`;

    const asset = await completeUpload({
      userId: pendingUserId,
      filePath,
      fileName,
      mimeType,
      fileSize: Number(fileSize),
      fileType,
      purpose: (purpose || "registration") as MediaPurpose,
      isPublic: !!isPublic,
      metadata: { registrationToken },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        url: durableUrl(asset),
        registrationToken,
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/media/complete-public]", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete upload" },
      { status },
    );
  }
}
