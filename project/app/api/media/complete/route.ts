import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  completeUpload,
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  type MediaPurpose,
} from "@/lib/supabase/media";
import type { MediaFileType } from "@/lib/supabase/media-types";

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const {
      filePath,
      fileName,
      mimeType,
      fileSize,
      fileType,
      purpose = "document",
      conversationId,
      relatedType,
      relatedId,
      isPublic,
      metadata,
    } = body as {
      filePath: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      fileType: MediaFileType;
      purpose?: MediaPurpose;
      conversationId?: string;
      relatedType?: string;
      relatedId?: string;
      isPublic?: boolean;
      metadata?: Record<string, unknown>;
    };

    if (!filePath || !fileName || !mimeType || !fileType) {
      return NextResponse.json(
        { error: "filePath, fileName, mimeType, fileType required" },
        { status: 400 },
      );
    }

    const asset = await completeUpload({
      userId: user.userId,
      filePath,
      fileName,
      mimeType,
      fileSize: Number(fileSize),
      fileType: fileType as MediaFileType,
      purpose: (purpose || "document") as MediaPurpose,
      conversationId,
      relatedType,
      relatedId,
      isPublic: purpose === "prescription" ? false : !!isPublic,
      metadata,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...asset,
        url: durableUrl(asset),
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/media/complete]", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete upload" },
      { status },
    );
  }
}
