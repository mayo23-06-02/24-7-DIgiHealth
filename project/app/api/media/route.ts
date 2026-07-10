import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  durableUrl,
  isSupabaseConfigured,
  listMedia,
  type MediaFileType,
} from "@/lib/supabase/media";

/** GET — list current user's media assets */
export async function GET(req: NextRequest) {
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

    const sp = new URL(req.url).searchParams;
    const assets = await listMedia({
      userId: user.userId,
      conversationId: sp.get("conversationId") || undefined,
      relatedType: sp.get("relatedType") || undefined,
      relatedId: sp.get("relatedId") || undefined,
      fileType: (sp.get("fileType") as MediaFileType) || undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : 50,
    });

    return NextResponse.json({
      success: true,
      data: assets.map((a) => ({ ...a, url: durableUrl(a) })),
    });
  } catch (err: any) {
    console.error("[GET /api/media]", err);
    return NextResponse.json(
      { error: err.message || "Failed to list media" },
      { status: 500 },
    );
  }
}
