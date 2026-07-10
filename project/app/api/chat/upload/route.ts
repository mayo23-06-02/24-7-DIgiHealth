import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  uploadBuffer,
} from "@/lib/supabase/media";

/**
 * Chat attachment upload → Supabase media.
 * Returns { url, mediaId, publicId } for Message.fileUrl.
 */
export async function POST(req: Request) {
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const conversationId = formData.get("conversationId")
      ? String(formData.get("conversationId"))
      : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await uploadBuffer({
      buffer,
      fileName: file.name || "chat-file",
      mimeType: file.type || "application/octet-stream",
      userId: user.userId,
      purpose: "chat",
      // If no conversation yet, store under user other path via purpose chat requiring conversationId
      conversationId: conversationId || `user_${user.userId}`,
      relatedType: "message",
    });

    const url = durableUrl(asset);

    return NextResponse.json({
      url,
      mediaId: asset.id,
      publicId: asset.id,
      mimeType: asset.mimeType,
      fileType: asset.fileType,
    });
  } catch (error: any) {
    const status = error instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/chat/upload]", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status },
    );
  }
}
