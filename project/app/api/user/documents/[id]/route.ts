import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MedicalDocument as DigitalDocument } from "@/lib/models/ReviewsDocs";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { deleteMedia, isSupabaseConfigured } from "@/lib/supabase/media";
import { isLegacyMediaUrl } from "@/lib/supabase/media-validation";

// DELETE /api/user/documents/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const doc = await DigitalDocument.findOneAndDelete({
      _id: id,
      userId: user.userId,
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Supabase media
    const mediaId = (doc as any).mediaId || (doc as any).publicId;
    if (
      mediaId &&
      isSupabaseConfigured() &&
      !isLegacyMediaUrl((doc as any).cloudinaryUrl)
    ) {
      try {
        // publicId for new docs is media uuid
        if (
          typeof mediaId === "string" &&
          mediaId.length > 20 &&
          !mediaId.includes("/")
        ) {
          await deleteMedia(mediaId);
        }
      } catch (err) {
        console.warn("[documents DELETE] media cleanup failed", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/user/documents/[id] – update document type/label
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { type, note } = body;

    const update: Record<string, string> = {};
    if (type !== undefined) update.type = type;
    if (note !== undefined) update.note = note;

    const doc = await DigitalDocument.findOneAndUpdate(
      { _id: id, userId: user.userId },
      update,
      { new: true },
    ).lean();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (doc as any)._id.toString(),
        type: (doc as any).type,
        note: (doc as any).note || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
