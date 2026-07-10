import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createSignedUpload,
  isSupabaseConfigured,
  MediaValidationError,
  type MediaPurpose,
} from "@/lib/supabase/media";

/**
 * Unauthenticated sign-upload for registration flows.
 * Uses a short-lived registrationToken; assets live under registration/pending/{token}/
 * After register, call claimRegistrationMedia(token, newUserId).
 */
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
      fileName,
      mimeType,
      fileSize,
      purpose = "registration",
      registrationToken: existingToken,
      isPublic,
    } = body as {
      fileName: string;
      mimeType: string;
      fileSize: number;
      purpose?: MediaPurpose;
      registrationToken?: string;
      isPublic?: boolean;
    };

    // Basic abuse control: only registration/facility purposes
    const safePurpose: MediaPurpose =
      purpose === "facility" ? "facility" : "registration";

    const registrationToken = existingToken || randomUUID();
    // Placeholder user id until claim
    const pendingUserId = `pending_${registrationToken}`;

    const signed = await createSignedUpload({
      userId: pendingUserId,
      fileName,
      mimeType,
      fileSize: Number(fileSize),
      purpose: safePurpose,
      registrationToken,
      isPublic: !!isPublic,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...signed,
        registrationToken,
        fileName,
        mimeType,
        fileSize: Number(fileSize),
        purpose: safePurpose,
        isPublic: !!isPublic,
        userId: pendingUserId,
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/media/sign-upload-public]", err);
    return NextResponse.json(
      { error: err.message || "Failed to sign upload" },
      { status },
    );
  }
}
