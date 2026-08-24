import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  deleteMedia,
  durableUrl,
  getMediaById,
  isSupabaseConfigured,
  MediaValidationError,
  replaceMediaBuffer,
  type MediaPurpose,
} from "@/lib/supabase/media";
import Conversation from "@/lib/models/Conversation";
import { connectToDatabase } from "@/lib/mongodb";

import { apiError } from "@/lib/api/errors";
async function canAccess(
  asset: NonNullable<Awaited<ReturnType<typeof getMediaById>>>,
  userId: string,
  role?: string,
): Promise<boolean> {
  if (asset.userId === userId || role === "mega_admin") return true;
  if (asset.conversationId) {
    await connectToDatabase();
    const conv = await Conversation.findById(asset.conversationId).lean();
    if (!conv) return false;
    const p = String((conv as any).patientId);
    const d = String((conv as any).practitionerId);
    return p === userId || d === userId;
  }
  // Linked practitioners may view patient profile documents
  if (
    role === "practitioner" &&
    (asset.relatedType === "user_document" ||
      asset.filePath.includes("/documents/"))
  ) {
    await connectToDatabase();
    const { canPractitionerAccessPatient } = await import(
      "@/lib/auth/canAccessPatient"
    );
    return canPractitionerAccessPatient(userId, asset.userId, role);
  }
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const asset = await getMediaById(id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await canAccess(asset, user.userId, user.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: { ...asset, url: durableUrl(asset) },
    });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const asset = await getMediaById(id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (asset.userId !== user.userId && user.role !== "mega_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteMedia(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return apiError(err);
  }
}

/** PUT multipart — replace file contents */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const purpose = (String(form.get("purpose") || "document") as MediaPurpose);

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await replaceMediaBuffer(id, {
      buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      userId: user.userId,
      purpose,
      conversationId: form.get("conversationId")
        ? String(form.get("conversationId"))
        : undefined,
      patientId: form.get("patientId")
        ? String(form.get("patientId"))
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: { ...asset, url: durableUrl(asset) },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
