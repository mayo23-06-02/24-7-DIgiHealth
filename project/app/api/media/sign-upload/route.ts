import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  createSignedUpload,
  isSupabaseConfigured,
  MediaValidationError,
  type MediaPurpose,
} from "@/lib/supabase/media";

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Media storage is not configured (Supabase env missing)" },
        { status: 503 },
      );
    }

    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      fileName,
      mimeType,
      fileSize,
      purpose = "document",
      conversationId,
      relatedType,
      relatedId,
      isPublic,
      patientId,
      facilityId,
    } = body as {
      fileName: string;
      mimeType: string;
      fileSize: number;
      purpose?: MediaPurpose;
      conversationId?: string;
      relatedType?: string;
      relatedId?: string;
      isPublic?: boolean;
      patientId?: string;
      facilityId?: string;
    };

    const signed = await createSignedUpload({
      userId: user.userId,
      fileName,
      mimeType,
      fileSize: Number(fileSize),
      purpose: purpose || "document",
      conversationId,
      relatedType,
      relatedId,
      isPublic: !!isPublic,
      patientId,
      facilityId,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...signed,
        // Echo meta for complete step
        fileName,
        mimeType,
        fileSize: Number(fileSize),
        purpose: purpose || "document",
        conversationId: conversationId || null,
        relatedType: relatedType || null,
        relatedId: relatedId || null,
        isPublic: purpose === "prescription" ? false : !!isPublic,
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/media/sign-upload]", err);
    return NextResponse.json(
      { error: err.message || "Failed to sign upload" },
      { status },
    );
  }
}
