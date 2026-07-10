import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MedicalDocument as DigitalDocument } from "@/lib/models/ReviewsDocs";
import User from "@/lib/models/User";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import {
  durableUrl,
  isSupabaseConfigured,
  MediaValidationError,
  uploadBuffer,
} from "@/lib/supabase/media";

// GET /api/user/documents – list all documents for the current user
export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const docs = await DigitalDocument.find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      success: true,
      data: docs.map((d: any) => ({
        id: d._id.toString(),
        type: d.type,
        url: d.cloudinaryUrl,
        mediaId: d.mediaId || d.publicId || null,
        mimeType: d.mimeType,
        status: d.status,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/user/documents
 * Accepts:
 * - multipart `file` (preferred), or
 * - JSON `{ dataUrl, mimeType, type, isAvatar }` (legacy profile page)
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Media storage is not configured" },
        { status: 503 },
      );
    }

    await connectToDatabase();
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let mimeType: string;
    let fileName: string;
    let type = "general";
    let isAvatar = false;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = file.type || "application/octet-stream";
      fileName = file.name || "document";
      type = String(form.get("type") || "general");
      isAvatar = form.get("isAvatar") === "true";
    } else {
      const body = await req.json();
      const { dataUrl, mimeType: mt, type: t, isAvatar: av } = body;
      if (!dataUrl || !mt) {
        return NextResponse.json(
          { error: "dataUrl and mimeType are required (or use multipart file)" },
          { status: 400 },
        );
      }
      mimeType = mt;
      type = t || "general";
      isAvatar = !!av;
      const base64 = String(dataUrl).includes("base64,")
        ? String(dataUrl).split("base64,")[1]
        : String(dataUrl);
      buffer = Buffer.from(base64, "base64");
      const ext = mimeType.includes("pdf")
        ? "pdf"
        : mimeType.includes("png")
          ? "png"
          : "jpg";
      fileName = isAvatar ? `avatar.${ext}` : `document.${ext}`;
    }

    const asset = await uploadBuffer({
      buffer,
      fileName,
      mimeType,
      userId: user.userId,
      purpose: isAvatar ? "avatar" : "document",
      relatedType: isAvatar ? "avatar" : "user_document",
      isPublic: false,
    });

    const fileUrl = durableUrl(asset);

    if (isAvatar) {
      await User.findByIdAndUpdate(user.userId, { avatarUrl: fileUrl });
      return NextResponse.json({
        success: true,
        data: { url: fileUrl, mediaId: asset.id },
      });
    }

    const doc = await DigitalDocument.create({
      userId: user.userId,
      uploadedBy: user.userId,
      type,
      cloudinaryUrl: fileUrl,
      publicId: asset.id,
      mediaId: asset.id,
      mimeType,
      status: "pending_review",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        type: doc.type,
        url: doc.cloudinaryUrl,
        mediaId: asset.id,
        mimeType: doc.mimeType,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err: any) {
    const status = err instanceof MediaValidationError ? 400 : 500;
    console.error("[POST /api/user/documents]", err);
    return NextResponse.json({ error: err.message }, { status });
  }
}
