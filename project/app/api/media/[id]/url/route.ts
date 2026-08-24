import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  getMediaById,
  getSignedDownloadUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/media";
import Conversation from "@/lib/models/Conversation";
import { connectToDatabase } from "@/lib/mongodb";

import { apiError } from "@/lib/api/errors";
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

    let allowed = asset.userId === user.userId || user.role === "mega_admin";
    if (!allowed && asset.conversationId) {
      await connectToDatabase();
      const conv = await Conversation.findById(asset.conversationId).lean();
      if (conv) {
        const p = String((conv as any).patientId);
        const d = String((conv as any).practitionerId);
        allowed = p === user.userId || d === user.userId;
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (asset.isPublic && asset.publicUrl) {
      return NextResponse.json({ success: true, url: asset.publicUrl });
    }

    const url = await getSignedDownloadUrl(asset.filePath, 3600);
    return NextResponse.json({ success: true, url, expiresIn: 3600 });
  } catch (err: any) {
    return apiError(err);
  }
}
