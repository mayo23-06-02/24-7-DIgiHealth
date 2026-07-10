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

async function canAccess(
  asset: NonNullable<Awaited<ReturnType<typeof getMediaById>>>,
  userId: string,
): Promise<boolean> {
  if (asset.userId === userId) return true;
  if (asset.conversationId) {
    await connectToDatabase();
    const conv = await Conversation.findById(asset.conversationId).lean();
    if (!conv) return false;
    const p = String((conv as any).patientId);
    const d = String((conv as any).practitionerId);
    return p === userId || d === userId;
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
    if (!(await canAccess(asset, user.userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: { ...asset, url: durableUrl(asset) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
